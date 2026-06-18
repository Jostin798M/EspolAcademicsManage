/* ── GUARD ───────────────────────────────────────────────── */
function initProfesorPage(titulo) {
  const usuario = Auth.getUsuarioActivo();
  if (!usuario || usuario.rol !== "USER" || sessionStorage.getItem("rol_activo") !== "PROFESOR") {
    window.location.href = BASE_PATH + "index.html";
    return null;
  }
  Sidebar.inject(usuario, window.location.pathname);
  const t = document.getElementById("topbar-title");
  if (t) t.textContent = titulo;
  return usuario;
}

function getParams() { return new URLSearchParams(window.location.search); }

function formatFecha(f) {
  if (!f) return "—";
  return new Date(f).toLocaleDateString("es-EC", { day:"2-digit", month:"short", year:"numeric" });
}

function badgeCurso(estado) {
  return estado === "activo"
    ? `<span class="badge badge-success">Activo</span>`
    : `<span class="badge badge-neutral">Archivado</span>`;
}

/* ── NOTIF ───────────────────────────────────────────────── */
function Notif(mensaje, tipo = "success") {
  let n = document.getElementById("pnotif");
  if (!n) {
    n = document.createElement("div"); n.id = "pnotif";
    n.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;max-width:340px;
      padding:14px 18px;border-radius:10px;font-size:.875rem;font-family:inherit;
      display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,.15);
      animation:fadeIn .2s ease;transition:opacity .3s ease;`;
    document.body.appendChild(n);
  }
  const c = tipo === "success"
    ? { bg:"#ECFDF5", color:"#065F46", border:"#059669", icon:"check-circle" }
    : { bg:"#FEF2F2", color:"#991B1B", border:"#DC2626", icon:"exclamation-circle" };
  n.style.background = c.bg; n.style.color = c.color; n.style.borderLeft = `4px solid ${c.border}`;
  n.innerHTML = `<i class="bi-${c.icon}"></i><span>${mensaje}</span>`;
  n.style.opacity = "1";
  clearTimeout(Notif._t);
  Notif._t = setTimeout(() => { n.style.opacity = "0"; }, 3000);
}

/* ── MIS CURSOS ──────────────────────────────────────────── */
const MisCursosProfesor = {
  init() {
    const u = initProfesorPage("Mis Cursos");
    if (!u) return;
    const cursos   = DB.getCursosByProfesor(u.id);
    const activos  = cursos.filter(c => c.estado === "activo");
    const archivados = cursos.filter(c => c.estado === "archivado");
    this.renderGrid("grid-activos", activos, u.id);
    this.renderGrid("grid-archivados", archivados, u.id);
    const secArch = document.getElementById("sec-archivados");
    if (secArch) secArch.style.display = archivados.length ? "block" : "none";
  },

  renderGrid(containerId, cursos, profesorId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!cursos.length) {
      el.innerHTML = `<div class="empty-state"><i class="bi-book"></i><p>No hay cursos aqui.</p></div>`;
      return;
    }
    el.innerHTML = cursos.map(c => {
      const fac   = DB.getFacultadById(c.facultad_id);
      const count = DB.getEstudiantesByCurso(c.id).length;
      return `
        <div class="course-card">
          <div class="course-card-header">
            <h4>${c.nombre}</h4>
            <span>${fac ? fac.codigo : "—"} &bull; ${c.codigo}</span>
          </div>
          <div class="course-card-body">
            <p class="text-sm" style="margin:0 0 12px;-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden">${c.descripcion}</p>
            <div style="display:flex;gap:12px;font-size:.75rem;color:var(--color-text-muted)">
              <span><i class="bi-people"></i> ${count} estudiantes</span>
              <span><i class="bi-calendar"></i> ${formatFecha(c.fecha_fin)}</span>
            </div>
          </div>
          <div class="course-card-footer">
            ${badgeCurso(c.estado)}
            <a href="curso.html?id=${c.id}" class="btn btn-primary btn-sm">
              Gestionar <i class="bi-arrow-right"></i>
            </a>
          </div>
        </div>`;
    }).join("");
  }
};

/* ── CURSO FORM ──────────────────────────────────────────── */
const CursoForm = {
  componenteIndex: 0,

  init() {
    const u = initProfesorPage("Curso");
    if (!u) return;
    const id = parseInt(getParams().get("id")) || null;

    /* Poblar select de facultades */
    const selFac = document.getElementById("c-facultad");
    if (selFac) {
      selFac.innerHTML = `<option value="">Seleccionar...</option>` +
        DB.facultades.map(f => `<option value="${f.id}">${f.nombre}</option>`).join("");
    }

    if (id) {
      document.getElementById("form-titulo").textContent = "Editar Curso";
      const h2 = document.getElementById("form-titulo-h2");
      if (h2) h2.textContent = "Editar Curso";
      const c = DB.getCursoById(id);
      if (!c) return;
      document.getElementById("c-nombre").value      = c.nombre;
      document.getElementById("c-descripcion").value = c.descripcion;
      document.getElementById("c-facultad").value    = c.facultad_id;
      document.getElementById("c-inicio").value      = c.fecha_inicio;
      document.getElementById("c-fin").value         = c.fecha_fin;
      document.getElementById("c-codigo").value      = c.codigo;
      c.formula.forEach(f => this.agregarComponente(f.componente, f.porcentaje));
    } else {
      document.getElementById("form-titulo").textContent = "Nuevo Curso";
      document.getElementById("c-codigo").value = "CURSO-" + Math.random().toString(36).slice(2,8).toUpperCase();
      this.agregarComponente("Tareas", 40);
      this.agregarComponente("Quizzes", 30);
      this.agregarComponente("Proyecto Final", 30);
    }
    this.actualizarTotal();
  },

  agregarComponente(nombre = "", porcentaje = 0) {
    const idx = this.componenteIndex++;
    const cont = document.getElementById("formula-items");
    if (!cont) return;
    const div = document.createElement("div");
    div.id = `comp-${idx}`;
    div.style.cssText = "display:flex;gap:8px;align-items:center;margin-bottom:8px";
    div.innerHTML = `
      <input type="text"   class="form-control comp-nombre" placeholder="Ej: Examenes" value="${nombre}" style="flex:1" oninput="CursoForm.actualizarTotal()">
      <input type="number" class="form-control comp-pct" placeholder="%" value="${porcentaje}" min="0" max="100" style="width:80px" oninput="CursoForm.actualizarTotal()">
      <span class="text-muted text-sm">%</span>
      <button class="btn btn-ghost btn-sm" onclick="CursoForm.quitarComponente('comp-${idx}')"><i class="bi-trash"></i></button>`;
    cont.appendChild(div);
  },

  quitarComponente(id) {
    const el = document.getElementById(id);
    if (el) { el.remove(); this.actualizarTotal(); }
  },

  actualizarTotal() {
    const vals = Array.from(document.querySelectorAll(".comp-pct")).map(i => parseFloat(i.value) || 0);
    const total = vals.reduce((a, b) => a + b, 0);
    const el    = document.getElementById("formula-total");
    if (el) {
      el.textContent = `Total: ${total}%`;
      el.style.color = total === 100 ? "var(--color-success)" : "var(--color-danger)";
    }
  },

  guardar() {
    const nombre      = document.getElementById("c-nombre").value.trim();
    const descripcion = document.getElementById("c-descripcion").value.trim();
    const facultad_id = parseInt(document.getElementById("c-facultad").value);
    const fecha_inicio= document.getElementById("c-inicio").value;
    const fecha_fin   = document.getElementById("c-fin").value;
    const codigo      = document.getElementById("c-codigo").value.trim();

    if (!nombre || !descripcion || !facultad_id || !fecha_inicio || !fecha_fin) {
      Notif("Completa todos los campos obligatorios.", "danger"); return;
    }
    if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
      Notif("La fecha de fin debe ser posterior al inicio.", "danger"); return;
    }

    const formula = Array.from(document.querySelectorAll("#formula-items > div")).map(div => ({
      componente: div.querySelector(".comp-nombre").value.trim(),
      porcentaje: parseFloat(div.querySelector(".comp-pct").value) || 0
    })).filter(f => f.componente);

    const total = formula.reduce((a, b) => a + b.porcentaje, 0);
    if (total !== 100) { Notif("Los porcentajes de la formula deben sumar 100%.", "danger"); return; }

    const id = parseInt(getParams().get("id")) || null;
    const u  = Auth.getUsuarioActivo();

    if (id) {
      const c = DB.getCursoById(id);
      Object.assign(c, { nombre, descripcion, facultad_id, fecha_inicio, fecha_fin, formula });
      Notif("Curso actualizado.");
    } else {
      DB.cursos.push({ id: DB.cursos.length + 1, nombre, descripcion, facultad_id,
        fecha_inicio, fecha_fin, codigo, estado:"activo", profesor_id: u.id, formula });
      Notif("Curso creado exitosamente.");
    }
    setTimeout(() => { window.location.href = "mis-cursos.html"; }, 900);
  }
};

/* ── GESTION DEL CURSO ───────────────────────────────────── */
const GestionCurso = {
  curso: null,
  tab: "modulos",

  init() {
    const u = initProfesorPage("Gestion del Curso");
    if (!u) return;
    const id = parseInt(getParams().get("id"));
    this.curso = DB.getCursoById(id);
    if (!this.curso) { window.location.href = "mis-cursos.html"; return; }

    document.getElementById("curso-nombre").textContent = this.curso.nombre;
    document.getElementById("curso-codigo").innerHTML   =
      `<span class="badge badge-primary">${this.curso.codigo}</span>`;
    document.getElementById("curso-estado").innerHTML   =
      badgeCurso(this.curso.estado);

    this.renderModulos();
    this.renderTareas();
    this.renderQuizzes();
    this.renderEstudiantes();
    this.renderFormula();
  },

  cambiarTab(tab) {
    this.tab = tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.style.display = "none");
    document.getElementById(`tab-${tab}`).classList.add("active");
    document.getElementById(`panel-${tab}`).style.display = "block";
  },

  renderModulos() {
    const el = document.getElementById("lista-modulos");
    if (!el) return;
    const modulos = DB.getModulosByCurso(this.curso.id);
    if (!modulos.length) {
      el.innerHTML = `<div class="empty-state"><i class="bi-collection"></i><p>No hay modulos creados.</p></div>`;
      return;
    }
    el.innerHTML = modulos.map(m => {
      const mats = DB.getMaterialesByModulo(m.id).length;
      return `
        <div class="module-item">
          <div class="module-num">${m.orden}</div>
          <div class="module-info">
            <strong>${m.titulo}</strong>
            <span>${mats} material${mats !== 1 ? "es" : ""}</span>
          </div>
          <div style="display:flex;gap:6px">
            <a href="modulo-form.html?curso_id=${this.curso.id}&modulo_id=${m.id}" class="btn btn-ghost btn-sm">
              <i class="bi-pencil"></i>
            </a>
          </div>
        </div>`;
    }).join("");
  },

  renderTareas() {
    const el = document.getElementById("lista-tareas");
    if (!el) return;
    const tareas = DB.getTareasByCurso(this.curso.id);
    if (!tareas.length) {
      el.innerHTML = `<div class="empty-state"><i class="bi-file-text"></i><p>No hay tareas creadas.</p></div>`;
      return;
    }
    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Titulo</th><th>Fecha limite</th><th>Puntaje</th><th>Entregas</th><th>Acciones</th></tr></thead>
          <tbody>
            ${tareas.map(t => {
              const entregas = DB.getEntregasByTarea(t.id).filter(e => e.estado === "entregado").length;
              const total    = DB.getEstudiantesByCurso(this.curso.id).length;
              return `
                <tr>
                  <td class="fw-semibold text-sm">${t.titulo}</td>
                  <td class="text-sm">${formatFecha(t.fecha_limite)}</td>
                  <td class="text-sm">${t.puntaje_maximo} pts</td>
                  <td><span class="badge badge-${entregas === total ? "success" : "warning"}">${entregas}/${total}</span></td>
                  <td>
                    <div class="table-actions">
                      <a href="tarea-entregas.html?tarea_id=${t.id}&curso_id=${this.curso.id}" class="btn btn-ghost btn-sm"><i class="bi-eye"></i></a>
                      <a href="tarea-form.html?curso_id=${this.curso.id}&tarea_id=${t.id}" class="btn btn-ghost btn-sm"><i class="bi-pencil"></i></a>
                    </div>
                  </td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  },

  renderQuizzes() {
    const el = document.getElementById("lista-quizzes");
    if (!el) return;
    const quizzes = DB.getQuizzesByCurso(this.curso.id);
    if (!quizzes.length) {
      el.innerHTML = `<div class="empty-state"><i class="bi-patch-question"></i><p>No hay quizzes creados.</p></div>`;
      return;
    }
    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Titulo</th><th>Preguntas</th><th>Tiempo</th><th>Fecha limite</th><th>Acciones</th></tr></thead>
          <tbody>
            ${quizzes.map(q => `
              <tr>
                <td class="fw-semibold text-sm">${q.titulo}</td>
                <td class="text-sm">${q.preguntas.length}</td>
                <td class="text-sm">${q.tiempo_limite_min ? q.tiempo_limite_min + " min" : "Sin limite"}</td>
                <td class="text-sm">${formatFecha(q.fecha_limite)}</td>
                <td>
                  <div class="table-actions">
                    <a href="quiz-resultados.html?quiz_id=${q.id}&curso_id=${this.curso.id}" class="btn btn-ghost btn-sm"><i class="bi-bar-chart"></i></a>
                    <a href="quiz-form.html?curso_id=${this.curso.id}&quiz_id=${q.id}" class="btn btn-ghost btn-sm"><i class="bi-pencil"></i></a>
                  </div>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  },

  renderEstudiantes() {
    const el = document.getElementById("lista-estudiantes");
    if (!el) return;
    const estudiantes = DB.getEstudiantesByCurso(this.curso.id);
    if (!estudiantes.length) {
      el.innerHTML = `<div class="empty-state"><i class="bi-people"></i><p>No hay estudiantes inscritos.</p></div>`;
      return;
    }
    el.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr><th>Estudiante</th><th>Correo</th><th>Progreso</th></tr></thead>
          <tbody>
            ${estudiantes.map(e => {
              const pct = DB.getProgresoCurso(e.id, this.curso.id);
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="avatar avatar-sm">${DB.iniciales(e.nombres, e.apellidos)}</div>
                      <span class="fw-semibold text-sm">${e.nombres} ${e.apellidos}</span>
                    </div>
                  </td>
                  <td class="text-sm text-muted">${e.correo}</td>
                  <td style="min-width:140px">
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="progress-bar" style="flex:1"><div class="progress-fill ${pct===100?"success":""}" style="width:${pct}%"></div></div>
                      <span class="text-xs text-muted">${pct}%</span>
                    </div>
                  </td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  },

  renderFormula() {
    const el = document.getElementById("formula-display");
    if (!el || !this.curso.formula) return;
    el.innerHTML = this.curso.formula.map(f =>
      `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-border)">
        <span class="text-sm">${f.componente}</span>
        <span class="fw-semibold text-sm text-primary">${f.porcentaje}%</span>
      </div>`
    ).join("") + `
      <div style="display:flex;justify-content:space-between;padding:10px 0;margin-top:4px">
        <span class="fw-semibold text-sm">Total</span>
        <span class="fw-semibold text-sm">100%</span>
      </div>`;
  },

  inscribirEstudiante() {
    const busqueda = document.getElementById("buscar-estudiante").value.trim().toLowerCase();
    if (!busqueda) return;
    const usuario = DB.usuarios.find(u =>
      (u.nombres.toLowerCase().includes(busqueda) ||
       u.apellidos.toLowerCase().includes(busqueda) ||
       u.identificacion.includes(busqueda)) && u.rol === "USER"
    );
    if (!usuario) { Notif("Usuario no encontrado.", "danger"); return; }
    const yaInscrito = DB.inscripciones.some(i => i.usuario_id === usuario.id && i.curso_id === this.curso.id);
    if (yaInscrito)  { Notif(`${usuario.nombres} ya esta inscrito en este curso.`, "danger"); return; }
    DB.inscripciones.push({ id: DB.inscripciones.length + 1, usuario_id: usuario.id,
      curso_id: this.curso.id, rol_en_curso: "ESTUDIANTE", fecha: new Date().toISOString().split("T")[0] });
    Notif(`${usuario.nombres} inscrito correctamente.`);
    document.getElementById("buscar-estudiante").value = "";
    this.renderEstudiantes();
  }
};

/* ── MODULO FORM ─────────────────────────────────────────── */
const ModuloForm = {
  init() {
    const u = initProfesorPage("Modulo");
    if (!u) return;
    const curso_id  = parseInt(getParams().get("curso_id"));
    const modulo_id = parseInt(getParams().get("modulo_id")) || null;

    document.getElementById("btn-volver").href = `curso.html?id=${curso_id}`;

    if (modulo_id) {
      const m = DB.modulos.find(m => m.id === modulo_id);
      if (m) {
        document.getElementById("m-titulo").value      = m.titulo;
        document.getElementById("m-descripcion").value = m.descripcion || "";
        document.getElementById("m-orden").value       = m.orden;
        this.renderMateriales(modulo_id);
      }
    } else {
      const orden = DB.getModulosByCurso(curso_id).length + 1;
      document.getElementById("m-orden").value = orden;
      document.getElementById("panel-materiales").style.display = "none";
    }
  },

  renderMateriales(modulo_id) {
    const el = document.getElementById("lista-materiales");
    if (!el) return;
    const mats = DB.getMaterialesByModulo(modulo_id);
    if (!mats.length) {
      el.innerHTML = `<div class="empty-state" style="padding:24px"><i class="bi-folder2-open"></i><p>Sin materiales aun.</p></div>`;
      return;
    }
    el.innerHTML = mats.map(mat => `
      <div class="material-item">
        <div class="material-icon ${mat.tipo}">
          <i class="bi-${mat.tipo === "video" ? "play-circle" : "file-pdf"}"></i>
        </div>
        <div class="material-info">
          <strong>${mat.titulo}</strong>
          <span class="text-xs text-muted">${mat.tipo === "video" ? "Video externo" : "Documento PDF"}</span>
        </div>
        <a href="${mat.url}" target="_blank" class="btn btn-ghost btn-sm"><i class="bi-box-arrow-up-right"></i></a>
      </div>`).join("");
  },

  guardarModulo() {
    const curso_id  = parseInt(getParams().get("curso_id"));
    const modulo_id = parseInt(getParams().get("modulo_id")) || null;
    const titulo    = document.getElementById("m-titulo").value.trim();
    const descripcion = document.getElementById("m-descripcion").value.trim();
    const orden     = parseInt(document.getElementById("m-orden").value) || 1;
    if (!titulo) { Notif("El titulo es obligatorio.", "danger"); return; }

    if (modulo_id) {
      const m = DB.modulos.find(m => m.id === modulo_id);
      if (m) { m.titulo = titulo; m.descripcion = descripcion; m.orden = orden; }
      Notif("Modulo actualizado.");
    } else {
      DB.modulos.push({ id: DB.modulos.length + 1, curso_id, orden, titulo, descripcion });
      Notif("Modulo creado.");
    }
    setTimeout(() => { window.location.href = `curso.html?id=${curso_id}`; }, 800);
  },

  agregarMaterial() {
    const modulo_id = parseInt(getParams().get("modulo_id"));
    if (!modulo_id) { Notif("Guarda el modulo primero.", "danger"); return; }
    const tipo   = document.getElementById("mat-tipo").value;
    const titulo = document.getElementById("mat-titulo").value.trim();
    const url    = document.getElementById("mat-url").value.trim();
    if (!titulo || !url) { Notif("Titulo y URL son obligatorios.", "danger"); return; }
    DB.materiales.push({ id: DB.materiales.length + 1, modulo_id, tipo, titulo, url });
    document.getElementById("mat-titulo").value = "";
    document.getElementById("mat-url").value    = "";
    this.renderMateriales(modulo_id);
    Notif("Material agregado.");
  }
};

/* ── TAREA FORM ──────────────────────────────────────────── */
const TareaForm = {
  init() {
    const u = initProfesorPage("Tarea");
    if (!u) return;
    const curso_id = parseInt(getParams().get("curso_id"));
    const tarea_id = parseInt(getParams().get("tarea_id")) || null;
    document.getElementById("btn-volver").href = `curso.html?id=${curso_id}`;

    if (tarea_id) {
      const t = DB.tareas.find(t => t.id === tarea_id);
      if (t) {
        document.getElementById("t-titulo").value      = t.titulo;
        document.getElementById("t-descripcion").value = t.descripcion;
        document.getElementById("t-limite").value      = t.fecha_limite;
        document.getElementById("t-puntaje").value     = t.puntaje_maximo;
        document.getElementById("t-criterios").value   = t.criterios || "";
      }
    }
  },

  guardar() {
    const curso_id = parseInt(getParams().get("curso_id"));
    const tarea_id = parseInt(getParams().get("tarea_id")) || null;
    const titulo      = document.getElementById("t-titulo").value.trim();
    const descripcion = document.getElementById("t-descripcion").value.trim();
    const fecha_limite= document.getElementById("t-limite").value;
    const puntaje_maximo = parseFloat(document.getElementById("t-puntaje").value);
    const criterios   = document.getElementById("t-criterios").value.trim();

    if (!titulo || !descripcion || !fecha_limite || !puntaje_maximo) {
      Notif("Completa todos los campos obligatorios.", "danger"); return;
    }

    if (tarea_id) {
      const t = DB.tareas.find(t => t.id === tarea_id);
      if (t) Object.assign(t, { titulo, descripcion, fecha_limite, puntaje_maximo, criterios });
      Notif("Tarea actualizada.");
    } else {
      DB.tareas.push({ id: DB.tareas.length + 1, curso_id, titulo, descripcion, fecha_limite, puntaje_maximo, criterios });
      Notif("Tarea creada.");
    }
    setTimeout(() => { window.location.href = `curso.html?id=${curso_id}`; }, 800);
  }
};

/* ── TAREA ENTREGAS ──────────────────────────────────────── */
const TareaEntregas = {
  tarea: null,

  init() {
    const u = initProfesorPage("Entregas");
    if (!u) return;
    const tarea_id = parseInt(getParams().get("tarea_id"));
    const curso_id = parseInt(getParams().get("curso_id"));
    this.tarea = DB.tareas.find(t => t.id === tarea_id);
    if (!this.tarea) return;

    document.getElementById("tarea-titulo").textContent    = this.tarea.titulo;
    document.getElementById("tarea-puntaje").textContent   = `Puntaje maximo: ${this.tarea.puntaje_maximo} pts`;
    document.getElementById("tarea-limite").textContent    = `Fecha limite: ${formatFecha(this.tarea.fecha_limite)}`;
    document.getElementById("btn-volver").href             = `curso.html?id=${curso_id}`;
    this.renderEntregas(tarea_id, curso_id);
  },

  renderEntregas(tarea_id, curso_id) {
    const tbody = document.getElementById("tabla-entregas");
    if (!tbody) return;
    const estudiantes = DB.getEstudiantesByCurso(curso_id);
    tbody.innerHTML = estudiantes.map(e => {
      const entrega = DB.getEntregaByTareaYUsuario(tarea_id, e.id);
      const estadoBadge = !entrega || entrega.estado === "pendiente"
        ? `<span class="badge badge-neutral">Pendiente</span>`
        : `<span class="badge badge-success">Entregado</span>`;
      const notaDisplay = entrega && entrega.nota !== null
        ? `<span class="fw-semibold text-primary">${entrega.nota}</span>`
        : `<span class="text-muted text-sm">Sin calificar</span>`;
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div class="avatar avatar-sm">${DB.iniciales(e.nombres, e.apellidos)}</div>
              <div>
                <div class="fw-semibold text-sm">${e.nombres} ${e.apellidos}</div>
                <div class="text-xs text-muted">${e.correo}</div>
              </div>
            </div>
          </td>
          <td>${entrega && entrega.fecha ? formatFecha(entrega.fecha) : "—"}</td>
          <td>${estadoBadge}</td>
          <td>${notaDisplay} <span class="text-xs text-muted">/ ${this.tarea.puntaje_maximo}</span></td>
          <td>
            <div class="table-actions">
              ${entrega && entrega.estado === "entregado"
                ? `<button class="btn btn-ghost btn-sm" onclick="TareaEntregas.verEntrega(${e.id},${tarea_id})"><i class="bi-eye"></i> Ver</button>
                   <button class="btn btn-primary btn-sm" onclick="ModalCalificar.abrir(${e.id},${tarea_id})"><i class="bi-award"></i> Calificar</button>`
                : `<span class="text-muted text-sm">—</span>`}
            </div>
          </td>
        </tr>`;
    }).join("");
  },

  verEntrega(usuario_id, tarea_id) {
    const e = DB.getEntregaByTareaYUsuario(tarea_id, usuario_id);
    const u = DB.getUsuarioById(usuario_id);
    if (!e) return;
    const modal = document.getElementById("modal-entrega");
    document.getElementById("entrega-estudiante").textContent = `${u.nombres} ${u.apellidos}`;
    const cont = document.getElementById("entrega-contenido");
    cont.innerHTML = "";
    if (e.texto)   cont.innerHTML += `<div class="form-group"><label class="form-label">Texto:</label><p class="text-sm" style="background:#F9FAFB;padding:12px;border-radius:8px;margin:0">${e.texto}</p></div>`;
    if (e.archivo) cont.innerHTML += `<div class="form-group"><label class="form-label">Archivo:</label><p class="text-sm"><i class="bi-file-earmark"></i> ${e.archivo}</p></div>`;
    if (e.link)    cont.innerHTML += `<div class="form-group"><label class="form-label">Link:</label><a href="${e.link}" target="_blank" class="text-sm">${e.link}</a></div>`;
    if (e.comentario) cont.innerHTML += `<div class="alert alert-info"><i class="bi-chat"></i> <span>Retroalimentacion: ${e.comentario}</span></div>`;
    modal.classList.add("open");
  }
};

