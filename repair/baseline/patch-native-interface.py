from pathlib import Path
import re

root = Path('macos/staging/app')
p = root/'bundles/main.js'
s = p.read_text()
def edit(old, new):
    global s
    assert s.count(old) == 1, (old[:100], s.count(old))
    s = s.replace(old, new, 1)

# Do not steal focus back to the previous account while the user clicks a tab.
edit('if ($u === `signal-main`) Z.on(`focus`, () => setImmediate(haituoMacFocusSelectedAccount));', 'if ($u === `signal-main`) Z.on(`restore`, () => setImmediate(haituoMacFocusSelectedAccount));')
edit('            caishengStopNativeFollower(), Z.setAlwaysOnTop(!1), Z.setIgnoreMouseEvents(!0), Z.isVisible() && Z.hide();', '            Z.webContents.setBackgroundThrottling(true);\n            caishengStopNativeFollower(), Z.setAlwaysOnTop(!1), Z.setIgnoreMouseEvents(!0), Z.isVisible() && Z.hide();')
edit('        Z.isFullScreen() && Z.setFullScreen(!1), Z.isMaximized()', '        Z.webContents.setBackgroundThrottling(false);\n        Z.isFullScreen() && Z.setFullScreen(!1), Z.isMaximized()')
edit('let Zg, Qg, caishengMenuOpen', 'let haituoLaunchSignalProfile;\nlet Zg, Qg, caishengMenuOpen')
edit('        ...(process.platform === `darwin` ? { type: `panel` } : {})', '')
edit('p.ipcMain.handle(`caisheng:launch-signal-profile`, async (e, t) => {', 'p.ipcMain.handle(`caisheng:launch-signal-profile`, (haituoLaunchSignalProfile = async (e, t) => {')
edit('}), p.ipcMain.handle(`caisheng:refresh-signal-profile`, async (e, t) => {', '})), p.ipcMain.handle(`caisheng:refresh-signal-profile`, async (e, t) => {')
edit('    if (t === `signal-main`) return {\n        ok: caishengSoftRefreshWindow()\n    };', '''    if (t === `signal-main` && process.platform === `darwin`) {
        p.app.relaunch({args:[...process.argv.slice(1),...(process.env.HAITUO_WINDOW_TEST === `1` ? [`--haituo-verify-main-refresh`] : [])]});
        setTimeout(() => p.app.quit(), 100);
        return { ok: true };
    }
    if (t === `signal-main`) return { ok: caishengSoftRefreshWindow() };''')
edit('    return caishengSendChild(child, { type: `caisheng-soft-refresh` }), setImmediate(caishengKeepMainShellVisible), {', '''    if (process.platform === `darwin`) {
        // Signal's backend belongs to the process; a bare renderer reload is insufficient.
        const exited = new Promise(resolve => child.once(`exit`, resolve));
        caishengTerminateSignalChild(child);
        await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 5000))]);
        if (child.exitCode === null && child.signalCode === null) return { ok: false };
        caishengLastWindowPayload.delete(t);
        return haituoLaunchSignalProfile(e, t);
    }
    return caishengSendChild(child, { type: `caisheng-soft-refresh` }), setImmediate(caishengKeepMainShellVisible), {''')
edit('        stdio: [ `ignore`, `ignore`, `ignore`, `ipc` ],', '        stdio: process.env.HAITUO_WINDOW_TEST === `1` ? [ `ignore`, `inherit`, `inherit`, `ipc` ] : [ `ignore`, `ignore`, `ignore`, `ipc` ],')
edit('function caishengShowTopMenu(title, items) {', '''function caishengShowTopMenu(title, items) {
    if (process.env.HAITUO_WINDOW_TEST === `1` && process.env.HAITUO_TEST_ADD_ACCOUNT === `1`) return Promise.resolve(`signal`);''')

