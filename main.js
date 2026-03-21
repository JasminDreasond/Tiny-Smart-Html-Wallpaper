import { app, ipcMain, dialog } from 'electron';
import { readFile, writeFile, copyFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { TinyElectronRoot } from 'tiny-electron-essentials/main';
import { RootEvents } from 'tiny-electron-essentials/global';

import { runBuild } from './build.js';
import { configFolderName } from './folders.js';
import { parseEnv } from './global/utils.js';
import { ensureDirectoryExists } from './global/folderUtils.js';

/**
 * Configures Ozone flags for Wayland support if requested
 * @param {string[]} argv
 * @returns {void}
 */
const setupWaylandFlags = (argv) => {
  if (process.env.IS_WAYLAND === 'true' || argv.includes('--wayland')) {
    // Enable Wayland support and hardware acceleration
    app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform');
    app.commandLine.appendSwitch('ozone-platform', 'wayland');
    app.commandLine.appendSwitch('enable-gpu-rasterization');
  }
};

setupWaylandFlags(process.argv);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let workDir = '';
let execDir = '';

// Start Electron root
const root = new TinyElectronRoot({
  minimizeOnClose: false,
  pathBase: path.join(__dirname, 'gui'),
  iconFolder: path.join(__dirname, 'favicon'),
  icon: 'icon',
  appId: 'smart-html-wallpaper-engine',
  appDataName: 'smart-html-wallpaper-engine',
  title: 'Smart Html Wallpaper Configurator',
});

// Fix windows OS
root.installWinProtection();

root.initAppDataDir();
const tempFolder = root.initAppDataDir('temp');
const initFile = path.join(tempFolder, 'init.json');

/**
 * @param {string} envData
 * @returns {string}
 */
const getAssetsPath = (envData) => {
  let ASSETS_PATH = path.join(`${workDir}${!workDir.trim().endsWith('/') ? '/' : ''}`);
  const env = parseEnv(envData);

  ASSETS_PATH = path.join(ASSETS_PATH, configFolderName, 'dist');
  if (
    typeof env.ASSETS_PATH === 'string' &&
    (env.ASSETS_PATH.startsWith('../') ||
      env.ASSETS_PATH.startsWith('./') ||
      env.ASSETS_PATH.startsWith('/'))
  )
    ASSETS_PATH = path.join(ASSETS_PATH, env.ASSETS_PATH);

  return ASSETS_PATH;
};

const getCfgs = () => {
  const cfgFolder = path.join(workDir, configFolderName);
  const envFile = path.join(cfgFolder, '.env');
  const wpFile = path.join(cfgFolder, 'wallpapers.json');
  const defaultAssets = path.join(cfgFolder, '/assets/');
  const srcFolder = path.join(cfgFolder, '/src/');

  return { cfgFolder, envFile, wpFile, srcFolder, defaultAssets };
};

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
  const win = root.createWindow({
    config: {
      width: 1000,
      height: 800,
      backgroundColor: '#1e1e2e',
      icon: root.getIcon(),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
    fileId: initFile,
    isMain: true,
  });

  win.loadPath('index.html');

  ipcMain.on('toggle-fullscreen', () => {
    if (win) {
      /** @type {boolean} */
      const isFullScreen = win.getWin().isFullScreen();
      win.getWin().setFullScreen(!isFullScreen);
    }
  });

  ipcMain.on('exit-fullscreen', () => {
    if (win) {
      win.getWin().setFullScreen(false);
    }
  });
};

setupWorkingDirectory();

// Ready to first window
root.on(RootEvents.CreateFirstWindow, createWindow);

ipcMain.handle('load-config', async () => {
  const { envFile, wpFile, defaultAssets } = getCfgs();
  let currentTarget = '';

  try {
    currentTarget = envFile;
    /** @type {boolean} */
    const envExists = existsSync(envFile);

    if (!envExists) {
      /** @type {string} */
      const examplePath = path.join(execDir ?? app.getAppPath(), 'example.env');
      /** @type {boolean} */
      const exampleExists = existsSync(examplePath);

      if (exampleExists) {
        await copyFile(examplePath, envFile);
        const exampleFile = (await readFile(envFile, 'utf-8'))
          .replace('# ASSETS_PATH="../web/assets/"', 'ASSETS_PATH="../assets/"')
          .replace('#ASSETS_PATH="../web/assets/"', 'ASSETS_PATH="../assets/"');
        await writeFile(envFile, exampleFile);
      } else {
        console.warn('example.env not found! Creating an empty .env file.');
        await writeFile(envFile, '');
      }
    }

    currentTarget = wpFile;
    /** @type {boolean} */
    const wpExists = existsSync(wpFile);
    if (!wpExists) {
      await writeFile(wpFile, '[]');
    }

    currentTarget = defaultAssets;
    await ensureDirectoryExists(defaultAssets);

    currentTarget = 'Config Files (Reading)';
    /** @type {string} */
    const envData = await readFile(envFile, 'utf-8');
    /** @type {string} */
    const wpData = await readFile(wpFile, 'utf-8');

    return {
      ASSETS_PATH: getAssetsPath(envData),
      env: envData,
      wallpapers: JSON.parse(wpData),
    };
  } catch (error) {
    console.error('Error handling default configs:', error);
    dialog.showErrorBox(
      'Initialization Error',
      `Failed to create or access necessary default files.\n\nTarget: ${currentTarget}\nError: ${String(error)}\n\nThe application will be closed.`,
    );
    app.exit(1);
    return null;
  }
});

ipcMain.handle('save-and-build', async (event, data) => {
  try {
    const { envFile, cfgFolder, wpFile, srcFolder } = getCfgs();

    await writeFile(envFile, data.env);
    await writeFile(wpFile, JSON.stringify(data.wallpapers, null, 2));

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

// Init app
root.init();
