from pathlib import Path
root = Path('macos/staging/app')
p = root / 'bundles/preload/main.js'
s = p.read_text(encoding='utf-8')
def change(old, new):
    global s
    assert s.count(old) == 1, (old[:100], s.count(old))
    s = s.replace(old, new, 1)
helper = Path('signal-recovery/recovery-guard.js').read_text(encoding='utf-8')
change('        function R() {\n            $.info(`pauseQueuesAndNotificationsOnSocketConnect: pausing`)',
    helper + '\n        const haituoSignalRecoveryGuard = haituoCreateSignalRecoveryGuard({\n            isOpen: () => window.getSocketStatus().authenticated.status === Zc.OPEN,\n            resume: () => { p.start(); m.start(); yP.start(); },\n            warn: message => $.warn(message)\n        });\n        function R() {\n            haituoSignalRecoveryGuard.arm();\n            $.info(`pauseQueuesAndNotificationsOnSocketConnect: pausing`)')
change('        function ee() {\n            $.info(`restartQueuesAndNotificationsOnEmpty: restarting`)',
       '        function ee() {\n            haituoSignalRecoveryGuard.stop();\n            $.info(`restartQueuesAndNotificationsOnEmpty: restarting`)')
change('window.getSocketStatus().authenticated.status === Zc.OPEN && R();',
       'window.getSocketStatus().authenticated.status === Zc.OPEN ? R() : haituoSignalRecoveryGuard.stop();')
p.write_text(s, encoding='utf-8')
print('Installed bounded authenticated Signal recovery queue guard; timestamps and order unchanged')
