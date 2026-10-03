function applyChatColor() {
    if (!document.documentElement) return;
    forceWhatsAppDarkTheme();
    let style = document.getElementById("haituo-native-message-appearance");
    if (!style) {style=document.createElement("style");style.id="haituo-native-message-appearance";(document.head||document.documentElement).append(style);}
    const text = '#main .selectable-text,#main [data-testid="selectable-text"],#main [data-testid="msg-text"],#main [data-testid="conversation-text"],.haituo-wa-message-translation,.haituo-voice-result';
    const size=Math.max(12,Math.min(24,Number(settings.chatFontSize)||15));
    let css=`${text}{font-size:${size}px!important;line-height:1.4!important}`;
    if (/^#[0-9a-f]{6}$/i.test(settings.chatTextColor||"")) css+=`${text},#main .selectable-text *,#main [data-testid="selectable-text"] *{color:${settings.chatTextColor}!important;-webkit-text-fill-color:${settings.chatTextColor}!important}`;
    for (const [direction,color] of [["incoming",settings.incomingBubbleColor],["outgoing",settings.outgoingBubbleColor]]) {
        if (!/^#[0-9a-f]{6}$/i.test(color||"")) continue;
        // WhatsApp's current bubbles and tails use WDS variables. Keep the old
        // variables too for accounts still served the previous web interface.
        css+=`:root,html body #app{--WDS-systems-bubble-surface-${direction}:${color}!important;--${direction}-background:${color}!important;--${direction}-background-deeper:${color}!important}`;
        const oldDirection=direction==='incoming'?'in':'out';
        css+=`#app .message-${oldDirection} [data-testid="msg-container"],#app .message-${oldDirection} [data-testid="msg-container"]>div{background-color:${color}!important;background-image:none!important}`;
    }
    if (style.textContent!==css) style.textContent=css;
}
