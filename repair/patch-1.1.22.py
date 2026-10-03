from pathlib import Path
root=Path('macos/staging/app')
def change(s,a,b):
    assert s.count(a)==1,(a[:120],s.count(a))
    return s.replace(a,b,1)
p=root/'bundles/main.js';s=p.read_text()
s=change(s,'    const child=Yg.get(Zg?.id);','    if(!Z.isFocused() && !caishengFocusedSignals.has(Zg?.id) && !caishengMenuOpen)return;\n    const child=Yg.get(Zg?.id);')
s=change(s,'        if(Yg.get(t)===r&&e?.type===`haituo-show-settings-panel`)', '''        if(Yg.get(t)===r&&e?.type===`haituo-account-focus`){
            e.focused?caishengFocusedSignals.add(t):caishengFocusedSignals.delete(t);
            if(e.focused&&Zg?.id===t&&Z?.isVisible()&&!Z.isMinimized()){
                Z.showInactive();Z.moveTop();haituoMacOrderSelectedAccount();
            }
            return;
        }
        if(Yg.get(t)===r&&e?.type===`haituo-show-settings-panel`)''')
s=change(s,'    Z.setMenuBarVisibility(!1), Z.webContents.on(`before-input-event`, rmRefresh)', '''    (()=>{if(process.platform===`darwin`&&$u!==`signal-main`){
        Z.on(`focus`,()=>process.send?.({type:`haituo-account-focus`,focused:true}));
        Z.on(`blur`,()=>process.send?.({type:`haituo-account-focus`,focused:false}));
    }})(), Z.setMenuBarVisibility(!1), Z.webContents.on(`before-input-event`, rmRefresh)''')
s=change(s,'        voiceTranscriptionProvider: typeof t?.voiceTranscriptionProvider == `string` ? t.voiceTranscriptionProvider : `groq`,','''        voiceTranscriptionProvider: typeof t?.voiceTranscriptionProvider == `string` ? t.voiceTranscriptionProvider : `groq`,
        openaiVoiceEndpoint: typeof t?.openaiVoiceEndpoint===`string`?t.openaiVoiceEndpoint.trim():$p().openaiVoiceEndpoint,
        openaiVoiceApiKey: typeof t?.openaiVoiceApiKey===`string`?t.openaiVoiceApiKey.trim():$p().openaiVoiceApiKey,
        openaiVoiceModel: typeof t?.openaiVoiceModel===`string`?t.openaiVoiceModel.trim():$p().openaiVoiceModel,''')
s=change(s,'openAIKey = typeof n.apiKey === `string` ? n.apiKey.trim().replace(/^Bearer\\s+/iu, ``) : ``', 'openAIKey = String(n.openaiVoiceApiKey ?? n.apiKey ?? ``).trim().replace(/^Bearer\\s+/iu, ``)')
s=s.replace('const endpoint = typeof n.endpoint === `string` && n.endpoint.trim() ? n.endpoint.trim() : `https://api.openai.com/v1`;','const endpoint = String(n.openaiVoiceEndpoint ?? n.endpoint ?? ``).trim() || `https://api.openai.com/v1`;')
s=change(s,'u = await transcribe(endpoint, openAIKey, `gpt-4o-mini-transcribe`, `OpenAI`)', 'u = await transcribe(endpoint, openAIKey, n.openaiVoiceModel || `gpt-4o-mini-transcribe`, `OpenAI`)')
pos=s.index('u = await transcribe(endpoint, openAIKey, `whisper-1`');start=s.rfind('if (!u && preferredVoiceProvider === `openai` && openAIKey)',0,pos);s=s[:start]+s[start:].replace('if (!u && preferredVoiceProvider === `openai` && openAIKey)','if (!u && preferredVoiceProvider === `openai` && openAIKey && !n.openaiVoiceModel)',1)
s=change(s,'i = `voice\\0${preferredVoiceProvider}\\0${n.endpoint||``}\\0${o}`;', 'i = `voice\\0${preferredVoiceProvider}\\0${n.openaiVoiceEndpoint??n.endpoint??``}\\0${n.openaiVoiceModel||``}\\0${(0,f.createHash)(`sha256`).update(preferredVoiceProvider===`openai`?openAIKey:r).digest(`hex`)}\\0${o}`;')
s=change(s,'            const response = await fetch(`${url.replace(/\\/$/u, ``).replace(/\\/(chat\\/completions|audio\\/transcriptions)$/u, ``)}/audio/transcriptions`, {', '''            const base=String(url).trim().replace(/\\/+$/u,``).replace(/\\/(chat\\/completions|audio\\/transcriptions)$/u,``);
            const parsed=new URL(base);if(![`https:`,`http:`].includes(parsed.protocol)||parsed.username||parsed.password||parsed.search||parsed.hash)throw Error(`语音 API 地址格式错误`);
            const endpoint=`${base}/audio/transcriptions`;
            const response = await fetch(endpoint, {''')
s=change(s,'                error.status=response.status;throw error;', '''                let code=``;try{const body=await response.json();const raw=String(body?.error?.code||body?.error?.type||``);if(/^[a-zA-Z0-9_-]{1,80}$/u.test(raw))code=raw}catch{}
                error.message+=`；地址：${endpoint}；语音模型：${model}${code?`；服务错误：${code}`:``}`;
                error.status=response.status;throw error;''')
