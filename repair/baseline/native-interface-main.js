function haituoNativeSettingsCss(mode) {
    const dark = mode !== `light`, bg = dark ? `#191919` : `#ffffff`, fg = dark ? `#eeeeee` : `#202020`, field = dark ? `#292929` : `#f3f3f3`, edge = dark ? `#555555` : `#c6c6c6`;
    return `html,body{color-scheme:${dark ? `dark` : `light`};background:${bg}!important;color:${fg}!important}body,.title,.scroll,.intro,.section,.footer{background:${bg}!important;background-image:none!important;color:${fg}!important;border-color:${edge}!important;box-shadow:none!important}.row>span:first-child,.muted,.fontValue{color:${fg}!important}input,select,button{background:${field}!important;background-image:none!important;color:${fg}!important;border-color:${edge}!important;box-shadow:none!important}input:focus,select:focus{outline:2px solid #3a76f0}.primary{background:#306de1!important;color:#fff!important}.check input{accent-color:#306de1}`;
}
let haituoNativeSignalCssKey;
async function haituoApplyNativeSignalAppearance(win, cfg) {
    if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return;
    const mode = cfg.nativeTheme === `light` ? `light` : `dark`;
    const size = Math.max(12, Math.min(24, Number(cfg.chatFontSize) || 15));
    let css = `.module-message__text,.MessageText,.module-message-body__text,.CaishengMessageTranslation__result{font-size:${size}px!important;line-height:1.4!important}`;
    if (/^#[0-9a-f]{6}$/iu.test(cfg.chatTextColor || ``)) css += `.module-message__text,.module-message__text *,.MessageText,.MessageText *,.CaishengMessageTranslation__result{color:${cfg.chatTextColor}!important;-webkit-text-fill-color:${cfg.chatTextColor}!important}`;
    for (const [direction,color] of [[`incoming`,cfg.incomingBubbleColor],[`outgoing`,cfg.outgoingBubbleColor]]) if (/^#[0-9a-f]{6}$/iu.test(color || ``)) css += `.module-message__container--${direction}{background:${color}!important;background-image:none!important}`;
    try {
        if (haituoNativeSignalCssKey) await win.webContents.removeInsertedCSS(haituoNativeSignalCssKey);
        haituoNativeSignalCssKey = await win.webContents.insertCSS(css);
        await win.webContents.executeJavaScript(`document.documentElement.style.colorScheme=${JSON.stringify(mode)};document.body.classList.toggle('dark-theme',${mode === `dark`});document.body.classList.toggle('light-theme',${mode === `light`});`);
    } catch (error) { X.warn(`Native appearance could not be applied: ${error?.message}`); }
}
