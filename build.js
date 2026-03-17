import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import 'dotenv/config';

/**
 * @param {string} filePath
 * @returns {string}
 */
const readText = (filePath) => readFileSync(filePath, 'utf-8');

/**
 * @param {string} [root='./']
 * @param {string} [srcFolder]
 * @returns {Promise<void>}
 */
export const runBuild = async (root = './', es = esbuild, srcFolder = './web/src/') => {
  const distDir = path.join(root, 'dist');
  if (!existsSync(distDir)) mkdirSync(distDir);

  /** @type {string} */
  const wallpapersData = readText(path.join(root, 'wallpapers.json'));

  await es.build({
    entryPoints: [path.join(srcFolder, 'index.js')],
    bundle: true,
    minify: true,
    outfile: path.join(distDir, 'bundle.js'),
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
      'process.env.ASSETS_PATH': JSON.stringify(process.env.ASSETS_PATH || '../assets/'),
      __WALLPAPERS__: wallpapersData,
    },
  });

  /** @type {string} */
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Html Wallpaper Engine</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="layer-container"></div>
    <script src="bundle.js"></script>
</body>
</html>`;

  writeFileSync(path.join(distDir, 'index.html'), htmlContent);

  /** @type {string} */
  const cssContent = readText(path.join(srcFolder, 'style.css'));
  writeFileSync(path.join(distDir, 'style.css'), cssContent);

  console.log(
    `Build finished successfully in "${distDir}" folder!\nTotal wallpapers loaded: ${JSON.parse(wallpapersData).length}`,
  );
};

if (process.argv[1] && process.argv[1].endsWith('build.js')) {
  runBuild();
}
