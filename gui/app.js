import { parseEnv } from '../global/utils.js';

/** @type {Record<string, string>} */
let envDataObj = {};
/** @type {any[]} */
let wallpapersList = [];
/** @type {number | null} */
let draggedIndex = null;
/** @type {Record<number, number>} */
const previewLoadIds = {};
let ASSETS_PATH = '';

/** @type {"inline"|"single"} */
let previewMode =
  /** @type {"inline"|"single"} */ (localStorage.getItem('previewMode')) || 'inline';
/** @type {number} */
let activePreviewIndex = 0;

/** @type {number} */
let overlayZoom = 1;

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
  ASSETS_PATH: {
    placeholder: '../assets/ or /absolute/path/',
    validate: (v) => v.length > 0 && (v.endsWith('/') || v.endsWith('\\')),
  },
};

/** @type {Record<string, string>} */
const envLabels = {
  ENGINE_MODE: 'Engine Mode',
  SLIDESHOW_ORDER: 'Slideshow Order',
  SLIDESHOW_INTERVAL: 'Slideshow Interval (ms)',
  DEFAULT_DISPLAY: 'Default Display Mode',
  ANIMATIONS_ENABLED: 'Enable Animations',
  TRANSITION_DURATION: 'Transition Duration (ms)',
  DEFAULT_ANIMATION: 'Default Animation Style',
  ANIMATE_FIRST_LOAD: 'Animate First Load',
  FIXED_CLOCK_INTERVAL: 'Fixed Clock Interval',
  ON_LIST_CHANGE_ONLY: 'Update On List Change Only',
  ASSETS_PATH: 'Assets Directory Path',
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
  nextOnEnd: (v) => true,
};

/**
 * @param {string} mode
 * @returns {void}
 */
window.togglePreviewMode = (mode) => {
  previewMode = /** @type {"inline"|"single"} */ (mode);
  localStorage.setItem('previewMode', mode);
  renderWallpapers();
};

/**
 * @param {number} index
 * @returns {void}
 */
const setActivePreview = (index) => {
  if (previewMode !== 'single') return;
  if (activePreviewIndex === index) return;

  activePreviewIndex = index;

  /** @type {NodeListOf<HTMLElement>} */
  const cards = document.querySelectorAll('#wallpapers-list .card');
  cards.forEach((card, i) => {
    if (i === index) {
      card.style.borderColor = '#8b5cf6';
      card.style.boxShadow = '0 0 0 1px rgba(139, 92, 246, 0.5)';
    } else {
      card.style.borderColor = 'var(--card-border-color)';
      card.style.boxShadow = 'none';
    }
  });

  /** @type {any} */
  const wp = wallpapersList[index];
  if (wp) {
    updatePreview(index, wp.file || '', wp.type || 'image');
  } else {
    /** @type {HTMLElement | null} */
    const container = document.getElementById('single-preview-container');
    if (container)
      container.innerHTML = '<span style="color: #a1a1aa;">No preview available</span>';
  }
};

/**
 * @param {number} index
 * @param {string} url
 * @param {string} type
 * @returns {void}
 */
