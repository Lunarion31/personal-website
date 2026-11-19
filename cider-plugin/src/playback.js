// Pure metadata normalizer and play counter, independent of Cider's UI.
export function normalizeTrack(item,media){
  const a=item?.attributes||item;
  if(!a?.name||!a?.artistName)return null;
  const url=a.url||item?.url||'';
  const id=String(item?.id||a.playParams?.id||url||a.artistName+'\0'+a.name);
  let image=a.artwork?.url||'';
  image=image.replace(/\{w\}/g,'300').replace(/\{h\}/g,'300').replace(/\{f\}/g,'jpg');
  const duration=Number.isFinite(media.duration)?media.duration:Number(a.durationInMillis)/1000;
  return {id:id.slice(0,512),name:String(a.name).slice(0,256),artist:String(a.artistName).slice(0,256),album:String(a.albumName||'').slice(0,256),url,image,duration:Number.isFinite(duration)&&duration>0?Math.min(duration,172800):0};
}
export class PlayTracker{
  current=null;
  constructor(makeId=()=>crypto.randomUUID()){this.makeId=makeId}
  update(track,media,now){
    if(!track){this.current=null;return null}
    const position=Math.max(0,Number(media.currentTime)||0),playing=!media.paused&&!media.ended&&media.readyState>=2;
    let c=this.current;
    if(!c||c.track.id!==track.id||(c.position-position>Math.max(8,track.duration*.6)&&position<5)){
      c=this.current={id:this.makeId(),track,startedAt:Math.floor(Date.now()/1000),listened:0,position,at:now,playing,reported:false};
    }else{
      const elapsed=(now-c.at)/1000,advance=position-c.position;
      // Credit observed playback only: pauses, seeks, sleep and buffering add no listening time.
      if(c.playing&&playing&&elapsed>0&&elapsed<=10&&advance>0&&advance<=elapsed*1.5+1)c.listened+=Math.min(advance,elapsed);
      Object.assign(c,{track,position,at:now,playing});
    }
    if(!c.reported&&track.duration>30&&c.listened>=Math.min(track.duration/2,240)){
      c.reported=true;
      return {id:c.id,track,startedAt:c.startedAt,listened:c.listened};
    }
    return null;
  }
}