# Migrate appearance only. Provider, keys, message caches and translation logic stay intact.
edit('        return e;\n    } catch {\n        return { translationMode:', '''        if (!e._nativeAppearanceV1111) {
            e._nativeAppearanceV1111 = true;
            e.nativeTheme = `dark`;
            e.chatTextColor = ``; e.outgoingBubbleColor = ``; e.incomingBubbleColor = ``;
            e.accountLabelColor = ``;
            e.waterInkTheme = false; e.darkTheme = true; em(e);
        }
        e.nativeTheme = e.nativeTheme === `light` ? `light` : `dark`;
        e.waterInkTheme = false; e.darkTheme = e.nativeTheme === `dark`;
        return e;
    } catch {
        return { nativeTheme: `dark`, darkTheme: true, _nativeAppearanceV1111: true, translationMode:''')
s=s.replace('waterInkTheme: !0, incomingBubbleLinked:', 'waterInkTheme: !1, incomingBubbleLinked:')
s=s.replace('return { nativeTheme: `dark`, darkTheme: true, _nativeAppearanceV1111: true, translationMode:', 'return { chatTextColor: ``, outgoingBubbleColor: ``, incomingBubbleColor: ``, nativeTheme: `dark`, darkTheme: true, _nativeAppearanceV1111: true, translationMode:')
s=s.replace('accountWindowConfig.chatTextColor ?? `#111827`', 'accountWindowConfig.chatTextColor ?? ``')
s=s.replace('accountWindowConfig.outgoingBubbleColor ?? `#2c6bed`', 'accountWindowConfig.outgoingBubbleColor ?? ``')
s=s.replace('accountWindowConfig.incomingBubbleColor ?? `#2c6bed`', 'accountWindowConfig.incomingBubbleColor ?? ``')
s=s.replace('e.incomingBubbleColor = e.outgoingBubbleColor || `#2c6bed`, changed = !0;', 'e.incomingBubbleColor = e.outgoingBubbleColor || ``, changed = !0;')
edit('        darkTheme: !!t?.darkTheme,\n        waterInkTheme: !!t?.waterInkTheme,', '''        nativeTheme: t?.nativeTheme === `light` || t?.darkTheme === false ? `light` : `dark`,
        darkTheme: !(t?.nativeTheme === `light` || t?.darkTheme === false),
        waterInkTheme: false,
        _nativeAppearanceV1111: true,''')
edit('    em(Zp), haituoBroadcastTranslationConfig(Zp);', '''    Zp.chatTextColor = /^#[0-9a-f]{6}$/iu.test(t?.chatTextColor || ``) ? t.chatTextColor : ``;
    Zp.outgoingBubbleColor = /^#[0-9a-f]{6}$/iu.test(t?.outgoingBubbleColor || ``) ? t.outgoingBubbleColor : ``;
    Zp.incomingBubbleColor = Zp.incomingBubbleLinked ? Zp.outgoingBubbleColor : /^#[0-9a-f]{6}$/iu.test(t?.incomingBubbleColor || ``) ? t.incomingBubbleColor : ``;
    em(Zp), haituoBroadcastTranslationConfig(Zp);
    Pm(`theme-setting`, Zp.nativeTheme);
    p.nativeTheme.themeSource = Zp.nativeTheme;
    if (caishengSettingsWindow && !caishengSettingsWindow.isDestroyed()) caishengSettingsWindow.webContents.executeJavaScript(`document.getElementById('haituo-native-settings').textContent=${JSON.stringify(haituoNativeSettingsCss(Zp.nativeTheme))}`).catch(() => {});''')
