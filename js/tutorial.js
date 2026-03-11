// ========== Progressive Tutorial System ==========

import { createWindow, closeWindow } from "./window-manager.js";
import { onInventoryChange } from "./inventory.js";
import { getLayoutWidth } from "./scaling.js";

let active = false;
const completed = new Set();
let currentWindowId = null;

const HIDDEN_APPS = ["my-computer", "recycle-bin", "farm-sim", "water-plant", "toy-factory", "upgrade-shop"];

const STEPS = {
  welcome: {
    trigger: "tutorial-init",
    target: "emoji-game",
    positionBy: "icon",
  },
  "game-opened": {
    trigger: "app-opened-emoji-game",
    positionBy: "window",
    anchorWindow: "emoji-game",
  },
  "first-feed": {
    trigger: "first-feed",
    positionBy: "window",
    anchorWindow: "emoji-game",
  },
  "farm-sim": {
    trigger: "resource-food-zero",
    reveal: ["farm-sim"],
    target: "farm-sim",
    positionBy: "icon",
  },
  "farm-sim-opened": {
    trigger: "app-opened-farm-sim",
    positionBy: "window",
    anchorWindow: "farm-sim",
  },
  "water-plant": {
    trigger: "resource-water-zero",
    reveal: ["water-plant"],
    target: "water-plant",
    positionBy: "icon",
  },
  "water-plant-opened": {
    trigger: "app-opened-water-plant",
    positionBy: "window",
    anchorWindow: "water-plant",
  },
  "toy-factory": {
    trigger: "resource-play-zero",
    reveal: ["toy-factory"],
    target: "toy-factory",
    positionBy: "icon",
  },
  "toy-factory-opened": {
    trigger: "app-opened-toy-factory",
    positionBy: "window",
    anchorWindow: "toy-factory",
  },
  shredder: {
    trigger: "first-poop",
    reveal: ["recycle-bin"],
    target: "recycle-bin",
    positionBy: "icon",
  },
  "upgrade-shop": {
    trigger: "first-shred",
    reveal: ["upgrade-shop", "my-computer"],
    target: "upgrade-shop",
    positionBy: "icon",
  },
  "upgrade-shop-opened": {
    trigger: "app-opened-upgrade-shop",
    positionBy: "window",
    anchorWindow: "upgrade-shop",
  },
  "first-death": {
    trigger: "first-death",
    reveal: ["recycle-bin"],
    positionBy: "window",
    anchorWindow: "emoji-game",
  },
  "first-crowded": {
    trigger: "first-crowded",
    positionBy: "window",
    anchorWindow: "emoji-game",
  },
  "first-sick": {
    trigger: "first-sick",
    positionBy: "window",
    anchorWindow: "emoji-game",
  },
  "first-reproduction": {
    trigger: "first-reproduction",
    positionBy: "window",
    anchorWindow: "emoji-game",
  },
  "first-grind": {
    trigger: "first-grind",
    positionBy: "window",
    anchorWindow: "emoji-game",
  },
};

// Preloaded message texts (loaded from tutorial/*.txt files)
const messages = {};

// Build trigger -> step lookup
const triggerMap = new Map();
for (const [id, step] of Object.entries(STEPS)) {
  triggerMap.set(step.trigger, id);
}

async function loadMessages() {
  const ids = Object.keys(STEPS);
  const results = await Promise.all(
    ids.map((id) =>
      fetch(`tutorial/${id}.txt`)
        .then((r) => r.ok ? r.text() : "")
        .catch(() => "")
    )
  );
  for (let i = 0; i < ids.length; i++) {
    messages[ids[i]] = results[i];
  }
}

export function initTutorial(launchApp) {
  active = true;

  for (const appId of HIDDEN_APPS) {
    hideApp(appId);
  }

  onInventoryChange((e) => {
    if (!active) return;
    const inv = e.detail;
    if (inv.food === 0 && !completed.has("farm-sim")) {
      notifyTutorialEvent("resource-food-zero");
    }
    if (inv.water === 0 && !completed.has("water-plant")) {
      notifyTutorialEvent("resource-water-zero");
    }
    if (inv.play === 0 && !completed.has("toy-factory")) {
      notifyTutorialEvent("resource-play-zero");
    }
  });

  loadMessages().then(() => {
    setTimeout(() => notifyTutorialEvent("tutorial-init"), 500);
  });
}

export function isTutorialActive() {
  return active;
}

export function notifyTutorialEvent(eventName) {
  if (!active) return;

  const stepId = triggerMap.get(eventName);
  if (!stepId || completed.has(stepId)) return;

  const step = STEPS[stepId];
  completed.add(stepId);

  // Close any existing tutorial window
  closeCurrent();

  // Reveal apps
  if (step.reveal) {
    for (const appId of step.reveal) {
      revealApp(appId);
    }
  }

  showTutorialWindow(stepId, step);
}

function closeCurrent() {
  if (currentWindowId) {
    closeWindow(currentWindowId);
    currentWindowId = null;
  }
}

function showTutorialWindow(stepId, step) {
  const windowId = "tutorial-" + stepId;
  currentWindowId = windowId;

  const message = messages[stepId] || "";

  const body = document.createElement("div");
  body.className = "tutorial-body";
  body.textContent = message;

  let x = 100, y = 60;

  if (step.positionBy === "window" && step.anchorWindow) {
    const appWin = document.querySelector(`.window[data-window-id="${step.anchorWindow}"]`);
    if (appWin) {
      x = appWin.offsetLeft + appWin.offsetWidth + 10;
      y = appWin.offsetTop;
    }
  } else if (step.positionBy === "icon" && step.target) {
    const icon = document.querySelector(`.desktop-icon[data-app="${step.target}"]`);
    if (icon) {
      x = icon.offsetLeft + icon.offsetWidth + 10;
      y = icon.offsetTop;
    }
  }

  // Keep on screen
  if (x + 260 > getLayoutWidth()) x = Math.max(10, getLayoutWidth() - 270);
  if (y + 200 > 810 - 30) y = Math.max(10, 810 - 230);

  createWindow(windowId, "tutorial.txt - Notepad", body, {
    width: 260,
    height: 190,
    x,
    y,
    minWidth: 180,
    minHeight: 100,
  });
}

function hideApp(appId) {
  const icon = document.querySelector(`.desktop-icon[data-app="${appId}"]`);
  if (icon) icon.classList.add("tutorial-hidden");

  const menuItem = document.querySelector(`#start-menu-list li[data-app="${appId}"]`);
  if (menuItem) menuItem.classList.add("tutorial-hidden");
}

function revealApp(appId) {
  const icon = document.querySelector(`.desktop-icon[data-app="${appId}"]`);
  if (icon) icon.classList.remove("tutorial-hidden");

  const menuItem = document.querySelector(`#start-menu-list li[data-app="${appId}"]`);
  if (menuItem) menuItem.classList.remove("tutorial-hidden");
}
