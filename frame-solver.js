/* CEREBRO ESTRUCTURAL — PÓRTICOS 2D v1.0
   Matriz de rigidez directa para elementos Euler-Bernoulli de 6 GDL.
   Coordenadas cm, fuerzas kgf, momentos kgf·cm, E kgf/cm2, I cm4.
   Sin liberaciones internas, asentamientos, cortante de Timoshenko ni P-Delta.
*/
(function(root){
"use strict";
const EPS=1e-11;
function zeros(n,m){return Array.from({length:n},()=>Array(m).fill(0));}
function mul(A,B){let C=zeros(A.length,B[0].length);for(let i=0;i<A.length;i++)for(let k=0;k<B.length;k++)if(A[i][k])for(let j=0;j<B[0].length;j++)C[i][j]+=A[i][k]*B[k][j];return C;}
function mv(A,v){return A.map(r=>r.reduce((sum,a,i)=>sum+a*v[i],0));}
function tr(A){return A[0].map((_,j)=>A.map(r=>r[j]));}
function solve(A,b){
 let n=b.length, M=A.map((r,i)=>r.slice().concat(b[i]));
 let scale=Math.max(1,...A.map(r=>Math.max(...r.map(Math.abs))));
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;
  if(Math.abs(M[p][k])<EPS*scale)throw Error("Matriz singular o mecanismo: revisa apoyos, barras y conectividad. GDL "+(k+1));
  [M[p],M[k]]=[M[k],M[p]];
  for(let i=k+1;i<n;i++){let z=M[i][k]/M[k][k]; M[i][k]=0;for(let j=k+1;j<=n;j++)M[i][j]-=z*M[k][j];}
 }
 let x=Array(n).fill(0);
 for(let i=n-1;i>=0;i--){let v=M[i][n];for(let j=i+1;j<n;j++)v-=M[i][j]*x[j];x[i]=v/M[i][i];}
 return x;
}
function properties(p){
 const shape=p.shape||"rect";let A,I,ycg;
 if(shape==="rect"){let b=Number(p.b),h=Number(p.h);if(!(b>0&&h>0))throw Error("b y h deben ser positivos");A=b*h;I=b*h**3/12;ycg=h/2;}
 else if(shape==="circle"){let d=Number(p.d);if(!(d>0))throw Error("Diámetro inválido"); A=Math.PI*d*d/4;I=Math.PI*d**4/64;ycg=d/2;}
 else if(shape==="T"){
  let bf=Number(p.bf),tf=Number(p.tf),tw=Number(p.tw),hw=Number(p.hw);
  if(!(bf>0&&tf>0&&tw>0&&hw>0&&tw<=bf))throw Error("Dimensiones T inválidas");
  const a1=bf*tf,a2=tw*hw, y1=hw+tf/2,y2=hw/2;
  A=a1+a2;ycg=(a1*y1+a2*y2)/A;
  I=bf*tf**3/12+a1*(y1-ycg)**2+tw*hw**3/12+a2*(y2-ycg)**2;
 }else throw Error("Sección no reconocida");
 return {A,I,ycg};
}
function element(n1,n2,E,A,I,id,q0,q1,dir){
 const dx=n2.x-n1.x,dy=n2.y-n1.y,L=Math.hypot(dx,dy);
 if(!(L>0&&E>0&&A>0&&I>0))throw Error("Geometría o propiedades no válidas para barra "+id);
 const c=dx/L,s=dy/L, a=E*A/L, b=12*E*I/L**3, d=6*E*I/L**2, e=4*E*I/L, f=2*E*I/L;
 const k=[
 [a,0,0,-a,0,0],
 [0,b,d,0,-b,d],
 [0,d,e,0,-d,f],
 [-a,0,0,a,0,0],
 [0,-b,-d,0,b,-d],
 [0,d,f,0,-d,e]];
 const T=[
 [c,s,0,0,0,0],
 [-s,c,0,0,0,0],
 [0,0,1,0,0,0],
 [0,0,0,c,s,0],
 [0,0,0,-s,c,0],
 [0,0,0,0,0,1]];
 const kt=mul(tr(T),mul(k,T));
 // Carga distribuida lineal en dirección indicada; valores q0/q1 kgf/cm.
 let a0=0,a1=0,t0=0,t1=0;
 if(dir==="globalDown"){a0=-s*q0;a1=-s*q1;t0=-c*q0;t1=-c*q1;}
 else if(dir==="localY"){t0=q0;t1=q1;}
 else if(dir==="localX"){a0=q0;a1=q1;}
 else throw Error("Dirección de carga desconocida");
 const F=[
 L*(2*a0+a1)/6,
 L*(7*t0+3*t1)/20,
 L*L*(3*t0+2*t1)/60,
 L*(a0+2*a1)/6,
 L*(3*t0+7*t1)/20,
 -L*L*(2*t0+3*t1)/60
 ];
 return {id,n1:n1.id,n2:n2.id,L,c,s,E,A,I,k,T,kt,F,fg:mv(tr(T),F),a0,a1,t0,t1,dir,q0,q1};
}
function compute(model){
 const nodes=(model.nodes||[]).map(n=>({id:Number(n.id),x:Number(n.x),y:Number(n.y),support:n.support||"free",
 fx:Number(n.fx||0),fy:Number(n.fy||0),mz:Number(n.mz||0)}));
 const bars=(model.bars||[]);
 if(nodes.length<2||nodes.length>24||bars.length<1||bars.length>36)throw Error("Admite 2-24 nudos y 1-36 barras");
 if(new Set(nodes.map(n=>n.id)).size!==nodes.length)throw Error("IDs de nudos repetidos");
 nodes.forEach(n=>{if(!Number.isFinite(n.x+n.y+n.fx+n.fy+n.mz))throw Error("Hay entradas no numéricas en nudos")});
 let defaultProp=properties(model.section); let E0=Number(model.E);
 if(!(E0>0))throw Error("Módulo E debe ser positivo");
 const byId=new Map(nodes.map((n,i)=>[n.id,{...n,idx:i}]));
 const dof=nodes.length*3,K=zeros(dof,dof),F=Array(dof).fill(0), els=[];
 nodes.forEach((n,i)=>{F[3*i]=n.fx;F[3*i+1]=n.fy;F[3*i+2]=n.mz;});
 bars.forEach((raw,i)=>{
  const x=byId.get(Number(raw.from)),y=byId.get(Number(raw.to));
  if(!x||!y||x.id===y.id)throw Error("Nudos inválidos en barra "+(i+1));
  let E=Number(raw.E)||E0,A=Number(raw.A)||defaultProp.A,I=Number(raw.I)||defaultProp.I;
  let q0=Number(raw.q0||0),q1=Number(raw.q1||0);
  if(![E,A,I,q0,q1].every(Number.isFinite))throw Error("Carga o sección no numérica en barra "+(i+1));
  let el=element(x,y,E,A,I,i+1,q0,q1,raw.dir||"globalDown");el.dof=[3*x.idx,3*x.idx+1,3*x.idx+2,3*y.idx,3*y.idx+1,3*y.idx+2];
  for(let a=0;a<6;a++){F[el.dof[a]]+=el.fg[a];for(let b=0;b<6;b++)K[el.dof[a]][el.dof[b]]+=el.kt[a][b];}els.push(el);
 });
 let restrained=[],free=[];
 nodes.forEach((n,i)=>{let fixed;
  switch(n.support){
   case "fixed":fixed=[true,true,true];break;
   case "pin":fixed=[true,true,false];break;
   case "rollerY":fixed=[false,true,false];break;
   case "rollerX":fixed=[true,false,false];break;
   case "free":fixed=[false,false,false];break;
   default:throw Error("Apoyo desconocido en nudo "+n.id);
  }
  fixed.forEach((v,j)=>(v?restrained:free).push(3*i+j));
 });
 if(!restrained.length||!free.length)throw Error("Define apoyos y al menos un GDL libre");
 const Kff=free.map(i=>free.map(j=>K[i][j])),Ff=free.map(i=>F[i]);
 const df=solve(Kff,Ff),disp=Array(dof).fill(0);
 free.forEach((idx,i)=>disp[idx]=df[i]);
 const res=mv(K,disp).map((v,i)=>v-F[i]);
 const maxF=Math.max(1,...F.map(Math.abs));
 const maxResidual=Math.max(0,...free.map(i=>Math.abs(res[i])));
 let nodeResult=nodes.map((n,i)=>({...n,ux:disp[3*i],uy:disp[3*i+1],theta:disp[3*i+2],rx:res[3*i],ry:res[3*i+1],rm:res[3*i+2]}));
 els.forEach(el=>{
  el.dGlobal=el.dof.map(i=>disp[i]);el.dLocal=mv(el.T,el.dGlobal);
  el.endForces=mv(el.k,el.dLocal).map((v,i)=>v-el.F[i]);
  const [u0,v0,r0,u1,v1,r1]=el.dLocal,L=el.L,E=el.E,I=el.I,A=el.A;
  el.samples=Array.from({length:61},(_,i)=>{
   let z=i/60,x=L*z;
   let w=(1-3*z*z+2*z*z*z)*v0+(z-2*z*z+z*z*z)*L*r0+
       (3*z*z-2*z*z*z)*v1+(-z*z+z*z*z)*L*r1;
   // Solución particular exacta para distribución lineal qy(x)
   w+=L**4/(E*I)*(el.t0*(z*z-2*z**3+z**4)/24+
          (el.t1-el.t0)*(z**5/120-z**3/40+z*z/60));
   let u=(1-z)*u0+z*u1 + L*L/(E*A)*(el.a0*z*(1-z)/2+(el.a1-el.a0)*(z-z**3)/6);
   const N=-el.endForces[0]-el.a0*x-(el.a1-el.a0)*x*x/(2*L);
   const V=-el.endForces[1]-el.t0*x-(el.t1-el.t0)*x*x/(2*L);
   const M=-el.endForces[2]+el.endForces[1]*x+el.t0*x*x/2+(el.t1-el.t0)*x**3/(6*L);
   return {x,s:z,N,V,M,u,v:w,ux:el.c*u-el.s*w,uy:el.s*u+el.c*w};
  });
 });
 // Equilibrio global de fuerzas y momentos, incluida carga distribuida.
 let sumFX=nodes.reduce((z,n)=>z+n.fx,0),sumFY=nodes.reduce((z,n)=>z+n.fy,0),
 sumM=nodes.reduce((z,n)=>z+n.mz+n.x*n.fy-n.y*n.fx,0);
 els.forEach(el=>{
  const p1=byId.get(el.n1),p2=byId.get(el.n2);
  let qxa=el.c*el.a0-el.s*el.t0,qxb=el.c*el.a1-el.s*el.t1,
      qya=el.s*el.a0+el.c*el.t0,qyb=el.s*el.a1+el.c*el.t1;
  const rx=el.L*(qxa+qxb)/2,ry=el.L*(qya+qyb)/2;
  let xx=p1.x+el.c*el.L*(qxa+2*qxb)/(3*(qxa+qxb)||1),
      yy=p1.y+el.s*el.L*(qya+2*qyb)/(3*(qya+qyb)||1);
  // Integración exacta del momento de distribución, evita divisiones si la resultante es cero
  let M0=el.L*(p1.x*(qya+qyb)/2-p1.y*(qxa+qxb)/2)+
    el.L*el.L*((el.c*(qya+2*qyb)-el.s*(qxa+2*qxb))/6);
  sumFX+=rx;sumFY+=ry;sumM+=M0;
 });
 nodeResult.forEach(n=>{if(n.support!=="free"){sumFX+=n.rx;sumFY+=n.ry;sumM+=n.rm+n.x*n.ry-n.y*n.rx}});
 return {nodes:nodeResult,bars:els,props:defaultProp,K,F,Kff,Ff,free,restrained,disp,res,maxResidual,relativeResidual:maxResidual/maxF,equilibrium:{fx:sumFX,fy:sumFY,mz:sumM}};
}
root.FrameSolver={compute,properties,solve,element};
})(typeof window!=="undefined"?window:globalThis);