edit('        darkTheme: !!accountWindowConfig.darkTheme,', '        nativeTheme: accountWindowConfig.nativeTheme,\n        darkTheme: accountWindowConfig.nativeTheme !== `light`,')
start=s.index('        const loginThemeMode =', s.index('function n_()'))
end=s.index('        if (!Qg.visible || !Qg.bounds)', start)
s=s[:start]+'''        const nativeMode = Qg.nativeTheme === `light` ? `light` : `dark`;
        const appearance = `${nativeMode}|${Qg.chatTextColor}|${Qg.outgoingBubbleColor}|${Qg.incomingBubbleColor}|${Qg.chatFontSize}`;
        if (caishengWaterInkAppearance !== appearance) {
            caishengWaterInkAppearance = appearance;
            haituoApplyNativeSignalAppearance(Z, Qg);
        }
'''+s[end:]
edit('    if ($u !== `signal-main`) return Pm(`theme-setting`, `dark`), `dark`;', '    const nativeMode = $p().nativeTheme === `light` ? `light` : `dark`;\n    Pm(`theme-setting`, nativeMode);\n    return nativeMode;')
edit('        caishengMenuOpen = !0, p.nativeTheme.themeSource = `dark`;', '        caishengMenuOpen = !0, p.nativeTheme.themeSource = $p().nativeTheme === `light` ? `light` : `dark`;')
edit('<label class="check"><input type="checkbox" name="waterInkTheme">水墨山水聊天主题（可随时关闭）</label>', '<label class="row"><span>外观</span><select name="nativeTheme"><option value="dark">原生深色</option><option value="light">原生浅色</option></select></label>')
s=s.replace("'blockChineseOutgoing','waterInkTheme'", "'blockChineseOutgoing'")
edit('data.chatFontSize=Number(form.chatFontSize.value)||15;', "data.waterInkTheme=false;data.darkTheme=form.nativeTheme.value==='dark';data.nativeTheme=form.nativeTheme.value;data.chatFontSize=Number(form.chatFontSize.value)||15;")
edit('form.chatTextColor.oninput=()=>send(\'preview\');', "form.chatTextColor.oninput=()=>send('preview');form.nativeTheme.onchange=()=>send('preview');")
edit("const font=()=>document.getElementById('fontValue')", "const initialColors=Object.fromEntries(['chatTextColor','outgoingBubbleColor','incomingBubbleColor'].map(key=>[key,form.elements[key].value]));\nconst font=()=>document.getElementById('fontValue')")
edit('data.chatTextGradientIndex=0;data.outgoingBubbleGradientIndex=0;', "for(const key of ['chatTextColor','outgoingBubbleColor','incomingBubbleColor'])if(form.elements[key].value===initialColors[key])data[key]=cfg[key]||'';data.incomingBubbleColor=data.incomingBubbleLinked?data.outgoingBubbleColor:data.incomingBubbleColor;data.chatTextGradientIndex=0;data.outgoingBubbleGradientIndex=0;")
edit("document.getElementById('resetColors').onclick=()=>{form.outgoingBubbleColor.value='#2c6bed';form.chatTextColor.value='#111827';form.incomingBubbleLinked.checked=true;syncBubbleColors();send('preview')};", "document.getElementById('resetColors').onclick=()=>{for(const key of ['chatTextColor','outgoingBubbleColor','incomingBubbleColor']){cfg[key]='';form.elements[key].value=cfg.nativeTheme==='light'?'#202020':'#eeeeee';initialColors[key]=form.elements[key].value}form.incomingBubbleLinked.checked=true;send('preview')};")
# The settings page is separate from Signal and uses the same neutral palette.
edit('</style></head><body>\n<div class="title">海拓设置', '''</style><style id="haituo-native-settings">${haituoNativeSettingsCss($p().nativeTheme)}</style></head><body>
<div class="title">海拓设置''')
edit('</style></head><body><div class="title">编辑账号备注', '</style><style>${haituoNativeSettingsCss($p().nativeTheme)}</style></head><body><div class="title">编辑账号备注')
edit('聊天界面保持显示，此窗口始终位于最上层。', '备注仅用于区分账号。')
edit('    if (e.type === `haituo-test-window-state`', '''    if (e.type === `haituo-test-page-state` && process.env.HAITUO_WINDOW_TEST === `1`) {
        Z.webContents.executeJavaScript(`({text:document.body.innerText,theme:document.body.className,ready:document.readyState,loading:!!document.querySelector('.app-loading-screen'),installed:!!document.querySelector('[class*="InstallScreen"],.inbox')})`).then(page => process.send?.({type:`haituo-test-page-result`,requestId:e.requestId,page}));
        return;
    }
    if (e.type === `haituo-test-window-state`''')
