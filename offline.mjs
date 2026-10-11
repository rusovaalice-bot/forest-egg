export const RELEASE='1.7.0';
export function deadline(promise,ms,label='operation_timeout'){
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(label)),ms);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
}
export function askWorker(worker,type,timeout=8000){
 return new Promise((resolve,reject)=>{
  const channel=new MessageChannel(),close=()=>{channel.port1.close();channel.port2.close();};
  const timer=setTimeout(()=>{close();reject(Error('status_timeout'));},timeout);
  channel.port1.onmessage=event=>{clearTimeout(timer);close();resolve(event.data);};
  try{worker.postMessage({type},[channel.port2]);}catch(error){clearTimeout(timer);close();reject(error);}
 });
}
export const askStatus=(worker,timeout=8000)=>askWorker(worker,'OFFLINE_STATUS',timeout);
export async function setupOffline({show,notify,button,env=globalThis,timeouts={}}){
 const {navigator,window,location,document}=env;
 const timing={lookup:5000,register:20000,status:8000,repair:120000,...timeouts};
 if(!('serviceWorker'in navigator)||!window.isSecureContext){show('unavailable','Автономный запуск здесь недоступен. Нужны поддержка офлайн-игры и адрес HTTPS.');button.disabled=true;return;}
 let registration,busy=false,inspection=0;
 const report=data=>{
  if(data?.type==='OFFLINE_FAILED'){++inspection;show('error',data.asset?`Не удалось сохранить файл «${data.asset}». Подключи сеть и нажми «Подготовить офлайн» ещё раз.`:'Не все файлы загрузились. Подключи сеть и нажми «Подготовить офлайн».');return;}
  if(data?.type!=='OFFLINE_STATUS'&&data?.type!=='OFFLINE_PROGRESS')return;
  if(data.version!==RELEASE){show('loading','Обновляю автономную копию до текущей версии игры…');return;}
  if(data.ready){++inspection;show('ready','Все файлы игры сохранены на устройстве. Открой её снова без VPN или в авиарежиме, чтобы проверить запуск.');}
  else show(data.type==='OFFLINE_PROGRESS'?'loading':'error',`Сохранено ${Number(data.count)||0} из ${Number(data.total)||41} файлов. ${data.type==='OFFLINE_PROGRESS'?'Дождись завершения загрузки.':'Нажми «Подготовить офлайн», чтобы загрузить недостающие файлы.'}`);
 };
 navigator.serviceWorker.addEventListener('message',event=>report(event.data));
 const inspect=async()=>{
  const own=++inspection,worker=registration?.active||navigator.serviceWorker.controller;
  if(!worker){show('loading','Загружаю игру для автономного запуска…');return null;}
  try{const data=await askStatus(worker,timing.status);if(own===inspection)report(data);return data;}
  catch{if(own===inspection)show('error','Браузер не ответил на проверку офлайн-копии. Кнопка повторной подготовки доступна — попробуй ещё раз с подключённой сетью.');return null;}
 };
 const tracked=new WeakSet();
 const watch=reg=>{
  registration=reg;
  const track=worker=>{if(!worker||tracked.has(worker))return;tracked.add(worker);worker.addEventListener('statechange',()=>{if(worker.state==='activated')inspect();if(worker.state==='redundant'){++inspection;show('error','Загрузка прервалась. Подключи сеть и повтори подготовку.');}});};
  track(reg.installing);if(!tracked.has(reg)){tracked.add(reg);reg.addEventListener('updatefound',()=>track(reg.installing));}
 };
 const prepare=async(user=false)=>{
  if(busy)return;busy=true;button.disabled=true;++inspection;show('loading','Проверяю и загружаю автономную копию…');
  try{
   try{const existing=await deadline(navigator.serviceWorker.getRegistration(new URL('./',location.href).href),timing.lookup);if(existing)watch(existing);}catch{}
   try{
    const pending=navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    // Even a late browser reply can finish preparation after the retry button is released.
    pending.then(reg=>{watch(reg);if(!busy)inspect();},()=>{});
    watch(await deadline(pending,timing.register));
   }catch{if(!registration){show('error','Браузер не завершил подключение офлайн-копии. Проверь сеть и нажми «Подготовить офлайн» ещё раз.');return;}}
   if(registration?.installing){show('loading','Загружаю файлы новой автономной копии… Кнопка доступна для повторной проверки.');return;}
   const data=await inspect();
   if(data?.version===RELEASE&&!data.ready){
    show('loading','Восстанавливаю недостающие файлы автономной копии…');
    try{report(await askWorker(registration.active||navigator.serviceWorker.controller,'OFFLINE_PREPARE',timing.repair));}
    catch{show('error','Подготовка не завершилась вовремя. Кнопка снова доступна. Подключи сеть и повтори загрузку.');}
   }
   if(user)notify('Статус автономной копии показан в настройках.');
  }finally{busy=false;button.disabled=false;}
 };
 navigator.serviceWorker.addEventListener('controllerchange',()=>inspect());
 button.addEventListener('click',()=>prepare(true).catch(()=>{button.disabled=false;show('error','Браузер не разрешил подготовить офлайн-копию. Попробуй ещё раз.');}));
 const mode=document.getElementById('connection-mode');
 const network=()=>{if(mode)mode.textContent=navigator.onLine?'Браузер видит подключение к сети':'Браузер работает без сети';};
 network();window.addEventListener('online',network);window.addEventListener('offline',network);
 await prepare().catch(()=>{button.disabled=false;show('error','Браузер не разрешил подготовить офлайн-копию. Попробуй ещё раз.');});
}
