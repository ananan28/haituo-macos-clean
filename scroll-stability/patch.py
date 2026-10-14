from pathlib import Path
root=Path('macos/staging/app');helper=Path('scroll-stability/scroll.js').read_text()
p=root/'bundles/preload/main.js';s=p.read_text()
a='    function Ive({text: e, quoted: quote = !1}) {';assert s.count(a)==1
s=s.replace(a,helper+'\n'+a,1)
a='[t, n] = (0, w_.useState)(``), [r, a]';assert s.count(a)==1
s=s.replace(a,'[t, haituoSetTranslation] = (0, w_.useState)(() => haituoCachedSignalTranslation(e)), [r, a]',1)
a='        w_.useCallback)(async () => {\n            a(!0), s(``);'
start=s.index('    function Ive(');end=s.index('\n    var w_',start)
part=s[start:end]
# Wrap only this component's result-state updates. React commits a whole frame
# synchronously inside the translation-specific scroll transaction.
part=part.replace('            a(!0), s(``);','            a(!0), s(``);')
part=part.replace('        return (0, w_.useEffect)', '        const haituoSource = (0, w_.useRef)(e); haituoSource.current = e;\n        const n = value => { if (haituoSource.current === e) haituoQueueSignalTranslation(reference, () => { if (haituoSource.current === e) haituoSetTranslation(value); }); };\n        return (0, w_.useEffect)',1)
part=part.replace('x_().autoTranslateIncoming && c();','x_().autoTranslateIncoming && !haituoCachedSignalTranslation(e) && c();',1)
s=s[:start]+part+s[end:]
a='w_ = e.o(n.z()), Fve(), T_ = n.R();';assert s.count(a)==1
s=s.replace(a,'w_ = e.o(n.z()), Fve(), haituoSignalReactDOM = e.o(n.i()), T_ = n.R();',1)
p.write_text(s)
p=root/'js/caisheng-webview-preload.js';s=p.read_text()
# Only the generic DOM transaction is needed in the sandboxed WhatsApp preload.
s=s.replace('"use strict";','"use strict";\n'+helper.split('let haituoSignalTranslationFrame=0;')[0],1)
a='        const anchor = visibleMessages[0], anchorTop = anchor?.getBoundingClientRect().top ?? 0;';assert s.count(a)==1
s=s.replace(a,'        haituoKeepTranslationPosition(visibleMessages[0], () => {',1)
a=s.index('        if (anchor?.isConnected) {',s.index('haituoKeepTranslationPosition(visibleMessages[0]'))
b=s.index('        } finally {',a)
s=s[:a]+'        });\n'+s[b:]
p.write_text(s)
(root/'js/haituo-scroll.js').write_text(helper)
p=root/'bundles/main.js';p.write_text(p.read_text()+'\n'+Path('scroll-stability/test-hook.js').read_text())
print('Signal warm cache renders on mount; asynchronous translations batch before paint; scoped scroll anchors on both platforms')
