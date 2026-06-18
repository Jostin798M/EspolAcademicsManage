/* ── GUARD ───────────────────────────────────────────────── */
function initPage(tituloPagina) {
  const usuario = Auth.getUsuarioActivo();
  if (!usuario || usuario.rol !== "SUPERADMIN") {
    window.location.href = BASE_PATH + "index.html";
    return null;
  }
  Sidebar.inject(usuario, window.location.pathname);
  const t = document.getElementById("topbar-title");
  if (t) t.textContent = tituloPagina;
  return usuario;
}

/* ── UTILS ───────────────────────────────────────────────── */
function badgeEstado(estado) {
  return estado === "activo"
    ? `<span class="badge badge-success"><i class="bi-check-circle"></i> Activo</span>`
    : `<span class="badge badge-danger"><i class="bi-x-circle"></i> Inactivo</span>`;
}
function badgeRol(rol) {
  const map = { SUPERADMIN:"badge-danger", ADMIN:"badge-warning", USER:"badge-neutral" };
  return `<span class="badge ${map[rol]||'badge-neutral'}">${rol}</span>`;
}
function formatFecha(f) {
  if (!f) return "—";
  return new Date(f).toLocaleDateString("es-EC",{day:"2-digit",month:"short",year:"numeric"});
}

/* ── DASHBOARD ───────────────────────────────────────────── */
const Dashboard = {
  async init() {
    if (!initPage("Dashboard")) return;
    try {
      const [usuarios, cursos, facultades] = await Promise.all([
        API.usuarios(), API.cursos(), API.facultades()
      ]);
      document.getElementById("kpi-usuarios").textContent   = usuarios.length;
      document.getElementById("kpi-cursos").textContent     = cursos.filter(c=>c.estado==="activo").length;
      document.getElementById("kpi-facultades").textContent = facultades.length;
      document.getElementById("kpi-tasa").textContent       = "72%";
      const tbody = document.getElementById("tabla-facultades");
      if (!tbody) return;
      tbody.innerHTML = facultades.map(f => `
        <tr>
          <td><span class="badge badge-primary">${f.codigo}</span></td>
          <td>${f.nombre}</td>
          <td>${f.admin_nombre || '<span class="text-muted">Sin asignar</span>'}</td>
          <td>${cursos.filter(c=>c.facultad===f.id).length}</td>
        </tr>`).join("");
    } catch(e) { Notif.show(e.message,"danger"); }
  }
};

/* ── USUARIOS ────────────────────────────────────────────── */
const Usuarios = {
  filtro: "",
  _data: [],

  async init() {
    if (!initPage("Gestion de Usuarios")) return;
    const buscador = document.getElementById("buscador");
    if (buscador) buscador.addEventListener("input", e => { this.filtro = e.target.value.toLowerCase(); this.renderTabla(); });
    try {
      this._data = await API.usuarios();
      this.renderTabla();
    } catch(e) { Notif.show(e.message,"danger"); }
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
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="bi-people"></i><p>No se encontraron usuarios.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map(u => `
      <tr>
        <td class="text-muted text-sm">${u.id}</td>
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
        <td class="text-sm">${u.telefono||"—"}</td>
        <td class="text-sm">${u.celular}</td>
        <td class="text-sm">${u.estado_civil}</td>
        <td>${badgeRol(u.rol)}</td>
        <td>${badgeEstado(u.estado)}</td>
        <td>
          <div class="table-actions">
            <a href="usuario-detalle.html?id=${u.id}" class="btn btn-ghost btn-sm" title="Ver"><i class="bi-eye"></i></a>
            <button class="btn btn-ghost btn-sm" onclick="ModalUsuario.abrir(${u.id})" title="Editar"><i class="bi-pencil"></i></button>
            <button class="btn btn-ghost btn-sm" onclick="Usuarios.toggleEstado(${u.id})" title="Cambiar estado"><i class="bi-toggle-on"></i></button>
          </div>
        </td>
      </tr>`).join("");
  },

  async toggleEstado(id) {
    try {
      await API.toggleEstado(id);
      const u = this._data.find(x=>x.id===id);
      if (u) u.estado = u.estado==="activo"?"inactivo":"activo";
      this.renderTabla();
      Notif.show("Estado actualizado.","success");
    } catch(e) { Notif.show(e.message,"danger"); }
  }
};

