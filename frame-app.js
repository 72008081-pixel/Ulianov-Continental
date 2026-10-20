/* PÓRTICOS 2D v1.0 — aplicación aislada de VIGAS */
(function(){
"use strict";
const $=id=>document.getElementById(id);
let model=null,result=null,selected=1;
const example={
 portal:{nodes:[
 {id:1,x:0,y:0,support:"fixed"},{id:2,x:0,y:300,support:"free"},{id:3,x:450,y:300,support:"free"},{id:4,x:450,y:0,support:"fixed"}],
 bars:[{from:1,to:2,q0:0,q1:0},{from:2,to:3,q0:0.5,q1:0.5},{from:3,to:4,q0:0,q1:0}]},
 lateral:{nodes:[
 {id:1,x:0,y:0,support:"fixed"},{id:2,x:0,y:350,support:"free",fx:1000},{id:3,x:550,y:350,support:"free"},{id:4,x:550,y:0,support:"fixed"}],
 bars:[{from:1,to:2},{from:2,to:3,q0:0.7,q1:0.7},{from:3,to:4}]},
 cantilever:{nodes:[{id:1,x:0,y:0,support:"fixed"},{id:2,x:0,y:420,support:"free",fx:800,fy:-200,mz:0}],
 bars:[{from:1,to:2}]},
 twoSpan:{nodes:[
 {id:1,x:0,y:0,support:"fixed"},{id:2,x:0,y:300,support:"free"},
 {id:3,x:350,y:300,support:"free"},{id:4,x:350,y:0,support:"fixed"},
 {id:5,x:700,y:300,support:"free"},{id:6,x:700,y:0,support:"fixed"}],
 bars:[{from:1,to:2},{from:2,to:3,q0:0.5,q1:1.0},{from:3,to:4},{from:3,to:5,q0:0.4,q1:0.4},{from:5,to:6}]}
};
function f(x,d=4){return Number.isFinite(x)?Number(x).toLocaleString("es-PE",{maximumFractionDigits:d}):"—";}
function e(s){return String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function initial(k){return JSON.parse(JSON.stringify(example[k||"portal"]));}
function field(key,value,optional=false){return '<input data-field="'+key+'" type="number" step="any" value="'+e(value??"")+'" '+(optional?'placeholder="global"':'')+'>';}
const supports=[["free","Libre"],["fixed","Empotrado"],["pin","Articulado"],["rollerY","Rodillo Y"],["rollerX","Rodillo X"]];
const dirs=[["globalDown","Vertical ↓"],["localY","Local +y"],["localX","Local +x"]];
function selectOpts(opts,val){return opts.map(p=>'<option value="'+p[0]+'"'+(val===p[0]?' selected':'')+'>'+p[1]+'</option>').join("");}
function paintTables(m){
 const nt=$("nodesTable").querySelector("tbody"),bt=$("barsTable").querySelector("tbody");
 nt.innerHTML=m.nodes.map(n=>'<tr data-id="'+n.id+'"><td>'+n.id+'</td><td>'+field("x",n.x)+'</td><td>'+field("y",n.y)+'</td><td><select data-field="support">'+selectOpts(supports,n.support||"free")+'</select></td><td>'+field("fx",n.fx??0)+'</td><td>'+field("fy",n.fy??0)+'</td><td>'+field("mz",n.mz??0)+'</td><td><button type="button" data-delete="node" class="tool-btn">✕</button></td></tr>').join("");
 bt.innerHTML=m.bars.map((b,i)=>'<tr data-id="'+(i+1)+'"><td>'+(i+1)+'</td><td>'+field("from",b.from)+'</td><td>'+field("to",b.to)+'</td><td>'+field("E",b.E,true)+'</td><td>'+field("A",b.A,true)+'</td><td>'+field("I",b.I,true)+'</td><td>'+field("q0",b.q0??0)+'</td><td>'+field("q1",b.q1??0)+'</td><td><select data-field="dir">'+selectOpts(dirs,b.dir||"globalDown")+'</select></td><td><button type="button" data-delete="bar" class="tool-btn">✕</button></td></tr>').join("");
}
function vals(tr){let o={};tr.querySelectorAll("[data-field]").forEach(inp=>o[inp.dataset.field]=(inp.value===""?null:inp.tagName==="SELECT"?inp.value:Number(inp.value)));return o;}
function read(){
 const sh=$("shape").value;
 let section={shape:sh,b:+$("secB").value,h:+$("secH").value,d:+$("secD").value,
 bf:+$("secBF").value,tf:+$("secTF").value,tw:+$("secTW").value,hw:+$("secHW").value};
 return {E:+$("matE").value,section,
 nodes:[...$("nodesTable").querySelectorAll("tbody tr")].map(tr=>({id:Number(tr.dataset.id),...vals(tr)})),
 bars:[...$("barsTable").querySelectorAll("tbody tr")].map(tr=>vals(tr))};
}
function updateSection(){
 const sh=$("shape").value;
 document.querySelectorAll(".section-field").forEach(n=>n.style.display=n.dataset.shape===sh?"flex":"none");
 try{let p=FrameSolver.properties(read().section);$("sectionInfo").textContent="A = "+f(p.A,3)+" cm²    ·    I = "+f(p.I,3)+" cm⁴    ·    YCG = "+f(p.ycg,3)+" cm";}
 catch(ex){$("sectionInfo").textContent=ex.message;}
}
function run(){
 try{
  model=read();result=FrameSolver.compute(model);
  $("errors").textContent="";
  $("topStatus").textContent="Resuelto · "+result.nodes.length+" nudos · "+result.bars.length+" barras";
  $('stats').innerHTML=[
  ["Nudos",result.nodes.length],["Barras",result.bars.length],
  ["GDL libres",result.free.length],["Residuo máximo",f(result.maxResidual,8)+" kgf / unidad"]]
  .map(x=>'<div class="frame-stat"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("");
  selected=Math.min(selected,result.bars.length);updateSelectors();paintResults();drawAll();
 }catch(ex){result=null;$("errors").textContent="⚠ "+ex.message;$("topStatus").textContent="Revisa la estabilidad y los datos";drawAll();console.error(ex);}
}
function updateSelectors(){
 let opts=result.bars.map((b,i)=>'<option value="'+(i+1)+'">Barra '+(i+1)+': '+b.n1+' → '+b.n2+'</option>').join("");
 $("selectedBar").innerHTML=opts;$("selectedBar").value=selected;
}
function htmlTable(headers,rows,cl=""){return '<table class="frame-table '+cl+'"><thead><tr>'+headers.map(h=>'<th>'+e(h)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(v=>'<td>'+e(v)+'</td>').join("")+'</tr>').join("")+'</tbody></table>';}
function paintResults(){
 let n=result.nodes,els=result.bars;
 $("nodeResults").innerHTML=htmlTable(["Nudo","Apoyo","Ux (cm)","Uy (cm)","θ (rad)","Rx (kgf)","Ry (kgf)","RM (kgf·cm)"],n.map(p=>[p.id,p.support,f(p.ux,7),f(p.uy,7),f(p.theta,9),f(p.rx,4),f(p.ry,4),f(p.rm,4)]));
 $("endResults").innerHTML=htmlTable(["Barra","Li (cm)","Ni","Vi","Mi","Nj","Vj","Mj"],els.map(p=>[p.id,f(p.L,2),...p.endForces.map(v=>f(v,4))]));
 let st=result.equilibrium, maxRes=result.relativeResidual;
 $("checkResults").innerHTML='<div class="frame-stats">'+
  [["ΣFx (kgf)",f(st.fx,7)],["ΣFy (kgf)",f(st.fy,7)],["ΣM₀ (kgf·cm)",f(st.mz,6)],["Residual libre relativo",f(maxRes,10)]].map(v=>'<div class="frame-stat"><small>'+v[0]+'</small><strong>'+v[1]+'</strong></div>').join("")+'</div>'+
  '<p class="frame-tip" style="margin-top:8px">Las reacciones se obtienen de K·d − F. Convención: ejes globales X→ e Y↑; momento nodal positivo antihorario. Los esfuerzos N/V/M se representan según el eje local i→j de la barra. Las sumatorias incluyen cargas distribuidas.</p>';
 drawMatrix();
}
function drawMatrix(){
 if(!result)return;
 const m=$("matrixMode").value,bar=result.bars[selected-1];
 let M=(m==="k"?bar.k:m==="kt"?bar.kt:m==="T"?bar.T:m==="K"?result.K:m==="Kff"?result.Kff:m==="F"?result.F.map(v=>[v]):result.disp.map(v=>[v]));
 let area=$("matrixResults");
 area.innerHTML='<div class="frame-tip" style="padding:8px">Dimensión '+M.length+'×'+M[0].length+' · '+(m==="k"||m==="kt"||m==="T"?"Barra "+selected:"Sistema completo")+'</div>'+
 htmlTable(["#"].concat(M[0].map((_,i)=>i+1)),M.map((row,i)=>[i+1,...row.map(v=>f(v,5))]),"frame-matrix");
}
function mapCanvas(){
 const canvas=$("frameCanvas");let ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
 ctx.clearRect(0,0,W,H);ctx.fillStyle="#060911";ctx.fillRect(0,0,W,H);
 if(!result&&!model)return;
 let ns=result?result.nodes:model.nodes;if(!ns.length)return;
 let xs=ns.map(n=>n.x),ys=ns.map(n=>n.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 let span=Math.max(maxX-minX,maxY-minY,1);let scale=Math.min((W-190)/(maxX-minX||span),(H-160)/(maxY-minY||span));
 const point=(x,y)=>({x:W/2+(x-(minX+maxX)/2)*scale,y:H/2-(y-(minY+maxY)/2)*scale});
 ctx.font="16px Segoe UI";ctx.fillStyle="#94a3b8";ctx.fillText("Ejes globales: X →   Y ↑",24,34);
 ctx.strokeStyle="#182638";ctx.lineWidth=1;
 for(let xx=50;xx<W;xx+=50){ctx.beginPath();ctx.moveTo(xx,48);ctx.lineTo(xx,H-28);ctx.stroke();}
 for(let yy=48;yy<H-28;yy+=50){ctx.beginPath();ctx.moveTo(18,yy);ctx.lineTo(W-18,yy);ctx.stroke();}
 let elements=result?.bars||[];
 let maxD=Math.max(0,...elements.flatMap(b=>b.samples.map(p=>Math.hypot(p.ux,p.uy))));
 let scaleUser=Number($("deformScale").value),amp=scaleUser>0?scaleUser:Math.min(5000,Math.max(1,span*.12/(maxD||1)));
 const mode=$("viewMode").value;let globalMax=Math.max(1e-9,...elements.flatMap(el=>el.samples.map(p=>Math.abs(p[mode]||0))));
 if(mode==="all"){globalMax=Math.max(1e-9,...elements.flatMap(el=>el.samples.map(p=>Math.abs(p.M))));}
 let elFrom=[];
 function line(points,color,width,dash){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash||[]);ctx.beginPath();points.forEach((p,i)=>{if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y)});ctx.stroke();ctx.restore();}
 elements.forEach(el=>{
  const a=ns.find(n=>n.id===el.n1),b=ns.find(n=>n.id===el.n2);let pa=point(a.x,a.y),pb=point(b.x,b.y);
  elFrom.push({el,pa,pb});line([pa,pb],el.id===selected?"#67e8f9":"#7c9fbc",el.id===selected?5:3);
  if(mode==="deformed"||mode==="all"){
   const pts=el.samples.map(t=>point(a.x+el.c*t.x+amp*t.ux,a.y+el.s*t.x+amp*t.uy));
   line(pts,"#34d399",3);
  }
  if(["N","V","M","all"].includes(mode)){
   const props=mode==="all"?[{key:"M",color:"#f472b6"}]:[{key:mode,color:({N:"#a78bfa",V:"#fbbf24",M:"#f472b6"})[mode]}];
   props.forEach(d=>{
    let maxMode=Math.max(1e-9,...elements.flatMap(k=>k.samples.map(t=>Math.abs(t[d.key]))));
    const h=span*.23/maxMode;
    const base=el.samples.map(t=>point(a.x+el.c*t.x,a.y+el.s*t.x));
    const dia=el.samples.map(t=>point(a.x+el.c*t.x-el.s*t[d.key]*h,a.y+el.s*t.x+el.c*t[d.key]*h));
    ctx.save();ctx.fillStyle=d.color+"24";ctx.beginPath();base.forEach((p,i)=>{if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});dia.slice().reverse().forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.restore();
    line(dia,d.color,2.5);
    for(let i=0;i<61;i+=12)line([base[i],dia[i]],d.color+"75",1);
   });
  }
  const mid=point((a.x+b.x)/2,(a.y+b.y)/2);
  ctx.fillStyle="#e2e8f0";ctx.font="bold 17px Segoe UI";ctx.fillText("B"+el.id,mid.x+8,mid.y-9);
  if(el.dir==="globalDown"&&(el.q0||el.q1)){
   for(let t of [.18,.50,.82]){let q=(1-t)*el.q0+t*el.q1;if(!q)continue;let po=point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
    ctx.strokeStyle="#fbbf24";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(po.x,po.y-18);ctx.lineTo(po.x,po.y-4);ctx.stroke();
    ctx.beginPath();ctx.moveTo(po.x-5,po.y-9);ctx.lineTo(po.x,po.y-3);ctx.lineTo(po.x+5,po.y-9);ctx.stroke();}
  }
 });
 ns.forEach(n=>{
  let p=point(n.x,n.y);ctx.beginPath();ctx.arc(p.x,p.y,6,0,2*Math.PI);ctx.fillStyle="#f8fafc";ctx.fill();
  if(n.support!=="free"){ctx.fillStyle=n.support==="fixed"?"#fca5a5":"#fef08a";ctx.font="bold 14px Segoe UI";ctx.fillText(n.support==="fixed"?"▨":n.support==="pin"?"▲":"△",p.x-8,p.y+22);}
  ctx.fillStyle="#fff";ctx.font="bold 15px Segoe UI";ctx.fillText("N"+n.id,p.x+10,p.y-12);
  if(n.fx||n.fy){ctx.strokeStyle="#fb7185";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.sign(n.fx)*30,p.y-Math.sign(n.fy)*30);ctx.stroke();}
 });
 ctx.fillStyle="#9ca3af";ctx.font="13px Segoe UI";ctx.fillText(mode==="deformed"||mode==="all"?"Curva elástica amplificada ×"+f(amp,1):"Diagrama "+mode+" según normal local de cada barra",20,H-18);
 return {elFrom,point};
}
function graph(canvas,key,title,color){
 const c=$(canvas),ctx=c.getContext("2d"),W=c.width,H=c.height;
 ctx.clearRect(0,0,W,H);ctx.fillStyle="#060911";ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#e2e8f0";ctx.font="bold 16px Segoe UI";ctx.fillText(title,18,24);
 if(!result)return;
 let data=result.bars[selected-1].samples,Y=data.map(p=>p[key]),max=Math.max(0,...Y),min=Math.min(0,...Y),yRange=Math.max(1e-9,max-min);
 const px=x=>48+(W-64)*(x/(data[data.length-1].x||1)),py=y=>H-40-(H-82)*((y-min)/yRange);
 ctx.strokeStyle="#475569";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(44,py(0));ctx.lineTo(W-16,py(0));ctx.stroke();
 ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();
 data.forEach((p,i)=>{i?ctx.lineTo(px(p.x),py(p[key])):ctx.moveTo(px(p.x),py(p[key]));});ctx.stroke();
 ctx.fillStyle="#cbd5e1";ctx.font="12px Consolas";ctx.fillText("max "+f(max,5),W-165,24);ctx.fillText("min "+f(min,5),W-165,42);ctx.fillText("0",18,py(0)+4);ctx.fillText("x = "+f(data.at(-1).x,2)+" cm",W-135,H-12);
}
function drawAll(){
 const hit=mapCanvas();
 if(result){
  const el=result.bars[selected-1];$("barInfo").textContent="Longitud "+f(el.L,3)+" cm · cosθ "+f(el.c,4)+" · senθ "+f(el.s,4)+" · qy inicial "+f(el.t0,3)+" / final "+f(el.t1,3);
  graph("chartN","N","Axial N (kgf)","#a78bfa");graph("chartV","V","Cortante V (kgf)","#fbbf24");
  graph("chartM","M","Momento M (kgf·cm)","#f472b6");graph("chartD","v","Curva elástica local v (cm)","#34d399");
 }
}
function rerender(){updateSection();run();}
function plotClick(ev){
 if(!result)return;
 let c=$("frameCanvas"),rect=c.getBoundingClientRect(),px=(ev.clientX-rect.left)*c.width/rect.width,py=(ev.clientY-rect.top)*c.height/rect.height;
 // Selector geométrico, aproxima escalado del canvas vigente.
 let ns=result.nodes,xs=ns.map(n=>n.x),ys=ns.map(n=>n.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 let span=Math.max(maxX-minX,maxY-minY,1),sc=Math.min((c.width-190)/(maxX-minX||span),(c.height-160)/(maxY-minY||span));
 function xy(x,y){return {x:c.width/2+(x-(minX+maxX)/2)*sc,y:c.height/2-(y-(minY+maxY)/2)*sc};}
 let best=[Infinity,selected];result.bars.forEach(b=>{let a=ns.find(n=>n.id===b.n1),z=ns.find(n=>n.id===b.n2),p=xy(a.x,a.y),q=xy(z.x,z.y);
 let t=Math.max(0,Math.min(1,((px-p.x)*(q.x-p.x)+(py-p.y)*(q.y-p.y))/((q.x-p.x)**2+(q.y-p.y)**2)));let d=Math.hypot(px-p.x-t*(q.x-p.x),py-p.y-t*(q.y-p.y));if(d<best[0])best=[d,b.id];});
 if(best[0]<35){selected=best[1];$("selectedBar").value=selected;drawMatrix();drawAll();}
}
function sheet(wb,name,header,rows){
 let sh=wb.addWorksheet(name);sh.addRow(header);sh.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};sh.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF123453"}};
 rows.forEach(row=>sh.addRow(row));sh.views=[{state:"frozen",ySplit:1}];sh.autoFilter={from:"A1",to:sh.getRow(1).getCell(header.length).address};
 for(let i=1;i<=header.length;i++){sh.getColumn(i).width=Math.max(13,Math.min(29,header[i-1].length+5));sh.getColumn(i).numFmt="0.000000";}
 return sh;
}
async function excel(){
 if(!result){alert("Resuelve un pórtico antes de exportar");return;}
 if(typeof ExcelJS==="undefined"){alert("No se pudo cargar ExcelJS desde assets");return;}
 const b=$("exportExcel");b.disabled=true;b.textContent="Generando .xlsx…";
 try{
 let wb=new ExcelJS.Workbook();wb.creator="CEREBRO ESTRUCTURAL — Pórticos v1.0";wb.subject="Análisis matricial de pórticos 2D";
 const r=result,n=r.nodes,es=r.bars;
 sheet(wb,"01 INSTRUCCIONES",["PÓRTICOS 2D v1.0","DESCRIPCIÓN"],[
 ["Análisis","Euler-Bernoulli lineal, tres GDL por nudo"],
 ["Sistema de unidades","cm, kgf, kgf·cm, E en kgf/cm²"],
 ["Origen","Exportación del modelo resuelto en porticos.html"],
 ["Criterio","Tablas K y d son la solución instantánea; si cambias topología o cargas en Excel, vuelve a resolver en la web"],
 ["Campos de diagramas","Las columnas N, V, M, u y v incluyen fórmulas Excel, referidas a propiedades y fuerzas de extremos"],
 ["Signos","X global derecha, Y global arriba, giro antihorario, ejes locales i→j"],
 ["Sección",model.section.shape],["Área cm²",r.props.A],["Inercia cm⁴",r.props.I],["E base",model.E]]);
 sheet(wb,"02 NUDOS",["Nudo","X cm","Y cm","Apoyo","Fx kgf","Fy kgf","Mz kgf cm","Ux cm","Uy cm","Giro rad","Rx kgf","Ry kgf","Rm kgf cm"],n.map(p=>[p.id,p.x,p.y,p.support,p.fx,p.fy,p.mz,p.ux,p.uy,p.theta,p.rx,p.ry,p.rm]));
 sheet(wb,"03 BARRAS",["Barra","Nudo i","Nudo j","L cm","cos","sen","E kgf/cm2","A cm2","I cm4","qx(i)","qx(j)","qy(i)","qy(j)","q input i","q input j","dirección"],es.map(el=>[el.id,el.n1,el.n2,el.L,el.c,el.s,el.E,el.A,el.I,el.a0,el.a1,el.t0,el.t1,el.q0,el.q1,el.dir]));
 sheet(wb,"04 EXTREMOS",["Barra","Nudo i","Nudo j","Ni","Vi","Mi","Nj","Vj","Mj","ui","vi","θi","uj","vj","θj"],es.map(el=>[el.id,el.n1,el.n2,...el.endForces,...el.dLocal]));
 sheet(wb,"05 REACCIONES",["Nudo","Rx kgf","Ry kgf","Rm kgf·cm","Ux cm","Uy cm","θ rad"],n.map(p=>[p.id,p.rx,p.ry,p.rm,p.ux,p.uy,p.theta]));
 let matrixRows=[];function addM(label,M){matrixRows.push([label]);M.forEach((a,i)=>matrixRows.push([i+1,...a]));matrixRows.push([]);}
 es.forEach(el=>{addM("K local B"+el.id,el.k);addM("Transformación T B"+el.id,el.T);addM("K global B"+el.id,el.kt);});
 addM("K GLOBAL",r.K);addM("K REDUCIDA",r.Kff);addM("VECTOR F",r.F.map(v=>[v]));addM("VECTOR d",r.disp.map(v=>[v]));
 let shM=wb.addWorksheet("06 MATRICES");matrixRows.forEach(row=>shM.addRow(row));shM.getColumn(1).width=24;for(let j=2;j<=Math.max(8,r.K.length+1);j++){shM.getColumn(j).width=14;shM.getColumn(j).numFmt="0.0000";}
 const sam=wb.addWorksheet("07 DIAGRAMAS");
 const head=["Barra","x cm","x/L","N kgf","V kgf","M kgf cm","u local cm","v local cm","Ux global cm","Uy global cm","X deform cm","Y deform cm"];
 sam.addRow(head);sam.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};sam.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF123453"}};
 for(const el of es){const er=el.id+1,br=el.id+1,nr=n.findIndex(z=>z.id===el.n1)+2;
  for(const p of el.samples){let row=sam.rowCount+1;let C="C"+row,B="B"+row,L="'03 BARRAS'!D"+br,E="'03 BARRAS'!G"+br,A="'03 BARRAS'!H"+br,I="'03 BARRAS'!I"+br;
  const a0="'03 BARRAS'!J"+br,a1="'03 BARRAS'!K"+br,t0="'03 BARRAS'!L"+br,t1="'03 BARRAS'!M"+br;
  const ui="'04 EXTREMOS'!J"+er,vi="'04 EXTREMOS'!K"+er,ri="'04 EXTREMOS'!L"+er,uj="'04 EXTREMOS'!M"+er,vj="'04 EXTREMOS'!N"+er,rj="'04 EXTREMOS'!O"+er;
  let fml=[
   {formula:B+"/"+L,result:p.x/el.L},
   {formula:"-'04 EXTREMOS'!D"+er+"-"+a0+"*"+B+"-("+a1+"-"+a0+")*"+B+"^2/(2*"+L+")",result:p.N},
   {formula:"-'04 EXTREMOS'!E"+er+"-"+t0+"*"+B+"-("+t1+"-"+t0+")*"+B+"^2/(2*"+L+")",result:p.V},
   {formula:"-'04 EXTREMOS'!F"+er+"+'04 EXTREMOS'!E"+er+"*"+B+"+"+t0+"*"+B+"^2/2+("+t1+"-"+t0+")*"+B+"^3/(6*"+L+")",result:p.M},
   {formula:"(1-"+C+")*"+ui+"+"+C+"*"+uj+"+"+L+"^2/("+E+"*"+A+")*("+a0+"*"+C+"*(1-"+C+")/2+("+a1+"-"+a0+")*("+C+"-"+C+"^3)/6)",result:p.u},
   {formula:"(1-3*"+C+"^2+2*"+C+"^3)*"+vi+"+("+C+"-2*"+C+"^2+"+C+"^3)*"+L+"*"+ri+"+(3*"+C+"^2-2*"+C+"^3)*"+vj+"+(-"+C+"^2+"+C+"^3)*"+L+"*"+rj+"+"+L+"^4/("+E+"*"+I+")*("+t0+"*("+C+"^2-2*"+C+"^3+"+C+"^4)/24+("+t1+"-"+t0+")*("+C+"^5/120-"+C+"^3/40+"+C+"^2/60))",result:p.v},
  ];
  const co="'03 BARRAS'!E"+br,si="'03 BARRAS'!F"+br;
  let ux={formula:co+"*G"+row+"-"+si+"*H"+row,result:p.ux},uy={formula:si+"*G"+row+"+"+co+"*H"+row,result:p.uy};
  sam.addRow([el.id,p.x,...fml,ux,uy,{formula:"'02 NUDOS'!B"+nr+"+"+co+"*"+B+"+I"+row,result:model.nodes.find(z=>z.id===el.n1).x+el.c*p.x+p.ux},{formula:"'02 NUDOS'!C"+nr+"+"+si+"*"+B+"+J"+row,result:model.nodes.find(z=>z.id===el.n1).y+el.s*p.x+p.uy}]);
  }
 }
 sam.views=[{state:"frozen",ySplit:1}];sam.autoFilter={from:"A1",to:"L1"};sam.getColumn(1).width=12;for(let i=2;i<=12;i++){sam.getColumn(i).width=17;sam.getColumn(i).numFmt="0.000000";}
 sheet(wb,"08 EQUILIBRIO",["Control","Valor","Unidad"],[
 ["ΣFx",r.equilibrium.fx,"kgf"],["ΣFy",r.equilibrium.fy,"kgf"],["ΣM0",r.equilibrium.mz,"kgf·cm"],["Máx. residual GDL libres",r.maxResidual,""],["Residual relativo",r.relativeResidual,""]]);
 let buf=await wb.xlsx.writeBuffer(),url=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
 let a=document.createElement("a");a.href=url;a.download="PORTICOS_2D_V1_ULIANOV_CALCULO.xlsx";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
 }catch(ex){alert("Error exportando Excel: "+ex.message);console.error(ex);}
 finally{b.disabled=false;b.textContent="📗 Excel de resolución";}
}
function init(){
 paintTables(initial("portal"));updateSection();run();
 $("solveFrame").addEventListener("click",run);
 $("matE").addEventListener("change",rerender);
 $("shape").addEventListener("change",rerender);
 document.querySelectorAll(".frame-grid input").forEach(i=>i.addEventListener("change",rerender));
 $("loadPreset").addEventListener("click",()=>{paintTables(initial($("preset").value));selected=1;run();});
 $("addNode").addEventListener("click",()=>{let m=read();if(m.nodes.length>=24)return alert("Máximo 24 nudos");m.nodes.push({id:Math.max(0,...m.nodes.map(n=>n.id))+1,x:100,y:100,support:"free",fx:0,fy:0,mz:0});paintTables(m);run();});
 $("addBar").addEventListener("click",()=>{let m=read();if(m.bars.length>=36)return alert("Máximo 36 barras");m.bars.push({from:m.nodes[0]?.id||1,to:m.nodes.at(-1)?.id||2,q0:0,q1:0});paintTables(m);run();});
 ["nodesTable","barsTable"].forEach(id=>{
 $(id).addEventListener("change",run);
 $(id).addEventListener("click",ev=>{let b=ev.target.closest("[data-delete]");if(!b)return;let m=read(),tr=b.closest("tr");if(b.dataset.delete==="node"){let id=Number(tr.dataset.id);m.nodes=m.nodes.filter(n=>n.id!==id);m.bars=m.bars.filter(z=>z.from!==id&&z.to!==id);}else m.bars.splice(Number(tr.dataset.id)-1,1);paintTables(m);run();});
 });
 $("viewMode").addEventListener("change",drawAll);$("deformScale").addEventListener("change",drawAll);
 $("selectedBar").addEventListener("change",()=>{selected=Number($("selectedBar").value);drawMatrix();drawAll();});
 $("matrixMode").addEventListener("change",drawMatrix);
 $("frameCanvas").addEventListener("click",plotClick);
 $("exportExcel").addEventListener("click",excel);
 $("exportPNG").addEventListener("click",()=>{let a=document.createElement("a");a.href=$("frameCanvas").toDataURL("image/png");a.download="PORTICOS_2D_DIAGRAMA.png";a.click();});
 $("printFrame").addEventListener("click",()=>window.print());
 window.addEventListener("resize",drawAll);
}
document.addEventListener("DOMContentLoaded",init);
})();