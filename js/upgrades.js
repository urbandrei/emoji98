// ========== Upgrade System ==========

import { inventory, setSaveCallback } from "./inventory.js";

// Upgrade definitions
export const UPGRADES = {
  // Tiered (3 levels) - Core
  bucket_size:    { name: "Bigger Buckets",   emoji: "1faa3",  costs: [2, 8, 25],   maxLevel: 3, desc: "Wider bucket in Water Plant" },
  speed_boots:    { name: "Speed Boots",      emoji: "1f45f",  costs: [2, 9, 28],   maxLevel: 3, desc: "Pets walk faster toward wanted items" },
  farm_speed:     { name: "Turbo Tractor",    emoji: "1f69c",  costs: [3, 10, 30],  maxLevel: 3, desc: "Faster auto-farming" },
  poop_immunity:  { name: "Poop Immunity",    emoji: "1f48a",  costs: [3, 10, 32],  maxLevel: 3, desc: "Pets take longer to get sick from poop" },
  belt_speed:     { name: "Faster Belts",     emoji: "2699",   costs: [3, 11, 33],  maxLevel: 3, desc: "Speed up factory conveyor" },
  patience:       { name: "Zen Training",     emoji: "1f9d8",  costs: [4, 12, 35],  maxLevel: 3, desc: "Pets tolerate missed wants longer" },
  rain_rate:      { name: "Rainmaker",        emoji: "1f327",  costs: [4, 13, 38],  maxLevel: 3, desc: "More water drops spawn" },
  toy_luck:       { name: "Quality Control",  emoji: "1f3b0",  costs: [4, 13, 36],  maxLevel: 3, desc: "Selected toys stay common longer" },
  larger_farm:    { name: "Larger Farm",      emoji: "1f33b",  costs: [4, 14, 40],  maxLevel: 3, desc: "Denser farm grid, more slots" },
  golden_harvest: { name: "Golden Harvest",   emoji: "1f31f",  costs: [5, 15, 42],  maxLevel: 3, desc: "Farm tiles chance to yield 2x food" },
  double_catch:   { name: "Double Catch",     emoji: "1f30a",  costs: [5, 16, 45],  maxLevel: 3, desc: "Water drops give extra water" },
  pet_cap:        { name: "Zoning Permit",    emoji: "1f3d7",  costs: [5, 18, 50],  maxLevel: 3, desc: "Fit more pets in area" },
  combo_bonus:    { name: "Combo Bonus",      emoji: "1f525",  costs: [5, 16, 48],  maxLevel: 3, desc: "Factory streaks above 5 give bonus toys" },
  reproduction:   { name: "Fertility Boost",  emoji: "1f495",  costs: [6, 20, 55],  maxLevel: 3, desc: "Pets split more often" },
  lucky_drops:    { name: "Lucky Drops",      emoji: "1f48e",  costs: [6, 20, 58],  maxLevel: 3, desc: "Chance for golden drops worth 3 water" },
  // One-time / Tiered
  window_resize:  { name: "Window Resize",    emoji: "1f5d6",  costs: [3],          maxLevel: 1, desc: "Unlock window resize and maximize" },
  multi_grab:     { name: "Multi-Grab",       emoji: "1f9f9",  costs: [5, 14, 35],  maxLevel: 3, desc: "Drag to bin: collects nearby poop/skulls too" },
  poop_magnet:    { name: "Poop Magnet",      emoji: "1f9f2",  costs: [7],          maxLevel: 1, desc: "Poop spawns only in corners" },
  active_deselected: { name: "Active Background", emoji: "1f4f1", costs: [8],       maxLevel: 1, desc: "Games run when window is unfocused" },
  auto_plant:     { name: "Auto-Plant",       emoji: "1f504",  costs: [8],          maxLevel: 1, desc: "Farm auto-plants empty tiles" },
  auto_dispense:  { name: "Auto-Dispenser",   emoji: "1f4e6",  costs: [10, 28, 65], maxLevel: 3, desc: "Auto-drops items for wanting pets" },
  roomba:         { name: "Roomba",           emoji: "1f916",  costs: [12, 30, 60], maxLevel: 3, desc: "Roombas wander and eat poop" },
  roomba_radar:   { name: "Roomba Radar",     emoji: "1f4e1",  costs: [15, 35, 70], maxLevel: 3, desc: "Roombas detect nearby poop/skulls" },
  roomba_skulls:  { name: "Roomba Skulls",    emoji: "1f480",  costs: [18],         maxLevel: 1, desc: "Roombas also pick up skulls" },
  active_minimized: { name: "Active Minimized", emoji: "1f4e5", costs: [20],        maxLevel: 1, desc: "Games run even when minimized" },
  infinite_farm:  { name: "Infinite Farm",    emoji: "1f30d",  costs: [35],         maxLevel: 1, desc: "Farm grid expands massively" },
  prestige:       { name: "Prestige System",  emoji: "2728",   costs: [80],         maxLevel: 1, desc: "Reset upgrades for permanent 2x boost" },
  win_game:       { name: "The Great Escape", emoji: "1f389",  costs: [100],        maxLevel: 1, desc: "???" },
};

