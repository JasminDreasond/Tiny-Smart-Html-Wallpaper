import * as esbuild from 'esbuild';
import { readFileSync, cpSync } from 'fs';
import 'dotenv/config';

/**
 * @param {string} filePath
 * @returns {string}
 */
const readJson = (filePath) => readFileSync(filePath, 'utf-8');

/**
 * @returns {void}
 */
const buildProject = async () => {
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
            '__WALLPAPERS__': wallpapersData
        }
    });

    console.log('Build finished successfully!');
};

buildProject();