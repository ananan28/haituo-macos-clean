if(process.env.HAITUO_SETTINGS_TEST==='1'&&$u!=='signal-main')process.on('message',async value=>{
    if(value?.type!=='haituo-settings-test')return;
    try {
        const result=await Z.webContents.executeJavaScriptInIsolatedWorld(999,[{code:`(async()=>{
            const keys=['nativeTheme','chatFontSize','chatTextColor','incomingBubbleColor','outgoingBubbleColor','chatTranslationProvider','inputTranslationProvider'];
            if(!window.__settingsTestSubscribed){window.__settingsTestSubscribed=true;window.SignalContext.caishengOnTranslationConfig(cfg=>{window.__settingsTestObserved=Object.fromEntries(keys.map(k=>[k,cfg[k]]))})}
            if(${JSON.stringify(value.config||null)})await window.SignalContext.caishengSetTranslationConfig(${JSON.stringify(value.config||{})});
            const cfg=await window.SignalContext.caishengGetTranslationConfig();
            return {config:Object.fromEntries(keys.map(k=>[k,cfg[k]])),observed:window.__settingsTestObserved||null};
        })()`}]);
        process.send?.({type:'haituo-settings-test-result',requestId:value.requestId,result});
    }catch(error){process.send?.({type:'haituo-settings-test-result',requestId:value.requestId,error:String(error)})}
});
async function haituoTestSettingsSync() {
    if(process.env.HAITUO_SETTINGS_TEST!=='1'||$u!=='signal-main')return;
    const output=process.env.HAITUO_SETTINGS_TEST_RESULT, original=$p(), delay=ms=>new Promise(r=>setTimeout(r,ms));
    const ids=['signal-settings-test-a','signal-settings-test-b'],views=[],stages=[];
    let serviceCheck;
    const check=(ok,text)=>{if(!ok)throw Error(text)};
    const request=(id,config)=>new Promise((resolve,reject)=>{
        const child=Yg.get(id),requestId=String(Date.now())+Math.random();
        const timer=setTimeout(()=>{child.removeListener('message',listen);reject(Error('Settings child response timed out'))},15000);
        function listen(value){if(value?.type!=='haituo-settings-test-result'||value.requestId!==requestId)return;clearTimeout(timer);child.removeListener('message',listen);value.error?reject(Error(value.error)):resolve(value.result)}
        child.on('message',listen);caishengSendChild(child,{type:'haituo-settings-test',requestId,config});
    });
    try {
        const launch=p.ipcMain._invokeHandlers.get('caisheng:launch-signal-profile');
        for(const id of ids){await launch({senderFrame:{url:'file:///settings-fixture'}},id);const deadline=Date.now()+60000;while(!Xg.has(id)&&Date.now()<deadline)await delay(200);check(Xg.has(id),'Settings child did not become ready');await request(id)}
        const html=`<html><body><style>.incoming{background-color:var(--WDS-systems-bubble-surface-incoming,#242626)}.outgoing{background-color:var(--WDS-systems-bubble-surface-outgoing,#144d37)}</style><div id="app"><div id="main"><div data-id="modern-incoming"><div data-testid="msg-container"><div class="incoming" id="bubble-in"><span class="selectable-text" id="text-in">Hello</span></div></div></div><div data-id="modern-outgoing"><div data-testid="msg-container"><div class="outgoing" id="bubble-out"><span data-testid="selectable-text" id="text-out">Hi</span></div></div></div></div></div></body></html>`;
        for(let n=0;n<2;n++){
            const win=new p.BrowserWindow({show:false,width:900,height:700,webPreferences:{partition:'haituo-settings-fixture-'+n,preload:(0,s.join)($,'js','caisheng-webview-preload.js'),sandbox:true,contextIsolation:true}});
            win.webContents.session.setUserAgent('Mozilla/5.0 HaiTuo-Test');
            win.webContents.setUserAgent('Mozilla/5.0 HaiTuo-Test');
            await win.webContents.session.protocol.handle('https',()=>new Response(html,{headers:{'content-type':'text/html;charset=utf-8'}}));
            await win.loadURL('https://web.whatsapp.com/settings-fixture');views.push(win);
        }
        const cases=[{source:'main',config:{nativeTheme:'dark',darkTheme:true,chatFontSize:24,chatTextColor:'#abcdef',incomingBubbleLinked:false,incomingBubbleColor:'#123456',outgoingBubbleColor:'#654321',chatTranslationProvider:'openai',inputTranslationProvider:'google-free'}},
            {source:ids[0],config:{nativeTheme:'light',darkTheme:false,chatFontSize:14,chatTextColor:'#334455',incomingBubbleLinked:true,outgoingBubbleColor:'#456789',chatTranslationProvider:'google-free',inputTranslationProvider:'openai'}},
            {source:'whatsapp',config:{nativeTheme:'dark',darkTheme:true,chatFontSize:18,chatTextColor:'#567890',incomingBubbleLinked:false,incomingBubbleColor:'#aabbcc',outgoingBubbleColor:'#8899aa',chatTranslationProvider:'openai',inputTranslationProvider:'openai'}}];
        for(const test of cases){
            if(test.source==='main')haituoApplyTranslationConfig({...$p(),...test.config});
            else if(test.source==='whatsapp')await p.ipcMain._invokeHandlers.get('caisheng:set-translation-config')({senderFrame:{url:'https://web.whatsapp.com/'}},test.config);
            else await request(test.source,test.config);
            await delay(350);
            const expected=$p(),children=await Promise.all(ids.map(id=>request(id)));
            for(const child of children){for(const key of Object.keys(child.config)){check(child.config[key]===expected[key],'Saved child setting mismatch: '+key);check(child.observed?.[key]===expected[key],'Child renderer did not receive setting: '+key)}}
            const guest=await Promise.all(views.map(win=>win.webContents.executeJavaScript(`(()=>{const read=id=>{const st=getComputedStyle(document.getElementById(id));return{font:st.fontSize,color:st.color,bg:st.backgroundColor}};return{incoming:read('bubble-in'),outgoing:read('bubble-out'),text:read('text-in'),otherText:read('text-out'),theme:document.documentElement.dataset.theme}})()`)));
            const rgb=hex=>'rgb('+hex.slice(1).match(/../g).map(v=>parseInt(v,16)).join(', ')+')';
            for(const value of guest){check(value.text.font===expected.chatFontSize+'px'&&value.otherText.font===expected.chatFontSize+'px','WhatsApp size did not update');check(value.text.color===rgb(expected.chatTextColor)&&value.otherText.color===rgb(expected.chatTextColor),'WhatsApp text color did not update');check(value.incoming.bg===rgb(expected.incomingBubbleColor)&&value.outgoing.bg===rgb(expected.outgoingBubbleColor),'WhatsApp bubbles did not update');check(value.theme===expected.nativeTheme,'WhatsApp native appearance did not update')}
            stages.push({source:test.source,children,guest});
        }
        const mediaWin=views[0];
        haituoApplyTranslationConfig({...$p(),hideTranslationBox:false});
        const mediaHtml=`<html><body><style>body{margin:0}#main{position:absolute;left:200px;top:0;width:700px;height:700px}footer{position:absolute;left:0;bottom:0;width:420px;height:70px}footer [contenteditable]{width:390px;height:40px}#media-sidebar{position:absolute;left:620px;top:0;width:280px;height:700px}</style><div id="app"><div id="main"><footer><div contenteditable="true" role="textbox">Hello</div></footer></div><aside id="media-sidebar">影音内容</aside></div></body></html>`;
        mediaWin.webContents.session.protocol.unhandle('https');
        await mediaWin.webContents.session.protocol.handle('https',()=>new Response(mediaHtml,{headers:{'content-type':'text/html;charset=utf-8'}}));
        await mediaWin.loadURL('https://web.whatsapp.com/media-fixture');
        await mediaWin.webContents.executeJavaScript(`document.querySelector('[contenteditable]').focus();window.fixtureThemeMutations=0;new MutationObserver(records=>{window.fixtureThemeMutations+=records.length}).observe(document.documentElement,{attributes:true,attributeFilter:['class','data-theme']})`);
        await delay(4000);
        const media=await mediaWin.webContents.executeJavaScript(`(()=>{const p=document.getElementById('haituo-whatsapp-translator'),f=document.querySelector('footer'),r=p?.getBoundingClientRect(),b=f.getBoundingClientRect();return{exists:!!p,visible:p&&getComputedStyle(p).display!=='none',left:r?.left,right:r?.right,footerLeft:b.left,footerRight:b.right,themeMutations:window.fixtureThemeMutations}})()`);
        check(media.exists&&media.visible,'Media sidebar fixture translator missing');
        check(media.left>=media.footerLeft&&media.right<=media.footerRight,'Translator overlaps media sidebar');
        check(media.themeMutations===0,'Settings polling keeps mutating WhatsApp theme');
        await mediaWin.webContents.executeJavaScript(`const modal=document.createElement('div');modal.id='fixture-viewer';modal.setAttribute('data-testid','media-viewer');document.body.append(modal)`);
        await delay(400);
        const viewerHidden=await mediaWin.webContents.executeJavaScript(`getComputedStyle(document.getElementById('haituo-whatsapp-translator')).display==='none'`);
        check(viewerHidden,'Translator still covers media viewer');
        stages.push({source:'media-layout-fixture',media,viewerHidden});
        await mediaWin.webContents.executeJavaScript(`document.getElementById('fixture-viewer').remove()`);
        for(const hidden of [true,false,true]){
            haituoApplyTranslationConfig({...$p(),hideTranslationBox:hidden});await delay(1500);
            check($p().hideTranslationBox===hidden,'Read migration resets saved hide preference');
            const state=await mediaWin.webContents.executeJavaScript(`({hidden:!!document.getElementById('haituo-wa-translator-toggle'),expanded:!!document.querySelector('#haituo-whatsapp-translator textarea')})`);
            check(hidden?state.hidden&&!state.expanded:!state.hidden&&state.expanded,'Global hide translation setting did not update guest');
            stages.push({source:'hide-translation-toggle',hidden,state});
        }
        await mediaWin.webContents.executeJavaScript(`document.getElementById('haituo-wa-translator-toggle').click()`);await delay(600);
        check($p().hideTranslationBox===false,'Local restore toggle did not save');
        haituoApplyTranslationConfig({...$p(),hideTranslationBox:true});await delay(1000);
        check(await mediaWin.webContents.executeJavaScript(`!!document.getElementById('haituo-wa-translator-toggle')&&!document.querySelector('#haituo-whatsapp-translator textarea')`),'Local toolbar preference overrides global hide setting');
        stages.push({source:'local-then-global-hide',ok:true});
        const savedFetch=globalThis.fetch,audioCalls=[];
        const audioHandler=p.ipcMain._invokeHandlers.get('caisheng:transcribe-audio'),audioEvent={senderFrame:{url:'https://web.whatsapp.com/'}},audio={bytes:[1,2,3,4,5],mimeType:'audio/ogg',fileName:'fixture.ogg'};
        try{
            haituoApplyTranslationConfig({...$p(),voiceTranscriptionProvider:'openai',openaiVoiceApiKey:'Bearer fixture-key',openaiVoiceEndpoint:'https://api.example.test/v1/chat/completions',openaiVoiceModel:'',apiKey:'Bearer fixture-key',endpoint:'https://api.example.test/v1/chat/completions'});
            globalThis.fetch=async(url,options)=>{audioCalls.push({url,model:options.body.get('model'),authMatched:options.headers.Authorization==='Bearer fixture-key'});return new Response('{}',{status:401})};
            let rejected='';try{await audioHandler(audioEvent,audio)}catch(error){rejected=String(error.message)}
            stages.push({source:'audio-auth-attempt',audioCalls:[...audioCalls],rejected});
            check(audioCalls.length===1&&rejected.includes('认证失败')&&audioCalls[0].authMatched&&audioCalls[0].url==='https://api.example.test/v1/audio/transcriptions','401 audio auth/routing incorrect');
            globalThis.fetch=async(url,options)=>{audioCalls.push({url,model:options.body.get('model')});return options.body.get('model')==='whisper-1'?new Response(JSON.stringify({text:'fixture transcription'}),{status:200}):new Response('{}',{status:400})};
            const transcribed=await audioHandler(audioEvent,audio);check(transcribed.text==='fixture transcription'&&audioCalls.length===3,'Whisper unsupported-model fallback failed');
            haituoApplyTranslationConfig({...$p(),voiceTranscriptionProvider:'groq',groqApiKey:'fixture-groq'});
            globalThis.fetch=async(url,options)=>{audioCalls.push({url,model:options.body.get('model')});return new Response(JSON.stringify({text:'groq fixture transcription'}),{status:200})};
            const groq=await audioHandler(audioEvent,audio);check(groq.text==='groq fixture transcription'&&audioCalls.length===4,'Selected provider reused another provider cache');
            const textCalls=[];
            globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);textCalls.push({url,model:body.model,authMatched:options.headers.Authorization==='Bearer fixture-text'});return new Response(JSON.stringify({choices:[{message:{content:'文字路由测试'}}]}),{status:200})};
            const textResult=await p.ipcMain._invokeHandlers.get('caisheng:translate')(audioEvent,{text:'dedicated text route test',provider:'openai',purpose:'test',forceRefresh:true,strictProvider:true,apiKey:'Bearer fixture-text',endpoint:'https://text.example.test/v1/chat/completions/',model:'text-fixture-model'});
            check(textResult.text==='文字路由测试'&&textCalls.length===1&&textCalls[0].authMatched&&textCalls[0].url==='https://text.example.test/v1/chat/completions'&&textCalls[0].model==='text-fixture-model','Text route adds duplicate endpoint/Bearer or inherits voice model');
            stages.push({source:'openai-text-routing',textCalls,result:textResult});
            haituoApplyTranslationConfig({...$p(),voiceTranscriptionProvider:'openai',openaiVoiceApiKey:'fixture-dedicated',openaiVoiceEndpoint:'https://voice.example.test/v1/audio/transcriptions',openaiVoiceModel:'whisper-1',apiKey:'different-text-key',endpoint:'https://text.example.test/v1',model:'text-only-model'});
            const count=audioCalls.length;
            globalThis.fetch=async(url,options)=>{audioCalls.push({url,model:options.body.get('model'),dedicatedKey:options.headers.Authorization==='Bearer fixture-dedicated'});return new Response(JSON.stringify({text:'dedicated voice fixture'}),{status:200})};
            const dedicated=await audioHandler(audioEvent,audio);check(dedicated.provider==='openai-whisper-1'&&audioCalls.length===count+1&&audioCalls.at(-1).dedicatedKey&&audioCalls.at(-1).model==='whisper-1'&&audioCalls.at(-1).url==='https://voice.example.test/v1/audio/transcriptions','Voice request inherited text routing or model');
            const mute=p.ipcMain._invokeHandlers.get('caisheng:capture-voice-media'),ev={senderFrame:{url:'https://web.whatsapp.com/'},sender:mediaWin.webContents};
            for(const initiallyMuted of [false,true]){
                mediaWin.webContents.setAudioMuted(initiallyMuted);
                await mute(ev,{muteOnly:true});await mute(ev,{muteOnly:true});check(mediaWin.webContents.isAudioMuted(),'Nested transcription mute failed');
                await mute(ev,{muteOnly:false});check(mediaWin.webContents.isAudioMuted(),'Concurrent transcription restored audio early');
                await mute(ev,{muteOnly:false});check(mediaWin.webContents.isAudioMuted()===initiallyMuted,'Transcription did not preserve prior mute');
            }
            const translateMap=p.ipcMain._invokeHandlers,translateOriginal=translateMap.get('caisheng:translate');
            let mutedDuringRequest=false;
            try{
                translateMap.set('caisheng:translate',async()=>({text:'语音翻译 fixture'}));
                globalThis.fetch=async(url,options)=>{mutedDuringRequest=mediaWin.webContents.isAudioMuted();return new Response(JSON.stringify({text:'silent voice fixture'}),{status:200})};
                mediaWin.webContents.setAudioMuted(false);
                await mediaWin.webContents.executeJavaScript(`(()=>{const message=document.createElement('div');message.dataset.id='voice-fixture';message.style.cssText='margin-top:120px;height:120px';message.innerHTML='<div data-testid="msg-container"><audio controls src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA="></audio></div>';document.getElementById('main').append(message)})()`);
                await delay(2200);
                check(await mediaWin.webContents.executeJavaScript(`(()=>{const button=document.querySelector('.haituo-voice-transcribe');if(!button)return false;button.click();return true})()`),'Actual transcription button missing');
                await delay(1500);
                check(mutedDuringRequest&&!mediaWin.webContents.isAudioMuted(),'Actual transcription button failed to mute and restore audio');
                check(await mediaWin.webContents.executeJavaScript(`!!document.querySelector('.haituo-voice-result')&&[...document.querySelectorAll('audio')].every(a=>a.paused)`),'Silent transcription did not complete or stop playback');
            }finally{translateMap.set('caisheng:translate',translateOriginal)}
            stages.push({source:'audio-routing-fixture',audioCalls,rejected,transcribed,groq,dedicated,mutedDuringRequest});
        }finally{globalThis.fetch=savedFetch}
        try {
            const handler=p.ipcMain._invokeHandlers.get('caisheng:translate');
            const value={text:'Hello. Please keep the number 113.',targetLanguage:'zh-CN',provider:'google-free',purpose:'chat'};
            const event={senderFrame:{url:'https://web.whatsapp.com/'}};
            const translated=await handler(event,value), cached=await handler(event,value);
            serviceCheck={ok:!!translated.text&&translated.text!==value.text,provider:translated.provider,reused:cached.cached===true&&cached.text===translated.text};
        }catch(error){serviceCheck={ok:false,error:String(error?.message||error)}}
        (0,m.writeFileSync)(output,JSON.stringify({ok:true,stages,serviceCheck},null,2));
    }catch(error){(0,m.writeFileSync)(output,JSON.stringify({ok:false,error:String(error?.stack||error),stages,serviceCheck},null,2));p.app.exitCode=1}
    finally{haituoApplyTranslationConfig(original);for(const win of views)win.destroy();p.app.exit(p.app.exitCode||0)}
}
