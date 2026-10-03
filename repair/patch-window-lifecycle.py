from pathlib import Path
root=Path('macos/staging/app')
p=root/'bundles/main.js'
s=p.read_text()
def edit(old,new):
    global s
    assert s.count(old)==1,(old[:80],s.count(old))
    s=s.replace(old,new,1)
edit('function $g(e, t, a = Z?.getContentBounds()) {', 'function $g(e, t, a) {\n    if (!Z || Z.isDestroyed()) return;\n    a = a ?? Z.getContentBounds();')
edit('let Zg, Qg, caishengMenuOpen = !1, caishengLastInternalFocus = Date.now();', 'let Zg, Qg, caishengMenuOpen = !1, caishengLastInternalFocus = Date.now();\nconst haituoMacOverlayWindows = new Set();')
edit('    let e = !Z || Z.isMinimized() || !Z.isVisible();', '    let e = !Z || Z.isDestroyed() || Z.isMinimized() || !Z.isVisible();')
edit('    if (!win || win.isDestroyed()) return !1;\n    try {', """    if (!win || win.isDestroyed()) return !1;
    if (process.platform === `darwin` && $u === `signal-main` && !haituoMacOverlayWindows.has(win)) {
        haituoMacOverlayWindows.add(win);
        win.on(`show`, e_);
        win.on(`hide`, e_);
        win.once(`closed`, () => { haituoMacOverlayWindows.delete(win); e_(); });
    }
    try {""")
edit('        caishengMenuOpen = !0, p.nativeTheme.themeSource = `dark`;', '        caishengMenuOpen = !0, p.nativeTheme.themeSource = `dark`;\n        process.platform === `darwin` && e_();')
edit('    p.app.disableHardwareAcceleration();','    process.platform !== `darwin` && p.app.disableHardwareAcceleration();')
edit('    let n = Zg, r = n?.id === e && n.width > 0 && n.height > 0;','    let n = Zg, r = n?.id === e && n.width > 0 && n.height > 0;\n    if (process.platform === `darwin` && (caishengMenuOpen || [...haituoMacOverlayWindows].some(win => !win.isDestroyed() && win.isVisible()))) r = !1;\n    const accountWindowConfig = $p();')
a=s.index('function $g(');b=s.index('\nfunction haituoMacFocusSelectedAccount()',a)
s=s[:a]+s[a:b].replace('$p().','accountWindowConfig.')+s[b:]
edit('e.visible && Qg?.visible && Z && (!Z.isVisible() || !caishengNativeFollower || caishengNativeFollower.killed) && n_();','e.visible && Qg?.visible && Z && (!Z.isVisible() || process.platform === `win32` && (!caishengNativeFollower || caishengNativeFollower.killed)) && n_();')
edit('function C_() {\n    if (!Z || Z.isDestroyed()) return;','''function C_() {
    if (!Z || Z.isDestroyed()) return;
    if (process.platform === `darwin` && $u !== `signal-main`) {
        if (Qg?.visible) haituoMacActivateAccountWindow();
        else Z.hide();
        return;
    }''')
edit('        title: `Haituo Signal ${$u}`','        title: `Haituo Signal ${$u}`,\n        ...(process.platform === `darwin` ? { type: `panel` } : {})')
p.write_text(s)
p=root/'bundles/preload/main.js';s=p.read_text()
old='''            let e = r.filter(e => e.platformId === `signal` && e.id !== `signal-main`).map((e, t) => setTimeout(() => {
                window.SignalContext.caishengLaunchSignalProfile(e.id);
            }, 250 + 350 * t));'''
assert s.count(old)==1
s=s.replace(old,'''            if (window.SignalContext.OS.platform === `darwin`) {
                const selected = r.find(e => e.id === o && e.platformId === `signal` && e.id !== `signal-main`);
                selected && window.SignalContext.caishengLaunchSignalProfile(selected.id);
                return;
            }
'''+old,1)
old='''            let e = r.filter(e => e.platformId === `whatsapp` && bCr(e.platformId, t)), n = e.find(e => qLoaded.includes(e.id) && !qReady.includes(e.id));'''
assert s.count(old)==1
s=s.replace(old,'''            if (window.SignalContext.OS.platform === `darwin`) return;
'''+old,1)
p.write_text(s)
print('Applied Mac lazy account loading, panel lifecycle and heartbeat reduction')
