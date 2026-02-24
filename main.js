import { app, BrowserWindow, ipcMain } from 'electron';
import { platform } from 'os';
import { readFile, writeFile, copyFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runBuild } from './build.js';
import { configFolderName } from './folders.js';

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
  } else {
    workDir = process.cwd();
    execDir = workDir;
  }
};

/**
 * @returns {Promise<void>}
 */
const createWindow = async () => {
  const icon = path.join(__dirname, 'favicon/icon.png');

  /** @type {BrowserWindow} */
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    backgroundColor: '#1e1e2e',
    icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (platform() === 'win32')
    win.setAppDetails({
      appId: 'smart-html-wallpaper-engine',
      appIconPath: icon,
      relaunchDisplayName: 'Smart Html Wallpaper Configurator',
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
    const cfgFolder = path.join(workDir, configFolderName);
    const envFile = path.join(cfgFolder, '.env');
    const wpFile = path.join(cfgFolder, 'wallpapers.json');

    /** @type {boolean} */
    const envExists = existsSync(envFile);

    if (!envExists) {
      /** @type {string} */
      const examplePath = path.join(execDir ?? app.getAppPath(), 'example.env');
      /** @type {boolean} */
      const exampleExists = existsSync(examplePath);

      if (exampleExists) {
        await copyFile(examplePath, envFile);
      } else {
        console.warn('example.env not found! Creating an empty .env file.');
        await writeFile(envFile, '');
      }
    }

    /** @type {boolean} */
    const wpExists = existsSync(wpFile);
    if (!wpExists) {
      await writeFile(wpFile, '[]');
    }

    /** @type {string} */
    const envData = await readFile(envFile, 'utf-8');
    /** @type {string} */
    const wpData = await readFile(wpFile, 'utf-8');

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
    const cfgFolder = path.join(workDir, configFolderName);
    const envFile = path.join(cfgFolder, '.env');
    const srcFolder = path.join(cfgFolder, '/src/');

    await writeFile(envFile, data.env);
    await writeFile(
      path.join(cfgFolder, 'wallpapers.json'),
      JSON.stringify(data.wallpapers, null, 2),
    );

    const esbuild = await import(
      app.isPackaged
        ? path.join(execDir, '../app.asar.unpacked/node_modules/esbuild-wasm/lib/main.js')
        : 'esbuild'
    );

    /** @type {any} */
    const dotenv = await import('dotenv');
    dotenv.config({ override: true, path: envFile });

    if (!existsSync(srcFolder)) mkdirSync(srcFolder);
    await copyFile(path.join(execDir, '/web/src/index.js'), path.join(srcFolder, 'index.js'));
    await copyFile(path.join(execDir, '/web/src/style.css'), path.join(srcFolder, 'style.css'));

    await runBuild(cfgFolder, esbuild, srcFolder);
    return { success: true };
  } catch (error) {
    console.error('Build failed:', error);
    return { success: false, error: String(error) };
  }
});
