const API_BASE_URL = (() => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  return 'https://votatech-backend.onrender.com/api';
})();

export { API_BASE_URL };
