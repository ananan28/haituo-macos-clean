'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const out=path.resolve('macos/verification');fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'haituo-smoke-'));
const log=fs.openSync(path.join(out,'smoke.log'),'w');
const proc=spawn(path.resolve('macos/out/海拓-darwin-arm64/海拓.app/Contents/MacOS/海拓'),['--user-data-dir='+profile,'--remote-debugging-address=127.0.0.1','--remote-debugging-port=19341'],{stdio:['ignore',log,log],detached:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));const report={states:[],errors:[]};
async function attach(target){
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});
 let n=0;const wait=new Map();
 ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){const p=wait.get(d.id);if(p){wait.delete(d.id);d.error?p.reject(Error(JSON.stringify(d.error))):p.resolve(d.result)}}else if(d.method==='Runtime.exceptionThrown')report.errors.push(d.params.exceptionDetails)});
 return {ws,call(method,params={}){return new Promise((resolve,reject)=>{const id=++n;const t=setTimeout(()=>{wait.delete(id);reject(Error('CDP timeout '+method))},10000);wait.set(id,{resolve:v=>{clearTimeout(t);resolve(v)},reject:e=>{clearTimeout(t);reject(e)}});ws.send(JSON.stringify({id,method,params}))})}};
}
const snapshot="(()=>({ready:document.readyState,url:location.href,shell:!!document.querySelector('.CaishengPlatformShell'),settings:!!document.querySelector('.CaishengPlatformShell__settings'),loading:!!document.querySelector('.app-loading-screen'),installed:!!document.querySelector('[class*=InstallScreen],.inbox'),text:document.body?.innerText?.slice(0,2000),buttons:[...document.querySelectorAll('button')].slice(0,25).map(e=>({text:e.innerText,cls:e.className}))}))()";
let c;
(async()=>{try{
 const end=Date.now()+80000;let targets;
 while(Date.now()<end){try{targets=await (await fetch('http://127.0.0.1:19341/json/list')).json();const t=targets.find(t=>t.type==='page'&&!t.url.startsWith('devtools:'));if(t){c=await attach(t);break}}catch{}await delay(500)}
 if(!c)throw Error('No debuggable application page');
 await c.call('Runtime.enable');
 await new Promise((resolve,reject)=>require('node:child_process').execFile('/usr/bin/open',['-a',path.resolve('macos/out/海拓-darwin-arm64/海拓.app')],{timeout:10000},e=>e?reject(e):resolve()));
 await c.call('Page.bringToFront');
 let state;
 while(Date.now()<end){const r=await c.call('Runtime.evaluate',{expression:snapshot,returnByValue:true});state=r.result?.value;report.states.push({at:Date.now(),...state});if(state?.shell&&!state.loading)break;await delay(2000)}
 const shot=await c.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'smoke.png'),Buffer.from(shot.data,'base64'));
 if(!state?.shell)throw Error('Application shell absent after startup deadline');
 if(state.loading)throw Error('Application still shows Signal loading screen');
 const opened=await c.call('Runtime.evaluate',{expression:"(()=>{const b=document.querySelector('.CaishengPlatformShell__settingsButton');if(!b)return false;b.click();return true})()",returnByValue:true});
 await delay(750);
 const s=await c.call('Runtime.evaluate',{expression:snapshot,returnByValue:true});report.settings=s.result?.value;
 if(!opened.result?.value||!report.settings?.settings)throw Error('Settings failed to open');
 report.ok=true;
 }catch(e){report.ok=false;report.error=String(e.stack||e)}
 finally{fs.writeFileSync(path.join(out,'smoke-audit.json'),JSON.stringify(report,null,2));console.log('SMOKE_REPORT',JSON.stringify(report));c?.ws.close();try{process.kill(-proc.pid,'SIGTERM')}catch{}fs.closeSync(log);
 if(!report.ok){console.log(fs.readFileSync(path.join(out,'smoke.log'),'utf8').slice(-22000));process.exitCode=1}
 setTimeout(()=>{try{process.kill(-proc.pid,'SIGKILL')}catch{}},3000).unref();
 }})();
