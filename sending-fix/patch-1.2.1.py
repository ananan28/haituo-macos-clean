from pathlib import Path
p=Path('macos/staging/app/js/caisheng-webview-preload.js');s=p.read_text(encoding='utf-8')
def change(a,b):
 global s
 assert s.count(a)==1,(a[:100],s.count(a));s=s.replace(a,b,1)
helper='''function haituoSyncOutgoingControls() {
    const quick = document.getElementById("haituo-whatsapp-quick-input");
    if (quick) quick.placeholder = settings.blockChineseOutgoing ? (settings.translateShortcut === "triple-space" ? "输入中文后按 Enter 翻译并发送；Shift+Enter 换行；连续三次空格仅翻译" : "输入中文后按 Enter 翻译并发送；Shift+Enter 换行") : "按 Enter 直接发送原文；Shift+Enter 换行；点击翻译按钮可翻译";
    const send = panel?.querySelector('[data-haituo-translate-action="send"]');
    if (send) send.textContent = settings.blockChineseOutgoing ? "翻译并发送" : "直接发送";
    const block = panel?.querySelector('[data-haituo-block-chinese]');
    if (block) block.checked = !!settings.blockChineseOutgoing;
}

'''
change('async function refreshSettings() {',helper+'async function refreshSettings() {')
change('if(!!localHidden !== !!settings.hideTranslationBox || !!localBlock !== !!settings.blockChineseOutgoing)', 'if(!!localHidden !== !!settings.hideTranslationBox)')
change('        applyChatColor(), applyTranslatorTheme();\n    }\n});','        applyChatColor(), applyTranslatorTheme(), haituoSyncOutgoingControls();\n    }\n});')
change('applyChatColor(), applyTranslatorTheme(), wasHidden !==', 'applyChatColor(), applyTranslatorTheme(), haituoSyncOutgoingControls(), wasHidden !==')
change('}, applyChatColor(), applyTranslatorTheme(), await ipcRenderer.invoke("caisheng:set-translation-config", e);','}, applyChatColor(), applyTranslatorTheme(), haituoSyncOutgoingControls(), await ipcRenderer.invoke("caisheng:set-translation-config", e);')
change('r.type = "checkbox", r.checked = !!settings.blockChineseOutgoing, r.onchange', 'r.type = "checkbox", r.setAttribute("data-haituo-block-chinese", ""), r.checked = !!settings.blockChineseOutgoing, r.onchange')
change('document.body.append(panel), positionTranslator(e);','document.body.append(panel), haituoSyncOutgoingControls(), positionTranslator(e);')
change('const n = t.querySelector(e) || document.querySelector(e), o =', 'const n = t.querySelector(e), o =')
start=s.index('    const n = e.getBoundingClientRect(), o = [ ...t.querySelectorAll',s.index('function sendButtonFor'))
end=s.index('\n}',start)
s=s[:start]+'    return null;'+s[end:]
start=s.index('function sendOnce(e, t) {');end=s.index('\nasync function run(',start)
s=s[:start]+'''async function sendOnce(e, t) {
    const n = recentSends.get(e), o = Date.now();
    if (n && n.text === t && o - n.at < 1500) return !1;
    if (!e.isConnected || normalized(read(e).trim()) !== normalized(t.trim())) throw new Error("输入内容已变化，未发送");
    recentSends.set(e, { text: t, at: o });
    const button = sendButtonFor(e);
    if (button) button.click();
    else {
        e.focus();
        if (!await ipcRenderer.invoke("caisheng:web-native-send")) throw new Error("无法发送，请使用 WhatsApp 的发送按钮");
    }
    return !0;
}
''' +s[end:]
change('    const n = read(t).trim();\n    if (!n) return;','    const n = read(t).trim(), direct = e && !settings.blockChineseOutgoing;\n    if (!n) return;')
change('const o = await translate(n);\n            if (HAN.test(o))', 'const o = direct ? n : await translate(n);\n            if (!direct && HAN.test(o))')
change('t = await settleComposer(t, o);','t = await settleComposer(t, o, direct);')
change('if (e && HAN.test(read(t)))','if (e && !direct && HAN.test(read(t)))')
change('if (e && !sendOnce(t, o))','if (e && !await sendOnce(t, o))')
change('toast(e ? "已翻译并发送" : "已翻译并替换")','toast(e ? direct ? "已发送原文" : "已翻译并发送" : "已翻译并替换")')
change('if (!sendOnce(composer, translated))','if (!await sendOnce(composer, translated))')
change('    const runQuick = async (forceAi, sendAfter = !1) => {', '    let quickActionPending = !1;\n    const runQuick = async (forceAi, sendAfter = !1) => {')
change('        if (!source || !composer) return;\n        quickTranslate.disabled', '        if (!source || !composer || quickActionPending || busy.has(composer)) return;\n        quickActionPending = !0; busy.add(composer);\n        quickTranslate.disabled')
change('            quickTranslate.disabled = quickRetranslate.disabled = a.disabled = s.disabled = !1, sendAfter', '            quickActionPending = !1; busy.delete(composer);\n            quickTranslate.disabled = quickRetranslate.disabled = a.disabled = s.disabled = !1, sendAfter')
change('        quickActionPending = !0; busy.add(composer);', '        const nativeBefore = read(composer);\n        quickActionPending = !0; busy.add(composer);')
change('            clearComposer(composer), write(composer, translated),', '            if (!composer.isConnected || findComposer() !== composer || read(composer) !== nativeBefore) throw new Error("消息框已变化，未覆盖或发送；请重试");\n            clearComposer(composer), write(composer, translated),')
change('            t = findComposer() || t, clearComposer(t), write(t, o),', '            if (!t.isConnected || findComposer() !== t || read(t).trim() !== n) throw new Error("消息框已变化，未覆盖或发送；请重试");\n            clearComposer(t), write(t, o),')
change('    const n = read(t).trim(), direct = e && !settings.blockChineseOutgoing;', '    const n = read(t).trim(), outgoingMode = !!settings.blockChineseOutgoing, direct = e && !outgoingMode;')
change('read(t).trim() !== n) throw', 'read(t).trim() !== n || e && outgoingMode !== !!settings.blockChineseOutgoing) throw')
change('        const nativeBefore = read(composer);', '        const nativeBefore = read(composer), outgoingMode = !!settings.blockChineseOutgoing;')
change('read(composer) !== nativeBefore) throw', 'read(composer) !== nativeBefore || sendAfter && outgoingMode !== !!settings.blockChineseOutgoing) throw')
change('async function sendOnce(e, t) {', 'async function sendOnce(e, t, expectedMode = !!settings.blockChineseOutgoing) {')
change('    if (!e.isConnected || normalized(read(e).trim())', '    if (expectedMode !== !!settings.blockChineseOutgoing) throw new Error("发送模式已变化，未发送；请重试");\n    if (!e.isConnected || normalized(read(e).trim())')
change('await sendOnce(t, o)', 'await sendOnce(t, o, outgoingMode)')
change('await sendOnce(composer, translated)', 'await sendOnce(composer, translated, outgoingMode)')
# Preserve newest local values while acknowledged writes are queued; old broadcasts
# must not revert a later click. Failed saves restore authoritative settings visibly.
change('function haituoSyncOutgoingControls() {', 'let haituoSaveQueue = Promise.resolve(), haituoSaveRevision = 0;\nconst haituoPendingSettings = new Map();\nfunction haituoPendingValues() { return Object.fromEntries([...haituoPendingSettings].map(([key, entry]) => [key, entry.value])); }\nfunction haituoSyncOutgoingControls() {')
change('settings = { ...settings, ...next };', 'settings = { ...settings, ...next, ...haituoPendingValues() };')
change('            ...e\n        }), settings.targetLanguage', '            ...e, ...haituoPendingValues()\n        }), settings.targetLanguage')
start=s.index('async function saveSettings(e) {');end=s.index('\nfunction isWhatsApp()',start)
s=s[:start]+"""async function saveSettings(e) {
    const revision = ++haituoSaveRevision;
    for (const [key, value] of Object.entries(e)) haituoPendingSettings.set(key, { revision, value });
    Object.prototype.hasOwnProperty.call(e, "hideTranslationBox") && (panelPreferencePendingUntil = Date.now() + 3000);
    settings = { ...settings, ...e };
    applyChatColor(); applyTranslatorTheme(); haituoSyncOutgoingControls();
    const operation = haituoSaveQueue.then(() => ipcRenderer.invoke("caisheng:set-translation-config", e));
    haituoSaveQueue = operation.catch(() => {});
    try { await operation; }
    catch (error) {
        for (const key of Object.keys(e)) if (haituoPendingSettings.get(key)?.revision === revision) haituoPendingSettings.delete(key);
        await refreshSettings();
        toast(`设置保存失败：${error instanceof Error ? error.message : String(error)}`, !0);
        return !1;
    }
    for (const key of Object.keys(e)) if (haituoPendingSettings.get(key)?.revision === revision) haituoPendingSettings.delete(key);
    haituoSyncOutgoingControls();
    return !0;
}
"""+s[end:]
p.write_text(s,encoding='utf-8')
p=Path('macos/staging/app/bundles/main.js');s=p.read_text(encoding='utf-8')
anchor='p.ipcMain.removeHandler(`caisheng:set-translation-config`)'
assert s.count(anchor)==1
handler='''p.ipcMain.removeHandler(`caisheng:web-native-send`), p.ipcMain.handle(`caisheng:web-native-send`, async event => {
        const sender = event.sender;
        const frame = event.senderFrame;
        let url;
        try { url = new URL(frame?.url || ``); } catch { return false; }
        if (frame !== sender.mainFrame || url.protocol !== `https:` || ![`web.whatsapp.com`, `web.telegram.org`].includes(url.hostname)) return false;
        const host = p.BrowserWindow.fromWebContents(sender);
        if (!host || host.isDestroyed() || !host.isVisible() || host.isMinimized()) return false;
        host.focus(); sender.focus();
        sender.sendInputEvent({type:`keyDown`,keyCode:`Enter`});
        sender.sendInputEvent({type:`keyUp`,keyCode:`Enter`});
        return true;
    }), '''