const openFullscreenPreview = (index, url, type) => {
  /** @type {HTMLElement | null} */
  let overlay = document.getElementById('media-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'media-overlay';
    overlay.style.cssText =
      'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);';
    document.body.appendChild(overlay);
  }

  overlayZoom = 1;
  overlay.innerHTML = '';

  /** @type {any} */
  const wp = wallpapersList[index] || {};
  /** @type {string} */
  const displayMode = wp.display || envDataObj.DEFAULT_DISPLAY || 'scaled_cropped';

  /** @type {HTMLElement} */
  const mediaContainer = document.createElement('div');
  mediaContainer.style.cssText =
    'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;';

  /** @type {HTMLElement} */
  let mediaEl;

  if (type === 'image') {
    mediaEl = document.createElement('div');
    mediaEl.style.backgroundImage = `url("${url}")`;
    mediaEl.style.backgroundSize = 'contain';
    mediaEl.style.backgroundPosition = 'center';
    mediaEl.style.backgroundRepeat = 'no-repeat';
    mediaEl.style.width = '100%';
    mediaEl.style.height = '100%';
  } else {
    mediaEl = document.createElement('video');
    /** @type {HTMLVideoElement} */ (mediaEl).src = url;
    /** @type {HTMLVideoElement} */ (mediaEl).autoplay = true;
    /** @type {HTMLVideoElement} */ (mediaEl).loop = true;
    /** @type {HTMLVideoElement} */ (mediaEl).muted = true;
    mediaEl.style.width = '100%';
    mediaEl.style.height = '100%';
    mediaEl.style.objectFit = 'contain';
  }

  mediaEl.style.transition = 'transform 0.2s ease-out';
  mediaContainer.appendChild(mediaEl);

  /** @type {HTMLElement} */
  const sideMenu = document.createElement('div');
  sideMenu.style.cssText =
    'position: absolute; right: 20px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 12px; background: rgba(9, 9, 11, 0.8); padding: 15px; border-radius: 8px; border: 1px solid #8b5cf6; box-shadow: 0 4px 15px rgba(0,0,0,0.5); transition: opacity 0.3s;';

  /** @type {HTMLButtonElement} */
  const btnZoomIn = document.createElement('button');
  btnZoomIn.className = 'secondary-btn';
  btnZoomIn.innerText = '🔍 Zoom In';
  btnZoomIn.onclick = () => {
    overlayZoom += 0.2;
    mediaEl.style.transform = `scale(${overlayZoom})`;
  };

  /** @type {HTMLButtonElement} */
  const btnZoomOut = document.createElement('button');
  btnZoomOut.className = 'secondary-btn';
  btnZoomOut.innerText = '🔍 Zoom Out';
  btnZoomOut.onclick = () => {
    overlayZoom = Math.max(0.2, overlayZoom - 0.2);
    mediaEl.style.transform = `scale(${overlayZoom})`;
  };

  /** @type {HTMLButtonElement} */
  const btnReset = document.createElement('button');
  btnReset.className = 'secondary-btn';
  btnReset.innerText = '🔄 Reset';
  btnReset.onclick = () => {
    overlayZoom = 1;
    mediaEl.style.transform = `scale(${overlayZoom})`;
  };

  /** @type {boolean} */
  let isOsFullscreen = false;

  /** @type {HTMLButtonElement} */
  const btnOsFullscreen = document.createElement('button');
  btnOsFullscreen.className = 'secondary-btn';
  btnOsFullscreen.innerText = '🖥️ OS Fullscreen';
  btnOsFullscreen.onclick = () => {
    if (window.electronAPI && window.electronAPI.toggleFullscreen) {
      window.electronAPI.toggleFullscreen();
      isOsFullscreen = !isOsFullscreen;

      if (isOsFullscreen) {
        if (type === 'video') mediaEl.style.objectFit = '';
        if (type === 'image') {
          mediaEl.style.backgroundSize = '';
          mediaEl.style.backgroundPosition = '';
          mediaEl.style.backgroundRepeat = '';
        }

        mediaEl.className = `media-layer display-${displayMode}`;
        sideMenu.style.opacity = '0.1';

        sideMenu.onmouseenter = () => {
          sideMenu.style.opacity = '1';
        };
        sideMenu.onmouseleave = () => {
          sideMenu.style.opacity = '0.1';
        };
        btnOsFullscreen.innerText = '🖥️ Exit OS Fullscreen';
      } else {
        mediaEl.className = '';
        if (type === 'video') mediaEl.style.objectFit = 'contain';
        if (type === 'image') {
          mediaEl.style.backgroundSize = 'contain';
          mediaEl.style.backgroundPosition = 'center';
          mediaEl.style.backgroundRepeat = 'no-repeat';
        }
        sideMenu.style.opacity = '1';

        sideMenu.onmouseenter = null;
        sideMenu.onmouseleave = null;
        btnOsFullscreen.innerText = '🖥️ OS Fullscreen';
      }
    }
  };

  /** @type {HTMLButtonElement} */
  const btnClose = document.createElement('button');
  btnClose.className = 'danger-btn';
  btnClose.style.marginTop = '10px';
  btnClose.innerText = '❌ Close';

  /**
   * @param {KeyboardEvent} e
   * @returns {void}
   */
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      if (isOsFullscreen) {
        btnOsFullscreen.click();
      } else {
        btnClose.click();
      }
    }
  };

  document.addEventListener('keydown', handleEsc);

  btnClose.onclick = () => {
    document.removeEventListener('keydown', handleEsc);
    /** @type {HTMLElement} */ (overlay).style.display = 'none';
    if (type === 'video') /** @type {HTMLVideoElement} */ (mediaEl).src = '';

    if (isOsFullscreen && window.electronAPI && window.electronAPI.exitFullscreen) {
      window.electronAPI.exitFullscreen();
    }
  };

  sideMenu.append(btnZoomIn, btnZoomOut, btnReset, btnOsFullscreen, btnClose);
  overlay.append(mediaContainer, sideMenu);

  overlay.style.display = 'flex';
};

