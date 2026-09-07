from pathlib import Path
import shutil,json,hashlib
root=Path.cwd();src=root/'site/ash-and-echo';scratch=root/'tmp/ash-and-echo/impact-pass';out=root/'docs/work/vasir-benchmarking/ash-and-echo/evidence/revision-18'
def copy(a,b):
 b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(a,b)
def tree(a,b):
 if a.exists():shutil.copytree(a,b,dirs_exist_ok=True)
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
identity={'source':{p.name:h(p) for p in src.iterdir() if p.suffix in ['.js','.css','.html'] or p.name=='CONTRACT.md'},'assets':{p.name:h(p) for p in (src/'assets').iterdir() if p.is_file()},'servedChecks':{}}
for name in identity['source']:copy(src/name,out/'source'/name)
copy(root/'test/ash-and-echo.test.js',out/'source/ash-and-echo.test.js')
copy(scratch/'controller-tests.txt',out/'controller-tests.txt')
for name in ['played-touch-opening','played-full-route','routine-performance']:
 p=scratch/name;d=json.loads((p/'receipt.json').read_text());mismatch=[n for n,value in d['source'].items() if value!=identity['source'][n]]
 assert len(d['source'])==15 and not mismatch,(name,mismatch)
 identity['servedChecks'][name]={'modules':15,'mismatch':mismatch,'errors':d['errors']}
 copy(p/'receipt.json',out/'play'/name/'receipt.json')
 if name!='routine-performance':tree(p/'video',out/'play'/name/'video')
copy(scratch/'fallback/checks.json',out/'play/fallback/checks.json')
d=json.loads((scratch/'fallback/checks.json').read_text());assert all(identity['source'][n]==v for n,v in d['source'].items())
identity['servedChecks']['fallback']={'modules':len(d['source']),'errors':d['errors']}
for name in ['baseline-native','candidate-native','final-common','round2-native','round2-desktop','round2-gentle','round2-bound']:
 p=scratch/'critic'/name;copy(p/'receipt.json',out/'critique'/name/'receipt.json');tree(p/'source',out/'critique'/name/'source')
 if name!='candidate-native':tree(p/'video',out/'critique'/name/'video')
 if name.startswith('round2'):
  d=json.loads((p/'receipt.json').read_text());observed=d.get('source',d.get('served',{}))
  # Route receipts have source; bound receipts expose loaded module map too.
  if not all(isinstance(v,str) for v in observed.values()):observed=d['served']
  mismatch=[n for n,v in observed.items() if n.endswith('.js') and identity['source'][n]!=v]
  assert not mismatch,(name,mismatch)
  identity['servedChecks'][name]={'modules':sum(n.endswith('.js') for n in observed),'mismatch':mismatch,'errors':d['errors']}
for name in ['baseline.md','round-1.md','round-2.md']:copy(scratch/'critic'/name,out/'critique'/name)
tree(scratch/'critic/selected-final',out/'critique/selected-final')
for name in ['final-camera-receipt.json','final-camera-report.json','findings.txt','state-report.json','report.json','final-camera.mjs']:
 copy(scratch/'settings'/name,out/'camera'/name)
for name in ['receipt.md','check-results.json','check.mjs']:
 copy(scratch/'surface'/name,out/'surface'/name)
for name in ['stage-17','stage-18a','stage-18b','stage-18c']:
 copy(scratch/'surface'/name/'surface-ash.js',out/'surface'/name/'surface-ash.js')
for name in ['touch-play.mjs','full-play.mjs','routine-performance.mjs','fallback-check.mjs','package-evidence.py']:
 copy(scratch/name,out/'harness'/name)
for name in ['route.mjs','bound.mjs']:copy(scratch/'critic'/name,out/'harness'/name)
(out/'identities.json').write_text(json.dumps(identity,indent=2)+'\n')
print(json.dumps({'sizeMiB':round(sum(p.stat().st_size for p in out.rglob('*') if p.is_file())/2**20,2),'servedChecks':identity['servedChecks']},indent=2))
