import { loginAdmin, logoutAdmin, setAuthToken } from './api.js';
import { showToast, updateAdminUI, closeModal } from './ui.js';

export function initAuth() {
  const token = localStorage.getItem('adminToken');
  if (token) { setAuthToken(token); updateAdminUI(true); }

  document.getElementById('btn-login').addEventListener('click', openLoginModal);
  document.getElementById('btn-logout').addEventListener('click', () => {
    logoutAdmin();
    updateAdminUI(false);
    showToast('Sesión cerrada', 'success');
    location.reload();
  });
}

function openLoginModal() {
  const modal = document.getElementById('modal-login');
  modal.classList.add('open');

  // Reemplazar el contenido del modal-body con solo el PIN
  document.querySelector('#modal-login .modal-body').innerHTML = `
    <div class="form-group">
      <label>PIN de administrador</label>
      <input type="tel" id="login-pin" maxlength="8" inputmode="numeric"
             class="pin-input" placeholder="• • • • • • • •" autocomplete="off">
    </div>
    <button id="login-submit" class="btn-primary">Ingresar</button>
    <div id="login-error" class="error-msg"></div>
  `;

  setTimeout(() => document.getElementById('login-pin')?.focus(), 100);

  const handler = async () => {
    const pin    = document.getElementById('login-pin').value.trim();
    const errEl  = document.getElementById('login-error');
    const btn    = document.getElementById('login-submit');
    errEl.style.display = 'none';

    if (!pin || pin.length !== 8) {
      errEl.textContent = 'El PIN debe ser de 8 dígitos.';
      errEl.style.display = 'block';
      return;
    }
    btn.disabled = true; btn.textContent = 'Verificando…';
    try {
      await loginAdmin(pin);
      closeModal('modal-login');
      showToast('Bienvenido, administrador ✓', 'success');
      updateAdminUI(true);
      if (window.cargarProyectos)  window.cargarProyectos();
      if (window.cargarResultados) window.cargarResultados();
    } catch (err) {
      errEl.textContent = 'PIN incorrecto.';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Ingresar';
    }
  };

  document.getElementById('login-submit').onclick = handler;
  document.getElementById('modal-login-close').onclick = () => closeModal('modal-login');
  document.getElementById('login-pin').onkeydown = e => { if (e.key === 'Enter') handler(); };
}
