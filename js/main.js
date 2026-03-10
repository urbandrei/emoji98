// ========== Main Entry Point ==========

import { preloadEmojis, pixelateWallpaper, loadState } from "./index.js";
import { initDesktopIcons, initStartMenu, initClock, launchMyComputer, launchRecycleBin } from "./desktop.js";
import { launchEmojiGame } from "./pet-game.js";
import { launchFarmSim } from "./farm-sim.js";
import { launchWaterPlant } from "./water-plant.js";
import { launchToyFactory } from "./toy-factory.js";
import { launchUpgradeShop } from "./upgrade-shop.js";

const APP_LAUNCHERS = {
  "emoji-game": launchEmojiGame,
  "my-computer": launchMyComputer,
  "recycle-bin": launchRecycleBin,
  "farm-sim": launchFarmSim,
  "water-plant": launchWaterPlant,
  "toy-factory": launchToyFactory,
  "upgrade-shop": launchUpgradeShop,
};

function launchApp(appId) {
  const launcher = APP_LAUNCHERS[appId];
  if (launcher) launcher();
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  preloadEmojis();
  pixelateWallpaper();
  initDesktopIcons(launchApp);
  initStartMenu(launchApp);
  initClock();
});
