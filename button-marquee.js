(() => {
  const shelf = document.querySelector('.button-window');
  const buttons = shelf?.querySelector('.buttons');
  if (!buttons) return;
  const track = document.createElement('div');
  track.className = 'button-track';
  const copy = buttons.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.querySelectorAll('a').forEach(link => link.tabIndex = -1);
  track.append(buttons, copy);
  shelf.append(track);
  shelf.classList.add('is-moving');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let dragging = false, moved = false, origin = 0, initialScroll = 0;
  let touching = false, resumeAt = 0, lastFrame = 0;
  let pendingDistance = 0;
  shelf.addEventListener('dragstart', event => event.preventDefault());
  shelf.addEventListener('pointerdown', event => {
    moved = false;
    if (event.pointerType !== 'mouse') { touching = true; return; }
    if (event.button !== 0) return;
    dragging = true;
    origin = event.clientX;
    initialScroll = shelf.scrollLeft;
  });
  shelf.addEventListener('pointermove', event => {
    if (!dragging) return;
    const distance = event.clientX - origin;
    if (Math.abs(distance) > 5) {
      moved = true;
      shelf.setPointerCapture(event.pointerId);
      shelf.classList.add('is-dragging');
    }
    if (moved) shelf.scrollLeft = initialScroll - distance;
  });
  function release() {
    dragging = false;
    touching = false;
    shelf.classList.remove('is-dragging');
    resumeAt = performance.now() + 1500;
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  shelf.addEventListener('lostpointercapture', release);
  shelf.addEventListener('click', event => {
    if (moved) { event.preventDefault(); event.stopPropagation(); moved = false; }
  }, true);
  shelf.addEventListener('wheel', () => { resumeAt = performance.now() + 1500; }, { passive: true });
  function frame(now) {
    const elapsed = Math.min(now - lastFrame, 50);
    lastFrame = now;
    if (!motion.matches && !document.hidden && !dragging && !touching &&
        now >= resumeAt && !shelf.matches(':hover, :focus-within')) {
      const width = buttons.offsetWidth;
      // Retain subpixel movement: some browsers round scrollLeft assignments.
      pendingDistance += elapsed * 0.025;
      const pixels = Math.floor(pendingDistance);
      pendingDistance -= pixels;
      shelf.scrollLeft += pixels;
      if (width && shelf.scrollLeft >= width) shelf.scrollLeft -= width;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
