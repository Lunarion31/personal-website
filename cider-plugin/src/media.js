// Cider's DSP source is optional. Its same-origin playback frame can still expose
// a standard media element even when the PluginKit audio tap is unavailable.
export function findPlaybackMedia(audioHost,root=document){
  const candidates=[];
  const source=audioHost?.source?.mediaElement;
  if(source)candidates.push(source);
  const seen=new Set();
  function scan(node,depth=0){
    if(!node||seen.has(node)||depth>8)return;
    seen.add(node);
    candidates.push(...node.querySelectorAll('audio,video'));
    for(const frame of node.querySelectorAll('iframe')){
      try{scan(frame.contentDocument,depth+1)}catch{ /* Cross-origin frames stay private. */ }
    }
  }
  scan(root);
  const unique=[...new Set(candidates)];
  const score=media=>(!media.paused&&!media.ended?100:0)+(media.readyState>=2?20:0)+(Number.isFinite(media.duration)&&media.duration>0?10:0)+(media.currentSrc?2:0)+(media===source?1:0);
  return unique.sort((a,b)=>score(b)-score(a))[0]||null;
}
