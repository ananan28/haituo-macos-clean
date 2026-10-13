const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/captcha-router.js','utf8'),ctx);
const pick=(ids,alive=[])=>ctx.haituoPickCaptchaAccount(new Map(ids.map(id=>[id,1])),'signal-main',id=>alive.includes(id));
test('routes a single child instead of main account',()=>assert.equal(pick(['signal-a'],['signal-a']),'signal-a'));
test('routes main challenge only to main',()=>assert.equal(pick(['signal-main']),'signal-main'));
test('never guesses between concurrent challenges',()=>assert.equal(pick(['signal-a','signal-b'],['signal-a','signal-b']),null));
test('closed child is excluded',()=>assert.equal(pick(['signal-a','signal-b'],['signal-b']),'signal-b'));
test('unmatched callback is rejected',()=>assert.equal(pick([]),null));
