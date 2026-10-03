function haituoApplyNativeRendererAppearance(cfg) {
    const mode = cfg.nativeTheme === `light` ? `light` : `dark`;
    document.documentElement.dataset.haituoNativeTheme = mode;
    document.documentElement.style.colorScheme = mode;
    document.body.classList.toggle(`dark-theme`, mode === `dark`);
    document.body.classList.toggle(`light-theme`, mode === `light`);
    let style = document.getElementById(`haituo-appearance-style`);
    if (!style) {style=document.createElement(`style`);style.id=`haituo-appearance-style`;document.head.append(style);}
    const size=Math.max(12,Math.min(24,Number(cfg.chatFontSize)||15));
    let css=`.CaishengPlatformShell .module-message__text,.CaishengPlatformShell .MessageText,.CaishengMessageTranslation__result{font-size:${size}px!important;line-height:1.4!important}.CaishengMessageTranslation>button{color:#4488ee!important;-webkit-text-fill-color:#4488ee!important}`;
    if (/^#[0-9a-f]{6}$/iu.test(cfg.chatTextColor||``)) css+=`.CaishengPlatformShell .module-message__text,.CaishengPlatformShell .module-message__text *,.CaishengPlatformShell .MessageText,.CaishengMessageTranslation__result{color:${cfg.chatTextColor}!important;-webkit-text-fill-color:${cfg.chatTextColor}!important}`;
    for (const [direction,color] of [[`incoming`,cfg.incomingBubbleColor],[`outgoing`,cfg.outgoingBubbleColor]]) if (/^#[0-9a-f]{6}$/iu.test(color||``)) css+=`.CaishengPlatformShell .module-message__container--${direction}{background:${color}!important;background-image:none!important}`;
    style.textContent=css;
    document.querySelector(`.CaishengPlatformShell`)?.style.setProperty(`--haituo-account-label-color`,mode===`dark`?`#eeeeee`:`#202020`);
}
