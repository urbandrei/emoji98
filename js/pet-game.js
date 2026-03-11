// ========== Emoji Pet Game ==========

import { getSpriteImage } from "./index.js";
import { inventory, useInventory, onInventoryChange, offInventoryChange, addToRecycleBin } from "./index.js";
import { playFeed, playPetDeath, playPoopSplat, playHeart, playBirth, playClick, playLand } from "./sounds.js";
import { createWindow } from "./index.js";
import { debounce } from "./index.js";
import { getUpgradeLevel, registerPetAccessor, onUpgradeChange, offUpgradeChange, getDispenseSpeed, setDispenseSpeed, DISPENSE_INTERVALS, DISPENSE_LABELS } from "./upgrades.js";
import { SpatialGrid } from "./spatial-grid.js";
import { notifyTutorialEvent } from "./tutorial.js";
import { toLayoutX, toLayoutY } from "./scaling.js";

const FIRST_NAMES = [
  "Aanya","Abel","Ada","Adaeze","Aditi","Adriana","Aiko","Aisha","Akari","Akira",
  "Aleksei","Alejandro","Amara","Amina","Amit","Ana","Ananya","Anders","Andrei","Anika",
  "Anong","Antonio","Arjun","Arya","Asher","Astrid","Ava","Ayaan","Ayumi","Bao",
  "Beatriz","Bianca","Boris","Camila","Carlos","Carmen","Chen","Chiara","Chika","Chloe",
  "Clara","Daisuke","Dalila","Daniel","Daria","David","Davi","Diego","Dimitri","Elif",
  "Elias","Emeka","Emil","Emma","Emir","Enzo","Esme","Ethan","Eva","Fabian",
  "Fatima","Felix","Feng","Freya","Gabriel","Gia","Guillermo","Hana","Haruki","Hassan",
  "Hina","Hugo","Ibrahim","Ingrid","Irina","Isaac","Isla","Ivan","Ivy","Jade",
  "Javier","Jia","Jin","Jonas","Juan","Julia","Jun","Kai","Kamila","Kanya",
  "Kari","Katya","Kenji","Kenzo","Khalid","Kofi","Kwame","Layla","Leila","Leo",
  "Liam","Lina","Linh","Luca","Lucia","Luis","Luna","Maha","Maki","Malik",
  "Maren","Maria","Mariam","Mario","Maya","Mei","Mika","Mila","Mina","Miran",
  "Mohamed","Nadia","Naia","Naomi","Nari","Natalia","Nathan","Neha","Nia","Nico",
  "Nils","Nina","Noemi","Noor","Nora","Olga","Oliver","Omar","Ori","Oscar",
  "Pablo","Petra","Priya","Rabia","Rafael","Ravi","Reina","Riku","Rita","Rosa",
  "Rowan","Rui","Sachi","Sadie","Sakura","Salma","Sami","Sana","Santiago","Sara",
  "Sasha","Seo","Shan","Signe","Simone","Sofia","Soo","Soren","Suki","Sunita",
  "Tala","Tao","Tariq","Thiago","Tomas","Uma","Valentina","Vera","Viktor","Viola",
  "Vivaan","Wen","Xiao","Yael","Yara","Yuki","Yuna","Zain","Zara","Zuri",
  "Ade","Alma","Axel","Bodhi","Cai","Dara","Elio","Fen","Gio","Hiro",
  "Idris","Juno","Kaia","Lars","Milo","Neo","Omi","Pia","Rio","Teo",
];

const LAST_NAMES = [
  "Abdel","Adeyemi","Agarwal","Ahmed","Akiyama","Almeida","Amari","Andersen","Araya","Bae",
  "Bakker","Basu","Bauer","Begum","Bergman","Bhat","Blanchard","Bogdan","Cabrera","Campos",
  "Castillo","Chand","Chang","Chatterjee","Chen","Cho","Cohen","Costa","Cruz","Dahl",
  "Das","Demir","Deng","Desai","Diallo","Diaz","Dubois","Duong","Dvorak","Ekwueme",
  "Endo","Eriksen","Espinoza","Fang","Fernandez","Fischer","Flores","Fuentes","Fujita","Garcia",
  "Gomes","Gonzalez","Gupta","Guzman","Haddad","Hansen","Hara","Hashimoto","Hassan","Hayashi",
  "Herrera","Ho","Holm","Hossain","Huang","Ibrahim","Ikeda","Inoue","Islam","Ito",
  "Ivanov","Jain","Jensen","Jiang","Johansson","Kang","Kapoor","Kato","Kaur","Kawai",
  "Khan","Kim","Kobayashi","Kondo","Krishnan","Kumar","Kwon","Larsen","Laurent","Lee",
  "Li","Lim","Lin","Liu","Lopez","Lund","Luo","Mahajan","Malik","Marin",
  "Martinez","Matsuda","Mehta","Mendez","Meyer","Mizuno","Mohamed","Molina","Morales","Morita",
  "Moreno","Muller","Murakami","Nakamura","Nakata","Ndiaye","Nguyen","Nielsen","Nishida","Nkomo",
  "Obi","Ochoa","Ogawa","Oh","Okada","Olsen","Omar","Ono","Ortega","Ortiz",
  "Osei","Ota","Owusu","Ozturk","Padilla","Park","Patel","Perez","Petrov","Pham",
  "Popov","Prakash","Qin","Ramos","Rao","Reyes","Rivera","Roche","Rodriguez","Romano",
  "Roy","Ruiz","Saeed","Saitoh","Sakamoto","Salazar","Sandoval","Sanchez","Santos","Sato",
  "Schmidt","Shah","Sharma","Shimizu","Silva","Singh","Smirnov","Song","Soto","Sugiyama",
  "Sun","Suzuki","Takagi","Takahashi","Tan","Tanaka","Tang","Torres","Tran","Vargas",
  "Vasquez","Volkov","Wang","Watanabe","Weber","Wong","Wu","Xu","Yamada","Yamamoto",
  "Yang","Yao","Yilmaz","Yoshida","Yu","Zhang","Zhao","Zhou","Zhu","Zuniga",
  "Abe","Berg","Choi","Falk","Ghosh","Haas","Ide","Jung","Kern","Lam",
];

function generatePetName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return { first, last };
}

const MOOD_FACES = {
  happy: "1f600",
  neutral: "1f610",
  sad: "1f622",
  angry: "1f621",
  pleased: "1f60a",
  sick: "1f922",
  scared: "1f62c",
};

const POOP_CODEPOINT = "1f4a9";
const POOP_TICK_INTERVAL = 10000;
const POOP_PER_PET_CHANCE = 0.3;
const SICK_THRESHOLD = 15000;
const DEATH_THRESHOLD = 75000;
const POOP_PROXIMITY = 40;
const MAX_POOPS = 200;

