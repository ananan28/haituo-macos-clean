const {test}=require('node:test'),assert=require('node:assert/strict');
const {cropRect,parseResult,endpoint}=require('../src/app/js/haituo-screenshot');
const {retryTranslation}=require('../src/app/js/haituo-network');
test('Retina region uses pixel scaling, bounds and rejects invalid input',()=>{assert.deepEqual(cropRect({x:10,y:20,width:100,height:40},{width:800,height:600},{width:1600,height:1200}),{x:20,y:40,width:200,height:80});assert.throws(()=>cropRect({x:NaN,y:0,width:20,height:20},{width:800,height:600},{width:1600,height:1200}));assert.throws(()=>cropRect({x:1,y:1,width:1,height:1},{width:800,height:600},{width:1600,height:1200}));});
test('image result rejects incomplete output and preserves numbers and line breaks',()=>{const result={original:'A 123\nB',translation:'甲 123\n乙'};assert.deepEqual(parseResult({choices:[{message:{content:JSON.stringify(result)}}]}),result);assert.throws(()=>parseResult({choices:[{finish_reason:'length',message:{content:'{}'}}]}),/未完成/);assert.throws(()=>parseResult({choices:[{message:{content:'{"original":"text"}'}}]}),/完整/);});
test('image endpoint accepts full completion URL without duplicating path',()=>{assert.equal(endpoint('https://api.example.test/v1/chat/completions/'),'https://api.example.test/v1/chat/completions');assert.throws(()=>endpoint('file:///a'));});
test('translation succeeds on sixth attempt with five retries, no send operation',async()=>{let calls=0;const progress=[];assert.equal(await retryTranslation(()=>{if(++calls<6)throw Error('timeout');return '译文'},async()=>{},n=>progress.push(n)),'译文');assert.equal(calls,6);assert.deepEqual(progress,[1,2,3,4,5]);});
test('retries stop after five and permanent authentication errors fail immediately',async()=>{let calls=0;await assert.rejects(retryTranslation(()=>{calls++;throw Error('timeout')},async()=>{}),/重试 5 次/);assert.equal(calls,6);calls=0;await assert.rejects(retryTranslation(()=>{calls++;const e=Error('HTTP 401');e.status=401;throw e},async()=>{}));assert.equal(calls,1);});
const fs=require('node:fs'),vm=require('node:vm');
const main=fs.readFileSync(__dirname+'/../src/app/bundles/main.js','utf8');
function routingContext(cached){const ctx={haituoExistingChatTranslation:()=>null,haituoRememberChatTranslation(){},HaituoNetwork:{translationTimeout:()=>100},cachedHaituoTranslate:cached,setTimeout:resolve=>{resolve();return 1}};vm.createContext(ctx);let a=main.indexOf('function haituoOpenAIProfiles('),b=main.indexOf('\nfunction haituoPumpRequests',a);vm.runInContext(main.slice(a,b),ctx);a=main.indexOf('async function haituoTranslateWithMode(');b=main.indexOf('\nasync function cachedHaituoTranslate',a);vm.runInContext(main.slice(a,b),ctx);return ctx;}
test('OpenAI fails twice then switches to arbitrary compatible model with its own credentials',async()=>{const calls=[],ctx=routingContext(async req=>{calls.push({key:req.apiKey,url:req.endpoint,model:req.model});if(req.apiKey==='first')throw Error('timeout');return{text:'译文'}});const result=await ctx.haituoTranslateWithMode({apiKey:'first',endpoint:'https://first.test/v1',model:'first-model',openaiApiProfiles:[{apiKey:'second',endpoint:'https://second.test/v1',model:'custom-any-model'}]},{provider:'openai',purpose:'input',text:'hello',strictProvider:true});assert.equal(result.text,'译文');assert.deepEqual(calls.map(c=>c.key),['first','first','second']);assert.equal(calls[2].model,'custom-any-model');assert.equal(calls[2].url,'https://second.test/v1');});
test('DeepSeek uses independent API config without borrowing OpenAI model',async()=>{let actual;const ctx=routingContext(async req=>{actual=req;return{text:'译文'}});await ctx.haituoTranslateWithMode({apiKey:'openai-key',endpoint:'https://openai.test',model:'openai-model',deepseekApiKey:'deepseek-key',deepseekModel:'custom-deepseek'},{provider:'deepseek',purpose:'chat',text:'hi',strictProvider:true});assert.equal(actual.apiKey,'deepseek-key');assert.equal(actual.endpoint,'https://api.deepseek.com/v1');assert.equal(actual.model,'custom-deepseek');});
test('both real settings interfaces expose shared screenshot and backup controls',async()=>{
 const renderer=fs.readFileSync(__dirname+'/../src/app/bundles/preload/main.js','utf8');
 const a=renderer.indexOf('    function haituoShortcutRecorder('),b=renderer.indexOf('    function haituoProviderOptionLabel(',a);
 const updates=[],ctx={document:{activeElement:null},window:{SignalContext:{OS:{platform:'win32'},caishengShortcutRecording:async()=>{},caishengSetTranslationConfig:async delta=>updates.push(delta)}},alert:()=>{}};vm.createContext(ctx);vm.runInContext(renderer.slice(a,b),ctx);
 const F={jsx:(tag,props,key)=>({tag,...props,key}),jsxs:(tag,props,key)=>({tag,...props,key})};
 const tree=ctx.haituoAdvancedSettingsControls(F,{openaiApiProfiles:[{apiKey:'fixture',endpoint:'https://fixture.test',model:'vision',vision:true}]});
 const nodes=[];function walk(n){if(!n||typeof n!=='object')return;nodes.push(n);for(const c of [].concat(n.children||[]))walk(c)}walk(tree);
 for(const field of ['screenshotShortcut','screenshotEndpoint','screenshotApiKey','screenshotModel','deepseekApiKey','deepseekModel','backup-0-model'])assert.ok(nodes.some(n=>n['data-haituo-setting']===field),field);
 assert.match(renderer,/haituoAdvancedSettingsControls\(u6,a\)/);assert.match(renderer,/haituoAdvancedSettingsControls\(O9,m\)/);
 const field=nodes.find(n=>n['data-haituo-setting']==='screenshotShortcut'),el={dataset:{},isConnected:true,value:'',blur(){}};ctx.document.activeElement=el;await field.onFocus({currentTarget:el});await field.onKeyDown({currentTarget:el,key:'t',ctrlKey:true,altKey:true,preventDefault(){},stopPropagation(){}});assert.equal(updates[0].screenshotShortcut,'Control+Alt+T');assert.equal(field.readOnly,true);assert.ok(nodes.some(n=>n['data-haituo-api-drawer']==='true'));assert.ok(nodes.some(n=>n['aria-label']==='备用服务商'));
});
test('screenshot UI uses a separate session from Signal protocol interception',()=>{const source=fs.readFileSync(__dirname+'/../src/app/js/haituo-screenshot.js','utf8');assert.match(source,/partition:'haituo-screenshot-ui'/);assert.match(main,/actual-screenshot-ui-session/);});

