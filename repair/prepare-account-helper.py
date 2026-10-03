import pathlib,plistlib,sys
app=pathlib.Path(sys.argv[1])
p=app/'Contents/Info.plist'
info=plistlib.loads(p.read_bytes())
info['LSUIElement']=True
info.pop('LSBackgroundOnly',None)
p.write_bytes(plistlib.dumps(info))
print('Configured agent startup; main process alone promotes to regular Dock application')
