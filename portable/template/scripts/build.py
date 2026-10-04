#!/usr/bin/env python3
"""Build from editable src/app only; never restore an old repository or archive."""
import argparse, hashlib, io, json, os, pathlib, plistlib, shutil, subprocess, sys, tarfile, urllib.request
ROOT = pathlib.Path(__file__).resolve().parent.parent
os.chdir(ROOT)
CFG = json.loads((ROOT/'project.json').read_text(encoding='utf-8'))

def run(args, **kwargs):
    args = [str(v) for v in args]
    if os.name == 'nt' and args[0] == 'npm':
        args = [shutil.which('npm.cmd') or 'npm.cmd', *args[1:]]
    print('Running:', ' '.join(args), flush=True)
    subprocess.run(args, check=True, **kwargs)

def fetch(url):
    with urllib.request.urlopen(url, timeout=120) as response:
        return response.read()

def install_archive(data, dest, prefix=''):
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        for member in archive.getmembers():
            if not member.isfile() or not member.name.startswith(prefix):
                continue
            target = dest/member.name[len(prefix):]
            if not target.resolve().is_relative_to(dest.resolve()):
                raise ValueError('Unsafe archive member')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.extractfile(member).read())
            target.chmod(member.mode)

def prepare(target):
    app = ROOT/'macos/staging/app'
    if app.exists():
        shutil.rmtree(app)
    shutil.copytree(ROOT/'src/app', app, symlinks=True)
    mods = app/'node_modules'
    native = CFG['native'][target]
    for name in native:
        dest = mods/name
        version = json.loads((dest/'package.json').read_text(encoding='utf-8'))['version']
        meta = json.loads(fetch('https://registry.npmjs.org/'+name.replace('/', '%2f')+'/'+version))
        data = fetch(meta['dist']['tarball'])
        assert hashlib.sha1(data).hexdigest() == meta['dist']['shasum'], name
        install_archive(data, dest, 'package/')
    dest = mods/'@signalapp/ringrtc'
    pkg = json.loads((dest/'package.json').read_text(encoding='utf-8'))
    data = fetch(pkg['config']['prebuildUrl'].replace('${npm_package_version}', pkg['version']))
    assert hashlib.sha256(data).hexdigest() == pkg['config']['prebuildChecksum']
    install_archive(data, dest)
    tools = ROOT/'.build/tools'
    tools.mkdir(parents=True, exist_ok=True)
    (tools/'package.json').write_text(json.dumps({'private': True}), encoding='utf-8')
    run(['npm','install','--prefix',tools,'--ignore-scripts','--no-audit','--no-fund','--save-exact',
         'electron-builder@'+CFG['tools']['electron-builder'],
         '@electron/packager@'+CFG['tools']['packager'], 'tar@'+CFG['tools']['tar']])
    nested = dest/'node_modules'
    nested.mkdir(exist_ok=True)
    for path in (tools/'node_modules').iterdir():
        if path.name in ['tar','@isaacs','chownr','minipass','minizlib','yallist']:
            if path.is_dir():
                shutil.copytree(path, nested/path.name, dirs_exist_ok=True)
    if target == 'windows':
        run([sys.executable,'scripts/prepare-windows.py'])
    pkgpath=app/'package.json'
    pkg=json.loads(pkgpath.read_text(encoding='utf-8'))
    if target=='windows': pkg['version']=CFG['versions'][target]
    pkgpath.write_text(json.dumps(pkg,ensure_ascii=False,indent=2),encoding='utf-8')
    preload=app/'bundles/preload/main.js'
    text=preload.read_text(encoding='utf-8')
    import re
    text=re.sub(r'(当前版本 |海拓 )1\.1\.\d+',lambda m:m.group(1)+CFG['versions'][target],text)
    preload.write_text(text,encoding='utf-8')
    for file in ['bundles/main.js','bundles/preload/main.js','js/caisheng-webview-preload.js']:
        run(['node','--check',app/file])
    return app, tools

