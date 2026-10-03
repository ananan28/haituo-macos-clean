async function haituoTestAccountWindows() {
    if (process.platform !== `darwin` || $u !== `signal-main` || process.env.HAITUO_WINDOW_TEST !== `1`) return;
    const output = process.env.HAITUO_WINDOW_TEST_RESULT;
    if (process.argv.includes(`--haituo-verify-main-refresh`)) {
        await haituoTestMainRefreshResult(output);
        return;
    }
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const launch = p.ipcMain._invokeHandlers.get(`caisheng:launch-signal-profile`);
    const sync = p.ipcMain._invokeHandlers.get(`caisheng:sync-signal-profile`);
    const states = [], ids = [];
    const resources = () => {
        const rows=(0,c.execFileSync)(`ps`,[`-axo`,`pid=,ppid=,rss=`],{encoding:`utf8`}).trim().split(`\n`).map(line=>line.trim().split(/\s+/).map(Number));
        const family=new Set([process.pid]);let changed=true;
        while(changed){changed=false;for(const [pid,parent] of rows)if(family.has(parent)&&!family.has(pid)){family.add(pid);changed=true;}}
        return {accounts:Yg.size,processes:family.size,rssMiB:Math.round(rows.filter(([pid])=>family.has(pid)).reduce((sum,row)=>sum+row[2],0)/1024)};
    };
    const check = (condition, message) => { if (!condition) throw Error(message); };
    const state = id => new Promise((resolve, reject) => {
        const child = Yg.get(id), requestId = `${id}-${Date.now()}`;
        const timer = setTimeout(() => { child.removeListener(`message`, listen); reject(Error(`No window state from ${id}`)); }, 10000);
        function listen(value) {
            if (value?.type !== `haituo-test-window-result` || value.requestId !== requestId) return;
            clearTimeout(timer); child.removeListener(`message`, listen); resolve({ id, ...value });
        }
        child.on(`message`, listen);
        caishengSendChild(child, { type: `haituo-test-window-state`, requestId });
    });
    const page = id => new Promise((resolve,reject)=>{
        const child=Yg.get(id),requestId=`page-${id}-${Date.now()}`;
        const timer=setTimeout(()=>{child.removeListener(`message`,listen);reject(Error(`Page state timed out`));},10000);
        function listen(value){if(value?.type!==`haituo-test-page-result`||value.requestId!==requestId)return;clearTimeout(timer);child.removeListener(`message`,listen);resolve(value.page);}
        child.on(`message`,listen);caishengSendChild(child,{type:`haituo-test-page-state`,requestId});
    });
    try {
        check(typeof launch === `function` && typeof sync === `function`, `Account handlers unavailable`);
        const shellDeadline = Date.now() + 60000;
        while (!await Z.webContents.executeJavaScript(`!!document.querySelector('.CaishengPlatformShell__add')`) && Date.now()<shellDeadline) await delay(200);

        for (let account=0;account<40;account++) {
            const beforeIds = new Set(Yg.keys());
            await Z.webContents.executeJavaScript(`document.querySelector('.CaishengPlatformShell__add').click()`);
            await delay(500);
            if (ids.length) check((await Promise.all(ids.map(state))).every(value=>!value.visible),`Account covered the actual add-account picker`);
            await Z.webContents.executeJavaScript(`[...document.querySelectorAll('.CaishengPlatformShell__picker button')].find(button=>button.textContent.includes('Signal')).click()`);
            const deadline = Date.now() + 60000;
            while (![...Yg.keys()].some(id=>!beforeIds.has(id)) && Date.now()<deadline) await delay(200);
            const id = [...Yg.keys()].find(id=>!beforeIds.has(id));
            check(id, `Add-account button did not launch an account`);
            ids.push(id);
            while (!Xg.has(id) && Date.now() < deadline) await delay(200);
            check(Xg.has(id), `Account did not become ready: ${id}`);
            await delay(500);
            const before = await state(id); states.push({ stage: `ui-account-added`, ...before });
            check(before.visible, `Added account did not become visible: ${id}`);
        }

        states.push({stage:`forty-account-resources`,...resources()});
        const bar=await Z.webContents.executeJavaScript(`(()=>{const bar=document.querySelector('.CaishengPlatformShell__tabs');return {height:bar.getBoundingClientRect().height,width:bar.clientWidth,scrollWidth:bar.scrollWidth,clientHeight:bar.clientHeight,scrollHeight:bar.scrollHeight}})()`);
        check(bar.height>44 && bar.height<=161,`Account rows did not grow within the chat layout`);
        check(bar.scrollWidth<=bar.width+1 && bar.scrollHeight>bar.clientHeight,`Account tabs did not scroll vertically`);
        states.push({stage:`account-tab-layout`,...bar});
        for (const id of [ids[0], ids[9], ids[19], ids[29], ids[39], ids[0]]) {
            await Z.webContents.executeJavaScript(`(()=>{const tab=document.querySelector('button[data-caisheng-tab-workspace="${id}"]');tab.scrollIntoView({block:'nearest',inline:'nearest'});tab.click()})()`);
            await delay(1500);
            const current = await Promise.all(ids.map(state));
            states.push({ stage: `selected`, selectedId: id, accounts: current });
            check(current.filter(value => value.visible).length === 1, `Expected only one visible account`);
            check(current.find(value => value.id === id)?.visible, `Selected account was hidden`);
        }
        const oldPid = Yg.get(ids[0]).pid;
        await Z.webContents.executeJavaScript(`document.querySelector('.CaishengPlatformShell__refresh').click()`);
        const refreshDeadline=Date.now()+60000;
        while ((!Xg.has(ids[0]) || Yg.get(ids[0])?.pid===oldPid) && Date.now()<refreshDeadline) await delay(200);
        check(Xg.has(ids[0]), `Refreshed account did not become ready`);
        check(Yg.get(ids[0]).pid !== oldPid, `Refresh did not restart the account backend`);
        await delay(1500);
        check((await state(ids[0])).visible, `Refreshed account did not reappear`);
        let refreshedPage=await page(ids[0]);
        while((refreshedPage.loading||!refreshedPage.installed)&&Date.now()<refreshDeadline){await delay(500);refreshedPage=await page(ids[0]);}
        check(!refreshedPage.loading&&refreshedPage.installed,`Refreshed account is still on the loading splash: ${JSON.stringify(refreshedPage)}`);
        states.push({stage:`account-refreshed`,...(await state(ids[0])),page:refreshedPage});
        await Z.webContents.executeJavaScript(`document.querySelector('.CaishengPlatformShell__settingsButton').click()`);
        await delay(500);
        for (const nativeTheme of [`dark`,`light`,`dark`]) {
            await Z.webContents.executeJavaScript(`(()=>{const label=[...document.querySelectorAll('.CaishengPlatformShell__settings label')].find(label=>label.textContent.includes('原生深色'));const input=label?.querySelector('input');if(!input)throw Error('Native appearance checkbox missing');if(input.checked!==${nativeTheme!==`light`})input.click()})()`);
            await delay(1000);
            const appearance=await Z.webContents.executeJavaScript(`({mode:document.documentElement.dataset.haituoNativeTheme,bg:getComputedStyle(document.querySelector('.CaishengPlatformShell__nav')).backgroundColor,fg:getComputedStyle(document.querySelector('.HaituoMarketTicker b')).color,backgroundImage:getComputedStyle(document.querySelector('.CaishengPlatformShell__content')).backgroundImage})`);
            check(appearance.mode===nativeTheme,`Native mode did not synchronize`);
            check(appearance.backgroundImage===`none`,`Wallpaper remained after removing themes`);
            check(appearance.bg!==appearance.fg,`Ticker text is invisible`);
            states.push({stage:`native-appearance`,...appearance});
        }
        await Z.webContents.executeJavaScript(`document.querySelector('.HaituoSettingsCollapse').click()`);
        await delay(500);
        caishengMenuOpen = !0; e_();
        await delay(700);
        const menuHidden = await Promise.all(ids.map(state));
        check(menuHidden.every(value => !value.visible), `Account covered the add-account menu`);
        states.push({ stage: `add-menu-open`, accounts: menuHidden });
        caishengMenuOpen = !1; e_();
        await delay(700);
        check((await state(ids[0])).visible, `Account did not return after menu closed`);
        const overlay = new p.BrowserWindow({ show: false, width: 400, height: 300, parent: Z });
        try {
            haituoRaiseOverlayWindow(overlay);
            await delay(700);
            const overlayHidden = await Promise.all(ids.map(state));
            check(overlayHidden.every(value => !value.visible), `Account covered the settings overlay`);
            states.push({ stage: `overlay-open`, accounts: overlayHidden });
        } finally { overlay.destroy(); }
        await delay(700);
        check((await state(ids[0])).visible, `Account did not return after overlay closed`);
        sync({}, { id: null, x: 110, y: 70, width: 700, height: 500 });
        await delay(700);
        const hidden = await Promise.all(ids.map(state));
        check(hidden.every(value => !value.visible), `Accounts remained visible after switching away`);
        states.push({ stage: `switched-away`, accounts: hidden });
        for (const id of ids) caishengTerminateSignalChild(Yg.get(id));
        (0, m.writeFileSync)(output, JSON.stringify({ ok: true, states }, null, 2));
        await Z.webContents.executeJavaScript(`document.querySelector('button[data-caisheng-tab-workspace="signal-main"]').click()`);
        await delay(500);
        await Z.webContents.executeJavaScript(`document.querySelector('.CaishengPlatformShell__refresh').click()`);
    } catch (error) {
        for (const id of ids) caishengTerminateSignalChild(Yg.get(id));
        (0, m.writeFileSync)(output, JSON.stringify({ ok: false, error: String(error?.stack || error), states }, null, 2));
        p.app.exit(1);
    }
}

async function haituoTestMainRefreshResult(output) {
    const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
    try {
        const deadline=Date.now()+60000;
        let page;
        await Z.webContents.executeJavaScript(`document.querySelector('button[data-caisheng-tab-workspace="signal-main"]').click()`);
        do {
            await delay(500);
            page=await Z.webContents.executeJavaScript(`({loading:!!document.querySelector('.CaishengPlatformShell__signal .app-loading-screen'),installed:!!document.querySelector('.CaishengPlatformShell__signal [class*="InstallScreen"],.CaishengPlatformShell__signal .inbox'),mode:document.documentElement.dataset.haituoNativeTheme,text:document.querySelector('.CaishengPlatformShell__signal')?.innerText})`);
        } while((page.loading||!page.installed)&&Date.now()<deadline);
        if(page.loading||!page.installed)throw Error(`Main Signal is still loading after restarting: ${JSON.stringify(page)}`);
        (0,m.writeFileSync)(output+`.main-refresh.json`,JSON.stringify({ok:true,page},null,2));
        p.app.quit();
    } catch(error) {
        (0,m.writeFileSync)(output+`.main-refresh.json`,JSON.stringify({ok:false,error:String(error?.stack||error)},null,2));
        p.app.exit(1);
    }
}
