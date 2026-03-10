// ========== Upgrade Shop Window ==========

import { createWindow } from "./window-manager.js";
import { pixelateEmoji } from "./emoji-utils.js";
import {
  upgradeState, getUpgradeLevel, isMaxed, canAffordUpgrade, purchaseUpgrade,
  onUpgradeChange, offUpgradeChange, getPetAccessor,
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

const ITEMS_PER_PAGE = 5;

export function launchUpgradeShop() {
  const body = document.createElement("div");
  body.className = "shop-app";

  // Warning banner
  const warning = document.createElement("div");
  warning.className = "shop-warning";
  warning.textContent = "Open Emoji Pet first to buy upgrades!";
  body.appendChild(warning);

  // Status bar at top
  const status = document.createElement("div");
  status.className = "shop-status";
  body.appendChild(status);

  // Tab bar for Available / Purchased
  const tabBar = document.createElement("div");
  tabBar.className = "shop-tab-bar";

  const availableTab = document.createElement("button");
  availableTab.className = "shop-tab active";
  availableTab.textContent = "Available";
  tabBar.appendChild(availableTab);

  const purchasedTab = document.createElement("button");
  purchasedTab.className = "shop-tab";
  purchasedTab.textContent = "Purchased";
  tabBar.appendChild(purchasedTab);

  body.appendChild(tabBar);

  // Scrollable list
  const list = document.createElement("div");
  list.className = "shop-list";
  body.appendChild(list);

  // Pagination
  const pagination = document.createElement("div");
  pagination.className = "shop-pagination";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "< Prev";
  prevBtn.addEventListener("click", () => { playClick(); currentPage--; updateShop(); });
  pagination.appendChild(prevBtn);

  const pageInfo = document.createElement("span");
  pageInfo.className = "shop-page-info";
  pagination.appendChild(pageInfo);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next >";
  nextBtn.addEventListener("click", () => { playClick(); currentPage++; updateShop(); });
  pagination.appendChild(nextBtn);

  body.appendChild(pagination);

  let currentPage = 0;
  let showPurchased = false;

  availableTab.addEventListener("click", () => {
    playClick();
    showPurchased = false;
    currentPage = 0;
    availableTab.classList.add("active");
    purchasedTab.classList.remove("active");
    updateShop();
  });

  purchasedTab.addEventListener("click", () => {
    playClick();
    showPurchased = true;
    currentPage = 0;
    purchasedTab.classList.add("active");
    availableTab.classList.remove("active");
    updateShop();
  });

  function updateShop() {
    const accessor = getPetAccessor();
    const petOpen = accessor && accessor.isPetGameOpen();
    const livingCount = petOpen ? accessor.getLivingPets().length : 0;
    const prestigeMult = getPrestigeMultiplier();

    warning.style.display = petOpen ? "none" : "block";
    let statusText = `Living Pets: ${livingCount} | Sacrificed: ${upgradeState.totalSacrificed}`;
    if (prestigeMult > 1) statusText += ` | Prestige: ${prestigeMult}x`;
    status.textContent = statusText;

    const allSlots = getUpgradeSlots();

    let displaySlots;
    if (showPurchased) {
      // Show all tiers that have been purchased
      displaySlots = allSlots.filter(s => getUpgradeLevel(s.id) > s.tier);
    } else {
      // Show the next unpurchased tier for each upgrade (prerequisite: previous tier owned)
      displaySlots = allSlots.filter(s => getUpgradeLevel(s.id) === s.tier);
    }

    const totalPages = Math.max(1, Math.ceil(displaySlots.length / ITEMS_PER_PAGE));
    if (currentPage >= totalPages) currentPage = totalPages - 1;
    if (currentPage < 0) currentPage = 0;

    const startIdx = currentPage * ITEMS_PER_PAGE;
    const pageSlots = displaySlots.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    // Clear list
    list.innerHTML = "";

    if (pageSlots.length === 0) {
      const empty = document.createElement("div");
      empty.className = "shop-empty";
      empty.textContent = showPurchased ? "No upgrades purchased yet." : "All upgrades purchased!";
      list.appendChild(empty);
    }

    for (const slot of pageSlots) {
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

      if (showPurchased) {
        const ownedEl = document.createElement("div");
        ownedEl.className = "shop-item-cost shop-maxed";
        ownedEl.textContent = "Owned";
        item.appendChild(ownedEl);
      } else {
        const costEl = document.createElement("div");
        costEl.className = "shop-item-cost";
        costEl.textContent = `${slot.cost} pet${slot.cost !== 1 ? "s" : ""}`;
        item.appendChild(costEl);

        const btn = document.createElement("button");
        btn.className = "shop-buy-btn";
        btn.textContent = "Buy";
        btn.disabled = !petOpen || livingCount < slot.cost;
        btn.addEventListener("click", () => {
          playClick();
          if (purchaseUpgrade(slot.id)) {
            playPurchase();
          }
        });
        item.appendChild(btn);
      }

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

    // Update pagination
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalPages - 1;
    pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;
    pagination.style.display = totalPages <= 1 ? "none" : "flex";
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

  // Poll pet count
  shopInterval = setInterval(updateShop, 500);

  // Subscribe to upgrade changes
  shopChangeListener = onUpgradeChange(updateShop);
}
