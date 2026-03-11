// ========== Upgrade System ==========

import { inventory, setSaveCallback } from "./inventory.js";

// Upgrade definitions
export const UPGRADES = {
  // Early game (1–20 coin)
  window_resize:  { name: "Window Resize",    emoji: "1f5d6",  costs: [300],                     maxLevel: 1, desc: "Unlock window resize and maximize" },
  speed_boots:    { name: "Speed Boots",      emoji: "1f45f",  costs: [3, 25, 400],              maxLevel: 3, desc: "Pets walk faster toward wanted items" },
  bucket_size:    { name: "Bigger Buckets",   emoji: "1faa3",  costs: [5, 50, 600],              maxLevel: 3, desc: "Wider bucket in Water Plant" },
  poop_coin:      { name: "Poop Value",       emoji: "1f4b0",  costs: [8, 80, 1200],             maxLevel: 3, desc: "Poop worth more coin" },
  roomba:         { name: "Roomba",           emoji: "1f916",  costs: [100, 300, 1000],          maxLevel: 3, desc: "Roombas wander and eat poop" },
  poop_immunity:  { name: "Poop Immunity",    emoji: "1f48a",  costs: [12, 120, 2000],           maxLevel: 3, desc: "Pets take longer to get sick from poop" },
  // Mid-early (20–200 coin)
  patience:       { name: "Zen Training",     emoji: "1f9d8",  costs: [20, 200, 3000],           maxLevel: 3, desc: "Pets tolerate missed wants longer" },
  tractor:        { name: "Tractor",           emoji: "1f69c",  costs: [25, 250, 4000],           maxLevel: 3, desc: "Tractor auto-farms: plant → water → harvest" },
  rain_rate:      { name: "Rainmaker",        emoji: "1f327",  costs: [30, 300, 5000],           maxLevel: 3, desc: "More water drops spawn" },
  belt_speed:     { name: "Faster Belts",     emoji: "2699",   costs: [35, 350, 5500],           maxLevel: 3, desc: "Speed up factory conveyor" },
  multi_grab:     { name: "Multi-Grab",       emoji: "1f9f9",  costs: [20, 200, 3000],           maxLevel: 3, desc: "Drag to bin: collects nearby poop/skulls too" },
  poop_magnet:    { name: "Poop Magnet",      emoji: "1f9f2",  costs: [50],                      maxLevel: 1, desc: "Poop spawns only in corners" },
  skull_coin:     { name: "Skull Value",      emoji: "1f4b0",  costs: [60, 600, 8000],           maxLevel: 3, desc: "Skulls worth more coin" },
  pet_roster:     { name: "Pet Roster",      emoji: "1f4cb",  costs: [75],                      maxLevel: 1, desc: "Unlock the Pet Roster app" },
  // Mid game (200–2000 coin)
  toy_luck:       { name: "Quality Control",  emoji: "1f3b0",  costs: [200, 2000, 20000],        maxLevel: 3, desc: "Selected toys stay common longer" },
  larger_farm:    { name: "Larger Farm",      emoji: "1f33b",  costs: [250, 2500, 25000],        maxLevel: 3, desc: "Denser farm grid, more slots" },
  tractor_speed:  { name: "Tractor Speed",     emoji: "1f3ce",  costs: [300, 3000, 25000],        maxLevel: 3, desc: "Faster tractors, more tractors" },
  roomba_radar:   { name: "Roomba Radar",     emoji: "1f4e1",  costs: [350, 3500, 30000],        maxLevel: 3, desc: "Roombas detect nearby poop/skulls" },
  golden_harvest: { name: "Golden Harvest",   emoji: "1f31f",  costs: [400, 4000, 35000],        maxLevel: 3, desc: "Farm tiles chance to yield 2x food" },
  double_catch:   { name: "Double Catch",     emoji: "1f30a",  costs: [500, 5000, 40000],        maxLevel: 3, desc: "Water drops give extra water" },
  roomba_skulls:  { name: "Roomba Skulls",    emoji: "1f480",  costs: [200],                     maxLevel: 1, desc: "Roombas also pick up skulls" },
  roster_grind:   { name: "Pet Grinder",     emoji: "1fa78",  costs: [500],                     maxLevel: 1, desc: "Unlock Grind button in Pet Roster" },
  roomba_coin:    { name: "Roomba Profit",    emoji: "1f4b0",  costs: [800, 6000, 45000],        maxLevel: 3, desc: "Roomba cleanup earns more coin" },
  // Late game (2000–20000 coin)
  pet_cap:        { name: "Zoning Permit",    emoji: "1f3d7",  costs: [2000, 15000, 60000],      maxLevel: 3, desc: "Fit more pets in area" },
  combo_bonus:    { name: "Combo Bonus",      emoji: "1f525",  costs: [2500, 18000, 65000],      maxLevel: 3, desc: "Factory streaks above 5 give bonus toys" },
  reproduction:   { name: "Fertility Boost",  emoji: "1f495",  costs: [3000, 20000, 70000],      maxLevel: 3, desc: "Pets need fewer feedings to multiply" },
  auto_dispense:  { name: "Auto-Dispenser",   emoji: "1f4e6",  costs: [5000, 25000, 75000],      maxLevel: 3, desc: "Auto-drops items for wanting pets" },
  lucky_drops:    { name: "Lucky Drops",      emoji: "1f48e",  costs: [8000, 35000, 80000],      maxLevel: 3, desc: "Chance for golden drops worth 3 water" },
  // End game (20000–100000 coin)
  infinite_farm:  { name: "Infinite Farm",    emoji: "1f30d",  costs: [50000],                   maxLevel: 1, desc: "Farm grid expands massively" },
  win_game:       { name: "The Great Escape", emoji: "1f389",  costs: [100000],                  maxLevel: 1, desc: "???" },
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
  return 1;
}

export function canAffordUpgrade(id) {
  if (isMaxed(id)) return false;
  const cost = getUpgradeCost(id);
  return inventory.coin >= cost;
}

export function purchaseUpgrade(id) {
  if (!canAffordUpgrade(id)) return false;
  const cost = getUpgradeCost(id);

  inventory.coin -= cost;
  upgradeState.levels[id] = (upgradeState.levels[id] || 0) + 1;
  upgradeState.totalSacrificed += cost;
  notifyUpgradeChange();
  saveState();

  if (id === "win_game") {
    import("./win-sequence.js").then((mod) => mod.startWinSequence());
  }

  return true;
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
    version: 3,
    upgradeLevels: { ...upgradeState.levels },
    inventory: { food: inventory.food, water: inventory.water, play: inventory.play, coin: inventory.coin },
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
    if (data.version !== 1 && data.version !== 2 && data.version !== 3) return;

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
      if (typeof data.inventory.coin === "number") inventory.coin = data.inventory.coin;
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
  inventory.coin = 0;
  notifyUpgradeChange();
}
