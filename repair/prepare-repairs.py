from pathlib import Path
import runpy, shutil
for source in Path('repair/baseline').iterdir():
    if source.is_file(): shutil.copy2(source,Path('macos')/source.name)
for name in ['account-windows','window-lifecycle','native-interface','message-scanning','settings-sync']:
    runpy.run_path(f'macos/patch-{name}.py',run_name='__main__')
runpy.run_path('repair/patch-regressions.py',run_name='__main__')
runpy.run_path('repair/patch-1.1.19.py',run_name='__main__')
runpy.run_path('repair/patch-1.1.20.py',run_name='__main__')
runpy.run_path('repair/patch-1.1.21.py',run_name='__main__')
p=Path('macos/staging/app/bundles/main.js')
p.write_text(p.read_text()+'\n'+Path('repair/verify-runtime.js').read_text())
