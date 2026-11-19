// Render the site's actual Bezier petals into a smooth alternate 88×31 button.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'garden-button-'));
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage();
 await page.goto(process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4174/');
 const frames=await page.evaluate(async()=>{
  const font=new FontFace('Button Serif','url(/assets/fonts/geist-serif-regular.woff2)');await font.load();document.fonts.add(font);
  const canvas=document.createElement('canvas');canvas.width=528;canvas.height=186;
  const ctx=canvas.getContext('2d');
  function petal(length,breadth,tone){
   ctx.fillStyle=tone;ctx.beginPath();ctx.moveTo(0,0);
   ctx.bezierCurveTo(-breadth,-length*.32,-breadth*.93,-length*1.19,-breadth*.19,-length);
   ctx.bezierCurveTo(breadth*.36,-length*1.14,breadth,-length*.65,0,0);ctx.fill();
   ctx.strokeStyle='#45253580';ctx.lineWidth=.24;
   for(const bend of [-.46,0,.36]){ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(bend*breadth,-length*.43,bend*breadth*.87,-length*.86);ctx.stroke();}
  }
  function bloom(x,y,r,turn){
   ctx.save();ctx.translate(x,y);ctx.rotate(turn);ctx.scale(1,.82);
   for(let i=0;i<7;i++){ctx.save();ctx.rotate(i*Math.PI*2/7);petal(r*(1+.12*Math.sin(i*3+r)),r*.55,['#bb797b','#d2958c','#e1aaa0','#ac6a76'][i%4]);ctx.restore();}
   ctx.fillStyle='#392130';ctx.beginPath();ctx.arc(0,0,r*.15,0,Math.PI*2);ctx.fill();
   for(let j=0;j<15;j++){const a=j*2.4,rr=Math.sqrt(j)*r*.05;ctx.fillStyle='#e6c38a';ctx.fillRect(Math.cos(a)*rr,Math.sin(a)*rr,.45,.65);}ctx.restore();
  }
  function leaf(x,y,length,angle,tone){
   ctx.save();ctx.translate(x,y);ctx.rotate(angle);
   ctx.beginPath();ctx.moveTo(0,0);
   ctx.bezierCurveTo(length*.12,-length*.38,length*.75,-length*.42,length,0);
   ctx.bezierCurveTo(length*.7,length*.25,length*.2,length*.3,0,0);
   ctx.fillStyle=tone;ctx.fill();
   ctx.strokeStyle='#b4b38a';ctx.lineWidth=.15;
   ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(length*.5,-length*.05,length*.9,0);ctx.stroke();
   ctx.restore();
  }
  const frames=[];
  for(let i=0;i<192;i++){
   const t=i/192*Math.PI*2;
   ctx.setTransform(6,0,0,6,0,0);ctx.fillStyle='#29101f';ctx.fillRect(0,0,88,31);
   // A periodic gust rises and settles smoothly, with still air between passes.
   const phase=i/192;
   const gust=phase>.18&&phase<.78 ? Math.pow(Math.sin((phase-.18)/.6*Math.PI),2) : 0;
   const sway=Math.sin(t)*.7+gust*3.2;
   const wind=gust*7;
   ctx.strokeStyle='#b59a72';ctx.lineWidth=.45;
   ctx.beginPath();ctx.moveTo(-5,38);ctx.bezierCurveTo(12,35,-3,27,1+sway,21);ctx.stroke();
   ctx.beginPath();ctx.moveTo(12,34);ctx.bezierCurveTo(31,18,12,13,21+sway*.6,-1);ctx.stroke();
   // Layered sage leaves and fine fern fronds grow from the frame edges.
   leaf(15,25,11,-.95+sway*.025,'#6e8069');
   leaf(18,19,8,-2.5+sway*.03,'#85937b');
   leaf(20,10,8,-.55+sway*.035,'#657960');
   leaf(84,24,10,-2.1+sway*.025,'#77876b');
   leaf(85,18,8,-1.1+sway*.03,'#93a083');
   for(let frond=0;frond<3;frond++){
    const base=18+frond*9, height=7+frond*2;
    const bend=Math.sin(t+frond)*.8+gust*2.4;
    ctx.strokeStyle='#7e906d';ctx.lineWidth=.3;
    ctx.beginPath();ctx.moveTo(base,33);ctx.quadraticCurveTo(base-2,29,base-4+bend,33-height);ctx.stroke();
    for(let j=1;j<5;j++){
     const y=33-j*height/5,x=base-j*.8+bend*j/5;
     leaf(x,y,4-j*.45,-2.7+bend*.04,'#677e61');
     leaf(x,y,3.6-j*.4,-.65+bend*.04,'#879879');
    }
   }
   bloom(1+sway,21,16,-.25+sway*.025);
   bloom(21+sway*.6,-1,11,.4+sway*.02);
   bloom(91-sway*.5,30,12,.4-sway*.02);
   for(let n=0;n<8;n++){
    const y=((i+n*24)%192)/192*44-6;
    const x=20+(n*17)%65+Math.sin(t+n)*3+wind;
    ctx.save();ctx.translate(x,y);ctx.rotate(t+n*2+gust*.8);petal(2.8,1.3,['#bb797b','#d2958c','#e1aaa0','#ac6a76'][n%4]);ctx.restore();
   }
   // Whole blossoms drift through the same garden, with offscreen loop resets.
   for(let n=0;n<4;n++){
    const progress=((i+n*48)%192)/192;
    const y=progress*55-12;
    const x=25+n*17+Math.sin(t+n*2)*4+wind*.65;
    ctx.save();ctx.globalAlpha=.78;
    bloom(x,y,n%2===0?4.2:3.4,t*.5+n*1.7+gust*.35);
    ctx.restore();
   }
   ctx.fillStyle='#f4eddf';ctx.font='17px "Button Serif"';ctx.textAlign='right';ctx.fillText('lumi',81,27);
   ctx.strokeStyle='#9f805d';ctx.lineWidth=.4;ctx.strokeRect(.2,.2,87.6,30.6);
   frames.push(canvas.toDataURL('image/png').split(',')[1]);
  }
  return frames;
 });
 frames.forEach((data,i)=>fs.writeFileSync(path.join(tmp,`${i}.png`),Buffer.from(data,'base64')));
 execFileSync('python3',['-c',`from PIL import Image
from pathlib import Path
import sys
folder=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
frames=[Image.open(folder/f'{i}.png').convert('RGB').resize((528,186),Image.Resampling.LANCZOS) for i in range(192)]
sheet=Image.new('RGB',(528,186*192))
for i,frame in enumerate(frames):sheet.paste(frame,(0,i*186))
palette=sheet.quantize(colors=128)
indexed=[frame.quantize(palette=palette,dither=Image.Dither.NONE) for frame in frames]
indexed[0].save(out/'lumi-garden.gif',save_all=True,append_images=indexed[1:],duration=40,loop=0,disposal=2,optimize=False)
frames[0].save(out/'lumi-garden.png')
`,tmp,path.join(root,'static/img/buttons')]);
 } finally {await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}
 console.log('Rendered garden button using the site’s curved petals.');
})().catch(e=>{console.error(e);process.exit(1)});
