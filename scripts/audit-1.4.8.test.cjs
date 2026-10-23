'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/app/bundles/main.js'),'utf8');
function keyHarness(){
 const fixture=fs.readFileSync(path.join(__dirname,'key-recovery.test.cjs'),'utf8');
 const sandbox={Buffer,console,__dirname,require:name=>name==='node:test'?{test:()=>{}}:require(name)};
 vm.createContext(sandbox);vm.runInContext(fixture,sandbox);return sandbox;
}
test('Windows retains recovery key across repeated system decryption failures',()=>{
 const h=keyHarness(),storage=h.goodStorage();
 storage.decryptString=()=>{throw Error('simulated system decryption failure')};
 const key='a'.repeat(64),config=new Map([['key',key],['encryptedKey','deadbeef']]);
 const app=h.makeContext({platform:'win32',config,safeStorage:storage});
 assert.equal(app.Iv(),key,'first fallback must succeed');
 assert.equal(config.get('key'),key,'fallback must not delete the only usable recovery key');
 assert.equal(app.Iv(),key,'second fallback must still succeed');
});
test('Windows settings writer handles encryption failure without losing the save',()=>{
 let written;
 const start=source.indexOf('function haituoProtectedWrite('),end=source.indexOf('\nlet HaituoTranslationCache',start);
 assert.ok(start>=0&&end>start);
 const ctx={process:{platform:'win32',pid:1},p:{safeStorage:{isEncryptionAvailable:()=>true,encryptString:()=>{throw Error('simulated encryption failure')}}},m:{mkdirSync(){},writeFileSync(file,data){written=data},renameSync(){}},s:{dirname:()=>'.'}};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 assert.doesNotThrow(()=>ctx.haituoProtectedWrite('fixture.json',{example:'fixture'}),'declared fallback must handle thrown encryption errors too');
 assert.ok(written,'settings must be persisted');
});
