(() => {
  if (new URLSearchParams(location.search).has('picked')) {
    document.body.classList.add('picked');
    document.querySelector('h1').textContent = 'Four little charms';
    document.querySelector('header p').textContent = 'A closer look at the four you picked. Flick, wave, tap.';
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const jelly = document.getElementById('jelly');
  let wobble;
  jelly.addEventListener('click', () => {
    wobble?.cancel();
    if (reduced.matches) return;
    wobble = jelly.animate([
      {transform:'scale(1.15,.72) rotate(-2deg)'},
      {transform:'scale(.89,1.13) rotate(3deg)',offset:.25},
      {transform:'scale(1.07,.94) rotate(-2deg)',offset:.5},
      {transform:'scale(.98,1.03) rotate(1deg)',offset:.75},
      {transform:'scale(1) rotate(0)'}
    ],{duration:1000,easing:'ease-out'});
  });

  const sheet = document.getElementById('bubble-sheet');
  let popped = 0;
  for (let i=0;i<12;i++) {
    const bubble = document.createElement('button');
    bubble.className='bubble';bubble.type='button';
    bubble.setAttribute('aria-label','Pop bubble '+(i+1));
    bubble.setAttribute('aria-pressed','false');
    bubble.addEventListener('click',()=>{
      if(bubble.classList.contains('popped'))return;
      bubble.classList.add('popped');bubble.setAttribute('aria-pressed','true');popped++;
      document.getElementById('pop-count').textContent=popped===12?'All popped. Fresh sheet?':popped+' of 12 popped.';
    });
    sheet.append(bubble);
  }
  document.getElementById('fresh-wrap').addEventListener('click',()=>{
    popped=0;sheet.querySelectorAll('button').forEach(b=>{b.classList.remove('popped');b.setAttribute('aria-pressed','false')});
    document.getElementById('pop-count').textContent='12 little bubbles.';
  });

  function rotor(element, friction) {
    let angle=0, speed=0, frame=0, last=0, pointer=null, previousAngle=0, previousTime=0, dragged=false;
    function paint(){
      element.style.transform='rotate('+angle+'rad)';
      element.style.setProperty('--counter-rotation',(-angle)+'rad');
    }
    function tick(now) {
      frame=0;
      const dt=last?Math.min((now-last)/1000,.04):0;last=now;
      angle+=speed*dt;speed*=Math.exp(-friction*dt);paint();
      if(Math.abs(speed)>.015&&!document.hidden&&!reduced.matches&&pointer===null)frame=requestAnimationFrame(tick);
    }
    function spin(push) {
      if(reduced.matches){angle+=push*.15;paint();return;}
      speed=Math.max(-25,Math.min(25,speed+push));
      if(!frame&&pointer===null){last=0;frame=requestAnimationFrame(tick)}
    }
    function point(event) {
      const box=element.getBoundingClientRect();
      return Math.atan2(event.clientY-box.y-box.height/2,event.clientX-box.x-box.width/2);
    }
    element.addEventListener('click',()=>{if(dragged){dragged=false;return;}spin(12)});
    element.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();spin(event.key==='ArrowLeft'?-8:8)}
    });
    element.addEventListener('pointerdown',event=>{
      if(event.button!==0||pointer!==null)return;
      pointer=event.pointerId;dragged=false;previousAngle=point(event);previousTime=performance.now();
      element.setPointerCapture(pointer);cancelAnimationFrame(frame);frame=0;speed=0;
    });
    element.addEventListener('pointermove',event=>{
      if(event.pointerId!==pointer)return;
      const next=point(event),now=performance.now();
      const distance=Math.atan2(Math.sin(next-previousAngle),Math.cos(next-previousAngle));
      if(Math.abs(distance)>.015)dragged=true;
      angle+=distance;speed=speed*.45+Math.max(-25,Math.min(25,distance/Math.max(.016,(now-previousTime)/1000)))*.55;
      previousAngle=next;previousTime=now;paint();
    });
    function release(event){
      if(event.pointerId!==pointer)return;
      speed*=Math.exp(-(performance.now()-previousTime)/140);
      pointer=null;spin(0);
    }
    for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,release);
    document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;last=0;if(!document.hidden)spin(0)});
    reduced.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;speed=0;paint()});
    paint();
    return {spin};
  }
  const disc=document.getElementById('disc');
  rotor(disc,.65);
  disc.addEventListener('pointermove',event=>{
    const box=disc.getBoundingClientRect();
    disc.style.setProperty('--light-x',Math.max(0,Math.min(100,(event.clientX-box.left)/box.width*100))+'%');
    disc.style.setProperty('--light-y',Math.max(0,Math.min(100,(event.clientY-box.top)/box.height*100))+'%');
  });
  disc.addEventListener('pointerleave',()=>{
    disc.style.setProperty('--light-x','30%');disc.style.setProperty('--light-y','24%');
  });
  const pinwheel=rotor(document.getElementById('pinwheel'),1.15);
  document.getElementById('pinwheel-stage').addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||event.buttons!==0)return;
    const box=document.getElementById('pinwheel').getBoundingClientRect();
    const distance=Math.hypot(event.clientX-box.x-box.width/2,event.clientY-box.y-box.height/2);
    const strength=Math.max(0,1-distance/145);
    pinwheel.spin(Math.max(-1.5,Math.min(1.5,(event.movementX*.045+event.movementY*.015)*strength)));
  });

  const lamp=document.getElementById('lava-lamp');
  const glows=[['Rose','#d994a4','#301e30'],['Amber','#d6ad69','#332429'],['Lilac','#b8a0c7','#27243a']];
  let glow=0;
  lamp.addEventListener('click',()=>{
    glow=(glow+1)%glows.length;
    const [name,color,sky]=glows[glow];
    lamp.style.setProperty('--lava',color);lamp.style.setProperty('--lamp-sky',sky);
    document.getElementById('lava-caption').textContent=name+' glow · tap to change';
    lamp.setAttribute('aria-label','Change lava lamp glow, currently '+name);
  });

  const jar=document.getElementById('firefly-jar'),flyArea=document.getElementById('fireflies');
  const flies=Array.from({length:9},(_,i)=>{
    const element=document.createElement('span');element.className='firefly';flyArea.append(element);
    return {element,x:50,y:50,dx:0,dy:0,vx:0,vy:0,jitterX:0,jitterY:0,targetX:0,targetY:0,dartIn:Math.random()*.4,phase:i*2.4};
  });
  let jarTap;
  jar.addEventListener('click',event=>{
    const box=flyArea.getBoundingClientRect();
    const x=event.detail ? (event.clientX-box.x)/box.width*100 : 50;
    const y=event.detail ? (event.clientY-box.y)/box.height*100 : 50;
    flies.forEach((fly,i)=>{
      const dx=fly.x-x,dy=fly.y-y;
      const theta=Math.hypot(dx,dy)>1?Math.atan2(dy,dx):i*2.4;
      const push=70+Math.max(0,45-Math.hypot(dx,dy));
      fly.vx=Math.cos(theta)*push;fly.vy=Math.sin(theta)*push;
      if(reduced.matches){fly.dx=Math.cos(theta)*13;fly.dy=Math.sin(theta)*13;}
    });
    jarTap?.cancel();
    if(!reduced.matches)jarTap=jar.animate([
      {transform:'rotate(0deg)'},{transform:'rotate(-.8deg)',offset:.25},
      {transform:'rotate(.5deg)',offset:.6},{transform:'rotate(0deg)'}
    ],{duration:420,easing:'ease-out'});
    paintFlies(time,0);
  });
  function paintFlies(t,dt) {
    for(const fly of flies) {
      if(dt>0){
        fly.dartIn-=dt;
        if(fly.dartIn<=0){
          const dart=Math.random()>.3;
          fly.targetX=dart?(Math.random()-.5)*15:fly.jitterX;
          fly.targetY=dart?(Math.random()-.5)*13:fly.jitterY;
          fly.dartIn=.12+Math.random()*.48;
        }
        const catchUp=1-Math.exp(-18*dt);
        fly.jitterX+=(fly.targetX-fly.jitterX)*catchUp;
        fly.jitterY+=(fly.targetY-fly.jitterY)*catchUp;
      }
      fly.vx+=(-fly.dx*4-fly.vx*3)*dt;fly.vy+=(-fly.dy*4-fly.vy*3)*dt;
      fly.dx+=fly.vx*dt;fly.dy+=fly.vy*dt;
      fly.x=Math.max(5,Math.min(94,50+Math.sin(t*.36+fly.phase)*27+Math.cos(t*.61+fly.phase)*6+fly.dx+fly.jitterX));
      fly.y=Math.max(5,Math.min(94,50+Math.cos(t*.29+fly.phase)*29+Math.sin(t*.73+fly.phase)*4+fly.dy+fly.jitterY));
      fly.element.style.left=fly.x+'%';fly.element.style.top=fly.y+'%';
      fly.element.style.opacity=String(.25+.75*((Math.sin(t*(.7+(fly.phase%3)*.1)+fly.phase)+1)/2)**2);
    }
  }

  const beadStage=document.getElementById('bead-stage'),ctx=beadStage.querySelector('canvas').getContext('2d');
  const colors=['#a2697a','#e1c896','#94a696','#72465b','#c09c70'];
  const nodes=Array.from({length:7},(_,i)=>({x:20+i*320/6,y:30+Math.sin(i/6*Math.PI)*75,vx:0,vy:0}));
  let held=null;
  for(let i=1;i<6;i++){
    const bead=document.createElement('button');bead.type='button';bead.className='bead';
    bead.style.setProperty('--bead',colors[i-1]);bead.setAttribute('aria-label','Move bead '+i);
    nodes[i].element=bead;beadStage.append(bead);
    bead.addEventListener('pointerdown',event=>{
      if(event.button!==0||held)return;
      held={i,pointer:event.pointerId};bead.setPointerCapture(event.pointerId);
    });
    bead.addEventListener('pointermove',event=>{
      if(!held||held.pointer!==event.pointerId||held.i!==i)return;
      const box=beadStage.getBoundingClientRect();
      nodes[i].x=Math.max(16,Math.min(344,(event.clientX-box.x)/box.width*360));
      nodes[i].y=Math.max(16,Math.min(164,(event.clientY-box.y)/box.height*180));
      nodes[i].vx=0;nodes[i].vy=0;
      if(reduced.matches){solveBeads();paintBeads();}
    });
    function release(event){if(held?.i===i&&held.pointer===event.pointerId)held=null;}
    for(const event of ['pointerup','pointercancel','lostpointercapture'])bead.addEventListener(event,release);
    bead.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();
      const dx=event.key==='ArrowLeft'?-10:event.key==='ArrowRight'?10:0;
      const dy=event.key==='ArrowUp'?-10:event.key==='ArrowDown'?10:0;
      nodes[i].x+=dx;nodes[i].y+=dy;nodes[i].vx+=dx*8;nodes[i].vy+=dy*8;
      if(reduced.matches){solveBeads();paintBeads();}
    });
  }
  function fixed(i){return i===0||i===6||held?.i===i;}
  function solveBeads(){
    for(let pass=0;pass<8;pass++){
      for(let i=0;i<6;i++){
        const a=nodes[i],b=nodes[i+1],dx=b.x-a.x,dy=b.y-a.y;
        const distance=Math.hypot(dx,dy)||1,correction=(distance-65)/distance;
        const wa=fixed(i)?0:1,wb=fixed(i+1)?0:1,total=wa+wb;
        if(!total)continue;
        a.x+=dx*correction*wa/total;a.y+=dy*correction*wa/total;
        b.x-=dx*correction*wb/total;b.y-=dy*correction*wb/total;
      }
    }
    for(let i=1;i<6;i++){nodes[i].x=Math.max(16,Math.min(344,nodes[i].x));nodes[i].y=Math.max(16,Math.min(164,nodes[i].y));}
  }
  function stepBeads(dt){
    const previous=nodes.map(n=>({x:n.x,y:n.y}));
    nodes.forEach((n,i)=>{if(!fixed(i)){n.vy+=650*dt;n.x+=n.vx*dt;n.y+=n.vy*dt}});
    solveBeads();
    if(dt>0)nodes.forEach((n,i)=>{if(!fixed(i)){n.vx=Math.max(-500,Math.min(500,(n.x-previous[i].x)/dt*.96));n.vy=Math.max(-500,Math.min(500,(n.y-previous[i].y)/dt*.96))}});
    paintBeads();
  }
  function paintBeads(){
    ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,360,180);
    ctx.strokeStyle='#a38460';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(nodes[0].x,nodes[0].y);
    for(let i=1;i<nodes.length;i++)ctx.lineTo(nodes[i].x,nodes[i].y);
    ctx.stroke();
    for(const node of nodes){if(node.element){node.element.style.left=node.x/360*100+'%';node.element.style.top=node.y/180*100+'%'}}
  }

  let frame=0,last=0,time=0;
  function tick(now){
    frame=0;const dt=last?Math.min((now-last)/1000,.032):0;last=now;time+=dt;
    if(!jar.closest('article').classList.contains('is-offscreen'))paintFlies(time,dt);
    if(!beadStage.closest('article').classList.contains('is-offscreen'))stepBeads(dt);
    if(!document.hidden&&!reduced.matches)frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;last=0;
    if(!document.hidden&&!reduced.matches)frame=requestAnimationFrame(tick);
    else {paintFlies(time,0);paintBeads();}
  }
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.classList.toggle('is-offscreen',!entry.isIntersecting)});
    document.querySelectorAll('article').forEach(article=>observer.observe(article));
  }
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',()=>{wobble?.cancel();jarTap?.cancel();sync()});
  paintFlies(0,0);paintBeads();sync();
})();
