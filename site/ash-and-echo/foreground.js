/** Nearby charcoal masonry: three complete silhouettes, bounded edge framing. */
export function createForeground(assets) {
  let version, masonry;
  // The arch turns into a pier, the clustered shaft carries a battered capital,
  // and the split buttress tapers back into its wall. Their exposed ends break
  // inside the image; their outer roots continue beyond the lateral frame.
  const shapes = [
    {
      edge: 'M0 21 L76 34 L129 19 L159 37 L179 31 L206 45 L222 39 L244 58 L256 54 L289 79 L293 96 L282 110 Q266 133 260 162 L257 185 L263 198 L255 222 Q251 265 254 307 L261 342 L251 374 L254 415 L244 443 L248 465 L232 482 L237 509 L216 523 L201 549 L172 553 L138 578 L76 587 L0 599 Z',
      face: 'M264 70 L278 81 L270 99 Q245 132 241 174 Q229 229 232 298 L239 353 L230 402 L233 439 L218 467 L222 428 L219 382 L226 331 L219 291 Q215 211 226 167 Q234 105 264 70 Z',
      seams: ['M163 39 L181 96 L219 125', 'M210 47 L223 85 L257 137', 'M251 62 L246 94 L269 119', 'M136 143 L193 174 L260 180', 'M151 237 L206 249 L253 247', 'M157 333 L208 341 L255 326', 'M164 430 L214 442 L248 432', 'M140 507 L190 518 L231 500'],
      pin: [252, 290],
      right: 298,
    },
    {
      edge: 'M0 42 L73 58 L119 39 L143 62 L159 57 L166 96 L178 103 L177 144 L188 159 L222 171 L240 197 L247 216 L234 232 L223 234 L216 263 L209 275 L211 414 L219 435 L214 467 L228 483 L219 502 L199 509 L182 536 L158 546 L137 570 L97 580 L0 603 Z',
      face: 'M169 100 L176 109 L174 150 L184 174 L216 188 L229 215 L212 225 L200 253 L194 279 L197 419 L203 445 L196 475 L211 491 L195 496 L183 476 L187 440 L181 418 L180 278 L187 244 L200 213 L172 193 L159 170 Z',
      seams: ['M91 175 L129 185 L172 168', 'M119 217 L156 228 L200 214', 'M144 266 L182 278 L208 270', 'M132 347 L170 355 L209 344', 'M140 425 L176 433 L211 420', 'M136 484 L173 491 L211 482'],
      pin: [214, 277],
      right: 252,
    },
    {
      edge: 'M0 23 L75 42 L116 30 L143 57 L174 51 L180 85 L199 98 L207 125 L229 133 L246 162 L249 181 L262 199 L257 218 L238 239 L230 260 L213 273 L200 305 L189 316 L176 352 L173 379 L183 399 L175 432 L178 454 L163 477 L144 484 L132 513 L107 529 L98 557 L71 574 L0 595 Z',
      face: 'M195 111 L213 134 L217 154 L240 176 L247 203 L231 219 L220 247 L201 261 L188 291 L175 312 L163 353 L158 380 L168 400 L160 428 L147 459 L149 419 L145 393 L150 344 L164 304 L184 272 L190 252 L212 233 L217 207 L231 194 L212 177 L202 153 Z',
      seams: ['M127 90 L157 118 L196 109', 'M111 164 L158 179 L215 156', 'M121 230 L159 238 L202 250', 'M101 312 L136 319 L174 310', 'M99 399 L131 405 L172 388', 'M93 484 L120 491 L144 481'],
      pin: [228, 259],
      right: 267,
    },
  ];
  const places = [
    {y:4650,flip:false,scale:1.13,shape:0,edge:113,cloth:true},
    {y:3540,flip:true,scale:1.10,shape:2,edge:91,cloth:false},
    {y:2670,flip:false,scale:1.08,shape:1,edge:88,cloth:false},
    {y:1920,flip:true,scale:1.08,shape:0,edge:96,cloth:true},
    {y:1090,flip:false,scale:1.07,shape:2,edge:80,cloth:false},
    {y:260,flip:true,scale:1.02,shape:1,edge:76,cloth:true},
  ];
  function prepare() {
    if (!assets.stone || version===assets.stone) return;
    version=assets.stone;
    // One reusable preparation surface, three cached images per stone identity.
    // Shape, material, joints and optical softness never rebuild during play.
    const image=document.createElement('canvas');image.width=600;image.height=1200;
    const c=image.getContext('2d');
    masonry=shapes.map(shape=>{
      c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,300,600);
      const edge=new Path2D(shape.edge);
      c.save();c.clip(edge);c.drawImage(assets.stone,0,0,300,600);
      c.fillStyle='rgba(0,0,0,.45)';c.fillRect(0,0,300,600);
      c.fillStyle='rgba(144,150,150,.19)';c.fill(new Path2D(shape.face));
      c.lineCap='round';c.lineJoin='round';
      for(const seam of shape.seams){
        const joint=new Path2D(seam);
        c.strokeStyle='rgba(1,3,4,.64)';c.lineWidth=4.2;c.stroke(joint);
        c.save();c.translate(0,2.1);c.strokeStyle='rgba(124,130,130,.15)';c.lineWidth=1.1;c.stroke(joint);c.restore();
      }
      c.strokeStyle='rgba(170,176,176,.18)';c.lineWidth=1.25;c.stroke(edge);c.restore();
      const pixels=c.getImageData(0,0,600,1200),d=pixels.data;
      for(let i=0;i<d.length;i+=4){const l=d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722;const v=5+Math.max(0,Math.min(1,(l-9)/104))*37;d[i]=v;d[i+1]=v+1;d[i+2]=v+2;}
      c.putImageData(pixels,0,0);
      const cached=document.createElement('canvas');cached.width=620;cached.height=1220;
      const r=cached.getContext('2d');r.filter='blur(2.3px)';r.drawImage(image,10,10);
      return cached;
    });
  }
  function cloth(c,time,force,mirror,pin) {
    // One folded ash pennant, held at a visible iron pin. The two irregular
    // torn ends follow the same broad S curve; they never become parallel rods.
    const x=pin[0]+5,y=pin[1]+5;
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
      prepare();if(!masonry)return;
      for(const item of places){
        const y=item.y-camera*1.18,h=610*item.scale;
        if(y>height+30||y+h< -30)continue;
        const shape=shapes[item.shape];
        const x=item.edge-shape.right*item.scale+(item.flip?1:-1)*viewpoint*.45;
        c.save();c.translate(item.flip?420:0,0);c.scale(item.flip?-1:1,1);c.translate(x,y);c.scale(item.scale,item.scale);
        c.drawImage(masonry[item.shape],0,0,310,610);
        if(item.cloth){const near=Math.exp(-Math.abs(y+(shape.pin[1]+5)*item.scale-gust.y)/180);cloth(c,reduced?0:time,reduced?0:gust.strength*near,item.flip?-1:1,shape.pin);}
        c.restore();
      }
    }
  };
}
