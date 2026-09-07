/** Painted scenery planes. Full-resolution source silhouettes, cached focus. */
import { createFlocks } from './wildlife.js';
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
  let far, middle, near, belfry, gallery;
  const flocks = createFlocks();
  const gust = { x: 0, y: 0, age: 10, strength: 0 };
  const projectedGust = { x: 0, y: 0, strength: 0 };
  let farVersion, structureVersion, belfryVersion, nearVersion, galleryVersion;
  const aperture = light('239,237,226', .75);
  const shadow = light('9,12,16', .32);
  const fog = light('171,178,179', .20);
  const nearPlanes = [
    { x: -158, y: 4500, w: 258, flip: false },
    { x: 320, y: 3660, w: 258, flip: true },
    { x: -159, y: 2820, w: 258, flip: false },
    { x: 320, y: 1980, w: 258, flip: true },
    { x: -160, y: 1140, w: 258, flip: false },
    { x: 320, y: 300, w: 258, flip: true },
  ];
  // Solid crossings frame the more distant bell towers. The finite ends of
  // scenery exports disappear into air rather than forming rectangular caps.
  const middlePlanes = [
    { x: -10, y: 1650, w: 500, flip: false },
    { x: -85, y: 530, w: 470, flip: true },
    { x: -40, y: -214, w: 470, flip: false },
  ];
  const galleries = [
    { x: -85, y: 950, w: 630, flip: false },
    { x: -195, y: 100, w: 730, flip: true },
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
      middle = fadeFoundation(grade(structure, 57, 119, .65, 15, 105), .82, .14);

    }
    if (assets['charcoal-architecture'] && assets['charcoal-architecture'] !== nearVersion) {
      nearVersion = assets['charcoal-architecture'];
      const fragment = canvas(740,315);
      fragment.getContext('2d').drawImage(nearVersion,40,80,740,315,0,0,740,315);
      near = grade(fragment,3,15,5,15,105);
    }
    if (assets['charcoal-arcade'] && assets['charcoal-arcade'] !== galleryVersion) {
      galleryVersion=assets['charcoal-arcade'];
      gallery=fadeFoundation(grade(galleryVersion,119,159,.55,15,140),.78);
    }
    if (assets['charcoal-belfry'] && assets['charcoal-belfry'] !== belfryVersion) {
      belfryVersion = assets['charcoal-belfry'];
      belfry = fadeFoundation(grade(belfryVersion, 109, 168, 1.6, 15, 110), .64);
    }
  }

  function planes(c, image, list, camera, factor) {
    if (!image) return;
    for (const item of list) {
      const h = item.w * image.height / image.width;
      const y = item.y - camera * factor;
      if (y > height + 10 || y + h < -10) continue;
      const x = item.x - viewpoint * factor;
      if (gpuActive) { atmosphere.image(image, x, y, item.w, h, item.flip); continue; }
      c.save(); c.translate(x + (item.flip ? item.w : 0), y);
      if (item.flip) c.scale(-1, 1);
      c.drawImage(image, 0, 0, item.w, h);
      c.restore();
    }
  }

  function drawBehind(c, game, clock, reducedMotion) {
    prepare();
    const origin = game.height - height;
    const camera = reducedMotion ? origin : game.cameraY;
    const dt = Math.max(0, Math.min(.05, clock - lastClock)); lastClock = clock;
    gust.age += dt;
    projectedGust.x = gust.x;
    projectedGust.y = gust.y - game.cameraY;
    projectedGust.strength = reducedMotion ? 0 : gust.strength * Math.exp(-gust.age * 2.7);
    viewpoint += ((reducedMotion ? 0 : (game.player.x - 198) * .10) - viewpoint) * (1 - Math.exp(-dt * 4));
    flocks.update(dt, clock, reducedMotion);
    gpuActive = atmosphere?.begin(camera * .24, reducedMotion ? 0 : clock, false, projectedGust, camera) || false;
    // Native aspect: preserve the actual city's spires, arches and distant light.
    const farWidth = 535, farHeight = far ? farWidth * far.height / far.width : height;
    const farY = -28 - (camera-origin)*.028;
    if (gpuActive) {
      if (far) atmosphere.image(far,-58-viewpoint*.03,farY,farWidth,farHeight);
      atmosphere.air(camera*.035,.25,0);
      planes(c,gallery,galleries,camera,.12);
      flocks.draw(c,atmosphere,camera,origin,clock,reducedMotion);
      planes(c,belfry,belfries,camera,.22);
      atmosphere.air(camera*.28,.90,1);
      planes(c,middle,middlePlanes,camera,.50);
      atmosphere.air(camera*.62,.34,2);
      gpuActive=false;
    } else {
      c.fillStyle='#b0b9bb';c.fillRect(0,0,W,height);
      if(far)c.drawImage(far,-58-viewpoint*.03,farY,farWidth,farHeight);
      planes(c,gallery,galleries,camera,.12);
      flocks.draw(c,null,camera,origin,clock,reducedMotion);
      planes(c,belfry,belfries,camera,.22);
      c.drawImage(aperture,30,990-camera*.15-400,440,750);
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
      const force=projectedGust.strength*Math.exp(-(dx*dx+dy*dy)/10000);
      x+=dx*force*.23;y+=dy*force*.23;
      const size=plane===2?1.1:.45+plane*.25;
      c.globalAlpha=.15+plane*.09;
      c.fillStyle=i%4===0?'#41494a':'#f0efe5';
      c.save();c.translate(x,y);c.rotate(i+clock*(reducedMotion?0:.5));
      c.fillRect(-size,-size*.25,size*2,size*.65);c.restore();
    }
    c.globalAlpha=1;
  }

  function drawNear(c, game, reducedMotion) {
    if (!near) return;
    const camera = reducedMotion ? game.height - height : game.cameraY;
    c.save(); c.beginPath();
    c.rect(0, 0, 92, height); c.rect(328, 0, 92, height); c.clip();
    planes(c, near, nearPlanes, camera, 1.18);
    c.restore();
  }

  return {
    resize(value) { height=value;flocks.resize(value); }, drawBehind, drawNear,
    reset() {flocks.reset();gust.age=10;viewpoint=0;},
    emit(events) { for(const e of events) if(['land','doubleJump','wallJump'].includes(e.type)) {
      gust.x=e.x;gust.y=e.y;gust.age=0;gust.strength=e.type==='doubleJump'?1.8:Math.min(1.5,e.intensity||1);
    } },
  };
}
