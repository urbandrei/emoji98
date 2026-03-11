// ========== Pet Roster Window ==========

import { createWindow } from "./window-manager.js";
import { getPetAccessor, getUpgradeLevel } from "./upgrades.js";
import { playClick } from "./sounds.js";
import { getSpriteImage } from "./emoji-utils.js";

let rosterInterval = null;

function stopRoster() {
  if (rosterInterval) { clearInterval(rosterInterval); rosterInterval = null; }
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

export function launchPetRoster() {
  if (getUpgradeLevel("pet_roster") < 1) return;

  const body = document.createElement("div");
  body.className = "roster-app";

  const list = document.createElement("div");
  list.className = "roster-list";
  body.appendChild(list);

  function updateRoster() {
    const accessor = getPetAccessor();
    if (!accessor || !accessor.isPetGameOpen()) {
      list.innerHTML = '<p class="roster-empty">Open Emoji Pet first.</p>';
      return;
    }
    const allPets = accessor.getAllPets ? accessor.getAllPets() : [];
    const living = allPets.filter((p) => p.alive);
    list.innerHTML = "";

    if (living.length === 0) {
      list.innerHTML = '<p class="roster-empty">No pets alive.</p>';
      return;
    }

    const now = Date.now();
    for (const pet of living) {
      const row = document.createElement("div");
      row.className = "roster-row";

      const nameEl = document.createElement("span");
      nameEl.className = "roster-name";
      nameEl.textContent = `${pet.name.first} ${pet.name.last}`;
      row.appendChild(nameEl);

      // Mood icon — use cached sprite image
      const moodEl = document.createElement("img");
      moodEl.className = "roster-mood";
      const spriteImg = getSpriteImage(pet.faceCodepoint);
      moodEl.src = spriteImg ? spriteImg.src : "";
      moodEl.draggable = false;
      row.appendChild(moodEl);

      // Time alive
      const timeEl = document.createElement("span");
      timeEl.className = "roster-time";
      const elapsed = pet.birthTime ? now - pet.birthTime : 0;
      timeEl.textContent = formatTime(elapsed);
      row.appendChild(timeEl);

      // Grind button (requires roster_grind upgrade)
      if (getUpgradeLevel("roster_grind") >= 1) {
        const grindBtn = document.createElement("button");
        grindBtn.textContent = "Grind";
        grindBtn.addEventListener("click", () => {
          playClick();
          if (accessor.grindPet) accessor.grindPet(pet);
        });
        row.appendChild(grindBtn);
      }

      list.appendChild(row);
    }
  }

  const entry = createWindow("pet-roster", "Pet Roster", body, {
    width: 300,
    height: 350,
    icon: "icons/recycle-bin.svg",
    onClose: stopRoster,
    minWidth: 240,
    minHeight: 200,
  });

  if (!entry) return;

  const statusBar = document.createElement("div");
  statusBar.className = "status-bar";
  statusBar.innerHTML = '<p class="status-bar-field">Pet Roster</p>';
  entry.element.appendChild(statusBar);

  updateRoster();
  rosterInterval = setInterval(updateRoster, 500);
}
