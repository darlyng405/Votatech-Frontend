import { loginAdmin, logoutAdmin, setAuthToken } from './api.js';
import { showToast, updateAdminUI, closeModal } from './ui.js';

export function initAuth() {
  const token = localStorage.getItem('adminToken');
  if (token) {
    setAuthToken(token);
    updateAdminUI(true);
  }
  document.getElementById('btn-login').addEventListener('click', () => openLoginModal());
  document.getElementById('btn-logout').addEventListener('click', () => {
    logoutAdmin();
    updateAdminUI(false);
    showToast('Sesión cerrada', 'success');
    location.reload(); // recarga para limpiar estados
  });
}

function openLoginModal() {
  const modal = document.getElementById('modal-login');
  modal.classList.add('open');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').style.display = 'none';
  const closeBtn = document.getElementById('modal-login-close');
  const submitBtn = document.getElementById('login-submit');
  const handler = async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) {
      document.getElementById('login-error').textContent = 'Ingresa email y contraseña';
      document.getElementById('login-error').style.display = 'block';
      return;
    }
    try {
      await loginAdmin(email, password);
      closeModal('modal-login');
      showToast('Bienvenido, administrador', 'success');
      updateAdminUI(true);
      // Recargar datos para mostrar botones admin
      if (window.cargarProyectos) window.cargarProyectos();
      if (window.cargarResultados) window.cargarResultados();
    } catch (err) {
      document.getElementById('login-error').textContent = err.message;
      document.getElementById('login-error').style.display = 'block';
    }
  };
  submitBtn.onclick = handler;
  closeBtn.onclick = () => closeModal('modal-login');
  document.getElementById('login-password').onkeypress = (e) => { if (e.key === 'Enter') handler(); };
}