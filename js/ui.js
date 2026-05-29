// ... (funciones getDeviceId, showToast, closeModal permanecen igual)

export function updateAdminUI(rol) {
  const isAdmin = (rol === 'admin');
  const isEditor = (rol === 'editor');
  const isLogged = isAdmin || isEditor;

  // Elementos que solo ve el admin completo
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
  // Elementos que ven tanto admin como editor (ej: botón nuevo proyecto)
  document.querySelectorAll('.editor-only').forEach(el => {
    el.style.display = isLogged ? '' : 'none';
  });

  // Botones de login/logout
  document.getElementById('btn-login').style.display = isLogged ? 'none' : '';
  document.getElementById('btn-logout').style.display = isLogged ? '' : 'none';

  // Bottom nav admin button
  const bnavAdmin = document.getElementById('bnav-admin');
  if (bnavAdmin) {
    if (isAdmin) bnavAdmin.innerHTML = '<span class="bnav-icon">🚪</span>Salir';
    else if (isEditor) bnavAdmin.innerHTML = '<span class="bnav-icon">✏️</span>Editor';
    else bnavAdmin.innerHTML = '<span class="bnav-icon">🔐</span>Admin';
  }

  // Propagar a app.js (función global)
  if (typeof window.setUserRol === 'function') window.setUserRol(rol);
}
