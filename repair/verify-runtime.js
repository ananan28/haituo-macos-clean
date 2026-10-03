if (process.platform === `darwin` && process.env.HAITUO_VERIFY_RUNTIME === `1`) {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const snapshot = `(() => {const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';return {ready:document.readyState,loading:[...document.querySelectorAll('.app-loading-screen')].some(visible),installed:[...document.querySelectorAll('[class*="InstallScreen"],.inbox')].some(visible),shell:!!document.querySelector('.CaishengPlatformShell'),body:!!document.body&&document.body.children.length>0}})()`;
    if ($u !== `signal-main`) process.on(`message`, async event => {
        if (event?.type !== `haituo-verify-state` || !Z || Z.isDestroyed()) return;
        try {
            const page = await Z.webContents.executeJavaScript(snapshot);
            process.send?.({type:`haituo-verify-result`,requestId:event.requestId,visible:Z.isVisible(),bounds:Z.getBounds(),page});
        } catch (error) { process.send?.({type:`haituo-verify-result`,requestId:event.requestId,error:String(error)}); }
    });
    else p.app.whenReady().then(async () => {
        const output = process.env.HAITUO_VERIFY_RESULT, ids = [`signal-verify-one`, `signal-verify-two`], states=[];
        const check=(value,message)=>{if(!value)throw Error(message)};
        const state=id=>new Promise((resolve,reject)=>{
            const child=Yg.get(id),requestId=`verify-${Date.now()}-${id}`;
            const timer=setTimeout(()=>{child.removeListener(`message`,listen);reject(Error(`Account state timed out: ${id}`))},10000);
            function listen(event){if(event?.type!==`haituo-verify-result`||event.requestId!==requestId)return;clearTimeout(timer);child.removeListener(`message`,listen);resolve({...event,id})}
            child.on(`message`,listen);caishengSendChild(child,{type:`haituo-verify-state`,requestId});
        });
        try {
            let deadline=Date.now()+90000,mainPage;
            do {await wait(500);if(Z&&!Z.isDestroyed())mainPage=await Z.webContents.executeJavaScript(snapshot)} while((!mainPage?.body||mainPage.loading)&&Date.now()<deadline);
            check(mainPage?.body&&!mainPage.loading,`Main window stayed on loading screen`);states.push({stage:`main-ready`,page:mainPage});
            const launch=p.ipcMain._invokeHandlers.get(`caisheng:launch-signal-profile`),sync=p.ipcMain._invokeHandlers.get(`caisheng:sync-signal-profile`);
            check(typeof launch===`function`&&typeof sync===`function`,`Missing account handlers`);
            for(const id of ids){await launch({},id);deadline=Date.now()+90000;while(!Xg.has(id)&&Date.now()<deadline)await wait(500);check(Xg.has(id),`Account did not initialize: ${id}`)}
            for(const id of [ids[0],ids[1],ids[0]]){
                sync({}, {id,x:100,y:80,width:640,height:440,keepVisible:true});await wait(1200);
                const accounts=await Promise.all(ids.map(state));check(accounts.filter(x=>x.visible).length===1&&accounts.find(x=>x.id===id)?.visible,`Account selection visibility failed`);
                states.push({stage:`selected`,id,accounts});
            }
            const selected=await state(ids[0]);
            const original=Z.getBounds();Z.setBounds({...original,x:original.x+35,y:original.y+25});await wait(1200);
            const moved=await state(ids[0]);check(Math.abs(moved.bounds.x-selected.bounds.x-35)<=2&&Math.abs(moved.bounds.y-selected.bounds.y-25)<=2,`Account did not follow parent movement`);states.push({stage:`moved`,bounds:moved.bounds});
            const overlay=new p.BrowserWindow({show:false,width:350,height:250,parent:Z});
            try {haituoRaiseOverlayWindow(overlay);await wait(1000);check((await Promise.all(ids.map(state))).every(x=>!x.visible),`Account covered overlay`)} finally{overlay.destroy()}
            await wait(1000);check((await state(ids[0])).visible,`Account did not return after overlay`);
            deadline=Date.now()+90000;let page;
            do{page=(await state(ids[0])).page;if(page?.installed&&!page.loading)break;await wait(1000)}while(Date.now()<deadline);
            check(page?.installed&&!page.loading,`Signal stayed on loading screen`);states.push({stage:`signal-ready`,page});
            (0,m.writeFileSync)(output,JSON.stringify({ok:true,states},null,2));
        } catch(error) {(0,m.writeFileSync)(output,JSON.stringify({ok:false,error:String(error?.stack||error),states},null,2))}
        finally {for(const id of ids)caishengTerminateSignalChild(Yg.get(id));p.app.exit(0)}
    });
}
