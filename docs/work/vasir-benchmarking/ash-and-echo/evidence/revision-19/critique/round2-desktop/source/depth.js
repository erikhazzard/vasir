/** Painted scenery planes. Full-resolution source silhouettes, cached focus. */
import { createFlocks } from './wildlife.js';
import { createForeground } from './foreground.js';
import { CATHEDRAL_LIGHTS, LIGHT_REACH, lightTop, lightBottom, lightFrom, sampleLight } from './lighting.js';
const W = 420;
const mod = (x, n) => (x % n + n) % n;

function canvas(width, height) {
  const image = document.createElement('canvas');
  image.width = Math.ceil(width); image.height = Math.ceil(height);
  return image;
}

// Grade each bitmap once. Darkness defines distance; translucency is reserved
// for actual air. Source resolution is independent of depth-of-field blur.
function grade(image, low, high, blur = 0, sourceLow = 0, sourceHigh = 255) {
  const w = image.naturalWidth || image.width, h = image.naturalHeight || image.height;
  const result = canvas(w, h), c = result.getContext('2d');
  c.drawImage(image, 0, 0);
  const pixels = c.getImageData(0, 0, w, h), d = pixels.data;
  for (let i = 0; i < d.length; i += 4) {
    const raw = d[i] * .2126 + d[i + 1] * .7152 + d[i + 2] * .0722;
    const l = Math.max(0, Math.min(1, (raw - sourceLow) / (sourceHigh - sourceLow)));
    const value = low + l * (high - low);
    d[i] = value; d[i + 1] = value + .5; d[i + 2] = value + 1;
  }
  c.putImageData(pixels, 0, 0);
  if (!blur) return result;
  const soft = canvas(w + 32, h + 32), s = soft.getContext('2d');
  s.filter = `blur(${blur}px)`;
  s.drawImage(result, 16, 16);
  return soft;
}

function light(color, opacity) {
  const image = canvas(384, 384), c = image.getContext('2d');
  const g = c.createRadialGradient(192, 192, 8, 192, 192, 192);
  g.addColorStop(0, `rgba(${color},${opacity})`);
  g.addColorStop(.30, `rgba(${color},${opacity * .7})`);
  g.addColorStop(1, `rgba(${color},0)`);
  c.fillStyle = g; c.fillRect(0, 0, 384, 384);
  return image;
}

function fadeFoundation(image, start, crown = 0) {
  const c = image.getContext('2d');
  const air = c.createLinearGradient(0, image.height * start, 0, image.height);
  air.addColorStop(0, '#fff'); air.addColorStop(1, 'rgba(255,255,255,0)');
  c.globalCompositeOperation = 'destination-in';
  c.fillStyle = air; c.fillRect(0, 0, image.width, image.height);
  if (crown) {
    const upperAir = c.createLinearGradient(0, 0, 0, image.height * crown);
    upperAir.addColorStop(0, 'rgba(255,255,255,0)'); upperAir.addColorStop(1, '#fff');
    c.fillStyle = upperAir; c.fillRect(0, 0, image.width, image.height);
  }
  c.globalCompositeOperation = 'source-over';
  return image;
}

