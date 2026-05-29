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
  setAuthToken(data.token, data.rol);
  return data;
}

export async function logoutAdmin() {
  setAuthToken(null, null);
}

// Resto de funciones (getProyectos, crearProyecto, etc.) se mantienen igual
export async function getProyectos() { ... }
export async function crearProyecto(proyecto) { ... }
export async function editarProyecto(id, datos) { ... }
export async function eliminarProyecto(id) { ... }
export async function getRepresentantes(idProyecto) { ... }
export async function votar(id_proyecto, pin, device_id) { ... }
export async function checkHaVotado(id_proyecto, device_id) { ... }
export async function getResultados(admin = false) { ... }
export async function toggleResultadosPublicos() { ... }
