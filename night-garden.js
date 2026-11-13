(() => {
// Curved stems, ink veins and loose petals share one wind cycle.
const canvas = document.getElementById('night-garden');
const ctx = canvas.getContext('2d');
const quiet = matchMedia('(prefers-reduced-motion: reduce)');
let width, height, frame, time = 0, last = 0;
const overlay = canvas.classList.contains('garden-overlay');
const cursor = { x: 0, y: 0, active: false };
const random=(min,max)=>min+Math.random()*(max-min);
function seedDrifter(state,whole,initial=false){
  const duration=whole?random(34,56):random(22,43);
  Object.assign(state,{duration,age:initial?random(0,duration):-random(whole?2:.15,whole?10:2.8),startX:random(.03,.97),drift:random(-100,100),sway:random(18,65),windSpeed:random(.18,.55),phase:random(0,Math.PI*2),spin:random(-.75,.75),flutter:random(.35,.9),radius:whole?random(20,27):random(7,17),breadth:random(.35,.62),color:Math.floor(random(0,4)),seed:random(0,10),dx:0,dy:0,pose:null});
  return state;
}
function advanceDrifter(state,whole,dt){state.age+=dt;if(state.age>state.duration)seedDrifter(state,whole);return state.age>=0}
const petals=Array.from({length:34},()=>seedDrifter({},false,true));
const driftingFlowers=Array.from({length:3},()=>seedDrifter({},true,true));
const driftingTones=['#c98f9e','#e1aaa0','#b77f9d','#deb9b0'];
const blooms = [
  [.91,.25,65,-.4], [.84,.43,42,.3], [1.02,.52,83,-.6],
  [.055,.77,46,.5], [-.025,.52,70,-.3], [.145,.95,29,.3]
 ];
const flowers = blooms.map(() => ({dx:0,dy:0}));
const keyHints=['↑','↑','↓','↓','←','→','←','→','B','A'];
const hintInterval=6,hintDuration=24;
let hintTime=0,heldHint=null,nextInput='↑';
const whisper=document.createElement('div');whisper.className='keycap-whisper';whisper.hidden=true;whisper.setAttribute('role','tooltip');
const nextKey=document.createElement('kbd');nextKey.textContent=nextInput;
const keyFeedback=document.createElement('span');keyFeedback.className='keycap-feedback';keyFeedback.setAttribute('role','status');
let flashTimer,feedbackTimer;
addEventListener('konami-step',()=>{
  clearTimeout(flashTimer);clearTimeout(feedbackTimer);nextKey.textContent=nextInput;keyFeedback.textContent='';whisper.dataset.feedback='flash';
  flashTimer=setTimeout(()=>{whisper.dataset.feedback='correct';keyFeedback.textContent='✓'},55);
  feedbackTimer=setTimeout(()=>{delete whisper.dataset.feedback;keyFeedback.textContent='';nextKey.textContent=nextInput},260);
});
whisper.append(document.createTextNode("hm? what's this? maybe try "),nextKey,document.createTextNode('?'),keyFeedback);document.body.append(whisper);
addEventListener('konami-progress',event=>{
  nextInput={arrowup:'↑',arrowdown:'↓',arrowleft:'←',arrowright:'→',b:'B',a:'A'}[event.detail.next]||'↑';
  if(!whisper.dataset.feedback)nextKey.textContent=nextInput;
});
function updateWhisper(hints){
  const hit=!burst&&cursor.active?hints.find(h=>h.fade>.15&&Math.hypot(cursor.x-h.x,cursor.y-h.y)<h.radius+14):null;
  heldHint=hit||null;whisper.hidden=!hit;
  if(!hit)return;
  const box=whisper.getBoundingClientRect(),left=Math.max(12,Math.min(width-box.width-12,hit.x-box.width/2));
  let top=hit.y-hit.radius-box.height-14;
  const below=top<12;if(below)top=hit.y+hit.radius+14;
  whisper.dataset.side=below?'below':'above';whisper.style.left=Math.round(left)+'px';whisper.style.top=Math.round(Math.max(12,Math.min(height-box.height-12,top)))+'px';
  whisper.style.setProperty('--tip-x',Math.max(14,Math.min(box.width-14,hit.x-left))+'px');
}
let quiverStart=-10,quiverPower=0,burst=null,petalsReleased=false;
function finishBurst(){
  if(!burst)return;const id=burst.id;burst=null;
  queueMicrotask(()=>dispatchEvent(new CustomEvent('konami-burst-end',{detail:{id}})));
}
addEventListener('konami-burst',event=>{
  heldHint=null;whisper.hidden=true;
  if(quiet.matches){queueMicrotask(()=>dispatchEvent(new CustomEvent('konami-burst-end',{detail:{id:event.detail.id}})));return}
  const particles=[],speed=Math.max(width,height)*1.25;
  for(const [index,flower] of flowers.entries()){
    const pose=flower.pose;if(!pose)continue;const r=blooms[index][2];
    for(let j=0;j<7;j++){
      const angle=j*Math.PI*2/7,ux=Math.sin(angle)*pose.sx,uy=-Math.cos(angle)*pose.sy;
      const dx=Math.cos(pose.turn)*ux-Math.sin(pose.turn)*uy,dy=Math.sin(pose.turn)*ux+Math.cos(pose.turn)*uy,length=Math.hypot(dx,dy);
      particles.push({...pose,inner:angle,vx:dx/length*speed,vy:dy/length*speed,spin:(j%2?1:-1)*(.5+j*.12),length:r*(1+.12*Math.sin(j*3+r)),breadth:r*.55,tone:['#bb797b','#d2958c','#e1aaa0','#ac6a76'][j%4],alpha:overlay ? .72 : 1});
    }
  }
  // The loose petals already drifting across the screen leave with the blossoms too.
  for(const [i,p] of petals.entries())if(p.pose){
    const angle=Math.atan2(p.pose.y-height*.5,p.pose.x-width*.5);
    particles.push({...p.pose,inner:0,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,spin:(i%2?1:-1)*1.2,alpha:1});
  }
  for(const [i,flower] of driftingFlowers.entries())if(flower.pose){
    const pose=flower.pose,angle=Math.atan2(pose.y-height*.5,pose.x-width*.5);
    for(let j=0;j<7;j++)particles.push({...pose,inner:j*Math.PI*2/7,vx:Math.cos(angle+(j-3)*.15)*speed,vy:Math.sin(angle+(j-3)*.15)*speed,spin:(j%2?1:-1)*.9,length:pose.r*(1+.08*Math.sin(j*2+pose.seed)),breadth:pose.r*.5,tone:driftingTones[(j+pose.color)%4]});
  }
  petalsReleased=true;burst={id:event.detail.id,elapsed:0,particles};garden(time,0);
});
addEventListener('ascii-mode-change',event=>{if(!event.detail.enabled)petalsReleased=false});
addEventListener('garden-intro-start',()=>{petalsReleased=false});

addEventListener('konami-step',event=>{
  if(quiet.matches)return;
  quiverStart=time;quiverPower=event.detail.complete?1.65:1+event.detail.step*.025;
});

function retreat(state, x, y, dt, radius=120, strength=65) {
  const rx = x - cursor.x, ry = y - cursor.y;
  const distance = Math.hypot(rx, ry);
  const proximity = cursor.active ? Math.max(0, 1 - distance / radius) : 0;
  const angle = distance ? Math.atan2(ry, rx) : -Math.PI / 2;
  const ease = 1 - Math.exp(-7 * dt);
  state.dx += (Math.cos(angle) * proximity * strength - state.dx) * ease;
  state.dy += (Math.sin(angle) * proximity * strength - state.dy) * ease;
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
    const age=t-quiverStart;
    const quiver=age>=0&&age<.9?Math.sin(age*48+index*.7)*Math.exp(-age*7)*Math.min(1,age/.035)*quiverPower:0;
    const sway = Math.sin(t*.65 + r)*8+quiver*5;
    const margin = Math.min(width * .065, 85);
    const stemX = overlay ? (u > .5 ? width - (1-u)*6*margin : u*6*margin) : width*u;
    const flower = flowers[index];
    const tipX = stemX + sway, tipY = height*v+quiver*1.8;
    retreat(flower,tipX,tipY,dt,150,75);
    const root=width*(u>.5?1.04:-.02);
    const a=[root-40*scale,height*.83];
    const d=[tipX+58*scale+flower.dx*.65,tipY+110*scale+flower.dy*.65];
    const tip=[tipX+flower.dx,tipY+flower.dy];
    flower.x=tip[0];flower.y=tip[1];
    const turn=Math.atan2(tip[1]-d[1],tip[0]-d[0])-Math.atan2(-110*scale,-58*scale);
    ctx.strokeStyle = '#b59a72'; ctx.lineWidth = 1.3*scale;
    ctx.beginPath(); ctx.moveTo(root,height*1.1);
    ctx.bezierCurveTo(...a,...d,...tip); ctx.stroke();
    flower.pose={x:tip[0],y:tip[1],turn:tilt+sway*.009+turn,sx:scale,sy:scale*.72};
    ctx.globalAlpha=overlay ? .72 : 1;
    ctx.save(); ctx.translate(...tip); ctx.rotate(tilt+sway*.009+turn); ctx.scale(scale,scale*.72);
    if(!petalsReleased)for(let i=0;i<7;i++){
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
  if(!petalsReleased)for(const p of petals){
    p.pose=null;if(!advanceDrifter(p,false,dt))continue;
    const progress=p.age/p.duration;
    const x=p.startX*width+Math.sin(p.age*p.windSpeed+p.phase)*p.sway+progress*p.drift,y=progress*(height+100)-50;
    retreat(p,x,y,dt);
    const turn=p.phase+p.age*p.spin,sx=.25+.75*Math.abs(Math.cos(p.age*p.flutter+p.phase));
    const length=p.radius*scale,breadth=length*p.breadth,tone=['#d19c7980','#b778848f','#f5c9a36a'][p.color%3];
    p.pose={x:x+p.dx,y:y+p.dy,turn,sx,sy:1,length,breadth,tone};
    ctx.save();ctx.translate(x+p.dx,y+p.dy);ctx.rotate(turn);ctx.scale(sx,1);petal(length,breadth,tone);ctx.restore();
  }
  // Independent lifetimes and fresh paths keep whole blossoms from repeating a loop.
  if(!petalsReleased)for(const flower of driftingFlowers){
    flower.pose=null;if(!advanceDrifter(flower,true,dt))continue;
    const progress=flower.age/flower.duration;
    const x=flower.startX*width+Math.sin(flower.age*flower.windSpeed+flower.phase)*flower.sway+progress*flower.drift,y=progress*(height+110)-55;
    retreat(flower,x,y,dt);
    const r=flower.radius*scale,turn=flower.phase+flower.age*flower.spin*.45;
    const sx=1,sy=.7+.15*Math.sin(flower.age*flower.flutter+flower.phase);
    const alpha=Math.min(1,progress*8,(1-progress)*8)*.5;
    flower.pose={x:x+flower.dx,y:y+flower.dy,turn,sx,sy,r,alpha,seed:flower.seed,color:flower.color};
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x+flower.dx,y+flower.dy);ctx.rotate(turn);ctx.scale(sx,sy);
    for(let j=0;j<7;j++){ctx.save();ctx.rotate(j*Math.PI*2/7);petal(r*(1+.08*Math.sin(j*2+flower.seed)),r*.5,driftingTones[(j+flower.color)%4]);ctx.restore()}
    ctx.fillStyle='#493044';ctx.beginPath();ctx.arc(0,0,r*.16,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e8c98c';for(let j=0;j<6;j++)ctx.fillRect(Math.cos(j*2.4)*r*.1,Math.sin(j*2.4)*r*.1,1.2,1.6);
    ctx.restore();
  }
  // An ordered trail, beginning with the first Up and capped at four keycaps.
  if(heldHint&&(!cursor.active||Math.hypot(cursor.x-heldHint.x,cursor.y-heldHint.y)>heldHint.radius+14))heldHint=null;
  if(!heldHint)hintTime+=dt;
  const hintPositions=[],latest=Math.floor(hintTime/hintInterval);
  for(let sequence=Math.max(0,latest-Math.ceil(hintDuration/hintInterval)+1);sequence<=latest;sequence++){
    const age=hintTime-sequence*hintInterval;if(age<0||age>hintDuration)continue;
    const progress=age/hintDuration,i=sequence%2;
    const x=width*(.24+i*.5)+Math.sin(progress*6+i*2)*32;
    const y=progress*(height+100)-50,radius=Math.max(10,Math.min(13,11*scale));
    const label=keyHints[sequence%keyHints.length];
    const fade=Math.min(1,progress*9,(1-progress)*9);
    hintPositions.push({x,y,radius,fade});
    const darkHint=document.documentElement.dataset.theme==='dark'||document.documentElement.classList.contains('textmode-active');
    ctx.save();ctx.globalAlpha=fade*(darkHint?.22:.48);ctx.translate(x,y);ctx.rotate(Math.sin(t*.5+i)*.2);
    ctx.fillStyle=darkHint?'#f4eddf55':'#e4d2bc';ctx.strokeStyle=darkHint?'#b58b8d88':'#81465e';ctx.lineWidth=darkHint?.75:1;
    ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#fff9ed55';ctx.beginPath();ctx.arc(-.6,-.7,radius-2,Math.PI*1.08,Math.PI*1.88);ctx.stroke();
    ctx.fillStyle=darkHint?'#dec18b':'#633b50';ctx.font='500 '+Math.round(radius*1.1)+"px 'Geist Mono',monospace";ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,0,.5);ctx.restore();
  }

  updateWhisper(hintPositions);
  if(burst){
    burst.elapsed+=dt;const age=burst.elapsed,travel=age*.7+age*age*.7;let allGone=true;
    for(const p of burst.particles){
      const x=p.x+p.vx*travel,y=p.y+p.vy*travel;
      const radius=p.length*Math.max(p.sx,p.sy)*1.35;
      if(x+radius>0&&x-radius<width&&y+radius>0&&y-radius<height)allGone=false;
      ctx.save();ctx.globalAlpha=p.alpha;ctx.translate(x,y);ctx.rotate(p.turn+age*p.spin);
      ctx.scale(p.sx,p.sy);ctx.rotate(p.inner);petal(p.length,p.breadth,p.tone);ctx.restore();
    }
    if((age>=.95&&allGone)||age>=1.45)finishBurst();
  }


}
function tick(now){
  const dt = last ? Math.min(now-last,48)/1000 : 0;
  time += dt; last = now;
  garden(time, dt);frame=requestAnimationFrame(tick);
}
function sync(){
  if(quiet.matches)finishBurst();
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