export function createDepth(assets, atmosphere = null) {
  let height = 740;
  let viewpoint = 0;
  let gpuActive = false;
  let lastClock = 0;
  let far, middle, belfry, gallery, lowerGallery;
  const flocks = createFlocks();
  const foreground = createForeground(assets);
  const gust = { x: 0, y: 0, age: 10, strength: 0 };
  const projectedGust = { x: 0, y: 0, strength: 0 };
  let farVersion, structureVersion, belfryVersion, galleryVersion;
  let paintedLight;
  const aperture = light('239,237,226', .75);
  const shadow = light('9,12,16', .32);
  const fog = light('171,178,179', .20);
  // The opening climbs out of a close, unlit arcade. Its smaller lancet frames
  // the wall transfer; its piers continue below the whole visible climb.
  const lowerGalleries = [{ x: -500, y: 2030, w: 950, flip: true }];
  // The later flying ribs run into the side masonry at both ends. Their material
  // stays solid; atmospheric separation belongs to the air drawn between them.
  const middlePlanes = [
    { x: -200, y: 530, w: 760, flip: true },
    { x: -140, y: -214, w: 760, flip: false },
  ];
  const galleries = [
    { x: -125, y: 185, w: 620, flip: false },
  ];
  const belfries = [
    { x: 140, y: 1000, w: 290, flip: false },
    { x: -88, y: -100, w: 310, flip: true },
  ];

  function prepare() {
    if (assets.background && assets.background !== farVersion) {
      farVersion = assets.background;
      far = fadeFoundation(grade(farVersion, 111, 200, 0), .92, .035);
    }
    const structure = assets['charcoal-buttress'];
    if (structure && structure !== structureVersion) {
      structureVersion = structure;
      middle = grade(structure, 43, 116, .65, 15, 105);

    }
    if (assets['charcoal-vertical-facade'] && assets['charcoal-vertical-facade'] !== galleryVersion) {
      galleryVersion=assets['charcoal-vertical-facade'];
      // Keep arch heads and capitals in the climb, with enough separation
      // between recessed ribs and broad faces to survive the intervening air.
      gallery=grade(galleryVersion,82,164,.5,20,105);
      lowerGallery=grade(galleryVersion,32,82,.5,15,140);
    }
    if (assets['charcoal-belfry'] && assets['charcoal-belfry'] !== belfryVersion) {
      belfryVersion = assets['charcoal-belfry'];
      belfry = fadeFoundation(grade(belfryVersion, 102, 173, 1.6, 15, 110), .64);
    }
  }

  function planes(c, image, list, camera, factor, receiving = 0) {
    if (!image) return;
    for (const item of list) {
      const h = item.w * image.height / image.width;
      const y = item.y - camera * factor;
      if (y > height + 10 || y + h < -10) continue;
      const x = item.x - viewpoint * factor;
      if (gpuActive) { atmosphere.image(image, x, y, item.w, h, item.flip, 1, null, receiving); continue; }
      c.save(); c.translate(x + (item.flip ? item.w : 0), y);
      if (item.flip) c.scale(-1, 1);
      c.drawImage(image, 0, 0, item.w, h);
      c.restore();
    }
  }

  function drawBehind(c, game, clock, reducedMotion, shadowCasters) {
    prepare();
    const origin = game.height - height;
    const camera = reducedMotion ? origin : game.cameraY;
    const dt = Math.max(0, Math.min(.05, clock - lastClock)); lastClock = clock;
    gust.age += dt;
    projectedGust.x = gust.x;
    projectedGust.y = gust.y - game.cameraY;
    projectedGust.strength = reducedMotion ? 0 : gust.strength * (1 - Math.exp(-gust.age * 16)) * Math.exp(-gust.age * 3.8);
    viewpoint += ((reducedMotion ? 0 : (game.player.x - 198) * .10) - viewpoint) * (1 - Math.exp(-dt * 4));
    flocks.update(dt, clock, reducedMotion);
    gpuActive = atmosphere?.begin(camera * .24, reducedMotion ? 0 : clock, false, game.cameraY, shadowCasters) || false;
    // Native aspect: preserve the actual city's spires, arches and distant light.
    const farWidth = 535, farHeight = far ? farWidth * far.height / far.width : height;
    const farY = -28 - (camera-origin)*.028;
    if (gpuActive) {
      if (far) atmosphere.image(far,-58-viewpoint*.03,farY,farWidth,farHeight);
      atmosphere.air(camera*.035,.25,0);
      planes(c,gallery,galleries,camera,.12,.32);
      flocks.draw(c,atmosphere,camera,origin,clock,reducedMotion);
      planes(c,belfry,belfries,camera,.22,.4);
      atmosphere.air(camera*.28,.90,1);
      planes(c,lowerGallery,lowerGalleries,camera,.50,1);
      planes(c,middle,middlePlanes,camera,.50,1);
      atmosphere.air(camera*.62,.34,2);
      gpuActive=false;
    } else {
      c.fillStyle='#b0b9bb';c.fillRect(0,0,W,height);
      if(far)c.drawImage(far,-58-viewpoint*.03,farY,farWidth,farHeight);
      planes(c,gallery,galleries,camera,.12);
      flocks.draw(c,null,camera,origin,clock,reducedMotion);
      planes(c,belfry,belfries,camera,.22);
      c.drawImage(aperture,30,990-camera*.15-400,440,750);
      c.drawImage(aperture,90,3780-camera-170,240,340);
      if(!paintedLight) {
        paintedLight=canvas(128,LIGHT_REACH);
        const paint=paintedLight.getContext('2d'),pixels=paint.createImageData(128,LIGHT_REACH);
        const opening={x:64,y:0,slope:0,width:18};
        for(let y=0;y<LIGHT_REACH;y++) for(let x=0;x<128;x++) {
          const i=(y*128+x)*4;
          pixels.data[i]=242;pixels.data[i+1]=239;pixels.data[i+2]=226;
          pixels.data[i+3]=lightFrom(opening,x,y)*48;
        }
        paint.putImageData(pixels,0,0);
      }
      for(const opening of CATHEDRAL_LIGHTS) {
        if(lightBottom(opening)<game.cameraY || lightTop(opening)>game.cameraY+height)continue;
        c.save();c.translate(opening.x,opening.y-game.cameraY);
        if(opening.horizontal)c.transform(0,1,opening.x<210?1:-1,opening.slope,0,0);
        else c.transform(1,0,opening.slope,1,0,0);
        c.drawImage(paintedLight,-64,0);c.restore();
      }
      planes(c,lowerGallery,lowerGalleries,camera,.50);
      planes(c,middle,middlePlanes,camera,.50);
      const drift=reducedMotion?0:Math.sin(clock*.24)*55;
      c.drawImage(fog,-80+drift,1060-camera*.22,530,370);
      c.drawImage(shadow,-230,-260,690,710);
    }
    // Different sizes, depths and winds make airborne ash a volume. Nearby
    // impulses disturb the nearest flakes without coupling them to the camera.
    for(let i=0;i<66;i++) {
      const plane=i%3, factor=[.18,.57,.94][plane];
      const flow=reducedMotion?0:clock*(plane===1?-5:9+plane*4);
      let x=mod(i*79.31+flow+Math.sin((reducedMotion?0:clock)*.21+i)*9,480)-30;
      let y=mod(i*147.17-camera*factor+(reducedMotion?0:clock*(5+plane*4)),height+180)-90;
      const dx=x-projectedGust.x,dy=y-projectedGust.y;
      // Only foreground flakes share the creature's pocket of air. Distant ash
      // continues its drift rather than jumping with a screen-space impulse.
      const force=plane===2?projectedGust.strength*Math.exp(-(dx*dx+dy*dy)/6400):0;
      x+=dx*force*.23;y+=dy*force*.23;
      const size=plane===2?1.1:.45+plane*.25;
      const lit=plane===2?sampleLight(x,y+game.cameraY):0;
      c.globalAlpha=(.15+plane*.09)*(plane===2?.62+lit*1.85:1);
      c.fillStyle=lit>.12?'#f4f0dd':i%4===0?'#41494a':'#c4c9c5';
      c.save();c.translate(x,y);c.rotate(i+clock*(reducedMotion?0:.5));
      c.fillRect(-size,-size*.25,size*2,size*.65);c.restore();
    }
    c.globalAlpha=1;
  }

  function drawNear(c, game, reducedMotion) {
    const camera = reducedMotion ? game.height - height : game.cameraY;
    foreground.draw(c,camera,height,viewpoint,lastClock,reducedMotion,projectedGust);
  }

  return {
    resize(value) { height=value;flocks.resize(value); }, drawBehind, drawNear,
    reset() {flocks.reset();gust.age=10;viewpoint=0;},
    emit(events) { for(const e of events) {
      if(e.type==='checkpoint'||e.type==='win'||(e.type==='land'&&e.landingSeverity>.60)) flocks.startle();
      if(['land','doubleJump','wallJump'].includes(e.type)) {
        gust.x=e.x;gust.y=e.y;gust.age=0;
        gust.strength=e.type==='land' ? .02+.8*Math.max(0,Math.min(1,e.landingSeverity??((e.intensity??1)-.18)/1.07))
          : e.type==='doubleJump'?.9:Math.min(.85,(e.intensity||1)*.65);
      }
    } },
  };
}
