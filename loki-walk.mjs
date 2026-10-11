import {createRiseRenderer} from './loki-rise.mjs?v=1.7.0';

export const WALK_DURATION=6.6;
// A short outward walk and gentle backward steps to the original spot.
// Distance changes only during walking; pauses keep the paws planted.
export function walkPose(t){
 if(t<0||t>=WALK_DURATION)return null;
 if(t<1.15)return {phase:'rise',time:Math.min(t,1),offset:0};
 if(t<3.15){const p=(t-1.15)/2;return {phase:'walk',frame:Math.floor((t-1.15)*8)%8,offset:-24*p};}
 if(t<3.45)return {phase:'walk',frame:0,offset:-24};
 if(t<5.45){const p=(t-3.45)/2;return {phase:'walk',frame:(8-Math.floor((t-3.45)*8)%8)%8,offset:-24*(1-p)};}
 if(t<5.75)return {phase:'rise',time:1,offset:0};
 return {phase:'rise',time:3.95+t-5.75,offset:0};
}
export function createWalkRenderer({canvas,sheet,walkSheet}){
 const rise=createRiseRenderer({canvas,sheet}),ctx=canvas.getContext('2d'),w=walkSheet.width/4,h=walkSheet.height/2;
 return t=>{
  const pose=walkPose(t);if(!pose)return false;
  if(pose.phase==='rise')return rise(pose.time);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // Match the standing sprite's scale and ground line across sheet layouts.
  ctx.drawImage(walkSheet,(pose.frame%4)*w,Math.floor(pose.frame/4)*h,w,h,(pose.offset-8)*canvas.width/512,-6*canvas.height/512,canvas.width*1.025,canvas.height*.95*1.025);
  return true;
 };
}
