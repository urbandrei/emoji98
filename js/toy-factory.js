// ========== Toy Factory ==========

import { pixelateEmoji } from "./index.js";
import { inventory, addInventory, onInventoryChange, offInventoryChange } from "./index.js";
import { createWindow } from "./index.js";
import { debounce } from "./index.js";
import { playFactoryMatch, playFactoryMiss, playClick } from "./sounds.js";
import { getUpgradeLevel, getPrestigeMultiplier } from "./upgrades.js";


const TOY_TYPES = [
  { name: "soccer", label: "Soccer Ball", codepoint: "26bd" },
  { name: "duck", label: "Rubber Duck", codepoint: "1f986" },
  { name: "kite", label: "Kite", codepoint: "1fa81" },
];

const MISS_CODEPOINT = "274c";  // cross mark
const CHECK_CODEPOINT = "2705"; // check mark
const BASE_SPAWN_INTERVAL = 25000;
const MIN_RATE = 0.1;
const DECAY_SPEED = 0.02;
const RESTORE_SPEED = 0.08;
const COLUMN_WIDTH = 150;
const BELT_HEIGHT = 50;

let factoryGame = null;

function calcColumnCount(container) {
  return Math.max(1, Math.floor(container.clientWidth / COLUMN_WIDTH));
}

function calcBeltCount(column) {
  return Math.max(1, Math.floor(column.el.clientHeight / BELT_HEIGHT));
}

function createBeltElement() {
  const belt = document.createElement("div");
  belt.className = "factory-belt";
  const line = document.createElement("div");
  line.className = "factory-belt-line";
  belt.appendChild(line);
  return belt;
}

function createColumnElement() {
  const col = document.createElement("div");
  col.className = "factory-column";
  return col;
}

function initSpawnRates() {
  return TOY_TYPES.map(() => 1.0);
}

function rebuildFactory() {
  if (!factoryGame) return;
  const container = factoryGame.beltContainer;
  const desiredCols = calcColumnCount(container);
  const currentCols = factoryGame.columns.length;

  if (desiredCols > currentCols) {
    for (let i = currentCols; i < desiredCols; i++) {
      const colEl = createColumnElement();
      container.appendChild(colEl);
      factoryGame.columns.push({ el: colEl, belts: [], spawnRates: initSpawnRates() });
    }
  } else if (desiredCols < currentCols) {
    for (let i = currentCols - 1; i >= desiredCols; i--) {
      const col = factoryGame.columns[i];
      for (const belt of col.belts) {
        for (const p of belt.pieces) p.el.remove();
        belt.el.remove();
      }
      col.el.remove();
      factoryGame.columns.pop();
    }
  }

  for (const col of factoryGame.columns) {
    const desiredBelts = calcBeltCount(col);
    const currentBelts = col.belts.length;

    if (desiredBelts > currentBelts) {
      for (let i = currentBelts; i < desiredBelts; i++) {
        const beltEl = createBeltElement();
        col.el.appendChild(beltEl);
        // Stagger initial spawn timers so belts don't all fire at once
        const initialDelay = Math.random() * BASE_SPAWN_INTERVAL;
        col.belts.push({ el: beltEl, pieces: [], spawnTimer: initialDelay });
      }
    } else if (desiredBelts < currentBelts) {
      for (let i = currentBelts - 1; i >= desiredBelts; i--) {
        const belt = col.belts[i];
        for (const p of belt.pieces) p.el.remove();
        belt.el.remove();
        col.belts.pop();
      }
    }
  }
}

function getSpawnWeights(spawnRates) {
  const total = spawnRates.reduce((s, r) => s + r, 0);
  return spawnRates.map((r) => r / total);
}

function pickWeightedToyType(spawnRates) {
  const weights = getSpawnWeights(spawnRates);
  const roll = Math.random();
  let cumulative = 0;
  for (let i = 0; i < TOY_TYPES.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return i;
  }
  return TOY_TYPES.length - 1;
}

async function spawnFactoryPiece(col, belt) {
  if (!factoryGame) return;

  const beltW = belt.el.clientWidth;
  const typeIdx = pickWeightedToyType(col.spawnRates);
  const toyType = TOY_TYPES[typeIdx];

  const el = document.createElement("img");
  el.className = "factory-piece";
  const src = await pixelateEmoji(toyType.codepoint);
  el.src = src;
  el.draggable = false;
  const beltH = belt.el.clientHeight;
  const y = Math.max(0, beltH - 34);
  el.style.top = y + "px";
  el.style.left = beltW + "px";
  belt.el.appendChild(el);
  belt.pieces.push({ el, toyName: toyType.name, x: beltW, y });
}

async function showFeedbackEmoji(belt, y, codepoint, cssClass) {
  const el = document.createElement("img");
  el.className = "factory-piece " + cssClass;
  const src = await pixelateEmoji(codepoint);
  el.src = src;
  el.draggable = false;
  el.style.top = y + "px";
  el.style.left = "2px";
  belt.el.appendChild(el);
  setTimeout(() => el.remove(), 600);
}

