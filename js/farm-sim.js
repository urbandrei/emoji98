// ========== Farm Sim ==========

import { pixelateEmoji } from "./index.js";
import { inventory, addInventory, onInventoryChange, offInventoryChange } from "./index.js";
import { createWindow } from "./index.js";
import { debounce } from "./index.js";
import { playPlant, playWater, playHarvest, playClick } from "./sounds.js";
import { playTractorTick } from "./sounds.js";
import { getUpgradeLevel, getPrestigeMultiplier } from "./upgrades.js";


let farmGame = null;

// Base auto-tick: slowly plants and waters random tiles (no harvesting)
const BASE_AUTO_DELAY = 15000;

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

// Build zig-zag traversal order (tile indices)
function buildZigzagOrder(cols, rows) {
  const order = [];
  for (let r = 0; r < rows; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < cols; c++) order.push(r * cols + c);
    } else {
      for (let c = cols - 1; c >= 0; c--) order.push(r * cols + c);
    }
  }
  return order;
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
  farmGame.zigzagOrder = buildZigzagOrder(cols, rows);

  // Reposition tractors and clamp their indices
  for (const tractor of farmGame.tractors) {
    tractor.zigzagIdx = tractor.zigzagIdx % farmGame.zigzagOrder.length;
    tractor.progress = 0;
  }
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
    }, 8000);
  } else if (action === "harvest" && tile.dataset.state === "grown") {
    tile.dataset.state = "empty";
    tile.innerHTML = "";
    const goldenLevel = getUpgradeLevel("golden_harvest");
    const goldenChance = [0, 0.2, 0.35, 0.5][goldenLevel];
    let amount = 1;
    if (Math.random() < goldenChance) amount = 2;
    addInventory("food", amount * getPrestigeMultiplier());
    playHarvest();
  }
}

