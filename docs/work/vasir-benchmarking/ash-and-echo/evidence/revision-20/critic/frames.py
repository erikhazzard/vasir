import glob,json,os,subprocess,sys
out=sys.argv[1]
r=json.load(open(out+'/receipt.json'))
v=glob.glob(out+'/video/*')[0]
for name in ['double','delayed-right','double-left','immediate-contact','buffer-rebound','gentle']:
 a=next((a for a in r['actions'] if a['name']==name+'-start'),None)
 if not a:continue
 t=max(0,a['clock']/1000-.08)
 # Video origin differs from navigation clock by only startup; whole trial supplied as support.
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss',str(t),'-i',v,'-t','1.2','-vf','fps=15,scale=195:422:force_original_aspect_ratio=decrease,pad=195:422:(ow-iw)/2:(oh-ih)/2,tile=6x3','-frames:v','1',out+'/'+name+'-ordered.png'],check=True)
