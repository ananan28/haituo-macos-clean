import pathlib,tempfile,subprocess,os,signal,time
app=pathlib.Path('macos/out/海拓-darwin-arm64/海拓.app/Contents/MacOS/海拓').resolve()
out=pathlib.Path('macos/live').resolve();out.mkdir(parents=True,exist_ok=True)
profile=str(out/'profile')
if True:
 env={**os.environ,'HAITUO_SIGNAL_LIVE_TEST':'1','HAITUO_SIGNAL_LIVE_DIR':str(out)}
 with (out/'client.log').open('w') as log:
  proc=subprocess.Popen([str(app),'--user-data-dir='+profile],env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
  try:
   deadline=time.time()+1250
   while proc.poll() is None and time.time()<deadline:
    subprocess.run(['python','macos/signal-live-diagnostics.py',str(out),str(out/'diagnostics.json')],check=True)
    time.sleep(2)
  finally:
   try:os.killpg(proc.pid,signal.SIGKILL)
   except ProcessLookupError:pass
