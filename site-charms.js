(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
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


  let frame=0,last=0,time=0;
  function tick(now){
    frame=0;const dt=last?Math.min((now-last)/1000,.032):0;last=now;time+=dt;
    if(!jar.closest('.site-charm').classList.contains('is-offscreen'))paintFlies(time,dt);
    if(!document.hidden&&!reduced.matches)frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;last=0;
    if(!document.hidden&&!reduced.matches)frame=requestAnimationFrame(tick);
    else paintFlies(time,0);
  }
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.classList.toggle('is-offscreen',!entry.isIntersecting)});
  document.querySelectorAll('.site-charm').forEach(charm=>observer.observe(charm));
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',()=>{jarTap?.cancel();sync()});
  paintFlies(0,0);sync();
})();
