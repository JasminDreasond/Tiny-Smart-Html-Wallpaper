/** @type {Record<string, string>} */
let envDataObj = {};
/** @type {any[]} */
let wallpapersList = [];
/** @type {number | null} */
let draggedIndex = null;

/** * @typedef {Object} EnvSchemaRule
 * @property {string} placeholder
 * @property {(val: string) => boolean} validate
 */

/** @type {Record<string, EnvSchemaRule>} */
const envSchema = {
  ENGINE_MODE: {
    placeholder: 'slideshow | single',
    validate: (v) => ['slideshow', 'single'].includes(v),
  },
  SLIDESHOW_ORDER: {
    placeholder: 'sequence | random',
    validate: (v) => ['sequence', 'random'].includes(v),
  },
  SLIDESHOW_INTERVAL: { placeholder: '-1 or ms (e.g. 60000)', validate: (v) => /^-?\d+$/.test(v) },
  DEFAULT_DISPLAY: {
    placeholder: 'scaled_cropped | scaled | normal | tiled',
    validate: (v) => ['scaled_cropped', 'scaled', 'cropped', 'normal', 'tiled'].includes(v),
  },
  ANIMATIONS_ENABLED: {
    placeholder: 'true | false',
    validate: (v) => ['true', 'false'].includes(v),
  },
  TRANSITION_DURATION: { placeholder: 'ms (e.g. 1000)', validate: (v) => /^\d+$/.test(v) },
  DEFAULT_ANIMATION: { placeholder: 'fade | slide_left | zoom_in', validate: (v) => v.length > 0 },
  ANIMATE_FIRST_LOAD: {
    placeholder: 'true | false',
    validate: (v) => ['true', 'false'].includes(v),
  },
  FIXED_CLOCK_INTERVAL: {
    placeholder: 'HH:MM or empty',
    validate: (v) => v === '' || /^\d{2}:\d{2}$/.test(v),
  },
  ON_LIST_CHANGE_ONLY: {
    placeholder: 'true | false',
    validate: (v) => ['true', 'false'].includes(v),
  },
  ASSETS_PATH: { placeholder: '../web/assets/ or /absolute/path/', validate: (v) => v.length > 0 },
};

/** @type {Record<string, (val: string) => boolean>} */
const wpSchema = {
  file: (v) => v.trim().length > 0,
  display: (v) =>
    v === '' || ['scaled_cropped', 'scaled', 'cropped', 'normal', 'tiled'].includes(v),
  time: (v) => v === '' || /^\d{2}:\d{2}(-\d{2}:\d{2})?$/.test(v),
  date: (v) => v === '' || /^\d{2}-\d{2}$/.test(v),
  weight: (v) => v === '' || (!isNaN(Number(v)) && Number(v) > 0),
  animation: (v) => true,
  volume: (v) => v === '' || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 1),
};

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
 * @param {HTMLInputElement} input
 * @param {string} key
 * @returns {void}
 */
const validateEnvInput = (input, key) => {
  /** @type {EnvSchemaRule} */
  const rule = envSchema[key];
  if (rule) {
    /** @type {boolean} */
    const isValid = rule.validate(input.value);
    input.style.borderColor = isValid ? '#45475a' : '#f38ba8';
    input.style.outlineColor = isValid ? '' : '#f38ba8';
  }
};

/**
 * @param {HTMLInputElement} input
 * @param {string} key
 * @returns {void}
 */
