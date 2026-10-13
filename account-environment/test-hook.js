if (process.env.HAITUO_ENVIRONMENT_TEST === '1' && $u === 'signal-main') {
    p.app.whenReady().then(async () => {
        const wins=[];
        try {
            const snapshots=[];
            for(const seed of ['ab'.repeat(32),'cd'.repeat(32),'ab'.repeat(32)]) {
                const sess=p.session.fromPartition(`haituo-test-${snapshots.length}`);
                sess.protocol.handle('https',()=>new Response('<!doctype html><html><body>fixture</body></html>',{headers:{'content-type':'text/html'}}));
                const win=new p.BrowserWindow({show:false,webPreferences:{session:sess,sandbox:true,contextIsolation:true,preload:(0,s.join)($,'js','haituo-canvas-only.js'),additionalArguments:[`--haituo-canvas-profile=${seed}`]}});
                wins.push(win);
                await win.loadURL('https://web.whatsapp.com/');
                const probe=`(()=>{const c=document.createElement('canvas');c.width=200;c.height=60;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,200,60);ctx.fillStyle='#000000';ctx.fillText('Haituo profile fixture',10,20);const first=Array.from(ctx.getImageData(0,0,200,60).data.slice(0,128));const second=Array.from(ctx.getImageData(0,0,200,60).data.slice(0,128));const a=c.toDataURL(),b=c.toDataURL();const plain=document.createElement('canvas');plain.width=2;plain.height=2;const px=plain.getContext('2d');px.fillStyle='rgb(20,40,60)';px.fillRect(0,0,2,2);return {first,second,a,b,plain:Array.from(px.getImageData(0,0,1,1).data)}})()`;
                const before=await win.webContents.executeJavaScript(probe);
                await win.loadURL('https://web.whatsapp.com/');
                const after=await win.webContents.executeJavaScript(probe);
                if(JSON.stringify(before)!==JSON.stringify(after))throw Error('profile changed on reload');
                if(JSON.stringify(before.first)!==JSON.stringify(before.second)||before.a!==before.b)throw Error('readback changed on repeat');
                if(JSON.stringify(before.plain)!=='[20,40,60,255]')throw Error('non-text image was changed');
                snapshots.push(before);
            }
            if(snapshots[0].a===snapshots[1].a)throw Error('different profiles returned identical Canvas');
            if(snapshots[0].a!==snapshots[2].a)throw Error('same profile changed across window recreation');
            (0,m.writeFileSync)(process.env.HAITUO_ENVIRONMENT_REPORT,JSON.stringify({ok:true,checks:['different-accounts','stable-reload','stable-recreation','repeat-readback','plain-media-preserved']}));
        } catch(error) {
            (0,m.writeFileSync)(process.env.HAITUO_ENVIRONMENT_REPORT,JSON.stringify({ok:false,error:String(error)}));
            p.app.exit(1);return;
        } finally {wins.forEach(win=>{if(!win.isDestroyed())win.destroy()})}
        p.app.exit(0);
    });
}