/**
 * @param {string} basePath
 * @param {string} input
 * @returns {string}
 */
const buildSafeUrl = (basePath, input) => {
  /** @type {string} */
  let cleanInput = input.trim();

  if (!cleanInput) return '';
  if (/%00|\u0000/i.test(cleanInput)) return 'about:blank';

  try {
    /** @type {string} */
    const decoded = decodeURIComponent(cleanInput);
    if (decoded !== cleanInput && /%00|\u0000/i.test(decoded)) return 'about:blank';
    cleanInput = decoded;
  } catch (e) {
    return 'about:blank';
  }

  if (/^https?:\/\//i.test(cleanInput)) return input.trim();
  if (/^[a-z0-9]+:/i.test(cleanInput)) return 'about:blank';
  if (/^[\/\\]|^[a-zA-Z]:[\/\\]/.test(cleanInput)) return 'about:blank';

  /** @type {string[]} */
  const segments = cleanInput.split(/[\/\\]+/);
  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === '..' || segments[i] === '.') return 'about:blank';
  }

  /** @type {string} */
  const safeBase = basePath.endsWith('/') || basePath.endsWith('\\') ? basePath : basePath + '/';

  return safeBase + input.trim();
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
    input.style.borderColor = isValid ? '#27272a' : '#f43f5e';
    input.style.outlineColor = isValid ? '' : '#f43f5e';
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
    input.style.borderColor = isValid ? '#27272a' : '#f43f5e';
    input.style.outlineColor = isValid ? '' : '#f43f5e';
  }
};

/**
 * @param {number} index
 * @param {string} rawInput
 * @param {string} type
 * @returns {void}
 */
