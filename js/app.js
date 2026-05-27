import { getProyectos, crearProyecto, editarProyecto, eliminarProyecto, getRepresentantes, votar, checkHaVotado, getResultados, toggleResultadosPublicos } from './api.js';
import { showToast, closeModal, updateAdminUI, getDeviceId } from './ui.js';
import { initAuth } from './auth.js';

let proyectos = [];
let deviceId = getDeviceId();
let isAdmin = false;

// ------------------- Helper -------------------
function setLoading(containerId) {
  document.getElementById(containerId).innerHTML = '<div class="loader">Cargando...</div>';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// ------------------- Proyectos -------------------
export async function cargarProyectos() {
  setLoading('proyectos-container');
  const container = document.getElementById('proyectos-container');
  try {
    proyectos = await getProyectos();
    if (!proyectos.length) {
      container.innerHTML = '<div class="empty-state">No hay proyectos registrados</div>';
      return;
    }
    const votados = await Promise.all(proyectos.map(p => checkHaVotado(p.id, deviceId)));
    container.innerHTML = proyectos.map((p, idx) => `
      <div class="proyecto-card" data-id="${p.id}">
        <div class="curso-badge">#${p.id}</div>
        <div class="curso-name">${escapeHtml(p.nombre)}</div>
        <div class="proyecto-desc">${escapeHtml(p.descripcion || '')}</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-sm" onclick="window.verRepresentantes(${p.id})">👥 Representantes</button>
          <button class="btn-sm success ${votados[idx]?.votado ? 'votado' : ''}"
                  onclick="window.abrirVotacion(${p.id})"
                  ${votados[idx]?.votado ? 'disabled' : ''}>
            ${votados[idx]?.votado ? '✓ Votado' : '🗳 Votar'}
          </button>
          ${isAdmin ? `
            <button class="btn-sm" style="background:#f39c12;color:white;" onclick="window.abrirEdicion(${p.id})">✏️ Editar</button>
            <button class="btn-sm" style="background:#e74c3c;color:white;" onclick="window.eliminarProyecto(${p.id})">🗑 Eliminar</button>
          ` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Error al cargar proyectos</div>';
    showToast(err.message, 'error');
  }
}

window.verRepresentantes = async (idProyecto) => {
  try {
    const reps = await getRepresentantes(idProyecto);
    const proyecto = proyectos.find(p => p.id == idProyecto);
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 500px;">
        <div class="modal-header">
          <div class="modal-title">Representantes — ${escapeHtml(proyecto?.nombre || '')}</div>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="reps-grid">
            ${reps.map(r => `
              <div class="rep-card">
                <div class="rep-avatar-placeholder">${escapeHtml(r.nombre[0])}</div>
                <div class="rep-name">${escapeHtml(r.nombre)}</div>
                <div class="rep-curso">${escapeHtml(r.curso || '—')}</div>
                <div class="rep-contact">📱 ${escapeHtml(r.contacto || '—')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (err) {
    showToast('Error al cargar representantes', 'error');
  }
};

window.abrirVotacion = (idProyecto) => {
  const proyecto = proyectos.find(p => p.id == idProyecto);
  if (!proyecto) return;
  const modal = document.getElementById('modal-voto');
  document.getElementById('modal-voto-title').innerHTML = `Votar: ${escapeHtml(proyecto.nombre)}`;
  document.getElementById('modal-voto-body').innerHTML = `
    <div class="form-group">
      <label>PIN del proyecto (4 dígitos)</label>
      <input type="tel" id="voto-pin" maxlength="4" inputmode="numeric" placeholder="Ej: 1234" autocomplete="off">
    </div>
    <button id="confirmar-voto" class="btn-primary">Verificar y votar</button>
    <div id="voto-error" class="error-msg" style="display:none;"></div>
  `;
  modal.classList.add('open');
  document.getElementById('voto-pin').focus();
  const confirmBtn = document.getElementById('confirmar-voto');
  const errorDiv = document.getElementById('voto-error');
  const handler = async () => {
    const pin = document.getElementById('voto-pin').value.trim();
    if (!pin || pin.length !== 4) {
      errorDiv.textContent = 'Ingresa el PIN de 4 dígitos';
      errorDiv.style.display = 'block';
      return;
    }
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Verificando...';
    try {
      await votar(proyecto.id, pin, deviceId);
      showToast('¡Voto registrado exitosamente!', 'success');
      closeModal('modal-voto');
      cargarProyectos();
      cargarResultados();
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Verificar y votar';
    }
  };
  confirmBtn.onclick = handler;
  document.getElementById('voto-pin').onkeypress = (e) => { if (e.key === 'Enter') handler(); };
  document.getElementById('modal-voto-close').onclick = () => closeModal('modal-voto');
};

window.eliminarProyecto = async (id) => {
  if (!confirm('¿Eliminar este proyecto? Se perderán sus votos.')) return;
  try {
    await eliminarProyecto(id);
    showToast('Proyecto eliminado', 'success');
    cargarProyectos();
    cargarResultados();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Fix bug #6: abrir modal de edición con datos precargados
window.abrirEdicion = (idProyecto) => {
  const proyecto = proyectos.find(p => p.id == idProyecto);
  if (!proyecto) return;
  document.getElementById('proyecto-modal-title').innerText = 'Editar Proyecto';
  document.getElementById('proy-nombre').value = proyecto.nombre;
  document.getElementById('proy-desc').value = proyecto.descripcion || '';
  document.getElementById('proy-pin').value = '';
  document.getElementById('proy-pin').placeholder = 'Dejar vacío para no cambiar';
  document.getElementById('reps-container').innerHTML = '';
  document.getElementById('proyecto-error').style.display = 'none';

  // Guardar referencia al proyecto que se edita
  document.getElementById('modal-proyecto').dataset.editId = idProyecto;
  document.getElementById('modal-proyecto').classList.add('open');
};

// ------------------- Resultados -------------------
export async function cargarResultados() {
  setLoading('resultados-container');
  const container = document.getElementById('resultados-container');
  try {
    const data = await getResultados(isAdmin);
    if (!data.publicos && !isAdmin) {
      container.innerHTML = '<div class="empty-state">🔒 Los resultados aún no han sido publicados.</div>';
      return;
    }
    const ranking = data.ranking || [];
    if (!ranking.length) {
      container.innerHTML = '<div class="empty-state">Aún no hay votos registrados.</div>';
      return;
    }
    const maxVotos = Math.max(...ranking.map(r => r.votos), 1);
    container.innerHTML = ranking.map((r, i) => {
      const posClass = i === 0 ? 'oro' : i === 1 ? 'plata' : i === 2 ? 'bronce' : '';
      return `
        <div class="resultado-card">
          <div class="resultado-pos ${posClass}">#${i + 1}</div>
          <div style="flex:1;">
            <div style="font-weight:700;">${escapeHtml(r.nombre)}</div>
            <div class="resultado-barra"><div class="resultado-barra-fill" style="width:${(r.votos / maxVotos) * 100}%;"></div></div>
          </div>
          <div style="font-size:22px;font-weight:700;">${r.votos} 🗳</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Error al cargar resultados</div>';
    showToast(err.message, 'error');
  }
}

// ------------------- Admin: Formulario Crear/Editar -------------------
function initAdminForms() {
  const btnNuevo = document.getElementById('btn-nuevo-proyecto');
  const modalProy = document.getElementById('modal-proyecto');
  const closeProy = document.getElementById('modal-proyecto-close');
  const cancelProy = document.getElementById('cancelar-proyecto');
  const agregarRep = document.getElementById('agregar-rep');
  const guardarProy = document.getElementById('guardar-proyecto');

  btnNuevo.onclick = () => {
    document.getElementById('proyecto-modal-title').innerText = 'Registrar Proyecto';
    document.getElementById('proy-nombre').value = '';
    document.getElementById('proy-desc').value = '';
    document.getElementById('proy-pin').value = '';
    document.getElementById('proy-pin').placeholder = '1234';
    document.getElementById('reps-container').innerHTML = `
      <div class="rep-row">
        <input type="text" placeholder="Nombre completo" class="rep-nombre">
        <input type="text" placeholder="Curso/Grado" class="rep-curso">
        <input type="text" placeholder="Contacto" class="rep-contacto">
      </div>
    `;
    document.getElementById('proyecto-error').style.display = 'none';
    delete modalProy.dataset.editId; // asegurarse que no hay id de edición
    modalProy.classList.add('open');
  };

  closeProy.onclick = () => { modalProy.classList.remove('open'); delete modalProy.dataset.editId; };
  cancelProy.onclick = () => { modalProy.classList.remove('open'); delete modalProy.dataset.editId; };

  agregarRep.onclick = () => {
    const container = document.getElementById('reps-container');
    const row = document.createElement('div');
    row.className = 'rep-row';
    row.innerHTML = `
      <input type="text" placeholder="Nombre completo" class="rep-nombre">
      <input type="text" placeholder="Curso/Grado" class="rep-curso">
      <input type="text" placeholder="Contacto" class="rep-contacto">
      <button type="button" class="btn-sm" style="background:#e74c3c;color:white;" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
  };

  guardarProy.onclick = async () => {
    const nombre = document.getElementById('proy-nombre').value.trim();
    const descripcion = document.getElementById('proy-desc').value.trim();
    const pin = document.getElementById('proy-pin').value.trim();
    const editId = modalProy.dataset.editId;
    const errorEl = document.getElementById('proyecto-error');

    // Fix bug #6: modo edición vs creación
    if (editId) {
      // Edición — solo campos modificados
      if (!nombre) {
        errorEl.textContent = 'El nombre es obligatorio';
        errorEl.style.display = 'block';
        return;
      }
      if (pin && !/^\d{4}$/.test(pin)) {
        errorEl.textContent = 'El PIN debe ser 4 dígitos o dejarse vacío';
        errorEl.style.display = 'block';
        return;
      }
      const datos = { nombre, descripcion };
      if (pin) datos.pin = pin;
      try {
        await editarProyecto(editId, datos);
        showToast('Proyecto actualizado correctamente', 'success');
        modalProy.classList.remove('open');
        delete modalProy.dataset.editId;
        cargarProyectos();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    } else {
      // Creación — todos los campos requeridos
      const repRows = document.querySelectorAll('#reps-container .rep-row');
      const representantes = [];
      repRows.forEach(row => {
        const nombreRep = row.querySelector('.rep-nombre')?.value.trim();
        if (nombreRep) {
          representantes.push({
            nombre: nombreRep,
            curso: row.querySelector('.rep-curso')?.value.trim() || '',
            contacto: row.querySelector('.rep-contacto')?.value.trim() || ''
          });
        }
      });
      if (!nombre || !pin || representantes.length === 0) {
        errorEl.textContent = 'Completa nombre, PIN y al menos un representante';
        errorEl.style.display = 'block';
        return;
      }
      if (!/^\d{4}$/.test(pin)) {
        errorEl.textContent = 'El PIN debe ser 4 dígitos';
        errorEl.style.display = 'block';
        return;
      }
      try {
        await crearProyecto({ nombre, descripcion, pin, representantes });
        showToast('Proyecto creado correctamente', 'success');
        modalProy.classList.remove('open');
        cargarProyectos();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    }
  };
}

// ------------------- Admin: Publicar resultados -------------------
function initResultadosAdmin() {
  const btnToggle = document.getElementById('btn-toggle-resultados');
  btnToggle.onclick = async () => {
    try {
      const data = await toggleResultadosPublicos();
      btnToggle.textContent = data.publicos ? '🔒 OCULTAR RESULTADOS' : '📢 PUBLICAR RESULTADOS';
      showToast(`Resultados ${data.publicos ? 'publicados' : 'ocultados'}`, 'success');
      cargarResultados();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

// ------------------- Navegación -------------------
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const views = {
    proyectos: document.getElementById('view-proyectos'),
    resultados: document.getElementById('view-resultados')
  };
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      Object.values(views).forEach(v => v.classList.remove('active'));
      views[view].classList.add('active');
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      if (view === 'proyectos') cargarProyectos();
      if (view === 'resultados') cargarResultados();
      document.getElementById('sidebar').classList.remove('open');
    });
  });
}

function initMobileMenu() {
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')
        && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// ------------------- Main -------------------
(async function () {
  initAuth();
  initNavigation();
  initMobileMenu();
  initAdminForms();
  initResultadosAdmin();
  isAdmin = !!localStorage.getItem('adminToken');
  updateAdminUI(isAdmin);
  window.cargarProyectos = cargarProyectos;
  window.cargarResultados = cargarResultados;
  await cargarProyectos();
  await cargarResultados();
})();
