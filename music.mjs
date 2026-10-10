const VOLUME_KEY='ragna.forest-egg.music-volume';
export function createMusic({createAudio,createContext,storage,onChange=()=>{}}){
 let volume=20,enabled=false,pending=false,error='',player,context,gain,revision=0;
 try{const raw=storage?.getItem(VOLUME_KEY);if(raw!==null&&raw!==undefined&&Number.isFinite(Number(raw)))volume=Math.max(0,Math.min(100,Number(raw)));}catch{}
 const report=()=>onChange({volume,enabled,pending,error});
 function stop(){revision++;enabled=false;pending=false;player?.pause();error='';report();}
 function setVolume(value){volume=Math.max(0,Math.min(100,Number(value)||0));if(gain)gain.gain.value=volume/100;try{storage?.setItem(VOLUME_KEY,String(volume));}catch{}report();}
 async function start(){
  if(pending||enabled)return;
  const attempt=++revision;pending=true;error='';report();
  try{
   if(!player){
    player=createAudio('./assets/forest-music.mp3');player.loop=true;player.preload='auto';
    player.addEventListener('error',()=>{stop();error='Музыка не загрузилась. Подключи интернет и подготовь офлайн-копию ещё раз.';report();});
   }
   if(!context){context=createContext();gain=context.createGain();gain.gain.value=volume/100;context.createMediaElementSource(player).connect(gain);gain.connect(context.destination);}
   await context.resume();
   if(attempt!==revision)return;
   await player.play();
   if(attempt!==revision){player.pause();return;}
   enabled=true;pending=false;report();
  }catch{if(attempt!==revision)return;player?.pause();pending=false;enabled=false;error='Не удалось включить музыку. Нажми «Включить музыку» ещё раз при открытой игре.';report();}
 }
 report();
 return{start,stop,setVolume,toggle(){return enabled||pending?stop():start();}};
}
