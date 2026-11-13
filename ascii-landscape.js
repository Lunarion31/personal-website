/* Jungle Falls © 2026 bas3line, MIT. See assets/vendor/ascii-rest/LICENSE.
 * Its field, remapped to sakura colors, and the shared tree are shaded by textmode. */
window.prepareLunarionLandscape=async()=>{
 const {default:jungleFalls,meta}=await import('/assets/vendor/ascii-rest/jungle-falls.js');
 const frame=jungleFalls(),indices=new Uint8Array(meta.cols*meta.rows);
 const field=document.createElement('canvas');field.width=meta.cols;field.height=meta.rows;
 const fc=field.getContext('2d'),pixels=fc.createImageData(meta.cols,meta.rows);
 const sakura=['#251925','#3b2438','#56314e','#74425f','#985574','#bb7a98','#d6a3b9','#edc9d0'];
 const palette=meta.palette.map((hex,i)=>(i<8?sakura[i]:hex).slice(1).match(/../g).map(c=>parseInt(c,16)));
 const cover={' ':0,'·':.3,'•':.6,'●':1},tree=window.createLunarionSakura(4);
 function update(time){
  const cells=frame(time+6,{color:indices}).replace(/\n/g,'');
  for(let i=0;i<indices.length;i++){
   const level=cover[cells[i]]||0,color=palette[indices[i]],offset=i*4;
   for(let channel=0;channel<3;channel++)pixels.data[offset+channel]=Math.round(color[channel]*level);
   pixels.data[offset+3]=255;
  }
  fc.putImageData(pixels,0,0);
 }
 window.drawLunarionLandscape=(ctx,box,time,scroll=0)=>{
  update(time);
  const {x,y,width:w,height:h}=box;
  ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
  ctx.fillStyle='#170d16';ctx.fillRect(0,0,w,h);
  const scale=Math.max(w/meta.cols,h/meta.rows),dw=meta.cols*scale,dh=meta.rows*scale;
  // Cover the viewport without changing the waterfall's proportions.
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(field,w*.84-101*scale,-(dh-h)*.2,dw,dh);
  const treeWidth=Math.min(w*.58,h*.78),treeHeight=treeWidth*1.015;
  const left=-treeWidth*.23,top=h-treeHeight*.96;
  ctx.save();ctx.translate(left+treeWidth*.5,top+treeHeight);ctx.rotate(Math.sin(time*.45)*.004);
  ctx.drawImage(tree,500,180,1400,1420,-treeWidth*.5,-treeHeight,treeWidth,treeHeight);ctx.restore();
  // Keep the central reading area calm while the scenery remains visible at its edges.
  const clearing=ctx.createLinearGradient(0,0,w,0);
  clearing.addColorStop(0,'#170d1620');clearing.addColorStop(.18,'#170d1670');clearing.addColorStop(.3,'#170d16d8');clearing.addColorStop(.66,'#170d16d8');clearing.addColorStop(.85,'#170d1660');clearing.addColorStop(1,'#170d1620');
  ctx.fillStyle=clearing;ctx.fillRect(0,0,w,h);ctx.restore();
 };
};
