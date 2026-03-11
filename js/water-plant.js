// ========== Water Plant ==========

import { getSpriteImage } from "./index.js";
import { inventory, addInventory, onInventoryChange, offInventoryChange } from "./index.js";
import { createWindow } from "./index.js";
import { debounce } from "./index.js";
import { playWater } from "./sounds.js";
import { getUpgradeLevel, getPrestigeMultiplier } from "./upgrades.js";


const LERP_SPEED = 12;

let waterGame = null;

function spawnDrop() {
  if (!waterGame) return;
  const areaW = waterGame.canvas.width;
  const x = Math.random() * (areaW - 20);
  waterGame.drops.push({ x, y: -20 });
}

function renderWaterGame(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(0, 0, w, h);

  // Draw drops
  for (const drop of waterGame.drops) {
    const img = getSpriteImage("1f4a7");
    if (img) ctx.drawImage(img, drop.x, drop.y, 20, 20);
  }

  // Draw bucket
  const bucketImg = getSpriteImage("1faa3");
  const bucketWidth = [30, 45, 65, 90][getUpgradeLevel("bucket_size")];
  const bucketY = h - 32;
  if (bucketImg) ctx.drawImage(bucketImg, waterGame.bucketX, bucketY, bucketWidth, 24);
}

function waterLoop(timestamp) {
  if (!waterGame) return;


  const elapsed = waterGame.prevTimestamp ? timestamp - waterGame.prevTimestamp : 16.667;
  waterGame.prevTimestamp = timestamp;

  const areaW = waterGame.area.clientWidth;
  const areaH = waterGame.area.clientHeight;

  // Resize canvas if needed
  if (waterGame.canvas.width !== areaW || waterGame.canvas.height !== areaH) {
    waterGame.canvas.width = areaW;
    waterGame.canvas.height = areaH;
    waterGame.ctx.imageSmoothingEnabled = false;
  }

  const bucketY = areaH - 32;
  const speed = 1;

  // Lerp bucket toward target position
  const dt = elapsed / 1000;
  const diff = waterGame.targetBucketX - waterGame.bucketX;
  if (Math.abs(diff) > 0.5) {
    waterGame.bucketX += diff * Math.min(1, LERP_SPEED * dt);
  } else {
    waterGame.bucketX = waterGame.targetBucketX;
  }

  const bucketWidth = [30, 45, 65, 90][getUpgradeLevel("bucket_size")];

  waterGame.spawnTimer -= elapsed;
  if (waterGame.spawnTimer <= 0) {
    spawnDrop();
    const baseInterval = 2000 + Math.random() * 1500;
    const rainMult = [1.0, 0.6, 0.35, 0.15][getUpgradeLevel("rain_rate")];
    waterGame.spawnTimer = baseInterval * (300 / Math.max(areaW, 100)) * rainMult;
  }

  for (let i = waterGame.drops.length - 1; i >= 0; i--) {
    const drop = waterGame.drops[i];
    drop.y += speed * (elapsed / 16.667);

    if (drop.y + 20 >= bucketY && drop.y <= bucketY + 24) {
      if (drop.x + 10 >= waterGame.bucketX && drop.x + 10 <= waterGame.bucketX + bucketWidth) {
        waterGame.drops.splice(i, 1);
        const doubleCatchLevel = getUpgradeLevel("double_catch");
        let waterAmount = [1, 2, 3, 4][doubleCatchLevel];
        const luckyLevel = getUpgradeLevel("lucky_drops");
        const luckyChance = [0, 0.1, 0.2, 0.3][luckyLevel];
        if (Math.random() < luckyChance) waterAmount += 3;
        addInventory("water", waterAmount * getPrestigeMultiplier());
        playWater();
        continue;
      }
    }

    if (drop.y > areaH) {
      waterGame.drops.splice(i, 1);
    }
  }

  // Render
  renderWaterGame(waterGame.ctx, waterGame.canvas.width, waterGame.canvas.height);

  waterGame.animationId = requestAnimationFrame(waterLoop);
}

function stopWaterPlant() {
  if (!waterGame) return;
  if (waterGame.animationId) cancelAnimationFrame(waterGame.animationId);
  offInventoryChange(waterGame.inventoryListener);
  waterGame = null;
}

export function launchWaterPlant() {
  const body = document.createElement("div");
  body.className = "water-app";

  const area = document.createElement("div");
  area.className = "water-area";

  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.imageRendering = "pixelated";
  area.appendChild(canvas);

  body.appendChild(area);

  // Slider control below the game area
  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "water-slider";
  slider.min = 0;
  slider.max = 1000;
  slider.value = 500;
  body.appendChild(slider);

  const entry = createWindow("water-plant", "Water Plant", body, {
    width: 300,
    height: 350,
    icon: "icons/water-plant.svg",
    onClose: stopWaterPlant,
    minWidth: 200,
    minHeight: 200,
  });

  if (!entry) return;

  const statusBar = document.createElement("div");
  statusBar.className = "status-bar";
  statusBar.innerHTML = `<p class="status-bar-field">Water supply: ${inventory.water}</p>`;
  entry.element.appendChild(statusBar);

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const areaW = area.clientWidth || 260;
  const areaH = area.clientHeight || 260;
  canvas.width = areaW;
  canvas.height = areaH;

  const startX = areaW / 2 - 15;
  waterGame = {
    area,
    canvas,
    ctx,
    bucketX: startX,
    targetBucketX: startX,
    slider,
    drops: [],
    spawnTimer: 0,
    animationId: null,
    prevTimestamp: 0,
    statusBar,
  };

  slider.addEventListener("input", () => {
    if (!waterGame) return;
    const areaW = waterGame.canvas.width;
    const bw = [30, 45, 65, 90][getUpgradeLevel("bucket_size")];
    waterGame.targetBucketX = (slider.value / 1000) * (areaW - bw);
  });

  entry.onResize = debounce(() => {
    if (!waterGame) return;
    const areaW = waterGame.area.clientWidth;
    const bw = [30, 45, 65, 90][getUpgradeLevel("bucket_size")];
    waterGame.bucketX = Math.min(waterGame.bucketX, areaW - bw);
    waterGame.targetBucketX = Math.min(waterGame.targetBucketX, areaW - bw);
    waterGame.slider.value = (waterGame.targetBucketX / (areaW - bw)) * 1000;
  }, 100);

  waterGame.inventoryListener = () => {
    statusBar.querySelector(".status-bar-field").textContent = `Water supply: ${inventory.water}`;
  };
  onInventoryChange(waterGame.inventoryListener);

  waterGame.animationId = requestAnimationFrame(waterLoop);
}
