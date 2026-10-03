import pathlib, subprocess, tempfile, time, os, signal, platform
arch = "arm64" if platform.machine() == "arm64" else "x64"
app = pathlib.Path(f"macos/out/海拓-darwin-{arch}/海拓.app/Contents/MacOS/海拓").resolve()
out = pathlib.Path("macos/out")
with tempfile.TemporaryDirectory(prefix="haituo-smoke-") as profile:
    with (out / "startup.log").open("w") as log:
        proc = subprocess.Popen([str(app), "--user-data-dir=" + profile], stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            time.sleep(15)
            code = proc.poll()
            subprocess.run(["screencapture", "-x", str(out / "startup.png")], check=False)
            if code is not None:
                raise RuntimeError(f"App exited during startup: {code}; inspect startup.log")
            print("Startup process remained alive for 15 seconds. Login and UI checks still required.")
        finally:
            try:
                os.killpg(proc.pid, signal.SIGTERM)
                proc.wait(timeout=5)
            except (ProcessLookupError, subprocess.TimeoutExpired):
                try: os.killpg(proc.pid, signal.SIGKILL)
                except ProcessLookupError: pass
