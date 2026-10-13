from pathlib import Path
root=Path('macos/staging/app')
p=root/'bundles/main.js';s=p.read_text()
def change(a,b):
 global s
 assert s.count(a)==1,(a[:90],s.count(a))
 s=s.replace(a,b,1)
a=s.index('        const source = `$src=',s.index('function caishengStartNativeFollower('));b=s.index('        caishengNativeFollower = follower',a)
s=s[:a]+'''        const follower = (0, c.spawn)((0, s.join)(process.resourcesPath, `app.asar.unpacked`, `native`, `HaituoWindowHelper.exe`), [ `follow`, childHandle, parentHandle, String(left), String(top), String(right), String(bottom) ], { windowsHide: !0, stdio: `ignore` });
'''+s[b:]
a=s.index('        let r = `$s=',s.index('function caishengAttachNativeOwner('));b=s.index('        }, t => {',a)
s=s[:a]+'''        (0, c.execFile)((0, s.join)(process.resourcesPath, `app.asar.unpacked`, `native`, `HaituoWindowHelper.exe`), [ `owner`, n, e ], {
            windowsHide: !0
'''+s[b:]
a=s.index('    const script = `$ProgressPreference=',s.index('async function haituoSystemMarketText'));b=s.index('\n}',a)
s=s[:a]+'''    return haituoNodeMarketText(url, timeout);'''+s[b:]
assert 'powershell.exe' not in s.lower()

change('var Nh = class {',Path('account-environment/captcha-router.js').read_text()+'\nvar Nh = class {')
start=s.index('var Nh = class {');end=s.index('\nfunction Ph()',start)
section=s[start:end]
a='            this.#e.push(e);'
assert section.count(a)==1
section=section.replace(a,a+'\n            if ($u === `signal-main`) haituoPendingCaptchaAccounts.set(`signal-main`, t.seq);\n            else process.send?.({type:`haituo-captcha-pending`,seq:t.seq});',1)
s=s[:start]+section+s[end:]

change('    if (e.type === `caisheng-edit-account-label-in-page`) {','    if (e.type === `haituo-captcha-response` && typeof e.token === `string` && e.token.length > 0 && e.token.length < 32768) { p_.handleCaptcha(e.token); return; }\n    if (e.type === `caisheng-edit-account-label-in-page`) {')
change('    }), r.on(`message`, e => {','    }), r.on(`message`, e => {\n        if (Yg.get(t) === r && e?.type === `haituo-captcha-pending`) { haituoPendingCaptchaAccounts.set(t,e.seq); return; }')
change('        caishengCancelChildLabelRequests(r), Yg.get(t) === r &&','        haituoPendingCaptchaAccounts.delete(t);\n        caishengCancelChildLabelRequests(r), Yg.get(t) === r &&')
change('e.key === `captcha` ? (p_.handleCaptcha(e.args.captchaId),','e.key === `captcha` ? (haituoRouteCaptchaToAccount(e.args.captchaId),')

# Session isolation is already keyed by partition. Use the durable account UUID
# as a stable privacy seed; never rotate it on launches or reloads.
change('workspaceId && (HaituoWorkspaceBySession.set', 'a === `web.whatsapp.com` && workspaceId && (t.additionalArguments = [ ...(t.additionalArguments ?? []), `--haituo-canvas-profile=${(0, f.createHash)(`sha256`).update(`haituo-canvas-v1:` + workspaceId).digest(`hex`)}` ]);\n        workspaceId && (HaituoWorkspaceBySession.set')
s+='\n'+Path('account-environment/test-hook.js').read_text()
p.write_text(s)
p=root/'js/caisheng-webview-preload.js';s=p.read_text()
helper=Path('account-environment/canvas-profile.js').read_text()
s=s.replace('"use strict";','"use strict";\n'+helper,1)
p.write_text(s)
print('Removed runtime PowerShell; installed per-account stable Canvas privacy profile')

(root/'js/haituo-canvas-only.js').write_text(helper)
