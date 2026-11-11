import {drawGardenIntro as draw} from '/garden-intro-art.js';
(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = [...document.querySelectorAll('canvas')].map(canvas => ({
    canvas, ctx: canvas.getContext('2d'), mode: canvas.dataset.mode, started: null
  }));
  let frame = 0;
  function tick(now) {
    frame=0;
    let running=false;
    for(const scene of scenes){
      if(scene.started===null)continue;
      const elapsed=now-scene.started;
      draw(scene,Math.min(elapsed,3200));
      if(elapsed<3200)running=true;
      else scene.started=null;
    }
    if(running&&!document.hidden)frame=requestAnimationFrame(tick);
  }

  function replay(selected) {
    const now=performance.now();
    for(const scene of selected){
      scene.started=motion.matches?null:now;
      if(motion.matches)draw(scene,3200);
    }
    if(!frame&&!motion.matches&&!document.hidden)frame=requestAnimationFrame(tick);
  }

  function resize() {
    for(const scene of scenes){
      const ratio=Math.min(devicePixelRatio,2);
      const width=Math.min(scene.canvas.clientWidth,900)*ratio;
      scene.canvas.width=Math.round(width);scene.canvas.height=Math.round(width*.6);
      scene.ctx.setTransform(scene.canvas.width/600,0,0,scene.canvas.height/360,0,0);
      draw(scene,scene.started===null?3200:Math.min(performance.now()-scene.started,3200));
    }
  }

  scenes.forEach(scene=>scene.canvas.closest('article').querySelector('button').addEventListener('click',()=>replay([scene])));
  document.getElementById('replay-all').addEventListener('click',()=>replay(scenes));
  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else replay(scenes);});
  motion.addEventListener('change',()=>replay(scenes));
  Promise.all([document.fonts.load('70px Display'),document.fonts.load('13px Geist')]).then(()=>{resize();replay(scenes);});
})();
