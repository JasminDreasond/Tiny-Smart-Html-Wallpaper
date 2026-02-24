/**
 * @typedef {Object} Wallpaper
 * @property {string} file
 * @property {string} [display]
 * @property {string | null} [time]
 * @property {string | null} [date]
 */

/** @type {Wallpaper[]} */
const wallpapers = __WALLPAPERS__;
/** @type {number} */
let currentIndex = 0;

/**
 * @returns {string}
 */
const getCurrentDateStr = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
};

/**
 * @returns {string}
 */
const getCurrentTimeStr = () => {
    const date = new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * @param {Wallpaper[]} list
 * @returns {Wallpaper | undefined}
 */
const findPriorityWallpaper = (list) => {
    const today = getCurrentDateStr();
    const now = getCurrentTimeStr();

    return list.find(wp => wp.date === today || wp.time === now);
};

/**
 * @param {Wallpaper} wallpaper
 * @returns {void}
 */
const renderWallpaper = (wallpaper) => {
    const container = document.getElementById('wallpaper-container');
    const displayMode = wallpaper.display || process.env.DEFAULT_DISPLAY;

    container.style.backgroundImage = `url('../assets/${wallpaper.file}')`;
    container.className = `display-${displayMode}`;
};

/**
 * @returns {void}
 */
const updateWallpaper = () => {
    const priorityWp = findPriorityWallpaper(wallpapers);

    if (priorityWp) {
        renderWallpaper(priorityWp);
        return;
    }

    if (process.env.ENGINE_MODE === 'single') {
        renderWallpaper(wallpapers[0]);
        return;
    }

    if (process.env.SLIDESHOW_ORDER === 'random') {
        const randomIndex = Math.floor(Math.random() * wallpapers.length);
        renderWallpaper(wallpapers[randomIndex]);
    } else {
        renderWallpaper(wallpapers[currentIndex]);
        currentIndex = (currentIndex + 1) % wallpapers.length;
    }
};

/**
 * @returns {void}
 */
const initEngine = () => {
    updateWallpaper();
    const interval = parseInt(process.env.SLIDESHOW_INTERVAL, 10) || 60000;
    setInterval(updateWallpaper, interval);
};

initEngine();