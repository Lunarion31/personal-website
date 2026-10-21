(() => {
  const button = document.getElementById('click-greeble');
  const total = document.getElementById('click-total');
  const note = document.getElementById('pocket-note');
  const status = document.getElementById('note-status');
  let clicks = 0;
  try {
    const saved = Number(localStorage.getItem('lunarion-clicks'));
    if (Number.isSafeInteger(saved) && saved >= 0) clicks = saved;
    note.value = (localStorage.getItem('lunarion-note') || '').slice(0, 2000);
  } catch { status.textContent = 'Storage unavailable; notes last until you leave.'; }
  total.textContent = clicks.toLocaleString();
  button.addEventListener('click', () => {
    clicks = Math.min(Number.MAX_SAFE_INTEGER, clicks + 1);
    total.textContent = clicks.toLocaleString();
    try { localStorage.setItem('lunarion-clicks', String(clicks)); } catch {}
  });
  note.addEventListener('input', () => {
    try {
      localStorage.setItem('lunarion-note', note.value);
      status.textContent = 'Saved in this browser. Just for you.';
    } catch { status.textContent = 'Couldn’t save; keep this page open.'; }
  });
})();
