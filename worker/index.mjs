import {publishCider,ciderListening,ciderStats} from './cider.mjs';

async function listening({env}) {
  const headers = {'Cache-Control': 'public, max-age=60'};
  if (!env.LASTFM_API_KEY) return Response.json({error: 'not_configured'}, {status: 503});
  try {
    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    url.search = new URLSearchParams({method: 'user.getrecenttracks', user: 'LunaClient', api_key: env.LASTFM_API_KEY, format: 'json', limit: '1'});
    const response = await fetch(url, {signal: AbortSignal.timeout(8000)});
    const data = await response.json();
    if (!response.ok || data.error) throw new Error('Last.fm unavailable');
    const tracks = data.recenttracks?.track;
    const track = Array.isArray(tracks) ? tracks[0] : tracks;
    return Response.json({track: track ? {name: track.name, artist: track.artist?.['#text'] || '', url: track.url, album: track.album?.['#text'] || '', image: [...(track.image || [])].reverse().find(image => image['#text'])?.['#text'] || null, scrobbledAt: /^\d+$/.test(track.date?.uts || '') ? Number(track.date.uts) : null, nowPlaying: track['@attr']?.nowplaying === 'true'} : null}, {headers});
  } catch {
    return Response.json({error: 'unavailable'}, {status: 502, headers: {'Cache-Control': 'no-store'}});
  }
}

// Cache shared public music statistics for five minutes, independently of now-playing.
async function musicStats({request, env, ctx}) {
  if (!env.LASTFM_API_KEY) return Response.json({error:'not_configured'}, {status:503});
  const cache=globalThis.caches?.default;
  const cacheKey=new Request(new URL('/api/music-stats',request.url), {method:'GET'});
  const cached=await cache?.match(cacheKey);
  if(cached)return cached;
  async function call(method,params={}){
    const url=new URL('https://ws.audioscrobbler.com/2.0/');
    url.search=new URLSearchParams({method,user:'LunaClient',api_key:env.LASTFM_API_KEY,format:'json',...params});
    const response=await fetch(url,{signal:AbortSignal.timeout(8000)}),data=await response.json();
    if(!response.ok||data.error)throw new Error('Last.fm unavailable');
    return data;
  }
  const results=await Promise.allSettled([
    call('user.getinfo'),call('user.gettopartists',{period:'7day',limit:'1'}),call('user.gettoptracks',{period:'7day',limit:'1'})
  ]);
  const value=i=>results[i].status==='fulfilled'?results[i].value:null;
  const first=items=>Array.isArray(items)?items[0]:items;
  const integer=value=>value!==null&&value!==undefined&&/^\d+$/.test(String(value))&&Number.isSafeInteger(Number(value))?Number(value):null;
  const user=value(0)?.user,artist=first(value(1)?.topartists?.artist),track=first(value(2)?.toptracks?.track);
  if(results.every(result=>result.status==='rejected'))return Response.json({error:'unavailable'},{status:502,headers:{'Cache-Control':'no-store'}});
  const response=Response.json({
    scrobbles:integer(user?.playcount),registeredAt:integer(user?.registered?.unixtime),
    topArtist:artist?{name:artist.name,url:artist.url,plays:integer(artist.playcount)}:null,
    topTrack:track?{name:track.name,artist:track.artist?.name||'',url:track.url,plays:integer(track.playcount)}:null
  },{headers:{'Cache-Control':'public, max-age=300'}});
  if(cache&&ctx?.waitUntil)ctx.waitUntil(cache.put(cacheKey,response.clone()));
  return response;
}

async function visitor({request, env}) {
  const headers = {'Cache-Control': 'no-store'};
  if (!env.VISITORS) return Response.json({error: 'not_configured'}, {status: 503, headers});
  const token = request.headers.get('X-Visitor-ID');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(token || '')) {
    return Response.json({error: 'invalid_visitor'}, {status: 400, headers});
  }
  try {
    const results = await env.VISITORS.batch([
      env.VISITORS.prepare('INSERT INTO visitors (token) VALUES (?) ON CONFLICT(token) DO NOTHING').bind(token),
      env.VISITORS.prepare('SELECT number FROM visitors WHERE token = ?').bind(token)
    ]);
    const number = results[1].results[0]?.number;
    if (!Number.isSafeInteger(number)) throw new Error('Invalid counter');
    return Response.json({number}, {headers});
  } catch {
    return Response.json({error: 'unavailable'}, {status: 503, headers});
  }
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    // The publisher is authenticated with a separate secret, never a website API key.
    // Cider runs under different local origins across platforms; CORS grants no write access.
    if(path==='/api/cider/publish'){
      const origin=request.headers.get('Origin');
      const headers={'Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Vary':'Origin','Cache-Control':'no-store'};
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
      if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers});
      const response=await publishCider({request,env});
      const result=new Response(response.body,response);for(const [key,value] of Object.entries(headers))result.headers.set(key,value);return result;
    }
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!origin || !allowed.includes(origin)) return new Response('Forbidden', {status: 403});
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Visitor-ID',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers});
    let response;
    if (path === '/api/listening' && request.method === 'GET') response = env.MUSIC_SOURCE==='cider'?await ciderListening({env}):await listening({env});
    else if (path === '/api/music-stats' && request.method === 'GET') response = env.MUSIC_SOURCE==='cider'?await ciderStats({env}):await musicStats({request, env, ctx});
    else if (path === '/api/visitor' && request.method === 'POST') response = await visitor({request, env});
    else response = new Response('Not found', {status: 404});
    const result = new Response(response.body, response);
    for (const [name, value] of Object.entries(headers)) result.headers.set(name, value);
    return result;
  }
};
