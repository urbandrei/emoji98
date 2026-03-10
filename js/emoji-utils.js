// ========== Emoji Pixelation ==========

const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/";

const PET_CODEPOINTS = [
  "1f600", // happy
  "1f610", // neutral :|
  "1f622", // sad
  "1f621", // angry
  "1f60a", // pleased
  "1f354", // hamburger (food)
  "1f4a7", // water droplet
  "26bd",  // soccer ball (play + factory)
  "1f331", // seedling (farm)
  "1f33f", // herb (farm)
  "1f33e", // rice/wheat (farm)
  "1faa3", // bucket (water plant)
  "1f986", // rubber duck (factory)
  "1fa81", // kite (factory)
  "274c",  // cross mark (factory miss)
  "2705",  // check mark (factory collect)
  "1f480", // skull (dead pet)
];

const PIXEL_RES = 14;
const pixelCache = {};

function quantizeColor(r, g, b) {
  r = Math.round(r / 85) * 85;
  g = Math.round(g / 85) * 85;
  b = Math.round(b / 85) * 85;
  return [r, g, b];
}

export function pixelateEmoji(codepoint) {
  return new Promise((resolve) => {
    if (pixelCache[codepoint]) {
      resolve(pixelCache[codepoint]);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = PIXEL_RES;
      canvas.height = PIXEL_RES;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, PIXEL_RES, PIXEL_RES);

      const imageData = ctx.getImageData(0, 0, PIXEL_RES, PIXEL_RES);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 128) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        } else {
          const [r, g, b] = quantizeColor(data[i], data[i + 1], data[i + 2]);
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      pixelCache[codepoint] = dataUrl;
      resolve(dataUrl);
    };
    img.onerror = function () {
      resolve(TWEMOJI_BASE + codepoint + ".svg");
    };
    img.src = TWEMOJI_BASE + codepoint + ".svg";
  });
}

export function preloadEmojis() {
  return Promise.all(PET_CODEPOINTS.map((cp) => pixelateEmoji(cp)));
}

export function pixelateWallpaper() {
  const WALLPAPER_URL = "https://upload.wikimedia.org/wikipedia/en/2/27/Bliss_%28Windows_XP%29.png";
  document.getElementById("desktop").style.backgroundImage = `url(${WALLPAPER_URL})`;
}
