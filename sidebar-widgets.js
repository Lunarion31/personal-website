(() => {
  const apiBase = (window.LUNARION_API_BASE || '').replace(/\/$/, '');
  const title = document.getElementById('listening-title');
  const track = document.getElementById('listening-track');
  const detail = document.getElementById('listening-detail');
  const art = document.getElementById('listening-art');
  const indicator = document.getElementById('playing-indicator');
  const widget=title.closest('.music-widget');
  const album=document.getElementById('listening-album'),scrobbled=document.getElementById('listening-scrobbled'),coverLink=document.getElementById('listening-cover-link');
  let musicSource='lastfm',profile='https://www.last.fm/user/LunaClient',playback=null,lastListeningFetch=0;
  function setSource(data){if(data.source==='cider'){musicSource='cider';profile='https://music.apple.com/';document.getElementById('music-total-label').textContent='plays tracked';document.getElementById('music-since-label').textContent='tracking since'}}
  const safeLink=(value,fallback=profile)=>{try{const url=new URL(value);return url.protocol==='https:'&&['www.last.fm','last.fm','music.apple.com'].includes(url.hostname)?url.href:fallback}catch{return fallback}};
  const number=value=>Number.isSafeInteger(value)&&value>=0?value.toLocaleString():null;
  let failedImage='';
  art.addEventListener('error', () => { failedImage=art.src;art.hidden = true; });
  async function listening() {
    try {
      if (!apiBase) throw new Error('not configured');
      const response = await fetch(apiBase + '/api/listening', {signal: AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      lastListeningFetch=Date.now();setSource(data);
      playback=data.source==='cider'&&data.track?data.track:null;paintProgress();
      art.hidden = true;
      indicator.hidden = !data.track?.nowPlaying;
      widget.classList.toggle('is-playing',!!data.track?.nowPlaying);
      album.hidden=!data.track?.album;album.textContent=data.track?.album||'';
      scrobbled.hidden=true;
      if(!data.track?.nowPlaying&&Number.isSafeInteger(data.track?.scrobbledAt)&&data.track.scrobbledAt>0){
        const date=new Date(data.track.scrobbledAt*1000);
        scrobbled.textContent=(musicSource==='cider'?'Last heard ':'Scrobbled ')+date.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});scrobbled.hidden=false;
      }
      coverLink.href=safeLink(data.track?.url);coverLink.setAttribute('aria-label',data.track?'View '+data.track.name+(musicSource==='cider'?' on Apple Music':' on Last.fm'):'View music profile');
      if (data.track?.image) {
        const image = new URL(data.track.image);
        if (image.protocol === 'https:' && (['lastfm.freetls.fastly.net','lastfm-img.freetls.fastly.net'].includes(image.hostname)||image.hostname.endsWith('.mzstatic.com'))) {
          art.alt = data.track.album ? `${data.track.album} album cover` : 'Current track artwork';
          if (art.getAttribute('src') !== image.href) art.src = image.href;
          art.hidden = image.href===failedImage;
        }
      }
      title.textContent = data.track?.nowPlaying ? 'listening to now' : 'last listening to';
      track.replaceChildren();
      if (!data.track) { track.textContent = 'No recent tracks yet'; detail.textContent = musicSource==='cider'?'Start a song in Cider to share it here.':'LunaClient on Last.fm'; return; }
      const link = document.createElement('a');
      link.href = safeLink(data.track.url);
      link.textContent = data.track.name;
      track.append(link);
      detail.textContent = data.track.artist;
    } catch {
      playback=null;paintProgress();
      art.hidden = true;
      indicator.hidden = true;
      title.textContent = 'last listening to';
      widget.classList.remove('is-playing');album.hidden=true;scrobbled.hidden=true;coverLink.href=profile;
      const link = document.createElement('a');
      link.href = profile;
      link.textContent = musicSource==='cider'?'Music will be back shortly':'LunaClient on Last.fm';
      track.replaceChildren(link);
      detail.textContent = 'Live music unavailable right now.';
    }
  }
  const timeLabel=value=>{value=Math.floor(Math.max(0,value));return Math.floor(value/60)+':'+String(value%60).padStart(2,'0')};
  function paintProgress(){
    const timeline=document.getElementById('music-timeline');
    const duration=playback?.duration;
    if(!Number.isFinite(duration)||duration<=0){timeline.hidden=true;return}
    timeline.hidden=false;
    const elapsed=playback.nowPlaying?Math.min(90,Math.max(0,Date.now()/1000-playback.updatedAt)):0;
    const position=Math.min(duration,Math.max(0,playback.position||0)+elapsed);
    document.getElementById('music-position').textContent=timeLabel(position);
    document.getElementById('music-duration').textContent=timeLabel(duration);
    const progress=document.getElementById('music-progress');progress.max=duration;progress.value=position;
    progress.setAttribute('aria-label','Playback position '+timeLabel(position)+' of '+timeLabel(duration));
  }
  setInterval(()=>{if(!document.hidden)paintProgress()},1000);
  async function musicStats(){
    const panel=document.getElementById('music-stats'),message=document.getElementById('music-stats-message');
    try{
      if(!apiBase)throw new Error('not configured');
      const response=await fetch(apiBase+'/api/music-stats',{signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error('unavailable');
      const data=await response.json();setSource(data);
      document.getElementById('music-total').textContent=number(data.scrobbles)??'—';
      const date=Number.isSafeInteger(data.registeredAt)&&data.registeredAt>0?new Date(data.registeredAt*1000):null;
      document.getElementById('music-since').textContent=date?String(date.getUTCFullYear()):'—';
      for(const [type,value] of [['artist',data.topArtist],['track',data.topTrack]]){
        const link=document.getElementById('music-top-'+type),plays=document.getElementById('music-'+type+'-plays');
        link.textContent=value?.name||'No plays this week';link.href=safeLink(value?.url);
        plays.textContent=value?(type==='track'&&value.artist?value.artist+' · ':'')+(number(value.plays)!==null?number(value.plays)+' '+(value.plays===1?'play':'plays'):''):'';
      }
      panel.hidden=false;message.hidden=true;
    }catch{
      message.textContent=panel.hidden?'Listening stats are taking a breather.':'Stats could not refresh. Showing the last update.';message.hidden=false;
    }
  }
  let pageVisitId;
  async function visitor() {
    const digits = document.querySelector('.visitor-digits');
    const note = document.querySelector('.visitor-widget .widget-detail');
    try {
      if (!apiBase) throw new Error('not configured');
      // A fresh token counts this page load, including refreshes. Keep it in memory
      // so the same visit can be retried without registering a second visit.
      const visitorId = pageVisitId ??= crypto.randomUUID();
      const response = await fetch(apiBase + '/api/visitor', {method: 'POST', headers: {'X-Visitor-ID': visitorId}, signal: AbortSignal.timeout(10000)});
      const data = await response.json();
      if (!response.ok || !Number.isSafeInteger(data.number) || data.number < 1) throw new Error('unavailable');
      digits.textContent = String(data.number).padStart(5, '0');
      digits.setAttribute('aria-label', `${data.number} visits to this site`);
      note.textContent = 'Happy you’re here ♡';
    } catch {
      digits.textContent = '— — — — —';
      digits.setAttribute('aria-label', 'Visitor counter unavailable');
      note.textContent = 'Counter unavailable right now.';
    }
  }
  listening(); musicStats(); visitor();
  setInterval(() => { if (!document.hidden&&Date.now()-lastListeningFetch>=(musicSource==='cider'?14000:59000)) listening(); }, 15000);
  setInterval(()=>{if(!document.hidden)musicStats()},300000);
})();