const ITEMS = {
  food:  { codepoint: "1f354", label: "Feed" },
  water: { codepoint: "1f4a7", label: "Water" },
  play:  { codepoint: "26bd",  label: "Play" },
};

const ITEM_TYPES = ["food", "water", "play"];
const PET_SIZE = 20;
const ITEM_SIZE = 20;

// Coin value helpers
function getPoopCoinValue() { return [1, 2, 3, 5][getUpgradeLevel("poop_coin")]; }
function getSkullCoinValue() { return [2, 4, 6, 10][getUpgradeLevel("skull_coin")]; }
function getPetCoinValue() { return 5; }
function getRoombaCoinMult() { return [1, 1.5, 2, 3][getUpgradeLevel("roomba_coin")]; }

let petGame = null;

// ========== Canvas Drawing Helpers ==========

function drawSprite(ctx, codepoint, x, y, size) {
  const img = getSpriteImage(codepoint);
  if (img) ctx.drawImage(img, x, y, size, size);
}

function drawFlippedSprite(ctx, codepoint, x, y, size, scaleX) {
  const img = getSpriteImage(codepoint);
  if (!img) return;
  if (scaleX === -1) {
    ctx.save();
    ctx.translate(x + size, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, size, size);
    ctx.restore();
  } else {
    ctx.drawImage(img, x, y, size, size);
  }
}

function drawBubble(ctx, pet, iconCodepoint, isHeart) {
  const bx = isHeart ? pet.x + PET_SIZE / 2 - 10 : pet.x - 1;
  const by = isHeart ? pet.y - 24 : pet.y - 26;
  const bw = isHeart ? 18 : 22;
  const bh = isHeart ? 18 : 22;
  const r = 4;

  // White rounded rect with black border
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.lineTo(bx + bw - r, by);
  ctx.arcTo(bx + bw, by, bx + bw, by + r, r);
  ctx.lineTo(bx + bw, by + bh - r);
  ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
  ctx.lineTo(bx + r, by + bh);
  ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
  ctx.lineTo(bx, by + r);
  ctx.arcTo(bx, by, bx + r, by, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Triangle pointer
  const triX = bx + bw / 2;
  const triY = by + bh;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(triX - 5, triY);
  ctx.lineTo(triX + 5, triY);
  ctx.lineTo(triX, triY + 6);
  ctx.closePath();
  ctx.fill();

  // Icon inside
  const iconSize = isHeart ? 12 : 14;
  const iconX = bx + (bw - iconSize) / 2;
  const iconY = by + (bh - iconSize) / 2;
  drawSprite(ctx, iconCodepoint, iconX, iconY, iconSize);
}

function drawLifted(ctx, codepoint, x, y, size, scaleX) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x + size / 2 + 2, y + size + 2, size / 2, size / 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Draw lifted (shifted up)
  if (scaleX !== undefined) {
    drawFlippedSprite(ctx, codepoint, x, y - 4, size, scaleX);
  } else {
    drawSprite(ctx, codepoint, x, y - 4, size);
  }
}

function renderPetGame(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#4a8f29";
  ctx.fillRect(0, 0, w, h);

  // Draw poops
  for (const poop of petGame.poops) {
    if (poop.dragging) continue;
    if (poop.hovered) {
      drawLifted(ctx, POOP_CODEPOINT, poop.x, poop.y, 20);
    } else {
      drawSprite(ctx, POOP_CODEPOINT, poop.x, poop.y, 20);
    }
  }

  // Draw items (with fade opacity)
  for (const item of petGame.items) {
    if (item.consumed) continue;
    if (item.opacity < 1) ctx.globalAlpha = item.opacity;
    drawSprite(ctx, ITEMS[item.type].codepoint, item.x, item.y, 20);
    if (item.opacity < 1) ctx.globalAlpha = 1;
  }

  // Draw roombas
  for (const r of petGame.roombas) {
    drawFlippedSprite(ctx, "1f916", r.x, r.y, 20, r.scaleX || 1);
  }

  // Draw pets (with flip, bubbles, hearts)
  for (const pet of petGame.pets) {
    if (pet.dragging) continue;
    const cp = pet.alive ? pet.faceCodepoint : "1f480";
    if (pet.hovered) {
      drawLifted(ctx, cp, pet.x, pet.y, PET_SIZE, pet.scaleX);
    } else {
      drawFlippedSprite(ctx, cp, pet.x, pet.y, PET_SIZE, pet.scaleX);
    }
    if (pet.want && pet.alive) drawBubble(ctx, pet, ITEMS[pet.want].codepoint);
    if (pet.heartTimer > 0) drawBubble(ctx, pet, "2764", true);
  }
}

// ========== Canvas Hit Testing & Hover ==========

function hitTest(mx, my, entity, size) {
  return mx >= entity.x && mx <= entity.x + size &&
         my >= entity.y && my <= entity.y + size;
}

function canvasCoords(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function getMultiGrabRadius() {
  const mgLevel = getUpgradeLevel("multi_grab");
  if (mgLevel < 1) return 0;
  return [0, 40, 80, 150][mgLevel];
}

// Collect nearby poops and skulls for multi-grab hover/drag
function collectGrabGroup(centerX, centerY, primaryPoop, primarySkull) {
  const radius = getMultiGrabRadius();
  const poops = primaryPoop ? [primaryPoop] : [];
  const skulls = primarySkull ? [primarySkull] : [];
  if (radius > 0) {
    for (const p of petGame.poops) {
      if (p === primaryPoop) continue;
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) poops.push(p);
    }
    for (const pet of petGame.pets) {
      if (pet === primarySkull || pet.alive) continue;
      const dx = pet.x - centerX;
      const dy = pet.y - centerY;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) skulls.push(pet);
    }
  }
  return { poops, skulls };
}

function clearAllHovers() {
  if (!petGame) return;
  for (const p of petGame.poops) p.hovered = false;
  for (const pet of petGame.pets) pet.hovered = false;
}

function updateHover(canvas, e) {
  if (!petGame) return;
  clearAllHovers();

  const { x: mx, y: my } = canvasCoords(canvas, e);

  // Check skulls
  for (const pet of petGame.pets) {
    if (!pet.alive && hitTest(mx, my, pet, PET_SIZE)) {
      pet.hovered = true;
      const group = collectGrabGroup(pet.x + PET_SIZE / 2, pet.y + PET_SIZE / 2, null, pet);
      for (const p of group.poops) p.hovered = true;
      for (const s of group.skulls) s.hovered = true;
      canvas.style.cursor = "grab";
      return;
    }
  }
  // Check alive pets
  for (const pet of petGame.pets) {
    if (pet.alive && hitTest(mx, my, pet, PET_SIZE)) {
      pet.hovered = true;
      canvas.style.cursor = "grab";
      return;
    }
  }
  // Check poops
  for (const poop of petGame.poops) {
    if (hitTest(mx, my, poop, 20)) {
      poop.hovered = true;
      const group = collectGrabGroup(poop.x + 10, poop.y + 10, poop, null);
      for (const p of group.poops) p.hovered = true;
      for (const s of group.skulls) s.hovered = true;
      canvas.style.cursor = "grab";
      return;
    }
  }
  canvas.style.cursor = "";
}

