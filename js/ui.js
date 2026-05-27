export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}

export function updateAdminUI(isAdmin) {
  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach(el => {
    el.style.display = isAdmin ? 'inline-block' : 'none';
  });
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  if (isAdmin) {
    btnLogin.style.display = 'none';
    btnLogout.style.display = 'block';
  } else {
    btnLogin.style.display = 'block';
    btnLogout.style.display = 'none';
  }
}

// Fix bug #2: device_id más robusto con huella de dispositivo
// Combina datos del navegador para dificultar su borrado/suplantación
function generarHuellaDispositivo() {
  const nav = window.navigator;
  const screen = window.screen;
  const partes = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || '',
    nav.platform || '',
  ];
  // Hash simple (djb2) sobre la cadena combinada
  let hash = 5381;
  const str = partes.join('|');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash & hash; // Convertir a 32 bits
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

export function getDeviceId() {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    // Combina huella de dispositivo + valor aleatorio persistido
    const fingerprint = generarHuellaDispositivo();
    const aleatorio = Math.random().toString(36).substring(2) + Date.now().toString(36);
    deviceId = fingerprint + '_' + aleatorio;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}
