(() => {
  const apiBase = (window.LUNARION_API_BASE || '').replace(/\/$/, '');
  const title = document.getElementById('listening-title');
  const track = document.getElementById('listening-track');
  const detail = document.getElementById('listening-detail');
  async function listening() {
    try {
      if (!apiBase) throw new Error('not configured');
      const response = await fetch(apiBase + '/api/listening', {signal: AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      title.textContent = data.track?.nowPlaying ? 'listening to now' : 'last listening to';
      track.replaceChildren();
      if (!data.track) { track.textContent = 'No recent tracks yet'; detail.textContent = 'LunaClient on Last.fm'; return; }
      const link = document.createElement('a');
      const url = new URL(data.track.url);
      link.href = url.protocol === 'https:' && (url.hostname === 'www.last.fm' || url.hostname === 'last.fm') ? url.href : 'https://www.last.fm/user/LunaClient';
      link.textContent = data.track.name;
      track.append(link);
      detail.textContent = data.track.artist;
    } catch {
      title.textContent = 'last listening to';
      const link = document.createElement('a');
      link.href = 'https://www.last.fm/user/LunaClient';
      link.textContent = 'LunaClient on Last.fm';
      track.replaceChildren(link);
      detail.textContent = 'Live music unavailable right now.';
    }
  }
  async function visitor() {
    const digits = document.querySelector('.visitor-digits');
    const note = document.querySelector('.visitor-widget .widget-detail');
    try {
      if (!apiBase) throw new Error('not configured');
      let visitorId = localStorage.getItem('lunarion-visitor-id');
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(visitorId || '')) {
        visitorId = crypto.randomUUID();
        localStorage.setItem('lunarion-visitor-id', visitorId);
      }
      const response = await fetch(apiBase + '/api/visitor', {method: 'POST', headers: {'X-Visitor-ID': visitorId}, signal: AbortSignal.timeout(10000)});
      const data = await response.json();
      if (!response.ok || !Number.isSafeInteger(data.number) || data.number < 1) throw new Error('unavailable');
      digits.textContent = String(data.number).padStart(5, '0');
      digits.setAttribute('aria-label', `You are visitor number ${data.number}`);
      note.textContent = 'Happy you’re here ♡';
    } catch {
      digits.textContent = '— — — — —';
      digits.setAttribute('aria-label', 'Visitor counter unavailable');
      note.textContent = 'Counter unavailable right now.';
    }
  }
  listening(); visitor();
  setInterval(() => { if (!document.hidden) listening(); }, 60000);
})();