function setupCanvasInput(canvas) {
  canvas.addEventListener("mousemove", (e) => {
    if (!petGame || petGame.dragging) return;
    updateHover(canvas, e);
  });

  canvas.addEventListener("mouseleave", () => {
    if (!petGame) return;
    clearAllHovers();
    canvas.style.cursor = "";
  });

  canvas.addEventListener("mousedown", (e) => {
    if (!petGame) return;
    e.preventDefault();
    const { x: mx, y: my } = canvasCoords(canvas, e);

    // Check dead pets (skulls) first
    for (const pet of petGame.pets) {
      if (!pet.alive && hitTest(mx, my, pet, PET_SIZE)) {
        startSkullDrag(e, pet);
        return;
      }
    }
    // Check alive pets
    for (const pet of petGame.pets) {
      if (pet.alive && hitTest(mx, my, pet, PET_SIZE)) {
        startPetDrag(e, pet);
        return;
      }
    }
    // Check poops
    for (const poop of petGame.poops) {
      if (hitTest(mx, my, poop, 20)) {
        startPoopDrag(e, poop);
        return;
      }
    }
  });
}

function createGhost(src) {
  const ghost = document.createElement("img");
  ghost.src = src;
  ghost.className = "drag-ghost";
  document.getElementById("game-root").appendChild(ghost);
  return ghost;
}

function positionGhosts(ghosts, ev) {
  const count = ghosts.length;
  for (let i = 0; i < count; i++) {
    // Fan out slightly around cursor
    const angle = (i / Math.max(count, 1)) * Math.PI * 2;
    const spread = count > 1 ? Math.min(count * 3, 20) : 0;
    const ox = Math.cos(angle) * spread;
    const oy = Math.sin(angle) * spread;
    ghosts[i].style.left = (toLayoutX(ev.clientX) - 15 + ox) + "px";
    ghosts[i].style.top = (toLayoutY(ev.clientY) - 15 + oy) + "px";
  }
}

function isOverBin(ev) {
  const bin = document.querySelector('.desktop-icon[data-app="recycle-bin"]');
  if (!bin) return false;
  const rect = bin.getBoundingClientRect();
  return ev.clientX >= rect.left && ev.clientX <= rect.right &&
         ev.clientY >= rect.top && ev.clientY <= rect.bottom;
}

function isOverCanvas(ev) {
  if (!petGame) return false;
  const rect = petGame.area.getBoundingClientRect();
  return ev.clientX >= rect.left && ev.clientX <= rect.right &&
         ev.clientY >= rect.top && ev.clientY <= rect.bottom;
}

function clampToArea(ev) {
  const areaRect = petGame.area.getBoundingClientRect();
  const scaleX = petGame.area.clientWidth / areaRect.width;
  const scaleY = petGame.area.clientHeight / areaRect.height;
  const x = Math.max(5, Math.min(petGame.area.clientWidth - 25,
    (ev.clientX - areaRect.left) * scaleX - 10));
  const y = Math.max(5, Math.min(petGame.area.clientHeight - 25,
    (ev.clientY - areaRect.top) * scaleY - 10));
  return { x, y };
}

