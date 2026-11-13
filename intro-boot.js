(() => {
  try {
    if (localStorage.getItem('lunarion-ascii-mode') === 'on') {
      document.documentElement.dataset.asciiLoading = '';
      // Restore usable content if the renderer or its boot script cannot start.
      window.lunarionAsciiTimeout = setTimeout(() => {
        delete document.documentElement.dataset.asciiLoading;
        dispatchEvent(new Event('ascii-restore-timeout'));
      }, 10000);
      return;
    }
  } catch {}
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || location.hash) return;
  document.documentElement.dataset.intro = 'waiting';
  // A failed script or font request always gives the page back.
  window.lunarionIntroTimeout = setTimeout(() => {
    delete document.documentElement.dataset.intro;
    document.getElementById('garden-intro')?.remove();
  }, 7000);
})();
