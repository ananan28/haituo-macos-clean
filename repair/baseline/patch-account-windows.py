from pathlib import Path
import sys
p = Path(sys.argv[1] if len(sys.argv) > 1 else 'macos/staging/app/bundles/main.js')
s = p.read_text()
if 'function haituoMacFocusSelectedAccount()' in s:
    print('Mac account window patch already applied')
    sys.exit(0)
def replace(old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise RuntimeError(f'Expected one window patch anchor, found {count}: {old[:80]}')
    s = s.replace(old, new, 1)
replace('function e_() {', '''function haituoMacFocusSelectedAccount() {
    if (process.platform !== `darwin` || $u !== `signal-main` || caishengMenuOpen || !Z || Z.isDestroyed() || !Z.isVisible() || Z.isMinimized()) return;
    const child = Yg.get(Zg?.id);
    if (child && Xg.has(Zg?.id) && Zg?.width > 0 && Zg?.height > 0) {
        $g(Zg.id, child);
        caishengSendChild(child, { type: `caisheng-focus-account` });
    }
}

function haituoMacActivateAccountWindow() {
    if (process.platform !== `darwin` || $u === `signal-main` || !Z || Z.isDestroyed() || !Qg?.visible || !Qg?.bounds) return;
    n_();
    Z.show();
    Z.moveTop();
    Z.focus();
    Z.webContents.focus();
}

function e_() {''')
replace('    if (e.type === `caisheng-soft-refresh`) {', '''    if (e.type === `caisheng-focus-account`) {
        caishengParentHeartbeat = Date.now();
        haituoMacActivateAccountWindow();
        return;
    }
    if (e.type === `caisheng-soft-refresh`) {''')
replace('    }), n_(), Z.webContents.on(`will-attach-webview`, (e, t, r) => {', '''    }), n_();
    if (process.platform === `darwin`) {
        if ($u === `signal-main`) Z.on(`focus`, () => setImmediate(haituoMacFocusSelectedAccount));
        else {
            p.app.dock?.hide();
            Z.setHiddenInMissionControl(!0);
            Z.on(`show`, () => {
                if (!Qg?.visible) Z.hide();
            });
        }
    }
    Z.webContents.on(`will-attach-webview`, (e, t, r) => {''')
replace('        $g(t, r)), e && typeof e == `object` && e.type === `caisheng-unread-count`)) {', '        $g(t, r), haituoMacFocusSelectedAccount()), e && typeof e == `object` && e.type === `caisheng-unread-count`)) {')
replace('    const contentBounds = Z?.getContentBounds();\n    contentBounds && (n = {', '    const selectedAccountChanged = Zg?.id !== n.id;\n    const contentBounds = Z?.getContentBounds();\n    contentBounds && (n = {')
replace('    }), n.keepVisible && caishengKeepMainShellVisible(), Zg = n, e_(), n.keepVisible && setImmediate(caishengKeepMainShellVisible);', '    }), n.keepVisible && caishengKeepMainShellVisible(), Zg = n, e_(), n.keepVisible && setImmediate(caishengKeepMainShellVisible);\n    selectedAccountChanged && setImmediate(haituoMacFocusSelectedAccount);')
replace('}), p.app.on(`activate`, () => {\n    Kv && (Z ? Z.show() : nv());', '''}), p.app.on(`activate`, () => {
    if (process.platform === `darwin` && $u !== `signal-main`) {
        haituoMacActivateAccountWindow();
        return;
    }
    Kv && (Z ? Z.show() : nv());''')
p.write_text(s)
print('Applied Mac account selection, foreground and background window guards')