function startPetDrag(e, pet) {
  const startX = e.clientX;
  const startY = e.clientY;
  let didDrag = false;
  let ghost = null;

  function onMove(ev) {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (!didDrag && Math.sqrt(dx * dx + dy * dy) > 5) {
      didDrag = true;
      const img = getSpriteImage(pet.faceCodepoint);
      ghost = createGhost(img ? img.src : "");
      pet.dragging = true;
      petGame.dragging = true;
      clearAllHovers();
    }
    if (ghost) {
      ghost.style.left = (toLayoutX(ev.clientX) - 15) + "px";
      ghost.style.top = (toLayoutY(ev.clientY) - 15) + "px";
    }
  }

  function onUp(ev) {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    if (ghost) ghost.remove();
    pet.dragging = false;
    petGame.dragging = false;

    if (!didDrag) {
      pet.heartTimer = 1500;
      playHeart();
      return;
    }

    if (isOverBin(ev)) {
      const originX = pet.x;
      const originY = pet.y;
      grindPet(pet);
      multiGrabAround(originX, originY);
      return;
    }

    // Dropped in pet area — relocate
    if (petGame && isOverCanvas(ev)) {
      const pos = clampToArea(ev);
      pet.x = pos.x;
      pet.y = pos.y;
      pet.targetX = pos.x;
      pet.targetY = pos.y;
    }
    // If off canvas, pet stays at original position (no change needed)
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

function startSkullDrag(e, pet) {
  // Collect the grab group (skull + nearby poops/skulls)
  const centerX = pet.x + PET_SIZE / 2;
  const centerY = pet.y + PET_SIZE / 2;
  const group = collectGrabGroup(centerX, centerY, null, pet);
  const allPoops = group.poops;
  const allSkulls = group.skulls;

  // Save original positions
  const originals = new Map();
  originals.set(pet, { x: pet.x, y: pet.y });
  for (const p of allPoops) originals.set(p, { x: p.x, y: p.y });
  for (const s of allSkulls) if (s !== pet) originals.set(s, { x: s.x, y: s.y });

  // Create ghosts for all
  const ghosts = [];
  const skullImg = getSpriteImage("1f480");
  ghosts.push(createGhost(skullImg ? skullImg.src : ""));
  pet.dragging = true;
  for (const p of allPoops) {
    const pImg = getSpriteImage(POOP_CODEPOINT);
    ghosts.push(createGhost(pImg ? pImg.src : ""));
    p.dragging = true;
  }
  for (const s of allSkulls) {
    if (s === pet) continue;
    ghosts.push(createGhost(skullImg ? skullImg.src : ""));
    s.dragging = true;
  }
  petGame.dragging = true;
  clearAllHovers();
  positionGhosts(ghosts, e);

  function onMove(ev) {
    positionGhosts(ghosts, ev);
  }

  function onUp(ev) {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    for (const g of ghosts) g.remove();
    petGame.dragging = false;

    if (isOverBin(ev)) {
      // Recycle everything
      dismissSkull(pet);
      for (const p of allPoops) {
        petGame.poops = petGame.poops.filter((pp) => pp !== p);
        addToRecycleBin({ name: { first: "poop", last: String(Date.now()).slice(-6) }, timestamp: Date.now(), coinValue: getPoopCoinValue() });
      }
      for (const s of allSkulls) {
        if (s === pet) continue;
        dismissSkull(s);
      }
      cureSickPets();
      notifyTutorialEvent("first-shred");
      return;
    }

    // Not over bin — restore or relocate
    if (isOverCanvas(ev)) {
      const pos = clampToArea(ev);
      // Drop primary at cursor, offset others relative
      const dx = pos.x - pet.x;
      const dy = pos.y - pet.y;
      pet.x = pos.x;
      pet.y = pos.y;
      pet.dragging = false;
      for (const p of allPoops) {
        const orig = originals.get(p);
        p.x = Math.max(0, Math.min(petGame.area.clientWidth - 20, orig.x + dx));
        p.y = Math.max(0, Math.min(petGame.area.clientHeight - 20, orig.y + dy));
        p.dragging = false;
      }
      for (const s of allSkulls) {
        if (s === pet) continue;
        const orig = originals.get(s);
        s.x = Math.max(5, Math.min(petGame.area.clientWidth - PET_SIZE - 5, orig.x + dx));
        s.y = Math.max(5, Math.min(petGame.area.clientHeight - PET_SIZE - 5, orig.y + dy));
        s.dragging = false;
      }
    } else {
      // Off canvas — return to original positions
      for (const [entity, orig] of originals) {
        entity.x = orig.x;
        entity.y = orig.y;
        entity.dragging = false;
      }
    }
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

function startPoopDrag(e, poop) {
  // Collect the grab group (poop + nearby poops/skulls)
  const centerX = poop.x + 10;
  const centerY = poop.y + 10;
  const group = collectGrabGroup(centerX, centerY, poop, null);
  const allPoops = group.poops;
  const allSkulls = group.skulls;

  // Save original positions
  const originals = new Map();
  originals.set(poop, { x: poop.x, y: poop.y });
  for (const p of allPoops) if (p !== poop) originals.set(p, { x: p.x, y: p.y });
  for (const s of allSkulls) originals.set(s, { x: s.x, y: s.y });

  // Create ghosts for all
  const ghosts = [];
  const poopImg = getSpriteImage(POOP_CODEPOINT);
  ghosts.push(createGhost(poopImg ? poopImg.src : ""));
  poop.dragging = true;
  for (const p of allPoops) {
    if (p === poop) continue;
    ghosts.push(createGhost(poopImg ? poopImg.src : ""));
    p.dragging = true;
  }
  const skullImg = getSpriteImage("1f480");
  for (const s of allSkulls) {
    ghosts.push(createGhost(skullImg ? skullImg.src : ""));
    s.dragging = true;
  }
  petGame.dragging = true;
  clearAllHovers();
  positionGhosts(ghosts, e);

  function onMove(ev) {
    positionGhosts(ghosts, ev);
  }

  function onUp(ev) {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    for (const g of ghosts) g.remove();
    petGame.dragging = false;

    if (isOverBin(ev)) {
      // Recycle everything
      for (const p of allPoops) {
        petGame.poops = petGame.poops.filter((pp) => pp !== p);
        addToRecycleBin({ name: { first: "poop", last: String(Date.now()).slice(-6) }, timestamp: Date.now(), coinValue: getPoopCoinValue() });
      }
      for (const s of allSkulls) {
        dismissSkull(s);
      }
      cureSickPets();
      notifyTutorialEvent("first-shred");
      return;
    }

    // Not over bin — restore or relocate
    if (isOverCanvas(ev)) {
      const pos = clampToArea(ev);
      const dx = pos.x - poop.x;
      const dy = pos.y - poop.y;
      poop.x = pos.x;
      poop.y = pos.y;
      poop.dragging = false;
      for (const p of allPoops) {
        if (p === poop) continue;
        const orig = originals.get(p);
        p.x = Math.max(0, Math.min(petGame.area.clientWidth - 20, orig.x + dx));
        p.y = Math.max(0, Math.min(petGame.area.clientHeight - 20, orig.y + dy));
        p.dragging = false;
      }
      for (const s of allSkulls) {
        const orig = originals.get(s);
        s.x = Math.max(5, Math.min(petGame.area.clientWidth - PET_SIZE - 5, orig.x + dx));
        s.y = Math.max(5, Math.min(petGame.area.clientHeight - PET_SIZE - 5, orig.y + dy));
        s.dragging = false;
      }
    } else {
      // Off canvas — return to original positions
      for (const [entity, orig] of originals) {
        entity.x = orig.x;
        entity.y = orig.y;
        entity.dragging = false;
      }
    }
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

// ========== Pet Entity (pure data) ==========

function getSplitThreshold() {
  const ranges = [[10, 15], [7, 11], [4, 8], [2, 5]];
  const [min, max] = ranges[getUpgradeLevel("reproduction")];
  return min + Math.floor(Math.random() * (max - min + 1));
}

function createPet(x, y) {
  const pet = {
    faceCodepoint: MOOD_FACES.happy,
    scaleX: 1,
    heartTimer: 0,
    dragging: false,
    hovered: false,
    name: generatePetName(),
    birthTime: Date.now(),
    x, y,
    targetX: x,
    targetY: y,
    speed: 0.8,
    mood: "happy",
    want: null,
    missedWants: 0,
    alive: true,
    sick: false,
    sickTimer: 0,
    crowded: false,
    crowdedTimer: 0,
    wanderTimer: 0,
    wantTimeout: null,
    ignoreTimeout: null,
    pleasedTimeout: null,
    poopCorner: null,
    fedCount: 0,
    splitThreshold: getSplitThreshold(),
  };

  setPetFace(pet, "happy");
  return pet;
}

function setPetFace(pet, mood) {
  if (pet.sick && mood !== "sick") return;
  if (pet.crowded && mood !== "scared" && mood !== "sick") return;
  pet.mood = mood;
  if (pet.alive || mood === "happy") {
    pet.faceCodepoint = MOOD_FACES[mood];
  }
}

function calcPetCap() {
  if (!petGame) return 1;
  const w = petGame.area.clientWidth;
  const h = petGame.area.clientHeight;
  const divisor = [6400, 4000, 2500, 1600][getUpgradeLevel("pet_cap")];
  return Math.max(1, Math.floor((w * h) / divisor));
}

function scheduleNextWant(pet) {
  if (!petGame || !pet.alive) return;
  const patienceLevel = getUpgradeLevel("patience");
  const baseDelay = [5000, 10000, 18000, 30000][patienceLevel];
  const delay = baseDelay + Math.random() * baseDelay * 0.5;
  pet.wantTimeout = setTimeout(() => {
    if (!petGame || !pet.alive) return;
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    setPetWant(pet, type);
  }, delay);
}

// Mood degrades with each missed want: happy -> neutral -> sad -> death
const NEGLECT_MOODS = ["happy", "neutral", "sad"];

function getNeglectMood(missedWants) {
  return NEGLECT_MOODS[Math.min(missedWants, NEGLECT_MOODS.length - 1)];
}

function setPetWant(pet, type) {
  if (!petGame || !pet.alive) return;
  pet.want = type;
  // Show their current neglect-level face while wanting
  setPetFace(pet, getNeglectMood(pet.missedWants));
  updatePetStatus();

  pet.ignoreTimeout = setTimeout(() => {
    if (!petGame || !pet.alive || !pet.want) return;
    pet.missedWants++;
    updatePetStatus();

    const missThreshold = [2, 3, 5, 7][getUpgradeLevel("patience")];
    if (pet.missedWants >= missThreshold) {
      killPet(pet);
      return;
    }

    // Show the degraded mood
    setPetFace(pet, getNeglectMood(pet.missedWants));

    setTimeout(() => {
      if (!petGame || !pet.alive) return;
      pet.want = null;
      // Stay at their degraded mood — no reset to happy
      scheduleNextWant(pet);
      updatePetStatus();
    }, 5000);
  }, 10000);
}

function updatePetStatus() {
  if (!petGame || !petGame.statusBar) return;
  const living = petGame.pets.filter((p) => p.alive);
  const wanting = living.filter((p) => p.want);
  let text = `Pets: ${living.length} | Coin: ${inventory.coin}`;
  if (wanting.length > 0) {
    text += ` | ${wanting.length} wanting`;
  }
  petGame.statusBar.querySelector(".status-bar-field").textContent = text;
}

function consumeItem(pet, item) {
  if (!petGame || !pet.alive) return;

  item.consumed = true;
  if (item.fadeTimer) clearTimeout(item.fadeTimer);

  pet.want = null;
  // Recover one neglect level per feeding (not full reset)
  if (pet.missedWants > 0) pet.missedWants--;

  if (pet.ignoreTimeout) { clearTimeout(pet.ignoreTimeout); pet.ignoreTimeout = null; }

  setPetFace(pet, "pleased");
  playFeed();
  notifyTutorialEvent("first-feed");

  if (pet.pleasedTimeout) clearTimeout(pet.pleasedTimeout);
  pet.pleasedTimeout = setTimeout(() => {
    if (!petGame || !pet.alive) return;
    // Return to their current neglect mood level
    setPetFace(pet, getNeglectMood(pet.missedWants));
  }, 2000);

  // Track feedings for reproduction
  pet.fedCount++;
  if (pet.fedCount >= pet.splitThreshold) {
    pet.fedCount = 0;
    pet.splitThreshold = getSplitThreshold();
    spawnChildPet(pet);
    updateCrowdedState();
  }

  updatePetStatus();
  scheduleNextWant(pet);
}

function killPet(pet) {
  pet.alive = false;
  pet.want = null;
  pet.heartTimer = 0;

  if (pet.wantTimeout) clearTimeout(pet.wantTimeout);
  if (pet.ignoreTimeout) clearTimeout(pet.ignoreTimeout);
  if (pet.pleasedTimeout) clearTimeout(pet.pleasedTimeout);

  playPetDeath();
  updatePetStatus();
  notifyTutorialEvent("first-death");
}

function grindPet(pet) {
  if (!petGame) return;
  notifyTutorialEvent("first-grind");
  pet.alive = false;
  pet.want = null;
  pet.heartTimer = 0;
  if (pet.wantTimeout) clearTimeout(pet.wantTimeout);
  if (pet.ignoreTimeout) clearTimeout(pet.ignoreTimeout);
  if (pet.pleasedTimeout) clearTimeout(pet.pleasedTimeout);

  addToRecycleBin({ name: pet.name, timestamp: Date.now(), coinValue: getPetCoinValue() });
  petGame.pets = petGame.pets.filter((p) => p !== pet);

  const living = petGame.pets.filter((p) => p.alive);
  if (living.length === 0) {
    const areaW = petGame.area.clientWidth;
    const areaH = petGame.area.clientHeight;
    const newPet = createPet(areaW / 2, areaH / 2);
    petGame.pets.push(newPet);
    scheduleNextWant(newPet);
  }
  updatePetStatus();
}

function multiGrabAround(originX, originY) {
  if (!petGame) return;
  const mgLevel = getUpgradeLevel("multi_grab");
  if (mgLevel < 1) return;
  const radius = [0, 40, 80, 150][mgLevel];

  // Use spatial grid for poops if available
  const nearbyPoops = petGame.poopGrid
    ? petGame.poopGrid.query(originX, originY, radius)
    : petGame.poops.filter((p) => {
        const dx = p.x - originX;
        const dy = p.y - originY;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
      });

  for (const p of nearbyPoops) {
    petGame.poops = petGame.poops.filter((pp) => pp !== p);
    addToRecycleBin({ name: { first: "poop", last: String(Date.now()).slice(-6) }, timestamp: Date.now(), coinValue: getPoopCoinValue() });
  }
  for (const pet of [...petGame.pets]) {
    if (!pet.alive) {
      const dx = pet.x - originX;
      const dy = pet.y - originY;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        dismissSkull(pet);
      }
    }
  }
  cureSickPets();
}

function dismissSkull(pet, coinValue) {
  if (!petGame) return;
  const cv = coinValue !== undefined ? coinValue : getSkullCoinValue();
  addToRecycleBin({ name: pet.name, timestamp: Date.now(), coinValue: cv });
  petGame.pets = petGame.pets.filter((p) => p !== pet);

  const living = petGame.pets.filter((p) => p.alive);
  if (living.length === 0) {
    const areaW = petGame.area.clientWidth;
    const areaH = petGame.area.clientHeight;
    const newPet = createPet(areaW / 2, areaH / 2);
    petGame.pets.push(newPet);
    scheduleNextWant(newPet);
  }
  updatePetStatus();
}

function getMostNeglectedPet(livingPets) {
  return livingPets.reduce((worst, p) => {
    if (!worst) return p;
    if (p.missedWants > worst.missedWants) return p;
    if (p.missedWants === worst.missedWants) {
      return petGame.pets.indexOf(p) < petGame.pets.indexOf(worst) ? p : worst;
    }
    return worst;
  }, null);
}

const CROWDED_DEATH_THRESHOLD = 15000;

function checkPetPopulationCap() {
  updateCrowdedState();
}

function updateCrowdedState() {
  if (!petGame) return;
  const cap = calcPetCap();
  const living = petGame.pets.filter((p) => p.alive);
  const overCount = living.length - cap;

  if (overCount <= 0) {
    for (const pet of living) {
      if (pet.crowded) {
        pet.crowded = false;
        pet.crowdedTimer = 0;
        if (!pet.sick) setPetFace(pet, getNeglectMood(pet.missedWants));
      }
    }
    return;
  }

  const sorted = [...living].sort((a, b) => {
    if (b.missedWants !== a.missedWants) return b.missedWants - a.missedWants;
    return petGame.pets.indexOf(a) - petGame.pets.indexOf(b);
  });

  const crowdedSet = new Set(sorted.slice(0, overCount));

  for (const pet of living) {
    if (crowdedSet.has(pet)) {
      if (!pet.crowded) {
        pet.crowded = true;
        pet.crowdedTimer = 0;
        setPetFace(pet, "scared");
        notifyTutorialEvent("first-crowded");
      }
    } else if (pet.crowded) {
      pet.crowded = false;
      pet.crowdedTimer = 0;
      if (!pet.sick) setPetFace(pet, getNeglectMood(pet.missedWants));
    }
  }
}

function spawnChildPet(parent) {
  if (!petGame) return;
  const areaW = petGame.area.clientWidth;
  const areaH = petGame.area.clientHeight;
  const offsetX = -20 + Math.random() * 40;
  const offsetY = -20 + Math.random() * 40;
  const x = Math.max(5, Math.min(areaW - PET_SIZE - 5, parent.x + offsetX));
  const y = Math.max(5, Math.min(areaH - PET_SIZE - 5, parent.y + offsetY));
  const child = createPet(x, y);
  petGame.pets.push(child);
  playBirth();
  notifyTutorialEvent("first-reproduction");
  scheduleNextWant(child);

  // Brief flash effect via heartTimer
  parent.heartTimer = 200;
}

function dropItem(type) {
  if (!petGame) return;
  if (!useInventory(type)) return;

  const area = petGame.area;
  const areaW = area.clientWidth;
  const areaH = area.clientHeight;

  const dropX = 10 + Math.random() * (areaW - ITEM_SIZE - 20);
  const landY = areaH * 0.3 + Math.random() * (areaH * 0.6 - ITEM_SIZE);
  const item = {
    type,
    x: dropX,
    y: -ITEM_SIZE,
    landY,
    vy: 0,
    landed: false,
    consumed: false,
    fadeTimer: null,
    opacity: 1,
    fadeStart: 0,
  };

  petGame.items.push(item);
}

function createPoopAt(rawX, rawY) {
  if (!petGame) return;
  if (petGame.poops.length >= MAX_POOPS) return;
  const areaW = petGame.area.clientWidth;
  const areaH = petGame.area.clientHeight;
  const px = Math.max(0, Math.min(areaW - 20, rawX));
  const py = Math.max(0, Math.min(areaH - 20, rawY));

  const poop = { x: px, y: py, dragging: false, hovered: false };
  petGame.poops.push(poop);
  playPoopSplat();
  notifyTutorialEvent("first-poop");
}

function spawnPoopPerPet() {
  if (!petGame) return;
  const living = petGame.pets.filter((p) => p.alive);
  for (const pet of living) {
    if (pet.poopCorner) continue;
    if (Math.random() < POOP_PER_PET_CHANCE) {
      if (getUpgradeLevel("poop_magnet") >= 1) {
        const areaW = petGame.area.clientWidth;
        const areaH = petGame.area.clientHeight;
        const corners = [[5, 5], [areaW - 25, 5], [5, areaH - 25], [areaW - 25, areaH - 25]];
        const corner = corners[Math.floor(Math.random() * corners.length)];
        pet.poopCorner = { x: corner[0], y: corner[1] };
        pet.targetX = corner[0];
        pet.targetY = corner[1];
      } else {
        createPoopAt(pet.x, pet.y + PET_SIZE);
      }
    }
  }
}

function nearPoopCount(pet) {
  if (!petGame) return 0;
  const cx = pet.x + PET_SIZE / 2;
  const cy = pet.y + PET_SIZE / 2;
  if (petGame.poopGrid) {
    return petGame.poopGrid.query(cx, cy, POOP_PROXIMITY).length;
  }
  let count = 0;
  for (const poop of petGame.poops) {
    const dx = cx - (poop.x + 10);
    const dy = cy - (poop.y + 10);
    if (Math.sqrt(dx * dx + dy * dy) < POOP_PROXIMITY) count++;
  }
  return count;
}

function cureSickPets() {
  if (!petGame) return;
  for (const pet of petGame.pets) {
    if (!pet.alive || !pet.sick) continue;
    if (nearPoopCount(pet) === 0) {
      pet.sick = false;
      pet.sickTimer = 0;
      setPetFace(pet, getNeglectMood(pet.missedWants));
    }
  }
}

function createRoomba(x, y) {
  return { x, y, targetX: x, targetY: y, wanderTimer: 0, scaleX: 1 };
}

function spawnRoombas() {
  if (!petGame) return;
  const count = getUpgradeLevel("roomba");
  const areaW = petGame.area.clientWidth;
  const areaH = petGame.area.clientHeight;
  for (let i = petGame.roombas.length; i < count; i++) {
    const x = 10 + Math.random() * (areaW - 30);
    const y = 10 + Math.random() * (areaH - 30);
    petGame.roombas.push(createRoomba(x, y));
  }
}

function resizeCanvas() {
  if (!petGame || !petGame.canvas) return;
  petGame.canvas.width = petGame.area.clientWidth;
  petGame.canvas.height = petGame.area.clientHeight;
  petGame.ctx.imageSmoothingEnabled = false;
}

function petLoop(timestamp) {
  if (!petGame) return;


  const elapsed = petGame.prevTimestamp ? timestamp - petGame.prevTimestamp : 16.667;
  const dt = Math.min(elapsed / 16.667, 3);
  petGame.prevTimestamp = timestamp;

  const area = petGame.area;
  const areaW = area.clientWidth;
  const areaH = area.clientHeight;

  // Resize canvas if needed
  if (petGame.canvas.width !== areaW || petGame.canvas.height !== areaH) {
    resizeCanvas();
  }

  // Rebuild spatial grid for poops
  petGame.poopGrid.clear();
  for (const p of petGame.poops) petGame.poopGrid.insert(p);

  // Poop timer (per-pet chance every 10s)
  petGame.poopTimer -= elapsed;
  if (petGame.poopTimer <= 0) {
    petGame.poopTimer = POOP_TICK_INTERVAL;
    spawnPoopPerPet();
  }

  // Update each pet
  for (const pet of petGame.pets) {
    if (!pet.alive) continue;

    pet.wanderTimer -= elapsed;
    if (pet.wanderTimer <= 0 && !pet.poopCorner) {
      pet.targetX = 5 + Math.random() * (areaW - PET_SIZE - 10);
      pet.targetY = 5 + Math.random() * (areaH - PET_SIZE - 10);
      pet.wanderTimer = 2000 + Math.random() * 2000;
    }

    let walkX = pet.targetX;
    let walkY = pet.targetY;
    let targetItem = null;

    if (pet.poopCorner) {
      walkX = pet.poopCorner.x;
      walkY = pet.poopCorner.y;
    } else if (pet.want) {
      let bestDist = Infinity;
      for (const item of petGame.items) {
        if (item.type === pet.want && item.landed && !item.consumed) {
          const d = Math.sqrt((pet.x - item.x) ** 2 + (pet.y - item.y) ** 2);
          if (d < bestDist) {
            bestDist = d;
            targetItem = item;
            walkX = item.x;
            walkY = item.y;
          }
        }
      }
    }

    const dx = walkX - pet.x;
    const dy = walkY - pet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speedBoostLevel = getUpgradeLevel("speed_boots");
    const speedMult = [1, 1.4, 1.8, 2.5][speedBoostLevel];
    const moveSpeed = targetItem ? 1.5 * speedMult : pet.speed;

    if (dist > 1) {
      const step = Math.min(moveSpeed * dt, dist);
      pet.x += (dx / dist) * step;
      pet.y += (dy / dist) * step;
    }

    pet.scaleX = dx < -1 ? -1 : 1;

    // Check if pet arrived at poop corner
    if (pet.poopCorner) {
      const pcDx = pet.poopCorner.x - pet.x;
      const pcDy = pet.poopCorner.y - pet.y;
      if (Math.sqrt(pcDx * pcDx + pcDy * pcDy) < 3) {
        createPoopAt(pet.poopCorner.x, pet.poopCorner.y + PET_SIZE);
        pet.poopCorner = null;
      }
    }

    if (targetItem && targetItem.landed && !targetItem.consumed) {
      const petCX = pet.x + PET_SIZE / 2;
      const petCY = pet.y + PET_SIZE / 2;
      const itemCX = targetItem.x + ITEM_SIZE / 2;
      const itemCY = targetItem.y + ITEM_SIZE / 2;
      const d = Math.sqrt((petCX - itemCX) ** 2 + (petCY - itemCY) ** 2);
      if (d < PET_SIZE * 0.7) {
        consumeItem(pet, targetItem);
      }
    }

    // Sickness from poop proximity — scales with nearby poop count
    const poopCount = nearPoopCount(pet);
    if (poopCount > 0) {
      // More poops = faster sickness accumulation (1 poop = 1x, 2 = 1.5x, 3 = 2x, etc.)
      const poopScale = 1 + (poopCount - 1) * 0.5;
      pet.sickTimer += elapsed * poopScale;
      const poopImmLevel = getUpgradeLevel("poop_immunity");
      const sickMult = [1, 1.5, 2.5, 5][poopImmLevel];
      if (!pet.sick && pet.sickTimer >= SICK_THRESHOLD * sickMult) {
        pet.sick = true;
        setPetFace(pet, "sick");
        notifyTutorialEvent("first-sick");
      }
      if (pet.sickTimer >= DEATH_THRESHOLD * sickMult) {
        killPet(pet);
      }
    } else if (pet.sick) {
      // Recover slowly when away from poop (drain sickTimer)
      pet.sickTimer -= elapsed * 0.5;
      if (pet.sickTimer <= 0) {
        pet.sick = false;
        pet.sickTimer = 0;
        setPetFace(pet, getNeglectMood(pet.missedWants));
      }
    }

    // Crowding death timer
    if (pet.crowded) {
      pet.crowdedTimer += elapsed;
      if (pet.crowdedTimer >= CROWDED_DEATH_THRESHOLD) {
        killPet(pet);
        updateCrowdedState();
      }
    }

    // Heart timer countdown
    if (pet.heartTimer > 0) {
      pet.heartTimer -= elapsed;
    }
  }

  // Roomba update
  for (const roomba of petGame.roombas) {
    roomba.wanderTimer -= elapsed;
    if (roomba.wanderTimer <= 0) {
      roomba.targetX = 5 + Math.random() * (areaW - 25);
      roomba.targetY = 5 + Math.random() * (areaH - 25);
      roomba.wanderTimer = 2000 + Math.random() * 2000;
    }

    // Radar: override target if poop/skull nearby
    const radarLevel = getUpgradeLevel("roomba_radar");
    if (radarLevel > 0) {
      const radarRadius = [0, 50, 100, 200][radarLevel];
      let bestDist = radarRadius;
      let bestTarget = null;

      // Use spatial grid for poop radar
      const nearbyPoops = petGame.poopGrid.query(roomba.x, roomba.y, radarRadius);
      for (const poop of nearbyPoops) {
        const dx = poop.x - roomba.x;
        const dy = poop.y - roomba.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) { bestDist = d; bestTarget = { x: poop.x, y: poop.y }; }
      }

      if (getUpgradeLevel("roomba_skulls") >= 1) {
        for (const pet of petGame.pets) {
          if (pet.alive) continue;
          const dx = pet.x - roomba.x;
          const dy = pet.y - roomba.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < bestDist) { bestDist = d; bestTarget = { x: pet.x, y: pet.y }; }
        }
      }
      if (bestTarget) {
        roomba.targetX = bestTarget.x;
        roomba.targetY = bestTarget.y;
      }
    }

    // Move toward target
    const rdx = roomba.targetX - roomba.x;
    const rdy = roomba.targetY - roomba.y;
    const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
    if (rdist > 1) {
      const step = Math.min(0.8 * dt, rdist);
      roomba.x += (rdx / rdist) * step;
      roomba.y += (rdy / rdist) * step;
    }
    roomba.scaleX = rdx < -1 ? -1 : 1;

    // Poop collision
    for (let i = petGame.poops.length - 1; i >= 0; i--) {
      const poop = petGame.poops[i];
      const dx = (roomba.x + 10) - (poop.x + 10);
      const dy = (roomba.y + 10) - (poop.y + 10);
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        petGame.poops.splice(i, 1);
        const coinVal = Math.floor(getPoopCoinValue() * getRoombaCoinMult());
        addToRecycleBin({ name: { first: "poop", last: String(Date.now()).slice(-6) }, timestamp: Date.now(), coinValue: coinVal });
        cureSickPets();
        break;
      }
    }

    // Skull collision
    if (getUpgradeLevel("roomba_skulls") >= 1) {
      for (const pet of [...petGame.pets]) {
        if (pet.alive) continue;
        const dx = (roomba.x + 10) - (pet.x + 10);
        const dy = (roomba.y + 10) - (pet.y + 10);
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
          const coinVal = Math.floor(getSkullCoinValue() * getRoombaCoinMult());
          dismissSkull(pet, coinVal);
          break;
        }
      }
    }
  }

  // Items: gravity + landing + fade
  for (const item of petGame.items) {
    if (item.consumed) continue;

    if (!item.landed) {
      item.vy += 0.3 * dt;
      item.y += item.vy * dt;
      if (item.y >= item.landY) {
        item.y = item.landY;
        item.landed = true;
        playLand();

        const wanted = petGame.pets.some((p) => p.alive && p.want === item.type);
        if (!wanted) {
          item.fadeTimer = setTimeout(() => {
            item.fadeStart = performance.now();
          }, 3000);
        }
      }
    }

    // Fade animation
    if (item.fadeStart > 0) {
      const fadeElapsed = performance.now() - item.fadeStart;
      item.opacity = Math.max(0, 1 - fadeElapsed / 500);
      if (item.opacity <= 0) {
        item.consumed = true;
      }
    }
  }

  petGame.items = petGame.items.filter((i) => !i.consumed);

  // Render
  renderPetGame(petGame.ctx, petGame.canvas.width, petGame.canvas.height);

  petGame.animationId = requestAnimationFrame(petLoop);
}

function stopPetGame() {
  if (!petGame) return;
  if (petGame.animationId) cancelAnimationFrame(petGame.animationId);
  if (petGame.autoDispenseTimeout) clearTimeout(petGame.autoDispenseTimeout);
  if (petGame.upgradeListener) offUpgradeChange(petGame.upgradeListener);
  for (const pet of petGame.pets) {
    if (pet.wantTimeout) clearTimeout(pet.wantTimeout);
    if (pet.ignoreTimeout) clearTimeout(pet.ignoreTimeout);
    if (pet.pleasedTimeout) clearTimeout(pet.pleasedTimeout);
  }
  petGame.items.forEach((i) => { if (i.fadeTimer) clearTimeout(i.fadeTimer); });
  offInventoryChange(petGame.inventoryListener);
  petGame = null;
}

export function launchEmojiGame() {
  const body = document.createElement("div");
  body.className = "pet-app";

  const area = document.createElement("div");
  area.className = "pet-area";

  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.imageRendering = "pixelated";
  area.appendChild(canvas);

  body.appendChild(area);

  const btnGroup = document.createElement("div");
  btnGroup.className = "pet-buttons";

  ITEM_TYPES.forEach((type) => {
    const btn = document.createElement("button");
    btn.dataset.itemType = type;
    btn.textContent = `${ITEMS[type].label} (${inventory[type]})`;
    btn.disabled = inventory[type] === 0;
    btn.addEventListener("click", () => { playClick(); dropItem(type); });
    btnGroup.appendChild(btn);
  });

  body.appendChild(btnGroup);

  // Auto-Dispenser speed selector row
  const dispenserRow = document.createElement("div");
  dispenserRow.className = "pet-dispenser-row";
  dispenserRow.style.display = "none";
  body.appendChild(dispenserRow);

  const dispPrev = document.createElement("button");
  dispPrev.textContent = "<";
  dispPrev.addEventListener("click", () => {
    playClick();
    const s = getDispenseSpeed();
    if (s > 0) setDispenseSpeed(s - 1);
  });

  const dispLabel = document.createElement("span");
  dispLabel.className = "dispenser-label";

  const dispNext = document.createElement("button");
  dispNext.textContent = ">";
  dispNext.addEventListener("click", () => {
    playClick();
    const maxSpeed = getUpgradeLevel("auto_dispense") * 3;
    const s = getDispenseSpeed();
    if (s < maxSpeed) setDispenseSpeed(s + 1);
  });

  dispenserRow.appendChild(dispPrev);
  dispenserRow.appendChild(dispLabel);
  dispenserRow.appendChild(dispNext);

  function updateDispenserRow() {
    const level = getUpgradeLevel("auto_dispense");
    if (level === 0) {
      dispenserRow.style.display = "none";
      return;
    }
    dispenserRow.style.display = "flex";
    const maxSpeed = level * 3;
    const currentSpeed = getDispenseSpeed();
    dispLabel.textContent = `Auto: ${DISPENSE_LABELS[currentSpeed]}`;
    dispPrev.disabled = currentSpeed <= 0;
    dispNext.disabled = currentSpeed >= maxSpeed;
  }

  const entry = createWindow("emoji-game", "Emoji Pet", body, {
    width: 350,
    height: 320,
    x: 80,
    y: 30,
    icon: "icons/emoji-game.svg",
    onClose: stopPetGame,
    minWidth: 200,
    minHeight: 200,
  });

  if (!entry) return;

  const statusBar = document.createElement("div");
  statusBar.className = "status-bar";
  statusBar.innerHTML = '<p class="status-bar-field">Pets: 1</p>';
  entry.element.appendChild(statusBar);

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const areaW = area.clientWidth || 310;
  const areaH = area.clientHeight || 220;
  canvas.width = areaW;
  canvas.height = areaH;

  petGame = {
    area,
    canvas,
    ctx,
    statusBar,
    items: [],
    pets: [],
    poops: [],
    animationId: null,
    prevTimestamp: 0,
    poopTimer: POOP_TICK_INTERVAL,
    roombas: [],
    poopGrid: new SpatialGrid(POOP_PROXIMITY),
    dragging: false,
  };

  setupCanvasInput(canvas);

  const firstPet = createPet(areaW / 2 - PET_SIZE / 2, areaH / 2 - PET_SIZE / 2);
  petGame.pets.push(firstPet);
  scheduleNextWant(firstPet);

  petGame.inventoryListener = function updatePetButtons() {
    const buttons = btnGroup.querySelectorAll("button");
    buttons.forEach((btn) => {
      const type = btn.dataset.itemType;
      if (type) {
        btn.textContent = `${ITEMS[type].label} (${inventory[type]})`;
        btn.disabled = inventory[type] === 0;
      }
    });
    updatePetStatus();
  };
  onInventoryChange(petGame.inventoryListener);

  entry.onResize = debounce(() => {
    resizeCanvas();
    checkPetPopulationCap();
  }, 200);
  petGame.animationId = requestAnimationFrame(petLoop);

  spawnRoombas();

  // Auto-Dispenser
  function autoDispenseTick() {
    if (!petGame) return;
    const speed = getDispenseSpeed();
    if (speed < 1) { petGame.autoDispenseTimeout = null; return; }
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    if (inventory[type] > 0) {
      dropItem(type);
    }
    petGame.autoDispenseTimeout = setTimeout(autoDispenseTick, DISPENSE_INTERVALS[speed]);
  }

  function restartAutoDispense() {
    if (!petGame) return;
    if (petGame.autoDispenseTimeout) { clearTimeout(petGame.autoDispenseTimeout); petGame.autoDispenseTimeout = null; }
    const speed = getDispenseSpeed();
    if (speed >= 1) {
      petGame.autoDispenseTimeout = setTimeout(autoDispenseTick, DISPENSE_INTERVALS[speed]);
    }
  }

  restartAutoDispense();
  updateDispenserRow();

  petGame.upgradeListener = onUpgradeChange(() => {
    restartAutoDispense();
    updateDispenserRow();
    spawnRoombas();
  });
}

// Exported accessors for upgrade system
export function getLivingPets() {
  if (!petGame) return [];
  return petGame.pets.filter((p) => p.alive);
}

export function isPetGameOpen() {
  return petGame !== null;
}

export { killPet, grindPet };

export function getAllPets() {
  if (!petGame) return [];
  return petGame.pets;
}

// Register accessor so upgrades.js can call these without circular imports
registerPetAccessor({ getLivingPets, killPet, isPetGameOpen, grindPet, getAllPets });
