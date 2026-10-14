if(process.env.HAITUO_SCROLL_TEST==='1' && $u==='signal-main') {
    require('electron').app.whenReady().then(async()=>{
        const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path');
        let win;
        try {
            const fixture=path.join(app.getPath('userData'),'haituo-scroll-fixture.html');
            fs.writeFileSync(fixture,'<!doctype html><html><body><div id="sidebar" style="height:80px;overflow:auto;width:100px"><div style="height:600px">sidebar</div></div><div id="chat" style="height:240px;overflow:auto;width:320px"></div></body></html>');
            win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true}});
            await win.loadFile(fixture);
            const helper=fs.readFileSync(path.join(__dirname,'../js/haituo-scroll.js'),'utf8');
            const result=await win.webContents.executeJavaScript(helper+`\n(async()=>{
                const root=document.getElementById('chat'),sidebar=document.getElementById('sidebar'),checks=[];
                const assert=(ok,message)=>{if(!ok)throw Error(message)};
                const reset=()=>{root.innerHTML='';for(let i=0;i<30;i++){const row=document.createElement('div');row.className='module-message';row.id='row-'+i;row.style.height='48px';row.textContent='message '+i;root.append(row)}root.scrollTop=0;sidebar.scrollTop=35};
                reset();root.scrollTop=510;const anchor=document.getElementById('row-10'),before=anchor.getBoundingClientRect().top;
                haituoKeepTranslationPosition(document.getElementById('row-0'),()=>{for(let i=0;i<10;i++)document.getElementById('row-'+i).style.height='85px'});
                assert(Math.abs(anchor.getBoundingClientRect().top-before)<1,'history reading position moved');await new Promise(requestAnimationFrame);assert(Math.abs(anchor.getBoundingClientRect().top-before)<1,'history anchor moved on paint');checks.push('history-anchor');
                assert(sidebar.scrollTop===35,'unrelated sidebar scrolled');checks.push('scoped-container');
                reset();root.scrollTop=root.scrollHeight-root.clientHeight;
                haituoKeepTranslationPosition(document.getElementById('row-0'),()=>{for(const row of root.children)row.style.height='90px'});
                assert(Math.abs(root.scrollHeight-root.clientHeight-root.scrollTop)<1,'bottom position moved');await new Promise(requestAnimationFrame);assert(Math.abs(root.scrollHeight-root.clientHeight-root.scrollTop)<1,'bottom moved on paint');checks.push('bottom-pin');
                reset();root.scrollTop=600;const fixed=document.getElementById('row-12'),fixedTop=fixed.getBoundingClientRect().top;const updates=[];
                for(let frame=0;frame<8;frame++){
                    const row=document.elementFromPoint(root.getBoundingClientRect().left+20,root.getBoundingClientRect().top+20)?.closest('.module-message');
                    assert(row,'missing anchor');const top=row.getBoundingClientRect().top;
                    haituoKeepTranslationPosition(root.firstChild,()=>root.children[frame].style.height='100px');
                    updates.push(Math.abs(row.getBoundingClientRect().top-top));
                    await new Promise(requestAnimationFrame);assert(Math.abs(fixed.getBoundingClientRect().top-fixedTop)<1,'cache restoration jittered between paints');
                }
                assert(updates.every(delta=>delta<1),'successive frames jittered');checks.push('successive-cache-batches');
                // After manual scrolling, take a fresh anchor rather than restoring an old snapshot.
                root.scrollTop=300;const manual=document.getElementById('row-3'),manualTop=manual.getBoundingClientRect().top;
                haituoKeepTranslationPosition(root.firstChild,()=>root.firstChild.style.height='140px');
                assert(Math.abs(manual.getBoundingClientRect().top-manualTop)<1,'manual reading position overridden');checks.push('manual-scroll-respected');
                assert(!root.style.getPropertyValue('overflow-anchor')&&!root.style.getPropertyValue('scroll-behavior'),'temporary styles leaked');checks.push('styles-restored');
                reset();root.scrollTop=400;
                let commits=0;haituoSignalReactDOM={flushSync:callback=>{commits++;callback()}};
                const ref={current:root.firstChild},batchAnchor=document.getElementById('row-8'),batchTop=batchAnchor.getBoundingClientRect().top;
                haituoQueueSignalTranslation(ref,()=>root.firstChild.style.height='90px');
                haituoQueueSignalTranslation(ref,()=>root.firstChild.style.height='110px');
                haituoQueueSignalTranslation({current:root.children[1]},()=>root.children[1].style.height='110px');
                await new Promise(requestAnimationFrame);
                assert(commits===1,'cache results were not batched');assert(Math.abs(batchAnchor.getBoundingClientRect().top-batchTop)<1,'batched React results moved anchor');checks.push('signal-frame-batch');
                let stale=false;haituoQueueSignalTranslation({current:null},()=>stale=true);await new Promise(requestAnimationFrame);assert(!stale,'unmounted conversation updated');checks.push('unmounted-chat-skipped');
                window.x_=()=>({autoTranslateIncoming:true,chatTranslationProvider:'fixture',openAIModel:'model',compatibleEndpoint:'endpoint'});
                window.HaituoIncomingTarget=()=> 'zh-CN';window.HaituoFormatMessageParagraphs=(source,result)=>result;
                window.C_=new Map([['chat\\0fixture\\0model\\0endpoint\\0zh-CN\\0hello','cached translation']]);
                assert(haituoCachedSignalTranslation('hello')==='cached translation','warm cache was not synchronous');checks.push('signal-warm-cache');
                return {ok:true,checks};
            })()`);
            fs.writeFileSync(process.env.HAITUO_SCROLL_REPORT,JSON.stringify(result));
            win.destroy();app.exit(0);
        } catch(error) {
            fs.writeFileSync(process.env.HAITUO_SCROLL_REPORT,JSON.stringify({ok:false,error:String(error)}));
            win?.destroy();app.exit(1);
        }
    });
}
