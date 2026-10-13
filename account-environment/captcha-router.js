function haituoPickCaptchaAccount(pending, mainId, childIsAlive) {
    const candidates=[...pending.keys()].filter(id=>id===mainId||childIsAlive(id));
    return candidates.length===1 ? candidates[0] : null;
}
const haituoPendingCaptchaAccounts = new Map();
function haituoRouteCaptchaToAccount(token) {
    if ($u !== `signal-main`) { p_.handleCaptcha(token); return; }
    const account = haituoPickCaptchaAccount(haituoPendingCaptchaAccounts,`signal-main`,id=>!!Yg.get(id)?.connected);
    if (!account) {
        X.warn(`Haituo captcha callback has no unambiguous pending account`);
        p.dialog.showMessageBox(Z,{type:`warning`,message:`验证结果未能匹配到唯一账号`,detail:`请在需要验证的 Signal 账号重新点击 Continue，并完成验证后点击网页上的“打开 Signal”。如同时有多个账号要求验证，请逐个完成。`});
        return;
    }
    if(account===`signal-main`)p_.handleCaptcha(token);
    else Yg.get(account).send({type:`haituo-captcha-response`,token});
    haituoPendingCaptchaAccounts.delete(account);
}
