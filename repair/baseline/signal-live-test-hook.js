function haituoLiveSignalInfo() {
 return Z.webContents.executeJavaScript(`(()=>{const area=document.querySelector('.CaishengPlatformShell__signal')||document;return {qr:!!area.querySelector('[class*=__qr-code--loaded] svg[role=img]'),inbox:!!area.querySelector('.inbox'),loading:!!area.querySelector('.app-loading-screen'),failure:area.querySelector('[class*=__qr-code--load-failed]')?.textContent?.trim()||null,theme:document.body?.classList.contains('dark-theme')?'dark':document.body?.classList.contains('light-theme')?'light':null}})()`);
}
if(process.env.HAITUO_SIGNAL_LIVE_TEST==='1'&&$u!=='signal-main')process.on('message',async value=>{
 if(value?.type!=='haituo-live-signal-snapshot'||!Z||Z.isDestroyed())return;
 try{const state=await haituoLiveSignalInfo();const image=state.qr?(await Z.webContents.capturePage()).toPNG().toString('base64'):null;process.send?.({type:'haituo-live-signal-result',requestId:value.requestId,state,image});}catch(error){process.send?.({type:'haituo-live-signal-result',requestId:value.requestId,state:{failure:String(error)}});}
});
async function haituoSignalLiveTest() {
 if(process.platform!=='darwin'||$u!=='signal-main'||process.env.HAITUO_SIGNAL_LIVE_TEST!=='1')return;
 const dir=process.env.HAITUO_SIGNAL_LIVE_DIR,delay=ms=>new Promise(r=>setTimeout(r,ms));
 (0,m.mkdirSync)(dir,{recursive:true});
 let running=false,childId;
 const childSnapshot=()=>new Promise((resolve,reject)=>{
  const child=Yg.get(childId),requestId=String(Date.now());
  const timer=setTimeout(()=>{child?.removeListener('message',listen);reject(Error('Child snapshot timed out'));},10000);
  function listen(value){if(value?.type!=='haituo-live-signal-result'||value.requestId!==requestId)return;clearTimeout(timer);child.removeListener('message',listen);resolve(value);}
  child.on('message',listen);caishengSendChild(child,{type:'haituo-live-signal-snapshot',requestId});
 });
 const select=async id=>{await Z.webContents.executeJavaScript(`document.querySelector('button[data-caisheng-tab-workspace="${id}"]').click()`);await delay(700);};
 const poll=async()=>{
  if(running||!Z||Z.isDestroyed())return;
  running=true;
  try{
   await select('signal-main');const main=await haituoLiveSignalInfo();
   if(main.qr){const image=await Z.webContents.capturePage();(0,m.writeFileSync)((0,s.join)(dir,'signal-main-qr.png'),image.toPNG());}
   let child={loading:true};
   if(childId&&Xg.has(childId)){await select(childId);const value=await childSnapshot();child=value.state;if(value.image)(0,m.writeFileSync)((0,s.join)(dir,'signal-child-qr.png'),Buffer.from(value.image,'base64'));}
   (0,m.writeFileSync)((0,s.join)(dir,'status.json'),JSON.stringify({at:new Date().toISOString(),childId,main,child,inbox:!!main.inbox&&!!child.inbox}));
  }catch(error){console.error('Signal test capture failed',String(error));}finally{running=false;}
 };
 try{
  const deadline=Date.now()+90000;
  while(!await Z.webContents.executeJavaScript(`!!document.querySelector('.CaishengPlatformShell__add')`)&&Date.now()<deadline)await delay(200);
  const previous=new Set(Yg.keys());
  await Z.webContents.executeJavaScript(`document.querySelector('.CaishengPlatformShell__add').click()`);await delay(300);
  await Z.webContents.executeJavaScript(`[...document.querySelectorAll('.CaishengPlatformShell__picker button')].find(button=>button.textContent.includes('Signal')).click()`);
  while(![...Yg.keys()].some(id=>!previous.has(id))&&Date.now()<deadline)await delay(200);
  childId=[...Yg.keys()].find(id=>!previous.has(id));
  if(!childId)throw Error('Test child account was not created');
  while(!Xg.has(childId)&&Date.now()<deadline)await delay(200);
  await poll();setInterval(poll,10000);
 }catch(error){console.error('Signal test initialization failed',String(error));}
 setTimeout(()=>p.app.quit(),20*60*1000);
}
