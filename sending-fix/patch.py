from pathlib import Path
p=Path('macos/staging/app/js/caisheng-webview-preload.js');s=p.read_text(encoding='utf-8')
def change(old,new):
 global s
 assert s.count(old)==1,(old[:80],s.count(old));s=s.replace(old,new,1)
change('    if (!t || !HAN.test(read(t))) return !1;\n    if (settings.blockChineseOutgoing)', '    if (!settings.blockChineseOutgoing || !t || !HAN.test(read(t))) return !1;\n    if (settings.blockChineseOutgoing)')
change('async function settleComposer(e, t) {','async function settleComposer(e, t, allowChinese = !1) {')
change('if (!HAN.test(a) && normalized(a) === normalized(t)) return o;','if ((allowChinese || !HAN.test(a)) && normalized(a) === normalized(t)) return o;')
change('        const source = quick.value.trim(), composer = findComposer() || activeComposer;', '        const source = quick.value.trim(), composer = findComposer() || activeComposer, direct = sendAfter && !forceAi && !settings.blockChineseOutgoing;')
change('toast(forceAi ? "正在结合上下文重新翻译…" : "正在翻译…");','toast(direct ? "正在发送原文…" : forceAi ? "正在结合上下文重新翻译…" : "正在翻译…");')
change('result = forceAi ? await ipcRenderer.invoke("caisheng:translate",', 'result = direct ? { text: source } : forceAi ? await ipcRenderer.invoke("caisheng:translate",')
change('if (!translated || HAN.test(translated)) throw new Error("译文仍含中文，未填入消息框");','if (!translated || !direct && HAN.test(translated)) throw new Error("译文仍含中文，未填入消息框");')
change('await settleComposer(composer, translated);','await settleComposer(composer, translated, direct);')
change('hideBackTranslation(), toast("已翻译并发送");','hideBackTranslation(), toast(direct ? "已发送原文" : "已翻译并发送");')
change('    let quickSpaceCount = 0, quickSpaceAt = 0;', '''    if (!settings.blockChineseOutgoing) quick.placeholder = "按 Enter 直接发送原文；Shift+Enter 换行；点击翻译按钮可翻译";
    let quickSpaceCount = 0, quickSpaceAt = 0;''')
change('        const localHidden = settings.hideTranslationBox;','        const localHidden = settings.hideTranslationBox, localBlock = settings.blockChineseOutgoing;')
change('if(!!localHidden !== !!settings.hideTranslationBox){','if(!!localHidden !== !!settings.hideTranslationBox || !!localBlock !== !!settings.blockChineseOutgoing){')
p.write_text(s,encoding='utf-8')
print('Chinese outgoing OFF: native send and quick Enter send original; explicit translate remains available')
