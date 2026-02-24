import { app, BrowserWindow, ipcMain } from 'electron';
import { readFile, writeFile, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runBuild } from './build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let workDir;
let execDir;

/**
 * @returns {void}
 */
const setupWorkingDirectory = () => {
  if (app.isPackaged) {
    if (process.platform === 'linux' && process.env.APPIMAGE) {
      workDir = path.dirname(process.env.APPIMAGE);
      execDir = path.dirname(app.getPath('exe'));
    } else if (process.platform === 'darwin') {
      workDir = path.resolve(app.getPath('exe'), '../../..');
      execDir = workDir;
    } else {
      workDir = path.dirname(app.getPath('exe'));
      execDir = workDir;
    }

    execDir = path.join(execDir, './resources/app.asar/');
  }
};

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

setupWorkingDirectory();
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('load-config', async () => {
  try {
    /** @type {boolean} */
    const envExists = existsSync('.env');

    if (!envExists) {
      /** @type {string} */
      const examplePath = path.join(execDir ?? app.getAppPath(), 'example.env');
      /** @type {boolean} */
      const exampleExists = existsSync(examplePath);

      if (exampleExists) {
        await copyFile(examplePath, '.env');
      } else {
        console.warn('example.env not found! Creating an empty .env file.');
        await writeFile('.env', '');
      }
    }

    /** @type {boolean} */
    const wpExists = existsSync('wallpapers.json');
    if (!wpExists) {
      await writeFile('wallpapers.json', '[]');
    }

    /** @type {string} */
    const envData = await readFile('.env', 'utf-8');
    /** @type {string} */
    const wpData = await readFile('wallpapers.json', 'utf-8');

    return {
      env: envData,
      wallpapers: JSON.parse(wpData),
    };
  } catch (error) {
    console.error('Error reading or creating configs:', error);
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
