(() => {
  "use strict";
  const cfg = window.APP_CONFIG || {};
  const sections = [
    { title: "Condiciones físicas del entorno laboral", questions: [
      "La iluminación del área de trabajo es adecuada.",
      "La temperatura del área de trabajo es adecuada.",
      "La ventilación es suficiente.",
      "El nivel de ruido permite realizar las actividades adecuadamente.",
      "El espacio de trabajo es suficiente y adecuado.",
      "El mobiliario y equipo de trabajo son adecuados.",
      "Las instalaciones se mantienen limpias y ordenadas.",
      "Las condiciones de seguridad permiten realizar el trabajo adecuadamente."
    ]},
    { title: "Condiciones sociales del entorno laboral", questions: [
      "Existe respeto entre los compañeros de trabajo.",
      "Existe buena comunicación dentro del equipo.",
      "Se fomenta el trabajo en equipo.",
      "Existe un trato respetuoso por parte de los responsables o supervisores.",
      "Los conflictos laborales son atendidos oportunamente.",
      "Mi jefe o jefa escucha y toma en cuenta las opiniones del equipo.",
      "Las diferencias de opinión son respetadas.",
      "Existe colaboración entre las diferentes áreas."
    ]},
    { title: "Condiciones psicológicas del personal", questions: [
      "La carga de trabajo es razonable.",
      "Se cuenta con el tiempo necesario para realizar las actividades correctamente.",
      "Se reconoce el buen desempeño de los colaboradores.",
      "Se cuenta con apoyo cuando se presentan dificultades laborales.",
      "El ambiente laboral favorece la motivación para realizar el trabajo.",
      "Puedo pedir ayuda cuando no sé cómo resolver una situación.",
      "Puedo expresar desacuerdos sobre la forma en que se realizan las tareas.",
      "Considero que el ambiente laboral permite realizar mi trabajo de manera eficiente."
    ]}
  ];
  const scale = [[1,"Deficiente"],[2,"Regular"],[3,"Excelente"]];
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const sectionRoot = $("#question-sections");
  const categories = cfg.CATEGORIES || [];
  const projects = cfg.PROJECTS || [];
  categories.forEach(value => $("#category").add(new Option(value, value)));
  projects.forEach(project => $("#project").add(new Option(`${project.code} - ${project.name}`, project.code)));
  $("#employee-id").addEventListener("input", event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8); });

  function choices(name, options) {
    return options.map(([value, label]) => {
      const badge = value === "Parcialmente" ? "P" : value;
      return `<label class="choice"><input type="radio" name="${name}" value="${value}"><span><b>${badge}</b>${label}</span></label>`;
    }).join("");
  }
  let qn = 0;
  sections.forEach((section, si) => {
    const el = document.createElement("section"); el.className = "card";
    el.innerHTML = `<div class="section-heading"><span>0${si + 2}</span><div><h2>${section.title}</h2><p>Selecciona una respuesta en cada reactivo.</p></div></div>`;
    section.questions.forEach(text => {
      qn += 1;
      const field = document.createElement("fieldset"); field.className = "question"; field.dataset.required = "true";
      field.innerHTML = `<legend><span class="q-number">${qn}</span>${text}</legend><div class="choice-row">${choices(`q${qn}`, scale)}</div>`;
      el.appendChild(field);
    });
    el.insertAdjacentHTML("beforeend", `<label>Observaciones de la sección <small>(opcional)</small><textarea data-section-note="${si + 1}" maxlength="800"></textarea></label>`);
    sectionRoot.appendChild(el);
  });

  const generalNumber = qn + 1;
  const general = document.createElement("section"); general.className = "card";
  general.innerHTML = `<div class="section-heading"><span>05</span><div><h2>Evaluación general del área de trabajo</h2><p>Elige la opción que mejor resume tu percepción.</p></div></div><fieldset class="question" data-required="true"><legend><span class="q-number">${generalNumber}</span>¿Cómo calificarías el ambiente laboral de tu área? *</legend><div class="choice-row">${choices("general", [[1,"Malo"],[2,"Regular"],[3,"Bueno"]])}</div></fieldset><label>Observaciones <small>(opcional)</small><textarea id="general-note" maxlength="800"></textarea></label>`;
  sectionRoot.appendChild(general);
  $("#quality-options").innerHTML = choices("qualityImpact", [["Sí","Sí"],["No","No"],["Parcialmente","Parcialmente"]]);

  function updateProgress() {
    const answered = $$('input[type="radio"]:checked').length;
    const total = 26;
    const pct = Math.round(answered / total * 100);
    $("#progress-label").textContent = `${answered} de ${total} reactivos`;
    $("#progress-percent").textContent = `${pct}%`;
    $("#progress-bar").style.width = `${pct}%`;
    const impact = $('input[name="qualityImpact"]:checked')?.value;
    const detail = $("#quality-detail-wrap");
    const required = impact === "Sí" || impact === "Parcialmente";
    detail.classList.toggle("hidden", !required);
    $("#quality-detail").required = required;
    if (!required) $("#quality-detail").value = "";
  }
  document.addEventListener("change", updateProgress);

  function missingQuestions() {
    const fields = $$("fieldset[data-required]");
    fields.forEach(f => f.classList.remove("invalid"));
    const missing = fields.filter(f => !$("input:checked", f));
    missing.forEach(f => f.classList.add("invalid"));
    return missing;
  }
  function payload() {
    const responses = [];
    sections.forEach((section, si) => section.questions.forEach((text, qi) => {
      const number = si * 8 + qi + 1;
      responses.push({ questionId: `S${si + 1}Q${qi + 1}`, sectionId: `S${si + 1}`, questionNumber: number, score: Number($(`input[name="q${number}"]:checked`).value) });
    }));
    responses.push({ questionId: "GENERAL", sectionId: "S4", questionNumber: generalNumber, score: Number($('input[name="general"]:checked').value) });
    return {
      action: "submit", token: cfg.WRITE_TOKEN, campaign: cfg.CAMPAIGN, organization: cfg.ORGANIZATION, projectCode: $("#project").value,
      person: { employeeId: $("#employee-id").value.trim(), fullName: $("#full-name").value.trim(), category: $("#category").value },
      responses,
      notes: $$("[data-section-note]").map(x => ({ sectionId: `S${x.dataset.sectionNote}`, type: "section", text: x.value.trim() })).filter(x => x.text),
      generalNote: $("#general-note").value.trim(),
      qualityImpact: $('input[name="qualityImpact"]:checked').value,
      qualityDetail: $("#quality-detail").value.trim(), improvements: $("#improvements").value.trim(),
      client: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, submittedAt: new Date().toISOString() }
    };
  }
  async function send(data) {
    if (!cfg.API_URL) throw new Error("El formulario aún no está conectado a la base de datos.");
    const response = await fetch(cfg.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data), redirect: "follow" });
    const text = await response.text();
    let result; try { result = JSON.parse(text); } catch (_) { throw new Error("El servicio de datos no respondió correctamente. Actualiza la página e inténtalo de nuevo."); }
    if (!result.ok) throw new Error(result.error || "No fue posible guardar la respuesta.");
    return result;
  }
  $("#survey").addEventListener("submit", async event => {
    event.preventDefault();
    const error = $("#form-error"); error.classList.add("hidden");
    const missing = missingQuestions();
    if (!event.currentTarget.checkValidity() || missing.length) {
      event.currentTarget.reportValidity();
      error.textContent = `Completa los campos obligatorios${missing.length ? ` y ${missing.length} reactivo(s) sin respuesta` : ""}.`;
      error.classList.remove("hidden");
      (missing[0] || $(":invalid"))?.scrollIntoView({ behavior: "smooth", block: "center" }); return;
    }
    const button = $("#submit-button"); button.disabled = true; button.textContent = "Enviando…"; $("#page-loader").classList.remove("hidden");
    try {
      const result = await send(payload());
      $("#folio").textContent = result.folio || result.submissionId;
      $("#survey").classList.add("hidden"); $("#success").classList.remove("hidden"); $("#success").focus();
    } catch (err) { error.textContent = err.message; error.classList.remove("hidden"); }
    finally { button.disabled = false; button.textContent = "Enviar evaluación"; $("#page-loader").classList.add("hidden"); }
  });
  $("#another").addEventListener("click", () => location.reload());
  updateProgress();
})();
 
