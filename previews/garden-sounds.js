(() => {
  const players = [...document.querySelectorAll('audio')];
  const volume = document.getElementById('volume');
  const value = document.getElementById('volume-value');
  function setVolume() {
    players.forEach(player => { player.volume = Number(volume.value); });
    value.textContent = Math.round(Number(volume.value) * 100) + '%';
  }
  function stop(player) {
    player.pause();
    if (player.readyState > 0) player.currentTime = 0;
  }
  for (const player of players) {
    player.addEventListener('play', () => {
      players.filter(other => other !== player).forEach(stop);
    });
    player.addEventListener('error', () => {
      if (player.parentElement.querySelector('.error')) return;
      const message = document.createElement('p');
      message.className = 'error';
      message.setAttribute('role', 'status');
      message.textContent = 'This preview could not load. Reload the page to try again.';
      player.after(message);
    });
  }
  volume.addEventListener('input', setVolume);
  document.getElementById('stop-all').addEventListener('click', () => players.forEach(stop));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) players.forEach(player => player.pause());
  });
  addEventListener('pagehide', () => players.forEach(stop));
  setVolume();
})();
