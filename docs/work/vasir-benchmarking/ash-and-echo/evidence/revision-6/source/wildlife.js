/** Two small flocks, with their own flight clock and weak distant parallax. */
const TAU = Math.PI * 2;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export function createFlocks() {
  const atlas = document.createElement('canvas'); atlas.width = 256; atlas.height = 64;
  const c = atlas.getContext('2d');
  const frames = Array.from({length:16},(_,i)=>({x:(i%8)/8,y:Math.floor(i/8)/2,w:1/8,h:1/2}));
  for(let row=0;row<2;row++) for(let frame=0;frame<8;frame++) {
    const flap=Math.sin(frame/8*TAU),x=frame*32+16,y=row*32+16;
    c.fillStyle=c.strokeStyle=row?'#444b4d':'#697275'; c.lineWidth=1.6;
    c.beginPath();c.moveTo(x-12,y-flap*8);c.quadraticCurveTo(x-4,y-3,x,y);
    c.quadraticCurveTo(x+4,y-3,x+12,y-flap*8);c.stroke();
    c.beginPath();c.ellipse(x,y+1,1.4,3.1,0,0,TAU);c.fill();
  }
  let height=740;
  const groups=[{birds:[],factor:.025,home:0,phase:.3},{birds:[],factor:.060,home:0,phase:2.7}];
  function reset() {
    groups.forEach((group,g)=>{
      group.home=height*(g?.66:.28);
      group.birds=Array.from({length:g?8:11},(_,i)=>({
        x:105+i*12+g*65,y:group.home+Math.sin(i*7.1)*28,
        vx:12,vy:0,phase:i*1.71+g,speed:4.9+(i%4)*.43,
      }));
    });
  }
  reset();
  function update(dt,time,reduced) {
    if(!dt||reduced)return;
    for(const group of groups) {
      const phase=time*.065+group.phase;
      const targetX=210+235*Math.sin(phase),targetY=group.home+Math.sin(time*.13+group.phase)*46;
      let cx=0,cy=0,vx=0,vy=0;
      for(const b of group.birds){cx+=b.x;cy+=b.y;vx+=b.vx;vy+=b.vy;}
      const count=group.birds.length;cx/=count;cy/=count;vx/=count;vy/=count;
      for(const b of group.birds) {
        let sx=0,sy=0;
        for(const other of group.birds) {
          const dx=b.x-other.x,dy=b.y-other.y,d2=dx*dx+dy*dy;
          if(d2>0&&d2<180){sx+=dx/(d2+2)*130;sy+=dy/(d2+2)*130;}
        }
        const desiredX=15.3*Math.cos(phase)+(targetX-b.x)*.08+(cx-b.x)*.14+(vx-b.vx)*.45+sx;
        const desiredY=(targetY-b.y)*.13+(cy-b.y)*.18+(vy-b.vy)*.5+sy;
        const follow=1-Math.exp(-dt*1.9);
        b.vx+= (clamp(desiredX,-26,26)-b.vx)*follow;
        b.vy+= (clamp(desiredY,-15,15)-b.vy)*follow;
        b.x+=b.vx*dt;b.y+=b.vy*dt;
      }
    }
  }
  function draw(context,gpu,camera,origin,time,reduced) {
    groups.forEach((group,row)=>{
      for(const b of group.birds) {
        const y=b.y-(reduced?0:(camera-origin)*group.factor);
        if(y<-12||y>height+12||b.x<-12||b.x>432)continue;
        const frame=reduced?1:Math.floor((time*b.speed+b.phase)%8);
        const size=row?7.4:5.6,crop=frames[row*8+frame];
        if(gpu)gpu.image(atlas,b.x-size/2,y-size/2,size,size,b.vx<0,.88,crop);
        else context.drawImage(atlas,frame*32,row*32,32,32,b.x-size/2,y-size/2,size,size);
      }
    });
  }
  return {update,draw,reset,resize(h){if(Math.abs(height-h)>1){height=h;reset();}}};
}
