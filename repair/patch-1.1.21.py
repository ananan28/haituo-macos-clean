from pathlib import Path
def change(text,old,new):
    assert text.count(old)==1,(old[:100],text.count(old))
    return text.replace(old,new,1)
root=Path('macos/staging/app')
p=root/'bundles/main.js';s=p.read_text()
s=change(s,'e._hideTranslationDefaultV2028 || (e.hideTranslationBox = !1, e.darkTheme = !1, e._hideTranslationDefaultV2028 = !0, changed = !0)','e._hideTranslationDefaultV2028 || (typeof e.hideTranslationBox===`boolean` || (e.hideTranslationBox=false), e._hideTranslationDefaultV2028 = !0, changed = !0)')
s=change(s,'        _nativeAppearanceV1111: true,\n        hideTranslationBox:', '        _nativeAppearanceV1111: true,\n        _hideTranslationDefaultV2028: true,\n        hideTranslationBox:')
s=change(s,'function haituoMacOrderSelectedAccount() {','p.ipcMain.removeAllListeners(`haituo:order-selected-account`);p.ipcMain.on(`haituo:order-selected-account`,()=>haituoMacOrderSelectedAccount());\n\nfunction haituoMacOrderSelectedAccount() {')
s=change(s,'        visible: r,\n        chatTextColor:', '        visible: r,\n        parentSourceId: Z?.getMediaSourceId(),\n        chatTextColor:')
s=change(s,'    Z.show();\n    Z.moveTop();\n    Z.focus();\n    Z.webContents.focus();','    Z.showInactive();\n    if(Qg.parentSourceId)try{Z.moveAbove(Qg.parentSourceId)}catch{}')
s=change(s,'    $u !== `signal-main` && Object.assign(g, {\n        frame: !1,','    $u !== `signal-main` && Object.assign(g, {\n        titleBarStyle: `default`,\n        frame: !1,')
s=change(s,'    Z = new p.BrowserWindow(g), p.Menu.setApplicationMenu(null)', '    Z = new p.BrowserWindow(g), (process.platform===`darwin`&&$u!==`signal-main`&&Z.setWindowButtonVisibility(false)), p.Menu.setApplicationMenu(null)')
s=s.replace('win.setAlwaysOnTop(!0, `screen-saver`, 1), win.show(), win.moveTop(), win.focus();','win.setAlwaysOnTop(false), win.show(), win.focus();')
s=change(s,'''    for (const delay of [ 50, 150, 320 ]) setTimeout(() => {
        if (!win || win.isDestroyed()) return;
        try {
            haituoMacOrderSelectedAccount();
        win.setAlwaysOnTop(false), win.show(), win.focus();
        } catch {}
    }, delay);''','''    // A user-requested overlay must not reclaim focus after another app is activated.''')
s=change(s,'async function haituoShowSettingsWindow() {','''async function haituoShowSettingsWindow() {
    if(process.platform===`darwin`){
        if($u!==`signal-main`){process.send?.({type:`haituo-show-settings-panel`});return{ok:true}}
        if(!Z||Z.isDestroyed())return{ok:false};
        await Z.webContents.executeJavaScript(`(()=>{if(!document.querySelector('.CaishengPlatformShell__settings'))document.querySelector('.CaishengPlatformShell__settingsButton')?.click()})()`);
        return{ok:true};
    }''')
s=change(s,'    }), r.on(`message`, e => {','''    }), r.on(`message`, e => {
        if(Yg.get(t)===r&&e?.type===`haituo-show-settings-panel`){haituoShowSettingsWindow().catch(error=>X.warn(String(error)));return}''')
s=change(s,'n.apiKey.trim() : ``, kepplKey','n.apiKey.trim().replace(/^Bearer\\s+/iu, ``) : ``, kepplKey')
s=change(s,'        const a = Buffer.from(t?.bytes ?? []);','''        if(preferredVoiceProvider===`openai`&&!openAIKey)throw Error(`请在设置中填写 OpenAI API Key 并保存`);
        if(preferredVoiceProvider===`groq`&&!r)throw Error(`请在设置中填写 Groq API Key 并保存`);
        const a = Buffer.from(t?.bytes ?? []);''')
s=change(s,'i = `voice\\0${o}`;', 'i = `voice\\0${preferredVoiceProvider}\\0${n.endpoint||``}\\0${o}`;')
s=change(s,'`${url.replace(/\\/$/u, ``)}/audio/transcriptions`','`${url.replace(/\\/$/u, ``).replace(/\\/(chat\\/completions|audio\\/transcriptions)$/u, ``)}/audio/transcriptions`')
s=change(s,'            if (!response.ok) throw Error(`${provider}语音识别失败：HTTP ${response.status}`);','''            if (!response.ok) {
                const error=Error(response.status===401||response.status===403 ? `${provider}认证失败（HTTP ${response.status}），请检查当前 API 地址与 API Key 是否匹配、密钥是否有效，并保存设置后重试` : `${provider}语音识别失败：HTTP ${response.status}`);
                error.status=response.status;throw error;
            }''')
