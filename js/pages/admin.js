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

/* Facultad administrada por este usuario (Facultad.admin === usuario.id) */
async function getFacultadAdmin(usuario) {
  const facs = await API.facultades();
  return facs.find(f => f.admin === usuario.id) || null;
}

/* Cuenta estudiantes unicos a lo largo de una lista de cursos */
async function contarEstudiantesUnicos(cursos) {
  const listas = await Promise.all(cursos.map(c => API.inscripciones(c.id)));
  const ids = new Set();
  listas.forEach(ins => ins
    .filter(i => i.rol_en_curso === "ESTUDIANTE")
    .forEach(i => ids.add(i.usuario)));
  return ids.size;
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
  async init() {
    const usuario = initAdminPage("Dashboard");
    if (!usuario) return;
    try {
      const [facultad, cursosF] = await Promise.all([
        getFacultadAdmin(usuario), API.cursos()
      ]);

      const nombreFac = document.getElementById("nombre-facultad");
      if (nombreFac) nombreFac.textContent = facultad ? facultad.nombre : "Mi Facultad";

      const activos = cursosF.filter(c => c.estado === "activo").length;

      /* Estudiantes y profesores unicos */
      const inscLists = await Promise.all(cursosF.map(c => API.inscripciones(c.id)));
      const estudiantes = new Set();
      const profesores  = new Set();
      inscLists.forEach(ins => ins.forEach(i => {
        if (i.rol_en_curso === "ESTUDIANTE") estudiantes.add(i.usuario);
        if (i.rol_en_curso === "PROFESOR")   profesores.add(i.usuario);
      }));

      document.getElementById("kpi-cursos").textContent      = activos;
      document.getElementById("kpi-estudiantes").textContent = estudiantes.size;
      document.getElementById("kpi-profesores").textContent  = profesores.size;
      document.getElementById("kpi-tasa").textContent        = "68%";

      const tbody = document.getElementById("tabla-cursos-recientes");
      if (!tbody) return;
      const recientes = cursosF.slice(0, 5);
      if (!recientes.length) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="bi-book"></i><p>Sin cursos en esta facultad.</p></div></td></tr>`;
        return;
      }
      tbody.innerHTML = recientes.map(c => `
        <tr>
          <td class="fw-semibold text-sm">${c.nombre}</td>
          <td class="text-sm">${c.profesor_nombre || "—"}</td>
          <td>${badgeCursoEstado(c.estado)}</td>
          <td class="text-sm text-muted">${formatFecha(c.fecha_fin)}</td>
        </tr>`).join("");
    } catch (e) { AdminNotif.show(e.message, "danger"); }
  }
};

/* ── USUARIOS ADMIN ──────────────────────────────────────── */
const AdminUsuarios = {
  filtro: "",
  usuario: null,
  _data: [],

  async init() {
    const usuario = initAdminPage("Usuarios de Facultad");
    if (!usuario) return;
    this.usuario = usuario;
    const buscador = document.getElementById("buscador");
    if (buscador) buscador.addEventListener("input", e => {
      this.filtro = e.target.value.toLowerCase();
      this.renderTabla();
    });
    try {
      this._data = await this.getUsuariosFacultad();
      this.renderTabla();
    } catch (e) { AdminNotif.show(e.message, "danger"); }
  },

  async getUsuariosFacultad() {
    const [usuarios, cursosFac] = await Promise.all([API.usuarios(), API.cursos()]);
    if (!cursosFac.length) return usuarios.filter(u => u.rol === "USER");
    const inscLists = await Promise.all(cursosFac.map(c => API.inscripciones(c.id)));
    const ids = new Set();
    inscLists.forEach(ins => ins.forEach(i => ids.add(i.usuario)));
    return usuarios.filter(u => ids.has(u.id));
  },

  renderTabla() {
    const tbody = document.getElementById("tabla-usuarios");
    if (!tbody) return;
    const lista = this._data.filter(u =>
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
            <div class="avatar avatar-sm">${u.iniciales}</div>
            <div>
              <div class="fw-semibold text-sm">${u.nombres} ${u.apellidos}</div>
              <div class="text-xs text-muted">${u.correo}</div>
            </div>
          </div>
        </td>
        <td class="text-sm">${u.identificacion}</td>
        <td class="text-sm">${u.celular}</td>
        <td class="text-sm">${u.estado_civil}</td>
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

  async toggleEstado(id) {
    try {
      await API.toggleEstado(id);
      const u = this._data.find(x => x.id === id);
      if (u) u.estado = u.estado === "activo" ? "inactivo" : "activo";
      this.renderTabla();
      AdminNotif.show("Estado actualizado.", "success");
    } catch (e) { AdminNotif.show(e.message, "danger"); }
  }
};

/* ── MODAL USUARIO (Admin — campos del modulo Clientes) ──── */
const AdminModalUsuario = {
  usuarioId: null,

  abrir(id) {
    this.usuarioId = id;
    const u = AdminUsuarios._data.find(x => x.id === id);
    if (!u) return;
    document.getElementById("af-nombres").value       = u.nombres;
    document.getElementById("af-apellidos").value     = u.apellidos;
    document.getElementById("af-identificacion").value= u.identificacion;
    document.getElementById("af-celular").value       = u.celular;
    document.getElementById("af-telefono").value      = u.telefono || "";
    document.getElementById("af-correo").value        = u.correo;
    document.getElementById("af-direccion").value     = u.direccion || "";
    document.getElementById("af-estado-civil").value  = u.estado_civil;
    document.getElementById("af-estado").value        = u.estado;
    document.getElementById("modal-admin-usuario").classList.add("open");
  },

  cerrar() {
    document.getElementById("modal-admin-usuario").classList.remove("open");
  },

  async guardar() {
    const campos = {
      nombres:        document.getElementById("af-nombres").value.trim(),
      apellidos:      document.getElementById("af-apellidos").value.trim(),
      identificacion: document.getElementById("af-identificacion").value.trim(),
      celular:        document.getElementById("af-celular").value.trim(),
      telefono:       document.getElementById("af-telefono").value.trim() || null,
      correo:         document.getElementById("af-correo").value.trim(),
      direccion:      document.getElementById("af-direccion").value.trim() || null,
      estado_civil:   document.getElementById("af-estado-civil").value,
      estado:         document.getElementById("af-estado").value,
    };
    try {
      const updated = await API.actualizarUsuario(this.usuarioId, campos);
      const idx = AdminUsuarios._data.findIndex(x => x.id === this.usuarioId);
      if (idx !== -1) AdminUsuarios._data[idx] = { ...AdminUsuarios._data[idx], ...updated };
      this.cerrar();
      AdminUsuarios.renderTabla();
      AdminNotif.show("Usuario actualizado correctamente.", "success");
    } catch (e) { AdminNotif.show(e.message, "danger"); }
  }
};

/* ── CURSOS ADMIN ────────────────────────────────────────── */
const AdminCursos = {
  usuario: null,

  async init() {
    const usuario = initAdminPage("Cursos de Facultad");
    if (!usuario) return;
    this.usuario = usuario;
    try {
      const cursos = await API.cursos();
      this.renderTabla(cursos);
    } catch (e) { AdminNotif.show(e.message, "danger"); }
  },

  renderTabla(cursos) {
    const tbody = document.getElementById("tabla-cursos");
    if (!tbody) return;
    if (!cursos.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="bi-book"></i><p>No hay cursos en esta facultad.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = cursos.map(c => `
      <tr>
        <td>
          <div class="fw-semibold text-sm">${c.nombre}</div>
          <div class="text-xs text-muted">${c.codigo}</div>
        </td>
        <td class="text-sm">${c.profesor_nombre || "—"}</td>
        <td class="text-sm">${c.total_estudiantes} estudiantes</td>
        <td class="text-sm">${formatFecha(c.fecha_inicio)}</td>
        <td class="text-sm">${formatFecha(c.fecha_fin)}</td>
        <td>${badgeCursoEstado(c.estado)}</td>
      </tr>`).join("");
  }
};

/* ── REPORTES ADMIN ──────────────────────────────────────── */
const AdminReportes = {
  usuario: null,

  async init() {
    const usuario = initAdminPage("Reportes");
    if (!usuario) return;
    this.usuario = usuario;
    try {
      const [facultad, cursos] = await Promise.all([
        getFacultadAdmin(usuario), API.cursos()
      ]);
      const fNombre = document.getElementById("nombre-facultad");
      if (fNombre) fNombre.textContent = facultad ? facultad.nombre : "Mi Facultad";

      const estudiantesUnicos = await contarEstudiantesUnicos(cursos);
      document.getElementById("r-cursos").textContent      = cursos.length;
      document.getElementById("r-estudiantes").textContent = estudiantesUnicos;

      const tbody = document.getElementById("tabla-reportes");
      if (!tbody) return;
      if (!cursos.length) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="bi-bar-chart"></i><p>Sin datos para esta facultad.</p></div></td></tr>`;
        return;
      }
      tbody.innerHTML = cursos.map(c => {
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
            <td class="text-sm">${c.profesor_nombre || "—"}</td>
            <td class="text-sm">${c.total_estudiantes}</td>
            <td>${badge} <span class="text-xs text-muted">aprobacion</span></td>
          </tr>`;
      }).join("");
    } catch (e) { AdminNotif.show(e.message, "danger"); }
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