s+='\n'+Path('macos/native-interface-main.js').read_text()
# Delete the retired wallpaper loader and webview injection, rather than covering them.
a=s.index('let haituoPortalBackgroundDataUrl;');b=s.index('Q_ =',a);s=s[:a]+s[b:]
a=s.index('        const applyHaituoLoginBackground = () => {');b=s.index('        const workspaceId =',a);s=s[:a]+s[b:]
s=s.replace('waterInkBackgroundUrl: config?.waterInkTheme ? haituoGetInkBackgroundDataUrl() : ``','')
s=s.replace(', waterInkBackgroundUrl: $p().waterInkTheme ? haituoGetInkBackgroundDataUrl() : ``','')
s=s.replace('typeof e.waterInkTheme == `boolean` || (e.waterInkTheme = !0, changed = !0), ','')
s=s.replace('e.waterInkTheme = false;', 'delete e.waterInkTheme; delete e.waterInkBackgroundUrl;')
s=s.replace('        waterInkTheme: false,\n','').replace('waterInkTheme: !1, ','')
s=s.replace('        waterInkTheme: !!accountWindowConfig.waterInkTheme,\n','')
s=s.replace('''        const latestTheme = !!$p().waterInkTheme;
        if (Qg && Qg.waterInkTheme !== latestTheme) Qg.waterInkTheme = latestTheme, caishengChildDarkApplied = null, n_();
''','')
a=s.index('let aHc, caishengTextCssKey');b=s.index('\n',a)
s=s[:a]+'let haituoNativeAppearanceSignature;'+s[b:]
s=s.replace('caishengWaterInkAppearance','haituoNativeAppearanceSignature')
s=s.replace('data.waterInkTheme=false;','')
s=s.replace("row.style.border='1px solid #76551d'", "row.style.border='1px solid #777777'")
paint=r'(?:background(?:-[a-z-]+)?|color|(?:-webkit-)?text-fill-color|text-shadow|box-shadow|filter|backdrop-filter|border(?:-(?:color|top|bottom|left|right))?|accent-color|color-scheme|opacity)'
def remove_paint(css):
    return re.sub(r'(?<=[{;])\s*'+paint+r'\s*:[^;{}]*[;]?', '', css, flags=re.I)
# Standalone settings and rename dialogs keep their layout and receive native colors.
s=re.sub(r'<style>([^<]*)</style>',lambda match:'<style>'+remove_paint(match[1])+'</style>',s)
p.write_text(s)

p=root/'bundles/preload/main.js';s=p.read_text()
# The resize callback used to capture home=true and hide a freshly selected tab.
edit('}, [ o, r, u, b ]);', '}, [ o, r, u, b, c, haituoHome ]);')
edit('overlayActive = Boolean(b);', 'overlayActive = Boolean(b || c);')
edit('            if (b) {\n                webviews.forEach', '            if (b || c) {\n                webviews.forEach')
edit('}, [ b, S, o, haituoHome ]);', '}, [ b, c, S, o, haituoHome ]);')
edit('        function L(e) {\n            if (!bCr(e, t)) return;', '        function L(e) {\n            if (!bCr(e, t)) return;\n            haituoSetHome(false);')
edit('D9.useState)(!0), [haituoPlatformFilter', 'D9.useState)(!1), [haituoPlatformFilter')
edit('            return e.chatTextGradientIndex = 0,', '''            if (!e._nativeAppearanceV1111) {
                e._nativeAppearanceV1111 = true; e.nativeTheme = `dark`;
                e.darkTheme = true; e.waterInkTheme = false;
                e.chatTextColor = ``; e.outgoingBubbleColor = ``; e.incomingBubbleColor = ``;
                e._hideTranslationDefaultV2028 = true;
            }
            e.waterInkTheme = false; e.darkTheme = e.nativeTheme !== `light`;
            return e.chatTextGradientIndex = 0,''')
