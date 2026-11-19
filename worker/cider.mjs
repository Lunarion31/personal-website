const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function cleanText(value,max=256){if(typeof value!=='string'||value.length>max)throw Error('Invalid text');return value.trim()}
function publicURL(value,image=false){
  if(!value)return '';
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port)throw Error('Invalid URL');
  if(image?!url.hostname.endsWith('.mzstatic.com'):url.hostname!=='music.apple.com')throw Error('Invalid host');
  if(url.href.length>2048)throw Error('URL too long');
  return url.href;
}
export function cleanTrack(value){
  if(value===null)return null;
  if(!value||Array.isArray(value))throw Error('Invalid track');
  const track={id:cleanText(value.id,1024),name:cleanText(value.name),artist:cleanText(value.artist),album:cleanText(value.album||''),image:publicURL(value.image,true),url:publicURL(value.url),duration:Number(value.duration)};
  if(!track.id||!track.name||!track.artist||!Number.isFinite(track.duration)||track.duration<0||track.duration>172800)throw Error('Invalid track fields');
  return track;
}
async function authorized(request,secret){
  if(typeof secret!=='string'||secret.length<32)return false;
  const header=request.headers.get('Authorization')||'';
  if(!header.startsWith('Bearer ')||header.length>512)return false;
  const bytes=new TextEncoder(),hash=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.encode(value)));
  const [a,b]=await Promise.all([hash(header.slice(7)),hash(secret)]);let difference=0;
  for(let i=0;i<a.length;i++)difference|=a[i]^b[i];
  return difference===0;
}
async function boundedJSON(request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw Error('Expected JSON');
  if(Number(request.headers.get('Content-Length'))>32768)throw Error('Too large');
  const reader=request.body?.getReader();if(!reader)throw Error('Missing body');let length=0;const chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>32768){await reader.cancel();throw Error('Too large')}chunks.push(value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function publishCider({request,env}){
  if(!env.CIDER_PUBLISH_TOKEN||!env.VISITORS)return json({error:'not_configured'},503);
  if(!await authorized(request,env.CIDER_PUBLISH_TOKEN))return json({error:'unauthorized'},401);
  const now=Math.floor(Date.now()/1000);let data,track,plays;
  try{
    data=await boundedJSON(request);track=cleanTrack(data.track);
    if(typeof data.playing!=='boolean'||!Number.isFinite(data.position)||data.position<0||data.position>172800||!Array.isArray(data.plays)||data.plays.length>20)throw Error('Invalid update');
    plays=data.plays.map(play=>{
      const track=cleanTrack(play.track);
      if(!track||!uuid.test(play.id)||!Number.isSafeInteger(play.startedAt)||play.startedAt>now+60||play.startedAt<now-7*86400||!Number.isFinite(play.listened)||play.listened<Math.min(track.duration/2,240)||play.listened>track.duration+10||track.duration<=30)throw Error('Invalid play');
      return {...play,track};
    });
  }catch{return json({error:'invalid_update'},400)}
  try{
    await env.VISITORS.batch([
      env.VISITORS.prepare('INSERT INTO music_now_playing (id,track_json,playing,position,updated_at) VALUES (1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET track_json=COALESCE(excluded.track_json,music_now_playing.track_json),playing=excluded.playing,position=CASE WHEN excluded.track_json IS NULL THEN music_now_playing.position ELSE excluded.position END,updated_at=excluded.updated_at')
        .bind(track?JSON.stringify(track):null,track&&data.playing?1:0,data.position,now),
      ...plays.map(p=>env.VISITORS.prepare('INSERT INTO music_plays (play_id,song_id,name,artist,album,image,url,started_at,listened) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(play_id) DO NOTHING')
        .bind(p.id,p.track.id,p.track.name,p.track.artist,p.track.album,p.track.image,p.track.url,p.startedAt,p.listened))
    ]);
    return json({ok:true});
  }catch{return json({error:'storage_unavailable'},503)}
}
export async function ciderListening({env}){
  if(!env.VISITORS)return json({error:'not_configured'},503);
  try{
    const row=await env.VISITORS.prepare('SELECT * FROM music_now_playing WHERE id=1').first();
    if(!row?.track_json)return json({source:'cider',track:null});
    const track=JSON.parse(row.track_json),fresh=Date.now()/1000-row.updated_at<90;
    return json({source:'cider',track:{...track,nowPlaying:!!row.playing&&fresh,scrobbledAt:row.updated_at,position:row.position,updatedAt:row.updated_at}});
  }catch{return json({error:'storage_unavailable'},503)}
}
export async function ciderStats({env}){
  if(!env.VISITORS)return json({error:'not_configured'},503);
  const since=Math.floor(Date.now()/1000)-7*86400;
  try{
    const results=await env.VISITORS.batch([
      env.VISITORS.prepare('SELECT COUNT(*) AS total, MIN(started_at) AS first_play FROM music_plays'),
      env.VISITORS.prepare('SELECT artist AS name, COUNT(*) AS plays FROM music_plays WHERE started_at>=? GROUP BY artist ORDER BY plays DESC, name LIMIT 1').bind(since),
      env.VISITORS.prepare('SELECT song_id, MAX(name) AS name, MAX(artist) AS artist, MAX(url) AS url, COUNT(*) AS plays FROM music_plays WHERE started_at>=? GROUP BY song_id ORDER BY plays DESC, name LIMIT 1').bind(since)
    ]);
    const total=results[0].results[0],artist=results[1].results[0],track=results[2].results[0];
    return json({source:'cider',scrobbles:total.total,registeredAt:total.first_play,topArtist:artist?{...artist,url:'https://music.apple.com/us/search?term='+encodeURIComponent(artist.name)}:null,topTrack:track||null});
  }catch{return json({error:'storage_unavailable'},503)}
}
