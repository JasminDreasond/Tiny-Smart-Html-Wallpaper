/** @type {Record<string, string>} */
let envDataObj = {};
/** @type {any[]} */
let wallpapersList = [];

/**
 * @param {string} envStr
 * @returns {Record<string, string>}
 */
const parseEnv = (envStr) => {
  /** @type {Record<string, string>} */
  const result = {};
  /** @type {string[]} */
  const lines = envStr.split('\n');

  for (let i = 0; i < lines.length; i++) {
    /** @type {string} */
    const line = lines[i].trim();
    if (line && !line.startsWith('#')) {
      /** @type {string[]} */
      const parts = line.split('=');
      /** @type {string} */
      const key = parts[0].trim();
      /** @type {string} */
      const val = parts.slice(1).join('=').replace(/"/g, '').trim();
      if (key) result[key] = val;
    }
  }
  return result;
};

/**
 * @returns {void}
 */
const renderEnvForm = () => {
  /** @type {HTMLElement | null} */
  const form = document.getElementById('env-form');
  if (!form) return;

  form.innerHTML = '';

  // Ensure ASSETS_PATH exists in UI
  if (!envDataObj.ASSETS_PATH) envDataObj.ASSETS_PATH = '/absolute/path/to/wallpapers/';

  for (const [key, value] of Object.entries(envDataObj)) {
    /** @type {HTMLElement} */
    const group = document.createElement('div');
    group.className = 'input-group';

    /** @type {HTMLElement} */
    const label = document.createElement('label');
    label.innerText = key;

    /** @type {HTMLInputElement} */
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.dataset.key = key;

    input.addEventListener('input', (e) => {
      /** @type {HTMLInputElement} */
      const target = /** @type {HTMLInputElement} */ (e.target);
      envDataObj[key] = target.value;
    });

    group.appendChild(label);
    group.appendChild(input);
    form.appendChild(group);
  }
};

/**
 * @returns {void}
 */
const renderWallpapers = () => {
  /** @type {HTMLElement | null} */
  const list = document.getElementById('wallpapers-list');
  if (!list) return;

  list.innerHTML = '';

  for (let i = 0; i < wallpapersList.length; i++) {
    /** @type {any} */
    const wp = wallpapersList[i];

    /** @type {HTMLElement} */
    const card = document.createElement('div');
    card.className = 'card';

    /** @type {string} */
    const html = `
      <div class="input-group">
        <label>File Source / URL</label>
        <input type="text" value="${wp.file || ''}" onchange="updateWp(${i}, 'file', this.value)">
      </div>
      <div class="input-group">
        <label>Type (image/video/web)</label>
        <input type="text" value="${wp.type || 'image'}" onchange="updateWp(${i}, 'type', this.value)">
      </div>
      <div class="input-group">
        <label>Time Config</label>
        <input type="text" value="${wp.time || ''}" placeholder="e.g. 21:00-03:00" onchange="updateWp(${i}, 'time', this.value)">
      </div>
      <div class="card-actions">
        <button class="danger-btn" onclick="removeWp(${i})">Remove</button>
      </div>
    `;
    card.innerHTML = html;
    list.appendChild(card);
  }
};

/**
 * @param {number} index
 * @param {string} key
 * @param {string} value
 * @returns {void}
 */
window.updateWp = (index, key, value) => {
  if (value === '') {
    delete wallpapersList[index][key];
  } else {
    wallpapersList[index][key] = value;
  }
};

/**
 * @param {number} index
 * @returns {void}
 */
window.removeWp = (index) => {
  wallpapersList.splice(index, 1);
  renderWallpapers();
};

/**
 * @returns {void}
 */
const initApp = async () => {
  // @ts-ignore
  /** @type {any} */
  const config = await window.electronAPI.loadConfig();
  if (config) {
    envDataObj = parseEnv(config.env);
    wallpapersList = config.wallpapers || [];
    renderEnvForm();
    renderWallpapers();
  }

  document.getElementById('btn-add-wp')?.addEventListener('click', () => {
    wallpapersList.push({ file: 'new_media.jpg', type: 'image' });
    renderWallpapers();
  });

  document.getElementById('btn-submit')?.addEventListener('click', async () => {
    /** @type {HTMLElement | null} */
    const msg = document.getElementById('status-msg');
    if (msg) {
      msg.innerText = 'Building...';
      msg.className = '';
    }

    /** @type {string} */
    const newEnvStr = Object.entries(envDataObj)
      .map(([k, v]) => `${k}="${v}"`)
      .join('\n');

    // @ts-ignore
    /** @type {any} */
    const result = await window.electronAPI.saveAndBuild({
      env: newEnvStr,
      wallpapers: wallpapersList,
    });

    if (msg) {
      if (result.success) {
        msg.innerText = 'Build finished! /dist is updated.';
        msg.className = 'success';
      } else {
        msg.innerText = 'Build failed!';
        msg.className = 'error';
      }
    }
  });
};

initApp();
