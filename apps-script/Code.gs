const CONFIG = {
  SHEET_ID: "PEGAR_ID_DE_GOOGLE_SHEET",
  WRITE_TOKEN: "CAMBIAR_TOKEN_ESCRITURA",
  ADMIN_KEY: "CAMBIAR_CLAVE_ADMINISTRATIVA",
  SHEETS: { submissions:"Envios", people:"Personas", responses:"Respuestas", comments:"Comentarios", log:"Log" }
};
const HEADERS = {
  Envios:["submission_id","timestamp","campaign","organization","person_id","quality_impact","client_timezone","client_submitted_at"],
  Personas:["person_id","employee_id","full_name","category","created_at"],
  Respuestas:["response_id","submission_id","section_id","question_id","question_number","score"],
  Comentarios:["comment_id","submission_id","section_id","type","text","created_at"],
  Log:["timestamp","event","detail"]
};
function doGet(e){
  try { if(String(e.parameter.key||"")!==CONFIG.ADMIN_KEY) return out({ok:false,error:"Clave incorrecta."}); return out(results(e.parameter)); }
  catch(err){ log("GET_ERROR",err.stack||String(err)); return out({ok:false,error:"Error al consultar resultados."}); }
}
function doPost(e){
  try{
    const body=JSON.parse(e.postData.contents||"{}");
    if(body.action!=="submit"||body.token!==CONFIG.WRITE_TOKEN) return out({ok:false,error:"Solicitud no autorizada."});
    validate(body); const saved=save(body); return out({ok:true,submissionId:saved});
  }catch(err){log("POST_ERROR",err.stack||String(err));return out({ok:false,error:String(err.message||err)});}
}
function initialize(){ const ss=SpreadsheetApp.openById(CONFIG.SHEET_ID); Object.keys(HEADERS).forEach(n=>sheet(ss,n,HEADERS[n])); }
function sheet(ss,name,headers){let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight("bold").setBackground("#092756").setFontColor("#ffffff");sh.setFrozenRows(1);}return sh;}
function validate(b){if(!b.person||!String(b.person.fullName||"").trim())throw new Error("El nombre es obligatorio.");if(!String(b.person.category||"").trim())throw new Error("La categoría es obligatoria.");if(!Array.isArray(b.responses)||b.responses.length!==25)throw new Error("Se esperaban 25 respuestas de escala.");b.responses.forEach(r=>{if(![1,2,3].includes(Number(r.score)))throw new Error("Hay una respuesta fuera de escala.");});if(!["Sí","No","Parcialmente"].includes(b.qualityImpact))throw new Error("Falta la respuesta sobre calidad.");if((b.qualityImpact==="Sí"||b.qualityImpact==="Parcialmente")&&!String(b.qualityDetail||"").trim())throw new Error("Explica cómo afecta la calidad.");if(!String(b.improvements||"").trim())throw new Error("Indica una propuesta de mejora.");}
function clean(v,max){return String(v||"").trim().slice(0,max||1200);}
function save(b){
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{const ss=SpreadsheetApp.openById(CONFIG.SHEET_ID),now=new Date(),sid=Utilities.getUuid(),pid=Utilities.getUuid();
    sheet(ss,CONFIG.SHEETS.people,HEADERS.Personas).appendRow([pid,clean(b.person.employeeId,40),clean(b.person.fullName,160),clean(b.person.category,80),now]);
    sheet(ss,CONFIG.SHEETS.submissions,HEADERS.Envios).appendRow([sid,now,clean(b.campaign,30),clean(b.organization,120),pid,b.qualityImpact,clean(b.client&&b.client.timezone,80),clean(b.client&&b.client.submittedAt,40)]);
    const rr=b.responses.map(r=>[Utilities.getUuid(),sid,clean(r.sectionId,10),clean(r.questionId,20),Number(r.questionNumber),Number(r.score)]);
    const rs=sheet(ss,CONFIG.SHEETS.responses,HEADERS.Respuestas);rs.getRange(rs.getLastRow()+1,1,rr.length,rr[0].length).setValues(rr);
    const notes=(b.notes||[]).concat([{sectionId:"S4",type:"general",text:b.generalNote},{sectionId:"S5",type:"impacto_calidad",text:b.qualityDetail},{sectionId:"S5",type:"mejora",text:b.improvements}]).filter(x=>clean(x.text));
    if(notes.length){const cr=notes.map(x=>[Utilities.getUuid(),sid,clean(x.sectionId,10),clean(x.type,40),clean(x.text),now]);const cs=sheet(ss,CONFIG.SHEETS.comments,HEADERS.Comentarios);cs.getRange(cs.getLastRow()+1,1,cr.length,cr[0].length).setValues(cr);}
    return sid;
  }finally{lock.releaseLock();}
}
function rows(sh){if(!sh||sh.getLastRow()<2)return[];const v=sh.getDataRange().getValues(),h=v.shift();return v.map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));}
function results(p){
  const ss=SpreadsheetApp.openById(CONFIG.SHEET_ID),subs=rows(ss.getSheetByName(CONFIG.SHEETS.submissions)),people=rows(ss.getSheetByName(CONFIG.SHEETS.people)),resp=rows(ss.getSheetByName(CONFIG.SHEETS.responses)),com=rows(ss.getSheetByName(CONFIG.SHEETS.comments));
  const pm=Object.fromEntries(people.map(x=>[x.person_id,x])),campaigns=[...new Set(subs.map(x=>String(x.campaign)))].sort(),categories=[...new Set(people.map(x=>String(x.category)))].sort();
  const selected=subs.filter(x=>(!p.campaign||String(x.campaign)===p.campaign)&&(!p.category||String((pm[x.person_id]||{}).category)===p.category)),ids=new Set(selected.map(x=>x.submission_id)),filtered=resp.filter(x=>ids.has(x.submission_id));
  function agg(list,key){const m={};list.forEach(x=>{const k=x[key];(m[k]=m[k]||[]).push(Number(x.score));});return Object.keys(m).map(k=>({key:k,average:m[k].reduce((a,b)=>a+b,0)/m[k].length,effectiveness:m[k].reduce((a,b)=>a+b,0)/(m[k].length*3)*100}));}
  const overall=filtered.length?filtered.reduce((a,x)=>a+Number(x.score),0)/(filtered.length*3)*100:null;
  const byCategory=categories.map(c=>{const sids=new Set(selected.filter(x=>(pm[x.person_id]||{}).category===c).map(x=>x.submission_id)),r=filtered.filter(x=>sids.has(x.submission_id));return{category:c,submissions:sids.size,effectiveness:r.length?r.reduce((a,x)=>a+Number(x.score),0)/(r.length*3)*100:0};}).filter(x=>x.submissions);
  return {ok:true,generatedAt:new Date().toISOString(),filters:{campaigns:campaigns,categories:categories},summary:{submissions:selected.length,effectiveness:overall,impactPercent:selected.length?selected.filter(x=>x.quality_impact!=="No").length/selected.length*100:null},sections:agg(filtered,"section_id").map(x=>({sectionId:x.key,effectiveness:x.effectiveness})),categories:byCategory,questions:agg(filtered,"question_id").map(x=>{const sample=filtered.find(r=>r.question_id===x.key)||{};return{questionId:x.key,questionNumber:Number(sample.question_number),average:x.average,effectiveness:x.effectiveness};}),comments:com.filter(x=>ids.has(x.submission_id)).slice(-200).reverse().map(x=>({timestamp:x.created_at,category:(pm[(selected.find(s=>s.submission_id===x.submission_id)||{}).person_id]||{}).category||"",type:x.type,text:x.text}))};
}
function log(event,detail){try{sheet(SpreadsheetApp.openById(CONFIG.SHEET_ID),CONFIG.SHEETS.log,HEADERS.Log).appendRow([new Date(),event,clean(detail,2000)]);}catch(_){}}
function out(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
