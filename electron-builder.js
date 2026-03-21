const isWayland = process.env.IS_WAYLAND === 'true';
const platformSuffix = isWayland ? 'wayland' : 'x11';

const fileName = 'smart-html-wallpaper-config';

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: "com.jasmindreasond.smarthtmlwallpaper",
    productName: "Smart Html Wallpaper Configurator",
    copyright: `Copyright © 2026 \${author}`,
    directories: {
      output: "release/"
    },
    files: [
      "example.env",
      "wallpapers-example.json",
      "folders.js",
      "main.js",
      "preload.js",
      "build.js",
      "gui/**/*",
      "favicon/**/*",
      "global/**/*",
      "web/src/**/*",
      "node_modules/**/*"
    ],
    asarUnpack: [
      "node_modules/esbuild/**/*",
      "node_modules/@esbuild/**/*",
      "node_modules/esbuild-wasm/**/*"
    ],
    mac: {
      category: "public.app-category.utilities",
      icon: "favicon/icon.icns",
      target: [
        "dmg"
      ]
    },
    win: {
      icon: "favicon/icon.ico",
      target: [
        "nsis"
      ]
    },
    linux: {
      icon: "favicon/icon.png",
      // Custom name: ${fileName}-${version}-${arch}-${platform}.AppImage
      artifactName: `${fileName}-\${version}-\${arch}-${platformSuffix}.\${ext}`,
      category: "Utility",
      executableName: `${fileName}-${platformSuffix}`,
      target: [
        "AppImage"
      ],
      category: "Utility"
    },
    nsis: {
      oneClick: false,
      artifactName: `${fileName}-setup-\${version}.\${ext}`,
      allowToChangeInstallationDirectory: true
    }
};

export default config;
