(() => {
  const button = document.getElementById('intro-sound-switch');
  const replay = document.getElementById('replay-intro');
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  button.hidden = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let audio, buffers, loading, enabled = true, revision = 0, readyRevision = -1;

  const reminder=document.createElement('div');
  reminder.id='sound-reminder';reminder.hidden=true;reminder.setAttribute('aria-label','Sound reminder');
  reminder.innerHTML='<p>This site has a little sound.</p><span>Your browser is keeping it quiet.</span><div><button type="button" class="sound-reminder-enable">Enable sound</button><button type="button" class="sound-reminder-dismiss">Not now</button></div>';
  (document.querySelector('.page-controls')||document.body).append(reminder);
  let previewReminder=['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&new URLSearchParams(location.search).get('sound-preview')==='1';
  let reminderDismissed=false,reminderTimer,reminderFade;
  try{reminderDismissed=sessionStorage.getItem('lunarion-sound-reminder-dismissed')==='yes'}catch{}
  function showReminder(){reminderFade?.cancel();reminderFade=null;reminder.hidden=false}
  function hideReminder(){
    if(previewReminder)return;
    clearTimeout(reminderTimer);
    if(reminder.hidden||reminderFade)return;
    if(motion.matches){reminder.hidden=true;return}
    const fade=reminder.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-4px)'}],{duration:220,easing:'ease-out',fill:'forwards'});
    reminderFade=fade;
    fade.finished.then(()=>{if(reminderFade===fade){reminder.hidden=true;reminderFade=null;fade.cancel()}}).catch(()=>{});
  }
  function dismissReminder(){previewReminder=false;reminderDismissed=true;hideReminder();try{sessionStorage.setItem('lunarion-sound-reminder-dismissed','yes')}catch{}}
  function scheduleReminder(){
    clearTimeout(reminderTimer);
    if(reminderDismissed||!enabled||document.hidden||audio?.state==='running')return;
    reminderTimer=setTimeout(()=>{
      if(reminderDismissed||!enabled||document.hidden||audio?.state==='running')return;
      if(document.documentElement.dataset.intro||document.documentElement.classList.contains('ascii-intro-running')){scheduleReminder();return}
      showReminder();
    },5500);
  }
  reminder.querySelector('.sound-reminder-dismiss').addEventListener('click',dismissReminder);
  reminder.querySelector('.sound-reminder-enable').addEventListener('click',()=>{
    previewReminder=false;
    enabled=true;const request=++revision;
    reminder.querySelector('.sound-reminder-enable').textContent='Enabling…';
    activate(request);
    setTimeout(()=>{if(!reminder.hidden){reminder.querySelector('.sound-reminder-enable').textContent='Try again';reminder.querySelector('span').textContent='Still quiet? Check your browser’s sound setting for this site.'}},2000);
  });

  const voices = new Set();
  let thunkBuffer, whooshBuffer;

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

  function ready(request) {
    if (request !== revision || readyRevision === request || !enabled || !buffers || document.hidden || audio?.state !== 'running') return;
    hideReminder();
    readyRevision = request;
    sync();
    window.dispatchEvent(new Event('intro-sound-ready'));
  }

  async function activate(request) {
    try {
      if(!audio){audio=new AudioEngine();audio.addEventListener('statechange',()=>{if(audio.state==='running')hideReminder();else scheduleReminder()})}
      scheduleReminder();
      // Fetch in parallel: resume may remain pending until a trusted gesture.
      await Promise.all([audio.resume(), load()]);
      if (request !== revision || !enabled || document.hidden) return;
      if (audio.state !== 'running') throw new Error('Audio unavailable');
      ready(request);
    } catch {
      if (request !== revision || !enabled) return;
      stop();
      sync();
      button.textContent = '♫ retry sound';
    }
  }

  button.addEventListener('click', () => {
    const retry = button.textContent === '♫ retry sound';
    enabled = retry || !enabled;
    const request = ++revision;
    sync();
    if (!enabled) { dismissReminder(); stop(); return; }
    button.textContent = '♫ loading…';
    activate(request);
  });

  function unlock(event) {
    if (!event.isTrusted || !enabled || document.hidden) return;
    if (event.target.closest?.('#intro-sound-switch,#sound-reminder')) return;
    if (audio?.state !== 'running') {
      const request = revision;
      audio?.resume().then(() => load()).then(() => ready(request)).catch(() => {});
    }
  }
  for (const event of ['pointerdown', 'touchstart', 'keydown']) {
    addEventListener(event, unlock, {passive: true});
  }

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
  addEventListener('konami-step', async () => {
    if (!enabled || document.hidden) return;
    const request = revision;
    try {
      audio ??= new AudioEngine();
      // Resume on this key gesture, then let intro cancellation finish before sounding it.
      await audio.resume();
      if (!enabled || request !== revision || document.hidden || audio.state !== 'running') return;
      if (!thunkBuffer) {
        const duration = .085, rate = audio.sampleRate;
        thunkBuffer = audio.createBuffer(1, Math.ceil(duration * rate), rate);
        const data = thunkBuffer.getChannelData(0);
        let phase = 0, held = 0, previous = -1, seed = 71;
        for (let i = 0; i < data.length; i++) {
          const time = i / rate, step = Math.floor(time * 8000);
          if (step !== previous) {
            phase += (68 + 125 * Math.exp(-time * 80)) / 8000;
            seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
            const noise = ((seed >>> 0) / 4294967296 * 2 - 1) * Math.exp(-time * 210) * .22;
            const tone = (Math.sin(phase * Math.PI * 2) > 0 ? 1 : -1) * .38;
            held = Math.round((tone + noise) * 16) / 16; previous = step;
          }
          const attack = Math.min(1, time / .0015);
          data[i] = held * attack * Math.exp(-time * 65) * (1 - time / duration);
        }
      }
      const source = audio.createBufferSource(), gain = audio.createGain();
      source.buffer = thunkBuffer; gain.gain.value = .22;
      source.connect(gain).connect(audio.destination); voices.add(source);
      source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); };
      source.start();
    } catch { /* Visual feedback still works when browser audio is unavailable. */ }
  });
  addEventListener('konami-burst', async () => {
    if (!enabled || motion.matches || document.hidden) return;
    const request = revision;
    try {
      audio ??= new AudioEngine();
      await audio.resume();
      if (!enabled || request !== revision || document.hidden || audio.state !== 'running') return;
      const duration = .85;
      if (!whooshBuffer) {
        whooshBuffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate);
        const data = whooshBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
      const now = audio.currentTime;
      source.buffer = whooshBuffer;
      filter.type = 'bandpass'; filter.Q.value = .65;
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(2100, now + .22);
      filter.frequency.exponentialRampToValueAtTime(450, now + duration);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(.24, now + .12);
      gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      source.connect(filter).connect(gain).connect(audio.destination);
      voices.add(source);
      source.onended = () => { voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
      source.start(now, 0, duration);
    } catch { /* The petal animation can continue without audio. */ }
  });
  addEventListener('garden-intro-start', stop);
  addEventListener('garden-intro-end', event => { if (event.detail.cancelled) stop(); });
  document.addEventListener('visibilitychange', async () => {
    if (!audio) return;
    if (document.hidden) { hideReminder(); stop(); await audio.suspend().catch(() => {}); }
    else if (enabled) { scheduleReminder();await audio.resume().catch(() => {}); }
  });
  addEventListener('pagehide', () => { hideReminder(); stop(); audio?.suspend().catch(() => {}); });
  addEventListener('pageshow', event => {
    if (event.persisted && enabled) audio?.resume().catch(() => {});
  });
  motion.addEventListener('change', sync);
  sync();
  activate(revision);
  if(previewReminder)setTimeout(showReminder,500);
})();
