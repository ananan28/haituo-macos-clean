import pathlib,subprocess,tempfile,os,sys,time,json
mode=sys.argv[1];out=pathlib.Path('windows/verification').resolve();out.mkdir(parents=True,exist_ok=True)
app=pathlib.Path('windows/out/win-unpacked/海拓.exe').resolve();report=out/(mode+'-audit.json');env={**os.environ}
if mode=='runtime':env.update(HAITUO_WINDOWS_RUNTIME='1',HAITUO_WINDOWS_REPORT=str(report))
else:env.update({f'HAITUO_{mode.upper()}_TEST':'1',f'HAITUO_{mode.upper()}_TEST_RESULT':str(report)})
with tempfile.TemporaryDirectory(prefix='haituo-win-audit-',ignore_cleanup_errors=True) as profile:
 logpath=out/(mode+'-audit.log')
 with logpath.open('w') as log:
  proc=subprocess.Popen([str(app),'--user-data-dir='+profile],env=env,stdout=log,stderr=subprocess.STDOUT)
  try:
   deadline=time.monotonic()+200
   while proc.poll() is None and time.monotonic()<deadline:
    if report.exists():
     partial=json.loads(report.read_text(encoding='utf-8'))
     if partial.get('ok') or partial.get('error'):break
    time.sleep(.5)
   data=json.loads(report.read_text(encoding='utf-8')) if report.exists() else {'ok':False,'error':'No fixture report before deadline','exit':proc.poll()}
   print('WINDOWS_AUDIT_REPORT',json.dumps(data,ensure_ascii=False),flush=True)
   if not data.get('ok'):print(logpath.read_text(errors='replace')[-24000:],flush=True)
  finally:
   subprocess.run(['taskkill','/PID',str(proc.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=15)
   try:proc.wait(timeout=10)
   except subprocess.TimeoutExpired:proc.kill()
   for p in pathlib.Path(profile).rglob('*.log'):
    if 'logs' in p.parts:(out/(mode+'-'+p.name)).write_bytes(p.read_bytes()[-100000:])
  if not data.get('ok'):sys.exit(1)
