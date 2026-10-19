/* Diagramas de cortante V y momento M mediante recuperación de fuerzas de elemento.
   Convención: q,P positivos hacia -Y global; M positivo sagante. */
(function(root){
'use strict';
function calculate(sol){
 if(!sol?.success)return [];
 const out=[];let station=0;
 for(const b of sol.barsTable.filter(b=>b.active)){
  const i=b.barNum-1,L=b.L,c=b.Cosx,s=b.Cosy;
  const d=sol.D_full.slice(3*i,3*i+6);
  const u=[c*d[0]+s*d[1],-s*d[0]+c*d[1],d[2],c*d[3]+s*d[4],-s*d[3]+c*d[4],d[5]];
  const EI=b.E*b.I,EA=b.E*b.A,k=12*EI/L**3,g=6*EI/L**2,h=4*EI/L,j=2*EI/L;
  const K=[[EA/L,0,0,-EA/L,0,0],[0,k,g,0,-k,g],[0,g,h,0,-g,j],[-EA/L,0,0,EA/L,0,0],[0,-k,-g,0,k,-g],[0,g,j,0,-g,h]];
  const a=Math.max(0,Math.min(L,b.a_dist>0?b.a_dist:L/2)),t=a/L,q=b.q*c,P=b.P_tramo*c;
  const f=[0,-q*L/2-P*(1-3*t*t+2*t*t*t),-q*L*L/12-P*L*(t-2*t*t+t*t*t),0,-q*L/2-P*(3*t*t-2*t*t*t),q*L*L/12-P*L*(-t*t+t*t*t)];
  const end=K.map((row,idx)=>row.reduce((sum,v,col)=>sum+v*u[col],0)-f[idx]);
  const V0=end[1],M0=-end[2];const points=[];
  const at=(x,after=false)=>({x:station+x,V:V0-q*x-(P!==0&&(x>a||after&&x===a)?P:0),M:M0+V0*x-q*x*x/2-P*Math.max(0,x-a)});
  for(let j=0;j<=60;j++){const x=L*j/60;points.push(at(x));if(P!==0&&j<60&&x<a&&(j+1)*L/60>a){points.push(at(a),at(a,true));}}
  if(P!==0&&a===L)points.push(at(L,true));
  if(P!==0&&a===0)points.unshift(at(0),at(0,true));
  out.push({bar:b.barNum,start:station,L,points,V0,M0,Vend:end[4],Mend:end[5],q,P,a});
  station+=L;
 }
 return out;
}
function render(svg,spans,kind){
 if(!svg)return;
 const ns='http://www.w3.org/2000/svg';svg.replaceChildren();
 const node=(tag,attr,text)=>{let e=document.createElementNS(ns,tag);Object.entries(attr).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text!==undefined)e.textContent=text;svg.appendChild(e);return e};
 const all=spans.flatMap(s=>s.points),W=900,H=300,pad=55,plotW=W-2*pad,plotH=H-2*pad;
 if(!all.length){node('text',{x:40,y:50,fill:'#e2e8f0'},'Sin solución válida');return}
 const xmax=Math.max(...all.map(p=>p.x),1),maxAbs=Math.max(...all.map(p=>Math.abs(p[kind])),1e-8);
 const px=x=>pad+x/xmax*plotW,py=y=>H/2-y/maxAbs*(plotH/2-16);
 node('line',{x1:pad,y1:H/2,x2:W-pad,y2:H/2,stroke:'#94a3b8','stroke-width':1.5});
 node('line',{x1:pad,y1:pad-10,x2:pad,y2:H-pad+10,stroke:'#64748b'});
 for(const span of spans){
   let d=span.points.map((p,i)=>(i?'L':'M')+px(p.x).toFixed(2)+' '+py(p[kind]).toFixed(2)).join(' ');
   node('path',{d,fill:'none',stroke:kind==='V'?'#38bdf8':'#fbbf24','stroke-width':2.7,'stroke-linejoin':'round'});
   node('line',{x1:px(span.start),y1:pad,x2:px(span.start),y2:H-pad,stroke:'#334155','stroke-dasharray':'3 5'});
 }
 const vals=[-maxAbs,0,maxAbs];for(const v of vals)node('text',{x:pad-8,y:py(v)+4,fill:'#cbd5e1','text-anchor':'end','font-size':12},v.toFixed(2));
 node('text',{x:W-pad,y:H-15,fill:'#cbd5e1','text-anchor':'end','font-size':12},'Longitud acumulada (cm)');
 node('text',{x:pad,y:25,fill:'#e2e8f0','font-size':14},kind==='V'?'Cortante V (kgf)':'Momento flector M (kgf·cm)');
}
root.BeamDiagrams={calculate,render};
})(typeof window!=='undefined'?window:globalThis);