test('screenshot reuses configured vision routes and rejects text-only dedicated DeepSeek model',()=>{const {profilesForConfig}=require('../src/app/js/haituo-screenshot');assert.equal(profilesForConfig({apiKey:'configured'} )[0].model,'gpt-4.1-mini');assert.equal(profilesForConfig({deepseekApiKey:'configured'})[0].model,'deepseek-flash');assert.equal(profilesForConfig({deepseekApiKey:'configured',deepseekModel:'deepseek-v4-pro'}).length,0);assert.equal(profilesForConfig({}).length,0);});

test('Google official uses independent key in header, text body and entity decoding',async()=>{
 const {translateGoogle}=require('../src/app/js/haituo-google');let call;
 const result=await translateGoogle(async(...args)=>{call=args;return {data:{translations:[{translatedText:'你好 &amp; &#x31;'}]}}},{text:'Hello & 1',provider:'google-cloud',apiKey:'google-only'});
 assert.equal(result,'你好 & 1');assert.equal(call[0],'https://translation.googleapis.com/language/translate/v2');assert.equal(call[1].headers['X-Goog-Api-Key'],'google-only');assert.deepEqual(JSON.parse(call[1].body),{q:'Hello & 1',target:'zh-CN',format:'text'});
 await assert.rejects(translateGoogle(()=>{throw Error('must not call')},{text:'x',provider:'google-cloud'}),/专用/);
});
test('Google free needs no key, joins segments and chunks without breaking surrogate pairs',async()=>{
 const {translateGoogle}=require('../src/app/js/haituo-google');const calls=[];
 const output=await translateGoogle(async(url,init)=>{calls.push(new URL(url));assert.deepEqual(init,{});return [[['译',null],['文',null]]]},{text:'😀'.repeat(1001),provider:'google-free'});
 assert.equal(output,'译文译文');assert.equal(calls.length,2);assert.equal([...calls[0].searchParams.get('q')].length,1000);assert.equal(calls[1].searchParams.get('q'),'😀');assert.ok(!calls[0].searchParams.has('key'));
});
test('screenshot default renders both languages in the existing selection',()=>{
 const html=fs.readFileSync(__dirname+'/../src/app/js/haituo-screenshot.html','utf8');const script=html.match(/<script>([\s\S]*)<\/script>/)[1];new vm.Script(script);
 assert.match(script,/function render\(mode='compare'\)/);assert.match(script,/\['原文',result.original\],\['译文',result.translation\]/);
 assert.doesNotMatch(fs.readFileSync(__dirname+'/../src/app/js/haituo-screenshot.js','utf8'),/function showResult|resultWindow/);
});

test('Google Cloud cannot borrow an unrelated AI key',()=>{assert.match(main,/apiKey:e.googleCloudApiKey\|\|''/);const source=fs.readFileSync(__dirname+'/../src/app/js/haituo-screenshot.js','utf8');assert.doesNotMatch(source,/googleCloudApiKey\|\|cfg.apiKey/);assert.match(source,/安装包内系统 OCR 自检失败/)});
