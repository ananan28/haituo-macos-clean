const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/captcha-router.js','utf8'),ctx);
const pick=(ids,alive=[])=>ctx.haituoPickCaptchaAccount(new Map(ids.map(id=>[id,1])),'signal-main',id=>alive.includes(id));
test('routes a single child instead of main account',()=>assert.equal(pick(['signal-a'],['signal-a']),'signal-a'));
test('routes main challenge only to main',()=>assert.equal(pick(['signal-main']),'signal-main'));
test('never guesses between concurrent challenges',()=>assert.equal(pick(['signal-a','signal-b'],['signal-a','signal-b']),null));
test('closed child is excluded',()=>assert.equal(pick(['signal-a','signal-b'],['signal-b']),'signal-b'));
test('unmatched callback is rejected',()=>assert.equal(pick([]),null));
function routing(ids, children) {
 const sent=[],main=[],warnings=[],ctx={
  $u:'signal-main',Z:{},X:{warn:s=>warnings.push(s)},
  p_:{handleCaptcha:token=>main.push(token)},
  p:{dialog:{showMessageBox:()=>warnings.push('visible')}},
  Yg:new Map(children.map(id=>[id,{connected:true,send:payload=>sent.push({id,payload})}]))
 };
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/captcha-router.js','utf8'),ctx);
 for(const id of ids)vm.runInContext('haituoPendingCaptchaAccounts.set('+JSON.stringify(id)+',1)',ctx);
 ctx.haituoRouteCaptchaToAccount('fixture-manual-token');
 return {sent,main,warnings,pending:vm.runInContext('haituoPendingCaptchaAccounts.size',ctx)};
}
test('callback is forwarded only to waiting child handler',()=>{const r=routing(['signal-a'],['signal-a','signal-b']);assert.equal(r.sent.length,1);assert.equal(r.sent[0].id,'signal-a');assert.equal(r.sent[0].payload.type,'haituo-captcha-response');assert.equal(r.sent[0].payload.token,'fixture-manual-token');assert.equal(r.main.length,0);assert.equal(r.pending,0)});
test('main callback never goes to child',()=>{const r=routing(['signal-main'],['signal-a']);assert.equal(r.sent.length,0);assert.deepEqual(r.main,['fixture-manual-token'])});
test('ambiguous callback shows warning without forwarding token',()=>{const r=routing(['signal-a','signal-b'],['signal-a','signal-b']);assert.equal(r.sent.length,0);assert.equal(r.main.length,0);assert.equal(r.pending,2);assert.ok(r.warnings.includes('visible'))});
