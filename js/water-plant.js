// ========== Water Plant ==========

import { pixelateEmoji } from "./index.js";
import { inventory, addInventory, onInventoryChange, offInventoryChange } from "./index.js";
import { createWindow } from "./index.js";
import { debounce } from "./index.js";
import { playWater } from "./sounds.js";
import { getUpgradeLevel, getPrestigeMultiplier } from "./upgrades.js";
import { isWindowActive, isWindowMinimized } from "./window-manager.js";

const LERP_SPEED = 12;

let waterGame = null;

async function spawnDrop() {
  if (!waterGame) return;
  const area = waterGame.area;
  const areaW = area.clientWidth;
  const dropEl = document.createElement("img");
  dropEl.className = "water-drop";
  const src = await pixelateEmoji("1f4a7");
  dropEl.src = src;
  dropEl.draggable = false;
  const x = Math.random() * (areaW - 20);
  dropEl.style.left = x + "px";
  dropEl.style.top = "-20px";
  area.appendChild(dropEl);
  waterGame.drops.push({ el: dropEl, x, y: -20 });
}

function waterLoop(timestamp) {
  if (!waterGame) return;

  // Pause logic
  const minimized = isWindowMinimized("water-plant");
  const active = isWindowActive("water-plant");
  const shouldPause = minimized
    ? getUpgradeLevel("active_minimized") < 1
    : (!active && getUpgradeLevel("active_deselected") < 1);
  if (shouldPause) {
    waterGame.prevTimestamp = 0;
    waterGame.animationId = requestAnimationFrame(waterLoop);
    return;
  }

  const elapsed = waterGame.prevTimestamp ? timestamp - waterGame.prevTimestamp : 16.667;
  waterGame.prevTimestamp = timestamp;

  const areaH = waterGame.area.clientHeight;
  const areaW = waterGame.area.clientWidth;
  const bucketY = areaH - 32;
  const speed = 2;

  // Lerp bucket toward target position
  const dt = elapsed / 1000;
  const diff = waterGame.targetBucketX - waterGame.bucketX;
  if (Math.abs(diff) > 0.5) {
    waterGame.bucketX += diff * Math.min(1, LERP_SPEED * dt);
  } else {
    waterGame.bucketX = waterGame.targetBucketX;
  }
  waterGame.bucketImg.style.left = waterGame.bucketX + "px";

  // Apply bucket width from upgrade
  const bucketWidth = [30, 45, 65, 90][getUpgradeLevel("bucket_size")];
  waterGame.bucketImg.style.width = bucketWidth + "px";

  waterGame.spawnTimer -= elapsed;
  if (waterGame.spawnTimer <= 0) {
    spawnDrop();
    const baseInterval = 800 + Math.random() * 700;
    const rainMult = [1.0, 0.65, 0.4, 0.2][getUpgradeLevel("rain_rate")];
    waterGame.spawnTimer = baseInterval * (300 / Math.max(areaW, 100)) * rainMult;
  }

  for (let i = waterGame.drops.length - 1; i >= 0; i--) {
    const drop = waterGame.drops[i];
    drop.y += speed * (elapsed / 16.667);
    drop.el.style.top = drop.y + "px";

    if (drop.y + 20 >= bucketY && drop.y <= bucketY + 24) {
      if (drop.x + 10 >= waterGame.bucketX && drop.x + 10 <= waterGame.bucketX + bucketWidth) {
        drop.el.remove();
        waterGame.drops.splice(i, 1);
        // Double Catch: extra water per drop
        const doubleCatchLevel = getUpgradeLevel("double_catch");
        let waterAmount = [1, 2, 3, 4][doubleCatchLevel];
        // Lucky Drops: chance for bonus 3 water
        const luckyLevel = getUpgradeLevel("lucky_drops");
        const luckyChance = [0, 0.1, 0.2, 0.3][luckyLevel];
        if (Math.random() < luckyChance) waterAmount += 3;
        addInventory("water", waterAmount * getPrestigeMultiplier());
        playWater();
        continue;
      }
    }

    if (drop.y > areaH) {
      drop.el.remove();
      waterGame.drops.splice(i, 1);
    }
  }

  waterGame.animationId = requestAnimationFrame(waterLoop);
}

function stopWaterPlant() {
  if (!waterGame) return;
  if (waterGame.animationId) cancelAnimationFrame(waterGame.animationId);
  offInventoryChange(waterGame.inventoryListener);
  waterGame = null;
}

export async function launchWaterPlant() {
  const body = document.createElement("div");
  body.className = "water-app";

  const area = document.createElement("div");
  area.className = "water-area";

  const bucketImg = document.createElement("img");
  bucketImg.className = "water-bucket";
  const bucketSrc = await pixelateEmoji("1faa3");
  bucketImg.src = bucketSrc;
  bucketImg.draggable = false;
  area.appendChild(bucketImg);

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

  const areaW = area.clientWidth || 260;
  const startX = areaW / 2 - 15;
  waterGame = {
    area,
    bucketImg,
    bucketX: startX,
    targetBucketX: startX,
    slider,
    drops: [],
    spawnTimer: 0,
    animationId: null,
    prevTimestamp: 0,
    statusBar,
  };

  bucketImg.style.left = waterGame.bucketX + "px";

  slider.addEventListener("input", () => {
    if (!waterGame) return;
    const areaW = waterGame.area.clientWidth;
    const bw = [30, 45, 65, 90][getUpgradeLevel("bucket_size")];
    waterGame.targetBucketX = (slider.value / 1000) * (areaW - bw);
  });

  entry.onResize = debounce(() => {
    if (!waterGame) return;
    const areaW = waterGame.area.clientWidth;
    const bw = [30, 45, 65, 90][getUpgradeLevel("bucket_size")];
    waterGame.bucketX = Math.min(waterGame.bucketX, areaW - bw);
    waterGame.targetBucketX = Math.min(waterGame.targetBucketX, areaW - bw);
    waterGame.bucketImg.style.left = waterGame.bucketX + "px";
    waterGame.slider.value = (waterGame.targetBucketX / (areaW - bw)) * 1000;
  }, 100);

  waterGame.inventoryListener = () => {
    statusBar.querySelector(".status-bar-field").textContent = `Water supply: ${inventory.water}`;
  };
  onInventoryChange(waterGame.inventoryListener);

  waterGame.animationId = requestAnimationFrame(waterLoop);
}
