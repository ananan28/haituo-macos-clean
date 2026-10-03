import pathlib,plistlib,shutil,subprocess,sys
app=pathlib.Path(sys.argv[1])
contents=app/'Contents'
helper=contents/'Helpers/HaituoAccount.app/Contents'
(helper/'MacOS').mkdir(parents=True,exist_ok=True)
info=plistlib.loads((contents/'Info.plist').read_bytes())
executable=info['CFBundleExecutable']
assert executable=='海拓',executable
shutil.copy2(contents/'MacOS'/executable,helper/'MacOS'/executable)
info.update(LSUIElement=True,LSBackgroundOnly=False,CFBundleIdentifier=info['CFBundleIdentifier']+'.accounts',CFBundleDisplayName='海拓账号')
info.pop('CFBundleURLTypes',None)
(helper/'Info.plist').write_bytes(plistlib.dumps(info))
for name in ['Frameworks','Resources']:
    (helper/name).symlink_to('../../../'+name,target_is_directory=True)
subprocess.run(['codesign','--force','--sign','-','--entitlements','macos/entitlements.plist',str(helper.parent)],check=True)
print('Created LSUIElement account helper:',helper.parent)
