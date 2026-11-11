(() => {
  const nav = document.querySelector('.section-nav');
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const targets = links.map(link => document.querySelector(link.getAttribute('href')));
  let queued = false;
  function update() {
    queued = false;
    let selected = 0;
    targets.forEach((target, index) => {
      if (target.getBoundingClientRect().top <= Math.min(innerHeight * .3, 180)) selected = index;
    });
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) selected = links.length - 1;
    links.forEach((link, index) => {
      if (index === selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  new ResizeObserver(schedule).observe(document.querySelector('main'));
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
