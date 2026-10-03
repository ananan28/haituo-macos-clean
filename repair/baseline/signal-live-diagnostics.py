"""Export only provisioning event classifications, never raw logs or identifiers."""
import pathlib,json,re,sys
root=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2])
events=[]
patterns={
 'provisioner_started':r'Provisioner.*starting',
 'qr_connection_open':r'Provisioner.loop.*connected, refreshing',
 'qr_socket_removed':r'closing extra socket',
 'qr_rotation_limit':r'max rotations|Max rotations',
 'socket_closed':r'Provisioner.*closed',
 'socket_connect_failed':r'Provisioner.*failed to connect',
 'qr_network_error':r'got an error while waiting for QR code',
 'qr_timeout':r'InstallScreen/getQRCode: timed out',
 'provisioning_envelope':r'InstallScreen.*envelope|Provisioner.*closed gracefully',
 'installer_error':r'InstallScreen.*error|installer.*[Ff]ailed',
 'registration_failed':r'[Rr]egister.*[Ff]ail|[Rr]egistration.*[Ee]rror',
}
for p in [root/'client.log',*root.glob('profile/**/logs/*.log')]:
 if not p.is_file():continue
 for line in p.read_text(errors='replace').splitlines():
  for category,pattern in patterns.items():
   if re.search(pattern,line):
    stamp=re.search(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z',line)
    status=re.search(r'(?:status|code)[=: ]+(\d{3})(?:\D|$)',line,re.I)
    events.append({'event':category,'at':stamp.group(0) if stamp else None,'httpStatus':int(status.group(1)) if status else None})
report={'events':events[-150:],'rawLogsExported':False}
tmp=out.with_suffix('.tmp');tmp.write_text(json.dumps(report));tmp.replace(out)
