(() => {
// Curved stems, ink veins and loose petals share one wind cycle.
const canvas = document.getElementById('night-garden');
const ctx = canvas.getContext('2d');
const quiet = matchMedia('(prefers-reduced-motion: reduce)');
let width, height, frame, time = 0, last = 0;
const overlay = canvas.classList.contains('garden-overlay');
const cursor = { x: 0, y: 0, active: false };
const petals = Array.from({length: 23}, () => ({dx: 0, dy: 0, shrink: 1}));
const blooms = [
  [.91,.25,65,-.4], [.84,.43,42,.3], [1.02,.52,83,-.6],
  [.055,.77,46,.5], [-.025,.52,70,-.3], [.145,.95,29,.3]
 ];
const flowers = blooms.map(() => ({retreat: 0}));

function retreat(state, x, y, dt) {
  const rx = x - cursor.x, ry = y - cursor.y;
  const distance = Math.hypot(rx, ry);
  const proximity = cursor.active ? Math.max(0, 1 - distance / 120) : 0;
  const angle = distance ? Math.atan2(ry, rx) : -Math.PI / 2;
  const ease = 1 - Math.exp(-7 * dt);
  state.dx += (Math.cos(angle) * proximity * 65 - state.dx) * ease;
  state.dy += (Math.sin(angle) * proximity * 65 - state.dy) * ease;
  state.shrink += (1 - proximity * .28 - state.shrink) * ease;
}

function petal(length, breadth, tone) {
  ctx.fillStyle = tone;
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.bezierCurveTo(-breadth,-length*.32,-breadth*.93,-length*1.19,-breadth*.19,-length);
  ctx.bezierCurveTo(breadth*.36,-length*1.14,breadth,-length*.65,0,0);
  ctx.fill();
  ctx.strokeStyle = '#45253580';
  ctx.lineWidth = .75;
  for (const bend of [-.46,0,.36]) {
    ctx.beginPath(); ctx.moveTo(0,0);
    ctx.quadraticCurveTo(bend*breadth,-length*.43,bend*breadth*.87,-length*.86);
    ctx.stroke();
  }
}

function garden(t, dt = 0) {
  ctx.clearRect(0,0,width,height);
  const scale = Math.min(1.4,Math.max(.53,width/1120));
  ctx.globalAlpha = overlay ? .72 : 1;
  for (const [index, [u,v,r,tilt]] of blooms.entries()) {
    const sway = Math.sin(t*.65 + r)*8;
    const margin = Math.min(width * .065, 85);
    const stemX = overlay ? (u > .5 ? width - (1-u)*6*margin : u*6*margin) : width*u;
    const flower = flowers[index];
    const tipX = stemX + sway, tipY = height*v;
    const distance = Math.hypot(tipX - cursor.x, tipY - cursor.y);
    const proximity = cursor.active ? Math.max(0, 1 - distance / 150) : 0;
    flower.retreat += (proximity * .22 - flower.retreat) * (1 - Math.exp(-5 * dt));
    const root = width*(u>.5?1.04:-.02);
    const points = [
      [root, height*1.1],
      [root-40*scale, height*.83],
      [tipX+58*scale, tipY+110*scale],
      [tipX, tipY]
    ];
    // Subdivide the stem curve: its shortened endpoint carries the flower.
    const amount = 1 - flower.retreat;
    const mix = (a, b) => [a[0]+(b[0]-a[0])*amount, a[1]+(b[1]-a[1])*amount];
    const a = mix(points[0], points[1]), b = mix(points[1], points[2]);
    const c = mix(points[2], points[3]);
    const d = mix(a, b), e = mix(b, c), tip = mix(d, e);
    const turn = Math.atan2(tip[1]-d[1],tip[0]-d[0]) -
      Math.atan2(tipY-points[2][1],tipX-points[2][0]);
    ctx.strokeStyle = '#b59a72'; ctx.lineWidth = 1.3*scale;
    ctx.beginPath(); ctx.moveTo(...points[0]);
    ctx.bezierCurveTo(...a,...d,...tip); ctx.stroke();
    ctx.save(); ctx.translate(...tip); ctx.rotate(tilt+sway*.009+turn); ctx.scale(scale,scale*.72);
    for(let i=0;i<7;i++){
      ctx.save(); ctx.rotate(i*Math.PI*2/7);
      petal(r*(1+.12*Math.sin(i*3+r)),r*.55,['#bb797b','#d2958c','#e1aaa0','#ac6a76'][i%4]); ctx.restore();
    }
    ctx.fillStyle='#392130'; ctx.beginPath(); ctx.arc(0,0,r*.15,0,2*Math.PI);ctx.fill();
    for(let j=0;j<15;j++){
      const a=j*2.4, radius=Math.sqrt(j)*r*.05;
      ctx.fillStyle='#e6c38a';ctx.fillRect(Math.cos(a)*radius,Math.sin(a)*radius,1.8,2.5);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for(let i=0;i<petals.length;i++){
    const progress=(i*.618034+t*(.024+i%3*.008))%1;
    const x=(i*.381966%1)*width+Math.sin(progress*5+i)*44+progress*50;
    const y=progress*(height+70)-35;
    const p = petals[i];
    retreat(p, x, y, dt);
    ctx.save();ctx.translate(x+p.dx,y+p.dy);ctx.rotate(i+progress*5+Math.sin(t*.8+i)*.3);
    ctx.scale(p.shrink,p.shrink);
    ctx.scale(.25+.75*Math.abs(Math.cos(progress*6+i)),1);
    petal((7+i%5*2)*scale, (4+i%3)*scale, ['#d19c7980','#b778848f','#f5c9a36a'][i%3]);ctx.restore();
  }
}
function tick(now){
  const dt = last ? Math.min(now-last,48)/1000 : 0;
  time += dt; last = now;
  garden(time, dt);frame=requestAnimationFrame(tick);
}
function sync(){
  cancelAnimationFrame(frame);last=0;
  width=innerWidth;height=innerHeight;
  const ratio=Math.min(devicePixelRatio,2);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);garden(time);
  if(!quiet.matches&&!document.hidden)frame=requestAnimationFrame(tick);
}
function follow(event) {
  cursor.x = event.clientX;
  cursor.y = event.clientY;
  cursor.active = true;
}
addEventListener('pointermove', follow, {passive:true});
addEventListener('pointerdown', follow, {passive:true});
addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') cursor.active = false; });
addEventListener('pointercancel', () => { cursor.active = false; });
document.documentElement.addEventListener('pointerleave', () => { cursor.active = false; });
addEventListener('blur', () => { cursor.active = false; });
addEventListener('resize',sync);document.addEventListener('visibilitychange',sync);quiet.addEventListener('change',sync);sync();
})();