const UPGRADE_IDS = Object.keys(UPGRADES);

// Auto-Dispenser speed options
// Each upgrade tier unlocks 3 more speeds. Speed 0 = off.
export const DISPENSE_LABELS =    ["Off", "10s", "5s", "3s", "2s", "1s", "2/s", "3/s", "5/s", "10/s"];
export const DISPENSE_INTERVALS = [0,     10000, 5000, 3000, 2000, 1000, 500,   333,   200,   100];

// State
export const upgradeState = {
  levels: {},
  totalSacrificed: 0,
  dispenseSpeed: 0,
  prestigeCount: 0,
};

// Initialize levels
for (const id of UPGRADE_IDS) {
  upgradeState.levels[id] = 0;
}

// EventTarget pub/sub
const upgradeTarget = new EventTarget();

function notifyUpgradeChange() {
  upgradeTarget.dispatchEvent(new CustomEvent("change"));
}

export function onUpgradeChange(fn) {
  upgradeTarget.addEventListener("change", fn);
  return fn;
}

export function offUpgradeChange(fn) {
  upgradeTarget.removeEventListener("change", fn);
}

// API
export function getUpgradeLevel(id) {
  return upgradeState.levels[id] || 0;
}

export function getUpgradeCost(id) {
  const def = UPGRADES[id];
  if (!def) return Infinity;
  const level = upgradeState.levels[id] || 0;
  if (level >= def.maxLevel) return Infinity;
  return def.costs[level];
}

export function isMaxed(id) {
  const def = UPGRADES[id];
  if (!def) return true;
  return (upgradeState.levels[id] || 0) >= def.maxLevel;
}

export function getDispenseSpeed() {
  return upgradeState.dispenseSpeed;
}

export function setDispenseSpeed(speed) {
  const maxSpeed = getUpgradeLevel("auto_dispense") * 3;
  if (speed < 0 || speed > maxSpeed) return;
  upgradeState.dispenseSpeed = speed;
  notifyUpgradeChange();
  saveState();
}

export function getPrestigeMultiplier() {
  return 1 + upgradeState.prestigeCount;
}

export function canAffordUpgrade(id) {
  if (isMaxed(id)) return false;
  if (!petAccessor || !petAccessor.isPetGameOpen()) return false;
  const cost = getUpgradeCost(id);
  const living = petAccessor.getLivingPets();
  return living.length >= cost;
}

export function purchaseUpgrade(id) {
  if (!canAffordUpgrade(id)) return false;
  const cost = getUpgradeCost(id);

  // Kill most-neglected pets
  for (let i = 0; i < cost; i++) {
    const living = petAccessor.getLivingPets();
    if (living.length === 0) break;
    // Sort by most neglected (highest missedWants first, then oldest)
    living.sort((a, b) => {
      if (b.missedWants !== a.missedWants) return b.missedWants - a.missedWants;
      return 0;
    });
    petAccessor.killPet(living[0]);
  }

  upgradeState.levels[id] = (upgradeState.levels[id] || 0) + 1;
  upgradeState.totalSacrificed += cost;
  notifyUpgradeChange();
  saveState();

  if (id === "win_game") {
    import("./win-sequence.js").then((mod) => mod.startWinSequence());
  }

  if (id === "prestige") {
    doPrestige();
  }

  return true;
}

