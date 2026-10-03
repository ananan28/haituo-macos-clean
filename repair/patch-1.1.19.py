from pathlib import Path
def replace(text,old,new):
    assert text.count(old)==1,(old[:90],text.count(old))
    return text.replace(old,new,1)
root=Path('macos/staging/app')
p=root/'bundles/main.js';s=p.read_text()
s=replace(s,'    if (process.platform === `darwin` && (caishengMenuOpen || [...haituoMacOverlayWindows].some(win => !win.isDestroyed() && win.isVisible()))) r = !1;','    // Native menus and floating settings remain above the visible account window.')
s=replace(s,'    Z = new p.BrowserWindow(g)', '    g.acceptFirstMouse = process.platform === `darwin`,\n    Z = new p.BrowserWindow(g)')
s=replace(s,'(0, c.spawn)(process.execPath, [ `--caisheng-profile=${t}` ]','(0, c.spawn)(process.platform === `darwin` ? (0,s.join)(process.resourcesPath, `..`, `Helpers`, `HaituoAccount.app`, `Contents`, `MacOS`, `海拓`) : process.execPath, [ `--caisheng-profile=${t}` ]')
s=replace(s,'            callback: () => finish(null)\n        });','            callback: () => finish(null)\n        });\n        if (process.env.HAITUO_VERIFY_RUNTIME === `1` && title === `新增账号`) setTimeout(() => {finish(`signal`);menu.closePopup(Z)},300);')
s=replace(s,'stdio: process.env.HAITUO_WINDOW_TEST === `1` ?', 'stdio: (process.env.HAITUO_WINDOW_TEST === `1` || process.env.HAITUO_VERIFY_RUNTIME === `1` || process.env.HAITUO_SETTINGS_TEST === `1`) ?')
s=replace(s,'r.once(`exit`, () => {', 'r.once(`exit`, (code,signal) => {if(process.env.HAITUO_VERIFY_RUNTIME === `1`) console.error(`Account helper exit`,t,code,signal);')
p.write_text(s)
p=root/'bundles/preload/main.js';s=p.read_text()
s=replace(s,'overlayActive = Boolean(b || c);','overlayActive = Boolean(b || c) && !forceVisible;')
s=replace(s,'                    onClick: e => {\n                        e.stopPropagation(), d(!1), l(e => !e), requestAnimationFrame(() => A(o, 0, !haituoHome));','                    onClick: async e => {\n                        if (window.Signal.OS.isMacOS()) {e.stopPropagation();d(!1);l(!1);const platform=await window.SignalContext.caishengShowAddMenu();if(platform)L(platform);return}\n                        e.stopPropagation(), d(!1), l(e => !e), requestAnimationFrame(() => A(o, 0, !haituoHome));')
s=replace(s,'                        const next = !u;','                        if (window.Signal.OS.isMacOS()) {d(!1);l(!1);await window.SignalContext.caishengShowSettingsWindow();return}\n                        const next = !u;')
# Only the settings button handler becomes async.
s=replace(s,'className: `CaishengPlatformShell__settingsButton`,\n                    onPointerDown: e => e.stopPropagation(),\n                    onClick: e => {','className: `CaishengPlatformShell__settingsButton`,\n                    onPointerDown: e => e.stopPropagation(),\n                    onClick: async e => {')
s=s.replace('当前版本 1.1.18','当前版本 1.1.19');p.write_text(s)
p=root/'js/caisheng-webview-preload.js';s=p.read_text()
s=replace(s,'        const translationTargets = [];','''        const quoteSelector = '[data-testid*="quoted" i],[data-testid="quote"],[data-testid="quoted-message"],[aria-label*="Quoted" i],[aria-label*="引用"]';
        const isQuoted = node => Boolean(node.closest(quoteSelector));
        const translationTargets = [];''')
s=replace(s,'!node.closest(".haituo-wa-message-translation"));','!node.closest(".haituo-wa-message-translation") && !isQuoted(node));')
s=replace(s,'node instanceof HTMLElement && !node.closest(".haituo-wa-message-translation,.haituo-voice-result,.haituo-wa-translation-error")','node instanceof HTMLElement && !isQuoted(node) && !node.closest(".haituo-wa-message-translation,.haituo-voice-result,.haituo-wa-translation-error")')
s=replace(s,'const n = roots.map(node => node.innerText?.trim() || "").filter(Boolean).join("\\n\\n").trim();','''const n = roots.map(node => {
                if (!node.querySelector(quoteSelector)) return node.innerText?.trim() || "";
                const copy=node.cloneNode(true);copy.querySelectorAll(quoteSelector).forEach(quote=>quote.remove());
                return copy.textContent?.trim() || "";
            }).filter(Boolean).join("\\n\\n").trim();''')
p.write_text(s)
print('Applied 1.1.19: native menus preserve chat, first mouse, accessory helper and quote exclusion')