/* ── MODAL USUARIO ──────────────────────────────────────── */
const ModalUsuario = {
  usuarioId: null,

  abrir(id = null) {
    this.usuarioId = id;
    const modal  = document.getElementById("modal-usuario");
    const titulo = document.getElementById("modal-titulo");
    if (!modal) return;
    if (id) {
      const u = Usuarios._data.find(x=>x.id===id);
      if (!u) return;
      titulo.textContent = "Editar Usuario";
      document.getElementById("f-nombres").value         = u.nombres;
      document.getElementById("f-apellidos").value       = u.apellidos;
      document.getElementById("f-identificacion").value  = u.identificacion;
      document.getElementById("f-telefono").value        = u.telefono||"";
      document.getElementById("f-celular").value         = u.celular;
      document.getElementById("f-correo").value          = u.correo;
      document.getElementById("f-direccion").value       = u.direccion||"";
      document.getElementById("f-estado-civil").value    = u.estado_civil;
      document.getElementById("f-estado").value          = u.estado;
      document.getElementById("f-rol").value             = u.rol;
    } else {
      titulo.textContent = "Registrar Usuario";
      document.getElementById("form-usuario").reset();
    }
    modal.classList.add("open");
  },

  cerrar() {
    const modal = document.getElementById("modal-usuario");
    if (modal) modal.classList.remove("open");
    this.limpiarErrores();
  },

  async guardar() {
    const campos = {
      nombres:       document.getElementById("f-nombres").value.trim(),
      apellidos:     document.getElementById("f-apellidos").value.trim(),
      identificacion:document.getElementById("f-identificacion").value.trim(),
      telefono:      document.getElementById("f-telefono").value.trim()||null,
      celular:       document.getElementById("f-celular").value.trim(),
      correo:        document.getElementById("f-correo").value.trim(),
      direccion:     document.getElementById("f-direccion").value.trim()||null,
      estado_civil:  document.getElementById("f-estado-civil").value,
      estado:        document.getElementById("f-estado").value,
      rol:           document.getElementById("f-rol").value,
    };
    this.limpiarErrores();
    let valido = true;
    if (!campos.nombres)        { this.error("f-nombres","Obligatorio.");        valido=false; }
    if (!campos.apellidos)      { this.error("f-apellidos","Obligatorio.");      valido=false; }
    if (!campos.identificacion) { this.error("f-identificacion","Obligatorio."); valido=false; }
    if (!campos.celular)        { this.error("f-celular","Obligatorio.");        valido=false; }
    if (!campos.correo||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.correo)) {
      this.error("f-correo","Correo invalido."); valido=false;
    }
    if (!valido) return;
    try {
      if (this.usuarioId) {
        const updated = await API.actualizarUsuario(this.usuarioId, campos);
        const idx = Usuarios._data.findIndex(x=>x.id===this.usuarioId);
        if (idx!==-1) Usuarios._data[idx] = {...Usuarios._data[idx], ...updated};
        Notif.show("Usuario actualizado.","success");
      } else {
        const nuevo = await API.crearUsuario({...campos, password:"espol2026"});
        Usuarios._data.push(nuevo);
        Notif.show("Usuario registrado.","success");
      }
      this.cerrar();
      Usuarios.renderTabla();
    } catch(e) { Notif.show(e.message,"danger"); }
  },

  error(id, msg) {
    const el = document.getElementById(`err-${id.replace("f-","")}`);
    if (el) el.textContent = msg;
    const input = document.getElementById(id);
    if (input) input.classList.add("is-invalid");
  },

  limpiarErrores() {
    document.querySelectorAll(".form-error").forEach(el=>el.textContent="");
    document.querySelectorAll(".form-control").forEach(el=>el.classList.remove("is-invalid"));
  }
};

