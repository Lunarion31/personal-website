(() => {
  const shelf = document.querySelector('.button-window');
  const buttons = shelf?.querySelector('.buttons');
  const toggle = document.getElementById('buttons-motion');
  if (!buttons || !toggle) return;
  const track = document.createElement('div');
  track.className = 'button-track';
  const copy = buttons.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.querySelectorAll('a').forEach(link => link.tabIndex = -1);
  track.append(buttons, copy);
  shelf.append(track);
  shelf.classList.add('is-moving');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function sync() { toggle.hidden = motion.matches; }
  sync();
  motion.addEventListener('change', sync);
  toggle.addEventListener('click', () => {
    const paused = shelf.classList.toggle('is-paused');
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'play buttons' : 'pause buttons';
  });
})();
