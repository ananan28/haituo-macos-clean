import hashlib,io,json,os,pathlib,runpy,shutil,tempfile,zipfile
ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'portable/out';OUT.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='haituo-project-') as temp:
    stage=pathlib.Path(temp)/'stage';stage.mkdir()
    blob=b''.join(p.read_bytes() for p in sorted(ROOT.glob('source.zip.part*')))
    assert hashlib.sha256(blob).hexdigest()=='f66e2ef08006d0cbf6b1ffec6c198eaaa702e81f6a6ec88327ea9e1fb4691a5c'
    with zipfile.ZipFile(io.BytesIO(blob)) as archive:archive.extractall(stage)
    shutil.copytree(ROOT/'repair',stage/'repair',dirs_exist_ok=True)
    (stage/'macos/staging').mkdir(parents=True,exist_ok=True)
    shutil.copytree(stage/'work/app',stage/'macos/staging/app',symlinks=True)
    os.chdir(stage)
    runpy.run_path(str(stage/'repair/prepare-repairs.py'),run_name='__main__')
    runpy.run_path(str(ROOT/'long-message/patch.py'),run_name='__main__')
    runpy.run_path(str(ROOT/'sending-fix/patch.py'),run_name='__main__')
    runpy.run_path(str(ROOT/'sending-fix/patch-1.2.1.py'),run_name='__main__')
    shutil.copytree(ROOT/'signal-recovery',stage/'signal-recovery')
    runpy.run_path(str(stage/'signal-recovery/patch.py'),run_name='__main__')
    project=pathlib.Path(temp)/'Haituo-Portable-Project'
    shutil.copytree(ROOT/'portable/template',project)
    shutil.copytree(stage/'macos/staging/app',project/'src/app',symlinks=True)
    cfgpath=project/'project.json'
    cfg=json.loads(cfgpath.read_text());cfg['versions']={'windows':'1.2.2','macos':'1.2.2'}
    cfgpath.write_text(json.dumps(cfg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    labels=project/'src/app/bundles/preload/main.js'
    labels.write_text(labels.read_text().replace('海拓 1.2.1','海拓 1.2.2').replace('当前版本 1.2.1','当前版本 1.2.2'),encoding='utf-8')
    for file in project.rglob('*'):
        if file.is_file():
            data=file.read_bytes()
            if b'\x00' not in data:
                try: text=data.decode('utf-8')
                except UnicodeDecodeError: continue
                file.write_bytes(text.replace('\r\n','\n').encode('utf-8'))
    hashes={p.relative_to(project).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(project.rglob('*')) if p.is_file()}
    (project/'FILE-SHA256.json').write_text(json.dumps(hashes,ensure_ascii=False,indent=2),encoding='utf-8')
    dest=OUT/'Haituo-Windows-1.2.2-macOS-1.2.2-Portable-Project.zip'
    with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        for p in sorted(project.rglob('*')):
            if p.is_file():
                entry=zipfile.ZipInfo('Haituo-Portable-Project/'+p.relative_to(project).as_posix(),(2026,10,4,0,0,0))
                entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=0o100644<<16
                archive.writestr(entry,p.read_bytes())
    print(dest,hashlib.sha256(dest.read_bytes()).hexdigest())
    os.chdir(ROOT)
