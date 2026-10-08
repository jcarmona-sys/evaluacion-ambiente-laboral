(() => {
  "use strict";
  const cfg = window.APP_CONFIG || {}; const $ = s => document.querySelector(s); let key = "", data = null;
  const labels = {S1:"Condiciones físicas",S2:"Condiciones sociales",S3:"Condiciones psicológicas",S4:"Evaluación general"};
  const questionText = ["Iluminación adecuada","Temperatura adecuada","Ventilación suficiente","Nivel de ruido adecuado","Espacio suficiente y adecuado","Mobiliario y equipo adecuados","Limpieza y orden","Condiciones de seguridad","Respeto entre compañeros","Buena comunicación","Trabajo en equipo","Trato respetuoso de responsables","Conflictos atendidos oportunamente","La jefatura escucha al equipo","Diferencias de opinión respetadas","Colaboración entre áreas","Carga de trabajo razonable","Tiempo suficiente","Reconocimiento al desempeño","Apoyo ante dificultades","Ambiente que favorece la motivación","Posibilidad de pedir ayuda","Posibilidad de expresar desacuerdos","Trabajo eficiente","Evaluación general"];
  const esc = value => { const d=document.createElement("div"); d.textContent=value??""; return d.innerHTML; };
  const classification = pct => pct >= 85 ? ["Excelente","excellent"] : pct >= 70 ? ["Regular","regular"] : ["Deficiente","deficient"];
  const pct = value => value == null ? "—" : `${Number(value).toFixed(1)}%`;
  const filename = ext => {
    const campaign=$("#campaign-filter").value||"todas"; const category=$("#category-filter").value||"todas";
    return `ambiente-laboral_${campaign}_${category}_${new Date().toISOString().slice(0,10)}.${ext}`.replace(/[^a-zA-Z0-9._-]+/g,"-");
  };
  const download = (content,type,name) => { const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500); };
  async function api(action="results") {
    if (!cfg.API_URL) throw new Error("El panel aún no está conectado a la base de datos.");
    const url = `${cfg.API_URL}?action=${encodeURIComponent(action)}&key=${encodeURIComponent(key)}&campaign=${encodeURIComponent($("#campaign-filter").value||"")}&category=${encodeURIComponent($("#category-filter").value||"")}`;
    const response = await fetch(url,{cache:"no-store",redirect:"follow"}); const result=await response.json();
    if(!result.ok) throw new Error(result.error||"No se pudieron cargar los resultados."); return result;
  }
  async function records(){const response=await fetch(`${cfg.API_URL}?view=records&key=${encodeURIComponent(key)}`,{cache:"no-store",redirect:"follow"});const result=await response.json();if(!result.ok)throw new Error(result.error||"No se pudieron cargar los registros.");return result.records||[]}
  async function load() { const loader=$("#page-loader");loader.classList.remove("hidden");try{data=await api();populateFilters();render();const items=await records();renderFollowups(items);renderRecords(items)}finally{loader.classList.add("hidden")} }
  function populateFilters(){
    const camp=$("#campaign-filter"), cat=$("#category-filter"), cv=camp.value, tv=cat.value;
    if(!camp.options.length){camp.add(new Option("Todas",""));(data.filters.campaigns||[]).forEach(x=>camp.add(new Option(x,x)));}
    if(cat.options.length===1) (data.filters.categories||[]).forEach(x=>cat.add(new Option(x,x)));
    if(cv) camp.value=cv;if(tv) cat.value=tv;
  }
  function render(){
    const s=data.summary; $("#updated-at").textContent=`Actualizado: ${new Date(data.generatedAt).toLocaleString("es-MX")}`;
    $("#kpi-total").textContent=s.submissions; $("#kpi-score").textContent=s.effectiveness==null?"—":`${s.effectiveness.toFixed(1)}%`;
    $("#kpi-status").textContent=s.effectiveness==null?"—":classification(s.effectiveness)[0]; $("#kpi-impact").textContent=s.impactPercent==null?"—":`${s.impactPercent.toFixed(1)}%`;
    $("#section-bars").innerHTML=(data.sections||[]).map(x=>{const c=classification(x.effectiveness);return `<div class="bar-row"><b>${esc(labels[x.sectionId]||x.sectionId)}</b><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0,Math.min(100,x.effectiveness))}%"></div></div><span class="status ${c[1]}">${x.effectiveness.toFixed(1)}%</span></div>`}).join("")||"<p>Sin datos.</p>";
    $("#category-table").innerHTML=(data.categories||[]).map(x=>{const c=classification(x.effectiveness);return `<tr><td>${esc(x.category)}</td><td>${x.submissions}</td><td>${x.effectiveness.toFixed(1)}%</td><td><span class="status ${c[1]}">${c[0]}</span></td></tr>`}).join("");
    $("#question-table").innerHTML=(data.questions||[]).slice().sort((a,b)=>a.average-b.average).slice(0,10).map(x=>`<tr><td>${x.questionNumber}</td><td>${esc(questionText[x.questionNumber-1]||x.questionId)}</td><td>${x.average.toFixed(2)}</td><td>${x.effectiveness.toFixed(1)}%</td></tr>`).join("");
    $("#comment-table").innerHTML=(data.comments||[]).map(x=>`<tr><td>${esc(new Date(x.timestamp).toLocaleDateString("es-MX"))}</td><td>${esc(x.category)}</td><td>${esc(x.type)}</td><td style="white-space:normal;min-width:320px">${esc(x.text)}</td></tr>`).join("");
  }
  function options(values,current){return values.map(v=>`<option${v===current?" selected":""}>${esc(v)}</option>`).join("")}
  function renderFollowups(items){
    const statuses=items.map(x=>x.status||"Pendiente");$("#followup-pending").textContent=statuses.filter(x=>x==="Pendiente").length;$("#followup-process").textContent=statuses.filter(x=>x==="En proceso").length;$("#followup-done").textContent=statuses.filter(x=>x==="Atendido"||x==="Cerrado").length;
    const categories=["Condiciones físicas","Relaciones laborales","Organización y carga de trabajo","Equipo y herramientas","Seguridad","Capacitación","Otro"],priorities=["Alta","Media","Baja"],states=["Pendiente","En proceso","Atendido","Cerrado"];
    $("#followup-list").innerHTML=items.map(x=>`<article class="followup-item" data-followup="${esc(x.submissionId)}"><header><div><b>${esc(x.fullName||"Sin nombre")}</b><span>${esc(x.employeeId||"Sin ID")} · ${esc(x.category||"Sin categoría")}</span></div><code>${esc(x.folio||"—")}</code></header><div class="followup-fields"><label>Categoría de seguimiento<select data-field="followupCategory"><option value="">Selecciona…</option>${options(categories,x.followupCategory)}</select></label><label>Prioridad<select data-field="priority">${options(priorities,x.priority||"Media")}</select></label><label>Estado<select data-field="status">${options(states,x.status||"Pendiente")}</select></label><label class="followup-notes">Observaciones<textarea data-field="notes" placeholder="Acuerdos, responsable, fecha compromiso o acciones realizadas…">${esc(x.notes)}</textarea></label></div><div class="followup-actions"><small>${x.updatedAt?`Última actualización: ${esc(new Date(x.updatedAt).toLocaleString("es-MX"))}`:"Sin seguimiento registrado"}</small><button class="button primary" data-save-followup>Guardar seguimiento</button></div></article>`).join("")||'<div class="empty-state"><b>Sin casos para seguimiento</b><span>Los registros aparecerán aquí cuando se reciban respuestas.</span></div>';
    document.querySelectorAll("[data-save-followup]").forEach(btn=>btn.onclick=async()=>{const card=btn.closest("[data-followup]"),payload={action:"followup",key,submissionId:card.dataset.followup};card.querySelectorAll("[data-field]").forEach(el=>payload[el.dataset.field]=el.value);if(!payload.followupCategory){const m=$("#followup-message");m.textContent="Selecciona una categoría de seguimiento.";m.className="message error";return}btn.disabled=true;try{const response=await fetch(cfg.API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)}),result=await response.json();if(!result.ok)throw Error(result.error||"No se pudo guardar el seguimiento.");const m=$("#followup-message");m.textContent="Seguimiento actualizado correctamente.";m.className="message success-message";await load()}catch(err){btn.disabled=false;const m=$("#followup-message");m.textContent=err.message;m.className="message error"}})
  }
  function renderRecords(items){$("#records-table").innerHTML=items.map(x=>`<tr><td><code>${esc(x.folio||"—")}</code></td><td>${esc(new Date(x.timestamp).toLocaleString("es-MX"))}</td><td>${esc(x.fullName)}</td><td>${esc(x.employeeId||"Sin ID")}</td><td>${esc(x.category)}</td><td><button class="button danger-button" data-delete="${esc(x.submissionId)}" data-folio="${esc(x.folio||x.submissionId)}">Eliminar</button></td></tr>`).join("")||'<tr><td colspan="6">No hay registros.</td></tr>';document.querySelectorAll("[data-delete]").forEach(btn=>btn.onclick=async()=>{if(!confirm(`¿Eliminar el registro ${btn.dataset.folio}? Esta acción no se puede deshacer.`))return;btn.disabled=true;try{const r=await fetch(cfg.API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"delete",key,submissionId:btn.dataset.delete})});const result=await r.json();if(!result.ok)throw Error(result.error||"No se pudo eliminar.");await load()}catch(err){btn.disabled=false;const m=$("#records-message");m.textContent=err.message;m.className="message error"}})}
  $("#login-button").onclick=async()=>{const e=$("#login-error");e.classList.add("hidden");key=$("#access-key").value.trim();if(!key)return;try{await load();$("#login").classList.add("hidden");$("#dashboard").classList.remove("hidden")}catch(err){e.textContent=err.message;e.classList.remove("hidden")}};
  $("#refresh").onclick=load; $("#campaign-filter").onchange=load; $("#category-filter").onchange=load;
  $("#logout").onclick=()=>{key="";data=null;$("#access-key").value="";$("#dashboard").classList.add("hidden");$("#login").classList.remove("hidden")};
  function exportCsv(){
    if(!data)return; const rows=[["Sección","Concepto","Detalle","Valor"]]; const s=data.summary;
    rows.push(["Resumen","Respuestas","",s.submissions],["Resumen","Efectividad global","",pct(s.effectiveness)],["Resumen","Evaluación","",s.effectiveness==null?"—":classification(s.effectiveness)[0]],["Resumen","Reportan impacto","",pct(s.impactPercent)]);
    (data.sections||[]).forEach(x=>rows.push(["Secciones",labels[x.sectionId]||x.sectionId,"Efectividad",pct(x.effectiveness)]));
    (data.categories||[]).forEach(x=>rows.push(["Categorías",x.category,`${x.submissions} respuesta(s)`,pct(x.effectiveness)]));
    (data.questions||[]).forEach(x=>rows.push(["Reactivos",`#${x.questionNumber} ${questionText[x.questionNumber-1]||x.questionId}`,`Promedio ${Number(x.average).toFixed(2)}`,pct(x.effectiveness)]));
    (data.comments||[]).forEach(x=>rows.push(["Comentarios",new Date(x.timestamp).toLocaleDateString("es-MX"),`${x.category} · ${x.type}`,x.text]));
    const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\r\n"); download("\ufeff"+csv,"text/csv;charset=utf-8",filename("csv"));
  }
  function exportExcel(){
    if(!data||!window.XLSX)throw new Error("No fue posible preparar el archivo de Excel."); const s=data.summary; const wb=XLSX.utils.book_new();
    const summary=[["Evaluación del ambiente laboral"],["Generado",new Date(data.generatedAt).toLocaleString("es-MX")],["Campaña",$("#campaign-filter").value||"Todas"],["Categoría",$("#category-filter").value||"Todas"],[],["Indicador","Valor"],["Respuestas",s.submissions],["Efectividad global",pct(s.effectiveness)],["Evaluación",s.effectiveness==null?"—":classification(s.effectiveness)[0]],["Reportan impacto",pct(s.impactPercent)]];
    const sheets=[
      ["Resumen",XLSX.utils.aoa_to_sheet(summary)],
      ["Secciones",XLSX.utils.json_to_sheet((data.sections||[]).map(x=>({Sección:labels[x.sectionId]||x.sectionId,Efectividad:pct(x.effectiveness)})))],
      ["Categorías",XLSX.utils.json_to_sheet((data.categories||[]).map(x=>({Categoría:x.category,Respuestas:x.submissions,Efectividad:pct(x.effectiveness),Evaluación:classification(x.effectiveness)[0]})))],
      ["Reactivos",XLSX.utils.json_to_sheet((data.questions||[]).map(x=>({Número:x.questionNumber,Reactivo:questionText[x.questionNumber-1]||x.questionId,Promedio:Number(x.average).toFixed(2),Efectividad:pct(x.effectiveness)})))],
      ["Comentarios",XLSX.utils.json_to_sheet((data.comments||[]).map(x=>({Fecha:new Date(x.timestamp).toLocaleDateString("es-MX"),Categoría:x.category,Tipo:x.type,Comentario:x.text})))]];
    sheets.forEach(([name,ws])=>{ws["!cols"]=[{wch:22},{wch:54},{wch:18},{wch:18}];XLSX.utils.book_append_sheet(wb,ws,name)}); XLSX.writeFile(wb,filename("xlsx"),{compression:true});
  }
  function exportPdf(){
    if(!data||!window.jspdf)throw new Error("No fue posible preparar el PDF."); const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:"mm",format:"a4"}); const s=data.summary;
    doc.setFillColor(7,31,77);doc.rect(0,0,210,34,"F");doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text("Evaluación del ambiente laboral",14,16);doc.setFontSize(9);doc.setFont("helvetica","normal");doc.text(`Concentrado · ${new Date(data.generatedAt).toLocaleString("es-MX")}`,14,24);doc.setTextColor(23,35,58);
    doc.autoTable({startY:42,head:[["Indicador","Valor"]],body:[["Respuestas",s.submissions],["Efectividad global",pct(s.effectiveness)],["Evaluación",s.effectiveness==null?"—":classification(s.effectiveness)[0]],["Reportan impacto",pct(s.impactPercent)]],theme:"grid",headStyles:{fillColor:[7,31,77]}});
    const table=(title,head,body,widths)=>{let y=doc.lastAutoTable.finalY+10;if(y>250){doc.addPage();y=18}doc.setFont("helvetica","bold");doc.setFontSize(12);doc.text(title,14,y);doc.autoTable({startY:y+3,head:[head],body,theme:"striped",headStyles:{fillColor:[16,47,114]},styles:{fontSize:8,cellPadding:2.4,overflow:"linebreak"},columnStyles:widths||{}})};
    table("Resultado por sección",["Sección","Efectividad"],(data.sections||[]).map(x=>[labels[x.sectionId]||x.sectionId,pct(x.effectiveness)]));
    table("Resultados por categoría",["Categoría","Respuestas","Efectividad","Evaluación"],(data.categories||[]).map(x=>[x.category,x.submissions,pct(x.effectiveness),classification(x.effectiveness)[0]]));
    table("Resultados por reactivo",["#","Reactivo","Promedio","Efectividad"],(data.questions||[]).map(x=>[x.questionNumber,questionText[x.questionNumber-1]||x.questionId,Number(x.average).toFixed(2),pct(x.effectiveness)]),{1:{cellWidth:112}});
    if((data.comments||[]).length)table("Comentarios y propuestas",["Fecha","Categoría","Tipo","Comentario"],data.comments.map(x=>[new Date(x.timestamp).toLocaleDateString("es-MX"),x.category,x.type,x.text]),{3:{cellWidth:88}});
    const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(99,112,137);doc.text(`In Time Control · Página ${i} de ${pages}`,105,291,{align:"center"})} doc.save(filename("pdf"));
  }
  function safeExport(fn){try{fn()}catch(err){alert(err.message||"No fue posible generar el archivo.")}}
  $("#export-csv").onclick=()=>safeExport(exportCsv); $("#export-xlsx").onclick=()=>safeExport(exportExcel); $("#export-pdf").onclick=()=>safeExport(exportPdf);
})();
 
