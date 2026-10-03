from pathlib import Path
p=Path('macos/staging/app/bundles/main.js')
s=p.read_text()
def edit(old,new):
    global s
    if s.count(old)!=1: raise RuntimeError('Unexpected refresh patch anchor: '+old[:80])
    s=s.replace(old,new,1)
edit('let Zg, Qg, caishengMenuOpen', 'let haituoLaunchSignalProfile;\nconst haituoMacRefreshPromises = new Map();\nlet Zg, Qg, caishengMenuOpen')
edit('p.ipcMain.handle(`caisheng:launch-signal-profile`, async (e, t) => {', 'p.ipcMain.handle(`caisheng:launch-signal-profile`, (haituoLaunchSignalProfile = async (e, t) => {')
edit('}), p.ipcMain.handle(`caisheng:refresh-signal-profile`, async (e, t) => {', '})), p.ipcMain.handle(`caisheng:refresh-signal-profile`, async (e, t) => {')
edit('    if (t === `signal-main`) return {\n        ok: caishengSoftRefreshWindow()\n    };', '''    if (t === `signal-main` && process.platform === `darwin`) {
        p.app.relaunch({args:process.argv.slice(1)});
        setTimeout(() => p.app.quit(), 100);
        return {ok:true};
    }
    if (t === `signal-main`) return {ok:caishengSoftRefreshWindow()};
    if (process.platform === `darwin` && haituoMacRefreshPromises.has(t)) return haituoMacRefreshPromises.get(t);''')
edit('    return caishengSendChild(child, { type: `caisheng-soft-refresh` }), setImmediate(caishengKeepMainShellVisible), {', '''    if (process.platform === `darwin`) {
        const refresh = (async () => {
            const exited = await new Promise(resolve => {
                const finish = () => { clearTimeout(timer); resolve(true); };
                const timer = setTimeout(() => { child.removeListener(`exit`, finish); resolve(false); }, 5000);
                child.once(`exit`, finish);
                caishengTerminateSignalChild(child);
            });
            if (!exited) return {ok:false};
            caishengLastWindowPayload.delete(t);
            return haituoLaunchSignalProfile(e,t);
        })();
        haituoMacRefreshPromises.set(t,refresh);
        try {return await refresh} finally {haituoMacRefreshPromises.delete(t)}
    }
    return caishengSendChild(child, { type: `caisheng-soft-refresh` }), setImmediate(caishengKeepMainShellVisible), {''')
p.write_text(s)
