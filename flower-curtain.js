import { petal } from './garden-intro-art.js';

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let moving = false;

function animateCurtain(opening, onSkip = () => {}, onSweep = () => {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483647';
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.scale(ratio, ratio);
  // Both documents draw the same field at the handoff, halfway through its fall.
  const spacing = Math.max(48, Math.min(108, width / 6));
  const columns = Math.ceil(width / spacing) + 2;
  const rows = Math.ceil(height / spacing) + 8;
  const fieldHeight = rows * spacing;
  const travel = (height + fieldHeight) / 2 + 3 * spacing;
  const colors = ['#bb797b', '#d2958c', '#e1aaa0', '#ac6a76'];
  const sprites = colors.map((_, variant) => {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = Math.ceil(spacing * 2.4 * ratio);
    const brush = sprite.getContext('2d');
    brush.translate(sprite.width / 2, sprite.height / 2);
    brush.scale(ratio, ratio);
    const size = spacing * .46;
    for (let i = 0; i < 7; i++) {
      brush.rotate(2 * Math.PI / 7);
      petal(brush, size * (1 + .08 * Math.sin(i)), size * .55, colors[(variant + i % 3) % 4]);
    }
    brush.fillStyle = '#482537';
    brush.beginPath(); brush.arc(0, 0, size * .13, 0, Math.PI * 2); brush.fill();
    for (let i = 0; i < 8; i++) {
      brush.fillStyle = '#e6c38a';
      brush.fillRect(Math.cos(i * 2.4) * Math.sqrt(i) * size * .037,
                     Math.sin(i * 2.4) * Math.sqrt(i) * size * .037, 2, 2);
    }
    return sprite;
  });
  const leaves=['#789b70','#9bb68a','#5c8366'].map(color=>{
    const leaf=document.createElement('canvas');
    leaf.width=leaf.height=Math.ceil(spacing*.9*ratio);
    const brush=leaf.getContext('2d');
    brush.translate(leaf.width/2,leaf.height/2);brush.scale(ratio,ratio);
    const r=spacing*.32;
    brush.fillStyle=color;
    brush.beginPath();brush.moveTo(0,r);
    brush.bezierCurveTo(-r*.9,r*.25,-r*.7,-r*.65,0,-r);
    brush.bezierCurveTo(r*.65,-r*.5,r*.8,r*.2,0,r);
    brush.fill();
    brush.fillStyle='#36594135';
    brush.beginPath();brush.moveTo(0,-r);
    brush.bezierCurveTo(r*.65,-r*.5,r*.8,r*.2,0,r);
    brush.quadraticCurveTo(-r*.12,0,0,-r);brush.fill();
    brush.strokeStyle='#d7dfb4';brush.lineWidth=.8;
    brush.beginPath();brush.moveTo(0,r*1.1);brush.quadraticCurveTo(-r*.15,0,0,-r*.85);
    for(const y of [-.45,-.05,.35]){
      brush.moveTo(-r*.04,r*y);brush.lineTo(-r*.35,r*(y-.23));
      brush.moveTo(-r*.04,r*y);brush.lineTo(r*.33,r*(y-.22));
    }
    brush.stroke();
    return leaf;
  });
  const start = performance.now();
  return new Promise(resolve => {
    let poses=[], blastStart=null;
    function skip(event){
      if(event.repeat || event.isComposing || event.metaKey || event.ctrlKey || event.altKey || blastStart!==null)return;
      if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
      blastStart=performance.now();
      canvas.dataset.skipped="true";
      onSkip();
      try { sessionStorage.setItem('flower-curtain-skip',Date.now()); } catch {}
    }
    addEventListener('keydown',skip);
    function complete(){
      removeEventListener('keydown',skip);
      resolve(canvas);
    }
    function draw(now) {
      if(blastStart!==null){
        const u=Math.min(1,(now-blastStart)/260);
        ctx.clearRect(0,0,width,height);
        for(const pose of poses){
          const angle=Math.atan2(pose.y-height/2,pose.x-width/2);
          const distance=u*u*Math.max(width,height)*1.8;
          ctx.save();ctx.translate(pose.x+Math.cos(angle)*distance,pose.y+Math.sin(angle)*distance);
          ctx.rotate(pose.turn+u*pose.spin);
          if(pose.flutter)ctx.scale(pose.flutter,1);
          if(pose.sprite)ctx.drawImage(pose.sprite,-pose.size/2,-pose.size/2,pose.size,pose.size);
          else petal(ctx,pose.size,pose.size*.48,pose.color);
          ctx.restore();
        }
        if(u<1)requestAnimationFrame(draw);else complete();
        return;
      }
      poses=[];
      const time = reducedMotion.matches ? 1 : Math.min(1, (now - start) / 1050);
      const progress = (opening ? 1 + time : time) / 2;
      const top = (height - fieldHeight) / 2 + (2 * progress - 1) * travel;
      ctx.clearRect(0, 0, width, height);
      onSweep(opening ? top : top + fieldHeight);
      for (let col = 0; col < columns; col++) {
        const lag = spacing * Math.sin(col * 2.7);
        for (let row = 0; row < rows; row++) {
          const seed = row * 13 + col * 7;
          const y = top + (row + .5) * spacing + lag + spacing * .15 * Math.sin(seed);
          if (y < -spacing * 1.3 || y > height + spacing * 1.3) continue;
          const x = (col - .5 + .32 * (row % 2) + .12 * Math.sin(progress * 7 + seed)) * spacing;
          const sprite = sprites[seed % sprites.length];
          const size = sprite.width / ratio;
          ctx.save(); ctx.translate(x, y); ctx.rotate(seed + progress * Math.sin(seed) * 1.8);
          if (seed % 5 < 3) {
            poses.push({x,y,sprite,size,turn:seed+progress*Math.sin(seed)*1.8,spin:Math.sin(seed)*2});
            ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
          } else if (seed % 5 === 3) {
            poses.push({x,y,size:spacing*.19,color:colors[seed%colors.length],turn:seed+progress*Math.sin(seed)*1.8,spin:1.5});
            petal(ctx, spacing * .19, spacing * .09, colors[seed % colors.length]);
          } else {
            const leaf=leaves[seed%leaves.length],leafSize=leaf.width/ratio;
            const flutter=.55+.45*Math.abs(Math.cos(progress*6+seed));
            ctx.scale(flutter,1);
            poses.push({x,y,sprite:leaf,size:leafSize,turn:seed+progress*Math.sin(seed)*1.8,spin:2,flutter});
            ctx.drawImage(leaf,-leafSize/2,-leafSize/2,leafSize,leafSize);
          }
          ctx.restore();
        }
        for (const edge of [0, fieldHeight]) {
          const direction = edge ? 1 : -1;
          ctx.save();
          ctx.translate((col + .3 * Math.sin(progress * 8 + col)) * spacing,
                        top + edge + lag + direction * spacing * (1.3 + .5 * Math.cos(col)));
          ctx.rotate(col + progress * 6);
          petal(ctx, spacing * .32, spacing * .16, colors[col % colors.length]);
          ctx.restore();
        }
      }
      if (opening) root.classList.add('curtain-ready');
      if (time < 1) requestAnimationFrame(draw);
      else complete();
    }
    draw(start);
  });
}

function revealPage() {
  try {
    const skipped=Number(sessionStorage.getItem('flower-curtain-skip'));
    sessionStorage.removeItem('flower-curtain-skip');
    if(Date.now()-skipped<3000){
      root.classList.remove('curtain-arrival','curtain-ready');
      return;
    }
  } catch {}
  root.classList.add('curtain-arrival');
  animateCurtain(true).then(canvas => {
    canvas.remove();
    root.classList.remove('curtain-arrival','curtain-ready');
  });
}

if (root.classList.contains('curtain-arrival')) revealPage();
window.addEventListener('pageshow', event => {
  if (event.persisted && history.state?.flowerReturn && !reducedMotion.matches) revealPage();
});

// Keep the garden canvas alive while cached page contents change underneath it.
const pageSelector='.site,.buttons-section,.right-sidebar,.site-footer,.page-controls,.filter-definitions,.skip-link';
const pages=new Map();
let currentPath=location.pathname;
pages.set(currentPath,{nodes:[...document.body.children].filter(node=>node.matches(pageSelector)),title:document.title});
const loadedScripts=new Set([...document.scripts].map(script=>script.src).filter(Boolean));

async function preparePage(url){
  if(pages.has(url.pathname))return pages.get(url.pathname);
  const response=await fetch(url.pathname,{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Page unavailable');
  const doc=new DOMParser().parseFromString(await response.text(),'text/html');
  const styles=[...doc.querySelectorAll('link[rel=stylesheet]')];
  await Promise.all(styles.map(style=>{
    const href=new URL(style.getAttribute('href'),url).href;
    if([...document.styleSheets].some(sheet=>sheet.href===href))return;
    return new Promise((resolve,reject)=>{
      const link=document.createElement('link');link.rel='stylesheet';link.href=href;
      link.onload=resolve;link.onerror=reject;document.head.append(link);
    });
  }));
  for(const style of doc.head.querySelectorAll('style')){
    const copy=document.createElement('style');copy.textContent=style.textContent;document.head.append(copy);
  }
  const page={nodes:[...doc.body.children].filter(node=>node.matches(pageSelector)).map(node=>document.importNode(node,true)),title:doc.title,
    scripts:[...doc.body.querySelectorAll('script[src]')].map(script=>({src:new URL(script.getAttribute('src'),url).href,type:script.type}))};
  pages.set(url.pathname,page);
  return page;
}

async function mountPage(page,url,fade=false){
  dispatchEvent(new Event('garden-route-leave'));
  for(const node of pages.get(currentPath).nodes)node.remove();
  if(fade)for(const node of page.nodes)node.style.opacity="0";
  for(const node of page.nodes)document.body.insertBefore(node,document.getElementById('night-garden'));
  document.title=page.title;currentPath=url.pathname;
  for(const script of page.scripts||[]){
    const name=new URL(script.src).pathname;
    if(['/night-garden.js','/ascii-mode.js','/sidebar-widgets.js'].includes(name)||loadedScripts.has(script.src))continue;
    loadedScripts.add(script.src);
    await new Promise(resolve=>{
      const tag=document.createElement('script');tag.src=script.src;
      if(script.type)tag.type=script.type;
      tag.onload=tag.onerror=resolve;document.body.append(tag);
    });
  }
  dispatchEvent(new Event('garden-route-mounted'));
  scrollTo({top:0,behavior:'instant'});
  if(url.hash)document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({behavior:'instant'});
}

// A fixed pixel pattern dissolves in place rather than dimming whole elements.
const dissolveMasks=Array.from({length:25},(_,step)=>{
  let path='';
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const hash=((x*374761393+y*668265263)^(x*y*1274126177))>>>0;
    const threshold=((hash^(hash>>>13))>>>0)%256;
    if(threshold < step/24*256)path+='M'+x*6+' '+y*6+'h6v6h-6z';
  }
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><path fill="white" d="'+path+'"/></svg>';
  return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
});
function stagePieces(page,opening){
  const selector='header,.section-nav,.sidebar-widget,.destination-shelf>a,.about-section,.listening-card,.playlist-pane,.social-list>a,.games-shelf,.project-list>article,main>h1,main>h2,main>p,main>form,.media-nav,.greeble,.site-footer,.link-back,.button-marquee';
  const candidates=page.nodes.flatMap(node=>[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)]);
  const pieces=candidates.filter(node=>!candidates.some(parent=>parent!==node&&parent.contains(node)));
  const records=pieces.map(node=>({node,mask:node.style.maskImage,size:node.style.maskSize,repeat:node.style.maskRepeat,top:node.getBoundingClientRect().top,step:-1}));
  function sweep(edge){
    for(const record of records){
      const passed=Math.max(0,Math.min(1,(edge-record.top+30)/220));
      const step=Math.round((opening?passed:1-passed)*24);
      if(step===record.step)continue;
      record.step=step;
      record.node.style.maskImage=dissolveMasks[step];
      record.node.style.maskSize='96px 96px';
      record.node.style.maskRepeat='repeat';
    }
  }
  function restore(){
    for(const {node,mask,size,repeat} of records){
      node.style.maskImage=mask;node.style.maskSize=size;node.style.maskRepeat=repeat;
    }
  }
  if(opening)sweep(-Infinity);
  return {sweep,restore};
}

async function fadeContent(page){
  const animations=page.nodes.map(node=>{
    node.style.removeProperty('opacity');
    return node.animate([{opacity:0},{opacity:1}],{duration:1200,easing:'ease-in-out',fill:'both'});
  });
  await Promise.all(animations.map(animation=>animation.finished.catch(()=>{})));
  animations.forEach(animation=>animation.cancel());
}

async function navigatePage(href,push=true){
  if(moving)return;
  moving=true;
  const url=new URL(href,location.href);
  let cover,clearing,rebuilding;
  try{
    const preparation=preparePage(url);
    // Attach failure handling immediately while the falling flowers cover the page.
    const ready=preparation.then(page=>({page}),error=>({error}));
    if(!reducedMotion.matches){
      clearing=stagePieces(pages.get(currentPath),false);
      cover=await animateCurtain(false,()=>{},clearing.sweep);
    }
    const result=await ready;
    if(result.error)throw result.error;
    const skipCover=cover?.dataset.skipped==="true";
    await mountPage(result.page,url,!reducedMotion.matches);
    clearing?.restore();
    if(push)history.pushState({gardenPage:true},'',url);
    let skipped=skipCover;
    try{
      skipped=skipped || Date.now()-Number(sessionStorage.getItem('flower-curtain-skip'))<3000;
      sessionStorage.removeItem('flower-curtain-skip');
    }catch{}
    if(!reducedMotion.matches && skipped){
      cover?.remove();cover=null;
      await fadeContent(result.page);
    }
    if(!reducedMotion.matches && !skipped){
      let fading;
      for(const node of result.page.nodes)node.style.removeProperty('opacity');
      rebuilding=stagePieces(result.page,true);
      const opening=animateCurtain(true,()=>{
        rebuilding.restore();
        fading=fadeContent(result.page);
      },rebuilding.sweep);
      cover?.remove();cover=null;
      const reveal=await opening;reveal.remove();
      if(fading)await fading;
      rebuilding.restore();
    }
    root.classList.remove('curtain-arrival','curtain-ready');
    const heading=document.querySelector('main h1');
    if(heading){heading.dataset.routeHeading='';heading.tabIndex=-1;heading.focus({preventScroll:true});}
  }catch{
    location.assign(url.href);
  }finally{
    clearing?.restore();rebuilding?.restore();
    cover?.remove();moving=false;
  }
}

document.addEventListener('click',event=>{
  const link=event.target.closest('a[data-flower-curtain]');
  if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();navigatePage(link.href);
});
document.addEventListener('submit',event=>{
  if(!event.target.matches('[data-flower-return]'))return;
  event.preventDefault();navigatePage(event.target.action);
});
addEventListener('popstate',()=>{
  if(location.pathname!==currentPath)navigatePage(location.href,false);
});

function paintDestinations(){
// Small still lifes keep the navigation legible even when motion is disabled.
for (const canvas of document.querySelectorAll('.destination-shelf canvas')) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.translate(200, 75);
  const box = (x,y,w,h,color) => { ctx.fillStyle=color; ctx.fillRect(x,y,w,h); };
  switch (canvas.dataset.object) {
    case 'telescope': {
      // Brass tripod and a plum enamel barrel, angled toward the crescent.
      ctx.lineCap='round';
      for(const [foot,drop] of [[-45,57],[-7,49],[32,57]]){
        ctx.beginPath();ctx.moveTo(-8,4);ctx.lineTo(foot,drop);
        ctx.strokeStyle='#c19b72';ctx.lineWidth=4;ctx.stroke();
      }
      ctx.save();ctx.translate(-8,0);ctx.rotate(-.44);
      box(-49,-5,19,9,'#dbc197');box(-53,-8,6,15,'#ae8970');
      box(-33,-12,74,22,'#ab7886');box(-33,3,74,7,'#785260');
      box(-23,-12,5,22,'#dfb782');box(24,-12,5,22,'#dfb782');
      box(36,-16,9,30,'#ebc79b');box(45,-13,3,24,'#adc8bd');
      ctx.restore();
      ctx.fillStyle='#e7c28d';ctx.beginPath();ctx.arc(-8,5,5,0,2*Math.PI);ctx.fill();
      ctx.beginPath();ctx.arc(69,-39,13,0,2*Math.PI);ctx.fill();
      ctx.fillStyle='#482a38';ctx.beginPath();ctx.arc(74,-44,13,0,2*Math.PI);ctx.fill();
      for(const [x,y,r] of [[46,-52,2],[86,-23,1.6],[57,-18,1.2]]){
        ctx.fillStyle='#f4ddab';ctx.beginPath();ctx.moveTo(x,y-r*1.8);
        ctx.lineTo(x+r,y);ctx.lineTo(x,y+r*1.8);ctx.lineTo(x-r,y);ctx.fill();
      }
      break;
    }
    case 'computer':
      ctx.rotate(-.06);box(-51,-50,102,85,'#a69b85');box(-54,-54,99,84,'#ddceb4');
      box(-43,-43,78,50,'#867d70');box(-39,-39,70,42,'#293831');
      ctx.fillStyle='#bbd7a0';ctx.font='18px monospace';ctx.fillText('>_',-32,-13);
      box(0,17,28,3,'#6c655a');box(-42,30,76,7,'#918776');
      ctx.fillStyle='#c3b59b';ctx.beginPath();ctx.moveTo(-54,39);ctx.lineTo(43,39);ctx.lineTo(60,54);ctx.lineTo(-69,54);ctx.fill();
      for(let r=0;r<2;r++)for(let k=0;k<11;k++)box(-48+k*8-r*3,41+r*6,6,3,'#655e54');
      break;
    case 'cartridge':
      ctx.rotate(.12);box(-46,-54,96,112,'#80778d');box(-49,-58,94,112,'#bdb2bf');
      box(-39,-47,74,12,'#93879c');box(-37,-29,72,61,'#564559');box(-33,-25,64,50,'#303044');
      ctx.fillStyle='#e8c68d';ctx.beginPath();ctx.arc(12,-10,8,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#a28ca7';ctx.beginPath();ctx.moveTo(-33,19);ctx.lineTo(-11,-6);ctx.lineTo(1,10);ctx.lineTo(12,0);ctx.lineTo(31,20);ctx.lineTo(31,25);ctx.lineTo(-33,25);ctx.fill();
      for(let i=0;i<3;i++)box(-33,38+i*4,30,2,'#8c8092');
      break;
  }
}

}
paintDestinations();
addEventListener("garden-route-mounted",paintDestinations);
