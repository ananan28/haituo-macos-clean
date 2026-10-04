async function haituoTestMessageScanning() {
    if (process.platform !== `darwin` || $u !== `signal-main` || process.env.HAITUO_MESSAGE_TEST !== `1`) return;
    const requests=[], attempts=new Map(), delay=ms=>new Promise(r=>setTimeout(r,ms));
    const output=process.env.HAITUO_MESSAGE_TEST_RESULT;
    const check=(value,message)=>{if(!value)throw Error(message)};
    let win;
    try {
        p.ipcMain.removeHandler(`caisheng:translate`);
        p.ipcMain.handle(`caisheng:translate`,async(event,value)=>{
            requests.push(value);
            const count=(attempts.get(value.text)||0)+1;attempts.set(value.text,count);
            if(value.text==='Retry without page changes'&&count===1)throw Error('Fixture temporary service failure');
            return {text:'译：'+value.text};
        });
        win=new p.BrowserWindow({show:true,width:1000,height:900,webPreferences:{partition:'haituo-message-fixture',preload:(0,s.join)($,'js','caisheng-webview-preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
        win.webContents.on('preload-error',(event,path,error)=>console.error('Fixture preload error:',error));
        win.webContents.on('console-message',(event)=>console.log('Fixture renderer:',event.message));
        const html=`<html><body><style>#main{margin-top:20px;zoom:.6}#main>div{min-height:70px}.selectable-text{white-space:pre-wrap}</style><div id="noise"></div><div id="main">
        <div class="message-in" id="quoted"><div data-testid="quoted-message"><span class="selectable-text">Old quoted message must stay untouched</span><button onclick="window.quoteExpanded=true">Read more</button></div><span class="selectable-text">Actual reply only</span></div>
        <div data-testid="msg-container" id="legacy"><span class="selectable-text">Correct, up to 10</span></div>
        <div class="message-in" id="mixed"><span class="selectable-text">Hi 😊</span></div>
        <div data-id="false_chat_new" id="modern"><div data-pre-plain-text="metadata"><span dir="auto">Based on our tests, start with 5K first</span></div></div>
        <div class="message-out" id="paragraph"><span class="selectable-text">First line 123\n\nSecond line 456 with https://example.com</span></div>
        <div class="message-in" id="retry"><span class="selectable-text">Retry without page changes</span></div>
        <div data-id="3EB-modern-new" id="wds"><div data-testid="msg-container"><div><span data-testid="selectable-text">Modern WDS message 113</span></div></div></div>
        <div class="message-in" id="url"><span class="selectable-text">https://example.com</span></div>
        </div></body></html>`;
        win.webContents.session.setUserAgent('Mozilla/5.0 HaiTuo-Test');
        win.webContents.setUserAgent('Mozilla/5.0 HaiTuo-Test');
        await win.webContents.session.protocol.handle('https',request => new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}}));
        await win.loadURL('https://web.whatsapp.com/haituo-message-fixture');
        await win.webContents.executeJavaScript(`window.fixtureNoise=setInterval(()=>document.getElementById('noise').textContent=String(Date.now()),100);setTimeout(()=>{const row=document.createElement('div');row.className='message-in';row.id='late';row.innerHTML='<span class="selectable-text">New message during continuous updates</span>';document.getElementById('main').prepend(row);row.scrollIntoView({block:'center'})},2500)`);
        await delay(13000);
        const result=await win.webContents.executeJavaScript(`(()=>{clearInterval(window.fixtureNoise);return ['quoted','legacy','mixed','modern','paragraph','retry','late','wds'].map(id=>({id,count:document.getElementById(id).querySelectorAll('.haituo-wa-message-translation').length,text:document.getElementById(id).querySelector('.haituo-wa-message-translation span')?.textContent,error:!!document.getElementById(id).querySelector('.haituo-wa-translation-error'),top:document.getElementById(id).getBoundingClientRect().top,viewport:innerHeight}))})()`);
        check(result.every(row=>row.count===1&&!row.error),JSON.stringify(result));
        check(requests.some(row=>row.text==='Actual reply only')&&!requests.some(row=>row.text.includes('Old quoted message')),'Quote contaminated reply translation');
        check(await win.webContents.executeJavaScript(`!window.quoteExpanded&&!document.querySelector('[data-testid=quoted-message] .haituo-wa-message-translation')`),'Quoted preview expanded or translated');
        check(requests.every(row=>row.targetLanguage==='zh-CN'),'Wrong chat target language');
        check(!requests.some(row=>row.text==='https://example.com'),'Pure URL requested translation');
        check(attempts.get('Retry without page changes')===2,'Failed message did not retry independently');
        check(requests.some(row=>row.text==='First line 123\n\nSecond line 456 with https://example.com'),'Paragraph source changed');
        const before=requests.length;await delay(4500);check(requests.length===before,'Repeated scan translated completed messages again');
        const longLayouts=[];
        for (const mode of ['fixed-height','line-clamp','inline-wrapper','expanded']) {
            await win.webContents.executeJavaScript(`(()=>{
                const main=document.getElementById('main');main.innerHTML='';main.style.zoom='1';
                const row=document.createElement('div');row.className='message-in';row.id='long';row.style.cssText='width:300px;';
                const wrap=document.createElement('div');wrap.setAttribute('data-pre-plain-text','metadata');
                const text=document.createElement('span');text.className='selectable-text';text.dir='auto';
                text.textContent=('A long WhatsApp message with several sentences and clear paragraph boundaries. ').repeat(12)+'\\n\\nFinal paragraph.';
                if (${JSON.stringify(mode)}==='fixed-height') wrap.style.cssText='height:90px;max-height:90px;overflow:visible';
                if (${JSON.stringify(mode)}==='inline-wrapper') wrap.style.display='inline';
                if (${JSON.stringify(mode)}==='line-clamp') text.style.cssText='display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;max-height:90px;overflow:hidden';
                if (${JSON.stringify(mode)}==='expanded') {
                    text.textContent='Truncated long message';wrap.style.cssText='height:90px;max-height:90px;overflow:visible';
                    const more=document.createElement('button');more.textContent='Read more';more.onclick=()=>{text.textContent=('Expanded WhatsApp message with long paragraphs. ').repeat(18);more.remove();};wrap.append(more);
                }
                wrap.prepend(text);row.append(wrap);main.append(row);scrollTo(0,0);
            })()`);
            let layout;
            for(let tries=0;tries<80;tries++) {
                layout=await win.webContents.executeJavaScript(`(()=>{const row=document.getElementById('long'),translation=row.querySelector('.haituo-wa-message-translation'),source=row.querySelector('.selectable-text');if(!translation)return null;const range=document.createRange();range.selectNodeContents(source);const sourceBottom=range.getBoundingClientRect().bottom;return {count:row.querySelectorAll('.haituo-wa-message-translation').length,sourceBottom,translationTop:translation.getBoundingClientRect().top,translationBottom:translation.getBoundingClientRect().bottom,bubbleBottom:row.getBoundingClientRect().bottom,expanded:!row.querySelector('button:not(.haituo-wa-message-translation button)')};})()`);
                if(layout)break;await delay(150);
            }
            check(layout&&layout.count===1&&layout.translationTop>=layout.sourceBottom-1&&layout.bubbleBottom>=layout.translationBottom-1,mode+' overlaps or escapes the bubble: '+JSON.stringify(layout));
            if(mode==='expanded')check(requests.some(r=>r.text.startsWith('Expanded WhatsApp message'))&&!requests.some(r=>r.text==='Truncated long message'),'Expanded text was not translated in full');
            longLayouts.push({mode,...layout});
        }
        (0,m.writeFileSync)(output,JSON.stringify({ok:true,result,requests,longLayouts},null,2));win.destroy();p.app.quit();
    }catch(error){(0,m.writeFileSync)(output,JSON.stringify({ok:false,error:String(error?.stack||error),requests},null,2));win?.destroy();p.app.exit(1);}
}
