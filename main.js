import { app, BrowserWindow, ipcMain } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { runBuild } from './build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @returns {Promise<void>}
 */
const createWindow = async () => {
  /** @type {BrowserWindow} */
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadFile('gui/index.html');
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('load-config', async () => {
  try {
    /** @type {string} */
    const envData = await readFile('.env', 'utf-8');
    /** @type {string} */
    const wpData = await readFile('wallpapers.json', 'utf-8');

    return {
      env: envData,
      wallpapers: JSON.parse(wpData),
    };
  } catch (error) {
    console.error('Error reading configs:', error);
    return null;
  }
});

ipcMain.handle('save-and-build', async (event, data) => {
  try {
    await writeFile('.env', data.env);
    await writeFile('wallpapers.json', JSON.stringify(data.wallpapers, null, 2));

    /** @type {any} */
    const dotenv = await import('dotenv');
    dotenv.config({ override: true });

    await runBuild();
    return { success: true };
  } catch (error) {
    console.error('Build failed:', error);
    return { success: false, error: String(error) };
  }
});