const ModalCalificar = {
  usuarioId: null, tareaId: null,

  abrir(usuario_id, tarea_id) {
    this.usuarioId = usuario_id; this.tareaId = tarea_id;
    const e = DB.getEntregaByTareaYUsuario(tarea_id, usuario_id);
    const u = DB.getUsuarioById(usuario_id);
    const t = DB.tareas.find(t => t.id === tarea_id);
    document.getElementById("cal-estudiante").textContent = `${u.nombres} ${u.apellidos}`;
    document.getElementById("cal-nota").value             = e && e.nota !== null ? e.nota : "";
    document.getElementById("cal-nota").max               = t ? t.puntaje_maximo : 100;
    document.getElementById("cal-comentario").value       = e && e.comentario ? e.comentario : "";
    document.getElementById("modal-calificar").classList.add("open");
  },

  cerrar() { document.getElementById("modal-calificar").classList.remove("open"); },

  guardar() {
    const nota = parseFloat(document.getElementById("cal-nota").value);
    const comentario = document.getElementById("cal-comentario").value.trim();
    const t = DB.tareas.find(t => t.id === this.tareaId);
    if (isNaN(nota) || nota < 0 || nota > t.puntaje_maximo) {
      Notif(`Nota invalida. Debe estar entre 0 y ${t.puntaje_maximo}.`, "danger"); return;
    }
    const e = DB.getEntregaByTareaYUsuario(this.tareaId, this.usuarioId);
    if (e) { e.nota = nota; e.comentario = comentario; }
    this.cerrar();
    const curso_id = parseInt(getParams().get("curso_id"));
    TareaEntregas.renderEntregas(this.tareaId, curso_id);
    Notif("Calificacion guardada.");
  }
};

