/** Nearby broken masonry: complete silhouettes, bounded intrusion, pinned ash. */
export function createForeground(assets) {
  let version, rib;
  const places = [
    {y:4760,flip:false,scale:1.03,cloth:true},
    {y:3540,flip:true,scale:1.10,cloth:false},
    {y:2720,flip:false,scale:.96,cloth:false},
    {y:1920,flip:true,scale:1.08,cloth:true},
    {y:1090,flip:false,scale:1.07,cloth:false},
    {y:260,flip:true,scale:1.02,cloth:true},
  ];
  function prepare() {
    if (!assets.stone || version===assets.stone) return;
    version=assets.stone;
    const image=document.createElement('canvas');image.width=600;image.height=1200;
    const c=image.getContext('2d');c.scale(2,2);
    // A broken arch elbow continues into a fluted proximal pier. Its narrow
    // visible face belongs to the shaft; there is no horizontal landing shelf.
    const edge=new Path2D('M0 48 L64 72 L104 58 L126 91 L151 102 L161 128 L181 119 L193 147 L205 149 L216 174 L214 201 L230 221 L240 251 L237 273 L225 289 L219 337 L225 367 L212 402 L207 435 L215 460 L197 488 L181 496 L172 527 L146 536 L127 560 L89 563 L69 581 L0 600 Z');
    c.save();c.clip(edge);c.drawImage(assets.stone,0,0,300,600);
    c.fillStyle='rgba(0,0,0,.44)';c.fillRect(0,0,173,600);
    c.fillStyle='rgba(155,161,164,.19)';c.beginPath();c.moveTo(190,0);c.lineTo(202,0);c.lineTo(198,116);c.lineTo(225,167);c.lineTo(207,269);c.lineTo(195,355);c.lineTo(199,600);c.lineTo(188,600);c.lineTo(185,355);c.lineTo(198,264);c.lineTo(213,167);c.lineTo(188,118);c.closePath();c.fill();
    c.strokeStyle='rgba(190,195,195,.2)';c.lineWidth=1.5;c.stroke(edge);c.restore();
    const pixels=c.getImageData(0,0,600,1200),d=pixels.data;
    for(let i=0;i<d.length;i+=4){const l=d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722;const v=5+Math.max(0,Math.min(1,(l-9)/104))*37;d[i]=v;d[i+1]=v+1;d[i+2]=v+2;}
    c.putImageData(pixels,0,0);
    // Optical softness is modest enough to preserve chipped edge and planes.
    rib=document.createElement('canvas');rib.width=620;rib.height=1220;
    const r=rib.getContext('2d');r.filter='blur(2.8px)';r.drawImage(image,10,10);
  }
  function cloth(c,time,force,mirror) {
    // One folded ash pennant, held at a visible iron pin. The two irregular
    // torn ends follow the same broad S curve; they never become parallel rods.
    const x=225,y=288;
    const wind=(Math.sin(time*1.18)*11+Math.sin(time*2.1+.7)*3+force*22)*mirror;
    c.fillStyle='#0c1012';c.beginPath();c.moveTo(x,y);
    c.bezierCurveTo(x+15,y+14,x+wind-10,y+37,x+wind+9,y+69);
    c.lineTo(x+wind+2,y+63);c.lineTo(x+wind-1,y+82);c.lineTo(x+wind-6,y+68);
    c.bezierCurveTo(x+wind-20,y+41,x+2,y+19,x-4,y+1);c.closePath();c.fill();
    c.strokeStyle='#23292b';c.lineWidth=.8;c.beginPath();c.moveTo(x-1,y+3);c.bezierCurveTo(x+8,y+18,x+wind-15,y+39,x+wind+1,y+68);c.stroke();
    c.fillStyle='#333a3b';c.beginPath();c.arc(x-1,y,1.5,0,Math.PI*2);c.fill();
  }
  return {
    draw(c,camera,height,viewpoint,time,reduced,gust){
      prepare();if(!rib)return;
      for(const item of places){
        const y=item.y-camera*1.18,h=610*item.scale;
        if(y>height+30||y+h< -30)continue;
        const x=94-245*item.scale+(item.flip?1:-1)*viewpoint*.45;
        c.save();c.translate(item.flip?420:0,0);c.scale(item.flip?-1:1,1);c.translate(x,y);c.scale(item.scale,item.scale);
        c.drawImage(rib,0,0,310,610);
        if(item.cloth){const near=Math.exp(-Math.abs(y+288*item.scale-gust.y)/180);cloth(c,reduced?0:time,reduced?0:gust.strength*near,item.flip?-1:1);}
        c.restore();
      }
    }
  };
}