const updatePreview = (index, rawInput, type) => {
  if (previewMode === 'single' && index !== activePreviewIndex) return;

  /** @type {number} */
  const loadId = (previewLoadIds[index] || 0) + 1;
  previewLoadIds[index] = loadId;

  /** @type {string} */
  const containerId =
    previewMode === 'single' ? 'single-preview-container' : `preview-container-${index}`;
  /** @type {HTMLElement | null} */
  const container = document.getElementById(containerId);
  if (!container) return;

  if (type === 'web') {
    if (previewMode === 'single') {
      container.innerHTML =
        '<span style="color: #f43f5e; font-weight: bold;">Previews are not available for Web items</span>';
    }
    return;
  }

  if (!rawInput) {
    container.innerHTML = '<span style="color: #a1a1aa;">No preview available</span>';
    return;
  }

  container.innerHTML = '<span style="color: #8b5cf6;">Loading preview...</span>';

  /** @type {string} */
  const safeUrl = buildSafeUrl(ASSETS_PATH || envDataObj.ASSETS_PATH || '../assets/', rawInput);

  if (safeUrl === 'about:blank') {
    container.innerHTML = '<span style="color: #f43f5e;">Security block: Invalid path</span>';
    return;
  }

  /**
   * @param {HTMLElement} el
   * @returns {void}
   */
  const finalize = (el) => {
    if (previewLoadIds[index] === loadId) {
      container.innerHTML = '';
      container.appendChild(el);
    }
  };

  if (type === 'image') {
    /** @type {HTMLDivElement} */
    const imgDiv = document.createElement('div');
    imgDiv.style.width = '100%';
    imgDiv.style.height = '100%';
    imgDiv.style.backgroundImage = `url("${safeUrl}")`;
    imgDiv.style.backgroundSize = 'contain';
    imgDiv.style.backgroundPosition = 'center';
    imgDiv.style.backgroundRepeat = 'no-repeat';
    imgDiv.style.cursor = 'zoom-in';
    imgDiv.style.pointerEvents = 'auto';
    imgDiv.onclick = () => openFullscreenPreview(index, safeUrl, 'image');

    /** @type {HTMLImageElement} */
    const preloadImg = new Image();
    preloadImg.onload = () => finalize(imgDiv);
    preloadImg.onerror = () => {
      if (previewLoadIds[index] === loadId) {
        container.innerHTML = '<span style="color: #f43f5e;">Failed to load image</span>';
      }
    };
    preloadImg.src = safeUrl;
  } else if (type === 'video') {
    /** @type {HTMLVideoElement} */
    const vid = document.createElement('video');
    vid.style.width = '100%';
    vid.style.height = '100%';
    vid.style.objectFit = 'contain';
    vid.style.cursor = 'zoom-in';
    vid.style.pointerEvents = 'auto';
    vid.onclick = () => openFullscreenPreview(index, safeUrl, 'video');
    vid.muted = true;
    vid.autoplay = true;
    vid.loop = true;
    vid.oncanplay = () => finalize(vid);
    vid.onerror = () => {
      if (previewLoadIds[index] === loadId) {
        container.innerHTML = '<span style="color: #f43f5e;">Failed to load video</span>';
      }
    };
    vid.src = safeUrl;
  }
};