def windows(app, tools):
    builder = {
        'appId':'com.haituo.desktop','productName':'海拓',
        'directories':{'app':str(app),'output':'windows/out'},
        'electronVersion':CFG['tools']['electron'],'npmRebuild':False,
        'asar':True,'asarUnpack':['**/*.node','**/*.dll'],
        'win':{'target':[{'target':'nsis','arch':['x64']}],
               'icon':str(app/'build/icons/win/icon.ico'),'signAndEditExecutable':False},
        'nsis':{'oneClick':False,'perMachine':False,'allowToChangeInstallationDirectory':True,
                'createDesktopShortcut':True,'artifactName':'Haituo-${version}-Windows-${arch}-Setup.${ext}'}
    }
    p = ROOT/'.build/windows-builder.json'
    p.write_text(json.dumps(builder, ensure_ascii=False, indent=2), encoding='utf-8')
    env = {**os.environ,'CSC_IDENTITY_AUTO_DISCOVERY':'false'}
    run(['node',tools/'node_modules/electron-builder/cli.js','--config',p,'--win','--x64','--publish','never'],env=env)

def macos(app, tools):
    iconset = ROOT/'.build/haituo.iconset'
    iconset.mkdir(exist_ok=True)
    for size in [16,32,128,256,512]:
        for scale in [1,2]:
            label = f'icon_{size}x{size}'+('@2x' if scale==2 else '')+'.png'
            run(['sips','-z',size*scale,size*scale,app/'build/icons/png/512x512.png','--out',iconset/label])
    icon = ROOT/'.build/haituo.icns'
    run(['iconutil','-c','icns',iconset,'-o',icon])
    version = CFG['versions']['macos']
    packager = tools/'node_modules/@electron/packager'
    package = json.loads((packager/'package.json').read_text(encoding='utf-8'))
    binary = package['bin']
    if isinstance(binary, dict): binary = next(iter(binary.values()))
    run(['node',packager/binary,app,'海拓',
         '--platform=darwin','--arch=arm64','--electron-version='+CFG['tools']['electron'],
         '--app-version='+version,'--build-version='+version,'--icon='+str(icon),
         '--app-bundle-id=com.haituo.desktop','--out=macos/out','--overwrite',
         '--asar.unpack=**/*.node','--extend-info=macos/Info.plist'])
    bundle = ROOT/'macos/out/海拓-darwin-arm64/海拓.app'
    p = bundle/'Contents/Info.plist'
    info = plistlib.loads(p.read_bytes());info['LSUIElement']=True;info.pop('LSBackgroundOnly',None)
    p.write_bytes(plistlib.dumps(info))
    run(['codesign','--force','--deep','--sign','-','--entitlements','macos/entitlements.plist',bundle])
    run(['codesign','--verify','--deep','--strict',bundle])
    image = ROOT/'macos/image'
    shutil.rmtree(image,ignore_errors=True);image.mkdir(parents=True)
    shutil.copytree(bundle,image/'海拓.app',symlinks=True)
    (image/'Applications').symlink_to('/Applications')
    dmg = ROOT/f'macos/out/海拓-{version}-arm64.dmg'
    for attempt in range(3):
        try:
            run(['hdiutil','create','-volname','海拓-'+version,'-srcfolder',image,'-ov','-format','UDZO',dmg])
            break
        except subprocess.CalledProcessError:
            if attempt==2:raise
            import time
            time.sleep(2)
    run(['hdiutil','verify',dmg])

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--target',choices=['windows','macos'],required=True)
    parser.add_argument('--test',action='store_true');args=parser.parse_args()
    if (args.target=='windows' and sys.platform!='win32') or (args.target=='macos' and sys.platform!='darwin'):
        raise SystemExit('Use a matching Windows x64 or macOS ARM64 machine.')
    app,tools=prepare(args.target)
    globals()[args.target](app,tools)
    if args.test:
        run([sys.executable,'scripts/test-project.py','--target',args.target])

if __name__=='__main__':main()
