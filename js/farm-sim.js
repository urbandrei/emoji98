// ========== Farm Sim ==========

import { pixelateEmoji } from "./index.js";
import { inventory, addInventory, onInventoryChange, offInventoryChange } from "./index.js";
import { createWindow } from "./index.js";
import { debounce } from "./index.js";
import { playPlant, playWater, playHarvest, playClick } from "./sounds.js";
import { getUpgradeLevel, getPrestigeMultiplier } from "./upgrades.js";
import { isWindowActive, isWindowMinimized } from "./window-manager.js";

let farmGame = null;

function calcFarmDimensions(grid) {
  const w = grid.clientWidth;
  const h = grid.clientHeight;
  const largerLevel = getUpgradeLevel("larger_farm");
  const hasInfinite = getUpgradeLevel("infinite_farm") >= 1;
  let tileSize;
  if (hasInfinite) tileSize = 25;
  else tileSize = [60, 50, 40, 35][largerLevel];
  const cols = Math.max(3, Math.floor(w / tileSize));
  const rows = Math.max(2, Math.floor(h / tileSize));
  return { cols, rows, total: cols * rows };
}

function createFarmTile() {
  const tile = document.createElement("div");
  tile.className = "farm-tile";
  tile.dataset.state = "empty";
  tile.addEventListener("click", () => farmTileClick(tile));
  return tile;
}

function rebuildFarmGrid() {
  if (!farmGame) return;
  const grid = farmGame.grid;
  const { cols, rows, total } = calcFarmDimensions(grid);

  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  const currentCount = farmGame.tiles.length;

  if (total > currentCount) {
    for (let i = currentCount; i < total; i++) {
      const tile = createFarmTile();
      grid.appendChild(tile);
      farmGame.tiles.push(tile);
    }
  } else if (total < currentCount) {
    for (let i = currentCount - 1; i >= total; i--) {
      farmGame.tiles[i].remove();
      farmGame.tiles.pop();
    }
  }

  farmGame.cols = cols;
  farmGame.rows = rows;
}

async function advanceTile(tile, action) {
  if (action === "plant" && tile.dataset.state === "empty") {
    tile.dataset.state = "planted";
    playPlant();
    const src = await pixelateEmoji("1f331");
    tile.innerHTML = `<img src="${src}" />`;
  } else if (action === "water" && tile.dataset.state === "planted") {
    tile.dataset.state = "watered";
    playWater();
    const src = await pixelateEmoji("1f33f");
    tile.innerHTML = `<img src="${src}" />`;
    setTimeout(async () => {
      if (tile.dataset.state === "watered") {
        tile.dataset.state = "grown";
        const grownSrc = await pixelateEmoji("1f33e");
        tile.innerHTML = `<img src="${grownSrc}" />`;
      }
    }, 3000);
  } else if (action === "harvest" && tile.dataset.state === "grown") {
    tile.dataset.state = "empty";
    tile.innerHTML = "";
    // Golden Harvest: chance for 2x food
    const goldenLevel = getUpgradeLevel("golden_harvest");
    const goldenChance = [0, 0.2, 0.35, 0.5][goldenLevel];
    let amount = 1;
    if (Math.random() < goldenChance) amount = 2;
    addInventory("food", amount * getPrestigeMultiplier());
    playHarvest();
    // Auto-Plant: instantly replant after harvest
    if (getUpgradeLevel("auto_plant") >= 1) {
      advanceTile(tile, "plant");
    }
  }
}

async function farmTileClick(tile) {
  if (!farmGame) return;
  advanceTile(tile, farmGame.tool);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getAutoTickDelay() {
  return [8000, 5000, 3000, 1500][getUpgradeLevel("farm_speed")];
}

async function autoTick() {
  if (!farmGame) return;

  // Pause logic
  const minimized = isWindowMinimized("farm-sim");
  const active = isWindowActive("farm-sim");
  const shouldPause = minimized
    ? getUpgradeLevel("active_minimized") < 1
    : (!active && getUpgradeLevel("active_deselected") < 1);
  if (shouldPause) {
    farmGame.autoTimeout = setTimeout(autoTick, 500);
    return;
  }

  const tiles = farmGame.tiles;

  const grown = tiles.filter((t) => t.dataset.state === "grown");
  if (grown.length) { advanceTile(pickRandom(grown), "harvest"); }
  else {
    const planted = tiles.filter((t) => t.dataset.state === "planted");
    if (planted.length) { advanceTile(pickRandom(planted), "water"); }
    else {
      const empty = tiles.filter((t) => t.dataset.state === "empty");
      if (empty.length) { advanceTile(pickRandom(empty), "plant"); }
    }
  }

  // Recursive setTimeout so delay re-reads upgrade level each tick
  farmGame.autoTimeout = setTimeout(autoTick, getAutoTickDelay());
}

function stopFarmSim() {
  if (!farmGame) return;
  if (farmGame.autoTimeout) clearTimeout(farmGame.autoTimeout);
  offInventoryChange(farmGame.inventoryListener);
  farmGame = null;
}

export function launchFarmSim() {
  const body = document.createElement("div");
  body.className = "farm-app";

  const grid = document.createElement("div");
  grid.className = "farm-grid";
  body.appendChild(grid);

  const tools = document.createElement("div");
  tools.className = "farm-tools";
  ["Plant", "Water", "Harvest"].forEach((name, idx) => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.dataset.tool = name.toLowerCase();
    if (idx === 0) btn.classList.add("active-tool");
    btn.addEventListener("click", () => {
      playClick();
      tools.querySelectorAll("button").forEach((b) => b.classList.remove("active-tool"));
      btn.classList.add("active-tool");
      farmGame.tool = name.toLowerCase();
    });
    tools.appendChild(btn);
  });
  body.appendChild(tools);

  const entry = createWindow("farm-sim", "Farm Sim", body, {
    width: 350,
    height: 350,
    icon: "icons/farm.svg",
    onClose: stopFarmSim,
    minWidth: 220,
    minHeight: 180,
  });

  if (!entry) return;

  const statusBar = document.createElement("div");
  statusBar.className = "status-bar";
  statusBar.innerHTML = `<p class="status-bar-field">Food supply: ${inventory.food}</p>`;
  entry.element.appendChild(statusBar);

  farmGame = { grid, tiles: [], tool: "plant", statusBar, cols: 0, rows: 0, autoTimeout: null };

  rebuildFarmGrid();
  entry.onResize = debounce(rebuildFarmGrid, 150);

  farmGame.autoTimeout = setTimeout(autoTick, getAutoTickDelay());

  farmGame.inventoryListener = () => {
    statusBar.querySelector(".status-bar-field").textContent = `Food supply: ${inventory.food}`;
  };
  onInventoryChange(farmGame.inventoryListener);
}
