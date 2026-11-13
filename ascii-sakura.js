/* Shared high-resolution sakura source for the detail lab and ASCII backdrop. */
window.createLunarionSakura=(detail=3)=>{
 const source=document.createElement('canvas');source.width=2400;source.height=1600;const ctx=source.getContext('2d');
 const N=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)};
 function ellipse(x,y,rx,ry,color,angle=0){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,Math.PI*2);ctx.fill()}
 function line(color,width,draw){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();draw();ctx.stroke()}

  ctx.clearRect(0,0,2400,1600);ellipse(1190,1465,840,80,'#0f101944');
  const tips=[];
  function branch(x,y,length,angle,width,depth,seed){
   const bend=(N(seed+8)-.5)*.35,ex=x+Math.cos(angle)*length,ey=y+Math.sin(angle)*length;
   line('#694650',width,()=>{ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.cos(angle+bend)*length*.55,y+Math.sin(angle+bend)*length*.55,ex,ey)});
   line('#c2948e',Math.max(.7,width*.12),()=>{ctx.moveTo(x-width*.25,y);ctx.quadraticCurveTo(x+Math.cos(angle+bend)*length*.55-width*.18,y+Math.sin(angle+bend)*length*.55,ex-1,ey)});
   if(depth>2&&detail>1)for(let i=0;i<Math.min(10,detail*2);i++){
    const f=N(seed+i*13),bx=x+(ex-x)*f,by=y+(ey-y)*f;
    line('#342733',.7+N(i+seed)*2,()=>{ctx.moveTo(bx-width*.25,by);ctx.lineTo(bx+width*.15,by-length*.07)})
   }
   if(depth<=0){tips.push([ex,ey,seed]);return}
   const spread=.31+N(seed+2)*.32;
   branch(ex,ey,length*(.65+N(seed+3)*.08),angle-spread,width*.64,depth-1,seed*2+1);
   branch(ex,ey,length*(.65+N(seed+4)*.09),angle+spread,width*.62,depth-1,seed*2+2);
   if(depth>3)branch(x+(ex-x)*.65,y+(ey-y)*.65,length*.48,angle+(seed%2?-.8:.8),width*.4,depth-2,seed*3+7);
  }
  branch(1200,1440,350,-Math.PI/2,97,5+Math.min(detail,3),17);
  for(let i=0;i<9;i++)line('#745258',8-i*.5,()=>{ctx.moveTo(1190+i*3,1395);ctx.quadraticCurveTo(1100+i*30,1440,1020+i*48,1463+N(i)*20)});
  const colors=['#8e526f','#af6b8c','#d28dab','#ebadbf','#f4c8d2','#c694b8'];
  // Sort loose blossom clusters into backlit shadows and sunlit, individually drawn florets.
  for(const [tx,ty,seed] of tips){
   const count=8+detail*8;
   for(let i=0;i<count;i++){
    const a=N(seed+i*9)*Math.PI*2,r=Math.sqrt(N(seed+i*11))*45;
    const x=tx+Math.cos(a)*r,y=ty+Math.sin(a)*r*.7,size=2+N(seed+i*7)*5.2;
    const color=colors[Math.floor(N(seed+i*3)*colors.length)];
    if(detail>1&&i%3===0){
     for(let p=0;p<5;p++){const angle=p*Math.PI*2/5;ellipse(x+Math.cos(angle)*size*.7,y+Math.sin(angle)*size*.7,size*.65,size*.4,color,angle)}
     ellipse(x,y,size*.18,size*.18,'#eed0a1');
    }else ellipse(x,y,size,size*.7,color,N(seed+i)*3);
   }
  }
  for(let i=0;i<detail*100;i++){
   const x=500+N(i+900)*1400,y=1450+N(i+800)*80;ellipse(x,y,1+N(i)*4,1.3,['#cb8fac','#e1a8b6','#a378a0'][i%3],N(i)*6)
  }

 return source;
};
