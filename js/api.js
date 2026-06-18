/* Cliente HTTP centralizado para la API Django REST */
const API_BASE = '/api';

const API = {
  async _req(method, endpoint, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',   // envía la cookie de sesión Django
    };

    // CSRF: Django requiere el token en métodos no seguros
    if (!['GET', 'HEAD'].includes(method)) {
      const csrfToken = this._csrfToken();
      if (csrfToken) opts.headers['X-CSRFToken'] = csrfToken;
    }

    if (body !== null) opts.body = JSON.stringify(body);

    const res = await fetch(API_BASE + endpoint, opts);

    if (res.status === 204) return null;

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.error || data.detail ||
        Object.values(data).flat().join(' ') || `Error ${res.status}`;
      throw new Error(msg);
    }
    return data;
  },

  _csrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : null;
  },

  get:    (ep)         => API._req('GET',    ep),
  post:   (ep, body)   => API._req('POST',   ep, body),
  put:    (ep, body)   => API._req('PUT',    ep, body),
  patch:  (ep, body)   => API._req('PATCH',  ep, body),
  delete: (ep)         => API._req('DELETE', ep),

  /* ── AUTH ─────────────────────────────────────────────── */
  login:   (correo, password) => API.post('/auth/login/',  { correo, password }),
  logout:  ()                 => API.post('/auth/logout/', {}),
  me:      ()                 => API.get('/auth/me/'),

  /* ── USUARIOS ─────────────────────────────────────────── */
  usuarios:         ()         => API.get('/usuarios/'),
  usuarioDetalle:   (id)       => API.get(`/usuarios/${id}/`),
  crearUsuario:     (data)     => API.post('/usuarios/', data),
  actualizarUsuario:(id, data) => API.patch(`/usuarios/${id}/`, data),
  toggleEstado:     (id)       => API.patch(`/usuarios/${id}/toggle/`, {}),

  /* ── FACULTADES ───────────────────────────────────────── */
  facultades:       ()         => API.get('/facultades/'),
  crearFacultad:    (data)     => API.post('/facultades/', data),
  actualizarFacultad:(id,data) => API.patch(`/facultades/${id}/`, data),

  /* ── CURSOS ───────────────────────────────────────────── */
  cursos:           ()         => API.get('/cursos/'),
  cursoDetalle:     (id)       => API.get(`/cursos/${id}/`),
  crearCurso:       (data)     => API.post('/cursos/crear/', data),
  actualizarCurso:  (id, data) => API.patch(`/cursos/${id}/`, data),
  inscripciones:    (cursoId)  => API.get(`/cursos/${cursoId}/inscripciones/`),
  inscribir:        (cursoId, usuarioId, rol='ESTUDIANTE') =>
    API.post(`/cursos/${cursoId}/inscripciones/`, { usuario_id: usuarioId, rol_en_curso: rol }),
  desinscribir:     (cursoId, usuarioId) =>
    API.delete(`/cursos/${cursoId}/inscripciones/${usuarioId}/`),

  /* ── MODULOS ──────────────────────────────────────────── */
  modulos:          (cursoId)  => API.get(`/cursos/${cursoId}/modulos/`),
  crearModulo:      (cursoId, data) => API.post(`/cursos/${cursoId}/modulos/`, data),
  actualizarModulo: (id, data) => API.patch(`/modulos/${id}/`, data),
  eliminarModulo:   (id)       => API.delete(`/modulos/${id}/`),

  /* ── MATERIALES ───────────────────────────────────────── */
  materiales:       (moduloId) => API.get(`/modulos/${moduloId}/materiales/`),
  crearMaterial:    (moduloId, data) => API.post(`/modulos/${moduloId}/materiales/`, data),
  eliminarMaterial: (id)       => API.delete(`/materiales/${id}/`),

  /* ── PROGRESO ─────────────────────────────────────────── */
  marcarCompletado: (moduloId) => API.post(`/modulos/${moduloId}/completar/`, {}),
  progresoCurso:    (cursoId)  => API.get(`/cursos/${cursoId}/progreso/`),

  /* ── TAREAS ───────────────────────────────────────────── */
  tareas:           (cursoId)  => API.get(`/cursos/${cursoId}/tareas/`),
  tareaDetalle:     (id)       => API.get(`/tareas/${id}/`),
  crearTarea:       (cursoId, data) => API.post(`/cursos/${cursoId}/tareas/`, data),
  actualizarTarea:  (id, data) => API.patch(`/tareas/${id}/`, data),
  entregas:         (tareaId)  => API.get(`/tareas/${tareaId}/entregas/`),
  miEntrega:        (tareaId)  => API.get(`/tareas/${tareaId}/mi-entrega/`),
  entregar:         (tareaId, data) => API.post(`/tareas/${tareaId}/mi-entrega/`, data),
  calificar:        (entregaId, data) => API.patch(`/entregas/${entregaId}/calificar/`, data),

  /* ── QUIZZES ──────────────────────────────────────────── */
  quizzes:          (cursoId)  => API.get(`/cursos/${cursoId}/quizzes/`),
  quizDetalle:      (id)       => API.get(`/quizzes/${id}/`),
  crearQuiz:        (cursoId, data) => API.post(`/cursos/${cursoId}/quizzes/`, data),
  actualizarQuiz:   (id, data) => API.patch(`/quizzes/${id}/`, data),
  respuestasQuiz:   (quizId)   => API.get(`/quizzes/${quizId}/respuestas/`),
  enviarQuiz:       (quizId, respuestas) => API.post(`/quizzes/${quizId}/respuestas/`, { respuestas }),
  notaManual:       (respId, data) => API.patch(`/respuestas/${respId}/nota-manual/`, data),
};
