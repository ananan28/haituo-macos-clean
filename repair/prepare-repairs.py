from pathlib import Path
import runpy, sys

sys.argv=['repair/patch-account-windows.py']
runpy.run_path('repair/patch-account-windows.py',run_name='__main__')
runpy.run_path('repair/patch-window-lifecycle.py',run_name='__main__')
p=Path('macos/staging/app/bundles/main.js')
s=p.read_text()
if 'HAITUO_VERIFY_RUNTIME' not in s:
    s+='\n'+Path('repair/verify-runtime.js').read_text()
p.write_text(s)
