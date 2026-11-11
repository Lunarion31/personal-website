(() => {
  const button = document.getElementById('intro-sound-switch');
  const replay = document.getElementById('replay-intro');
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  button.hidden = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let audio, buffers, loading, enabled = false, revision = 0;

  const voices = new Set();

  function sync() {
    button.textContent = enabled ? '♫ sound on' : '♫ sound off';
    button.setAttribute('aria-pressed', String(enabled));
    replay.hidden = !enabled || !buffers || motion.matches;
  }

  async function load() {
    loading ??= Promise.all(['petal-unfold', 'glass-chime', 'fabric-glide'].map(async name => {
      const response = await fetch('/assets/audio/' + name + '.mp3');
      if (!response.ok) throw new Error('Intro recording unavailable');
      return audio.decodeAudioData(await response.arrayBuffer());
    })).then(loaded => { buffers = loaded; }).catch(error => {
      loading = null; throw error;
    });
    await loading;
  }

  function stop() {
    for (const voice of voices) { try { voice.stop(); } catch {} }
    voices.clear();
  }

  button.addEventListener('click', async () => {
    const request = ++revision;
    enabled = !enabled;
    sync();
    if (!enabled) { stop(); return; }
    button.textContent = '♫ loading…';
    try {
      audio ??= new AudioEngine();
      await audio.resume();
      await load();
      if (request !== revision || !enabled) return;
      if (audio.state !== 'running') throw new Error('Audio unavailable');
      sync();
      window.dispatchEvent(new Event('intro-sound-ready'));
    } catch {
      if (request !== revision) return;
      enabled = false;
      stop();
      sync();
      button.textContent = '♫ retry sound';
    }
  });

  addEventListener('garden-intro-cue', event => {
    if (!enabled || !buffers || document.hidden || audio?.state !== 'running') return;
    const settings = {
      paper: {buffer: buffers[0], volume: .09, duration: buffers[0].duration},
      fabric: {buffer: buffers[2], volume: .25, duration: buffers[2].duration},
      chime: {buffer: buffers[1], volume: .3, duration: buffers[1].duration}
    }[event.detail];
    if (!settings) return;
    const source = audio.createBufferSource();
    source.buffer = settings.buffer;
    const gain = audio.createGain();
    const now = audio.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(settings.volume, now + .025);
    gain.gain.setValueAtTime(settings.volume, now + settings.duration - .12);
    gain.gain.linearRampToValueAtTime(0, now + settings.duration);
    source.connect(gain).connect(audio.destination);
    voices.add(source);
    source.start(now, 0, settings.duration);
    source.onended = () => {
      voices.delete(source);
      source.disconnect(); gain.disconnect();
    };
  });
  addEventListener('garden-intro-start', stop);
  addEventListener('garden-intro-end', event => { if (event.detail.cancelled) stop(); });
  document.addEventListener('visibilitychange', async () => {
    if (!audio) return;
    if (document.hidden) { stop(); await audio.suspend().catch(() => {}); }
    else if (enabled) await audio.resume().catch(() => {});
  });
  addEventListener('pagehide', () => { stop(); audio?.suspend().catch(() => {}); });
  addEventListener('pageshow', event => {
    if (event.persisted && enabled) audio?.resume().catch(() => {});
  });
  motion.addEventListener('change', sync);
  sync();
})();
