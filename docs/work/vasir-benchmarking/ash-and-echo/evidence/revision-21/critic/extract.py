import glob,json,subprocess,sys
out=sys.argv[1];r=json.load(open(out+'/receipt.json'));v=glob.glob(out+'/video/*')[0]
def extract(name,t,extra=''):
 cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-ss',str(max(0,t)),'-i',v]
 if extra:cmd+=['-vf',extra]
 subprocess.run(cmd+['-frames:v','1',out+'/'+name+'.png'],check=True)
for a in r['actions']:
 if a['name'] in ['double-start','first-start','run-start','wall-start','ordinary-ascent-start']:
  name=a['name'].replace('-start','');t=a['clock']/1000-.08
  extract(name+'-context',t+.42)
  extract(name+'-context-late',t+.65)
  extract(name+'-ordered',t,'fps=12,scale=195:422:force_original_aspect_ratio=decrease,pad=195:422:(ow-iw)/2:(oh-ih)/2,tile=6x3')

  if name=='ordinary-ascent':extract(name+'-whole',t,'fps=2,scale=195:422:force_original_aspect_ratio=decrease,pad=195:422:(ow-iw)/2:(oh-ih)/2,tile=5x4')
print(out)