s=s.replace('            errors.push(e instanceof Error ? e.message : String(e));','            if(e?.status===401||e?.status===403)throw e;\n            errors.push(e instanceof Error ? e.message : String(e));')
p.write_text(s)
p=root/'bundles/preload/main.js';s=p.read_text()
s=change(s,'e._hideTranslationDefaultV2028 || (e.hideTranslationBox = !1, e.darkTheme = !1, e._hideTranslationDefaultV2028 = !0)','e._hideTranslationDefaultV2028 || (typeof e.hideTranslationBox===`boolean` || (e.hideTranslationBox=false), e._hideTranslationDefaultV2028 = !0)')
s=change(s,'            caishengShowSettingsWindow() {','            caishengOrderSelectedAccount() {u.ipcRenderer.send(`haituo:order-selected-account`)},\n            caishengShowSettingsWindow() {')
s=change(s,'        function A(e, a = u ? 400 : 0, forceVisible = !1) {','''        (0,D9.useEffect)(()=>{
            if(window.SignalContext.OS.platform!==`darwin`)return;
            const timers=new Set();
            const order=()=>{for(const delay of [0,80,200]){const timer=setTimeout(()=>{timers.delete(timer);window.SignalContext.caishengOrderSelectedAccount()},delay);timers.add(timer)}};
            document.addEventListener('pointerup',order,true);
            return()=>{document.removeEventListener('pointerup',order,true);for(const timer of timers)clearTimeout(timer)};
        },[]);
        function A(e, a = u ? 400 : 0, forceVisible = !1) {''')
s=change(s,'                        if (window.SignalContext.OS.platform === `darwin`) {d(!1);l(!1);await window.SignalContext.caishengShowSettingsWindow();return}\n','')
s=change(s,'const t = { ...m, ...x_(), ...e };','const t = { ...x_(), ...m, ...e };')
s=change(s,'h(t), kve(t, e), _(`设置已保存`);','h(t), kve(t), _(`设置已保存`);')
s=s.replace('onChange: e => N({ voiceTranscriptionProvider: e.target.value })','onChange: e => Q({ voiceTranscriptionProvider: e.target.value })')
s=s.replace('当前版本 1.1.20','当前版本 1.1.21').replace('海拓 1.1.7 即时颜色与静音复测版','海拓 1.1.21');p.write_text(s)
p=root/'js/caisheng-webview-preload.js';s=p.read_text()
s=change(s,'        localPanelPreference !== null && (settings.hideTranslationBox = localPanelPreference);','        localPanelPreference = null;\n        if(!!localHidden !== !!settings.hideTranslationBox){panel?.remove();panel=null;if(findComposer())showPanel(findComposer());}')
s=change(s,'        localPanelPreference !== null && (settings.hideTranslationBox = localPanelPreference),','        localPanelPreference = null,')
p.write_text(s)
print('Applied 1.1.21: inline settings, normal window level, frameless accounts, canonical hide preference, authenticated audio routing')

p=root/'stylesheets/manifest.css'
p.write_text(p.read_text()+"\n.CaishengPlatformShell__settings{overflow-y:scroll;scrollbar-gutter:stable}.CaishengPlatformShell__settings::-webkit-scrollbar{width:12px}.CaishengPlatformShell__settings::-webkit-scrollbar-thumb{background:#888;border:3px solid transparent;border-radius:8px;background-clip:padding-box}.CaishengPlatformShell__settings::-webkit-scrollbar-track{background:rgba(127,127,127,.12)}")
p=root/'stylesheets/haituo-layout.css'
p.write_text(p.read_text()+"\n.CaishengPlatformShell__settings{width:390px!important;max-width:calc(100vw - 12px)!important;overflow-y:scroll!important;overflow-x:hidden!important;white-space:normal!important;overflow-wrap:anywhere;scrollbar-gutter:stable;box-sizing:border-box!important}.CaishengPlatformShell__settings>label{min-width:0;max-width:100%}.CaishengPlatformShell__settings input:not([type=checkbox]),.CaishengPlatformShell__settings select{min-width:0!important;max-width:100%!important;box-sizing:border-box!important}.CaishengPlatformShell__settings::-webkit-scrollbar{width:12px}.CaishengPlatformShell__settings::-webkit-scrollbar-thumb{background:#888;border:3px solid transparent;border-radius:8px;background-clip:padding-box}.CaishengPlatformShell__settings::-webkit-scrollbar-track{background:rgba(127,127,127,.12)}")
