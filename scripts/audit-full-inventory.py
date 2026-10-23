import pathlib,json,re,hashlib,urllib.request,subprocess,sys
root=pathlib.Path(__file__).resolve().parent.parent
out=root/'audit-results';out.mkdir(exist_ok=True)
main=(root/'src/app/bundles/main.js').read_text(encoding='utf-8')
handlers=sorted(set(re.findall(r'ipcMain\.handle\([`\'\"]([^`\'\"\n]+)',main)))
app=root/'src/app';dependencies=[]
for p in (app/'node_modules').rglob('package.json'):
 try:
  d=json.loads(p.read_text(encoding='utf-8'));name=d.get('name');version=d.get('version')
  if name and version and '/dist/' not in p.as_posix():dependencies.append((name,version))
 except Exception:pass
dependencies=sorted(set(dependencies))
syntax=[]
paths=list((app/'js').glob('*.js'))+[app/'bundles/main.js',app/'bundles/preload/main.js']
for p in paths:
 r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True,timeout=60)
 syntax.append({'path':p.relative_to(root).as_posix(),'ok':r.returncode==0,'error':r.stderr[-1500:] if r.returncode else ''})
snapshot=json.loads((root/'SOURCE-SNAPSHOT.json').read_text(encoding='utf-8')) if (root/'SOURCE-SNAPSHOT.json').exists() else None
result={'baseline':'11277967addb8b0e2ce0b7807717b5154f2cfafd','ipcHandlers':handlers,'dependencies':dependencies,'syntax':syntax,'limitations':['No real linked messaging accounts','No paid API credentials','No real old-user database supplied','No physical multi-monitor/sleep/device-permission session','Vendored package audit cannot inventory every dependency embedded in minified bundles']}
cfg=json.loads((root/'project.json').read_text(encoding='utf-8'))
queries=dependencies+[('electron',cfg['tools']['electron']),('electron-builder',cfg['tools']['electron-builder']),('@electron/packager',cfg['tools']['packager']),('tar',cfg['tools']['tar'])]
# Public package coordinates only; never submit source, settings, or credentials.
try:
 payload=json.dumps({'queries':[{'package':{'name':name,'ecosystem':'npm'},'version':version} for name,version in queries]}).encode()
 req=urllib.request.Request('https://api.osv.dev/v1/querybatch',data=payload,headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=60) as response:data=json.load(response)
 result['dependencyAudit']={'ok':True,'queried':len(queries),'matches':[{'package':name,'version':version,'ids':[v['id'] for v in r.get('vulns',[])]} for (name,version),r in zip(queries,data['results']) if r.get('vulns')]}
except Exception as e:result['dependencyAudit']={'ok':False,'error':str(e)}
(out/'source-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('SOURCE_AUDIT_SUMMARY',json.dumps({'ipcCount':len(handlers),'syntax':syntax,'dependencyAudit':result['dependencyAudit']},ensure_ascii=False))
