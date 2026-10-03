"""Restore verified baseline, apply release repairs, fetch Windows native addons."""
import pathlib, json, hashlib, io, zipfile, shutil, runpy, tarfile, urllib.request
root = pathlib.Path(__file__).resolve().parent.parent
import os
os.chdir(root)
m = json.loads(pathlib.Path('source-manifest.json').read_text())
data = b''.join(pathlib.Path(p).read_bytes() for p in m['parts'])
assert hashlib.sha256(data).hexdigest() == m['sha256']
with zipfile.ZipFile(io.BytesIO(data)) as z:
    z.extractall('.')
app = root / 'macos/staging/app'
if app.exists(): shutil.rmtree(app)
shutil.copytree(root / 'work/app', app)
runpy.run_path('repair/prepare-repairs.py', run_name='__main__')
pkg = json.loads((app/'package.json').read_text())
pkg['signalProtocolVersion'] = pkg['version']
pkg['version'] = '1.1.23'
(app/'package.json').write_text(json.dumps(pkg, ensure_ascii=False, indent=2), encoding='utf-8')
runpy.run_path('windows/patch-network.py',run_name='__main__')
def fetch(url):
    with urllib.request.urlopen(url, timeout=120) as response: return response.read()
def extract(data, dest, prefix=''):
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        for member in archive.getmembers():
            if not member.name.startswith(prefix): continue
            target = dest / member.name[len(prefix):]
            if not target.resolve().is_relative_to(dest.resolve()): raise ValueError('Unsafe archive')
            if member.isfile():
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.extractfile(member).read())
mods = app/'node_modules'
for name in ['@signalapp/libsignal-client', '@signalapp/sqlcipher', '@indutny/simple-windows-notifications']:
    dest = mods/name
    version = json.loads((dest/'package.json').read_text())['version']
    meta = json.loads(fetch('https://registry.npmjs.org/'+name.replace('/', '%2f')+'/'+version))
    payload = fetch(meta['dist']['tarball'])
    assert hashlib.sha1(payload).hexdigest() == meta['dist']['shasum'], name
    extract(payload, dest, 'package/')
    print('Prepared', name, version)
dest = mods/'@signalapp/ringrtc'
ring = json.loads((dest/'package.json').read_text())
payload = fetch(ring['config']['prebuildUrl'].replace('${npm_package_version}',ring['version']))
assert hashlib.sha256(payload).hexdigest() == ring['config']['prebuildChecksum']
extract(payload, dest)
for name in ['@signalapp/libsignal-client', '@signalapp/sqlcipher']:
    native = list((mods/name/'prebuilds').glob('win32-x64/*.node'))
    assert native, 'Missing Windows native module: '+name
    assert all(p.read_bytes()[:2] == b'MZ' for p in native)
assert list((dest/'build/win32').rglob('*.node')), 'Missing RingRTC Windows native module'
config = {
    'appId': 'com.haituo.desktop', 'productName': '海拓',
    'directories': {'app': 'macos/staging/app', 'output': 'windows/out'},
    'electronVersion': '44.1.0', 'npmRebuild': False,
    'asar': True, 'asarUnpack': ['**/*.node', '**/*.dll'],
    'win': {'target': [{'target':'nsis','arch':['x64']}], 'icon':'work/app/build/icons/win/icon.ico', 'signAndEditExecutable':False},
    'nsis': {'oneClick':False, 'perMachine':False, 'allowToChangeInstallationDirectory':True,
             'createDesktopShortcut':True, 'artifactName':'Haituo-${version}-Windows-${arch}-Setup.${ext}'}
}
pathlib.Path('windows/builder.json').write_text(json.dumps(config,ensure_ascii=False,indent=2),encoding='utf-8')
print('Prepared repaired Windows application 1.1.23')
