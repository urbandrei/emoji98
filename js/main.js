// ========== Main Entry Point ==========

import { initScaling } from "./scaling.js";
import "./touch-adapter.js";
import { preloadEmojis, pixelateWallpaper, pixelateEmoji, loadState, inventory } from "./index.js";
import { initDesktopIcons, initStartMenu, initClock, launchMyComputer, launchRecycleBin } from "./desktop.js";
import { launchEmojiGame } from "./pet-game.js";
import { launchFarmSim } from "./farm-sim.js";
import { launchWaterPlant } from "./water-plant.js";
import { launchToyFactory } from "./toy-factory.js";
import { launchUpgradeShop } from "./upgrade-shop.js";
import { launchPetRoster } from "./pet-roster.js";
import { initTutorial, isTutorialActive, notifyTutorialEvent } from "./tutorial.js";
import { getUpgradeLevel, onUpgradeChange } from "./index.js";

const APP_LAUNCHERS = {
  "emoji-game": launchEmojiGame,
  "my-computer": launchMyComputer,
  "recycle-bin": launchRecycleBin,
  "farm-sim": launchFarmSim,
  "water-plant": launchWaterPlant,
  "toy-factory": launchToyFactory,
  "upgrade-shop": launchUpgradeShop,
  "pet-roster": launchPetRoster,
};

function launchApp(appId) {
  const launcher = APP_LAUNCHERS[appId];
  if (launcher) launcher();
  if (isTutorialActive()) notifyTutorialEvent("app-opened-" + appId);
}

document.addEventListener("DOMContentLoaded", () => {
  initScaling();
  const isFresh = !localStorage.getItem("emoji98_save");
  loadState();
  if (isFresh) {
    inventory.food = 20;
    inventory.water = 10;
    inventory.play = 40;
    initTutorial(launchApp);
  }
  // Hide pet-roster icon until upgrade is purchased (both fresh and existing saves)
  function updateRosterVisibility() {
    const show = getUpgradeLevel("pet_roster") >= 1;
    document.querySelectorAll('[data-app="pet-roster"]').forEach((el) => {
      el.classList.toggle("tutorial-hidden", !show);
    });
  }
  updateRosterVisibility();
  onUpgradeChange(updateRosterVisibility);

  preloadEmojis();
  pixelateWallpaper();
  initDesktopIcons(launchApp);
  initStartMenu(launchApp);
  initClock();

  // Generate pet roster icon from emoji
  pixelateEmoji("1f4cb").then((src) => {
    document.querySelectorAll('[data-app="pet-roster"] img').forEach((img) => {
      img.src = src;
    });
  });
});
