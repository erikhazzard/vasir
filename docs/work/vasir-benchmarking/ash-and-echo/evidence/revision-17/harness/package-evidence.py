from pathlib import Path
import shutil,json,hashlib
root=Path.cwd(); src=root/'site/ash-and-echo'; scratch=root/'tmp/ash-and-echo/landing-pass'; out=root/'docs/work/vasir-benchmarking/ash-and-echo/evidence/revision-17'
def copy(a,b):
 b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(a,b)
def tree(a,b):
 if a.exists():shutil.copytree(a,b,dirs_exist_ok=True)
for p in src.iterdir():
 if p.suffix in ['.js','.css','.html'] or p.name=='CONTRACT.md':copy(p,out/'source'/p.name)
copy(root/'test/ash-and-echo.test.js',out/'source/ash-and-echo.test.js')
copy(scratch/'controller-tests.txt',out/'controller-tests.txt')
for name in ['played-touch-opening','played-full-route','final-forms','landing-performance']:
 copy(scratch/name/'receipt.json',out/'play'/name/'receipt.json')
 if name in ['played-touch-opening','played-full-route']:tree(scratch/name/'video',out/'play'/name/'video')
for script in ['touch-play.mjs','full-play.mjs','final-forms.mjs','landing-performance.mjs']:
 copy(scratch/script,out/'harness'/script)
for name in ['baseline-v16','round-1','round-2','maximum']:
 p=scratch/'critic'/name
 copy(p/'receipt.json',out/'critique'/name/'receipt.json')
 tree(p/'video',out/'critique'/name/'video')
 tree(p/'source',out/'critique'/name/'source')
 # A compact set of selected native frames, rather than all extraction frames.
 if (p/'selected').exists():tree(p/'selected',out/'critique'/name/'selected')
for p in (scratch/'critic').glob('*.md'):copy(p,out/'critique'/p.name)
copy(scratch/'critic/capture.mjs',out/'harness/critic-capture.mjs')
for p in ['notes.txt','real-common-report.json','real-common-moving-report.json','actual-buffered-report.json','common-capture.mjs','real-capture.mjs']:
 copy(scratch/'character'/p,out/'character'/p)
for name in ['medium','heavy']:
 for ms in [50,180,420]:
  p=scratch/'character'/f'real-common-normal-{name}-{ms}.png'
  copy(p,out/'character'/p.name)
for name in ['review.md','check-results.json','check.mjs']:
 copy(scratch/'surface'/name,out/'surface'/name)
for name in ['receipt.md','receipt.json','game-events.json','render-audio.mjs','check-audio.mjs']:
 copy(scratch/'audio'/name,out/'audio'/name)
# Source and asset identity, not duplicate assets. All raster assets are unchanged.
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
identity={'source':{p.name:h(p) for p in sorted(src.iterdir()) if p.suffix in ['.js','.css','.html'] or p.name=='CONTRACT.md'},'controllerTest':h(root/'test/ash-and-echo.test.js'),'assets':{p.name:h(p) for p in sorted((src/'assets').iterdir()) if p.is_file()},'servedChecks':{}}
for name in ['played-touch-opening','played-full-route','final-forms','landing-performance']:
 receipt=json.loads((scratch/name/'receipt.json').read_text());observed=receipt['source'];mismatch=[n for n,value in observed.items() if value!=identity['source'][n]]
 assert len(observed)==15 and not mismatch,(name,mismatch)
 identity['servedChecks'][name]={'modules':len(observed),'mismatches':mismatch,'errors':receipt['errors']}
for name in ['round-2','maximum']:
 receipt=json.loads((scratch/'critic'/name/'receipt.json').read_text());observed=receipt['served'];mismatch=[n for n,value in observed.items() if value!=identity['source'][n]]
 assert len(observed)==15 and not mismatch,(name,mismatch)
 identity['servedChecks']['critic-'+name]={'modules':len(observed),'mismatches':mismatch,'errors':receipt['errors']}
(out/'identities.json').write_text(json.dumps(identity,indent=2)+'\n')
print(json.dumps({'sizeMiB':round(sum(p.stat().st_size for p in out.rglob('*') if p.is_file())/2**20,2),'servedChecks':identity['servedChecks']},indent=2))
