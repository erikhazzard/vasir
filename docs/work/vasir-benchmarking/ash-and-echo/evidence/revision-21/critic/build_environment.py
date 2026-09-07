from pathlib import Path
p=Path('tmp/ash-and-echo/embodied-depth-pass/critic/capture.mjs')
s=p.read_text().split('try{')[0]
s+=r'''try {
 await p.goto('http://localhost:8317/?review=environment'); await p.waitForFunction(()=>window.__echo&&!document.querySelector('#start-button').disabled);
 if(scale!=='native')await p.addStyleTag({content:'.echo-game{width:780px!important;height:1688px!important;max-width:none!important}.echo-page__margin{display:none!important}'});
 await p.locator('#start-button').click(); await p.waitForTimeout(350);
 const fixture=async(id,x)=>{await release();await p.evaluate(({id,x})=>{const e=__echo,a=e.game.platforms.find(p=>p.id===id);Object.assign(e.game.player,{x:x??a.x+a.w*.5-12,y:a.y-28,vx:0,vy:0,grounded:true,airJumps:1,wallDir:0,motion:'idle'});e.game.cameraY=a.y-e.game.viewportHeight*.68;},{id,x});await p.waitForTimeout(1800)};
 await fixture('ledge-14',140);await mark('run-start');await p.keyboard.down('ArrowRight');await p.waitForTimeout(340);await p.keyboard.up('ArrowRight');await mark('brake');await p.waitForTimeout(250);await p.keyboard.down('ArrowLeft');await mark('reverse');await p.waitForTimeout(360);await p.keyboard.up('ArrowLeft');await p.waitForTimeout(500);await mark('run-end');
 await release();await p.evaluate(()=>{const e=__echo;Object.assign(e.game.player,{x:335,y:4300,vx:0,vy:60,grounded:false,airJumps:1,wallDir:0,motion:'fall'});e.game.cameraY=3900});await p.keyboard.down('ArrowRight');await p.waitForTimeout(140);await mark('wall-start');await p.keyboard.down('Space');await p.waitForTimeout(150);await p.keyboard.up('Space');await p.keyboard.up('ArrowRight');await p.waitForTimeout(950);await mark('wall-end');
 for (const id of ['first-hop','ledge-7','ledge-20']){await fixture(id);await mark(id+'-fog-a');await p.screenshot({path:out+'/'+id+'-fog-a.png'});await p.waitForTimeout(3000);await mark(id+'-fog-b');await p.screenshot({path:out+'/'+id+'-fog-b.png'});}
 await release();await p.keyboard.press('KeyR');await p.waitForTimeout(600);await mark('ordinary-ascent-start');
 for(const [side,hold,delay] of [[1,360,300],[1,240,180],[-1,420,210],[-1,280,180],[1,380,180]]) {await p.keyboard.down(side>0?'ArrowRight':'ArrowLeft');await p.keyboard.down('Space');await p.waitForTimeout(hold);await p.keyboard.up('Space');await p.waitForTimeout(delay);await p.keyboard.down('Space');await p.waitForTimeout(100);await p.keyboard.up('Space');await p.keyboard.up(side>0?'ArrowRight':'ArrowLeft');await p.waitForTimeout(500)}
 await release();await mark('ordinary-ascent-end');report.events=await p.evaluate(()=>__echo.eventLog);report.method+=' Ground run/brake/reversal on arranged checkpoint shelf; wall fixture begins beside wall, real input launches. Fog idle pairs settle on three arranged ledges with normal RAF, unchanged camera verified in receipt. Final ordinary ascent starts by real restart and uses only keyboard.';
}finally{await c.close();await b.close();await fs.writeFile(out+'/receipt.json',JSON.stringify(report,null,2));}console.log(out);
'''
Path('tmp/ash-and-echo/embodied-depth-pass/critic/environment.mjs').write_text(s)
