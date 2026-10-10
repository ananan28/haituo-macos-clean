const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname + '/recovery-guard.js', 'utf8'), context);
function fixture() {
 let open = true, resumed = 0, warnings = 0, seq = 0, timers = new Map();
 const guard = context.haituoCreateSignalRecoveryGuard({
   isOpen:()=>open, resume:()=>resumed++, warn:()=>warnings++,
   schedule:(fn,ms)=>{assert.equal(ms,60000);timers.set(++seq,fn);return seq},
   cancel:id=>timers.delete(id)
 });
 return {guard,timers,setOpen:v=>open=v,get resumed(){return resumed},get warnings(){return warnings},
 fire(){const jobs=[...timers.values()];timers.clear();jobs.forEach(fn=>fn())}};
}
test('missing empty event resumes recovery after bounded wait',()=>{const f=fixture();f.guard.arm();assert.equal(f.resumed,0);f.fire();assert.equal(f.resumed,1);assert.equal(f.warnings,1)});
test('normal empty cancels fallback',()=>{const f=fixture();f.guard.arm();f.guard.stop();f.fire();assert.equal(f.resumed,0)});
test('disconnect cancels pending recovery',()=>{const f=fixture();f.guard.arm();f.setOpen(false);f.guard.stop();f.fire();assert.equal(f.resumed,0)});
test('socket state rechecked when timer fires',()=>{const f=fixture();f.guard.arm();f.setOpen(false);f.fire();assert.equal(f.resumed,0)});
test('duplicate open events cannot postpone recovery',()=>{const f=fixture();f.guard.arm();const id=[...f.timers.keys()][0];f.guard.arm();assert.deepEqual([...f.timers.keys()],[id]);f.fire();assert.equal(f.resumed,1)});
test('reconnection receives a fresh bounded wait',()=>{const f=fixture();f.guard.arm();f.setOpen(false);f.guard.stop();f.setOpen(true);f.guard.arm();f.fire();assert.equal(f.resumed,1)});
test('offline arm does not schedule recovery',()=>{const f=fixture();f.setOpen(false);f.guard.arm();assert.equal(f.timers.size,0)});
