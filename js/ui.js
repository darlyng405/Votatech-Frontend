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

export function getDeviceId() {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2) + Date.now();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}