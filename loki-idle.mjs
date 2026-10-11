// Local deformation of Loki's sprites; paws and the bottom silhouette stay anchored.
const bell=(x,y,cx,cy,rx,ry)=>Math.exp(-2*((x-cx)**2/rx**2+(y-cy)**2/ry**2));
const pulse=(t,start,length)=>{const p=t-start;return p>0&&p<length?Math.sin(p/length*Math.PI)**2:0;};
export function blinkAmount(t){return pulse(t%9.6,3.1,.24)+pulse(t%9.6,3.48,.20);}
export const LOKI_PROFILES={
 baby:{eyes:[[.342,.345,.067,.079,-.4],[.49,.405,.075,.082,.35]],ears:[[.37,.13],[.67,.27]],chest:[.41,.65],tail:[.83,.70]},
 teen:{eyes:[[.344,.318,.067,.079,-.4],[.482,.371,.075,.080,.35]],ears:[[.37,.12],[.67,.26]],chest:[.43,.64],tail:[.83,.72]},
 young:{eyes:[[.334,.273,.052,.068,-.4],[.443,.323,.063,.064,.35]],ears:[[.34,.12],[.61,.23]],chest:[.40,.60],tail:[.84,.75]},
 adult:{eyes:[[.300,.248,.052,.064,-.4],[.411,.295,.060,.060,.35]],ears:[[.29,.11],[.55,.24]],chest:[.36,.60],tail:[.83,.73]}
};
export function posePoint(x,y,t,{age='baby',sleeping=false}={}){
 if(sleeping){
  // Raise only the back and ribcage; head, tucked paws and tail remain in place.
  const back=bell(x,y,.78,.48,.20,.17);
  const body=bell(x,y,.68,.57,.20,.15);
  const anchor=Math.max(0,Math.min(1,(.75-y)/.12))*Math.max(0,Math.min(1,(x-.48)/.18));
  const breath=Math.sin(t*Math.PI*2/6.4);
  return [x+body*anchor*(x-.66)*.010*breath,y-back*anchor*.007*breath];
 }
 const p=LOKI_PROFILES[age]||LOKI_PROFILES.baby;
 const still=Math.max(0,Math.min(1,(.86-y)/.12));
 const tail=bell(x,y,...p.tail,.21,.28)*still;
 const earLeft=bell(x,y,...p.ears[0],.14,.22)*still,earRight=bell(x,y,...p.ears[1],.15,.18)*still;
 const twitch=pulse(t%9.6,5.2,.65),twitchRight=pulse(t%9.6,5.48,.6);
 const breath=Math.sin(t*Math.PI*2/4.8),chest=bell(x,y,...p.chest,.16,.17)*still;
 return [x+tail*.013*Math.sin(t*Math.PI*2/4.8)+earLeft*.012*twitch-earRight*.012*twitchRight+chest*(x-p.chest[0])*.020*breath,
 y-tail*.006*Math.sin(t*Math.PI*2/4.8)-earLeft*.004*twitch-earRight*.004*twitchRight-chest*.0018*breath];
}
export function createLokiRenderer({canvas,base,closed,makeCanvas,grid=20,age='baby',sleeping=false}){
 const ctx=canvas.getContext('2d'),texture=makeCanvas(512,512),tc=texture.getContext('2d');
 const n=grid,W=canvas.width,H=canvas.height;
 function triangle(points,source){
  const [a,b,c]=points,[u,v,w]=source;
  const den=(v[0]-u[0])*(w[1]-u[1])-(w[0]-u[0])*(v[1]-u[1]);
  const A=((b[0]-a[0])*(w[1]-u[1])-(c[0]-a[0])*(v[1]-u[1]))/den;
  const C=((c[0]-a[0])*(v[0]-u[0])-(b[0]-a[0])*(w[0]-u[0]))/den;
  const B=((b[1]-a[1])*(w[1]-u[1])-(c[1]-a[1])*(v[1]-u[1]))/den;
  const D=((c[1]-a[1])*(v[0]-u[0])-(b[1]-a[1])*(w[0]-u[0]))/den;
  // Subpixel overlap avoids thin antialiased seams between triangles.
  const mx=(a[0]+b[0]+c[0])/3,my=(a[1]+b[1]+c[1])/3;
  ctx.save();ctx.beginPath();points.forEach((p,i)=>{const dx=p[0]-mx,dy=p[1]-my,len=Math.hypot(dx,dy);const px=p[0]+dx/len*1.2,py=p[1]+dy/len*1.2;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();ctx.clip();
  ctx.setTransform(A,B,C,D,a[0]-A*u[0]-C*u[1],a[1]-B*u[0]-D*u[1]);ctx.drawImage(texture,0,0);ctx.restore();
 }
 return function draw(t,{moving=true,forceBlink=false}={}){
  ctx.clearRect(0,0,W,H);tc.clearRect(0,0,512,512);tc.drawImage(base,0,0,512,512);
  const blink=sleeping||!closed?0:forceBlink?1:moving?blinkAmount(t):0;
  if(blink>0){tc.save();tc.beginPath();for(const [x,y,rx,ry,angle] of (LOKI_PROFILES[age]||LOKI_PROFILES.baby).eyes)tc.ellipse(512*x,512*y,512*rx,512*ry,angle,0,Math.PI*2);tc.clip();tc.globalAlpha=blink;tc.drawImage(closed,0,0,512,512);tc.restore();}
  const vertices=[];
  for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){const x=i/n,y=j/n,p=moving?posePoint(x,y,t,{age,sleeping}):[x,y];vertices.push([p[0]*W,p[1]*H]);}
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const k=j*(n+1)+i,s=512/n,u=i*s,v=j*s;
   triangle([vertices[k],vertices[k+1],vertices[k+n+1]],[[u,v],[u+s,v],[u,v+s]]);
   triangle([vertices[k+1],vertices[k+n+2],vertices[k+n+1]],[[u+s,v],[u+s,v+s],[u,v+s]]);
  }
 };
}
