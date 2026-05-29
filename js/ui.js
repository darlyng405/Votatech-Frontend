function generarHuellaDispositivo() {
  const nav    = window.navigator;
  const screen = window.screen;
  const partes = [
    nav.userAgent, nav.language,
    screen.colorDepth, screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || '',
    nav.platform || '',
  ];
  let hash = 5381;
  const str = partes.join('|');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash & hash;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

export function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = generarHuellaDispositivo() + '_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('device_id', id);
  }
  return id;
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2700);
}

export function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('open');
}

export function updateAdminUI(rol) {
  const isAdmin = (rol === 'admin');
  const isEditor = (rol === 'editor');
  const isLogged = isAdmin || isEditor;

  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
  document.querySelectorAll('.editor-only').forEach(el => {
    el.style.display = isLogged ? '' : 'none';
  });

  document.getElementById('btn-login').style.display = isLogged ? 'none' : '';
  document.getElementById('btn-logout').style.display = isLogged ? '' : 'none';

  const bnavAdmin = document.getElementById('bnav-admin');
  if (bnavAdmin) {
    if (isAdmin) bnavAdmin.innerHTML = '<span class="bnav-icon">🚪</span>Salir';
    else if (isEditor) bnavAdmin.innerHTML = '<span class="bnav-icon">✏️</span>Editor';
    else bnavAdmin.innerHTML = '<span class="bnav-icon">🔐</span>Admin';
  }

  if (typeof window.setUserRol === 'function') window.setUserRol(rol);
}