p.write_text(s)
p=root/'bundles/preload/main.js';s=p.read_text()
s=change(s,'            voiceTranscriptionProvider: e.voiceTranscriptionProvider,','''            voiceTranscriptionProvider: e.voiceTranscriptionProvider,
            openaiVoiceEndpoint:e.openaiVoiceEndpoint??(e.voiceTranscriptionProvider===`openai`?e.compatibleEndpoint:undefined),openaiVoiceApiKey:e.openaiVoiceApiKey??(e.voiceTranscriptionProvider===`openai`?e.apiKey:undefined),openaiVoiceModel:e.openaiVoiceModel,''')
s=change(s,'                className: `CaishengPlatformShell__content`,','''                className: `CaishengPlatformShell__content`,
                "data-haituo-native-account":!haituoHome&&r.find(account=>account.id===o)?.platformId===`signal`?`true`:`false`,''')
s=change(s,'                        "data-caisheng-workspace": e.id,','''                        "data-caisheng-workspace": e.id,
                        "data-haituo-active":!haituoHome&&o===e.id?`true`:`false`,''')
s=change(s,'            let i = document.querySelector(`webview[data-caisheng-workspace="${CSS.escape(e)}"]`);','''            document.querySelectorAll(`webview[data-caisheng-workspace]`).forEach(node=>{
                const active=(forceVisible||!haituoHome)&&node.dataset.caishengWorkspace===e;
                node.dataset.haituoActive=active?`true`:`false`;
                node.style.visibility=active?`visible`:`hidden`;node.style.pointerEvents=active&&!overlayActive?`auto`:`none`;
            });
            let i = document.querySelector(`webview[data-caisheng-workspace="${CSS.escape(e)}"]`);''')
marker='                    }), (0, O9.jsxs)(`div`, {\n                        style: { marginTop: `6px`, padding: `8px 10px`'
assert s.count(marker)==1
fields='''                    }), m.voiceTranscriptionProvider===`openai`?(0,O9.jsxs)(O9.Fragment,{children:[
                        (0,O9.jsxs)(`label`,{children:[(0,O9.jsx)(`span`,{children:`OpenAI 音转文 API Key`}),(0,O9.jsx)(`input`,{type:`password`,"aria-label":`OpenAI 音转文 API Key`,value:m.openaiVoiceApiKey??m.apiKey??``,onChange:e=>N({openaiVoiceApiKey:e.target.value})})]}),
                        (0,O9.jsxs)(`label`,{children:[(0,O9.jsx)(`span`,{children:`OpenAI 音转文 API 地址`}),(0,O9.jsx)(`input`,{"aria-label":`OpenAI 音转文 API 地址`,placeholder:`https://api.openai.com/v1`,value:m.openaiVoiceEndpoint??m.compatibleEndpoint??``,onChange:e=>N({openaiVoiceEndpoint:e.target.value})})]}),
                        (0,O9.jsxs)(`label`,{children:[(0,O9.jsx)(`span`,{children:`OpenAI 音转文模型`}),(0,O9.jsx)(`input`,{"aria-label":`OpenAI 音转文模型`,placeholder:`gpt-4o-mini-transcribe（兼容服务可填 whisper-1）`,value:m.openaiVoiceModel??``,onChange:e=>N({openaiVoiceModel:e.target.value})})]}),
                        (0,O9.jsx)(`small`,{children:`音转文使用以上地址、密钥和语音模型。修改后保存；留空模型时自动尝试 mini-transcribe 和 whisper-1。`})
                    ]}):null,(0, O9.jsxs)(`div`, {
                        style: { marginTop: `6px`, padding: `8px 10px`'''
s=change(s,marker,fields)
s=s.replace('当前版本 1.1.21','当前版本 1.1.22').replace('海拓 1.1.21','海拓 1.1.22');p.write_text(s)
p=root/'stylesheets/haituo-layout.css';p.write_text(p.read_text()+'''\n/* Inactive guests must never paint through native account gaps or focus transitions. */
.CaishengPlatformShell__content[data-haituo-native-account="true"]>.CaishengPlatformShell__webview,.CaishengPlatformShell__webview[data-haituo-active="false"]{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
''')
p=root/'js/caisheng-webview-preload.js';s=p.read_text()
s=change(s,'                    try {\n                        const control = voiceTrigger', '''                    let muteAcquired=false;
                    try {
                        await ipcRenderer.invoke("caisheng:capture-voice-media",{muteOnly:true});muteAcquired=true;
                        const control = voiceTrigger''')
s=change(s,'try { captured = await ipcRenderer.invoke("caisheng:capture-voice-media", { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }); } catch {}','try { if(!e.querySelector("audio[src],audio source[src]"))captured = await ipcRenderer.invoke("caisheng:capture-voice-media", { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }); } catch {}')
s=change(s,'                    }\n                }, voiceMount.append(voice);','''                    } finally {
                        if(muteAcquired){
                            await webFrame.executeJavaScript(`(()=>{document.querySelectorAll('audio,video').forEach(media=>{try{media.pause()}catch{}})})()`).catch(()=>{});
                            await ipcRenderer.invoke("caisheng:capture-voice-media",{muteOnly:false}).catch(()=>{});
                        }
                    }
                }, voiceMount.append(voice);''')
p.write_text(s)
print('Applied 1.1.22: isolated guest paint, user focus grouping, dedicated voice routing and awaited transcription mute')
