"""Keep the underlying Signal protocol version separate from Haituo branding."""
from pathlib import Path
import json
app=Path('macos/staging/app')
pkg=json.loads((app/'package.json').read_text(encoding='utf-8'))
assert pkg['signalProtocolVersion']=='8.29.0-alpha.1'
p=app/'bundles/main.js';s=p.read_text(encoding='utf-8')
old='        version: p.app.getVersion(),'
assert s.count(old)==1
s=s.replace(old,'        version: re.signalProtocolVersion,',1)
old='"User-Agent": n.Ot(re.version)'
assert s.count(old)==1
s=s.replace(old,'"User-Agent": n.Ot(re.signalProtocolVersion)',1)
p.write_text(s,encoding='utf-8')
p=app/'bundles/preload/main.js';s=p.read_text(encoding='utf-8')
s=s.replace('当前版本 1.1.22','当前版本 1.1.23').replace('海拓 1.1.22','海拓 1.1.23')
p.write_text(s,encoding='utf-8')
print('Signal protocol version preserved independently of Haituo 1.1.23 release version')
