export async function onRequestGet({env}) {
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
    return Response.json({track: track ? {name: track.name, artist: track.artist?.['#text'] || '', url: track.url, nowPlaying: track['@attr']?.nowplaying === 'true'} : null}, {headers});
  } catch {
    return Response.json({error: 'unavailable'}, {status: 502, headers: {'Cache-Control': 'no-store'}});
  }
}
