/* ── GUARD ───────────────────────────────────────────────── */
function initAdminPage(titulo) {
  const usuario = Auth.getUsuarioActivo();
  if (!usuario || usuario.rol !== "ADMIN") {
    window.location.href = BASE_PATH + "index.html";
    return null;
  }
  Sidebar.inject(usuario, window.location.pathname);
  const t = document.getElementById("topbar-title");
  if (t) t.textContent = titulo;
  return usuario;
}

function getFacultadAdmin(usuario) {
  return DB.getFacultadById(usuario.facultad_id);
}

/* ── UTILS (reutilizadas del superadmin) ─────────────────── */
function badgeEstado(estado) {
  return estado === "activo"
    ? `<span class="badge badge-success"><i class="bi-check-circle"></i> Activo</span>`
    : `<span class="badge badge-danger"><i class="bi-x-circle"></i> Inactivo</span>`;
}
function badgeCursoEstado(estado) {
  return estado === "activo"
    ? `<span class="badge badge-success">Activo</span>`
    : `<span class="badge badge-neutral">Archivado</span>`;
}
function formatFecha(f) {
  if (!f) return "—";
  return new Date(f).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── DASHBOARD ADMIN ─────────────────────────────────────── */
const AdminDashboard = {
  init() {
    const usuario = initAdminPage("Dashboard");
    if (!usuario) return;

    const facultad = getFacultadAdmin(usuario);
    const nombreFac = document.getElementById("nombre-facultad");
    if (nombreFac) nombreFac.textContent = facultad ? facultad.nombre : "Mi Facultad";

    const cursosF   = facultad ? DB.cursos.filter(c => c.facultad_id === facultad.id) : [];
    const activos   = cursosF.filter(c => c.estado === "activo").length;
    const estudiantesIds = new Set(
      cursosF.flatMap(c => DB.getEstudiantesByCurso(c.id).map(e => e.id))
    );
    const profesoresIds = new Set(
      DB.inscripciones
        .filter(i => cursosF.some(c => c.id === i.curso_id) && i.rol_en_curso === "PROFESOR")
        .map(i => i.usuario_id)
    );

    document.getElementById("kpi-cursos").textContent      = activos;
    document.getElementById("kpi-estudiantes").textContent = estudiantesIds.size;
    document.getElementById("kpi-profesores").textContent  = profesoresIds.size;
    document.getElementById("kpi-tasa").textContent        = "68%";

    /* Tabla cursos recientes */
    const tbody = document.getElementById("tabla-cursos-recientes");
    if (!tbody) return;
    const recientes = cursosF.slice(0, 5);
    if (!recientes.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="bi-book"></i><p>Sin cursos en esta facultad.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = recientes.map(c => {
      const prof = DB.getUsuarioById(c.profesor_id);
      return `
        <tr>
          <td class="fw-semibold text-sm">${c.nombre}</td>
          <td class="text-sm">${prof ? `${prof.nombres} ${prof.apellidos}` : "—"}</td>
          <td>${badgeCursoEstado(c.estado)}</td>
          <td class="text-sm text-muted">${formatFecha(c.fecha_fin)}</td>
        </tr>`;
    }).join("");
  }
};

/* ── USUARIOS ADMIN ──────────────────────────────────────── */
const AdminUsuarios = {
  filtro: "",
  usuario: null,

  init() {
    const usuario = initAdminPage("Usuarios de Facultad");
    if (!usuario) return;
    this.usuario = usuario;
    this.renderTabla();
    const buscador = document.getElementById("buscador");
    if (buscador) {
      buscador.addEventListener("input", e => {
        this.filtro = e.target.value.toLowerCase();
        this.renderTabla();
      });
    }
  },

  getUsuariosFacultad() {
    const facultad = getFacultadAdmin(this.usuario);
    if (!facultad) return DB.usuarios.filter(u => u.rol === "USER");
    /* Usuarios inscritos en cursos de esta facultad */
    const cursosFac = DB.cursos.filter(c => c.facultad_id === facultad.id).map(c => c.id);
    const ids = new Set(
      DB.inscripciones.filter(i => cursosFac.includes(i.curso_id)).map(i => i.usuario_id)
    );
    return DB.usuarios.filter(u => ids.has(u.id));
  },

  renderTabla() {
    const tbody = document.getElementById("tabla-usuarios");
    if (!tbody) return;
    const lista = this.getUsuariosFacultad().filter(u =>
      u.nombres.toLowerCase().includes(this.filtro) ||
      u.apellidos.toLowerCase().includes(this.filtro) ||
      u.identificacion.includes(this.filtro)
    );
    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi-people"></i><p>No se encontraron usuarios.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="avatar avatar-sm">${DB.iniciales(u.nombres, u.apellidos)}</div>
            <div>
              <div class="fw-semibold text-sm">${u.nombres} ${u.apellidos}</div>
              <div class="text-xs text-muted">${u.correo}</div>
            </div>
          </div>
        </td>
        <td class="text-sm">${u.identificacion}</td>
        <td class="text-sm">${u.celular}</td>
        <td class="text-sm">${u.estadoCivil}</td>
        <td>${badgeEstado(u.estado)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-sm" onclick="AdminModalUsuario.abrir(${u.id})" title="Editar">
              <i class="bi-pencil"></i>
            </button>
            <button class="btn btn-ghost btn-sm" onclick="AdminUsuarios.toggleEstado(${u.id})" title="Cambiar estado">
              <i class="bi-toggle-on"></i>
            </button>
          </div>
        </td>
      </tr>`).join("");
  },

  toggleEstado(id) {
    const u = DB.getUsuarioById(id);
    if (!u) return;
    u.estado = u.estado === "activo" ? "inactivo" : "activo";
    this.renderTabla();
    AdminNotif.show(`Estado de ${u.nombres} cambiado a <strong>${u.estado}</strong>.`, "success");
  }
};

/* ── MODAL USUARIO (Admin — campos del modulo Clientes) ──── */
const AdminModalUsuario = {
  usuarioId: null,

  abrir(id) {
    this.usuarioId = id;
    const u = DB.getUsuarioById(id);
    if (!u) return;
    document.getElementById("af-nombres").value       = u.nombres;
    document.getElementById("af-apellidos").value     = u.apellidos;
    document.getElementById("af-identificacion").value= u.identificacion;
    document.getElementById("af-celular").value       = u.celular;
    document.getElementById("af-telefono").value      = u.telefono || "";
    document.getElementById("af-correo").value        = u.correo;
    document.getElementById("af-direccion").value     = u.direccion || "";
    document.getElementById("af-estado-civil").value  = u.estadoCivil;
    document.getElementById("af-estado").value        = u.estado;
    document.getElementById("modal-admin-usuario").classList.add("open");
  },

  cerrar() {
    document.getElementById("modal-admin-usuario").classList.remove("open");
  },

  guardar() {
    const u = DB.getUsuarioById(this.usuarioId);
    if (!u) return;
    u.nombres       = document.getElementById("af-nombres").value.trim()       || u.nombres;
    u.apellidos     = document.getElementById("af-apellidos").value.trim()     || u.apellidos;
    u.identificacion= document.getElementById("af-identificacion").value.trim()|| u.identificacion;
    u.celular       = document.getElementById("af-celular").value.trim()       || u.celular;
    u.telefono      = document.getElementById("af-telefono").value.trim()      || null;
    u.correo        = document.getElementById("af-correo").value.trim()        || u.correo;
    u.direccion     = document.getElementById("af-direccion").value.trim()     || null;
    u.estadoCivil   = document.getElementById("af-estado-civil").value;
    u.estado        = document.getElementById("af-estado").value;
    this.cerrar();
    AdminUsuarios.renderTabla();
    AdminNotif.show("Usuario actualizado correctamente.", "success");
  }
};

/* ── CURSOS ADMIN ────────────────────────────────────────── */
const AdminCursos = {
  usuario: null,

  init() {
    const usuario = initAdminPage("Cursos de Facultad");
    if (!usuario) return;
    this.usuario = usuario;
    this.renderTabla();
  },

  renderTabla() {
    const tbody = document.getElementById("tabla-cursos");
    if (!tbody) return;
    const facultad  = getFacultadAdmin(this.usuario);
    const cursos    = facultad ? DB.cursos.filter(c => c.facultad_id === facultad.id) : DB.cursos;

    if (!cursos.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="bi-book"></i><p>No hay cursos en esta facultad.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = cursos.map(c => {
      const prof  = DB.getUsuarioById(c.profesor_id);
      const estuCount = DB.getEstudiantesByCurso(c.id).length;
      return `
        <tr>
          <td>
            <div class="fw-semibold text-sm">${c.nombre}</div>
            <div class="text-xs text-muted">${c.codigo}</div>
          </td>
          <td class="text-sm">${prof ? `${prof.nombres} ${prof.apellidos}` : "—"}</td>
          <td class="text-sm">${estuCount} estudiantes</td>
          <td class="text-sm">${formatFecha(c.fecha_inicio)}</td>
          <td class="text-sm">${formatFecha(c.fecha_fin)}</td>
          <td>${badgeCursoEstado(c.estado)}</td>
        </tr>`;
    }).join("");
  }
};

/* ── REPORTES ADMIN ──────────────────────────────────────── */
const AdminReportes = {
  usuario: null,

  init() {
    const usuario = initAdminPage("Reportes");
    if (!usuario) return;
    this.usuario = usuario;

    const facultad = getFacultadAdmin(usuario);
    const fNombre  = document.getElementById("nombre-facultad");
    if (fNombre) fNombre.textContent = facultad ? facultad.nombre : "Mi Facultad";

    const cursos    = facultad ? DB.cursos.filter(c => c.facultad_id === facultad.id) : [];
    const estudIds  = new Set(cursos.flatMap(c => DB.getEstudiantesByCurso(c.id).map(e => e.id)));

    document.getElementById("r-cursos").textContent      = cursos.length;
    document.getElementById("r-estudiantes").textContent = estudIds.size;

    const tbody = document.getElementById("tabla-reportes");
    if (!tbody) return;
    if (!cursos.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="bi-bar-chart"></i><p>Sin datos para esta facultad.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = cursos.map(c => {
      const prof  = DB.getUsuarioById(c.profesor_id);
      const count = DB.getEstudiantesByCurso(c.id).length;
      const tasa  = Math.floor(Math.random() * 30) + 60;
      const badge = tasa >= 70
        ? `<span class="badge badge-success">${tasa}%</span>`
        : `<span class="badge badge-warning">${tasa}%</span>`;
      return `
        <tr>
          <td>
            <div class="fw-semibold text-sm">${c.nombre}</div>
            <div class="text-xs text-muted">${c.codigo}</div>
          </td>
          <td class="text-sm">${prof ? `${prof.nombres} ${prof.apellidos}` : "—"}</td>
          <td class="text-sm">${count}</td>
          <td>${badge} <span class="text-xs text-muted">aprobacion</span></td>
        </tr>`;
    }).join("");
  }
};

/* ── NOTIFICACIONES ──────────────────────────────────────── */
const AdminNotif = {
  show(mensaje, tipo = "success") {
    let n = document.getElementById("admin-notif");
    if (!n) {
      n = document.createElement("div");
      n.id = "admin-notif";
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
    clearTimeout(this._t);
    this._t = setTimeout(() => { n.style.opacity = "0"; }, 3000);
  }
};
