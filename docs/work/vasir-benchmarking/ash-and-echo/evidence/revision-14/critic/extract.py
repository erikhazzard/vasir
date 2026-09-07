from pathlib import Path
from PIL import Image,ImageDraw
import subprocess,sys,json
p=Path(sys.argv[1]); v=next((p/'video').glob('*.webm')); seq=p/'sequence';seq.mkdir(exist_ok=True)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(v),'-vf','fps=25',str(seq/'frame-%03d.png')],check=True)
f=sorted(seq.glob('*.png'))
for k in range((len(f)+59)//60):
 a=Image.new('RGB',(390*6,420*10),'#eee');d=ImageDraw.Draw(a)
 for i,frame in enumerate(f[k*60:(k+1)*60]):
  x=i%6*390;y=i//6*420;im=Image.open(frame).crop((0,205,390,605));a.paste(im,(x,y+20));d.text((x+4,y+4),f'{frame.stem}  {(k*60+i)/25:.2f}s',fill='black')
 a.save(p/f'sequence-sheet-{k}.png')
r=json.loads((p/'receipt.json').read_text());print(json.dumps({'actions':[(a['name'],round(a['clock'])) for a in r['actions']],'errors':r['errors']},indent=2))
