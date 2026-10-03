if (process.platform === `darwin` && process.env.HAITUO_VERIFY_RUNTIME === `1`) {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const snapshot = `(() => {const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';return {ready:document.readyState,loading:[...document.querySelectorAll('.app-loading-screen')].some(visible),installed:[...document.querySelectorAll('[class*="InstallScreen"],.inbox')].some(visible),shell:!!document.querySelector('.CaishengPlatformShell'),body:!!document.body&&document.body.children.length>0}})()`;
    if ($u !== `signal-main`) process.on(`message`, async event => {
        if(event?.type===`haituo-verify-focus`){p.app.focus({steal:true});Z.show();Z.focus();return}
        if (event?.type !== `haituo-verify-state` || !Z || Z.isDestroyed()) return;
        try {
            const page = await Z.webContents.executeJavaScript(snapshot);
            process.send?.({type:`haituo-verify-result`,requestId:event.requestId,visible:Z.isVisible(),bounds:Z.getBounds(),accountState:Qg,page,dockVisible:p.app.dock?.isVisible(),execPath:process.execPath,windowId:Z.getMediaSourceId()});
        } catch (error) { process.send?.({type:`haituo-verify-result`,requestId:event.requestId,error:String(error)}); }
    });
    else p.app.whenReady().then(async () => {
        const output = process.env.HAITUO_VERIFY_RESULT, ids = [], states=[];
        const rendererErrors=[];
        const attachConsole=()=>Z?.webContents.on('console-message',(_event,level,message)=>{if(level>=2){rendererErrors.push(message);console.error('Runtime renderer:',message)}});
        p.app.once('browser-window-created',attachConsole);if(Z)attachConsole();
        const check=(value,message)=>{if(!value)throw Error(message)};
        const state=id=>new Promise((resolve,reject)=>{
            const child=Yg.get(id),requestId=`verify-${Date.now()}-${id}`;
            const timer=setTimeout(()=>{child.removeListener(`message`,listen);reject(Error(`Account state timed out: ${id}`))},10000);
            function listen(event){if(event?.type!==`haituo-verify-result`||event.requestId!==requestId)return;clearTimeout(timer);child.removeListener(`message`,listen);resolve({...event,id})}
            child.on(`message`,listen);caishengSendChild(child,{type:`haituo-verify-state`,requestId});
        });
        const windowOrder=()=>{
            const result=(0,c.spawnSync)(process.env.HAITUO_WINDOW_ORDER_TOOL,[],{encoding:`utf8`});
            check(result.status===0,`Could not inspect macOS window stacking: ${result.stderr}`);
            return JSON.parse(result.stdout).map(win=>({...win,id:Number(win.id)}));
        };
        const assertAbove=async(id,stage,overlay)=>{
            const account=await state(id),rootId=Number(Z.getMediaSourceId().split(`:`)[1]),childId=Number(account.windowId.split(`:`)[1]);
            const order=windowOrder(),rootIndex=order.findIndex(win=>win.id===rootId),childIndex=order.findIndex(win=>win.id===childId);
            check(account.visible&&childIndex>=0&&rootIndex>=0&&childIndex<rootIndex,`Signal is behind main window at ${stage}: child ${childIndex}, root ${rootIndex}, visible ${account.visible}, selection ${JSON.stringify(Zg)}, rootVisible ${Z.isVisible()}, rootMinimized ${Z.isMinimized()}, childConfig ${JSON.stringify(account.accountState)}`);
            if(overlay){const overlayIndex=order.findIndex(win=>win.id===Number(overlay.getMediaSourceId().split(`:`)[1]));check(overlayIndex>=0&&overlayIndex<childIndex,`Settings is covered by Signal`)}
            states.push({stage,rootIndex,childIndex,visible:account.visible});
        };
        const mouseClick=async(selector)=>{
            const rect=await Z.webContents.executeJavaScript(`(()=>{const r=document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();if(!r)throw Error('Button missing');return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
            Z.focus();Z.moveTop();
            Z.webContents.sendInputEvent({type:`mouseDown`,...rect,button:`left`,clickCount:1});
            Z.webContents.sendInputEvent({type:`mouseUp`,...rect,button:`left`,clickCount:1});
        };
        try {
            let deadline=Date.now()+90000,mainPage;
            do {await wait(500);if(Z&&!Z.isDestroyed())mainPage=await Z.webContents.executeJavaScript(snapshot)} while((!mainPage?.body||mainPage.loading)&&Date.now()<deadline);
            check(mainPage?.body&&!mainPage.loading,`Main window stayed on loading screen`);check(p.app.dock.isVisible(),`Main app missing from Dock`);states.push({stage:`main-ready`,page:mainPage,mainDockVisible:p.app.dock.isVisible()});
            check(await Z.webContents.executeJavaScript(`(()=>{const tab=document.querySelector('button[data-caisheng-tab-workspace="signal-main"]');if(!tab)return false;tab.click();return true})()`),`Main Signal tab missing`);
            deadline=Date.now()+90000;
            do{await wait(500);mainPage=await Z.webContents.executeJavaScript(snapshot)}while((!mainPage.installed||mainPage.loading)&&Date.now()<deadline);
            check(mainPage.installed&&!mainPage.loading,`Main Signal stayed on loading screen`);states.push({stage:`main-signal-ready`,page:mainPage});
            const guestSession=p.session.fromPartition('persist:caisheng-whatsapp-paint-fixture');
            await guestSession.protocol.handle('https',()=>new Response('<html><body style="background:#00ff00">WHATSAPP PAINT FIXTURE</body></html>',{headers:{'content-type':'text/html'}}));
            const guestCreate=await Z.webContents.executeJavaScript(`(()=>{try{const node=document.createElement('webview');node.id='paint-fixture';node.className='CaishengPlatformShell__webview';node.dataset.caishengWorkspace='whatsapp-paint-fixture';node.dataset.haituoActive='false';node.setAttribute('partition','persist:caisheng-whatsapp-paint-fixture');node.src='https://web.whatsapp.com/paint-fixture';node.style.visibility='visible';document.querySelector('.CaishengPlatformShell__content').append(node);window.paintViolations=[];const sample=()=>{const n=document.getElementById('paint-fixture');if(n&&getComputedStyle(n).visibility!=='hidden'&&getComputedStyle(n).opacity!=='0'){window.paintViolations.push(performance.now());n.dataset.paintViolations=JSON.stringify(window.paintViolations)};window.paintFrame=requestAnimationFrame(sample)};sample();return{ok:true,method:typeof node.getWebContentsId}}catch(error){return{error:String(error.stack)}}})()`);states.push({stage:'paint-guest-create',guestCreate});check(guestCreate.ok,JSON.stringify(guestCreate));
            await wait(1000);
            const guestReady=await Z.webContents.executeJavaScript(`(()=>{try{const v=document.getElementById('paint-fixture');return{hidden:getComputedStyle(v).visibility==='hidden',method:typeof v.getWebContentsId,id:v.getWebContentsId()}}catch(error){return{error:String(error.stack)}}})()`);states.push({stage:'paint-guest-ready',guestReady});check(guestReady.hidden&&guestReady.id,'Inactive loaded WhatsApp guest can paint: '+JSON.stringify(guestReady));
            await mouseClick('.CaishengPlatformShell__settingsButton');await wait(500);
            check(!caishengSettingsWindow,`Unexpected floating settings window`);
            const settingsLayout=await Z.webContents.executeJavaScript(`(()=>{const e=document.querySelector('.CaishengPlatformShell__settings'),r=e.getBoundingClientRect();return{height:e.clientHeight,scroll:e.scrollHeight,width:e.clientWidth,scrollWidth:e.scrollWidth,overflow:getComputedStyle(e).overflowY,x:Math.round(r.x+30),y:Math.round(r.y+100)}})()`);
            check(settingsLayout.scroll>settingsLayout.height,`Inline settings not scrollable`);
            check(settingsLayout.overflow===`scroll`&&settingsLayout.scrollWidth<=settingsLayout.width+1,`Settings scrollbar is hidden or content overflows horizontally`);
            Z.focus();Z.webContents.focus();await wait(300);
            await Z.webContents.executeJavaScript(`window.inlineWheelEvents=[];document.addEventListener('wheel',e=>window.inlineWheelEvents.push({deltaY:e.deltaY,target:e.target.tagName,prevented:e.defaultPrevented}),true);document.querySelector('.CaishengPlatformShell__settings').scrollTop=100`);
            Z.webContents.sendInputEvent({type:`mouseMove`,x:settingsLayout.x,y:settingsLayout.y});await wait(100);
            Z.webContents.sendInputEvent({type:`mouseWheel`,x:settingsLayout.x,y:settingsLayout.y,deltaX:0,deltaY:-300,wheelTicksX:0,wheelTicksY:-3,canScroll:true,hasPreciseScrollingDeltas:true});await wait(400);
            const scrollTop=await Z.webContents.executeJavaScript(`document.querySelector('.CaishengPlatformShell__settings').scrollTop`);
            states.push({stage:`inline-wheel-input`,settingsLayout,scrollTop,focused:Z.isFocused(),events:await Z.webContents.executeJavaScript(`window.inlineWheelEvents`)});
            check(Math.abs(scrollTop-100)>1,`Inline settings wheel did not scroll`);
            const originalSettings={...$p()};
            for(const provider of ['openai','groq']){
                await Z.webContents.executeJavaScript(`(()=>{const label=[...document.querySelectorAll('.CaishengPlatformShell__settings label')].find(e=>e.querySelector('span')?.textContent==='语音转文字服务'),select=label.querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,${JSON.stringify(provider)});select.dispatchEvent(new Event('change',{bubbles:true}))})()`);
                await wait(300);
                check($p().voiceTranscriptionProvider===provider,`Voice provider was not saved immediately`);
                const fieldShown=await Z.webContents.executeJavaScript(`(()=>{const labels=[...document.querySelectorAll('.CaishengPlatformShell__settings label')];return labels.some(e=>e.textContent.includes(${JSON.stringify(provider==='openai'?'OpenAI 音转文 API Key':'Groq API Key')})&&e.querySelector('input[type=password]'))})()`);
                check(fieldShown,`API field missing for selected voice provider`);states.push({stage:'inline-voice-provider',provider,fieldShown});
            }
            haituoApplyTranslationConfig(originalSettings);await wait(200);
            await mouseClick('.CaishengPlatformShell__settingsButton');await wait(400);
            states.push({stage:`inline-settings-wheel`,settingsLayout,scrollTop});

            const launch=p.ipcMain._invokeHandlers.get(`caisheng:launch-signal-profile`),sync=p.ipcMain._invokeHandlers.get(`caisheng:sync-signal-profile`);
            check(typeof launch===`function`&&typeof sync===`function`,`Missing account handlers`);
            for(let account=0;account<2;account++){
                const beforeIds=new Set(Yg.keys());
                await mouseClick('.CaishengPlatformShell__add');if(account>0){await wait(120);await assertAbove(ids.at(-1),`add-menu-keeps-chat`)}await wait(500);
                deadline=Date.now()+90000;let id;
                while(!(id=[...Yg.keys()].find(id=>!beforeIds.has(id)))&&Date.now()<deadline)await wait(250);
                check(id,`Actual add-account UI did not launch Signal`);ids.push(id);
                while(!Xg.has(id)&&Date.now()<deadline)await wait(500);check(Xg.has(id),`Account did not initialize: ${id}`);
                await mouseClick(`button[data-caisheng-tab-workspace="${id}"]`);await wait(600);await assertAbove(id,`new-account-ready`);
            }
            const reordered=await Z.webContents.executeJavaScript(`(()=>{const a=document.querySelector('button[data-caisheng-tab-workspace="${ids[0]}"]'),b=document.querySelector('button[data-caisheng-tab-workspace="${ids[1]}"]'),data=new DataTransfer();a.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:data}));b.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:data}));b.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data}));return true})()`);
            await wait(500);
            const order=await Z.webContents.executeJavaScript(`JSON.parse(localStorage.getItem('caisheng.workspaces.v3')).map(item=>item.id)`);
            check(reordered&&order.indexOf(ids[0])>order.indexOf(ids[1]),`Drag drop did not persist account order`);states.push({stage:`drag-reordered`,order});
            for(const id of [ids[0],ids[1],ids[0]]){
                await mouseClick(`button[data-caisheng-tab-workspace="${id}"]`);await wait(1200);await assertAbove(id,`mouse-tab-selection`);
                const accounts=await Promise.all(ids.map(state));check(accounts.filter(x=>x.visible).length===1&&accounts.find(x=>x.id===id)?.visible,`Account selection visibility failed`);
                check(accounts.every(x=>x.dockVisible===false),`Child Signal still appears in Dock`);states.push({stage:`selected`,id,accounts});
            }
            await mouseClick('.HaituoPlatformFilters button:nth-child(2)');await wait(700);await assertAbove(ids[0],`signal-filter-keeps-chat`);
            await mouseClick('.HaituoPlatformFilters button:first-child');await wait(700);await assertAbove(ids[0],`all-filter-keeps-chat`);
            await mouseClick('.HaituoBrand');await wait(700);await assertAbove(ids[0],`header-keeps-chat`);
            await mouseClick('.CaishengPlatformShell__settingsButton');await wait(800);
            await assertAbove(ids[0],`settings-stacking`);
            const capture=(0,c.spawnSync)(`/usr/sbin/screencapture`,[`-x`,`${(0,s.dirname)(output)}/inline-settings.png`],{encoding:`utf8`});states.push({stage:`native-screen-capture`,status:capture.status,error:capture.stderr});
            check(!caishengSettingsWindow&&(await state(ids[0])).visible,`Settings hid Signal account`);
            const panelLeft=await Z.webContents.executeJavaScript(`document.querySelector('.CaishengPlatformShell__settings').getBoundingClientRect().left`);
            const chat=(await state(ids[0])).bounds,content=Z.getContentBounds();
            check(chat.x+chat.width<=content.x+panelLeft+2,`Signal covers inline settings`);
            await mouseClick('.CaishengPlatformShell__settingsButton');await wait(500);
            states.push({stage:`settings-keeps-account-visible`,chat,panelLeft});
            check(await Z.webContents.executeJavaScript(`!document.getElementById('paint-fixture')?.dataset.paintViolations`),'WhatsApp flashed while switching Signal/header/settings');
            states.push({stage:'loaded-whatsapp-no-flash',violations:await Z.webContents.executeJavaScript(`JSON.parse(document.getElementById('paint-fixture')?.dataset.paintViolations||'[]')`)});
            const foreground=(0,c.spawn)(process.env.HAITUO_WINDOW_ORDER_TOOL,[`--foreground-window`],{stdio:`ignore`});
            try{
                for(let attempt=0;attempt<3;attempt++){
                    await wait(1000);
                    const stacking=windowOrder(),externalIndex=stacking.findIndex(win=>Number(win.pid)===foreground.pid),rootIndex=stacking.findIndex(win=>win.id===Number(Z.getMediaSourceId().split(`:`)[1])),account=await state(ids[0]),childIndex=stacking.findIndex(win=>win.id===Number(account.windowId.split(`:`)[1]));
                    check(externalIndex>=0&&externalIndex<rootIndex&&externalIndex<childIndex,`Haituo covers external foreground app`);
                    states.push({stage:`external-app-foreground`,externalIndex,rootIndex,childIndex});
                }
                caishengSendChild(Yg.get(ids[0]),{type:'haituo-verify-focus'});await wait(700);
                let stacking=windowOrder(),externalIndex=stacking.findIndex(w=>Number(w.pid)===foreground.pid),rootIndex=stacking.findIndex(w=>w.id===Number(Z.getMediaSourceId().split(':')[1]));
                const account=await state(ids[0]),childIndex=stacking.findIndex(w=>w.id===Number(account.windowId.split(':')[1]));
                check(childIndex>=0&&childIndex<rootIndex&&rootIndex<externalIndex,'Activating Signal leaves parent behind external app');
                states.push({stage:'child-activation-window-group',childIndex,rootIndex,externalIndex});
                (0,c.spawnSync)(process.env.HAITUO_WINDOW_ORDER_TOOL,['--activate',String(foreground.pid)],{encoding:'utf8'});
                for(let sample=0;sample<5;sample++){await wait(150);stacking=windowOrder();externalIndex=stacking.findIndex(w=>Number(w.pid)===foreground.pid);rootIndex=stacking.findIndex(w=>w.id===Number(Z.getMediaSourceId().split(':')[1]));const ci=stacking.findIndex(w=>w.id===Number(account.windowId.split(':')[1]));check(externalIndex>=0&&externalIndex<ci&&externalIndex<rootIndex,'Delayed account ordering covers another app');}
                states.push({stage:'external-reactivation-after-child',ok:true});
            }finally{foreground.kill()}
            Z.focus();Z.moveTop();await wait(500);
            const selected=await state(ids[0]);
            const original=Z.getBounds();Z.setBounds({...original,x:original.x+35,y:original.y+25});await wait(1200);
            const moved=await state(ids[0]);check(Math.abs(moved.bounds.x-selected.bounds.x-35)<=2&&Math.abs(moved.bounds.y-selected.bounds.y-25)<=2,`Account did not follow parent movement`);states.push({stage:`moved`,bounds:moved.bounds});
            const overlay=new p.BrowserWindow({show:false,width:350,height:250,parent:Z});
            try {haituoRaiseOverlayWindow(overlay);await wait(1000);check((await state(ids[0])).visible&&!overlay.isAlwaysOnTop(),`Native overlay hid account`)} finally{overlay.destroy()}
            await wait(1000);check((await state(ids[0])).visible,`Account did not return after overlay`);
            deadline=Date.now()+90000;let page;
            do{page=(await state(ids[0])).page;if(page?.installed&&!page.loading)break;await wait(1000)}while(Date.now()<deadline);
            check(page?.installed&&!page.loading,`Signal stayed on loading screen`);states.push({stage:`signal-ready`,page});
            sync({}, {id:ids[1],x:100,y:80,width:640,height:440,keepVisible:true});deadline=Date.now()+90000;
            do{page=(await state(ids[1])).page;if(page?.installed&&!page.loading)break;await wait(1000)}while(Date.now()<deadline);
            check(page?.installed&&!page.loading,`Second Signal stayed on loading screen`);states.push({stage:`second-signal-ready`,page});
            const oldPid=Yg.get(ids[1]).pid,refresh=p.ipcMain._invokeHandlers.get(`caisheng:refresh-signal-profile`);
            const refreshed=await refresh({},ids[1]);check(refreshed?.ok,`Refresh failed`);deadline=Date.now()+90000;
            while(!Xg.has(ids[1])&&Date.now()<deadline)await wait(500);
            check(Xg.has(ids[1])&&Yg.get(ids[1]).pid!==oldPid,`Refresh did not restart account backend`);
            do{page=(await state(ids[1])).page;if(page?.installed&&!page.loading)break;await wait(1000)}while(Date.now()<deadline);
            check(page?.installed&&!page.loading,`Refreshed Signal stayed on loading screen`);states.push({stage:`refreshed-signal-ready`,page});
            (0,m.writeFileSync)(output,JSON.stringify({ok:true,states},null,2));
        } catch(error) {(0,m.writeFileSync)(output,JSON.stringify({ok:false,error:String(error?.stack||error),states,rendererErrors},null,2))}
        finally {for(const id of ids)caishengTerminateSignalChild(Yg.get(id));p.app.exit(0)}
    });
}
