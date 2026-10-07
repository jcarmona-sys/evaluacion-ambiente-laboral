(() => {
  "use strict";
  const cfg = window.APP_CONFIG || {}; const $ = s => document.querySelector(s); let key = "", data = null;
  const labels = {S1:"Condiciones físicas",S2:"Condiciones sociales",S3:"Condiciones psicológicas",S4:"Evaluación general"};
  const questionText = ["Iluminación adecuada","Temperatura adecuada","Ventilación suficiente","Nivel de ruido adecuado","Espacio suficiente y adecuado","Mobiliario y equipo adecuados","Limpieza y orden","Condiciones de seguridad","Respeto entre compañeros","Buena comunicación","Trabajo en equipo","Trato respetuoso de responsables","Conflictos atendidos oportunamente","La jefatura escucha al equipo","Diferencias de opinión respetadas","Colaboración entre áreas","Carga de trabajo razonable","Tiempo suficiente","Reconocimiento al desempeño","Apoyo ante dificultades","Ambiente que favorece la motivación","Posibilidad de pedir ayuda","Posibilidad de expresar desacuerdos","Trabajo eficiente","Evaluación general"];
  const esc = value => { const d=document.createElement("div"); d.textContent=value??""; return d.innerHTML; };
  const classification = pct => pct >= 85 ? ["Excelente","excellent"] : pct >= 70 ? ["Regular","regular"] : ["Deficiente","deficient"];
  async function api(action="results") {
    if (!cfg.API_URL) throw new Error("El panel aún no está conectado a la base de datos.");
    const url = `${cfg.API_URL}?action=${encodeURIComponent(action)}&key=${encodeURIComponent(key)}&campaign=${encodeURIComponent($("#campaign-filter").value||"")}&category=${encodeURIComponent($("#category-filter").value||"")}`;
    const response = await fetch(url,{cache:"no-store",redirect:"follow"}); const result=await response.json();
    if(!result.ok) throw new Error(result.error||"No se pudieron cargar los resultados."); return result;
  }
  async function load() { data=await api(); populateFilters(); render(); }
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
  $("#login-button").onclick=async()=>{const e=$("#login-error");e.classList.add("hidden");key=$("#access-key").value.trim();if(!key)return;try{await load();$("#login").classList.add("hidden");$("#dashboard").classList.remove("hidden")}catch(err){e.textContent=err.message;e.classList.remove("hidden")}};
  $("#refresh").onclick=load; $("#campaign-filter").onchange=load; $("#category-filter").onchange=load;
  $("#logout").onclick=()=>{key="";data=null;$("#access-key").value="";$("#dashboard").classList.add("hidden");$("#login").classList.remove("hidden")};
  $("#export").onclick=()=>{if(!data)return;const rows=[["Categoría","Respuestas","Efectividad"],...(data.categories||[]).map(x=>[x.category,x.submissions,x.effectiveness])];const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv"}));a.download="resultados-ambiente-laboral.csv";a.click();URL.revokeObjectURL(a.href)};
})();
