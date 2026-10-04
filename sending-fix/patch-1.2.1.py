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
s=s.replace(anchor,handler+anchor,1);p.write_text(s,encoding='utf-8')
print('1.2.1: synchronized outgoing controls, raw top-button send, semantic-only send buttons and native Enter fallback')
