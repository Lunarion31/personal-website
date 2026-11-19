(() => {
  const track = document.getElementById('project-track');
  if (!track) return;
  const items = [...track.querySelectorAll('.project-item')];
  const buttons = [...document.querySelectorAll('[data-project-step]')];
  const position = document.querySelector('.project-position');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, target = 0, previous = 0, drag = null, moved = false;
  const end = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const clamp = value => Math.max(0, Math.min(end(), value));
  const step = () => items[0].offsetWidth + parseFloat(getComputedStyle(track).gap);
  const update = () => {
    buttons.forEach(button => {
      button.disabled = Number(button.dataset.projectStep) < 0
        ? track.scrollLeft <= 2 : track.scrollLeft >= end() - 2;
    });
    const index = Math.min(items.length, Math.round(track.scrollLeft / step()) + 1);
    if (position) {
      position.textContent = `${String(index).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
      position.setAttribute('aria-label', `Project ${index} of ${items.length}`);
    }
  };
  const settle = () => {
    items.forEach(item => { item.style.transform = ''; item.style.opacity = ''; });
    track.classList.remove('is-moving');
  };
  function tick() {
    const remaining = target - track.scrollLeft;
    const next = Math.abs(remaining) < 4 ? target : track.scrollLeft + remaining * .13;
    track.scrollLeft = next;
    const speed = track.scrollLeft - previous;
    previous = track.scrollLeft;
    const bounds = track.getBoundingClientRect();
    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const distance = Math.min(1, Math.abs((rect.left + rect.width / 2 - bounds.left) / bounds.width - .5) * 2);
      item.style.transform = `translateX(${Math.max(-16, Math.min(16, speed * (.25 + (index % 3) * .12)))}px)`;
      item.style.opacity = String(1 - distance * Math.min(.18, Math.abs(speed) / 120));
    });
    if (Math.abs(target - track.scrollLeft) > 1) frame = requestAnimationFrame(tick);
    else { frame = 0; settle(); }
  }
  const glide = value => {
    target = clamp(value);
    if (reduced.matches) { track.scrollLeft = target; update(); return; }
    track.classList.add('is-moving');
    if (!frame) { previous = track.scrollLeft; frame = requestAnimationFrame(tick); }
  };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; target = track.scrollLeft; settle(); };
  buttons.forEach(button => button.addEventListener('click', () =>
    glide((frame ? target : track.scrollLeft) + step() * Number(button.dataset.projectStep))));
  track.addEventListener('keydown', event => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    glide(event.key === 'Home' ? 0 : event.key === 'End' ? end() :
      (frame ? target : track.scrollLeft) + step() * (event.key === 'ArrowRight' ? 1 : -1));
  });
  track.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    stop(); moved = false;
    drag = {id:event.pointerId, x:event.clientX, left:track.scrollLeft, touch:event.pointerType === 'touch'};
  });
  track.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const delta = event.clientX - drag.x;
    if (Math.abs(delta) > 6) moved = true;
    if (moved && !drag.touch) {
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
      track.scrollLeft = clamp(drag.left - delta);
    }
  });
  const release = () => {
    if (!drag) return;
    const wasTouch = drag.touch;
    drag = null;
    track.classList.remove('is-dragging');
    if (moved && !wasTouch) glide(Math.round(track.scrollLeft / step()) * step());
  };
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  track.addEventListener('pointerleave', () => { if (drag && !moved) drag = null; });
  track.addEventListener('click', event => { if (moved) { event.preventDefault(); event.stopPropagation(); moved = false; } }, true);
  track.addEventListener('dragstart', event => event.preventDefault());
  track.addEventListener('wheel', stop, {passive:true});
  track.addEventListener('scroll', update, {passive:true});
  new ResizeObserver(() => { stop(); update(); }).observe(track);
  track.classList.add('is-enhanced');
  update();
})();
