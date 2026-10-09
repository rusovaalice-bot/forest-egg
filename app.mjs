import {setupOffline} from './offline.mjs';
import {KEY,VERSION,TYPES,EGG_MINUTES,newGame,advance,action,hatch,stage,validate,log} from './engine.mjs';
const $=id=>document.getElementById(id),icon=id=>`<svg aria-hidden="true"><use href="#${id}"/></svg>`;
let state,knownRaw=null,storageWorks=true,activeTab='home',sound=false,audio,toastTimer;
function randomSeed(){try{return crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;}catch{return Math.random();}}
let loadNotice='';
try{knownRaw=localStorage.getItem(KEY);state=knownRaw?validate(JSON.parse(knownRaw)):newGame(Date.now(),randomSeed());}catch(e){state=newGame(Date.now(),randomSeed());storageWorks=false;loadNotice='Не удалось прочитать сохранение. Старая запись не перезаписана. Скачай копию текущей игры; при необходимости восстанови прежний файл.';}
advance(state);
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
function save(){if(!storageWorks){$('save-badge').textContent='Сохранение недоступно · скачай копию';return;}try{knownRaw=JSON.stringify(state);localStorage.setItem(KEY,knownRaw);$('save-badge').innerHTML='<i></i> Прогресс сохранён';}catch{storageWorks=false;$('save-badge').textContent='Сохранение недоступно · скачай копию';notify('Браузер не разрешил сохранение. В настройках можно скачать резервную копию.');}}
function sync(){if(!storageWorks)return;try{const raw=localStorage.getItem(KEY);if(raw&&raw!==knownRaw){state=validate(JSON.parse(raw));knownRaw=raw;}}catch{}}
function chime(){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(523,audio.currentTime);o.frequency.exponentialRampToValueAtTime(784,audio.currentTime+.15);g.gain.setValueAtTime(.055,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.35);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.36);}catch{}}
const date=at=>new Intl.DateTimeFormat('ru',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(at);
function pop(){const el=$('emotion');el.classList.remove('pop');el.textContent=state.phase==='egg'?'✧':'♡';void el.offsetWidth;el.classList.add('pop');}
function doAction(id){sync();const before=state.careCount,msg=action(state,id);if(state.careCount>before){pop();chime();}save();render();notify(msg);}
const meterSpec={food:['Сытость','food'],energy:['Энергия','moon'],clean:['Чистота','drop'],mood:['Настроение','spark'],health:['Здоровье','cross'],bond:['Привязанность','heart'],warmth:['Тепло','sun']};
function meter(k){const [title,i]=meterSpec[k],v=Math.round(state.stats[k]);return `<div class="meter ${v<25?'low':''}"><div class="meter-top"><span class="meter-label">${icon(i)}${title}</span><span class="meter-number">${v}<span> / 100</span></span></div><div class="progress" role="progressbar" aria-label="${title}" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><span style="width:${v}%"></span></div></div>`;}
function render(){
 const egg=state.phase==='egg',now=Date.now(),a=state.stats,days=Math.floor(Math.max(0,now-(state.hatched??state.created))/86400000),critical=!egg&&a.health<=15;
 $('headline').textContent=egg?'Всё начинается с тайны':'Большая дружба растёт';
 $('subtitle').textContent=egg?'Под листьями спит чья-то маленькая история.':'Маленький мир, в котором тебя всегда ждут.';
 $('scene').classList.toggle('egg',egg);$('scene').classList.toggle('sleeping',state.sleeping);$('scene').classList.toggle('sick',!!state.sick);$('home').classList.toggle('paused',state.paused);
 $('phase-label').textContent=egg?'Лесная колыбель':state.sleeping?'Сладкие сны':'Дом маленького чуда';
 const image=$('pet-image'),path=`./assets/${egg?'egg':state.species}.png`;if(image.getAttribute('src')!==path)image.src=path;
 image.alt=egg?'Лесное яйцо с живыми веточками и листиками':TYPES[state.species].title;
 const size=egg?1:days<7?.92:days<30?.97:days<90?1:1.05;image.style.width=`${size*100}%`;image.style.height=`${size*100}%`;
 $('pet-stage').textContent=stage(state).toLocaleUpperCase('ru');$('pet-name').textContent=state.name+' ✧';$('age').textContent='День '+(days+1);
 $('pet-trait').textContent=egg?'Кто появится на свет? Забота подскажет лесу.':TYPES[state.species].trait;
 $('scene-caption').textContent=egg?'Внутри кто-то ждёт встречи с тобой':state.sleeping?'Пусть ему приснятся тёплые лесные сны':state.sick?'Сейчас ему особенно нужна твоя забота':a.mood<25?'Загрустил. Побудь рядом немного':'Ты рядом — и лес становится уютнее';
 $('hatch-panel').hidden=!egg;$('status-message').hidden=egg||(!state.sick&&!state.sleeping&&!state.paused);
 $('status-message').textContent=state.paused?'Потребности на паузе. Снять паузу можно в настройках.':state.sick?(state.sick+'. '+(state.medicineUntil>now?'Лекарство действует ещё '+Math.ceil((state.medicineUntil-now)/60000)+' мин. Нужны сытость, чистота и отдых.':state.medicineUntil?'Лекарство принято. Подними сытость, чистоту и энергию выше 35.':'Помогут лекарство, кормление, чистота и сон.')):'Питомец отдыхает. Энергия восстанавливается со временем.';
 const percent=Math.min(100,Math.floor(state.incubation/EGG_MINUTES*100));$('hatch-percent').textContent=percent+'%';$('hatch-bar').style.width=percent+'%';$('hatch').hidden=percent<100;
 $('hatch-hint').textContent=percent>=100?'Скорлупа дрожит. Малыш готов к встрече!':state.paused?'Созревание приостановлено.':`Примерно ${Math.max(1,Math.ceil(EGG_MINUTES-state.incubation))} мин при хорошем уходе. Тепло и чистота помогают созреванию.`;
 $('status-pill').textContent=state.paused?'На паузе':critical?'Нужна помощь':state.sick?'Болеет':state.sleeping?'Спит':Math.min(a.clean,egg?a.warmth:a.food,egg?a.mood:a.energy)<25?'Ждёт заботы':'Всё хорошо';
 $('status-pill').classList.toggle('bad',critical||!!state.sick);
 $('meters').innerHTML=(egg?['warmth','clean','mood','bond']:['food','energy','clean','mood','health','bond']).map(meter).join('');
 const acts=egg?[['warm','sun','Согреть','Тепло ладоней'],['clean','drop','Освежить','Чистая колыбель'],['play','spark','Поговорить','Ответ из скорлупы'],['soothe','moon','Колыбельная','Спокойствие']]:[['feed','food','Покормить','Лесное угощение'],['play','spark','Поиграть','Поймать светлячка'],['sleep','moon',state.sleeping?'Разбудить':'Уложить','Отдых и силы'],['clean','drop','Помыть','Чистые лапки'],['soothe','heart','Погладить','Побыть рядом'],['medicine','cross','Лекарство',state.sick?'Помочь поправиться':'Только при болезни']];
 const signature=JSON.stringify([egg,state.sleeping,!!state.sick,state.paused]);
 if($('actions').dataset.signature!==signature){$('actions').dataset.signature=signature;$('actions').replaceChildren(...acts.map(([id,i,title,small])=>{const b=document.createElement('button');b.className='action';b.dataset.action=id;b.innerHTML=icon(i)+`<span>${title}<small>${small}</small></span>`;b.addEventListener('click',()=>doAction(id));return b;}));}
 for(const b of $('actions').children){const id=b.dataset.action;b.disabled=state.paused||(!egg&&state.sleeping&&id!=='sleep')||id==='medicine'&&!state.sick;}
 $('rescue').hidden=!critical;$('rescue').disabled=state.paused||state.sleeping;
 $('care-tip').textContent=egg?'Тепло, чистота и голос рядом — всё, что нужно маленькому чуду.':state.sick?'Лекарство помогает, когда сытость, чистота и энергия выше 35. Сон восстановит силы.':'Питомец живёт и между заходами. Возвращайся за маленькой порцией заботы.';
 const latest=state.journal[0];$('latest').textContent=latest?.text??'В лесу тихо.';$('latest-time').textContent=latest?date(latest.at):'';
 $('pause').textContent=state.paused?'Продолжить игру':'Поставить на паузу';$('name-input').disabled=egg;$('rename').disabled=egg;
 if(activeTab==='journal')renderJournal();
}
function renderJournal(){
 const items=[[state.phase==='egg'?'Ожидание':stage(state),'Стадия жизни'],[String(state.careCount),'Добрых дел'],[state.sick?'Болеет':'В порядке','Самочувствие']];
 $('journal-summary').replaceChildren(...items.map(([value,label])=>{const el=document.createElement('div');el.className='summary-item';const strong=document.createElement('strong');strong.textContent=value;el.append(strong,document.createTextNode(label));return el;}));
 $('journal-list').replaceChildren(...state.journal.map(entry=>{const el=document.createElement('article');el.className='journal-entry';const div=document.createElement('div'),p=document.createElement('p'),small=document.createElement('small');p.textContent=entry.text;small.textContent=date(entry.at);div.append(p,small);el.append(div);return el;}));
}
function tab(id){activeTab=id;document.querySelectorAll('.tab').forEach(x=>x.hidden=x.id!==id);document.querySelectorAll('.nav').forEach(x=>{x.classList.toggle('active',x.dataset.tab===id);x.setAttribute('aria-current',x.dataset.tab===id?'page':'false');});if(id==='settings')$('name-input').value=state.name;render();window.scrollTo({top:0,behavior:'instant'});}
document.querySelectorAll('[data-tab]').forEach(x=>x.addEventListener('click',()=>tab(x.dataset.tab)));document.querySelectorAll('[data-go]').forEach(x=>x.addEventListener('click',()=>tab(x.dataset.go)));
const guide={fox:['Забавы и проделки','Быстрее скучает. Особенно любит игры и внимание.'],wolf:['Сила и доверие','Выносливее, но любит поесть. Ему важна регулярная забота.'],deer:['Листья и тишина','Дух леса в облике оленёнка. Особенно чувствителен к чистоте.']};
for(const [id,t] of Object.entries(TYPES)){$('creatures').insertAdjacentHTML('beforeend',`<article class="creature-card"><div class="creature-art"><img src="./assets/${id}.png" alt="${t.title}" loading="lazy"></div><div class="creature-copy"><span class="eyebrow">${guide[id][0].toLocaleUpperCase('ru')}</span><h2>${t.title}</h2><p>${guide[id][1]}</p><small>${t.trait} · Один из трёх сюрпризов</small></div></article>`);}
function confirm(title,text){$('confirm-title').textContent=title;$('confirm-text').textContent=text;return new Promise(resolve=>{const d=$('confirm-dialog');d.returnValue='cancel';d.addEventListener('close',()=>resolve(d.returnValue==='ok'),{once:true});d.showModal();});}
let hatchBusy=false;
 $('hatch').addEventListener('click',()=>{if(hatchBusy)return;sync();if(state.paused)return notify('Сначала сними игру с паузы.');advance(state);if(state.incubation<EGG_MINUTES)return;hatchBusy=true;$('scene').classList.add('hatching');$('hatch').disabled=true;setTimeout(()=>{sync();if(!state.paused&&hatch(state)){save();render();pop();chime();notify('Добро пожаловать, '+state.name+'!');}else render();$('scene').classList.remove('hatching');$('hatch').disabled=false;hatchBusy=false;},900);});
 $('pet-touch').addEventListener('click',()=>doAction(state.phase==='egg'?'warm':'soothe'));$('rescue').addEventListener('click',()=>doAction('rescue'));
 $('sound').addEventListener('click',()=>{sound=!sound;$('sound').style.background=sound?'#dce8ce':'transparent';$('sound').setAttribute('aria-label',sound?'Выключить звуки':'Включить звуки');$('sound').setAttribute('aria-pressed',String(sound));chime();notify(sound?'Тихие звуки включены.':'Звуки выключены.');});
 $('rename').addEventListener('click',()=>{sync();if(state.phase==='egg')return;const name=$('name-input').value.trim();if(!name)return notify('Впиши имя малыша.');advance(state);state.name=name.slice(0,32);log(state,'Теперь подопечного зовут '+state.name+'.');save();render();notify('Имя сохранено.');});
 $('pause').addEventListener('click',()=>{sync();advance(state);state.paused=!state.paused;log(state,state.paused?'Забота на паузе: потребности заморожены.':'Вернулись к лесной жизни.');save();render();notify(state.paused?'Потребности на паузе.':'Игра продолжается.');});
 $('export').addEventListener('click',()=>{sync();advance(state);save();const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='forest-egg-save-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);notify('Резервная копия готова. Сохрани файл в «Файлы».');});
 $('import').addEventListener('click',()=>$('import-file').click());
 $('import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>250000)throw Error('Файл слишком большой для сохранения этой игры.');const next=validate(JSON.parse(await file.text()));if(!await confirm('Восстановить историю?','Текущая игра будет заменена файлом. Если нужно, сначала отмени и скачай её копию.'))return;state=next;storageWorks=true;advance(state);save();$('name-input').value=state.name;render();notify('История восстановлена. Учтено время с последнего сохранения.');}catch(e){notify(e instanceof SyntaxError?'Файл не похож на сохранение JSON.':e.message);}});
 $('reset').addEventListener('click',async()=>{if(!await confirm('Начать новую историю?','Текущий питомец исчезнет из этого браузера. Вернуть его можно только из резервной копии.'))return;state=newGame(Date.now(),randomSeed());storageWorks=true;save();tab('home');notify('В колыбели появилось новое лесное яйцо.');});
 window.addEventListener('storage',e=>{if(e.key===KEY){sync();advance(state);render();}});
 document.addEventListener('visibilitychange',()=>{sync();advance(state);save();render();});window.addEventListener('pagehide',()=>{sync();advance(state);save();});
 let lastSave=Date.now();setInterval(()=>{if(document.hidden)return;sync();advance(state);render();if(Date.now()-lastSave>=15000){save();lastSave=Date.now();}},1000);
 save();render();if(loadNotice)notify(loadNotice);
 $('access-note').textContent=location.hostname.endsWith('.chatgpt.site')?'На текущем личном адресе первый вход может потребовать ChatGPT. После полной загрузки попробуй автономный запуск.':'На этом адресе для игры не нужен вход в ChatGPT. Сохранение хранится на твоём устройстве.';
 setupOffline({notify,button:$('prepare-offline'),show:(kind,detail)=>{const badge=$('offline-badge');badge.dataset.state=kind;badge.textContent=kind==='ready'?'✓ Автономная копия готова':kind==='loading'?'Загружаю файлы…':kind==='unavailable'?'Недоступно в этом браузере':'Нужна повторная загрузка';$('offline-detail').textContent=detail;}});
