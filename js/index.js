// ========== Barrel Exports ==========

// Emoji utilities
export { pixelateEmoji, preloadEmojis, pixelateWallpaper, getSpriteImage } from "./emoji-utils.js";

// Inventory
export { inventory, addInventory, useInventory, addCoin, spendCoin, onInventoryChange, offInventoryChange } from "./inventory.js";
export { recycleBin, addToRecycleBin, onRecycleBinChange, offRecycleBinChange } from "./inventory.js";

// Window manager
export { createWindow, closeWindow, isWindowActive, isWindowMinimized } from "./window-manager.js";

// Upgrades
export { getUpgradeLevel, getUpgradeCost, isMaxed, canAffordUpgrade, purchaseUpgrade, onUpgradeChange, offUpgradeChange, upgradeState, UPGRADES, loadState, clearSave, registerPetAccessor, getPetAccessor, saveState, getDispenseSpeed, setDispenseSpeed, DISPENSE_LABELS, DISPENSE_INTERVALS, getPrestigeMultiplier, getUpgradeSlots } from "./upgrades.js";

// Utilities
export { debounce } from "./utils.js";