const refreshAllWallpapers = async () => {
  /** @type {any} */
  const config = await window.electronAPI.loadConfig();
  ASSETS_PATH = config.ASSETS_PATH ?? '';
  if (!config) return;

  if (previewMode === 'inline') {
    wallpapersList.forEach((wp, index) => {
      if (wp) updatePreview(index, wp.file || '', wp.type || 'image');
    });
  } else {
    if (activePreviewIndex >= 0 && activePreviewIndex < wallpapersList.length) {
      /** @type {any} */
      const wp = wallpapersList[activePreviewIndex];
      if (wp) updatePreview(activePreviewIndex, wp.file || '', wp.type || 'image');
    }
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
  if (!envDataObj.ASSETS_PATH) envDataObj.ASSETS_PATH = '../assets/';

  for (const [key, value] of Object.entries(envDataObj)) {
    /** @type {HTMLElement} */
    const group = document.createElement('div');
    group.className = 'input-group';

    /** @type {HTMLElement} */
    const label = document.createElement('label');
    label.innerText = envLabels[key] || key;

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

      if (key === 'ASSETS_PATH') {
        if (previewMode === 'inline') {
          wallpapersList.forEach((wp, index) => {
            if (wp) updatePreview(index, wp.file || '', wp.type || 'image');
          });
        } else {
          if (activePreviewIndex >= 0 && activePreviewIndex < wallpapersList.length) {
            /** @type {any} */
            const wp = wallpapersList[activePreviewIndex];
            if (wp) updatePreview(activePreviewIndex, wp.file || '', wp.type || 'image');
          }
        }
      }
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

  if (previewMode === 'single') {
    /** @type {HTMLElement} */
    const stickyPreview = document.createElement('div');
    stickyPreview.id = 'single-preview-container';
    // Position Sticky applied directly as a sibling to the cards so it sticks the entire length of the list!
    stickyPreview.style.cssText =
      'height: 220px; background: rgba(9, 9, 11, 0.95); border: 1px solid #8b5cf6; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; position: sticky; top: 0px; z-index: 100; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); backdrop-filter: blur(12px); text-align: center;';
    stickyPreview.innerHTML = '<span style="color: #a1a1aa;">No preview available</span>';
    list.appendChild(stickyPreview);
  }

  if (activePreviewIndex >= wallpapersList.length) {
    activePreviewIndex = Math.max(0, wallpapersList.length - 1);
  }

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
    card.style.cursor = 'grab';

    if (previewMode === 'single') {
      if (i === activePreviewIndex) {
        card.style.borderColor = '#8b5cf6';
        card.style.boxShadow = '0 0 0 1px rgba(139, 92, 246, 0.5)';
      }
      card.addEventListener('focusin', () => setActivePreview(i));
      card.addEventListener('click', () => setActivePreview(i));
    }

    // Disable dragging when hovering/clicking on interactive inputs
    card.addEventListener('mousedown', (e) => {
      /** @type {HTMLElement} */
      const target = /** @type {HTMLElement} */ (e.target);
      /** @type {string} */
      const tag = target.tagName;

      if (
        tag === 'INPUT' ||
        tag === 'SELECT' ||
        tag === 'BUTTON' ||
        tag === 'LABEL' ||
        tag === 'IMG' ||
        tag === 'VIDEO'
      ) {
        card.draggable = false;
        card.style.cursor = 'default';
      } else {
        card.draggable = true;
        card.style.cursor = 'grab';
      }
    });

    /** @type {string} */
    const inlinePreviewHtml =
      previewMode === 'inline' && wp.type !== 'web'
        ? `
      <div id="preview-container-${i}" style="margin-bottom: 15px; height: 160px; background: rgba(9, 9, 11, 0.6); border: 1px solid var(--card-border-color); border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative;">
        <span style="color: #a1a1aa;">No preview available</span>
      </div>
    `
        : '';

    /** @type {string} */
    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <strong style="color: #8b5cf6; font-size: 1.2em;">#${i + 1}</strong>
        <div>
          <button class="secondary-btn" style="padding: 2px 8px; margin-right: 5px;" onclick="moveWp(${i}, -1)" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="secondary-btn" style="padding: 2px 8px;" onclick="moveWp(${i}, 1)" ${i === wallpapersList.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
      </div>

      ${inlinePreviewHtml}

      <div class="input-group">
        <label>File / URL</label>
        <input type="text" value="${wp.file || ''}" oninput="validateWpInput(this, 'file')" onchange="updateWp(${i}, 'file', this.value, 'string')">
      </div>
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <div class="input-group" style="flex: 1;">
          <label>Type</label>
          <select onchange="updateWp(${i}, 'type', this.value, 'string')" style="padding: 8px; background: rgba(9, 9, 11, 0.6); color: var(--text-color); border: 1px solid var(--card-border-color); border-radius: 6px;">
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
      <div style="display: flex; gap: 10px; margin-top: 10px; background: rgba(9, 9, 11, 0.3); padding: 10px; border-radius: 6px;">
        <div class="input-group" style="flex: 1;">
          <label>Next on End</label>
          <select onchange="updateWp(${i}, 'nextOnEnd', this.value, 'boolean')" style="padding: 8px; background: rgba(9, 9, 11, 0.6); color: var(--text-color); border: 1px solid var(--card-border-color); border-radius: 6px;">
            <option value="true" ${wp.nextOnEnd === true ? 'selected' : ''}>True</option>
            <option value="false" ${wp.nextOnEnd !== true ? 'selected' : ''}>False</option>
          </select>
        </div>
        <div class="input-group" style="flex: 1;">
          <label>Volume (0.0 to 1.0)</label>
          <input type="number" step="0.1" min="0" max="1" value="${wp.volume !== undefined ? wp.volume : ''}" placeholder="1.0" oninput="validateWpInput(this, 'volume')" onchange="updateWp(${i}, 'volume', this.value, 'number')">
        </div>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 10px; background: rgba(9, 9, 11, 0.3); padding: 10px; border-radius: 6px;">
        <div class="input-group" style="flex: 1;">
          <label>Loop</label>
          <select onchange="updateWp(${i}, 'loop', this.value, 'boolean')" style="padding: 8px; background: rgba(9, 9, 11, 0.6); color: var(--text-color); border: 1px solid var(--card-border-color); border-radius: 6px;">
            <option value="true" ${wp.loop !== false ? 'selected' : ''}>True</option>
            <option value="false" ${wp.loop === false ? 'selected' : ''}>False</option>
          </select>
        </div>
        <div class="input-group" style="flex: 1;">
          <label>Muted</label>
          <select onchange="updateWp(${i}, 'muted', this.value, 'boolean')" style="padding: 8px; background: rgba(9, 9, 11, 0.6); color: var(--text-color); border: 1px solid var(--card-border-color); border-radius: 6px;">
            <option value="true" ${wp.muted !== false ? 'selected' : ''}>True</option>
            <option value="false" ${wp.muted === false ? 'selected' : ''}>False</option>
          </select>
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

    list.appendChild(card);

    // Quick validation on load to ensure existing data is visually correct
    setTimeout(() => {
      /** @type {NodeListOf<HTMLInputElement>} */
      const inputs = card.querySelectorAll('input');
      inputs.forEach((input) => {
        /** @type {string | undefined} */
        const key = input.getAttribute('oninput')?.match(/'([^']+)'/)?.[1];
        if (key) window.validateWpInput(input, key);
      });

      if (previewMode === 'inline') {
        if (wp) {
          updatePreview(i, wp.file || '', wp.type || 'image');
        }
      }
    }, 0);
  }

  setTimeout(() => {
    if (previewMode === 'single') {
      if (activePreviewIndex >= 0 && activePreviewIndex < wallpapersList.length) {
        /** @type {any} */
        const activeWp = wallpapersList[activePreviewIndex];
        if (activeWp) {
          updatePreview(activePreviewIndex, activeWp.file || '', activeWp.type || 'image');
        }
      }
    }
  }, 0);
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
    if (key === 'file') updatePreview(index, '', wallpapersList[index].type || 'image');
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
  } else if (key === 'file') {
    updatePreview(index, finalValue, wallpapersList[index].type || 'image');
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
  target.style.borderColor = '#8b5cf6';
  target.style.borderStyle = 'dashed';
};

/**
 * @param {DragEvent} event
 * @returns {void}
 */
window.handleDragLeave = (event) => {
  /** @type {HTMLElement} */
  const target = /** @type {HTMLElement} */ (event.currentTarget);
  target.style.borderColor = '#27272a';
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
  /** @type {any} */
  const config = await window.electronAPI.loadConfig();
  if (config) {
    ASSETS_PATH = config.ASSETS_PATH;
    envDataObj = parseEnv(config.env);
    wallpapersList = config.wallpapers || [];
    renderEnvForm();
    renderWallpapers();
  }

  /** @type {HTMLElement | null} */
  const topListElement = document.getElementById('top-list');
  if (topListElement) {
    /** @type {HTMLElement} */
    const topControls = document.createElement('div');
    topControls.style.marginBottom = '15px';
    topControls.innerHTML = `
      <label style="color: var(--label-color); font-size: 0.9em; margin-right: 5px; font-weight: bold;">Preview Mode:</label>
      <select onchange="window.togglePreviewMode(this.value)" style="padding: 6px 10px; background: rgba(9, 9, 11, 0.6); color: var(--text-color); border: 1px solid var(--card-border-color); border-radius: 6px; cursor: pointer;">
        <option value="inline" ${previewMode === 'inline' ? 'selected' : ''}>Inline</option>
        <option value="single" ${previewMode === 'single' ? 'selected' : ''}>Top (Sticky)</option>
      </select>
    `;
    topListElement.appendChild(topControls);
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
        refreshAllWallpapers();
      } else {
        msg.innerText = `Build failed! ${result.error}`;
        msg.className = 'error';
      }
    }
  });
};

initApp();
