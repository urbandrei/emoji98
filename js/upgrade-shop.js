// ========== Upgrade Shop Window ==========

import { createWindow } from "./window-manager.js";
import { pixelateEmoji } from "./emoji-utils.js";
import { inventory } from "./inventory.js";
import {
  upgradeState, getUpgradeLevel, isMaxed, canAffordUpgrade, purchaseUpgrade,
  onUpgradeChange, offUpgradeChange, UPGRADES,
  getDispenseSpeed, setDispenseSpeed, DISPENSE_LABELS,
  getUpgradeSlots, getPrestigeMultiplier,
} from "./upgrades.js";
import { playPurchase, playClick } from "./sounds.js";

let shopInterval = null;
let shopChangeListener = null;

function stopShop() {
  if (shopInterval) { clearInterval(shopInterval); shopInterval = null; }
  if (shopChangeListener) { offUpgradeChange(shopChangeListener); shopChangeListener = null; }
}

export function launchUpgradeShop() {
  const body = document.createElement("div");
  body.className = "shop-app";

  // Status bar at top
  const status = document.createElement("div");
  status.className = "shop-status";
  body.appendChild(status);

  // Scrollable list
  const list = document.createElement("div");
  list.className = "shop-list";
  body.appendChild(list);

  function updateShop() {
    const prestigeMult = getPrestigeMultiplier();

    // Count owned upgrades
    const allSlots = getUpgradeSlots();
    const ownedCount = allSlots.filter(s => getUpgradeLevel(s.id) > s.tier).length;
    const totalCount = allSlots.length;

    let statusText = `Coin: ${inventory.coin} | Owned: ${ownedCount}/${totalCount}`;
    if (prestigeMult > 1) statusText += ` | Prestige: ${prestigeMult}x`;
    status.textContent = statusText;

    // Show the 5 cheapest available upgrades
    const availableSlots = allSlots.filter(s => getUpgradeLevel(s.id) === s.tier);
    const visibleSlots = availableSlots.slice(0, 5);

    // Clear list
    list.innerHTML = "";

    if (visibleSlots.length === 0) {
      const empty = document.createElement("div");
      empty.className = "shop-empty";
      empty.textContent = "All upgrades purchased!";
      list.appendChild(empty);
    }

    for (const slot of visibleSlots) {
      const item = document.createElement("div");
      item.className = "shop-item";

      const icon = document.createElement("img");
      icon.className = "shop-item-icon";
      icon.draggable = false;
      pixelateEmoji(slot.emoji).then((src) => { icon.src = src; });
      item.appendChild(icon);

      const info = document.createElement("div");
      info.className = "shop-item-info";

      const nameEl = document.createElement("div");
      nameEl.className = "shop-item-name";
      nameEl.textContent = slot.displayName;
      info.appendChild(nameEl);

      const descEl = document.createElement("div");
      descEl.className = "shop-item-desc";
      descEl.textContent = slot.desc;
      info.appendChild(descEl);

      item.appendChild(info);

      const costEl = document.createElement("div");
      costEl.className = "shop-item-cost";
      costEl.textContent = `${slot.cost} coin`;
      item.appendChild(costEl);

      const btn = document.createElement("button");
      btn.className = "shop-buy-btn";
      btn.textContent = "Buy";
      btn.disabled = inventory.coin < slot.cost;
      btn.addEventListener("click", () => {
        playClick();
        if (purchaseUpgrade(slot.id)) {
          playPurchase();
        }
      });
      item.appendChild(btn);

      list.appendChild(item);

      // Auto-Dispenser: show speed selector if any level is owned
      if (slot.id === "auto_dispense" && getUpgradeLevel("auto_dispense") > 0) {
        const speedSelector = document.createElement("div");
        speedSelector.className = "shop-speed-selector";
        const maxSpeed = getUpgradeLevel("auto_dispense") * 3;
        const currentSpeed = getDispenseSpeed();
        for (let s = 0; s <= maxSpeed; s++) {
          const sBtn = document.createElement("button");
          sBtn.className = "shop-speed-btn";
          if (s === currentSpeed) sBtn.classList.add("active");
          sBtn.textContent = DISPENSE_LABELS[s];
          sBtn.addEventListener("click", () => { playClick(); setDispenseSpeed(s); });
          speedSelector.appendChild(sBtn);
        }
        list.appendChild(speedSelector);
      }
    }
  }

  const entry = createWindow("upgrade-shop", "Upgrade Shop", body, {
    width: 340,
    height: 420,
    icon: "icons/upgrade-shop.svg",
    onClose: stopShop,
    minWidth: 280,
    minHeight: 250,
  });

  if (!entry) return;

  updateShop();

  // Poll coin balance
  shopInterval = setInterval(updateShop, 500);

  // Subscribe to upgrade changes
  shopChangeListener = onUpgradeChange(updateShop);
}
