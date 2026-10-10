import {stage} from './engine.mjs';
const suffix={'Детёныш':'','Подросток':'-teen','Юный':'-young','Взрослый':'-adult'};
export function petImage(state,now=Date.now()){
 if(state.phase==='egg')return './assets/egg.png';
 return `./assets/${state.species}${suffix[stage(state,now)]}${state.sleeping?'-sleep':''}.png`;
}
