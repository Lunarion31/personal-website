import {definePluginContext,AppleMusic,useCiderAudio,addMainMenuEntry,createModal,saveConfig} from '@ciderapp/pluginkit';
import {normalizeTrack,PlayTracker} from './playback.js';
import {findPlaybackMedia} from './media.js';
const identifier='dev.lunarion.now-playing';
let config,timer,menuCleanup,controller,tracker=new PlayTracker(),pending=[],lastSignature='',lastSent=0,busy=false,nextAttempt=0,status='Sharing is off.',disposed=false;
const context=definePluginContext({name:'Lunarion Now Playing',identifier,ce_prefix:'lunarion-playing',description:'Share your listening with your personal site.',version:'1.0.1',author:'Lunarion31',repo:'https://github.com/Lunarion31/personal-website',setup(){
  if(timer)return;
  disposed=false;
  config=context.setupConfig({enabled:false,endpoint:'https://lunarion-widgets.theturtleinwater.workers.dev',publishToken:''});
  menuCleanup=addMainMenuEntry({label:'Lunarion · Website music sharing',onClick:settings});
  timer=setInterval(tick,2000);tick();
}});
export default context.plugin;
function endpoint(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw Error('Use an HTTPS Worker origin.');return url.origin}
async function tick(){
  if(disposed||busy||!config?.value.enabled||Date.now()<nextAttempt)return;
  busy=true;
  try{
    const settings=config.value;
    if(settings.publishToken.length<32){status='Add your publishing key in settings.';return}
    let audioHost;try{audioHost=useCiderAudio()}catch{}
    const media=findPlaybackMedia(audioHost);
    if(!media){status='No readable playback element yet. Start a song or switch Cider’s audio output mode.';return}
    const track=normalizeTrack(AppleMusic.nowPlayingItem,media),play=tracker.update(track,media,performance.now());
    if(play){pending.push(play);pending=pending.slice(-100)}
    const playing=!!track&&!media.paused&&!media.ended&&media.readyState>=2;
    const snapshot={track,playing,position:Math.max(0,Number(media.currentTime)||0)};
    const signature=JSON.stringify([track?.id,playing]);
    if(signature===lastSignature&&Date.now()-lastSent<15000&&!pending.length)return;
    const batch=pending.slice(0,20);
    controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),8000);
    let response;
    try{response=await fetch(endpoint(settings.endpoint)+'/api/cider/publish',{method:'POST',headers:{Authorization:'Bearer '+settings.publishToken,'Content-Type':'application/json'},body:JSON.stringify({...snapshot,plays:batch}),signal:controller.signal})}finally{clearTimeout(timeout);controller=null}
    if(!response.ok)throw Error(response.status===401?'Publishing key rejected. Check plugin and Worker keys.':'Worker returned '+response.status);
    pending.splice(0,batch.length);lastSignature=signature;lastSent=Date.now();nextAttempt=0;
    status=playing?'Sharing: '+track.artist+' — '+track.name:track?'Paused. The site shows your last track.':'Connected. Nothing playing.';
  }catch(error){status=error.message||'Could not reach your Worker.';nextAttempt=Date.now()+15000}finally{busy=false}
}
function settings(){
  const element=document.createElement('div');
  element.style.cssText='padding:24px;max-width:460px;font:14px/1.5 system-ui';
  element.innerHTML='<h2 style="margin:0 0 12px;font:600 20px/1.3 system-ui">Website music sharing</h2><p>Only track details and listening counts are sent. Your website never connects to Cider directly.</p><form><label style="display:block;margin:14px 0">Worker origin<input name="endpoint" type="url" required style="display:block;width:100%;padding:8px"></label><label style="display:block;margin:14px 0">Publishing key<input name="token" type="password" autocomplete="off" minlength="32" required style="display:block;width:100%;padding:8px"></label><label><input name="enabled" type="checkbox"> Share my listening with my website</label><p role="status"></p><button type="submit">Save settings</button><button type="button" data-close style="margin-left:8px">Close</button></form>';
  const form=element.querySelector('form'),message=element.querySelector('[role=status]');
  form.elements.endpoint.value=config.value.endpoint;form.elements.token.value=config.value.publishToken;form.elements.enabled.checked=config.value.enabled;
  const modal=createModal({escClose:true,element});
  message.textContent=status;
  const refresh=setInterval(()=>message.textContent=status,1000);
  modal.dialogElement.addEventListener('close',()=>clearInterval(refresh),{once:true});
  element.querySelector('[data-close]').onclick=()=>{clearInterval(refresh);modal.closeDialog()};
  form.onsubmit=async event=>{
    event.preventDefault();
    try{
      const origin=endpoint(form.elements.endpoint.value),key=form.elements.token.value.trim();
      if(key.length<32)throw Error('Use a publishing key of at least 32 characters.');
      controller?.abort();
      config.value.endpoint=origin;config.value.publishToken=key;config.value.enabled=form.elements.enabled.checked;
      await saveConfig();tracker=new PlayTracker();pending=[];lastSignature='';nextAttempt=0;
      status=config.value.enabled?'Connecting…':'Sharing is off. The site will stop showing live playback within 90 seconds.';message.textContent=status;tick();
    }catch(error){message.textContent=error.message}
  };
  modal.openDialog();
}
export function dispose(){disposed=true;clearInterval(timer);timer=null;controller?.abort();menuCleanup?.();pending=[];tracker=new PlayTracker()}
addEventListener('pagehide',dispose,{once:true});
