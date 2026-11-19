(() => {
  const nav = document.querySelector('.section-nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const targets = links.map(link => document.querySelector(link.getAttribute('href')));
  let queued = false, pending = null, animation = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function select(selected) {
    links.forEach((link, index) => {
      if (index === selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function update() {
    queued = false;
    if (pending !== null) { select(pending); return; }
    let selected = 0;
    const threshold = Math.min(innerHeight * .25, 160);
    targets.forEach((target, index) => {
      if (target && target.getBoundingClientRect().top <= threshold) selected = index;
    });
    // Keep the final section active through the widgets that follow it.
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) selected = links.length - 1;
    select(selected);
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  function release() {
    cancelAnimationFrame(animation);
    animation = 0;
    pending = null;
    schedule();
  }
  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !targets[index]) return;
    event.preventDefault();
    release();
    pending = index;
    select(index);
    const start = scrollY;
    const inset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 30;
    const destination = Math.max(0, Math.min(
      document.documentElement.scrollHeight - innerHeight,
      start + targets[index].getBoundingClientRect().top - inset));
    const distance = destination - start;
    const duration = Math.min(1150, 480 + Math.sqrt(Math.abs(distance)) * 12);
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    if (reduced.matches || Math.abs(distance) < 2) {
      scrollTo({top:destination, behavior:'instant'});
      release();
      return;
    }
    let began;
    function glide(now) {
      began ??= now;
      const progress = Math.min(1, (now - began) / duration);
      // Quintic smoothstep has no abrupt velocity or acceleration at either end.
      const eased = progress ** 3 * (progress * (progress * 6 - 15) + 10);
      scrollTo({top:start + distance * eased, behavior:'instant'});
      if (progress < 1) animation = requestAnimationFrame(glide);
      else release();
    }
    animation = requestAnimationFrame(glide);
  }));
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('wheel', release, {passive:true});
  window.addEventListener('touchstart', release, {passive:true});
  window.addEventListener('keydown', event => {
    if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Escape'].includes(event.key)) release();
  });
  reduced.addEventListener('change', release);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('resize', schedule, {passive:true});
  const main = document.querySelector('main');
  if (main) new ResizeObserver(schedule).observe(main);
  document.fonts?.ready.then(schedule);
  update();
})();

(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('section-enter');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.05 });
  document.querySelectorAll('main > section, .buttons-section').forEach(section => observer.observe(section));
  motion.addEventListener('change', event => {
    if (event.matches) observer.disconnect();
  });
})();
