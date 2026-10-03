from pathlib import Path
root=Path('macos/staging/app')
def replace(s,old,new):
    assert s.count(old)==1,(old[:100],s.count(old))
    return s.replace(old,new,1)
p=root/'bundles/main.js';s=p.read_text()
s=replace(s,'            p.app.dock?.hide();','            p.app.setActivationPolicy(`accessory`);\n            p.app.dock?.hide();')
s=replace(s,'let haituoLaunchSignalProfile;','let haituoLaunchSignalProfile;\nconst haituoMacRefreshPromises = new Map();')
s=replace(s,'    const child = Yg.get(t);\n    if (!child', '    if (process.platform === `darwin` && haituoMacRefreshPromises.has(t)) return haituoMacRefreshPromises.get(t);\n    const child = Yg.get(t);\n    if (!child')
old='''        const exited = new Promise(resolve => child.once(`exit`, resolve));
        caishengTerminateSignalChild(child);
        await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 5000))]);
        if (child.exitCode === null && child.signalCode === null) return { ok: false };
        caishengLastWindowPayload.delete(t);
        return haituoLaunchSignalProfile(e, t);'''
new='''        const refresh = (async () => {
            const exited = await new Promise(resolve => {
                const finish = () => {clearTimeout(timer);resolve(true)};
                const timer = setTimeout(() => {child.removeListener(`exit`,finish);resolve(false)},5000);
                child.once(`exit`,finish);
                caishengTerminateSignalChild(child);
            });
            if (!exited) return {ok:false};
            caishengLastWindowPayload.delete(t);
            return haituoLaunchSignalProfile(e,t);
        })();
        haituoMacRefreshPromises.set(t,refresh);
        try {return await refresh} finally {haituoMacRefreshPromises.delete(t)}'''
s=replace(s,old,new)
# Retain user-selected solid colors when retiring wallpaper settings.
s=replace(s,'            e.chatTextColor = ``; e.outgoingBubbleColor = ``; e.incomingBubbleColor = ``;', '            for (const key of [`chatTextColor`,`outgoingBubbleColor`,`incomingBubbleColor`]) if (!/^#[0-9a-f]{6}$/iu.test(e[key] || ``)) e[key] = ``;')
p.write_text(s)
p=root/'bundles/preload/main.js';s=p.read_text()
s=replace(s,'                e.chatTextColor = ``; e.outgoingBubbleColor = ``; e.incomingBubbleColor = ``;', '                for (const key of [`chatTextColor`,`outgoingBubbleColor`,`incomingBubbleColor`]) if (!/^#[0-9a-f]{6}$/iu.test(e[key] || ``)) e[key] = ``;')
s=replace(s,'''                        draggable: !1,
                        onClick: () => {
                            haituoSetHome''','''                        draggable: !0,
                        onDragStart: event => {
                            event.dataTransfer.effectAllowed = `move`;
                            event.dataTransfer.setData(`application/x-haituo-workspace`, e.id);
                        },
                        onDragOver: event => {
                            if (Array.from(event.dataTransfer.types).includes(`application/x-haituo-workspace`)) {
                                event.preventDefault(); event.dataTransfer.dropEffect = `move`;
                            }
                        },
                        onDrop: event => {
                            const source = event.dataTransfer.getData(`application/x-haituo-workspace`);
                            if (!source || source === e.id) return;
                            event.preventDefault(); event.stopPropagation();
                            F(items => {
                                const from = items.findIndex(item => item.id === source);
                                const to = items.findIndex(item => item.id === e.id);
                                if (from < 0 || to < 0) return items;
                                const next = [...items], [moved] = next.splice(from, 1);
                                next.splice(to, 0, moved); return next;
                            });
                        },
                        onClick: () => {
                            haituoSetHome''')
s=s.replace('当前版本 1.1.12','当前版本 1.1.18')
p.write_text(s)
p=root/'js/caisheng-webview-preload.js';s=p.read_text()
s=replace(s,'function forceWhatsAppDarkTheme() {','let haituoAppliedWhatsAppMode, haituoAppliedWhatsAppBody;\nfunction forceWhatsAppDarkTheme() {')
s=replace(s,'    const mode = settings.nativeTheme === "light" ? "light" : "dark";','''    const mode = settings.nativeTheme === "light" ? "light" : "dark";
    if (haituoAppliedWhatsAppMode === mode && haituoAppliedWhatsAppBody === document.body) return;
    haituoAppliedWhatsAppMode = mode;
    haituoAppliedWhatsAppBody = document.body;''')
s=replace(s,'    try { localStorage.setItem("theme",JSON.stringify(mode)); } catch {}','    try {if (localStorage.getItem("theme") !== JSON.stringify(mode)) localStorage.setItem("theme",JSON.stringify(mode));} catch {}')
s=replace(s,'    style.textContent=`#haituo-whatsapp-translator', '    const css=`#haituo-whatsapp-translator')
s=replace(s,'-webkit-text-fill-color:#fff!important}`;\n}', '-webkit-text-fill-color:#fff!important}`;\n    if(style.textContent!==css) style.textContent=css;\n}')
s=replace(s,'''    if (!composer?.isConnected) return;
    const footer = composer.closest("footer") || composer;''','''    if (!composer?.isConnected || !usableComposer(composer) || document.querySelector('[data-testid="media-viewer"],[data-testid="media-editor"],[role="dialog"][aria-modal="true"]')) {
        if (panel.style.display !== "none") panel.style.display = "none";
        if (translatorFooter?.style.getPropertyValue("margin-bottom")) translatorFooter.style.removeProperty("margin-bottom");
        return;
    }
    const footer = composer.closest("footer") || composer;''')
s=replace(s,'''    const area = document.querySelector("#main")?.getBoundingClientRect();
    const bounds = area?.width > 320 ? area : footer.getBoundingClientRect();''','''    // The actual composer footer shrinks when the media/contact sidebar opens.
    const bounds = footer.getBoundingClientRect();''')
s=replace(s,'    panel.style.width = `${Math.max(300, right - left)}px`;\n    panel.style.maxWidth = `${Math.max(300, innerWidth - left - 8)}px`;', '    panel.style.width = `${Math.max(0, right - left)}px`;\n    panel.style.maxWidth = `${Math.max(0, right - left)}px`;\n    panel.style.minWidth = "0";\n    panel.style.overflow = "auto";')
s=replace(s,'        panel.style.bottom = "3px";', '        panel.style.bottom = `${Math.max(3, innerHeight - footer.getBoundingClientRect().bottom - height)}px`;')
# A sidebar may resize without the outer browser resizing. Track actual footer geometry.
s+='''
let haituoTranslatorLayoutFrame = 0;
const haituoScheduleTranslatorLayout = () => {
    if (haituoTranslatorLayoutFrame) return;
    haituoTranslatorLayoutFrame = requestAnimationFrame(() => {
        haituoTranslatorLayoutFrame = 0;
        positionTranslator(findComposer());
    });
};
new MutationObserver(records => {
    if (document.querySelector('[data-testid="media-viewer"],[data-testid="media-editor"],[role="dialog"][aria-modal="true"]')) positionTranslator(findComposer());
    if (records.some(record => !record.target.closest?.('#haituo-whatsapp-translator,#haituo-api-settings,footer,style'))) haituoScheduleTranslatorLayout();
}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
'''
p.write_text(s)
print('Applied 1.1.18 regressions: accessory Dock, refresh queue, persistent tab reorder, media bounds and idempotent appearance')
