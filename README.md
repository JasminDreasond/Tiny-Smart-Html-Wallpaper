# 🌟 Smart Wallpaper Engine

A highly customizable, lightweight Node.js wallpaper engine built with esbuild. Set up your wallpapers to change based on specific times, dates, and enjoy beautiful transitions between images, videos, and web pages!

- **Media Support**: Load images, videos (with volume control), and web pages (iframes).
- **Animations**: Configurable transitions (`fade`, `slide_left`, `slide_right`, `zoom_in`).
- **Scheduling**: Priority wallpapers for specific times or dates.

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

## 🛠️ Configuration

### Global Settings (`.env`)
- `ANIMATIONS_ENABLED`: Set to "true" to enable transitions.
- `TRANSITION_DURATION`: Time in milliseconds.
- `ANIMATE_FIRST_LOAD`: If "true", the very first wallpaper will also animate in.

### Advanced Timing Triggers (`.env`)
You can control exactly WHEN the engine checks for the next wallpaper:
- `SLIDESHOW_INTERVAL`: Standard interval in milliseconds (e.g., `60000` for 1 minute).
- `FIXED_CLOCK_INTERVAL`: Set to perfectly sync with the clock (e.g., `"01:30"` checks exactly every 1 hour and 30 minutes from the start of the day). Both intervals can run simultaneously!
- `ON_LIST_CHANGE_ONLY`: If set to `"true"`, it disables all intervals above. The engine will check quietly every minute in the background, and will ONLY animate and update the screen if a wallpaper enters or leaves the active time/date range.

### Individual Settings (`wallpapers.json`)
You can define specific properties for each wallpaper:
- `type`: Must be `"image"`, `"video"`, or `"web"`.
- `time`: Set an exact time (`"15:00"`) or a time range (`"21:00-03:00"`). It handles midnight crossings automatically!
- `date`: Set a specific date (`"12-25"`).
- `muted`: Boolean (video only).
- `volume`: 0.0 to 1.0 (video only).
- `animation`: Overrides the global default animation.
- `weight`: Number to define random probability. Default is 1. A weight of 10 means it's 10x more likely to appear.

### 🖥️ Tested Environments

We want to ensure your dynamic wallpapers run perfectly! Currently, this project has been personally tested and works on:

* [HTML Wallpaper (KDE Store)](https://store.kde.org/p/1324580)

Enjoy your new dynamic desktop!