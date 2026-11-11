(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || location.hash) return;
  document.documentElement.dataset.intro = 'waiting';
  // A failed script or font request always gives the page back.
  window.lunarionIntroTimeout = setTimeout(() => {
    delete document.documentElement.dataset.intro;
    document.getElementById('garden-intro')?.remove();
  }, 7000);
})();
