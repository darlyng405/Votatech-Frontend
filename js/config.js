const API_BASE_URL = (() => {
  // Cambia esto por la URL de tu backend en producción
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  return 'https://tu-backend-en-render.com/api';
})();

export { API_BASE_URL };