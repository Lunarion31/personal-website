(() => {
  const preview=['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&new URLSearchParams(location.search).get('mobile-preview')==='1';
  const mobile=matchMedia('(max-width: 1024px) and (any-pointer: coarse)');
  try{if(!preview&&sessionStorage.getItem('lunarion-mobile-notice')==='accepted')return}catch{}
  if((!mobile.matches&&!preview)||typeof HTMLDialogElement==='undefined')return;
  const notice=document.createElement('dialog');
  notice.id='mobile-notice';notice.setAttribute('aria-labelledby','mobile-notice-title');
  notice.innerHTML='<p id="mobile-notice-title">Hey! This site is best viewed on a desktop browser</p><button type="button" autofocus>I understand</button>';
  document.body.append(notice);
  const previous=document.activeElement;
  notice.addEventListener('close',()=>{
    try{sessionStorage.setItem('lunarion-mobile-notice','accepted')}catch{}
    document.documentElement.classList.remove('mobile-notice-open');
    dispatchEvent(new Event('mobile-notice-dismissed'));
    if(previous instanceof HTMLElement&&previous!==document.body)previous.focus({preventScroll:true});
    notice.remove();
  },{once:true});
  notice.querySelector('button').addEventListener('click',()=>notice.close());
  mobile.addEventListener('change',()=>{if(!mobile.matches&&notice.open)notice.close()});
  document.documentElement.classList.add('mobile-notice-open');notice.showModal();
})();
