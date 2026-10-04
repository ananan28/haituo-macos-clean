from pathlib import Path
app=Path('macos/staging/app')
p=app/'js/caisheng-webview-preload.js';s=p.read_text(encoding='utf-8')
helper='''
// Own only the message text subtree: expanded text and translation share normal flow.
function haituoWhatsAppTranslationMount(message, roots) {
    let mount = roots.at(-1)?.parentElement;
    while (mount && mount !== message && !roots.every(root => mount.contains(root))) mount = mount.parentElement;
    const metadata = roots.at(-1)?.closest('[data-pre-plain-text]');
    if (metadata && message.contains(metadata) && roots.every(root => metadata.contains(root))) mount = metadata;
    while (mount && mount !== message && /^(inline|contents)$/u.test(getComputedStyle(mount).display)) mount = mount.parentElement;
    if (!mount || !message.contains(mount)) return null;
    for (const root of roots) {
        for (let node = root; node && node !== message; node = node.parentElement) {
            for (const [name, value] of Object.entries({height:'auto','max-height':'none',overflow:'visible','-webkit-line-clamp':'unset'})) node.style.setProperty(name,value,'important');
            if (getComputedStyle(node).display === '-webkit-box') node.style.setProperty('display','block','important');
            if (node === mount) break;
        }
    }
    // A bounded text flow prevents an inline/grid wrapper from sharing a row with its translation.
    mount.style.setProperty('display','flow-root','important');
    mount.style.setProperty('height','auto','important');
    mount.style.setProperty('max-height','none','important');
    mount.style.setProperty('overflow','visible','important');
    return mount;
}
'''
s=s.replace('function haituoInstallMessageScanner() {',helper+'\nfunction haituoInstallMessageScanner() {',1)
a='            if (e.dataset.haituoTranslationDone === "1" && e.querySelector(".haituo-wa-message-translation")) continue;'
assert s.count(a)==1
s=s.replace(a,'            const mount = haituoWhatsAppTranslationMount(e, roots);\n'+a)
s=s.replace('            const mount = roots.at(-1)?.parentElement;\n','',1)
a='                borderTop: "1px solid #ffffff66",';assert s.count(a)==1
s=s.replace(a,'''                display: "block",
                position: "static",
                clear: "both",
                width: "100%",
                maxWidth: "100%",
                height: "auto",
                boxSizing: "border-box",
                borderTop: "1px solid #ffffff66",''')
p.write_text(s,encoding='utf-8')
p=app/'bundles/preload/main.js';s=p.read_text(encoding='utf-8').replace('当前版本 1.1.22','当前版本 1.1.23').replace('海拓 1.1.22','海拓 1.1.23');p.write_text(s,encoding='utf-8')
print('Fixed WhatsApp expanded long-message translation flow in macOS 1.1.23')