async function farmTileClick(tile) {
  if (!farmGame) return;
  advanceTile(tile, farmGame.tool);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Base auto-tick: only plants and waters randomly (no harvesting)
async function autoTick() {
  if (!farmGame) return;

  const tiles = farmGame.tiles;
  const planted = tiles.filter((t) => t.dataset.state === "planted");
  if (planted.length) {
    advanceTile(pickRandom(planted), "water");
  } else {
    const empty = tiles.filter((t) => t.dataset.state === "empty");
    if (empty.length) {
      advanceTile(pickRandom(empty), "plant");
    }
  }

  farmGame.autoTimeout = setTimeout(autoTick, BASE_AUTO_DELAY);
}

// ========== Tractor System ==========

function getTractorCount() {
  const level = getUpgradeLevel("tractor_speed");
  return [1, 1, 2, 3][level];
}

function getTractorTickDelay() {
  const level = getUpgradeLevel("tractor_speed");
  return [2000, 1200, 700, 400][level];
}

function getTractorCapability() {
  // Level 0 = no tractor, 1 = plant, 2 = plant+water, 3 = plant+water+harvest
  return getUpgradeLevel("tractor");
}

async function createTractorElement() {
  const el = document.createElement("img");
  el.className = "farm-tractor";
  const src = await pixelateEmoji("1f69c");
  el.src = src;
  return el;
}

function getTileCenter(tileIdx) {
  if (!farmGame || tileIdx < 0 || tileIdx >= farmGame.tiles.length) return null;
  const tile = farmGame.tiles[tileIdx];
  const gridRect = farmGame.grid.getBoundingClientRect();
  const tileRect = tile.getBoundingClientRect();
  return {
    x: tileRect.left - gridRect.left + tileRect.width / 2 - 12,
    y: tileRect.top - gridRect.top + tileRect.height / 2 - 12,
  };
}

function tractorAction(tileIdx) {
  if (!farmGame || tileIdx < 0 || tileIdx >= farmGame.tiles.length) return;
  const tile = farmGame.tiles[tileIdx];
  const cap = getTractorCapability();
  const state = tile.dataset.state;

  if (state === "empty" && cap >= 1) {
    advanceTile(tile, "plant");
  } else if (state === "planted" && cap >= 2) {
    advanceTile(tile, "water");
  } else if (state === "grown" && cap >= 3) {
    advanceTile(tile, "harvest");
  }
}

function positionTractor(tractor) {
  if (!farmGame) return;
  const order = farmGame.zigzagOrder;
  if (!order.length) return;

  const currentIdx = order[tractor.zigzagIdx % order.length];
  const nextZigzag = (tractor.zigzagIdx + 1) % order.length;
  const nextIdx = order[nextZigzag];

  const from = getTileCenter(currentIdx);
  const to = getTileCenter(nextIdx);
  if (!from || !to) return;

  const p = tractor.progress;
  const x = from.x + (to.x - from.x) * p;
  const y = from.y + (to.y - from.y) * p;
  tractor.el.style.left = x + "px";
  tractor.el.style.top = y + "px";

  // Tractor emoji faces left by default; flip when moving right
  const dx = to.x - from.x;
  if (dx > 0) {
    tractor.el.style.transform = "scaleX(-1)";
  } else if (dx < 0) {
    tractor.el.style.transform = "scaleX(1)";
  }
}

function clearTractorHighlights() {
  if (!farmGame) return;
  for (const tile of farmGame.tiles) {
    tile.classList.remove("tractor-active");
  }
}

function highlightTractorTile(tileIdx) {
  if (!farmGame || tileIdx < 0 || tileIdx >= farmGame.tiles.length) return;
  farmGame.tiles[tileIdx].classList.add("tractor-active");
}

function tractorLoop(timestamp) {
  if (!farmGame) return;

  const elapsed = farmGame.prevTractorTimestamp ? timestamp - farmGame.prevTractorTimestamp : 0;
  farmGame.prevTractorTimestamp = timestamp;

  if (getTractorCapability() <= 0) {
    farmGame.tractorAnimId = requestAnimationFrame(tractorLoop);
    return;
  }

  const tickDelay = getTractorTickDelay();
  const progressPerMs = 1 / tickDelay;

  // Ensure correct number of tractors
  const desiredCount = getTractorCount();
  while (farmGame.tractors.length < desiredCount) {
    // Space new tractors evenly across the zigzag
    const totalTiles = farmGame.zigzagOrder.length;
    const spacing = Math.floor(totalTiles / desiredCount);
    const idx = farmGame.tractors.length;
    const startIdx = (idx * spacing) % totalTiles;
    const tractor = { el: null, zigzagIdx: startIdx, progress: 0, pendingEl: true };
    farmGame.tractors.push(tractor);
    createTractorElement().then((el) => {
      if (!farmGame) return;
      tractor.el = el;
      tractor.pendingEl = false;
      farmGame.grid.appendChild(el);
    });
  }

  clearTractorHighlights();

  for (const tractor of farmGame.tractors) {
    if (!tractor.el || tractor.pendingEl) continue;

    tractor.progress += progressPerMs * elapsed;

    if (tractor.progress >= 1) {
      tractor.progress = 0;
      tractor.zigzagIdx = (tractor.zigzagIdx + 1) % farmGame.zigzagOrder.length;

      // Perform action on new tile
      const tileIdx = farmGame.zigzagOrder[tractor.zigzagIdx];
      tractorAction(tileIdx);
      playTractorTick();
    }

    // Highlight current tile
    const currentTileIdx = farmGame.zigzagOrder[tractor.zigzagIdx % farmGame.zigzagOrder.length];
    highlightTractorTile(currentTileIdx);

    positionTractor(tractor);
  }

  farmGame.tractorAnimId = requestAnimationFrame(tractorLoop);
}

function stopFarmSim() {
  if (!farmGame) return;
  if (farmGame.autoTimeout) clearTimeout(farmGame.autoTimeout);
  if (farmGame.tractorAnimId) cancelAnimationFrame(farmGame.tractorAnimId);
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

  farmGame = {
    grid,
    tiles: [],
    tool: "plant",
    statusBar,
    cols: 0,
    rows: 0,
    autoTimeout: null,
    tractors: [],
    tractorAnimId: null,
    prevTractorTimestamp: 0,
    zigzagOrder: [],
  };

  rebuildFarmGrid();
  entry.onResize = debounce(() => {
    rebuildFarmGrid();
    // Reposition tractors immediately after grid rebuild
    for (const tractor of farmGame.tractors) {
      if (tractor.el) positionTractor(tractor);
    }
  }, 150);

  farmGame.autoTimeout = setTimeout(autoTick, BASE_AUTO_DELAY);

  // Start tractor animation loop
  farmGame.tractorAnimId = requestAnimationFrame(tractorLoop);

  farmGame.inventoryListener = () => {
    statusBar.querySelector(".status-bar-field").textContent = `Food supply: ${inventory.food}`;
  };
  onInventoryChange(farmGame.inventoryListener);
}
