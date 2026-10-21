(() => {
  const button = document.getElementById('theme-switch');
  if (!button) return;
  function sync() {
    const dark = document.documentElement.dataset.theme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.textContent = dark ? '☀ light mode' : '☾ dark mode';
  }
  button.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    if (dark) document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('lunarion-theme', dark ? 'dark' : 'light'); } catch {}
    sync();
  });
  sync();
})();
