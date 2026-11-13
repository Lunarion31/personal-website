(() => {
  const code=['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
  const preferenceKey='lunarion-ascii-mode';
  function reportProgress(){dispatchEvent(new CustomEvent('konami-progress',{detail:{next:code[progress]||code[0]}}))}
  let transitionPending=false,burstRequest=0;
  function changeModeAfterPetals(){
    if(transitionPending)return;transitionPending=true;const id=++burstRequest,next=!active;let timer;
    function finish(){clearTimeout(timer);removeEventListener('konami-burst-end',onEnd);transitionPending=false;if(next)start();else stop()}
    function onEnd(event){if(event.detail.id===id)finish()}
    function fallback(){if(document.hidden){timer=setTimeout(fallback,250);return}finish()}
    addEventListener('konami-burst-end',onEnd);timer=setTimeout(fallback,2500);
    dispatchEvent(new CustomEvent('konami-burst',{detail:{id}}));
  }
  function releaseBoot(){clearTimeout(window.lunarionAsciiTimeout);delete window.lunarionAsciiTimeout;delete document.documentElement.dataset.asciiLoading}
  function savePreference(enabled){try{if(enabled)localStorage.setItem(preferenceKey,'on');else localStorage.removeItem(preferenceKey)}catch{}}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let progress=0,active=false,generation=0,renderer=null,output=null,source=null,context=null,texture=null,loading=null;
  let sceneTime=0,sceneLast=0,description=null,intro=null,drawIntro=null,pendingIntro=false;
  const introCanvas=document.createElement('canvas');
  function endAsciiIntro(cancelled=false){if(!intro)return;intro=null;document.documentElement.classList.remove('ascii-intro-running');dispatchEvent(new CustomEvent('garden-intro-end',{detail:{cancelled}}))}
  function startAsciiIntro(){
    if(!active||!drawIntro||reduced.matches)return;endAsciiIntro(true);
    intro={mode:['wake','breeze','ink','arrival'][Math.floor(Math.random()*4)],elapsed:0,nextCue:0};
    document.documentElement.classList.add('ascii-intro-running');dispatchEvent(new Event('garden-intro-start'));
    if(renderer)renderer.redraw();
  }
  const dependencies=new Map();
  function load(src){
    if(!dependencies.has(src))dependencies.set(src,new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>{dependencies.delete(src);script.remove();reject(new Error('Could not load ASCII renderer'))};document.head.append(script);
    }));
    return dependencies.get(src);
  }
  function compose(){
    if(!context)return;
    if(source.width!==innerWidth||source.height!==innerHeight){source.width=innerWidth;source.height=innerHeight}
    context.fillStyle='#170d16';context.fillRect(0,0,source.width,source.height);
    window.drawLunarionLandscape?.(context,{x:0,y:0,width:innerWidth,height:innerHeight},sceneTime,scrollY);
    const garden=document.getElementById('night-garden');
    if(garden?.width)context.drawImage(garden,0,0,source.width,source.height);
    // Feather the scenery around the sidebar rather than drawing a rectangular panel.
    const sidebar=document.querySelector('.layout>aside');
    if(sidebar){
      const box=sidebar.getBoundingClientRect();
      if(box.bottom>0&&box.top<innerHeight){
        context.save();context.translate(box.left+box.width*.5,box.top+box.height*.5);
        context.scale(box.width*.85+120,box.height*.5+190);
        const veil=context.createRadialGradient(0,0,0,0,0,1);
        veil.addColorStop(0,'#170d16ba');veil.addColorStop(.3,'#170d169c');veil.addColorStop(.6,'#170d1652');veil.addColorStop(.84,'#170d161c');veil.addColorStop(1,'#170d1600');
        context.fillStyle=veil;context.fillRect(-1,-1,2,2);context.restore();
      }
    }
    // Only the masthead is rasterized. All other text stays native, readable HTML.
    const title=document.querySelector('.wordmark');
    if(title?.firstChild){
      const range=document.createRange();range.selectNode(title.firstChild);const box=range.getBoundingClientRect();
      if(box.bottom>0&&box.top<innerHeight){
        const style=getComputedStyle(title),text=title.firstChild.textContent.trim();
        context.save();context.font=style.font;context.letterSpacing=style.letterSpacing;context.textAlign='left';context.textBaseline='alphabetic';
        const metrics=context.measureText(text),gradient=context.createLinearGradient(box.left,0,box.right,0);
        gradient.addColorStop(0,'#ecd096');gradient.addColorStop(.5,'#dba8b4');gradient.addColorStop(1,'#b6a1cf');context.fillStyle=gradient;
        context.fillText(text,box.left,box.bottom-(metrics.fontBoundingBoxDescent||0));context.restore();
      }
    }
    if(intro){
      const elapsed=intro.elapsed;
      const bloomAt={wake:800,breeze:500,ink:1100,arrival:600}[intro.mode],cues=[[bloomAt,'paper'],[2300,'fabric'],[2750,'chime']];
      while(intro.nextCue<cues.length&&elapsed>=cues[intro.nextCue][0])dispatchEvent(new CustomEvent('garden-intro-cue',{detail:cues[intro.nextCue++][1]}));
      if(elapsed>=2300)document.documentElement.classList.remove('ascii-intro-running');
      if(elapsed>=3050){endAsciiIntro();return}
      if(introCanvas.width!==innerWidth||introCanvas.height!==innerHeight){introCanvas.width=innerWidth;introCanvas.height=innerHeight}
      const c=introCanvas.getContext('2d');c.save();c.setTransform(innerWidth/600,0,0,innerHeight/360,0,0);drawIntro({ctx:c,mode:intro.mode},elapsed,true);c.restore();
      const size=Math.max(64,Math.min(innerWidth*.13,190));c.font=size+"px 'Geist Serif',Georgia,serif";c.textAlign='center';c.textBaseline='top';
      const textWidth=c.measureText('lunarion').width,g=c.createLinearGradient((innerWidth-textWidth)/2,0,(innerWidth+textWidth)/2,0);g.addColorStop(0,'#ecd096');g.addColorStop(.5,'#dba8b4');g.addColorStop(1,'#b6a1cf');c.fillStyle=g;c.fillText('lunarion',innerWidth/2,innerHeight*.27);
      context.save();context.globalAlpha=elapsed<2300?1:Math.max(0,1-(elapsed-2300)/750);context.drawImage(introCanvas,0,0);context.restore();
    }

  }
  function announce(message){
    const note=document.createElement('div');note.id='ascii-loading';note.setAttribute('role','status');note.textContent=message;document.body.append(note);return note;
  }
  function stop(save=true){
    releaseBoot();if(save)savePreference(false);
    endAsciiIntro(true);active=false;dispatchEvent(new CustomEvent('ascii-mode-change',{detail:{enabled:false}}));generation++;renderer?.destroy();renderer=null;output?.remove();output=null;loading?.remove();loading=null;source=null;context=null;texture=null;description?.remove();description=null;sceneTime=0;sceneLast=0;pendingIntro=false;document.documentElement.classList.remove('textmode-active');
  }
  async function start(){
    active=true;savePreference(true);dispatchEvent(new CustomEvent('ascii-mode-change',{detail:{enabled:true}}));const token=++generation;loading=announce('Opening the character garden…');
    try{
      await Promise.all([load('/assets/vendor/textmode/textmode.umd.js'),load('/ascii-landscape.js?v=2'),load('/ascii-sakura.js'),document.fonts.ready]);
      if(!active||token!==generation)return;
      await window.prepareLunarionLandscape();
      ({drawGardenIntro:drawIntro}=await import('/garden-intro-art.js?v=2'));
      if(!active||token!==generation)return;
      document.documentElement.classList.add('textmode-active');
      description=document.createElement('span');description.className='ascii-scene-description';description.textContent='ASCII wonderland: a waterfall feeds a flowing river beneath sakura trees, mist, a rainbow, and swaying flowers.';document.body.append(description);
      source=document.createElement('canvas');source.width=innerWidth;source.height=innerHeight;context=source.getContext('2d');
      output=document.createElement('canvas');output.id='ascii-viewport';output.width=innerWidth;output.height=innerHeight;output.style.opacity='0';output.setAttribute('aria-hidden','true');document.body.append(output);
      renderer=textmode.create({canvas:output,width:innerWidth,height:innerHeight,fontSize:5,frameRate:60});
      renderer.setup(()=>{
        if(!active||token!==generation)return;
        pendingIntro=true;compose();texture=renderer.createTexture(source);texture.characters(' ░▒▓█');texture.charColorMode('sampled');texture.cellColorMode('fixed');texture.cellColor(23,13,22);texture.background(0,0,0);
        if(reduced.matches){renderer.noLoop();renderer.redraw()}
      });
      renderer.draw(()=>{
        if(!active||token!==generation||!texture||document.hidden)return;
        if(pendingIntro){pendingIntro=false;startAsciiIntro();sceneLast=0}
        const now=performance.now(),delta=sceneLast?Math.min((now-sceneLast)/1000,.08):0;
        if(!reduced.matches){sceneTime+=delta;if(intro)intro.elapsed+=delta*1000}sceneLast=now;
        compose();renderer.background(23,13,22);renderer.image(texture,renderer.grid.cols,renderer.grid.rows);
        output.style.opacity='1';output.dataset.ready='true';releaseBoot();loading?.remove();loading=null;
      });
    }catch(error){if(active&&token===generation){stop(false);announce('ASCII mode needs WebGL2 in this browser. The normal site is still available.')}}
  }
  document.addEventListener('keydown',event=>{
    if(transitionPending||event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.target.closest('input,textarea,select,[contenteditable="true"]')){progress=0;reportProgress();return}
    const key=event.key.toLowerCase(),expected=code[progress];
    const entered=code.slice(0,progress).concat(key);progress=0;
    for(let length=Math.min(code.length,entered.length);length>0;length--){if(entered.slice(-length).every((value,i)=>value===code[i])){progress=length;break}}
    if(progress>0)event.preventDefault();
    if(key===expected&&progress>0)dispatchEvent(new CustomEvent('konami-step',{detail:{step:progress,total:code.length,complete:progress===code.length}}));
    if(progress===code.length){progress=0;reportProgress();changeModeAfterPetals()}else reportProgress()
  });
  addEventListener('ascii-restore-timeout',()=>{if(active)stop(false)});
  addEventListener('ascii-intro-request',startAsciiIntro);
  for(const name of ['wheel','touchstart'])addEventListener(name,()=>endAsciiIntro(true),{passive:true});
  addEventListener('keydown',event=>{if(event.metaKey||event.ctrlKey||event.altKey||['Meta','Control','Alt','Shift','F5'].includes(event.key))return;endAsciiIntro(true)});
  document.addEventListener('scroll',()=>{if(active&&reduced.matches)renderer?.redraw()},{passive:true,capture:true});
  window.addEventListener('resize',()=>{if(active&&renderer){renderer.resizeCanvas(innerWidth,innerHeight);renderer.redraw()}});
  document.addEventListener('visibilitychange',()=>{if(!active||!renderer)return;sceneLast=0;if(document.hidden)renderer.noLoop();else if(!reduced.matches)renderer.loop();else renderer.redraw()});
  reduced.addEventListener('change',()=>{if(!active||!renderer)return;sceneLast=0;if(reduced.matches){endAsciiIntro(true);renderer.noLoop();renderer.redraw()}else renderer.loop()});
  try{if(localStorage.getItem(preferenceKey)==='on')start()}catch{}
})();
