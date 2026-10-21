(() => {
  const nav = document.querySelector('.section-nav');
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const targets = links.map(link => document.querySelector(link.getAttribute('href')));
  const marker = nav.querySelector('.section-marker');
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
    const rect = links[selected].getBoundingClientRect(), base = nav.getBoundingClientRect();
    marker.style.width = `${rect.width}px`;
    marker.style.transform = `translate(${rect.left - base.left}px, ${rect.bottom - base.top + 1}px)`;
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  new ResizeObserver(schedule).observe(document.querySelector('main'));
  update();
})();
