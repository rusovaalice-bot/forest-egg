// Six authored poses: sit, lean, lift, unfold, straighten, stand.
export const RISE_DURATION=4.8;
export function riseFrame(t){
 if(t<0||t>=RISE_DURATION)return null;
 if(t<.85)return Math.min(5,Math.floor(t/.17));
 if(t<3.95)return 5;
 return Math.max(0,5-Math.floor((t-3.95)/.17));
}
export function createRiseRenderer({canvas,sheet}){
 const ctx=canvas.getContext('2d'),w=sheet.width/3,h=sheet.height/2;
 return t=>{const frame=riseFrame(t);if(frame===null)return false;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(sheet,(frame%3)*w,Math.floor(frame/3)*h,w,h,0,0,canvas.width,canvas.height*.95);return true;};
}