/* ── DETALLE DE USUARIO ──────────────────────────────────── */
const DetalleUsuario = {
  async init() {
    if (!initPage("Detalle de Usuario")) return;
    const id = parseInt(new URLSearchParams(window.location.search).get("id"));
    try {
      const u = await API.usuarioDetalle(id);
      const campos = [
        ["Nombres",        u.nombres],
        ["Apellidos",      u.apellidos],
        ["Identificacion", u.identificacion],
        ["Telefono",       u.telefono||"—"],
        ["Celular",        u.celular],
        ["Correo",         u.correo],
        ["Direccion",      u.direccion||"—"],
        ["Estado Civil",   u.estado_civil],
        ["Rol sistema",    badgeRol(u.rol)],
        ["Estado",         badgeEstado(u.estado)],
        ["Fecha registro", formatFecha(u.fecha_registro)]
      ];
      document.getElementById("usuario-iniciales").textContent = u.iniciales;
      document.getElementById("usuario-nombre").textContent    = u.nombre_completo;
      document.getElementById("usuario-correo").textContent    = u.correo;
      document.getElementById("usuario-estado").innerHTML      = badgeEstado(u.estado);
      const grid = document.getElementById("campos-usuario");
      if (grid) {
        grid.innerHTML = campos.map(([label,valor]) => `
          <div>
            <div class="text-xs text-muted fw-medium" style="text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">${label}</div>
            <div class="text-sm fw-semibold">${valor}</div>
          </div>`).join("");
      }
      const btnEstado = document.getElementById("btn-toggle-estado");
      if (btnEstado) {
        btnEstado.textContent = u.estado==="activo"?"Desactivar":"Activar";
        btnEstado.onclick = async () => {
          try { await API.toggleEstado(id); window.location.reload(); }
          catch(e) { Notif.show(e.message,"danger"); }
        };
      }
    } catch(e) {
      const c = document.getElementById("contenido");
      if (c) c.innerHTML=`<div class="alert alert-danger"><i class="bi-exclamation-circle"></i> ${e.message}</div>`;
    }
  }
};