s=s.replace('e.incomingBubbleColor = e.outgoingBubbleColor || `#2c6bed`', 'e.incomingBubbleColor = e.outgoingBubbleColor || ``')
edit('            darkTheme: !1,\n            waterInkTheme: !0,', '            nativeTheme: `dark`,\n            darkTheme: !0,\n            waterInkTheme: !1,')
edit('            darkTheme: e.darkTheme,', '            nativeTheme: e.nativeTheme,\n            darkTheme: e.darkTheme,')
start=s.index('        (0, D9.useEffect)(() => {\n            let e = document.getElementById(`haituo-appearance-style`);')
end=s.index('        function M(e)',start)
s=s[:start]+'''        (0, D9.useEffect)(() => {
            haituoApplyNativeRendererAppearance(m);
        }, [m.nativeTheme,m.chatFontSize,m.chatTextColor,m.outgoingBubbleColor,m.incomingBubbleColor]);
'''+s[end:]
edit('''                            type: `checkbox`, checked: !!m.waterInkTheme,
                            onChange: e => Q({ waterInkTheme: e.target.checked })
                        }), (0, O9.jsx)(`span`, { children: `水墨山水聊天主题（可随时关闭）` })''', '''                            type: `checkbox`, checked: m.nativeTheme !== `light`,
                            onChange: e => Q({ nativeTheme: e.target.checked ? `dark` : `light`, darkTheme: e.target.checked, waterInkTheme: false })
                        }), (0, O9.jsx)(`span`, { children: `原生深色（关闭切换为浅色）` })''')
edit('waterInkTheme: !1, darkTheme: e === `dark`', 'waterInkTheme: !1, nativeTheme: e === `light` ? `light` : `dark`, darkTheme: e !== `light`')
edit('getThemeSetting: async () => await M9(`themeSetting`) ?? `system`,', 'getThemeSetting: async () => (await window.SignalContext.caishengGetTranslationConfig()).nativeTheme === `light` ? `light` : `dark`,')
edit('''                            options: [ {
                                label: H(`icu:themeSystem`),
                                value: `system`
                            }, {
                                label: H(`icu:themeLight`),
                                value: `light`
                            }, {
                                label: H(`icu:themeDark`),
                                value: `dark`
                            } ]''', '''                            options: [ {
                                label: H(`icu:themeDark`), value: `dark`
                            }, {
                                label: H(`icu:themeLight`), value: `light`
                            } ]''')
edit('''                            chatTextColor: `#111827`,
                            outgoingBubbleColor: `#2c6bed`,''', '''                            chatTextColor: ``,
                            outgoingBubbleColor: ``,''')
s=s.replace('当前版本 1.1.7', '当前版本 1.1.12')
s=s.replace('${m.waterInkTheme ? ` is-haituo-ink` : ``}', '')
s=s.replace('e.waterInkTheme = false;', 'delete e.waterInkTheme; delete e.waterInkBackgroundUrl;')
s=s.replace('            waterInkTheme: e.waterInkTheme,\n','').replace('            waterInkTheme: !1,\n','')
s=s.replace(', waterInkTheme: false','').replace('waterInkTheme: !1, ','')
s+='\n'+Path('macos/native-interface-renderer.js').read_text()
p.write_text(s)

