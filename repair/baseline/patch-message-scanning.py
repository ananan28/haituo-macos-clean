from pathlib import Path
p=Path('macos/staging/app/js/caisheng-webview-preload.js');s=p.read_text()
def edit(a,b):
 global s
 assert s.count(a)==1,(a[:70],s.count(a))
 s=s.replace(a,b,1)
edit('}, 1500), window.addEventListener("DOMContentLoaded", () => {','}, 1500);\nfunction haituoInstallMessageScanner() {\n    if (window.__haituoMessageScannerInstalled) return;\n    window.__haituoMessageScannerInstalled = true;')
edit('const messageCandidates = document.querySelectorAll(\'[data-testid="msg-container"]\').length ? document.querySelectorAll(\'[data-testid="msg-container"]\') : document.querySelectorAll(\'#main .message-in,#main .message-out\');','''const messageCandidates = [...document.querySelectorAll('[data-testid="msg-container"],#main .message-in,#main .message-out,#main [data-id]')]
            .map(node => node.closest('[data-id],.message-in,.message-out') || node);''')
edit("e.querySelectorAll('.selectable-text,[data-testid=\"msg-text\"]')", "e.querySelectorAll('.selectable-text,[data-testid=\"selectable-text\"],[data-testid=\"msg-text\"],[data-testid=\"conversation-text\"],[data-pre-plain-text] span[dir=\"auto\"]')")
edit('!node.closest(".haituo-wa-message-translation,.haituo-voice-result")','!node.closest(".haituo-wa-message-translation,.haituo-voice-result,.haituo-wa-translation-error")')
edit('                } catch {\n                    const retry = Math.min(3, Number(item.t.dataset.haituoTranslationRetryCount || 0) + 1);','''                } catch (error) {
                    item.error = error instanceof Error ? error.message : String(error);
                    const retry = Math.min(3, Number(item.t.dataset.haituoTranslationRetryCount || 0) + 1);''')
edit('            const { e, t, n, r, mount } = item;','''            const { e, t, n, r, mount } = item;
            if (e.isConnected && mount?.isConnected && e.dataset.haituoTranslationSource === n) {
                let status = e.querySelector('.haituo-wa-translation-error');
                if (item.error) {
                    if (!status) {
                        status = document.createElement('button'); status.type = 'button';
                        status.className = 'haituo-wa-translation-error';
                        Object.assign(status.style,{display:'block',color:'inherit',background:'transparent',border:'0',padding:'5px 0',cursor:'pointer',fontSize:'12px'});
                        status.onclick = event => { event.preventDefault(); event.stopPropagation(); delete e.dataset.haituoTranslationRetryAt; scan(); };
                        mount.append(status);
                    }
                    status.textContent = '翻译失败，自动重试中 · 点击重试'; status.title = item.error;
                } else status?.remove();
            }''')
# Failure labels must never become source text through fallback selectors.
edit('    new MutationObserver(() => {','''    const scan = () => t().catch(error => console.error('HaiTuo message scan failed', error));
    setInterval(scan, 2000);
    document.addEventListener('scroll', () => { clearTimeout(e); e = setTimeout(scan, 120); }, true);
    new MutationObserver(() => {''')
edit('e ? syncPanel(e) : hidePanels(), t();','e ? syncPanel(e) : hidePanels(), scan();')
assert s.endswith('}), t();\n});\n')
s=s[:-len('}), t();\n});\n')]+''' }), scan();
}
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', haituoInstallMessageScanner, {once:true});
else haituoInstallMessageScanner();
'''
p.write_text(s)
print('Installed resilient WhatsApp message scan and visible retry status')

p=Path('macos/staging/app/bundles/main.js')
s=p.read_text()
a="            if (process.env.HAITUO_WINDOW_TEST === `1` && h) setTimeout(haituoTestAccountWindows, 1000);"
assert s.count(a)==1
s=s.replace(a,a+"\n            if (process.env.HAITUO_MESSAGE_TEST === `1` && h) setTimeout(haituoTestMessageScanning, 1000);")
s+='\n'+Path('macos/message-scanning-test-hook.js').read_text()
p.write_text(s)

s=p.read_text()
a="            if (process.env.HAITUO_MESSAGE_TEST === `1` && h) setTimeout(haituoTestMessageScanning, 1000);"
assert s.count(a)==1
s=s.replace(a,a+"\n            if (process.env.HAITUO_SIGNAL_LIVE_TEST === `1` && h) setTimeout(haituoSignalLiveTest, 1500);")
s+='\n'+Path('macos/signal-live-test-hook.js').read_text()
p.write_text(s)
