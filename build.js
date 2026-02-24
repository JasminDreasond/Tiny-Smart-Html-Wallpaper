import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';
import 'dotenv/config';

/**
 * @param {string} filePath
 * @returns {string}
 */
const readJson = (filePath) => readFileSync(filePath, 'utf-8');

/**
 * @returns {Promise<void>}
 */
const buildProject = async () => {
  /** @type {string} */
  const wallpapersData = readJson('./wallpapers.json');

  await esbuild.build({
    entryPoints: ['web/src/index.js'],
    bundle: true,
    minify: true,
    outfile: 'web/dist/bundle.js',
    define: {
      'process.env.ENGINE_MODE': JSON.stringify(process.env.ENGINE_MODE),
      'process.env.SLIDESHOW_ORDER': JSON.stringify(process.env.SLIDESHOW_ORDER),
      'process.env.SLIDESHOW_INTERVAL': JSON.stringify(process.env.SLIDESHOW_INTERVAL),
      'process.env.DEFAULT_DISPLAY': JSON.stringify(process.env.DEFAULT_DISPLAY),
      'process.env.ANIMATIONS_ENABLED': JSON.stringify(process.env.ANIMATIONS_ENABLED),
      'process.env.TRANSITION_DURATION': JSON.stringify(process.env.TRANSITION_DURATION),
      'process.env.DEFAULT_ANIMATION': JSON.stringify(process.env.DEFAULT_ANIMATION),
      'process.env.ANIMATE_FIRST_LOAD': JSON.stringify(process.env.ANIMATE_FIRST_LOAD),
      'process.env.FIXED_CLOCK_INTERVAL': JSON.stringify(process.env.FIXED_CLOCK_INTERVAL),
      'process.env.ON_LIST_CHANGE_ONLY': JSON.stringify(process.env.ON_LIST_CHANGE_ONLY),
      __WALLPAPERS__: wallpapersData,
    },
  });

  console.log(
    `Build finished! Total wallpapers loaded: ${JSON.parse(wallpapersData).length}`,
  );
};

buildProject();