/* ── QUIZ FORM ───────────────────────────────────────────── */
const QuizForm = {
  preguntaIndex: 0,

  init() {
    const u = initProfesorPage("Quiz");
    if (!u) return;
    const curso_id = parseInt(getParams().get("curso_id"));
    const quiz_id  = parseInt(getParams().get("quiz_id")) || null;
    document.getElementById("btn-volver").href = `curso.html?id=${curso_id}`;

    if (quiz_id) {
      const q = DB.quizzes.find(q => q.id === quiz_id);
      if (q) {
        document.getElementById("q-titulo").value     = q.titulo;
        document.getElementById("q-descripcion").value= q.descripcion || "";
        document.getElementById("q-tiempo").value     = q.tiempo_limite_min || "";
        document.getElementById("q-limite").value     = q.fecha_limite;
        q.preguntas.forEach(p => this.renderPregunta(p));
      }
    }
  },

  agregarPregunta(tipo = "opcion_multiple_una") {
    this.renderPregunta({ id: null, tipo, enunciado:"", puntaje: 1, opciones:["",""], respuesta_correcta: 0 });
  },

  renderPregunta(p) {
    const idx  = this.preguntaIndex++;
    const cont = document.getElementById("preguntas-container");
    if (!cont) return;

    const tipoLabel = {
      opcion_multiple_una:    "Opcion multiple (1 respuesta)",
      opcion_multiple_varias: "Opcion multiple (varias respuestas)",
      verdadero_falso:        "Verdadero / Falso",
      completar_espacios:     "Completar espacios en blanco",
      relacionar_columnas:    "Relacionar columnas",
      ordenamiento:           "Ordenamiento / Secuencia",
      respuesta_numerica:     "Respuesta numerica",
      menu_desplegable:       "Menu desplegable",
      seleccion_imagen:       "Seleccion en imagen (Hot spot)",
      respuesta_corta:        "Respuesta corta",
      ensayo:                 "Ensayo / Respuesta larga (LaTeX)",
      subida_archivo:         "Subida de archivo",
      respuesta_imagen:       "Respuesta con imagen",
      editor_codigo:          "Editor de codigo",
      escala_valoracion:      "Escala de valoracion (Likert)"
    }[p.tipo] || p.tipo;

    const autoCorregible = ["opcion_multiple_una","opcion_multiple_varias","verdadero_falso",
      "completar_espacios","relacionar_columnas","ordenamiento","respuesta_numerica",
      "menu_desplegable","seleccion_imagen"].includes(p.tipo);

    const div = document.createElement("div");
    div.className = "card";
    div.style.marginBottom = "16px";
    div.innerHTML = `
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge badge-${autoCorregible ? "success" : "warning"}">
            ${autoCorregible ? "Autocorregible" : "Manual"}
          </span>
          <span class="text-sm fw-semibold">${tipoLabel}</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.card').remove()"><i class="bi-trash text-danger"></i></button>
      </div>
      <div class="card-body">
        <div class="form-grid form-grid-2" style="gap:12px;margin-bottom:12px">
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Enunciado <span class="required">*</span></label>
            <textarea class="form-control preg-enunciado" rows="2" placeholder="Escribe la pregunta...">${p.enunciado || ""}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Puntaje <span class="required">*</span></label>
            <input type="number" class="form-control preg-puntaje" value="${p.puntaje || 1}" min="0.5" step="0.5">
          </div>
        </div>
        ${this.renderInputPregunta(p, idx)}
      </div>`;
    cont.appendChild(div);
  },

  renderInputPregunta(p, idx) {
    switch(p.tipo) {
      case "opcion_multiple_una":
      case "opcion_multiple_varias":
        const opts = (p.opciones || ["",""]).map((o, i) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <input type="${p.tipo === "opcion_multiple_una" ? "radio" : "checkbox"}" name="resp-${idx}" ${p.respuesta_correcta === i ? "checked" : ""}>
            <input type="text" class="form-control" value="${o}" placeholder="Opcion ${i+1}">
          </div>`).join("");
        return `<div><label class="form-label text-xs text-muted">OPCIONES (marca la correcta)</label>${opts}
          <button class="btn btn-ghost btn-sm" onclick=""><i class="bi-plus"></i> Agregar opcion</button></div>`;

      case "verdadero_falso":
        return `<div><label class="form-label text-xs text-muted">RESPUESTA CORRECTA</label>
          <div style="display:flex;gap:12px;margin-top:6px">
            <label style="display:flex;align-items:center;gap:6px"><input type="radio" name="vf-${idx}" ${p.respuesta_correcta === true ? "checked" : ""}> Verdadero</label>
            <label style="display:flex;align-items:center;gap:6px"><input type="radio" name="vf-${idx}" ${p.respuesta_correcta === false ? "checked" : ""}> Falso</label>
          </div></div>`;

      case "completar_espacios":
      case "respuesta_numerica":
      case "menu_desplegable":
        return `<div class="form-group"><label class="form-label text-xs text-muted">RESPUESTA CORRECTA</label>
          <input type="${p.tipo === "respuesta_numerica" ? "number" : "text"}" class="form-control" value="${p.respuesta_correcta || ""}" placeholder="Respuesta esperada"></div>`;

      case "respuesta_corta":
      case "ensayo":
        return `<div class="alert alert-info" style="margin-top:8px"><i class="bi-info-circle"></i>
          <span>Esta pregunta requiere correccion manual por el profesor.</span></div>`;

      case "subida_archivo":
      case "respuesta_imagen":
        return `<div class="alert alert-info" style="margin-top:8px"><i class="bi-paperclip"></i>
          <span>El estudiante debera subir un archivo como respuesta. Correccion manual.</span></div>`;

      case "editor_codigo":
        return `<div class="form-group"><label class="form-label text-xs text-muted">LENGUAJE</label>
          <select class="form-control"><option>JavaScript</option><option>Python</option><option>Java</option><option>C++</option></select></div>`;

      case "escala_valoracion":
        return `<div><label class="form-label text-xs text-muted">ESCALA (1 al 5)</label>
          <div style="display:flex;gap:8px;margin-top:6px">${[1,2,3,4,5].map(n => `<span class="badge badge-neutral">${n}</span>`).join("")}</div>
          <p class="form-text">Correccion manual por el profesor.</p></div>`;

      default:
        return `<div class="alert alert-warning"><i class="bi-exclamation-triangle"></i><span>Configura las opciones de este tipo de pregunta.</span></div>`;
    }
  },

  guardar() {
    const curso_id = parseInt(getParams().get("curso_id"));
    const quiz_id  = parseInt(getParams().get("quiz_id")) || null;
    const titulo   = document.getElementById("q-titulo").value.trim();
    const descripcion = document.getElementById("q-descripcion").value.trim();
    const tiempo   = parseInt(document.getElementById("q-tiempo").value) || null;
    const limite   = document.getElementById("q-limite").value;
    if (!titulo || !limite) { Notif("Titulo y fecha limite son obligatorios.", "danger"); return; }

    if (quiz_id) {
      const q = DB.quizzes.find(q => q.id === quiz_id);
      if (q) Object.assign(q, { titulo, descripcion, tiempo_limite_min: tiempo, fecha_limite: limite });
      Notif("Quiz actualizado.");
    } else {
      DB.quizzes.push({ id: DB.quizzes.length + 1, curso_id, titulo, descripcion,
        tiempo_limite_min: tiempo, fecha_limite: limite, preguntas: [] });
      Notif("Quiz creado.");
    }
    setTimeout(() => { window.location.href = `curso.html?id=${curso_id}`; }, 800);
  }
};

/* ── QUIZ RESULTADOS ─────────────────────────────────────── */
const QuizResultados = {
  init() {
    const u = initProfesorPage("Resultados del Quiz");
    if (!u) return;
    const quiz_id  = parseInt(getParams().get("quiz_id"));
    const curso_id = parseInt(getParams().get("curso_id"));
    const quiz     = DB.quizzes.find(q => q.id === quiz_id);
    if (!quiz) return;

    document.getElementById("quiz-titulo").textContent  = quiz.titulo;
    document.getElementById("quiz-preguntas").textContent = `${quiz.preguntas.length} preguntas`;
    document.getElementById("btn-volver").href = `curso.html?id=${curso_id}`;

    const tbody = document.getElementById("tabla-resultados");
    if (!tbody) return;
    const estudiantes = DB.getEstudiantesByCurso(curso_id);
    tbody.innerHTML = estudiantes.map(e => {
      const resp = DB.respuestas_quiz.find(r => r.usuario_id === e.id && r.quiz_id === quiz_id);
      const notaBadge = resp
        ? `<span class="badge badge-${resp.nota_automatica >= DB.config.porcentaje_minimo_aprobacion ? "success" : "warning"}">${resp.nota_automatica} pts</span>`
        : `<span class="badge badge-neutral">Sin responder</span>`;
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div class="avatar avatar-sm">${DB.iniciales(e.nombres, e.apellidos)}</div>
              <span class="fw-semibold text-sm">${e.nombres} ${e.apellidos}</span>
            </div>
          </td>
          <td>${resp ? formatFecha(resp.fecha) : "—"}</td>
          <td>${notaBadge}</td>
          <td>${resp && resp.nota_manual !== null ? `<span class="badge badge-primary">${resp.nota_manual} pts</span>` : `<span class="text-muted text-sm">—</span>`}</td>
        </tr>`;
    }).join("");
  }
};
