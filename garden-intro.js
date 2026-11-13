import {drawGardenIntro} from './garden-intro-art.js?v=4';

const root = document.documentElement;
let finishActiveIntro;
function asciiEnabled(){if(root.classList.contains('textmode-active'))return true;try{return localStorage.getItem('lunarion-ascii-mode')==='on'}catch{return false}}
if (root.dataset.intro && !asciiEnabled()) startIntro();
addEventListener('ascii-mode-change',event=>{if(event.detail.enabled)finishActiveIntro?.(true)});

function replayIntro() {
  if(asciiEnabled()){finishActiveIntro?.(true);dispatchEvent(new Event('ascii-intro-request'));return}
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  finishActiveIntro?.(true);
  scrollTo({top: 0, behavior: 'instant'});
  root.dataset.intro = 'waiting';
  window.lunarionIntroTimeout = setTimeout(() => finishActiveIntro?.(), 7000);
  startIntro();
}
document.getElementById('replay-intro').addEventListener('click', replayIntro);
addEventListener('intro-sound-ready', () => { if (root.dataset.intro) replayIntro(); });

async function startIntro() {
  if(document.getElementById('mobile-notice')?.open){
    clearTimeout(window.lunarionIntroTimeout);
    await new Promise(resolve=>addEventListener('mobile-notice-dismissed',resolve,{once:true}));
    if(finishActiveIntro)return;
    window.lunarionIntroTimeout=setTimeout(()=>finishActiveIntro?.(),7000);
  }
  if(asciiEnabled()){delete root.dataset.intro;return}
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const layer = document.createElement('div');
  layer.id = 'garden-intro';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<div class="intro-scene"><canvas></canvas><p class="intro-name">lunarion</p></div>';
  document.body.append(layer);
  window.dispatchEvent(new Event('garden-intro-start'));
  const canvas = layer.querySelector('canvas');
  const mode = ['wake', 'breeze', 'ink', 'arrival'][Math.floor(Math.random() * 4)];
  layer.dataset.mode = mode;
  let frame, started = null, finished = false;
  const abort = new AbortController();
  const options = {signal: abort.signal};

  function finish(reason) {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    clearTimeout(window.lunarionIntroTimeout);
    delete root.dataset.intro;
    layer.remove();
    abort.abort();
    if (finishActiveIntro === finish) finishActiveIntro = null;
    window.dispatchEvent(new CustomEvent('garden-intro-end', {detail: {cancelled: !!reason}}));
  }

  finishActiveIntro = finish;

  // Scrolling, keyboard navigation and restored pages give control immediately.
  for (const event of ['wheel', 'touchstart', 'keydown', 'pagehide', 'resize']) {
    addEventListener(event, finish, {...options, passive: true});
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); }, options);
  motion.addEventListener('change', finish, options);

  try {
    await Promise.all([
      document.fonts.load('140px "Geist Serif"'),
      document.fonts.load('16px Geist'),
      document.fonts.load('12px "Geist Mono"')
    ]);
    if (finished || !root.dataset.intro || motion.matches || scrollY > 0) { finish(); return; }
    const ratio = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(innerWidth * ratio);
    canvas.height = Math.round(innerHeight * ratio);
    const ctx = canvas.getContext('2d');
    // Match the scene's proportions at both portrait and desktop sizes.
    ctx.setTransform(canvas.width / 600, 0, 0, canvas.width / 600, 0, 0);
    let drawing = null, nextCue = 0;
    const bloomAt = {wake: 800, breeze: 500, ink: 1100, arrival: 600}[mode];
    const cues = [[bloomAt, 'paper'], [2300, 'fabric'], [3550, 'chime']];
    function tick(now) {
      if (finished) return;
      started ??= now;
      if(asciiEnabled()){finish(true);dispatchEvent(new Event('ascii-intro-request'));return}
      const elapsed = now - started;
      while (nextCue < cues.length && elapsed >= cues[nextCue][0]) {
        window.dispatchEvent(new CustomEvent('garden-intro-cue', {detail: cues[nextCue++][1]}));
      }
      if (elapsed < 2300) drawGardenIntro({ctx, mode, height:innerHeight*600/innerWidth}, elapsed, true);
      else if (!drawing) {
        drawing = tracePage();
        layer.append(drawing);
        root.dataset.intro = 'trace';
      }
      if (elapsed >= 3550) root.dataset.intro = 'fill';
      if (elapsed >= 4450) { finish(); return; }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  } catch {
    finish();
  }
}

function tracePage() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('intro-drawing');
  svg.setAttribute('width', document.documentElement.clientWidth);
  svg.setAttribute('height', document.documentElement.scrollHeight);
  const targets = document.querySelectorAll('.site, .buttons-section, .right-sidebar, .site-footer');
  const range = document.createRange();

  function add(tag, attrs, y) {
    const element = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    element.style.setProperty('--trace-delay', Math.min(.6, y / innerHeight * .15) + 's');
    svg.append(element);
    return element;
  }

  for (const target of targets) {
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (parent.closest('script,style,textarea,[hidden],[aria-hidden="true"]')) continue;
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden' || !parent.getClientRects().length) continue;
      for (const match of node.textContent.matchAll(/\S+/g)) {
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const rect = range.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const size = parseFloat(style.fontSize);
        const text = add('text', {
          x: rect.x + scrollX, y: rect.y + scrollY,
          'dominant-baseline': 'text-before-edge',
          'font-kerning': style.fontKerning,
          'font-variant-ligatures': style.fontVariantLigatures,
          'font-family': style.fontFamily, 'font-size': size,
          'font-weight': style.fontWeight, 'font-style': style.fontStyle,
          'letter-spacing': style.letterSpacing
        }, rect.y + scrollY);
        text.style.fontKerning = style.fontKerning;
        text.style.fontVariantLigatures = style.fontVariantLigatures;
        text.style.textTransform = style.textTransform;
        text.style.textRendering = style.textRendering;
        text.textContent = match[0];
      }
    }
    for (const element of target.querySelectorAll('header, .about-section, footer, .sidebar-widget, .security-banner, img')) {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const y = rect.y + scrollY, x = rect.x + scrollX;
      if (element.matches('img, .security-banner')) {
        add('rect', {x, y, width: rect.width, height: rect.height}, y);
      } else {
        add('path', {d: 'M ' + x + ' ' + y + ' h ' + rect.width}, y);
      }
    }
  }
  return svg;
}