p=root/'js/caisheng-webview-preload.js';s=p.read_text()
s=s.replace('    chatTextColor: "#111827",', '    chatTextColor: "",').replace('    outgoingBubbleColor: "#2c6bed",','    outgoingBubbleColor: "",')
a=s.index('const WHATSAPP_DARK_STYLE =');b=s.index('let whatsappDarkObserver',a);s=s[:a]+s[b:]
def function_replace(name, body):
    global s
    a=s.index('function '+name+'(')
    b=s.index('\nfunction ',a+1) if name!='applyTranslatorTheme' else s.index('\nipcRenderer.on(',a)
    # The following top-level force call is retained through the replacement body.
    s=s[:a]+body+'\n'+s[b:]
function_replace('forceWhatsAppDarkTheme', '''function forceWhatsAppDarkTheme() {
    if (!isWhatsApp() || !document.documentElement) return;
    const mode = settings.nativeTheme === "light" ? "light" : "dark";
    document.documentElement.classList.toggle("dark",mode === "dark");
    document.documentElement.classList.toggle("light",mode === "light");
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    if (document.body) {
        document.body.classList.toggle("dark",mode === "dark");
        document.body.classList.toggle("light",mode === "light");
        document.body.dataset.theme = mode;
    }
    try { localStorage.setItem("theme",JSON.stringify(mode)); } catch {}
}
forceWhatsAppDarkTheme();''')
for name in ['applyWhatsAppWelcomeSurface','exposeWhatsAppLoginBackground','applyWhatsAppComposerSurface']:
    function_replace(name, 'function '+name+'() {}')
function_replace('applyWhatsAppMessageAppearance','function applyWhatsAppMessageAppearance() {}')
function_replace('applyChatColor',Path('macos/native-message-webview.js').read_text())
function_replace('applyTranslatorTheme',Path('macos/native-interface-webview.js').read_text())
s=s.replace('    waterInkTheme: !1,\n','').replace('    waterInkBackgroundUrl: "",\n','')
s=s.replace('"linear-gradient(145deg,#17140e,#080706)"','(settings.nativeTheme === "light" ? "#ffffff" : "#202020")')
s=s.replace('"#fff0c8"','(settings.nativeTheme === "light" ? "#202020" : "#eeeeee")')
s=s.replace('#74501a','#777777').replace('#ffd66a','#306de1').replace('linear-gradient(#fff0a0,#c98c18)','#306de1').replace('#d7a92f','#306de1').replace('#281b02','#ffffff')
p.write_text(s)

# Keep the proven layout declarations; discard all old decorative theme paints.
p=root/'stylesheets/haituo-blackgold.css'
css=p.read_text()
css=remove_paint(css)
css=re.sub(r'[^{}]*\.is-haituo-ink[^{}]*\{[^{}]*\}', '', css)
css=re.sub(r'[^{}]*(?:module-InstallScreenQrCodeNotScannedStep|InstallScreenSignalLogo)[^{}]*\{[^{}]*\}', '', css)
css=re.sub(r'/\*.*?\*/','',css,flags=re.S)
css+='\n'+Path('macos/native-interface.css').read_text()
(p.parent/'haituo-layout.css').write_text(css)
p.unlink()
p=root/'background.html';p.write_text(p.read_text().replace('stylesheets/haituo-blackgold.css','stylesheets/haituo-layout.css'))
for name in ['haituo-shuimo-chat-v1.jpg','haituo-portal-bg.jpg','haituo-portal-bg-v29.jpg','haituo-blackgold-bg.svg']:
    (root/'images'/name).unlink(missing_ok=True)
# Packaging must fail if a retired theme can still be loaded.
for name in ['bundles/main.js','bundles/preload/main.js','js/caisheng-webview-preload.js','background.html','stylesheets/haituo-layout.css']:
    text=(root/name).read_text()
    assert not re.search(r'haituoGet(?:Ink|Portal)BackgroundDataUrl|haituo-(?:shuimo|portal-bg|blackgold)|is-haituo-ink',text),name
print('Applied native dark/light appearance and Mac account refresh lifecycle')
