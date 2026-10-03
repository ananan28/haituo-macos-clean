import pathlib, subprocess, tempfile, os, platform, json, signal
arch = 'arm64' if platform.machine() == 'arm64' else 'x64'
app = pathlib.Path(f'macos/out/海拓-darwin-{arch}/海拓.app/Contents/MacOS/海拓').resolve()
out = pathlib.Path('macos/out').resolve()
result = out/'settings-sync.json'
with tempfile.TemporaryDirectory(prefix='haituo-settings-test-') as profile:
    env = {**os.environ, 'HAITUO_SETTINGS_TEST':'1', 'HAITUO_SETTINGS_TEST_RESULT':str(result)}
    with (out/'settings-sync.log').open('w') as log:
        proc = subprocess.Popen([str(app),'--user-data-dir='+profile],env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        try:
            code = proc.wait(timeout=200)
            data = json.loads(result.read_text()) if result.exists() else {'ok':False,'error':'No sync test result'}
            print(json.dumps(data, ensure_ascii=False, indent=2))
            assert code == 0 and data['ok'], 'Cross-process settings sync test failed'
        finally:
            try: os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError: pass