/* ── FACULTADES ──────────────────────────────────────────── */
const Facultades = {
  _data: [],
  _admins: [],

  async init() {
    if (!initPage("Gestion de Facultades")) return;
    try {
      [this._data, this._admins] = await Promise.all([API.facultades(), API.usuarios()]);
      this.renderTabla();
    } catch(e) { Notif.show(e.message,"danger"); }
  },

  renderTabla() {
    const tbody = document.getElementById("tabla-facultades");
    if (!tbody) return;
    if (!this._data.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="bi-building"></i><p>No hay facultades registradas.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = this._data.map(f => `
      <tr>
        <td><span class="badge badge-primary">${f.codigo}</span></td>
        <td class="fw-semibold text-sm">${f.nombre}</td>
        <td class="text-sm">${f.admin_nombre||'<span class="text-muted">Sin asignar</span>'}</td>
        <td class="text-sm">—</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-sm" onclick="ModalFacultad.abrir(${f.id})"><i class="bi-pencil"></i></button>
          </div>
        </td>
      </tr>`).join("");
  }
};

const ModalFacultad = {
  facultadId: null,

  abrir(id = null) {
    this.facultadId = id;
    const modal = document.getElementById("modal-facultad");
    if (!modal) return;
    const sel = document.getElementById("ff-admin");
    const admins = Facultades._admins.filter(u=>u.rol==="ADMIN"||u.rol==="SUPERADMIN");
    sel.innerHTML = `<option value="">Sin asignar</option>` +
      admins.map(a=>`<option value="${a.id}">${a.nombres} ${a.apellidos}</option>`).join("");
    if (id) {
      const f = Facultades._data.find(x=>x.id===id);
      if (!f) return;
      document.getElementById("ff-nombre").value = f.nombre;
      document.getElementById("ff-codigo").value = f.codigo;
      sel.value = f.admin||"";
    } else {
      document.getElementById("form-facultad").reset();
    }
    modal.classList.add("open");
  },

  cerrar() {
    const modal = document.getElementById("modal-facultad");
    if (modal) modal.classList.remove("open");
  },

  async guardar() {
    const nombre  = document.getElementById("ff-nombre").value.trim();
    const codigo  = document.getElementById("ff-codigo").value.trim().toUpperCase();
    const adminId = parseInt(document.getElementById("ff-admin").value)||null;
    if (!nombre||!codigo) { Notif.show("Nombre y codigo son obligatorios.","danger"); return; }
    const payload = { nombre, codigo, admin: adminId };
    try {
      if (this.facultadId) {
        const updated = await API.actualizarFacultad(this.facultadId, payload);
        const idx = Facultades._data.findIndex(x=>x.id===this.facultadId);
        if (idx!==-1) Facultades._data[idx] = {...Facultades._data[idx], ...updated};
        Notif.show("Facultad actualizada.","success");
      } else {
        const nueva = await API.crearFacultad(payload);
        Facultades._data.push(nueva);
        Notif.show("Facultad creada.","success");
      }
      this.cerrar();
      Facultades.renderTabla();
    } catch(e) { Notif.show(e.message,"danger"); }
  }
};

/* ── CONFIGURACION ───────────────────────────────────────── */
const Configuracion = {
  init() {
    if (!initPage("Configuracion Global")) return;
    const input = document.getElementById("porcentaje-aprobacion");
    if (input) input.value = parseInt(localStorage.getItem("porcentaje_minimo")||"60");
  },

  guardar() {
    const val = parseInt(document.getElementById("porcentaje-aprobacion").value);
    if (isNaN(val)||val<1||val>100) { Notif.show("El porcentaje debe estar entre 1 y 100.","danger"); return; }
    localStorage.setItem("porcentaje_minimo", val);
    Notif.show(`Porcentaje minimo actualizado a <strong>${val}%</strong>.`,"success");
  }
};

/* ── REPORTES ────────────────────────────────────────────── */
const Reportes = {
  async init() {
    if (!initPage("Reportes")) return;
    try {
      const [facultades, cursos] = await Promise.all([API.facultades(), API.cursos()]);
      const tbody = document.getElementById("tabla-reportes");
      if (!tbody) return;
      tbody.innerHTML = facultades.map(f => {
        const cursosFac   = cursos.filter(c=>c.facultad===f.id);
        const estudiantes = cursosFac.reduce((acc,c)=>acc+(c.total_estudiantes||0),0);
        const tasa        = Math.floor(Math.random()*30)+60;
        const badgeTasa   = tasa>=70
          ? `<span class="badge badge-success">${tasa}%</span>`
          : tasa>=60 ? `<span class="badge badge-warning">${tasa}%</span>`
          : `<span class="badge badge-danger">${tasa}%</span>`;
        return `
          <tr>
            <td><span class="badge badge-primary">${f.codigo}</span></td>
            <td class="text-sm">${f.nombre}</td>
            <td class="text-sm">${cursosFac.length}</td>
            <td class="text-sm">${estudiantes}</td>
            <td>${badgeTasa} <span class="text-xs text-muted">aprobacion</span></td>
          </tr>`;
      }).join("");
    } catch(e) { Notif.show(e.message,"danger"); }
  }
};

/* ── NOTIFICACIONES ──────────────────────────────────────── */
const Notif = {
  show(mensaje, tipo="success") {
    let n = document.getElementById("notif-toast");
    if (!n) {
      n = document.createElement("div"); n.id="notif-toast";
      n.style.cssText=`position:fixed;bottom:24px;right:24px;z-index:9999;max-width:340px;
        padding:14px 18px;border-radius:10px;font-size:.875rem;font-family:inherit;
        display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,.15);
        animation:fadeIn .2s ease;transition:opacity .3s ease;`;
      document.body.appendChild(n);
    }
    const colores = {
      success:{ bg:"#ECFDF5",color:"#065F46",border:"#059669" },
      danger: { bg:"#FEF2F2",color:"#991B1B",border:"#DC2626" },
      warning:{ bg:"#FFFBEB",color:"#92400E",border:"#D97706" }
    };
    const c = colores[tipo]||colores.success;
    n.style.background=c.bg; n.style.color=c.color; n.style.borderLeft=`4px solid ${c.border}`;
    n.innerHTML=`<i class="bi-${tipo==="success"?"check-circle":"exclamation-circle"}"></i><span>${mensaje}</span>`;
    n.style.opacity="1";
    clearTimeout(this._t);
    this._t=setTimeout(()=>{n.style.opacity="0";},3000);
  }
};
