import pathlib,subprocess,tempfile,os,sys,time,json,signal,plistlib
mode=sys.argv[1]
out=pathlib.Path('macos/verification').resolve();out.mkdir(parents=True,exist_ok=True)
app=pathlib.Path('macos/out/海拓-darwin-arm64/海拓.app/Contents/MacOS/海拓').resolve()
report=out/(mode+'-audit.json')
env={**os.environ}
if mode=='runtime':
 tool=out/'window-order'
 subprocess.run(['swiftc','repair/window-order.swift','-o',str(tool)],check=True,timeout=90)
 env.update(HAITUO_VERIFY_RUNTIME='1',HAITUO_VERIFY_RESULT=str(report),HAITUO_WINDOW_ORDER_TOOL=str(tool))
elif mode in ['message','settings']:
 env.update({f'HAITUO_{mode.upper()}_TEST':'1',f'HAITUO_{mode.upper()}_TEST_RESULT':str(report)})
else:raise Exception(mode)
with tempfile.TemporaryDirectory(prefix='haituo-audit-'+mode+'-') as profile:
 logpath=out/(mode+'-audit.log')
 with logpath.open('w') as log:
  proc=subprocess.Popen([str(app),'--user-data-dir='+profile],env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
  deadline=time.monotonic()+180
  try:
   while not report.exists() and proc.poll() is None and time.monotonic()<deadline:time.sleep(.5)
   data=json.loads(report.read_text()) if report.exists() else {'ok':False,'error':'No fixture report before deadline','exit':proc.poll()}
   print('AUDIT_REPORT',json.dumps(data,ensure_ascii=False),flush=True)
   if not data.get('ok'):print(logpath.read_text(errors='replace')[-22000:],flush=True)
  finally:
   try:os.killpg(proc.pid,signal.SIGTERM)
   except ProcessLookupError:pass
   try:proc.wait(timeout=10)
   except subprocess.TimeoutExpired:
    try:os.killpg(proc.pid,signal.SIGKILL)
    except ProcessLookupError:pass
   # Only the fresh test profile is collected. No real user profile is accessed.
   for p in pathlib.Path(profile).rglob('*.log'):
    if 'logs' in p.parts:
     (out/(mode+'-'+p.name)).write_bytes(p.read_bytes()[-100000:])
  if not data.get('ok'):sys.exit(1)
