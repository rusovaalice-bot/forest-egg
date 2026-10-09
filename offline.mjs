export const RELEASE='1.2.0';
// Availability is measured from the installed cache, not navigator.onLine.
export function askStatus(worker,timeout=8000){
 return new Promise((resolve,reject)=>{
  const channel=new MessageChannel(),close=()=>{channel.port1.close();channel.port2.close();};
  const timer=setTimeout(()=>{close();reject(Error('status_timeout'));},timeout);
  channel.port1.onmessage=event=>{clearTimeout(timer);close();resolve(event.data);};
  try{worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);}catch(error){clearTimeout(timer);close();reject(error);}
 });
}
export async function setupOffline({show,notify,button}){
 if(!('serviceWorker'in navigator)||!window.isSecureContext){show('unavailable','Автономный запуск здесь недоступен. Нужны поддержка офлайн-игры и адрес HTTPS.');button.disabled=true;return;}
 let registration;
 const report=data=>{
  if(data?.type==='OFFLINE_FAILED'){show('error','Не все файлы загрузились. Подключи сеть и нажми «Подготовить офлайн».');return;}
  if(data?.type!=='OFFLINE_STATUS')return;
  if(data.ready&&data.version===RELEASE)show('ready','Все файлы игры сохранены на устройстве. Открой её снова без VPN или в авиарежиме, чтобы проверить запуск.');
  else show('loading',`Сохранено ${Number(data.count)||0} из ${Number(data.total)||14} файлов. Дождись завершения загрузки.`);
 };
 navigator.serviceWorker.addEventListener('message',event=>report(event.data));
 const inspect=async()=>{
  const worker=navigator.serviceWorker.controller||registration?.active;
  if(!worker){show('loading','Загружаю игру для автономного запуска…');return;}
  try{report(await askStatus(worker));}catch{show('error','Офлайн-копия ещё не подтверждена. Подключи сеть и повтори подготовку.');}
 };
 const watch=reg=>{
  registration=reg;
  const track=worker=>{if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='activated')inspect();if(worker.state==='redundant')show('error','Загрузка прервалась. Подключи сеть и повтори подготовку.');});};
  track(reg.installing);reg.addEventListener('updatefound',()=>track(reg.installing));
 };
 const prepare=async(user=false)=>{
  button.disabled=true;show('loading','Проверяю и загружаю автономную копию…');
  try{
   const existing=await navigator.serviceWorker.getRegistration(new URL('./',location.href).href);
   if(existing){watch(existing);await inspect();}
   try{const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});watch(reg);if(!reg.installing)await inspect();}
   catch{if(!existing)show('error','Не удалось загрузить файлы для первого офлайн-запуска. Подключи сеть и повтори.');else await inspect();}
   if(user)notify('Статус автономной копии показан в настройках.');
  }finally{button.disabled=false;}
 };
 navigator.serviceWorker.addEventListener('controllerchange',()=>inspect());
 button.addEventListener('click',()=>prepare(true).catch(()=>show('error','Браузер не разрешил подготовить офлайн-копию.')));
 const mode=document.getElementById('connection-mode');
 const network=()=>{if(mode)mode.textContent=navigator.onLine?'Браузер видит подключение к сети':'Браузер работает без сети';};
 network();window.addEventListener('online',network);window.addEventListener('offline',network);
 await prepare().catch(()=>show('error','Браузер не разрешил подготовить офлайн-копию.'));
}
