'use strict';
function decode(text){return String(text||'').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c<=0x10ffff?String.fromCodePoint(c):'�'}).replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')}
async function translateGoogle(requestJSON,{text,target='zh-CN',provider='google-free',apiKey='',timeout=45000}){
 if(!['google-free','google-cloud'].includes(provider))throw Error('Google 翻译类型无效');
 if(provider==='google-cloud'&&!apiKey.trim())throw Error('请配置 Google Cloud 专用 API Key');
 const chunks=[];const chars=Array.from(String(text||''));if(!chars.length)throw Error('待翻译文字为空');
 for(let i=0;i<chars.length;i+=1000)chunks.push(chars.slice(i,i+1000).join(''));
 const output=[];
 for(const q of chunks){let value;
  if(provider==='google-cloud'){const data=await requestJSON('https://translation.googleapis.com/language/translate/v2',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':apiKey.trim()},body:JSON.stringify({q,target,format:'text'})},timeout);value=decode(data?.data?.translations?.[0]?.translatedText)}
  else {const u=new URL('https://translate.googleapis.com/translate_a/single');u.search=new URLSearchParams({client:'gtx',sl:'auto',tl:target,dt:'t',q}).toString();const data=await requestJSON(u.href,{},timeout);value=(data?.[0]||[]).map(s=>typeof s?.[0]==='string'?s[0]:'').join('')}
  if(!value?.trim())throw Error('Google 未返回译文，请重试或切换翻译服务');output.push(value);
 }
 return output.join('');
}
module.exports={translateGoogle,decode};
