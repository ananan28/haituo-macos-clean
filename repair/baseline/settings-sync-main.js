const haituoPendingGlobalSettings = new Map();
let haituoGlobalSettingsSequence = 0;
function haituoRequestGlobalSettings(config) {
    const requestId = `${process.pid}-${++haituoGlobalSettingsSequence}`;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            haituoPendingGlobalSettings.delete(requestId);
            reject(Error(`设置同步超时，请重试`));
        }, 10000);
        haituoPendingGlobalSettings.set(requestId, {resolve, reject, timer});
        try {
            process.send({type:`haituo-global-settings-request`, requestId, config}, error => {
                if (!error) return;
                clearTimeout(timer); haituoPendingGlobalSettings.delete(requestId); reject(error);
            });
        } catch (error) {
            clearTimeout(timer); haituoPendingGlobalSettings.delete(requestId); reject(error);
        }
    });
}
function haituoPublishGlobalSettings(config) {
    if ($u !== `signal-main`) return;
    for (const child of Yg.values()) caishengSendChild(child, {type:`haituo-global-settings-update`, config});
}
if ($u !== `signal-main`) process.on(`message`, value => {
    if (value?.type === `haituo-global-settings-ack`) {
        const pending = haituoPendingGlobalSettings.get(value.requestId);
        if (!pending) return;
        clearTimeout(pending.timer); haituoPendingGlobalSettings.delete(value.requestId);
        value.ok ? pending.resolve({ok:true}) : pending.reject(Error(value.error || `设置同步失败`));
        return;
    }
    if (value?.type !== `haituo-global-settings-update` || !value.config) return;
    Zp = {...value.config};
    if (Qg) Qg = {...Qg, nativeTheme:Zp.nativeTheme, darkTheme:Zp.darkTheme,
        chatTextColor:Zp.chatTextColor, outgoingBubbleColor:Zp.outgoingBubbleColor,
        incomingBubbleColor:Zp.incomingBubbleColor, incomingBubbleLinked:Zp.incomingBubbleLinked,
        chatFontSize:Zp.chatFontSize};
    p.nativeTheme.themeSource = Zp.nativeTheme === `light` ? `light` : `dark`;
    Pm(`theme-setting`, p.nativeTheme.themeSource);
    haituoBroadcastTranslationConfig(Zp);
    if (Z && !Z.isDestroyed()) n_();
});
