(() => {
  const clock = document.getElementById('sidebar-clock');
  const date = document.getElementById('sidebar-date');
  const timeFormat = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit'});
  const dateFormat = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric'});
  function update() {
    const now = new Date();
    clock.textContent = timeFormat.format(now).toLowerCase();
    clock.dateTime = now.toISOString();
    date.textContent = dateFormat.format(now);
  }
  update();
  setInterval(() => { if (!document.hidden) update(); }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
})();
