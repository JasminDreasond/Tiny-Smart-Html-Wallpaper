# 🌟 Smart Wallpaper Engine

A highly customizable, lightweight Node.js wallpaper engine built with esbuild. Set up your wallpapers to change based on specific times, dates, or just let them loop in a beautiful slideshow!

## 🚀 How to Use

1. **Install dependencies:**
   Run `npm install` in the root folder.

2. **Configure the Engine:**
   Open the `.env` file to set your global preferences, like slideshow interval and default display mode.

3. **Set your Wallpapers:**
   Drop your images into `web/assets/` and register them in `wallpapers.json`. You can set specific dates (like `"12-25"` for Christmas) or times (like `"08:00"`).

4. **Build the Web App:**
   Run `npm run build`. The esbuild will bundle everything into a super fast, static file.

5. **Run it:**
   Just open `web/index.html` in your browser or point your desktop wallpaper engine to this file!

## 🎨 Display Modes Available
- `scaled_cropped`: Fills the screen perfectly, keeping it centered.
- `scaled`: Fits the entire image inside the screen.
- `cropped`: Original size, but centered.
- `normal`: Stretches to fit the screen bounds.
- `tiled`: Repeats the image across the screen.

Enjoy your new dynamic desktop!