function updateSpawnRates(col, elapsedSec) {
  if (!factoryGame) return;
  const selected = factoryGame.selectedType;
  const decaySpeed = [0.02, 0.015, 0.01, 0.005][getUpgradeLevel("toy_luck")];

  for (let i = 0; i < TOY_TYPES.length; i++) {
    if (TOY_TYPES[i].name === selected) {
      col.spawnRates[i] = Math.max(
        MIN_RATE,
        col.spawnRates[i] - decaySpeed * elapsedSec
      );
    } else {
      col.spawnRates[i] = Math.min(
        1.0,
        col.spawnRates[i] + RESTORE_SPEED * elapsedSec
      );
    }
  }
}

function updateSelectorButtons() {
  if (!factoryGame) return;
  factoryGame.buttons.forEach((btn) => {
    btn.classList.toggle("active-tool", btn.dataset.toyName === factoryGame.selectedType);
  });
}

function factoryLoop(timestamp) {
  if (!factoryGame) return;



  const elapsed = factoryGame.prevTimestamp ? timestamp - factoryGame.prevTimestamp : 16.667;
  factoryGame.prevTimestamp = timestamp;
  const elapsedSec = elapsed / 1000;

  const speed = [0.4, 0.7, 1.2, 2.0][getUpgradeLevel("belt_speed")];

  for (const col of factoryGame.columns) {
    updateSpawnRates(col, elapsedSec);

    for (const belt of col.belts) {
      // Each belt has its own spawn timer
      belt.spawnTimer -= elapsed;
      if (belt.spawnTimer <= 0) {
        spawnFactoryPiece(col, belt);
        belt.spawnTimer = BASE_SPAWN_INTERVAL;
      }

      for (let i = belt.pieces.length - 1; i >= 0; i--) {
        const piece = belt.pieces[i];
        piece.x -= speed * (elapsed / 16.667);
        piece.el.style.left = piece.x + "px";

        if (piece.x + 28 < 0) {
          piece.el.remove();
          belt.pieces.splice(i, 1);

          if (piece.toyName === factoryGame.selectedType) {
            factoryGame.streak++;
            // Combo Bonus: streaks give extra toys
            let bonus = 0;
            const comboLevel = getUpgradeLevel("combo_bonus");
            if (comboLevel >= 3 && factoryGame.streak >= 3) bonus = 2;
            else if (comboLevel >= 2 && factoryGame.streak >= 3) bonus = 1;
            else if (comboLevel >= 1 && factoryGame.streak >= 5) bonus = 1;
            addInventory("play", (1 + bonus) * getPrestigeMultiplier());
            playFactoryMatch();
            showFeedbackEmoji(belt, piece.y, CHECK_CODEPOINT, "factory-check");
          } else {
            factoryGame.streak = 0;
            playFactoryMiss();
            showFeedbackEmoji(belt, piece.y, MISS_CODEPOINT, "factory-miss");
          }
        }
      }
    }
  }

  factoryGame.animationId = requestAnimationFrame(factoryLoop);
}

function stopToyFactory() {
  if (!factoryGame) return;
  if (factoryGame.animationId) cancelAnimationFrame(factoryGame.animationId);
  offInventoryChange(factoryGame.inventoryListener);
  factoryGame = null;
}

export function launchToyFactory() {
  const body = document.createElement("div");
  body.className = "factory-app";

  const beltContainer = document.createElement("div");
  beltContainer.className = "factory-belt-container";
  body.appendChild(beltContainer);

  const buttons = document.createElement("div");
  buttons.className = "factory-buttons";
  const btnEls = [];

  TOY_TYPES.forEach((toy, idx) => {
    const btn = document.createElement("button");
    btn.className = "factory-btn";
    if (idx === 0) btn.classList.add("active-tool");
    btn.dataset.toyName = toy.name;
    btn.textContent = toy.label;
    btn.addEventListener("click", () => {
      playClick();
      if (!factoryGame) return;
      factoryGame.selectedType = toy.name;
      updateSelectorButtons();
    });
    buttons.appendChild(btn);
    btnEls.push(btn);
  });
  body.appendChild(buttons);

  const entry = createWindow("toy-factory", "Toy Factory", body, {
    width: 380,
    height: 280,
    icon: "icons/toy-factory.svg",
    onClose: stopToyFactory,
    minWidth: 250,
    minHeight: 160,
  });

  if (!entry) return;

  const statusBar = document.createElement("div");
  statusBar.className = "status-bar";
  statusBar.innerHTML = `<p class="status-bar-field">Toy supply: ${inventory.play}</p>`;
  entry.element.appendChild(statusBar);

  factoryGame = {
    beltContainer,
    columns: [],
    buttons: btnEls,
    selectedType: TOY_TYPES[0].name,
    streak: 0,
    animationId: null,
    prevTimestamp: 0,
    statusBar,
  };

  rebuildFactory();
  entry.onResize = debounce(rebuildFactory, 150);

  factoryGame.inventoryListener = () => {
    statusBar.querySelector(".status-bar-field").textContent = `Toy supply: ${inventory.play}`;
  };
  onInventoryChange(factoryGame.inventoryListener);

  factoryGame.animationId = requestAnimationFrame(factoryLoop);
}
