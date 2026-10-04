async function haituoTestMessageScanning() {
    if ($u !== `signal-main` || process.env.HAITUO_MESSAGE_TEST !== `1`) return;
    const requests=[], attempts=new Map(), delay=ms=>new Promise(r=>setTimeout(r,ms));
    const output=process.env.HAITUO_MESSAGE_TEST_RESULT;
    const check=(value,message)=>{if(!value)throw Error(message)};
    let win,fixtureConfig={hideTranslationBox:true,blockChineseOutgoing:true};
    try {
        p.ipcMain.removeHandler('caisheng:get-translation-config');
        p.ipcMain.handle('caisheng:get-translation-config',()=>fixtureConfig);
        p.ipcMain.removeHandler('caisheng:set-translation-config');
        p.ipcMain.handle('caisheng:set-translation-config',async(event,next)=>{fixtureConfig={...fixtureConfig,...next}; await delay(40); event.sender.send('caisheng:translation-config-changed',fixtureConfig);return fixtureConfig});
        p.ipcMain.removeHandler(`caisheng:translate`);
        p.ipcMain.handle(`caisheng:translate`,async(event,value)=>{
            requests.push(value);
            if(value.purpose==='input')await delay(100);
            const count=(attempts.get(value.text)||0)+1;attempts.set(value.text,count);
            if(value.text==='Retry without page changes'&&count===1)throw Error('Fixture temporary service failure');
            return {text:value.purpose==='input'?'English translation':'译：'+value.text};
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
        for (const mode of ['fixed-height','line-clamp','inline-wrapper','expanded','outer-fixed-height']) {
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
                wrap.prepend(text);if (${JSON.stringify(mode)}==='outer-fixed-height'){const outer=document.createElement('div');outer.style.cssText='height:90px;max-height:90px;overflow:visible';outer.append(wrap);row.append(outer)}else row.append(wrap);main.append(row);scrollTo(0,0);
            })()`);
            let layout;
            for(let tries=0;tries<80;tries++) {
                layout=await win.webContents.executeJavaScript(`(()=>{const row=document.getElementById('long'),translation=row.querySelector('.haituo-wa-message-translation'),source=row.querySelector('.selectable-text');if(!translation)return null;const range=document.createRange();range.selectNodeContents(source);const sourceBottom=range.getBoundingClientRect().bottom;return {count:row.querySelectorAll('.haituo-wa-message-translation').length,sourceBottom,translationTop:translation.getBoundingClientRect().top,translationBottom:translation.getBoundingClientRect().bottom,bubbleBottom:row.getBoundingClientRect().bottom,expanded:!row.querySelector('button:not(.haituo-wa-message-translation button)')};})()`);
                if(layout)break;await delay(150);
            }
            check(layout&&layout.count===1&&layout.translationTop>=layout.sourceBottom-1&&layout.bubbleBottom>=layout.translationBottom-1,mode+' overlaps or escapes the bubble: '+JSON.stringify(layout));
            if(mode==='expanded')check(requests.some(r=>r.text.startsWith('Expanded WhatsApp message'))&&!requests.some(r=>r.text==='Truncated long message'),'Expanded text was not translated in full');
            await win.webContents.executeJavaScript(`document.getElementById('long').style.width='220px'`);
            const resized=await win.webContents.executeJavaScript(`(()=>{const row=document.getElementById('long'),source=row.querySelector('.selectable-text'),translation=row.querySelector('.haituo-wa-message-translation'),r=document.createRange();r.selectNodeContents(source);return {sourceBottom:r.getBoundingClientRect().bottom,translationTop:translation.getBoundingClientRect().top,bubbleBottom:row.getBoundingClientRect().bottom,translationBottom:translation.getBoundingClientRect().bottom}})()`);
            check(resized.translationTop>=resized.sourceBottom-1&&resized.bubbleBottom>=resized.translationBottom-1,'Resize overlapped: '+JSON.stringify(resized));
            longLayouts.push({mode,...layout,resized});
        }
        await win.webContents.executeJavaScript(`(()=>{document.getElementById('main').innerHTML='';const footer=document.createElement('footer');footer.style.cssText='position:fixed;bottom:0;width:700px;height:100px';footer.innerHTML='<div id="fixture-composer" role="textbox" contenteditable="true" style="width:400px;height:40px"></div><button aria-label="Send" style="width:50px;height:35px">Send</button>';document.body.append(footer);window.nativeSent=[];window.confirmCalls=0;window.confirm=()=>{window.confirmCalls++;return false};const composer=document.getElementById('fixture-composer'),send=()=>{window.nativeSent.push(composer.textContent);composer.textContent='';composer.dispatchEvent(new Event('input',{bubbles:true}))};footer.querySelector('button').onclick=send;composer.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.defaultPrevented)send()});composer.focus();composer.dispatchEvent(new Event('focusin',{bubbles:true}));})()`);
        const setBlock=async block=>{fixtureConfig={hideTranslationBox:false,blockChineseOutgoing:block};win.webContents.send('caisheng:translation-config-changed',fixtureConfig);await delay(300)};
        const sendSnapshot=()=>win.webContents.executeJavaScript(`({sent:[...window.nativeSent],confirmCalls:window.confirmCalls,composer:document.getElementById('fixture-composer').textContent,quick:document.getElementById('haituo-whatsapp-quick-input')?.value})`);
        const sendingChecks=[];
        await setBlock(false);let beforeSend=requests.length;
        await win.webContents.executeJavaScript(`(()=>{const c=document.getElementById('fixture-composer');c.textContent='直接发送中文按钮';document.querySelector('footer button').click();c.textContent='直接发送中文回车';c.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));})()`);
        let sent=await sendSnapshot();check(sent.sent.join('|')==='直接发送中文按钮|直接发送中文回车'&&sent.confirmCalls===0&&requests.length===beforeSend,'OFF native send changed original: '+JSON.stringify(sent));sendingChecks.push({stage:'off-native',...sent});
        await setBlock(true);
        await win.webContents.executeJavaScript(`(()=>{const c=document.getElementById('fixture-composer');c.textContent='开启禁止中文';document.querySelector('footer button').click();c.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));})()`);
        sent=await sendSnapshot();check(sent.sent.length===2&&sent.composer==='开启禁止中文','ON native Chinese not blocked');sendingChecks.push({stage:'on-native-blocked',...sent});
        await setBlock(false);beforeSend=requests.length;
        await win.webContents.executeJavaScript(`(()=>{const q=document.getElementById('haituo-whatsapp-quick-input');q.value='关闭开关快速输入中文';q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));})()`);await delay(1500);
        sent=await sendSnapshot();check(sent.sent.at(-1)==='关闭开关快速输入中文'&&sent.quick===''&&requests.length===beforeSend&&sent.confirmCalls===0,'OFF quick send translated/failed: '+JSON.stringify(sent));sendingChecks.push({stage:'off-quick-original',...sent});
        await setBlock(true);beforeSend=requests.length;
        await win.webContents.executeJavaScript(`(()=>{const q=document.getElementById('haituo-whatsapp-quick-input');q.value='开启开关快速输入翻译';q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));})()`);await delay(1700);
        sent=await sendSnapshot();check(sent.sent.at(-1)==='English translation'&&requests.length===beforeSend+1,'ON quick send did not translate: '+JSON.stringify(sent));sendingChecks.push({stage:'on-quick-translated',...sent});
        await setBlock(false);beforeSend=requests.length;
        await win.webContents.executeJavaScript(`(()=>{const q=document.getElementById('haituo-whatsapp-quick-input');q.value='手动点击翻译';[...document.querySelectorAll('#haituo-whatsapp-translator button')].find(b=>b.textContent==='翻译').click()})()`);await delay(1500);
        sent=await sendSnapshot();check(sent.sent.length===4&&sent.composer==='English translation'&&requests.slice(beforeSend).filter(r=>r.text==='手动点击翻译'&&r.purpose==='input').length===1,'Explicit translate failed when OFF: '+JSON.stringify(sent));sendingChecks.push({stage:'off-explicit-translate',...sent});
        // Use the actual local onchange/save path, rather than only remote notifications.
        await win.webContents.executeJavaScript(`(()=>{const q=document.getElementById('haituo-whatsapp-quick-input');q.value='切换保留草稿';document.querySelector('[data-haituo-block-chinese]').click()})()`);await delay(200);
        let ui=await win.webContents.executeJavaScript(`({quick:document.getElementById('haituo-whatsapp-quick-input').value,placeholder:document.getElementById('haituo-whatsapp-quick-input').placeholder,label:document.querySelector('[data-haituo-translate-action="send"]').textContent,checked:document.querySelector('[data-haituo-block-chinese]').checked})`);
        check(ui.checked&&ui.quick==='切换保留草稿'&&ui.placeholder.includes('翻译并发送')&&ui.label==='翻译并发送','ON local toggle UI/draft incorrect: '+JSON.stringify(ui));
        await win.webContents.executeJavaScript(`document.querySelector('[data-haituo-block-chinese]').click()`);await delay(200);
        ui=await win.webContents.executeJavaScript(`({quick:document.getElementById('haituo-whatsapp-quick-input').value,placeholder:document.getElementById('haituo-whatsapp-quick-input').placeholder,label:document.querySelector('[data-haituo-translate-action="send"]').textContent,checked:document.querySelector('[data-haituo-block-chinese]').checked})`);
        check(!ui.checked&&ui.quick==='切换保留草稿'&&ui.placeholder.includes('直接发送原文')&&ui.label==='直接发送','OFF local toggle UI/draft incorrect: '+JSON.stringify(ui));sendingChecks.push({stage:'local-toggle-preserves-draft',...ui});
        await win.webContents.executeJavaScript(`(()=>{const c=document.querySelector('[data-haituo-block-chinese]');c.click();c.click()})()`);await delay(350);
        ui=await win.webContents.executeJavaScript(`({checked:document.querySelector('[data-haituo-block-chinese]').checked,quick:document.getElementById('haituo-whatsapp-quick-input').value,label:document.querySelector('[data-haituo-translate-action="send"]').textContent})`);
        check(!ui.checked&&!fixtureConfig.blockChineseOutgoing&&ui.quick==='切换保留草稿'&&ui.label==='直接发送','Rapid toggle reverted latest choice: '+JSON.stringify(ui));sendingChecks.push({stage:'rapid-toggle-last-choice',...ui});
        beforeSend=requests.length;
        await win.webContents.executeJavaScript(`(()=>{document.getElementById('haituo-whatsapp-quick-input').value='';document.getElementById('fixture-composer').textContent='顶部原文中文';document.querySelector('[data-haituo-translate-action="send"]').click()})()`);await delay(1300);
        sent=await sendSnapshot();check(sent.sent.at(-1)==='顶部原文中文'&&requests.length===beforeSend,'OFF top button translated/failed: '+JSON.stringify(sent));sendingChecks.push({stage:'off-top-original',...sent});
        // No semantic send button: the attachment button must never be clicked.
        await win.webContents.executeJavaScript(`(()=>{const b=document.querySelector('footer button');b.removeAttribute('aria-label');b.textContent='+';b.onclick=()=>window.attachmentClicked=true;window.trustedEnter=0;document.getElementById('fixture-composer').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.isTrusted)window.trustedEnter++});})()`);
        win.focus();win.webContents.focus();beforeSend=requests.length;
        await win.webContents.executeJavaScript(`(()=>{const q=document.getElementById('haituo-whatsapp-quick-input');q.value='原生回车发送中文';q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))})()`);await delay(1500);
        sent=await sendSnapshot();const native=await win.webContents.executeJavaScript(`({trustedEnter:window.trustedEnter,attachmentClicked:!!window.attachmentClicked})`);
        check(sent.sent.at(-1)==='原生回车发送中文'&&sent.quick===''&&native.trustedEnter===1&&!native.attachmentClicked&&requests.length===beforeSend,'Native Enter fallback failed: '+JSON.stringify({sent,native}));sendingChecks.push({stage:'trusted-enter-no-attachment',...sent,...native});
        await setBlock(true);beforeSend=requests.length;const sentCount=sent.sent.length;
        await win.webContents.executeJavaScript(`(()=>{const q=document.getElementById('haituo-whatsapp-quick-input');q.value='并发回车只发送一次';for(let i=0;i<3;i++)q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))})()`);await delay(1600);
        sent=await sendSnapshot();check(sent.sent.length===sentCount+1&&requests.length===beforeSend+1,'Concurrent Enter duplicated request/send: '+JSON.stringify(sent));sendingChecks.push({stage:'concurrent-enter-once',...sent});
        const beforeStale=sent.sent.length;
        await win.webContents.executeJavaScript(`(()=>{const q=document.getElementById('haituo-whatsapp-quick-input');q.value='翻译期间保留新输入';q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));setTimeout(()=>document.getElementById('fixture-composer').textContent='用户新输入',30)})()`);await delay(1500);
        sent=await sendSnapshot();check(sent.sent.length===beforeStale&&sent.composer==='用户新输入'&&sent.quick==='翻译期间保留新输入','Stale translation overwrote/sent new input: '+JSON.stringify(sent));sendingChecks.push({stage:'stale-input-preserved',...sent});
        (0,m.writeFileSync)(output,JSON.stringify({ok:true,result,requests,longLayouts,sendingChecks},null,2));win.destroy();p.app.quit();
    }catch(error){(0,m.writeFileSync)(output,JSON.stringify({ok:false,error:String(error?.stack||error),requests},null,2));win?.destroy();p.app.exit(1);}
}
