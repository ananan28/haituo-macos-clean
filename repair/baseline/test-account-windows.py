import pathlib,subprocess,tempfile,os,platform,json,signal,time
arch='arm64' if platform.machine()=='arm64' else 'x64'
app=pathlib.Path(f'macos/out/海拓-darwin-{arch}/海拓.app/Contents/MacOS/海拓').resolve()
out=pathlib.Path('macos/out').resolve();result=out/'account-windows.json'
with tempfile.TemporaryDirectory(prefix='haituo-window-test-') as profile:
    env={**os.environ,'HAITUO_WINDOW_TEST':'1','HAITUO_WINDOW_TEST_RESULT':str(result)}
    with (out/'account-windows.log').open('w') as log:
        proc=subprocess.Popen([str(app),'--user-data-dir='+profile],env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        try:
            code=proc.wait(timeout=900)
            data=json.loads(result.read_text()) if result.exists() else {'ok':False,'error':'No window test report'}
            print(json.dumps(data,ensure_ascii=False,indent=2))
            print('Window test exit code:',code)
            if code!=0:
                print((out/'account-windows.log').read_text(errors='replace')[-18000:])
            assert code==0 and data['ok'],'Account window test failed'
            main_result=pathlib.Path(str(result)+'.main-refresh.json')
            deadline=time.monotonic()+100
            while not main_result.exists() and time.monotonic()<deadline: time.sleep(.5)
            main_data=json.loads(main_result.read_text()) if main_result.exists() else {'ok':False,'error':'Main restart report not found'}
            print('Main refresh test:',json.dumps(main_data,ensure_ascii=False))
            assert main_data['ok'],'Main refresh failed'
        finally:
            try: os.killpg(proc.pid,signal.SIGKILL)
            except ProcessLookupError: pass
