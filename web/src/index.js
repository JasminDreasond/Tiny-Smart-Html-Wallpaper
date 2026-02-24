/**
 * @typedef {Object} Wallpaper
 * @property {string} file
 * @property {"image"|"video"|"web"} type
 * @property {string} [display]
 * @property {string | null} [time]
 * @property {string | null} [date]
 * @property {boolean} [muted]
 * @property {number} [volume]
 * @property {string} [animation]
 * @property {number} [weight]
 */

/** @type {Wallpaper[]} */
const wallpapers = __WALLPAPERS__;
/** @type {number} */
let currentIndex = 0;
/** @type {boolean} */
let isFirstLoad = true;
/** @type {Wallpaper | null} */
let lastShownWallpaper = null;

/**
 * @returns {string}
 */
const getCurrentDateStr = () => {
  /** @type {Date} */
  const date = new Date();
  /** @type {string} */
  const month = String(date.getMonth() + 1).padStart(2, '0');
  /** @type {string} */
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
};

/**
 * @returns {string}
 */
const getCurrentTimeStr = () => {
  /** @type {Date} */
  const date = new Date();
  /** @type {string} */
  const hours = String(date.getHours()).padStart(2, '0');
  /** @type {string} */
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * @param {string} timeStr
 * @returns {number}
 */
const timeToMinutes = (timeStr) => {
  /** @type {string[]} */
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

/**
 * @param {string} range
 * @param {string} current
 * @returns {boolean}
 */
const isTimeInRange = (range, current) => {
  if (!range.includes('-')) {
    return range === current;
  }

  /** @type {string[]} */
  const limits = range.split('-');
  /** @type {number} */
  const start = timeToMinutes(limits[0]);
  /** @type {number} */
  const end = timeToMinutes(limits[1]);
  /** @type {number} */
  const now = timeToMinutes(current);

  if (start <= end) {
    return now >= start && now <= end;
  }

  return now >= start || now <= end;
};

/**
 * @param {Wallpaper[]} list
 * @returns {Wallpaper[]}
 */
const findPriorityWallpaper = (list) => {
  /** @type {string} */
  const today = getCurrentDateStr();
  /** @type {string} */
  const now = getCurrentTimeStr();

  return list.filter((wp) => {
    /** @type {boolean} */
    const isDateMatch = wp.date === today;
    /** @type {boolean} */
    const isTimeMatch = wp.time ? isTimeInRange(wp.time, now) : true;

    return isDateMatch || isTimeMatch;
  });
};

/**
 * @param {Wallpaper[]} list
 * @returns {Wallpaper}
 */
const getRandomWallpaper = (list) => {
  /** @type {number} */
  let totalWeight = 0;

  /** @type {number} */
  let i = 0;
  for (i = 0; i < list.length; i++) {
    /** @type {Wallpaper} */
    const wp = list[i];
    /** @type {number} */
    const w = wp.weight !== undefined ? wp.weight : 1;
    totalWeight += w;
  }

  /** @type {number} */
  let randomVal = Math.random() * totalWeight;

  /** @type {number} */
  let j = 0;
  for (j = 0; j < list.length; j++) {
    /** @type {Wallpaper} */
    const wp = list[j];
    /** @type {number} */
    const w = wp.weight !== undefined ? wp.weight : 1;

    if (randomVal < w) {
      return wp;
    }
    randomVal -= w;
  }

  return list[0];
};

/**
 * @param {Wallpaper} wp
 * @returns {HTMLElement}
 */
const createMediaElement = (wp) => {
  /** @type {HTMLElement} */
  let el;
  /** @type {string} */
  const displayMode = wp.display || process.env.DEFAULT_DISPLAY;
  /** @type {string} */
  const source = wp.type === 'web' ? wp.file : `./assets/${wp.file}`;

  if (wp.type === 'video') {
    el = document.createElement('video');
    el.src = source;
    el.autoplay = true;
    el.loop = true;
    el.muted = wp.muted !== undefined ? wp.muted : true;
    el.volume = wp.volume !== undefined ? wp.volume : 1.0;
  } else if (wp.type === 'web') {
    el = document.createElement('iframe');
    el.src = source;
  } else {
    el = document.createElement('div');
    el.style.backgroundImage = `url('${source}')`;
  }

  el.classList.add('media-layer', `display-${displayMode}`);
  return el;
};

/**
 * @param {Wallpaper} wallpaper
 * @returns {void}
 */
const renderWallpaper = (wallpaper) => {
  /** @type {HTMLElement | null} */
  const container = document.getElementById('layer-container');
  if (!container) return;

  /** @type {HTMLElement} */
  const newLayer = createMediaElement(wallpaper);

  /** @type {boolean} */
  const animationsEnabled = process.env.ANIMATIONS_ENABLED === 'true';
  /** @type {string} */
  const transitionTime = process.env.TRANSITION_DURATION || '1000';
  /** @type {string} */
  const animType = wallpaper.animation || process.env.DEFAULT_ANIMATION;

  /** @type {boolean} */
  const shouldAnimate =
    animationsEnabled && (!isFirstLoad || process.env.ANIMATE_FIRST_LOAD === 'true');

  if (shouldAnimate) {
    newLayer.style.setProperty('--transition-time', `${transitionTime}ms`);
    newLayer.classList.add(`anim-${animType}`);
  } else {
    newLayer.classList.add('anim-none');
  }

  container.appendChild(newLayer);

  /** @type {NodeListOf<Element>} */
  const oldLayers = container.querySelectorAll('.media-layer:not(:last-child)');

  if (oldLayers.length > 0) {
    setTimeout(
      () => {
        oldLayers.forEach((layer) => layer.remove());
      },
      parseInt(transitionTime, 10),
    );
  }

  isFirstLoad = false;
};

/**
 * @returns {void}
 */
const updateWallpaper = () => {
  /** @type {Wallpaper[]} */
  const priorityWps = findPriorityWallpaper(wallpapers);

  if (priorityWps.length === 0) return;

  if (process.env.ENGINE_MODE === 'single') {
    if (isFirstLoad) {
      lastShownWallpaper = priorityWps[0];
      renderWallpaper(lastShownWallpaper);
    }
    return;
  }

  if (process.env.SLIDESHOW_ORDER === 'random') {
    /** @type {Wallpaper} */
    const randomWp = getRandomWallpaper(priorityWps);
    lastShownWallpaper = randomWp;
    renderWallpaper(randomWp);
  } else {
    if (lastShownWallpaper !== null) {
      /** @type {number} */
      const lastIndex = priorityWps.findIndex((wp) => wp.file === lastShownWallpaper.file);

      if (lastIndex !== -1) {
        currentIndex = (lastIndex + 1) % priorityWps.length;
      } else {
        currentIndex = currentIndex % priorityWps.length;
      }
    }

    /** @type {Wallpaper} */
    const nextWp = priorityWps[currentIndex];
    lastShownWallpaper = nextWp;
    renderWallpaper(nextWp);

    currentIndex = (currentIndex + 1) % priorityWps.length;
  }
};

/**
 * @returns {void}
 */
const initEngine = () => {
  updateWallpaper();
  if (process.env.ENGINE_MODE === 'slideshow') {
    /** @type {number} */
    const interval = parseInt(process.env.SLIDESHOW_INTERVAL, 10) || 60000;
    setInterval(updateWallpaper, interval);
  }
};

initEngine();