function doPrestige() {
  upgradeState.prestigeCount++;
  // Reset all upgrade levels except win_game
  for (const id of UPGRADE_IDS) {
    if (id === "win_game") continue;
    upgradeState.levels[id] = 0;
  }
  upgradeState.dispenseSpeed = 0;
  inventory.food = 3;
  inventory.water = 3;
  inventory.play = 3;
  notifyUpgradeChange();
  saveState();
}

// Generate flat list of upgrade slots for shop display
// Each tier of a multi-level upgrade becomes its own slot
export function getUpgradeSlots() {
  const slots = [];
  for (const id of UPGRADE_IDS) {
    const def = UPGRADES[id];
    for (let tier = 0; tier < def.maxLevel; tier++) {
      let tierSuffix = "";
      if (def.maxLevel > 1) {
        if (tier === 1) tierSuffix = " II";
        else if (tier === 2) tierSuffix = " III";
      }
      slots.push({
        id,
        tier,
        displayName: def.name + tierSuffix,
        cost: def.costs[tier],
        emoji: def.emoji,
        desc: def.desc,
      });
    }
  }
  // Sort by cost so cheaper upgrades appear first
  slots.sort((a, b) => a.cost - b.cost);
  return slots;
}

// Pet accessor — registered by pet-game.js to avoid circular imports
let petAccessor = null;

export function registerPetAccessor(accessor) {
  petAccessor = accessor;
}

export function getPetAccessor() {
  return petAccessor;
}

// Persistence
const SAVE_KEY = "emoji98_save";

export function saveState() {
  const data = {
    version: 2,
    upgradeLevels: { ...upgradeState.levels },
    inventory: { food: inventory.food, water: inventory.water, play: inventory.play },
    totalSacrificed: upgradeState.totalSacrificed,
    dispenseSpeed: upgradeState.dispenseSpeed,
    prestigeCount: upgradeState.prestigeCount,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    // Storage full or unavailable
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.version !== 1 && data.version !== 2) return;

    // Restore upgrade levels
    if (data.upgradeLevels) {
      for (const id of UPGRADE_IDS) {
        if (typeof data.upgradeLevels[id] === "number") {
          upgradeState.levels[id] = data.upgradeLevels[id];
        }
      }
    }

    // Restore inventory
    if (data.inventory) {
      if (typeof data.inventory.food === "number") inventory.food = data.inventory.food;
      if (typeof data.inventory.water === "number") inventory.water = data.inventory.water;
      if (typeof data.inventory.play === "number") inventory.play = data.inventory.play;
    }

    if (typeof data.totalSacrificed === "number") {
      upgradeState.totalSacrificed = data.totalSacrificed;
    }

    if (typeof data.dispenseSpeed === "number") {
      upgradeState.dispenseSpeed = data.dispenseSpeed;
    }

    if (typeof data.prestigeCount === "number") {
      upgradeState.prestigeCount = data.prestigeCount;
    }

    notifyUpgradeChange();
  } catch (e) {
    // Corrupted save
  }

  // Hook inventory changes to auto-save (debounced)
  let saveTimer = null;
  setSaveCallback(() => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 1000);
  });
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    // ignore
  }
  // Reset state
  for (const id of UPGRADE_IDS) {
    upgradeState.levels[id] = 0;
  }
  upgradeState.totalSacrificed = 0;
  upgradeState.dispenseSpeed = 0;
  upgradeState.prestigeCount = 0;
  inventory.food = 3;
  inventory.water = 3;
  inventory.play = 3;
  notifyUpgradeChange();
}
