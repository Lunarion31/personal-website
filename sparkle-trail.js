(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1000';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  document.body.append(canvas);
  const colors = ['#eee0bd', '#947259', '#accddd'];
  let particles = [], frame = 0, previous = null;
  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * scale);
    canvas.height = Math.round(innerHeight * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    particles = [];
    previous = null;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
  function draw(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    particles = particles.filter(p => now - p.born < p.life);
    for (const p of particles) {
      const age = (now - p.born) / p.life;
      const size = p.size * (1 - age * .65);
      ctx.save();
      ctx.translate(p.x + p.drift * age, p.y + 17 * age);
      ctx.rotate(p.rotation + age * .7);
      ctx.globalAlpha = Math.sin(Math.PI * Math.min(age * 4, .5)) * (1 - age);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        const radius = i % 2 ? size * .23 : size;
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    frame = particles.length ? requestAnimationFrame(draw) : 0;
  }
  function move(event) {
    if (reducedMotion.matches || !event.isPrimary) return;
    const point = {x: event.clientX, y: event.clientY, id: event.pointerId};
    const start = previous && previous.id === point.id ? previous : point;
    const distance = Math.hypot(point.x - start.x, point.y - start.y);
    if (previous && distance < 7) return;
    const count = Math.min(8, Math.max(1, Math.floor(distance / 9)));
    for (let i = 1; i <= count; i++) {
      particles.push({
        x: start.x + (point.x - start.x) * i / count + (Math.random() - .5) * 15,
        y: start.y + (point.y - start.y) * i / count + (Math.random() - .5) * 15,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        born: performance.now(), life: 450 + Math.random() * 350,
        drift: (Math.random() - .5) * 18, rotation: Math.random() * Math.PI
      });
    }
    particles = particles.slice(-100);
    previous = point;
    if (!frame) frame = requestAnimationFrame(draw);
  }
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') move(event);
  }, {passive: true});
  window.addEventListener('touchmove', event => {
    const touch = event.touches[0];
    if (touch) move({clientX: touch.clientX, clientY: touch.clientY, pointerId: touch.identifier, isPrimary: true});
  }, {passive: true});
  window.addEventListener('touchend', () => { previous = null; }, {passive: true});
  window.addEventListener('pointerdown', move, {passive: true});
  for (const name of ['pointerup', 'pointercancel', 'blur']) {
    window.addEventListener(name, () => { previous = null; }, {passive: true});
  }
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget) previous = null;
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  reducedMotion.addEventListener('change', clear);
  window.addEventListener('resize', resize, {passive: true});
  resize();
})();
