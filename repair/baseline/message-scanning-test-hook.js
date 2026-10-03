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
        const html=`<html><body><style>#main{margin-top:100px}#main>div{min-height:70px}.selectable-text{white-space:pre-wrap}</style><div id="noise"></div><div id="main">
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
        const result=await win.webContents.executeJavaScript(`(()=>{clearInterval(window.fixtureNoise);return ['legacy','mixed','modern','paragraph','retry','late','wds'].map(id=>({id,count:document.getElementById(id).querySelectorAll('.haituo-wa-message-translation').length,text:document.getElementById(id).querySelector('.haituo-wa-message-translation span')?.textContent,error:!!document.getElementById(id).querySelector('.haituo-wa-translation-error'),top:document.getElementById(id).getBoundingClientRect().top,viewport:innerHeight}))})()`);
        check(result.every(row=>row.count===1&&!row.error),JSON.stringify(result));
        check(requests.every(row=>row.targetLanguage==='zh-CN'),'Wrong chat target language');
        check(!requests.some(row=>row.text==='https://example.com'),'Pure URL requested translation');
        check(attempts.get('Retry without page changes')===2,'Failed message did not retry independently');
        check(requests.some(row=>row.text==='First line 123\n\nSecond line 456 with https://example.com'),'Paragraph source changed');
        const before=requests.length;await delay(4500);check(requests.length===before,'Repeated scan translated completed messages again');
        (0,m.writeFileSync)(output,JSON.stringify({ok:true,result,requests},null,2));win.destroy();p.app.quit();
    }catch(error){(0,m.writeFileSync)(output,JSON.stringify({ok:false,error:String(error?.stack||error),requests},null,2));win?.destroy();p.app.exit(1);}
}
