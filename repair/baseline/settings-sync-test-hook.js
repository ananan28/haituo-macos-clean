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
        haituoApplyTranslationConfig({...$p(),chatTextColor:'',outgoingBubbleColor:'',incomingBubbleColor:''});
        await haituoShowSettingsWindow();
        let settingsDeadline=Date.now()+10000;
        while(caishengSettingsWindow.webContents.isLoading()&&Date.now()<settingsDeadline)await delay(100);
        const nativeColor=await caishengSettingsWindow.webContents.executeJavaScript(`(()=>{const before=collect().outgoingBubbleColor,chosen=form.outgoingBubbleColor.value;form.outgoingBubbleColor.dispatchEvent(new Event('input',{bubbles:true}));return{before,chosen,after:collect().outgoingBubbleColor}})()`);
        check(nativeColor.before===''&&nativeColor.after===nativeColor.chosen,'Native settings drops an explicitly chosen default bubble color');
        await delay(300);check($p().outgoingBubbleColor===nativeColor.chosen,'Native color preview did not save');
        caishengSettingsWindow.close();stages.push({source:'native-color-picker',nativeColor});
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
