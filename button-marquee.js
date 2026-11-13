(() => {
  const shelf = document.querySelector('.button-window');
  const buttons = shelf?.querySelector('.buttons');
  if (!buttons) return;
  const track = document.createElement('div');
  track.className = 'button-track';
  track.append(buttons);
  shelf.append(track);
  shelf.classList.add('is-moving');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let dragging = false, moved = false, origin = 0, initialScroll = 0;
  let activePointer = null;
  let mouseOverShelf = false;
  let touching = false, resumeAt = 0, lastFrame = 0;
  let pendingDistance = 0;
  let loopWidth = 0, loopStart = 0;
  function cloneButtons() {
    const copy = buttons.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.removeAttribute('aria-label');
    copy.querySelectorAll('a').forEach(link => link.tabIndex = -1);
    return copy;
  }
  function rebuild() {
    const width = buttons.offsetWidth;
    if (!width) return;
    const offset = loopWidth ? ((shelf.scrollLeft - loopStart) % loopWidth + loopWidth) % loopWidth : 0;
    const previous = shelf.scrollLeft;
    track.querySelectorAll(':scope > .buttons[aria-hidden="true"]').forEach(copy => copy.remove());
    const copies = Math.ceil(shelf.clientWidth / width) + 2;
    for (let i = 0; i < copies; i++) {
      track.prepend(cloneButtons());
      track.append(cloneButtons());
    }
    loopWidth = width;
    loopStart = copies * width;
    shelf.scrollLeft = loopStart + offset;
    if (dragging) initialScroll += shelf.scrollLeft - previous;
  }
  function wrap() {
    if (!loopWidth) return;
    const previous = shelf.scrollLeft;
    if (previous >= loopStart && previous < loopStart + loopWidth) return;
    const offset = ((previous - loopStart) % loopWidth + loopWidth) % loopWidth;
    shelf.scrollLeft = loopStart + offset;
    // Keep the pointer anchored to the same button across each seam.
    if (dragging) initialScroll += shelf.scrollLeft - previous;
  }
  rebuild();
  new ResizeObserver(rebuild).observe(shelf);
  shelf.addEventListener('scroll', wrap, { passive: true });

  shelf.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') mouseOverShelf = true;
  });
  shelf.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') mouseOverShelf = false;
  });
  shelf.addEventListener('dragstart', event => event.preventDefault());
  shelf.addEventListener('pointerdown', event => {
    if (activePointer !== null || event.button !== 0) return;
    activePointer = event.pointerId;
    // Capture on the clicked item so plain taps still activate links and
    // releases outside the row return here without window-wide handlers.
    event.target.setPointerCapture(event.pointerId);
    moved = false;
    if (event.pointerType !== 'mouse') { touching = true; return; }
    dragging = true;
    origin = event.clientX;
    initialScroll = shelf.scrollLeft;
  });
  shelf.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== activePointer) return;
    const distance = event.clientX - origin;
    if (Math.abs(distance) > 5) {
      moved = true;
      shelf.classList.add('is-dragging');
    }
    if (moved) { shelf.scrollLeft = initialScroll - distance; wrap(); }
  });
  function release(event) {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    dragging = false;
    touching = false;
    shelf.classList.remove('is-dragging');
    resumeAt = performance.now() + 450;
  }
  shelf.addEventListener('pointerup', release);
  shelf.addEventListener('pointercancel', release);
  shelf.addEventListener('lostpointercapture', release);
  shelf.addEventListener('click', event => {
    if (moved) { event.preventDefault(); event.stopPropagation(); moved = false; }
  }, true);
  shelf.addEventListener('wheel', () => { resumeAt = performance.now() + 450; }, { passive: true });
  function frame(now) {
    const elapsed = Math.min(now - lastFrame, 50);
    lastFrame = now;
    if (!motion.matches && !document.hidden && !dragging && !touching &&
        now >= resumeAt && !mouseOverShelf && !shelf.querySelector('a:focus-visible')) {
      // Retain subpixel movement: some browsers round scrollLeft assignments.
      pendingDistance += elapsed * 0.032;
      const pixels = Math.floor(pendingDistance);
      pendingDistance -= pixels;
      shelf.scrollLeft += pixels;
      wrap();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
