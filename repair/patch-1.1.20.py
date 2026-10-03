from pathlib import Path
def replace(text,old,new):
    assert text.count(old)==1,(old[:90],text.count(old))
    return text.replace(old,new,1)
root=Path('macos/staging/app')
p=root/'bundles/main.js';s=p.read_text()
s=replace(s,'function haituoMacFocusSelectedAccount() {','''function haituoMacOrderSelectedAccount() {
    if (process.platform !== `darwin` || $u !== `signal-main` || !Z || Z.isDestroyed() || !Z.isVisible() || Z.isMinimized()) return;
    const child=Yg.get(Zg?.id);
    if (!child || !Xg.has(Zg?.id) || !(Zg.width>0&&Zg.height>0)) return;
    $g(Zg.id,child);
    caishengSendChild(child,{type:`haituo-order-account`,parentSourceId:Z.getMediaSourceId()});
}

function haituoMacFocusSelectedAccount() {''')
s=replace(s,'    if (e.type === `caisheng-focus-account`) {','''    if (e.type === `haituo-order-account`) {
        caishengParentHeartbeat=Date.now();
        if (process.platform === `darwin` && Qg?.visible && Z && !Z.isDestroyed()) {
            n_();
            try {Z.moveAbove(e.parentSourceId)} catch(error) {X.warn(`Account ordering failed: ${error?.message}`)}
        }
        return;
    }
    if (e.type === `caisheng-focus-account`) {''')
s=replace(s,'if ($u === `signal-main`) Z.on(`restore`, () => setImmediate(haituoMacFocusSelectedAccount));','''if ($u === `signal-main`) {
            Z.on(`restore`, () => setImmediate(haituoMacFocusSelectedAccount));
            Z.on(`focus`, () => {setImmediate(haituoMacOrderSelectedAccount);setTimeout(haituoMacOrderSelectedAccount,60)});
        }''')
s=replace(s,'    selectedAccountChanged && setImmediate(haituoMacFocusSelectedAccount);','''    setImmediate(haituoMacOrderSelectedAccount);
    (selectedAccountChanged || n.keepVisible) && !caishengMenuOpen && ![...haituoMacOverlayWindows].some(win=>!win.isDestroyed()&&win.isVisible()) && setImmediate(haituoMacFocusSelectedAccount);''')
s=replace(s,'        process.platform === `darwin` && e_();','        process.platform === `darwin` && (e_(),haituoMacOrderSelectedAccount());')
s=replace(s,'        win.setAlwaysOnTop(!0, `screen-saver`, 1), win.show(), win.moveTop(), win.focus();','        haituoMacOrderSelectedAccount();\n        win.setAlwaysOnTop(!0, `screen-saver`, 1), win.show(), win.moveTop(), win.focus();') if s.count('        win.setAlwaysOnTop(!0, `screen-saver`, 1), win.show(), win.moveTop(), win.focus();')==1 else s.replace('        win.setAlwaysOnTop(!0, `screen-saver`, 1), win.show(), win.moveTop(), win.focus();','        haituoMacOrderSelectedAccount();\n        win.setAlwaysOnTop(!0, `screen-saver`, 1), win.show(), win.moveTop(), win.focus();')
# Definite flex height keeps the footer visible and the actual content scrollable.
s=replace(s,'</style><style id="haituo-native-settings">','''</style><style>
body{display:flex;flex-direction:column}.title{flex:0 0 46px}#form{display:flex;flex-direction:column;flex:1;min-height:0;margin:0}.scroll{flex:1;min-height:0;height:auto;overflow-y:scroll;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;scrollbar-width:auto;scrollbar-color:#888 transparent}.footer{flex:0 0 56px}.scroll::-webkit-scrollbar{width:12px}.scroll::-webkit-scrollbar-thumb{background:#888;border-radius:8px;border:3px solid transparent;background-clip:padding-box}.scroll::-webkit-scrollbar-track{background:rgba(127,127,127,.12)}[hidden]{display:none!important}
</style><style id="haituo-native-settings">''')
s=replace(s,'1.1.2 翻译框修复版 · Signal / WhatsApp / Telegram 通用','1.1.20 · Signal / WhatsApp / Telegram 通用')
# Preserve every key while showing fields for the selected translation/transcription services.
marker="const multiRows=document.getElementById('multiApiRows');"
s=replace(s,marker,'''
const translateProviders=()=>[form.inputTranslationProvider.value,form.chatTranslationProvider.value];
const compatibleProviders=['openai','qwen','glm','deepseek'];
const apiRow=form.apiKey.closest('label'),groqRow=form.groqApiKey.closest('label');
groqRow.before(apiRow,document.getElementById('multiApiDrawer'),form.endpoint.closest('label'),form.model.closest('label'));
function syncProviderFields(){
    const providers=translateProviders(),voice=form.voiceTranscriptionProvider.value;
    const compatible=providers.some(value=>compatibleProviders.includes(value));
    apiRow.hidden=!(compatible||providers.includes('google-free')||voice==='openai');
    apiRow.querySelector('span').textContent=providers.includes('openai')||voice==='openai'?'OpenAI API Key':'OpenAI / 兼容服务 API Key';
    groqRow.hidden=!(providers.includes('groq')||voice==='groq');
    form.deepLApiKey.closest('label').hidden=!providers.includes('deepl');
    document.getElementById('multiApiDrawer').hidden=!providers.includes('openai');
    form.endpoint.closest('label').hidden=!(compatible||providers.includes('groq'));
    form.model.closest('label').hidden=!(compatible||providers.includes('groq'));
    form.endpoint.placeholder=providers.includes('openai')?'https://api.openai.com/v1':'服务商的兼容 API 地址';
    form.model.placeholder=providers.includes('openai')?'如 gpt-4.1-mini':'服务商的模型名称';
}
for(const key of ['inputTranslationProvider','chatTranslationProvider','voiceTranscriptionProvider'])form.elements[key].addEventListener('change',syncProviderFields);
syncProviderFields();
'''+marker)
p.write_text(s)
p=root/'bundles/preload/main.js';s=p.read_text()
s=s.replace('当前版本 1.1.19','当前版本 1.1.20')
s=replace(s,'title: `返回空白首页并显示全部账号`, "aria-label": `返回空白首页`, onClick: e => { e.stopPropagation(), haituoSetPlatformFilter(`all`), haituoSetHome(!0); }','title: `显示全部账号`, "aria-label": `显示全部账号`, onClick: e => { e.stopPropagation(), haituoSetPlatformFilter(`all`), haituoSetHome(!1);requestAnimationFrame(()=>A(o,0,!0)); }')
# Native settings/menu use the runtime platform, independent of website user agents.
s=s.replace('if (window.Signal.OS.isMacOS()) {e.stopPropagation();d(!1);l(!1);','if (window.SignalContext.OS.platform === `darwin`) {e.stopPropagation();d(!1);l(!1);')
s=s.replace('if (window.Signal.OS.isMacOS()) {d(!1);l(!1);','if (window.SignalContext.OS.platform === `darwin`) {d(!1);l(!1);')
p.write_text(s)
print('Applied 1.1.20: cross-process window order, persistent chat and scrollable provider-aware settings')