window.validateWpInput = (input, key) => {
  /** @type {((val: string) => boolean) | undefined} */
  const validator = wpSchema[key];
  if (validator) {
    /** @type {boolean} */
    const isValid = validator(input.value);
    input.style.borderColor = isValid ? '#45475a' : '#f38ba8';
    input.style.outlineColor = isValid ? '' : '#f38ba8';
  }
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
  if (!envDataObj.ASSETS_PATH) envDataObj.ASSETS_PATH = '../web/assets/';

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

    if (envSchema[key]) {
      input.placeholder = envSchema[key].placeholder;
      validateEnvInput(input, key);
    }

    input.addEventListener('input', (e) => {
      /** @type {HTMLInputElement} */
      const target = /** @type {HTMLInputElement} */ (e.target);
      envDataObj[key] = target.value;
      validateEnvInput(target, key);
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
    card.draggable = true;
    card.setAttribute('ondragstart', `handleDragStart(${i})`);
    card.setAttribute('ondragover', `handleDragOver(event)`);
    card.setAttribute('ondrop', `handleDrop(${i}, event)`);
    card.setAttribute('ondragenter', `handleDragEnter(event)`);
    card.setAttribute('ondragleave', `handleDragLeave(event)`);
    card.style.transition = 'border 0.2s';
    card.style.cursor = 'grab';

    /** @type {string} */
    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <strong style="color: #89b4fa; font-size: 1.2em;">#${i + 1}</strong>
        <div>
          <button class="secondary-btn" style="padding: 2px 8px; margin-right: 5px;" onclick="moveWp(${i}, -1)" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="secondary-btn" style="padding: 2px 8px;" onclick="moveWp(${i}, 1)" ${i === wallpapersList.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
      </div>
      <div class="input-group">
        <label>File / URL</label>
        <input type="text" value="${wp.file || ''}" oninput="validateWpInput(this, 'file')" onchange="updateWp(${i}, 'file', this.value, 'string')">
      </div>
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <div class="input-group" style="flex: 1;">
          <label>Type</label>
          <select onchange="updateWp(${i}, 'type', this.value, 'string')" style="padding: 5px; background: #1e1e2e; color: #fff; border: 1px solid #45475a; border-radius: 4px;">
            <option value="image" ${wp.type === 'image' ? 'selected' : ''}>Image</option>
            <option value="video" ${wp.type === 'video' ? 'selected' : ''}>Video</option>
            <option value="web" ${wp.type === 'web' ? 'selected' : ''}>Web</option>
          </select>
        </div>
        <div class="input-group" style="flex: 1;">
          <label>Display Override</label>
          <input type="text" value="${wp.display || ''}" placeholder="e.g. normal" oninput="validateWpInput(this, 'display')" onchange="updateWp(${i}, 'display', this.value, 'string')">
        </div>
      </div>
      <div style="display: flex; gap: 10px;">
        <div class="input-group" style="flex: 1;">
          <label>Time Config</label>
          <input type="text" value="${wp.time || ''}" placeholder="21:00-03:00" oninput="validateWpInput(this, 'time')" onchange="updateWp(${i}, 'time', this.value, 'string')">
        </div>
        <div class="input-group" style="flex: 1;">
          <label>Date Config</label>
          <input type="text" value="${wp.date || ''}" placeholder="12-25" oninput="validateWpInput(this, 'date')" onchange="updateWp(${i}, 'date', this.value, 'string')">
        </div>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <div class="input-group" style="flex: 1;">
          <label>Weight</label>
          <input type="number" value="${wp.weight !== undefined ? wp.weight : ''}" placeholder="1" oninput="validateWpInput(this, 'weight')" onchange="updateWp(${i}, 'weight', this.value, 'number')">
        </div>
        <div class="input-group" style="flex: 1;">
          <label>Animation Override</label>
          <input type="text" value="${wp.animation || ''}" placeholder="e.g. fade" oninput="validateWpInput(this, 'animation')" onchange="updateWp(${i}, 'animation', this.value, 'string')">
        </div>
      </div>
      ${
        wp.type === 'video'
          ? `
      <div style="display: flex; gap: 10px; margin-top: 10px; background: #181825; padding: 10px; border-radius: 4px;">
        <div class="input-group" style="flex: 1;">
          <label>Muted</label>
          <select onchange="updateWp(${i}, 'muted', this.value, 'boolean')" style="padding: 5px; background: #1e1e2e; color: #fff; border: 1px solid #45475a; border-radius: 4px;">
            <option value="true" ${wp.muted !== false ? 'selected' : ''}>True</option>
            <option value="false" ${wp.muted === false ? 'selected' : ''}>False</option>
          </select>
        </div>
        <div class="input-group" style="flex: 1;">
          <label>Volume (0.0 to 1.0)</label>
          <input type="number" step="0.1" min="0" max="1" value="${wp.volume !== undefined ? wp.volume : ''}" placeholder="1.0" oninput="validateWpInput(this, 'volume')" onchange="updateWp(${i}, 'volume', this.value, 'number')">
        </div>
      </div>
      `
          : ''
      }
      <div class="card-actions" style="margin-top: 15px;">
        <button class="danger-btn" onclick="removeWp(${i})">Remove Wallpaper</button>
      </div>
    `;
    card.innerHTML = html;

    // Quick validation on load to ensure existing data is visually correct
    setTimeout(() => {
      /** @type {NodeListOf<HTMLInputElement>} */
      const inputs = card.querySelectorAll('input');
      inputs.forEach((input) => {
        const key = input.getAttribute('oninput')?.match(/'([^']+)'/)?.[1];
        if (key) window.validateWpInput(input, key);
      });
    }, 0);

    list.appendChild(card);
  }
};

/**
 * @param {number} index
 * @param {string} key
 * @param {string} value
 * @param {string} typeFormat
 * @returns {void}
 */
window.updateWp = (index, key, value, typeFormat) => {
  if (value === '' || value === 'default') {
    delete wallpapersList[index][key];
    if (key === 'type') renderWallpapers();
    return;
  }

  /** @type {any} */
  let finalValue = value;

  if (typeFormat === 'number') {
    finalValue = parseFloat(value);
  } else if (typeFormat === 'boolean') {
    finalValue = value === 'true';
  }

  wallpapersList[index][key] = finalValue;

  if (key === 'type') {
    renderWallpapers();
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
 * @param {number} index
 * @param {number} direction
 * @returns {void}
 */
window.moveWp = (index, direction) => {
  /** @type {number} */
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= wallpapersList.length) return;

  /** @type {any} */
  const temp = wallpapersList[index];
  wallpapersList[index] = wallpapersList[newIndex];
  wallpapersList[newIndex] = temp;

  renderWallpapers();
};

/**
 * @param {number} index
 * @returns {void}
 */
window.handleDragStart = (index) => {
  draggedIndex = index;
};

/**
 * @param {DragEvent} event
 * @returns {void}
 */
window.handleDragOver = (event) => {
  event.preventDefault();
};

/**
 * @param {DragEvent} event
 * @returns {void}
 */
window.handleDragEnter = (event) => {
  event.preventDefault();
  /** @type {HTMLElement} */
  const target = /** @type {HTMLElement} */ (event.currentTarget);
  target.style.borderColor = '#89b4fa';
  target.style.borderStyle = 'dashed';
};

/**
 * @param {DragEvent} event
 * @returns {void}
 */
window.handleDragLeave = (event) => {
  /** @type {HTMLElement} */
  const target = /** @type {HTMLElement} */ (event.currentTarget);
  target.style.borderColor = '#45475a';
  target.style.borderStyle = 'solid';
};

/**
 * @param {number} dropIndex
 * @param {DragEvent} event
 * @returns {void}
 */
window.handleDrop = (dropIndex, event) => {
  event.preventDefault();

  if (draggedIndex === null || draggedIndex === dropIndex) {
    renderWallpapers();
    return;
  }

  /** @type {any} */
  const movedItem = wallpapersList.splice(draggedIndex, 1)[0];
  wallpapersList.splice(dropIndex, 0, movedItem);

  draggedIndex = null;
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
