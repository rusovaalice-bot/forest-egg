import {createLokiRenderer} from './loki-idle.mjs?v=1.6.0';
import {createRiseRenderer} from './loki-rise.mjs?v=1.6.0';

export function lokiVariant(path){
 const match=/\/fox(?:-(teen|young|adult))?(-sleep)?\.png$/.exec(path);
 return match?{age:match[1]||'baby',sleeping:!!match[2],blink:path.replace('.png','-blink.png')}:null;
}

export function createLokiAnimator({image,host,env=window,doc=document,makeRenderer=createLokiRenderer,makeRiseRenderer=createRiseRenderer}){
 const canvas=doc.createElement('canvas');canvas.width=512;canvas.height=512;canvas.className='loki-canvas';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;host.append(canvas);
 const makeCanvas=(w,h)=>{const c=doc.createElement('canvas');c.width=w;c.height=h;return c;};
 const assets=new Map(),motion=env.matchMedia('(prefers-reduced-motion: reduce)');
 let selected='',revision=0,draw=null,frame=null,time=0,last=0,painted=0,current=null,disposed=false;
 let riseDraw=null,riseAt=null;
 const paint=()=>{if(riseAt!==null&&riseDraw){if(riseDraw(time-riseAt))return;riseAt=null;}draw(time);};
 const load=path=>{
  if(!assets.has(path))assets.set(path,new Promise((resolve,reject)=>{const im=new env.Image();im.onload=()=>resolve(im);im.onerror=()=>{assets.delete(path);reject(Error('Animation asset unavailable'));};im.src=path;}));
  return assets.get(path);
 };
 const stop=()=>{if(frame!==null)env.cancelAnimationFrame(frame);frame=null;last=0;};
 const visible=()=>current?.visible&&!doc.hidden&&!disposed;
 const animate=()=>visible()&&!current.paused&&!motion.matches;
 function tick(now){frame=null;if(!animate()||!draw)return;const dt=last?Math.min(80,now-last):0;last=now;time+=dt/1000;if(now-painted>=1000/24){paint();painted=now;}frame=env.requestAnimationFrame(tick);}
 function schedule(){stop();if(!draw||!visible())return;if(motion.matches)draw(0,{moving:false});if(animate())frame=env.requestAnimationFrame(tick);}
 function fallback(){stop();draw=null;riseDraw=null;riseAt=null;canvas.hidden=true;image.classList.remove('loki-animated');}
 async function rise(){
  const variant=lokiVariant(current?.path||'');
  if(!draw||!animate()||variant?.age!=='baby'||variant.sleeping||riseAt!==null)return false;
  const own=revision;
  try{const sheet=await load('./assets/fox-rise.png');if(own!==revision||!animate()||disposed)return false;riseDraw=makeRiseRenderer({canvas,sheet});riseAt=time;paint();return true;}catch{return false;}
 }
 async function update(next){
  if(disposed)return;current={...next};canvas.style.width=next.size;canvas.style.height=next.size;
  const variant=next.species==='fox'&&next.phase==='pet'?lokiVariant(next.path):null;
  const key=variant?next.path:'';
  if(key===selected){if(frame===null)schedule();else if(!animate())stop();return;}
  selected=key;const own=++revision;fallback();if(!variant)return;
  try{
   const [base,closed]=await Promise.all([load(next.path),variant.sleeping?Promise.resolve(null):load(variant.blink)]);
   if(own!==revision||disposed)return;
   draw=makeRenderer({canvas,base,closed,makeCanvas,age:variant.age,sleeping:variant.sleeping});time=0;painted=0;draw(0,{moving:!motion.matches});canvas.hidden=false;image.classList.add('loki-animated');schedule();
  }catch{if(own===revision){selected='';fallback();}}
 }
 const visibility=()=>schedule(),hide=()=>stop();doc.addEventListener('visibilitychange',visibility);env.addEventListener('pagehide',hide);env.addEventListener('pageshow',visibility);motion.addEventListener?.('change',visibility);
 return {update,rise,destroy(){disposed=true;++revision;fallback();canvas.remove();doc.removeEventListener('visibilitychange',visibility);env.removeEventListener('pagehide',hide);env.removeEventListener('pageshow',visibility);motion.removeEventListener?.('change',visibility);}};
}
