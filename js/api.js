import { API_BASE_URL } from './config.js';

let authToken = localStorage.getItem('adminToken');
let userRol   = localStorage.getItem('userRol');

export function setAuthToken(token, rol) {
  authToken = token;
  userRol = rol;
  if (token) {
    localStorage.setItem('adminToken', token);
    if (rol) localStorage.setItem('userRol', rol);
  } else {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userRol');
  }
}

export function getUserRol() {
  return userRol || localStorage.getItem('userRol');
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function loginAdmin(pin) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
  console.log('Respuesta login:', data); // Debug
  if (data.rol) {
    setAuthToken(data.token, data.rol);
  } else {
    // Fallback: si el backend no envía rol, asumimos admin (compatibilidad)
    setAuthToken(data.token, 'admin');
  }
  return data;
}

export async function logoutAdmin() {
  setAuthToken(null, null);
}

export async function getProyectos() {
  return request('/proyectos');
}

export async function crearProyecto(proyecto) {
  return request('/proyectos', {
    method: 'POST',
    body: JSON.stringify(proyecto),
  });
}

export async function editarProyecto(id, datos) {
  return request(`/proyectos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
}

export async function eliminarProyecto(id) {
  return request(`/proyectos/${id}`, { method: 'DELETE' });
}

export async function getRepresentantes(idProyecto) {
  return request(`/proyectos/${idProyecto}/representantes`);
}

export async function votar(id_proyecto, pin, device_id) {
  return request('/votos', {
    method: 'POST',
    body: JSON.stringify({ id_proyecto, pin, device_id }),
  });
}

export async function checkHaVotado(id_proyecto, device_id) {
  return request(`/votos/check?id_proyecto=${id_proyecto}&device_id=${device_id}`);
}

export async function getResultados(admin = false) {
  const endpoint = admin ? '/resultados/admin' : '/resultados';
  return request(endpoint);
}

export async function toggleResultadosPublicos() {
  return request('/resultados/toggle', { method: 'POST' });
}
