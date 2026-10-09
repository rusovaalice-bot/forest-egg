export const VERSION=1, EGG_MINUTES=10, KEY='ragna.forest-egg.v1';
export const TYPES={fox:{title:'Лисёнок Локи',name:'Локи',trait:'Любопытный хитрец',food:6,fun:8,dirt:4,energy:5},wolf:{title:'Волчонок Фенрир',name:'Фенрир',trait:'Верный и независимый',food:7,fun:5,dirt:4,energy:4},deer:{title:'Дух Иггдрасиля',name:'Эйктюрнир',trait:'Чуткий хранитель леса',food:5,fun:5,dirt:7,energy:5}};
const clamp=(x,min=0,max=100)=>Math.min(max,Math.max(min,x));
const stats=['food','energy','clean','mood','health','bond','warmth'];
export function newGame(now=Date.now(),seed=Math.random()){return {version:VERSION,created:now,last:now,hatched:null,phase:'egg',species:null,name:'Лесное яйцо',seed,incubation:0,care:{warm:0,clean:0,play:0,soothe:0},stats:{food:85,energy:85,clean:85,mood:85,health:100,bond:10,warmth:80},sleeping:false,paused:false,sick:null,pressure:0,medicineUntil:0,lastRescue:0,cooldowns:{},journal:[{at:now,text:'В лесной колыбели появилось яйцо. Внутри кто-то тихонько шевелится.'}],careCount:0};}
export function log(s,text,now=s.last){s.journal.unshift({at:now,text});s.journal=s.journal.slice(0,80);}
export function advance(s,now=Date.now()){
 if(now<=s.last)return s;
 const delta=now-s.last;
 if(!s.paused){
  // Bounded minute integration keeps offline and online outcomes consistent.
  // After 14 days without care all needs reach their floors, so further steps add no effects.
  let remaining=Math.min(delta,14*86400000),cursor=s.last;
  while(remaining>0){const dt=Math.min(60000,remaining),h=dt/3600000,m=dt/60000;cursor+=dt;remaining-=dt;
   const a=s.stats;
   if(s.phase==='egg'){
    s.incubation=clamp(s.incubation+m*(a.warmth>=35&&a.clean>=25?1:0.2),0,EGG_MINUTES);
    a.warmth=clamp(a.warmth-7*h);a.clean=clamp(a.clean-3*h);a.mood=clamp(a.mood-3*h);
   }else{
    const t=TYPES[s.species];a.food=clamp(a.food-t.food*h*(s.sleeping?0.7:1));a.clean=clamp(a.clean-t.dirt*h);a.mood=clamp(a.mood-t.fun*h*(s.sleeping?0.4:1));a.bond=clamp(a.bond-0.35*h);
    a.energy=clamp(a.energy+(s.sleeping?24:-t.energy)*h);
    if(s.sleeping&&a.energy>=99){s.sleeping=false;log(s,'Проснулся после хорошего сна.',cursor);}
    const bad=Math.min(a.food,a.clean,a.energy)<20;
    s.pressure=bad?s.pressure+m:Math.max(0,s.pressure-m*2);
    if(s.pressure>=30&&!s.sick){s.sick=a.clean<20?'Лесная простуда':a.energy<20?'Переутомление':'Недомогание';log(s,'Заболел: '+s.sick.toLowerCase()+'. Нужны забота и отдых.',cursor);}
    if(s.sick){
     const comfortable=Math.min(a.food,a.clean,a.energy)>35;
     a.health=clamp(a.health+(comfortable?1.5:-5)*h,1);
     if(s.medicineUntil&&cursor>=s.medicineUntil&&comfortable){s.sick=null;s.medicineUntil=0;s.pressure=0;log(s,'Поправился. Лес снова кажется уютным.',cursor);}
    }else a.health=clamp(a.health+(bad?-3:1)*h,1);
   }
  }
 }
 s.last=now;return s;
}
export function hatch(s,now=Date.now()){
 advance(s,now);if(s.phase!=='egg'||s.incubation<EGG_MINUTES)return false;
 const weights=[1+s.care.play*0.3,1+Math.min(s.care.warm,s.care.clean,s.care.soothe)*0.5,1+(s.care.clean+s.care.soothe)*0.2];
 let r=s.seed*weights.reduce((a,b)=>a+b,0),i=0;while(i<2&&r>=weights[i]){r-=weights[i];i++;}
 s.species=['fox','wolf','deer'][i];s.phase='pet';s.hatched=now;s.name=TYPES[s.species].name;s.stats.food=80;s.stats.energy=80;s.stats.clean=85;s.stats.mood=85;s.stats.health=100;s.pressure=0;
 log(s,'Скорлупа раскрылась! В колыбели — '+TYPES[s.species].title.toLowerCase()+'.',now);return true;
}
export function action(s,id,now=Date.now()){
 advance(s,now);if(s.paused)return 'Сначала сними игру с паузы.';
 if(s.cooldowns[id]>now)return 'Подожди ещё '+Math.ceil((s.cooldowns[id]-now)/1000)+' сек.';
 let msg;const a=s.stats;
 if(s.phase==='egg'){
  if(id==='warm'){a.warmth=clamp(a.warmth+20);s.care.warm++;msg='Тёплые ладони согрели скорлупу.';}
  if(id==='clean'){a.clean=clamp(a.clean+25);s.care.clean++;msg='Листики чистые, мох свежий.';}
  if(id==='play'){a.mood=clamp(a.mood+20);s.care.play++;msg='Из яйца ответили тихим стуком!';}
  if(id==='soothe'){a.mood=clamp(a.mood+15);s.care.soothe++;msg='Колыбельная убаюкала маленькую тайну.';}
 }else{
  if(s.sleeping&&id!=='sleep')return 'Питомец спит. Дай ему отдохнуть или разбуди.';
  if(id==='feed'){if(a.food>94)return 'Питомец сыт. Попробуй покормить позже.';a.food=clamp(a.food+25);a.clean=clamp(a.clean-3);msg='Поел и довольно облизнулся.';}
  if(id==='play'){if(a.energy<20)return 'Слишком устал для игры. Ему нужен сон.';if(s.sick)return 'Во время болезни лучше отдыхать.';a.mood=clamp(a.mood+22);a.energy=clamp(a.energy-8);a.food=clamp(a.food-4);msg='Поймал светлячка и отпустил обратно в лес.';}
  if(id==='clean'){a.clean=clamp(a.clean+30);a.mood=clamp(a.mood+4);msg='Лапки чистые, шерстка снова мягкая.';}
  if(id==='sleep'){s.sleeping=!s.sleeping;msg=s.sleeping?'Свернулся в клубочек. Сон восстановит силы.':'Сонно потянулся и открыл глаза.';}
  if(id==='soothe'){a.mood=clamp(a.mood+10);msg='Прижался к твоей ладони.';}
  if(id==='medicine'){if(!s.sick)return 'Он здоров — лекарство сейчас не нужно.';if(s.medicineUntil>now)return 'Лекарство уже действует. Обеспечь сытость, чистоту и отдых.';a.health=clamp(a.health+10);s.medicineUntil=now+30*60000;msg='Принял лесное лекарство. Восстановление займёт 30 минут при хорошем уходе.';}
  if(id==='rescue'){if(a.health>15)return 'Экстренная помощь нужна при здоровье 15 или ниже.';if(s.lastRescue&&now-s.lastRescue<600000)return 'Лесной лекарь вернётся через несколько минут.';s.lastRescue=now;for(const k of ['food','clean','energy'])a[k]=Math.max(a[k],40);a.health=clamp(a.health+25);s.medicineUntil=now+30*60000;msg='Лесной лекарь помог. Теперь особенно нужны забота и отдых.';}
 }
 if(!msg)return 'Это действие сейчас недоступно.';
 a.bond=clamp(a.bond+1.5);s.careCount++;s.cooldowns[id]=now+(id==='sleep'?2000:id==='soothe'?15000:8000);log(s,msg,now);return msg;
}
export function stage(s,now=Date.now()){if(s.phase==='egg')return 'Тайна под скорлупой';const d=Math.max(0,(now-s.hatched)/86400000);return d<7?'Детёныш':d<30?'Подросток':d<90?'Юный':'Взрослый';}
export function validate(raw,now=Date.now()){
 if(!raw||raw.version!==VERSION)throw Error('Неизвестная версия сохранения. Нужен файл этой игры.');
 if(!['egg','pet'].includes(raw.phase)||raw.phase==='pet'&&!TYPES[raw.species])throw Error('Неверный питомец в сохранении.');
 const n=(v,lo,hi)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)throw Error('Повреждённые данные сохранения.');return v;};
 const s=newGame(n(raw.created,0,now+120000),n(raw.seed,0,1));
 s.last=n(raw.last,s.created,now+120000);s.phase=raw.phase;s.species=s.phase==='pet'?raw.species:null;s.name=typeof raw.name==='string'?raw.name.slice(0,32):s.name;
 s.hatched=s.phase==='pet'?n(raw.hatched,s.created,now+120000):null;s.incubation=n(raw.incubation,0,EGG_MINUTES);
 for(const k of stats)s.stats[k]=n(raw.stats?.[k],0,100);
 for(const k of Object.keys(s.care))s.care[k]=n(raw.care?.[k],0,1e8);
 if(typeof raw.paused!=='boolean'||typeof raw.sleeping!=='boolean')throw Error('Повреждённое состояние.');
 s.paused=raw.paused;s.sleeping=s.phase==='pet'&&raw.sleeping;
 s.sick=['Лесная простуда','Переутомление','Недомогание'].includes(raw.sick)?raw.sick:null;
 for(const k of ['pressure','medicineUntil','lastRescue','careCount'])s[k]=n(raw[k],0,1e15);
 for(const k of ['warm','clean','play','soothe','feed','sleep','medicine','rescue'])if(raw.cooldowns?.[k]!==undefined)s.cooldowns[k]=n(raw.cooldowns[k],0,now+60000);
 s.journal=Array.isArray(raw.journal)?raw.journal.slice(0,80).filter(x=>typeof x?.text==='string'&&typeof x.at==='number'&&Number.isFinite(x.at)&&x.at>=0&&x.at<=now+120000).map(x=>({at:x.at,text:x.text.slice(0,240)})):s.journal;
 return s;
}
