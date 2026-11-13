  const limit = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const ease = n => { n = limit(n); return n * n * (3 - 2 * n); };
  const phase = (t, start, duration) => ease((t - start) / duration);
  const mix = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const flowers = [
    {x:48,y:165,root:-12,r:43,turn:-.3},
    {x:558,y:104,root:620,r:51,turn:.4},
    {x:520,y:249,root:616,r:30,turn:-.5},
    {x:113,y:309,root:-8,r:24,turn:.6}
  ];

  function petalPath(ctx, length, breadth) {
    ctx.beginPath();ctx.moveTo(0,0);
    ctx.bezierCurveTo(-breadth,-length*.32,-breadth*.93,-length*1.19,-breadth*.19,-length);
    ctx.bezierCurveTo(breadth*.36,-length*1.14,breadth,-length*.65,0,0);
  }

  function petal(ctx, length, breadth, color, ink = false) {
    petalPath(ctx, length, breadth);
    if (color) {ctx.fillStyle=color;ctx.fill();}
    ctx.strokeStyle=ink?'#c5a268':'#623744';ctx.lineWidth=.7;ctx.stroke();
    for (const offset of [-.4,0,.3]) {
      ctx.beginPath();ctx.moveTo(0,0);
      ctx.quadraticCurveTo(offset*breadth,-length*.4,offset*breadth*.8,-length*.84);
      ctx.stroke();
    }
  }

  function flower(ctx, f, growth, opening, wind, ink = false, pigment = 1, height = 360) {
    const p0=[f.root,height+30],p1=[f.root-30,300],p2=[f.x+35,f.y+64],p3=[f.x+wind,f.y];
    const a=mix(p0,p1,growth),b=mix(p1,p2,growth),c=mix(p2,p3,growth);
    const d=mix(a,b,growth),e=mix(b,c,growth),tip=mix(d,e,growth);
    ctx.strokeStyle='#b59a72';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(...p0);ctx.bezierCurveTo(...a,...d,...tip);ctx.stroke();
    if (growth < .04) return;
    ctx.save();ctx.translate(...tip);
    ctx.rotate(f.turn+Math.atan2(tip[1]-d[1],tip[0]-d[0])-Math.atan2(p3[1]-p2[1],p3[0]-p2[0]));
    ctx.scale(.16+.84*opening,.75);
    for(let i=0;i<7;i++){
      ctx.save();ctx.rotate(i*Math.PI*2/7*opening);
      const color=['#bb797b','#d2958c','#e1aaa0','#ac6a76'][i%4];
      if (ink) {
        petal(ctx,f.r*(1+.1*Math.sin(i*3)),f.r*.55,null,true);
        ctx.globalAlpha*=pigment;
      }
      if (!ink || pigment > 0) petal(ctx,f.r*(1+.1*Math.sin(i*3)),f.r*.55,color);
      ctx.restore();
    }
    ctx.fillStyle='#392130';ctx.beginPath();ctx.arc(0,0,f.r*.13,0,2*Math.PI);ctx.fill();
    for(let i=0;i<10;i++){ctx.fillStyle='#e6c38a';ctx.fillRect(Math.cos(i*2.4)*Math.sqrt(i)*f.r*.05,Math.sin(i*2.4)*Math.sqrt(i)*f.r*.05,1,2);}
    ctx.restore();
  }

  // Independent positions and timing avoid a diagonal procession in the intro.
  const introDrifters = Array.from({length:13}, () => ({
    x:Math.random()*600, phase:Math.random(), speed:.025+Math.random()*.025,
    sway:12+Math.random()*24, turn:Math.random()*Math.PI*2
  }));
  const breezePaths = [
    {delay:0,y:75,arc:80}, {delay:.24,y:305,arc:-45},
    {delay:.08,y:190,arc:65}, {delay:.37,y:25,arc:35},
    {delay:.16,y:355,arc:-70}, {delay:.43,y:140,arc:-55},
    {delay:.04,y:260,arc:45}, {delay:.3,y:105,arc:90},
    {delay:.2,y:330,arc:-30}
  ];
  function drifting(ctx, t, alpha = 1, height = 360) {
    ctx.save();ctx.globalAlpha=alpha*.65;
    for(let i=0;i<13;i++){
      const drift=introDrifters[i],u=(drift.phase+t*drift.speed)%1;
      ctx.save();ctx.translate(drift.x+Math.sin(u*5+drift.turn)*drift.sway,u*(height+55)-30);
      ctx.rotate(i+u*5);ctx.scale(.4+.6*Math.abs(Math.cos(u*5+i)),1);
      petal(ctx,7+i%4*2,4+i%3,'#d2958c');ctx.restore();
    }
    ctx.restore();
  }

  function page(ctx, opacity) {
    ctx.save();ctx.globalAlpha=opacity;
    ctx.fillStyle='#f4eddf';ctx.font='70px Display';ctx.fillText('lunarion',100,112);
    ctx.font='22px Display';ctx.fillText('Hi, I’m Jamie.',139,173);
    ctx.font='13px Geist';ctx.fillStyle='#c7ad98';
    ctx.fillText('I make whatever I find interesting at the time.',139,203);
    ctx.fillStyle='#e6c38a';ctx.fillText('projects     games     say hello',139,244);
    ctx.restore();
  }

  export function drawGardenIntro(scene, elapsed, nameOnly = false) {
    const {ctx,mode,height=360,dark=document.documentElement.dataset.theme==='dark'}=scene;
    const t=elapsed/1000;
    ctx.clearRect(0,0,600,height);ctx.fillStyle=dark?'#29101f':'#f4eddf';ctx.fillRect(0,0,600,height);
    if (!nameOnly) page(ctx, mode==='breeze'?phase(t,.35,1.3):mode==='ink'?phase(t,.65,1.15):phase(t,0,.65));
    for (const [i,f] of flowers.entries()) {
      let growth=1,opening=1,pigment=1;
      if(mode==='wake'){growth=phase(t,.12+i*.12,1.4);opening=phase(t,.8+i*.12,1.1);}
      if(mode==='ink'){growth=phase(t,i*.13,1.1);opening=phase(t,.6+i*.12,.7);pigment=phase(t,1.05+i*.12,1);}
      if(mode==='arrival'){opening=phase(t,i===0?.2:.85+i*.12,1);growth=i===0?1:phase(t,.5+i*.12,.9);}
      const wind=Math.sin(t*1.2+i)*3*(mode==='arrival'?phase(t,.7,1):1);
      flower(ctx,{...f,y:f.y*height/360},growth,opening,wind,mode==='ink',pigment,height);
    }
    drifting(ctx,t,phase(t,1.5,.9),height);
    if(mode==='breeze'){
      for(let i=0;i<9;i++){
        const path=breezePaths[i],u=limit((t-path.delay)/1.65);
        if(u<=0||u>=1)continue;
        ctx.save();ctx.translate(-180+u*1040,path.y*height/360+Math.sin(u*Math.PI)*path.arc);
        ctx.rotate(-.7+u*2+i*.8);ctx.scale(.8+Math.sin(u*Math.PI)*.6,1);
        petal(ctx,170+i%3*30,80,['#bb797b','#d2958c','#ac6a76'][i%3]);ctx.restore();
      }
    }
    if(mode==='wake'||mode==='arrival'){
      const start=mode==='wake'?1.75:1.15;
      for(let i=0;i<(mode==='wake'?1:5);i++){
        const u=limit((t-start-i*.06)/1.35);
        if(u<=0||u>=1)continue;
        const source=flowers[0];
        ctx.save();ctx.globalAlpha=1-u*.7;
        ctx.translate(source.x+u*(240+i*30),source.y*height/360+Math.sin(u*3+i)*40+u*42);
        ctx.rotate(u*6+i);petal(ctx,13,6,'#e1aaa0');ctx.restore();
      }
    }
  }

