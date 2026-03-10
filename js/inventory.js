// ========== Global Inventory (EventTarget-based) ==========

const inventoryTarget = new EventTarget();

export const inventory = { food: 3, water: 3, play: 3 };

let _saveCallback = null;

export function setSaveCallback(fn) {
  _saveCallback = fn;
}

function notifyInventory() {
  inventoryTarget.dispatchEvent(new CustomEvent("change", { detail: { ...inventory } }));
  if (_saveCallback) _saveCallback();
}

export function addInventory(type, amount) {
  inventory[type] += amount;
  notifyInventory();
}

export function useInventory(type) {
  if (inventory[type] <= 0) return false;
  inventory[type]--;
  notifyInventory();
  return true;
}

export function onInventoryChange(fn) {
  inventoryTarget.addEventListener("change", fn);
  return fn;
}

export function offInventoryChange(fn) {
  inventoryTarget.removeEventListener("change", fn);
}

// ========== Recycle Bin ==========

const recycleBinTarget = new EventTarget();

export const recycleBin = [];

function notifyRecycleBin() {
  recycleBinTarget.dispatchEvent(new CustomEvent("change"));
}

export function addToRecycleBin(entry) {
  recycleBin.push(entry);
  notifyRecycleBin();
}

export function onRecycleBinChange(fn) {
  recycleBinTarget.addEventListener("change", fn);
  return fn;
}

export function offRecycleBinChange(fn) {
  recycleBinTarget.removeEventListener("change", fn);
}
