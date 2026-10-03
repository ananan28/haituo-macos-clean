from pathlib import Path

p = Path('macos/staging/app/bundles/main.js')
s = p.read_text()
def edit(old, new):
    global s
    assert s.count(old) == 1, (old[:90], s.count(old))
    s = s.replace(old, new, 1)

# Only the workspace process writes shared settings. Child changes are acknowledged
# after the durable write and broadcast, rather than overwriting a shared JSON file.
edit('function haituoApplyTranslationConfig(t) {', '''function haituoApplyTranslationConfig(t) {
    if ($u !== `signal-main` && process.connected) return haituoRequestGlobalSettings(t);''')
edit('haituoApplyTranslationConfig({ ...$p(), ...t }))), p.ipcMain.removeHandler(`caisheng:get-translation-config`)', 'haituoApplyTranslationConfig({ ...$p(), ...t, ...(typeof t?.darkTheme === `boolean` && !t?.nativeTheme ? {nativeTheme:t.darkTheme ? `dark` : `light`} : {}) }))), p.ipcMain.removeHandler(`caisheng:get-translation-config`)')
edit('    em(Zp), haituoBroadcastTranslationConfig(Zp);', '''    em(Zp), haituoBroadcastTranslationConfig(Zp);
    haituoPublishGlobalSettings(Zp);''')
edit('    }), r.on(`message`, e => {', '''    }), r.on(`message`, e => {
        if (Yg.get(t) === r && e?.type === `haituo-global-settings-request`) {
            try {
                haituoApplyTranslationConfig({ ...$p(), ...e.config });
                caishengSendChild(r, {type:`haituo-global-settings-ack`, requestId:e.requestId, ok:true});
            } catch (error) {
                caishengSendChild(r, {type:`haituo-global-settings-ack`, requestId:e.requestId, ok:false, error:String(error?.message || error)});
            }
            return;
        }''')
edit('''    }), (0, m.writeFileSync)(Qp, JSON.stringify(e), {
        encoding: `utf8`,
        mode: 384
    });''', '''    });
    const temporary = `${Qp}.${process.pid}.tmp`;
    (0, m.writeFileSync)(temporary, JSON.stringify(e), {encoding:`utf8`, mode:384});
    (0, m.renameSync)(temporary, Qp);''')
s += '\n' + Path('macos/settings-sync-main.js').read_text()
s += '\n' + Path('macos/settings-sync-test-hook.js').read_text()
edit('            if (process.env.HAITUO_MESSAGE_TEST === `1` && h) setTimeout(haituoTestMessageScanning, 1000);', '''            if (process.env.HAITUO_MESSAGE_TEST === `1` && h) setTimeout(haituoTestMessageScanning, 1000);
            if (process.env.HAITUO_SETTINGS_TEST === `1` && h) setTimeout(haituoTestSettingsSync, 1000);''')
p.write_text(s)
print('Installed acknowledged parent-owned settings distribution')