s=s.replace(anchor,handler+anchor,1)
a='            e.focused?caishengFocusedSignals.add(t):caishengFocusedSignals.delete(t);\n            return;'
assert s.count(a)==1
s=s.replace(a,'            const newlyFocused = e.focused && !caishengFocusedSignals.has(t);\n            e.focused ? caishengFocusedSignals.add(t) : caishengFocusedSignals.delete(t);\n            if (newlyFocused && process.platform === `darwin` && Zg?.id === t && Z?.isVisible() && !Z.isMinimized()) {\n                Z.showInactive(); Z.moveTop(); haituoMacOrderSelectedAccount();\n            }\n            return;',1)
start=s.index('function caishengSoftRefreshWindow() {');end=s.index('\nlet caishengParentHeartbeat',start)
s=s[:start]+"""function caishengSoftRefreshWindow() {
    if (!Z || Z.isDestroyed() || Z.webContents.isDestroyed()) return !1;
    if (caishengSoftRefreshPromise) return !0;
    const contents = Z.webContents;
    caishengSoftRefreshPromise = new Promise((resolve, reject) => {
        let timer;
        const cleanup = () => { clearTimeout(timer); contents.removeListener(`did-finish-load`, loaded); contents.removeListener(`destroyed`, destroyed); };
        const loaded = () => {cleanup();resolve()};
        const destroyed = () => {cleanup();resolve()};
        contents.once(`did-finish-load`, loaded); contents.once(`destroyed`, destroyed);
        timer = setTimeout(() => {cleanup();reject(new Error(`Signal refresh navigation timed out`))}, 30000);
        // Leave the initiating IPC/executeJavaScript stack before native navigation.
        setImmediate(() => {
            if (contents.isDestroyed()) return destroyed();
            try { contents.reloadIgnoringCache(); } catch(error) {cleanup();reject(error)}
        });
    }).catch(error => X.warn(`Haituo refresh failed: ${error?.message ?? error}`)).finally(() => { caishengSoftRefreshPromise = null; });
    return !0;
}
"""+s[end:]

a='''if (process.env.HAITUO_VERIFY_RUNTIME === `1` && title === `新增账号`) setTimeout(() => {finish(`signal`);menu.closePopup(Z)},300);'''
assert s.count(a)==1
s=s.replace(a,'''if (process.env.HAITUO_VERIFY_RUNTIME === `1` && title === `新增账号`) process.once(`haituo-verify-select-add-account`, () => {finish(`signal`);menu.closePopup(Z)});''',1)
p.write_text(s,encoding='utf-8')
print('1.2.1: synchronized outgoing controls, raw top-button send, semantic-only send buttons and native Enter fallback')
