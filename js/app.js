import { getProyectos, crearProyecto, editarProyecto, eliminarProyecto,
         getRepresentantes, votar, checkHaVotado,
         getResultados, toggleResultadosPublicos, getUserRol } from './api.js';
import { showToast, closeModal, updateAdminUI, getDeviceId } from './ui.js';
import { initAuth } from './auth.js';

let proyectos = [];
let deviceId  = getDeviceId();
let userRol   = getUserRol();

window.setUserRol = (rol) => { userRol = rol; };

function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

function setLoading(id) {
  document.getElementById(id).innerHTML =
    '<div class="loader"><span></span><span></span><span></span></div>';
}

export async function cargarProyectos() {
  setLoading('proyectos-container');
  const container = document.getElementById('proyectos-container');
  try {
    proyectos = await getProyectos();
    if (!proyectos.length) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔭</span>
          <h3>Aún no hay proyectos</h3>
          <p>Los proyectos registrados aparecerán aquí.</p>
        </div>`;
      return;
    }

    const votados = await Promise.all(
      proyectos.map(p => checkHaVotado(p.id, deviceId).catch(() => ({ votado: false })))
    );

    container.innerHTML = proyectos.map((p, i) => {
      const yaVoto = votados[i]?.votado;
      const puedeVotar = (userRol !== 'editor') && !yaVoto;
      const mostrarBotonesAdmin = (userRol === 'admin');
      const adminBtns = mostrarBotonesAdmin ? `
        <button class="btn-sm warning" onclick="window.abrirEdicion(${p.id})">✏️ Editar</button>
        <button class="btn-sm danger"  onclick="window.confirmarEliminar(${p.id})">🗑 Eliminar</button>
      ` : '';
      const votoBtn = puedeVotar
        ? `<button class="btn-sm primary" onclick="window.abrirVotacion(${p.id})">🗳 Votar</button>`
        : (yaVoto ? `<button class="btn-sm votado" disabled>✓ Ya votaste</button>` : '');
      return `
        <div class="proyecto-card">
          <div class="card-accent"></div>
          <div class="card-body">
            <div class="card-badge">Proyecto #${p.id}</div>
            <div class="curso-name">${esc(p.nombre)}</div>
            <div class="proyecto-desc">${esc(p.descripcion || 'Sin descripción.')}</div>
          </div>
          <div class="card-actions">
            <button class="btn-sm" onclick="window.verRepresentantes(${p.id})">👥 Equipo</button>
            ${votoBtn}
            ${adminBtns}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><h3>Error al cargar</h3><p>${esc(err.message)}</p></div>`;
  }
}

window.verRepresentantes = async (idProyecto) => {
  const proyecto = proyectos.find(p => p.id == idProyecto);
  let reps = [];
  try { reps = await getRepresentantes(idProyecto); } catch {}

  const existing = document.getElementById('modal-reps');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-reps';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:480px;">
      <div class="modal-header">
        <div class="modal-title">Equipo — ${esc(proyecto?.nombre)}</div>
        <button class="modal-close" onclick="document.getElementById('modal-reps').remove()">✕</button>
      </div>
      <div class="modal-body">
        ${reps.length
          ? `<div class="reps-grid">${reps.map(r => `
              <div class="rep-card">
                <div class="rep-avatar-placeholder">${esc(r.nombre[0]).toUpperCase()}</div>
                <div class="rep-name">${esc(r.nombre)}</div>
                <div class="rep-curso">${esc(r.curso || '—')}</div>
                <div class="rep-contact">${r.contacto ? '📱 ' + esc(r.contacto) : ''}</div>
              </div>`).join('')}
            </div>`
          : '<div class="empty-state"><span class="empty-icon">👤</span><p>Sin integrantes registrados.</p></div>'
        }
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

window.abrirVotacion = (idProyecto) => {
  const proyecto = proyectos.find(p => p.id == idProyecto);
  if (!proyecto) return;

  document.getElementById('modal-voto-title').textContent = 'Emitir voto';
  document.getElementById('modal-voto-body').innerHTML = `
    <div class="voto-proyecto-nombre">${esc(proyecto.nombre)}</div>
    <div class="form-group">
      <label>PIN del proyecto</label>
      <input type="tel" id="voto-pin" maxlength="4" inputmode="numeric"
             class="pin-input" placeholder="• • • •" autocomplete="off">
      <div class="pin-hint">Pide el PIN de 4 dígitos a los representantes del proyecto.</div>
    </div>
    <button id="confirmar-voto" class="btn-primary">Confirmar voto</button>
    <div id="voto-error" class="error-msg"></div>
  `;

  const modal = document.getElementById('modal-voto');
  modal.classList.add('open');
  setTimeout(() => document.getElementById('voto-pin')?.focus(), 100);

  const confirm = async () => {
    const pin = document.getElementById('voto-pin').value.trim();
    const errEl = document.getElementById('voto-error');
    const btn   = document.getElementById('confirmar-voto');
    errEl.style.display = 'none';
    if (!pin || pin.length !== 4) {
      errEl.textContent = 'Ingresa el PIN de 4 dígitos.';
      errEl.style.display = 'block';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Verificando…';
    try {
      await votar(proyecto.id, pin, deviceId);
      showToast('¡Voto registrado! 🎉', 'success');
      closeModal('modal-voto');
      cargarProyectos();
      cargarResultados();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Confirmar voto';
    }
  };

  document.getElementById('confirmar-voto').onclick = confirm;
  document.getElementById('voto-pin').onkeydown = e => { if (e.key === 'Enter') confirm(); };
  document.getElementById('modal-voto-close').onclick = () => closeModal('modal-voto');
};

window.confirmarEliminar = (id) => {
  const proyecto = proyectos.find(p => p.id == id);
  if (!confirm(`¿Eliminar "${proyecto?.nombre}"? Se borrarán todos sus votos.`)) return;
  eliminarProyecto(id)
    .then(() => { showToast('Proyecto eliminado', 'success'); cargarProyectos(); cargarResultados(); })
    .catch(err => showToast(err.message, 'error'));
};

window.abrirEdicion = (idProyecto) => {
  const p = proyectos.find(x => x.id == idProyecto);
  if (!p) return;
  document.getElementById('proyecto-modal-title').textContent = 'Editar proyecto';
  document.getElementById('proy-nombre').value = p.nombre;
  document.getElementById('proy-desc').value   = p.descripcion || '';
  document.getElementById('proy-pin').value    = '';
  document.getElementById('pin-hint').textContent = 'Dejar vacío para mantener el PIN actual.';
  document.getElementById('reps-container').innerHTML = '';
  document.getElementById('proyecto-error').style.display = 'none';
  document.getElementById('modal-proyecto').dataset.editId = idProyecto;
  document.getElementById('modal-proyecto').classList.add('open');
};

export async function cargarResultados() {
  setLoading('resultados-container');
  const container = document.getElementById('resultados-container');
  try {
    const data = await getResultados(userRol === 'admin');
    const btnToggle = document.getElementById('btn-toggle-resultados');
    if (userRol === 'admin' && btnToggle) {
      btnToggle.textContent = data.publicos ? '🔒 Ocultar resultados' : '📢 Publicar resultados';
    }
    if (!data.publicos && userRol !== 'admin') {
      container.innerHTML = `
        <div class="resultados-bloqueados">
          <div class="lock-icon">🔒</div>
          <h3>Resultados no disponibles</h3>
          <p>El administrador publicará los resultados al finalizar la votación.</p>
        </div>`;
      return;
    }
    const ranking = data.ranking || [];
    if (!ranking.length) {
      container.innerHTML = `<div class="empty-state"><span class="empty-icon">🗳</span><h3>Sin votos aún</h3><p>Los votos aparecerán aquí en tiempo real.</p></div>`;
      return;
    }
    const maxV = Math.max(...ranking.map(r => r.votos), 1);
    const posClases = ['oro', 'plata', 'bronce'];
    const cardClases = ['top1', 'top2', 'top3'];
    container.innerHTML = `<div class="ranking-list">${ranking.map((r, i) => {
      const pc = posClases[i] || 'otro';
      const cc = cardClases[i] || '';
      const pct = Math.round((r.votos / maxV) * 100);
      return `
        <div class="resultado-card ${cc}">
          <div class="resultado-pos ${pc}">${i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</div>
          <div class="resultado-info">
            <div class="resultado-nombre">${esc(r.nombre)}</div>
            <div class="resultado-barra-wrap">
              <div class="resultado-barra">
                <div class="resultado-barra-fill" style="width:${pct}%"></div>
              </div>
              <span class="resultado-votos-label">${pct}%</span>
            </div>
          </div>
          <div class="resultado-count">${r.votos}</div>
        </div>`;
    }).join('')}</div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><h3>Error</h3><p>${esc(err.message)}</p></div>`;
  }
}

function initAdminForms() {
  const modal     = document.getElementById('modal-proyecto');
  const closeBtn  = document.getElementById('modal-proyecto-close');
  const cancelBtn = document.getElementById('cancelar-proyecto');
  const addRepBtn = document.getElementById('agregar-rep');
  const saveBtn   = document.getElementById('guardar-proyecto');
  const errEl     = document.getElementById('proyecto-error');

  function newRepRow() {
    const row = document.createElement('div');
    row.className = 'rep-row';
    row.innerHTML = `
      <input type="text" placeholder="Nombre completo" class="rep-nombre">
      <input type="text" placeholder="Curso/Grado"     class="rep-curso" style="max-width:110px;">
      <input type="text" placeholder="Contacto"        class="rep-contacto" style="max-width:110px;">
      <button type="button" class="btn-sm danger" onclick="this.parentElement.remove()" title="Quitar">✕</button>`;
    return row;
  }

  function openCrear() {
    document.getElementById('proyecto-modal-title').textContent = 'Registrar proyecto';
    document.getElementById('proy-nombre').value = '';
    document.getElementById('proy-desc').value   = '';
    document.getElementById('proy-pin').value    = '';
    document.getElementById('pin-hint').textContent = 'Los visitantes usarán este PIN para votar.';
    errEl.style.display = 'none';
    const repsContainer = document.getElementById('reps-container');
    repsContainer.innerHTML = '';
    repsContainer.appendChild(newRepRow());
    delete modal.dataset.editId;
    modal.classList.add('open');
  }

  document.getElementById('btn-nuevo-proyecto').onclick = openCrear;
  closeBtn.onclick  = () => { modal.classList.remove('open'); delete modal.dataset.editId; };
  cancelBtn.onclick = () => { modal.classList.remove('open'); delete modal.dataset.editId; };
  addRepBtn.onclick = () => document.getElementById('reps-container').appendChild(newRepRow());

  saveBtn.onclick = async () => {
    const nombre     = document.getElementById('proy-nombre').value.trim();
    const descripcion = document.getElementById('proy-desc').value.trim();
    const pin        = document.getElementById('proy-pin').value.trim();
    const editId     = modal.dataset.editId;
    errEl.style.display = 'none';

    if (!nombre) { errEl.textContent = 'El nombre es obligatorio.'; errEl.style.display = 'block'; return; }

    if (editId) {
      if (pin && !/^\d{4}$/.test(pin)) {
        errEl.textContent = 'El PIN debe ser de 4 dígitos o déjalo vacío.';
        errEl.style.display = 'block'; return;
      }
      const datos = { nombre, descripcion };
      if (pin) datos.pin = pin;
      saveBtn.disabled = true; saveBtn.textContent = 'Guardando…';
      try {
        await editarProyecto(editId, datos);
        showToast('Proyecto actualizado ✓', 'success');
        modal.classList.remove('open'); delete modal.dataset.editId;
        cargarProyectos();
      } catch (err) { errEl.textContent = err.message; errEl.style.display = 'block'; }
      finally { saveBtn.disabled = false; saveBtn.textContent = 'Guardar'; }
    } else {
      if (!/^\d{4}$/.test(pin)) {
        errEl.textContent = 'El PIN debe ser de 4 dígitos.';
        errEl.style.display = 'block'; return;
      }
      const repRows = document.querySelectorAll('#reps-container .rep-row');
      const representantes = [];
      repRows.forEach(row => {
        const n = row.querySelector('.rep-nombre')?.value.trim();
        if (n) representantes.push({
          nombre: n,
          curso:    row.querySelector('.rep-curso')?.value.trim() || '',
          contacto: row.querySelector('.rep-contacto')?.value.trim() || ''
        });
      });
      if (!representantes.length) {
        errEl.textContent = 'Agrega al menos un integrante.';
        errEl.style.display = 'block'; return;
      }
      saveBtn.disabled = true; saveBtn.textContent = 'Guardando…';
      try {
        await crearProyecto({ nombre, descripcion, pin, representantes });
        showToast('Proyecto registrado ✓', 'success');
        modal.classList.remove('open');
        cargarProyectos();
      } catch (err) { errEl.textContent = err.message; errEl.style.display = 'block'; }
      finally { saveBtn.disabled = false; saveBtn.textContent = 'Guardar'; }
    }
  };
}

function initResultadosAdmin() {
  document.getElementById('btn-toggle-resultados').onclick = async () => {
    try {
      const data = await toggleResultadosPublicos();
      showToast(`Resultados ${data.publicos ? 'publicados 🎉' : 'ocultados'}`, 'success');
      cargarResultados();
    } catch (err) { showToast(err.message, 'error'); }
  };
}

function cambiarVista(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
  document.querySelectorAll('.bottom-nav-item[data-view]').forEach(n => n.classList.toggle('active', n.dataset.view === view));
  if (view === 'proyectos') cargarProyectos();
  if (view === 'resultados') cargarResultados();
  document.getElementById('sidebar')?.classList.remove('open');
}

function initNavigation() {
  document.querySelectorAll('.nav-item[data-view]').forEach(item =>
    item.addEventListener('click', () => cambiarVista(item.dataset.view)));
  document.querySelectorAll('.bottom-nav-item[data-view]').forEach(item =>
    item.addEventListener('click', () => cambiarVista(item.dataset.view)));
}

function initMobileMenu() {
  const toggle  = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')
        && !sidebar.contains(e.target) && !toggle.contains(e.target))
      sidebar.classList.remove('open');
  });
  document.getElementById('bnav-admin').addEventListener('click', () => {
    if (userRol) {
      if (confirm('¿Cerrar sesión?')) { document.getElementById('btn-logout').click(); }
    } else {
      // Fix: llamar openLoginModal directamente en vez de simular click en btn-login
      // que puede no tener el listener montado aún
      import('./auth.js').then(m => m.openLoginModal());
    }
  });
}

(async function () {
  initAuth();
  initNavigation();
  initMobileMenu();
  initAdminForms();
  initResultadosAdmin();

  userRol = getUserRol();
  updateAdminUI(userRol);

  window.cargarProyectos  = cargarProyectos;
  window.cargarResultados = cargarResultados;
  window.setIsAdmin = (val) => { userRol = val ? 'admin' : null; };

  await cargarProyectos();
  await cargarResultados();
})();
