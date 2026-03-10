// ========== Emoji Pet Game ==========

import { pixelateEmoji } from "./index.js";
import { inventory, useInventory, onInventoryChange, offInventoryChange, addToRecycleBin } from "./index.js";
import { playFeed, playPetDeath, playPoopSplat, playHeart, playBirth, playClick, playLand } from "./sounds.js";
import { createWindow, isWindowActive, isWindowMinimized } from "./index.js";
import { debounce } from "./index.js";
import { getUpgradeLevel, registerPetAccessor, onUpgradeChange, offUpgradeChange, getDispenseSpeed, setDispenseSpeed, DISPENSE_INTERVALS, DISPENSE_LABELS } from "./upgrades.js";

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

const ITEMS = {
  food:  { codepoint: "1f354", label: "Feed" },
  water: { codepoint: "1f4a7", label: "Water" },
  play:  { codepoint: "26bd",  label: "Play" },
};

const ITEM_TYPES = ["food", "water", "play"];
const PET_SIZE = 20;
const ITEM_SIZE = 20;

let petGame = null;

function createPet(area, x, y) {
  const petEl = document.createElement("img");
  petEl.className = "pet-sprite";
  petEl.draggable = false;
  area.appendChild(petEl);

  const bubble = document.createElement("div");
  bubble.className = "pet-bubble";
  bubble.style.display = "none";
  const bubbleImg = document.createElement("img");
  bubbleImg.draggable = false;
  bubble.appendChild(bubbleImg);
  area.appendChild(bubble);

  const heartBubble = document.createElement("div");
  heartBubble.className = "pet-heart-bubble";
  area.appendChild(heartBubble);

  pixelateEmoji("2764").then((src) => {
    const heartImg = document.createElement("img");
    heartImg.src = src;
    heartImg.draggable = false;
    heartBubble.appendChild(heartImg);
  });

  const pet = {
    el: petEl,
    bubble,
    bubbleImg,
    heartBubble,
    heartTimeout: null,
    name: generatePetName(),
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
  };

  setPetFace(pet, "happy");
  petEl.style.transform = `translate(${x}px, ${y}px)`;

  petEl.addEventListener("click", () => {
    if (!pet.alive) return;
    if (pet.heartTimeout) clearTimeout(pet.heartTimeout);
    heartBubble.style.left = (pet.x + PET_SIZE / 2 - 10) + "px";
    heartBubble.style.top = (pet.y - 24) + "px";
    heartBubble.classList.add("visible");
    playHeart();
    pet.heartTimeout = setTimeout(() => {
      heartBubble.classList.remove("visible");
    }, 1500);
  });

  return pet;
}

async function setPetFace(pet, mood) {
  if (pet.sick && mood !== "sick") return;
  if (pet.crowded && mood !== "scared" && mood !== "sick") return;
  pet.mood = mood;
  const src = await pixelateEmoji(MOOD_FACES[mood]);
  if (pet.alive || mood === "happy") pet.el.src = src;
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
  const baseDelay = [15000, 20000, 25000, 35000][patienceLevel];
  const delay = baseDelay + Math.random() * baseDelay;
  pet.wantTimeout = setTimeout(() => {
    if (!petGame || !pet.alive) return;
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    setPetWant(pet, type);
  }, delay);
}

async function setPetWant(pet, type) {
  if (!petGame || !pet.alive) return;
  pet.want = type;
  setPetFace(pet, "neutral");

  const src = await pixelateEmoji(ITEMS[type].codepoint);
  pet.bubbleImg.src = src;
  pet.bubble.style.display = "flex";
  updatePetStatus();

  pet.ignoreTimeout = setTimeout(() => {
    if (!petGame || !pet.alive || !pet.want) return;
    pet.missedWants++;
    setPetFace(pet, "sad");
    updatePetStatus();

    const missThreshold = [3, 4, 5, 7][getUpgradeLevel("patience")];
    if (pet.missedWants >= missThreshold) {
      killPet(pet);
      return;
    }

    setTimeout(() => {
      if (!petGame || !pet.alive) return;
      pet.want = null;
      pet.bubble.style.display = "none";
      setPetFace(pet, "happy");
      scheduleNextWant(pet);
      updatePetStatus();
    }, 5000);
  }, 10000);
}

function updatePetStatus() {
  if (!petGame || !petGame.statusBar) return;
  const living = petGame.pets.filter((p) => p.alive);
  const wanting = living.filter((p) => p.want);
  let text = `Pets: ${living.length}`;
  if (wanting.length > 0) {
    text += ` | ${wanting.length} want${wanting.length > 1 ? "s" : ""} something`;
  }
  petGame.statusBar.querySelector(".status-bar-field").textContent = text;
}

function consumeItem(pet, item) {
  if (!petGame || !pet.alive) return;

  item.consumed = true;
  item.el.remove();
  if (item.fadeTimer) clearTimeout(item.fadeTimer);

  pet.want = null;
  pet.bubble.style.display = "none";
  pet.missedWants = 0;

  if (pet.ignoreTimeout) { clearTimeout(pet.ignoreTimeout); pet.ignoreTimeout = null; }

  setPetFace(pet, "pleased");
  playFeed();

  if (pet.pleasedTimeout) clearTimeout(pet.pleasedTimeout);
  pet.pleasedTimeout = setTimeout(() => {
    if (!petGame || !pet.alive) return;
    setPetFace(pet, "happy");
  }, 2000);

  updatePetStatus();
  scheduleNextWant(pet);
}

async function killPet(pet) {
  pet.alive = false;
  pet.want = null;
  pet.bubble.style.display = "none";
  pet.heartBubble.classList.remove("visible");
  if (pet.heartTimeout) clearTimeout(pet.heartTimeout);

  if (pet.wantTimeout) clearTimeout(pet.wantTimeout);
  if (pet.ignoreTimeout) clearTimeout(pet.ignoreTimeout);
  if (pet.pleasedTimeout) clearTimeout(pet.pleasedTimeout);

  playPetDeath();
  const skullSrc = await pixelateEmoji("1f480");
  pet.el.src = skullSrc;
  pet.el.style.cursor = "grab";

  pet.el.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const skullOriginX = pet.x;
    const skullOriginY = pet.y;
    startDrag(e, pet.el, () => {
      dismissSkull(pet);

      // Multi-grab radius for skull drag
      const mgLevel = getUpgradeLevel("multi_grab");
      if (mgLevel >= 1) {
        const radius = [0, 40, 80, 150][mgLevel];
        for (const p of [...petGame.poops]) {
          const dx = p.x - skullOriginX;
          const dy = p.y - skullOriginY;
          if (Math.sqrt(dx * dx + dy * dy) <= radius) {
            p.el.remove();
            petGame.poops = petGame.poops.filter((pp) => pp !== p);
            addToRecycleBin({ name: { first: "poop", last: String(Date.now()).slice(-6) }, timestamp: Date.now() });
          }
        }
        for (const other of [...petGame.pets]) {
          if (!other.alive && other !== pet) {
            const dx = other.x - skullOriginX;
            const dy = other.y - skullOriginY;
            if (Math.sqrt(dx * dx + dy * dy) <= radius) {
              dismissSkull(other);
            }
          }
        }
      }
      cureSickPets();
    });
  });
  updatePetStatus();
}

function dismissSkull(pet) {
  if (!petGame) return;
  addToRecycleBin({ name: pet.name, timestamp: Date.now() });
  pet.el.remove();
  pet.bubble.remove();
  pet.heartBubble.remove();
  petGame.pets = petGame.pets.filter((p) => p !== pet);

  const living = petGame.pets.filter((p) => p.alive);
  if (living.length === 0) {
    const areaW = petGame.area.clientWidth;
    const areaH = petGame.area.clientHeight;
    const newPet = createPet(petGame.area, areaW / 2, areaH / 2);
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
  // Called on resize — just update crowding state, don't insta-kill
  updateCrowdedState();
}

function updateCrowdedState() {
  if (!petGame) return;
  const cap = calcPetCap();
  const living = petGame.pets.filter((p) => p.alive);
  const overCount = living.length - cap;

  if (overCount <= 0) {
    // Relieve all crowded pets
    for (const pet of living) {
      if (pet.crowded) {
        pet.crowded = false;
        pet.crowdedTimer = 0;
        if (!pet.sick) setPetFace(pet, "happy");
      }
    }
    return;
  }

  // Pick the most neglected pets to be crowded
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
      }
    } else if (pet.crowded) {
      pet.crowded = false;
      pet.crowdedTimer = 0;
      if (!pet.sick) setPetFace(pet, "happy");
    }
  }
}

function tryPetSplit() {
  if (!petGame) return;
  const splitChance = [0.25, 0.35, 0.50, 0.70][getUpgradeLevel("reproduction")];
  for (const pet of petGame.pets) {
    if (!pet.alive) continue;
    if (Math.random() < splitChance) {
      spawnChildPet(pet);
    }
  }
  updateCrowdedState();
}

function spawnChildPet(parent) {
  if (!petGame) return;
  const areaW = petGame.area.clientWidth;
  const areaH = petGame.area.clientHeight;
  const offsetX = -20 + Math.random() * 40;
  const offsetY = -20 + Math.random() * 40;
  const x = Math.max(5, Math.min(areaW - PET_SIZE - 5, parent.x + offsetX));
  const y = Math.max(5, Math.min(areaH - PET_SIZE - 5, parent.y + offsetY));
  const child = createPet(petGame.area, x, y);
  petGame.pets.push(child);
  playBirth();
  scheduleNextWant(child);

  parent.el.style.filter = "brightness(2)";
  setTimeout(() => { if (parent.alive) parent.el.style.filter = ""; }, 200);
}

async function dropItem(type) {
  if (!petGame) return;
  if (!useInventory(type)) return;

  const area = petGame.area;
  const areaW = area.clientWidth;
  const areaH = area.clientHeight;
  const src = await pixelateEmoji(ITEMS[type].codepoint);

  const img = document.createElement("img");
  img.className = "pet-item";
  img.src = src;
  img.draggable = false;

  const dropX = 10 + Math.random() * (areaW - ITEM_SIZE - 20);
  const landY = areaH * 0.3 + Math.random() * (areaH * 0.6 - ITEM_SIZE);
  const item = {
    el: img,
    type,
    x: dropX,
    y: -ITEM_SIZE,
    landY,
    vy: 0,
    landed: false,
    consumed: false,
    fadeTimer: null,
  };

  img.style.transform = `translate(${dropX}px, ${-ITEM_SIZE}px)`;
  area.appendChild(img);
  petGame.items.push(item);
}

async function createPoopAt(x, y) {
  if (!petGame) return;
  const el = document.createElement("img");
  el.className = "poop-sprite";
  const src = await pixelateEmoji(POOP_CODEPOINT);
  el.src = src;
  el.draggable = false;

  let poopX = x;
  let poopY = y;

  // Poop Magnet: force poop to corners
  if (getUpgradeLevel("poop_magnet") >= 1) {
    const areaW = petGame.area.clientWidth;
    const areaH = petGame.area.clientHeight;
    const corners = [[5, 5], [areaW - 25, 5], [5, areaH - 25], [areaW - 25, areaH - 25]];
    const corner = corners[Math.floor(Math.random() * corners.length)];
    poopX = corner[0];
    poopY = corner[1];
  }

  el.style.transform = `translate(${poopX}px, ${poopY}px)`;
  petGame.area.appendChild(el);
  const poop = { el, x: poopX, y: poopY };
  petGame.poops.push(poop);
  playPoopSplat();

  const originX = poopX;
  const originY = poopY;

  el.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startDrag(e, el, () => {
      // Remove the dragged poop
      poop.el.remove();
      petGame.poops = petGame.poops.filter((p) => p !== poop);
      addToRecycleBin({ name: { first: "poop", last: String(Date.now()).slice(-6) }, timestamp: Date.now() });

      // Multi-grab: collect nearby poops and skulls within radius
      const mgLevel = getUpgradeLevel("multi_grab");
      if (mgLevel >= 1) {
        const radius = [0, 40, 80, 150][mgLevel];
        for (const p of [...petGame.poops]) {
          const dx = p.x - originX;
          const dy = p.y - originY;
          if (Math.sqrt(dx * dx + dy * dy) <= radius) {
            p.el.remove();
            petGame.poops = petGame.poops.filter((pp) => pp !== p);
            addToRecycleBin({ name: { first: "poop", last: String(Date.now()).slice(-6) }, timestamp: Date.now() });
          }
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
      }
      cureSickPets();
    });
  });
}

function spawnPoopPerPet() {
  if (!petGame) return;
  const living = petGame.pets.filter((p) => p.alive);
  for (const pet of living) {
    if (Math.random() < POOP_PER_PET_CHANCE) {
      createPoopAt(pet.x, pet.y + PET_SIZE);
    }
  }
}

function nearPoop(pet) {
  if (!petGame) return false;
  const cx = pet.x + PET_SIZE / 2;
  const cy = pet.y + PET_SIZE / 2;
  for (const poop of petGame.poops) {
    const dx = cx - (poop.x + 10);
    const dy = cy - (poop.y + 10);
    if (Math.sqrt(dx * dx + dy * dy) < POOP_PROXIMITY) return true;
  }
  return false;
}

function cureSickPets() {
  if (!petGame) return;
  for (const pet of petGame.pets) {
    if (!pet.alive || !pet.sick) continue;
    if (!nearPoop(pet)) {
      pet.sick = false;
      pet.sickTimer = 0;
      setPetFace(pet, "happy");
    }
  }
}

function startDrag(e, sourceEl, onDrop) {
  const ghost = document.createElement("img");
  ghost.src = sourceEl.src;
  ghost.className = "drag-ghost";
  ghost.style.left = (e.clientX - 15) + "px";
  ghost.style.top = (e.clientY - 15) + "px";
  document.body.appendChild(ghost);
  sourceEl.style.visibility = "hidden";

  function onMove(ev) {
    ghost.style.left = (ev.clientX - 15) + "px";
    ghost.style.top = (ev.clientY - 15) + "px";
  }

  function onUp(ev) {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    ghost.remove();

    const bin = document.querySelector('.desktop-icon[data-app="recycle-bin"]');
    if (bin) {
      const rect = bin.getBoundingClientRect();
      if (ev.clientX >= rect.left && ev.clientX <= rect.right &&
          ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
        onDrop();
        return;
      }
    }
    sourceEl.style.visibility = "";
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

async function createRoomba(area, x, y) {
  const el = document.createElement("img");
  el.className = "roomba-sprite";
  const src = await pixelateEmoji("1f916");
  el.src = src;
  el.draggable = false;
  el.style.transform = `translate(${x}px, ${y}px)`;
  area.appendChild(el);
  return { el, x, y, targetX: x, targetY: y, wanderTimer: 0 };
}

function spawnRoombas() {
  if (!petGame) return;
  const count = getUpgradeLevel("roomba");
  const areaW = petGame.area.clientWidth;
  const areaH = petGame.area.clientHeight;
  for (let i = petGame.roombas.length; i < count; i++) {
    const x = 10 + Math.random() * (areaW - 30);
    const y = 10 + Math.random() * (areaH - 30);
    createRoomba(petGame.area, x, y).then((r) => {
      if (petGame) petGame.roombas.push(r);
    });
  }
}

function petLoop(timestamp) {
  if (!petGame) return;

  // Pause logic
  const minimized = isWindowMinimized("emoji-game");
  const active = isWindowActive("emoji-game");
  const shouldPause = minimized
    ? getUpgradeLevel("active_minimized") < 1
    : (!active && getUpgradeLevel("active_deselected") < 1);
  if (shouldPause) {
    petGame.prevTimestamp = 0;
    petGame.animationId = requestAnimationFrame(petLoop);
    return;
  }

  const elapsed = petGame.prevTimestamp ? timestamp - petGame.prevTimestamp : 16.667;
  const dt = Math.min(elapsed / 16.667, 3);
  petGame.prevTimestamp = timestamp;

  const area = petGame.area;
  const areaW = area.clientWidth;
  const areaH = area.clientHeight;

  // Split timer
  petGame.splitTimer -= elapsed;
  if (petGame.splitTimer <= 0) {
    petGame.splitTimer = 30000;
    tryPetSplit();
  }

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
    if (pet.wanderTimer <= 0) {
      pet.targetX = 5 + Math.random() * (areaW - PET_SIZE - 10);
      pet.targetY = 5 + Math.random() * (areaH - PET_SIZE - 10);
      pet.wanderTimer = 2000 + Math.random() * 2000;
    }

    let walkX = pet.targetX;
    let walkY = pet.targetY;
    let targetItem = null;

    if (pet.want) {
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

    const scaleX = dx < -1 ? -1 : 1;
    pet.el.style.transform = `translate(${pet.x}px, ${pet.y}px) scaleX(${scaleX})`;

    if (pet.bubble.style.display !== "none") {
      pet.bubble.style.left = (pet.x - 1) + "px";
      pet.bubble.style.top = (pet.y - 26) + "px";
    }

    if (pet.heartBubble.classList.contains("visible")) {
      pet.heartBubble.style.left = (pet.x + PET_SIZE / 2 - 10) + "px";
      pet.heartBubble.style.top = (pet.y - 24) + "px";
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

    // Sickness from poop proximity (Poop Immunity slows this)
    if (nearPoop(pet)) {
      pet.sickTimer += elapsed;
      const poopImmLevel = getUpgradeLevel("poop_immunity");
      const sickMult = [1, 1.5, 2.5, 5][poopImmLevel];
      if (!pet.sick && pet.sickTimer >= SICK_THRESHOLD * sickMult) {
        pet.sick = true;
        setPetFace(pet, "sick");
      }
      if (pet.sickTimer >= DEATH_THRESHOLD * sickMult) {
        killPet(pet);
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
      for (const poop of petGame.poops) {
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
    const rScaleX = rdx < -1 ? -1 : 1;
    roomba.el.style.transform = `translate(${roomba.x}px, ${roomba.y}px) scaleX(${rScaleX})`;

    // Poop collision
    for (let i = petGame.poops.length - 1; i >= 0; i--) {
      const poop = petGame.poops[i];
      const dx = (roomba.x + 10) - (poop.x + 10);
      const dy = (roomba.y + 10) - (poop.y + 10);
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        poop.el.remove();
        petGame.poops.splice(i, 1);
        addToRecycleBin({ name: { first: "poop", last: String(Date.now()).slice(-6) }, timestamp: Date.now() });
        cureSickPets();
        break;
      }
    }

    // Skull collision (if roomba_skulls owned)
    if (getUpgradeLevel("roomba_skulls") >= 1) {
      for (const pet of [...petGame.pets]) {
        if (pet.alive) continue;
        const dx = (roomba.x + 10) - (pet.x + 10);
        const dy = (roomba.y + 10) - (pet.y + 10);
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
          dismissSkull(pet);
          break;
        }
      }
    }
  }

  // Items: gravity + landing
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
            item.el.classList.add("fading");
            setTimeout(() => {
              item.consumed = true;
              item.el.remove();
            }, 500);
          }, 3000);
        }
      }
      item.el.style.transform = `translate(${item.x}px, ${item.y}px)`;
    }
  }

  petGame.items = petGame.items.filter((i) => !i.consumed);
  petGame.animationId = requestAnimationFrame(petLoop);
}

function stopPetGame() {
  if (!petGame) return;
  if (petGame.animationId) cancelAnimationFrame(petGame.animationId);
  if (petGame.autoDispenseTimeout) clearTimeout(petGame.autoDispenseTimeout);
  if (petGame.upgradeListener) offUpgradeChange(petGame.upgradeListener);
  for (const roomba of petGame.roombas) roomba.el.remove();
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

  // Auto-Dispenser speed selector row (visible when auto_dispense is owned)
  const dispenserRow = document.createElement("div");
  dispenserRow.className = "pet-dispenser-row";
  dispenserRow.style.display = "none";
  body.appendChild(dispenserRow);

  function updateDispenserRow() {
    const level = getUpgradeLevel("auto_dispense");
    if (level === 0) {
      dispenserRow.style.display = "none";
      return;
    }
    dispenserRow.style.display = "flex";
    const maxSpeed = level * 3;
    const currentSpeed = getDispenseSpeed();
    const needed = maxSpeed + 2; // label + buttons
    if (dispenserRow.children.length !== needed) {
      dispenserRow.innerHTML = "";
      const label = document.createElement("span");
      label.textContent = "Auto:";
      label.style.fontSize = "9px";
      label.style.alignSelf = "center";
      dispenserRow.appendChild(label);
      for (let s = 0; s <= maxSpeed; s++) {
        const sBtn = document.createElement("button");
        sBtn.textContent = DISPENSE_LABELS[s];
        sBtn.addEventListener("click", () => { playClick(); setDispenseSpeed(s); });
        dispenserRow.appendChild(sBtn);
      }
    }
    // Update active state (skip label at index 0)
    for (let i = 1; i < dispenserRow.children.length; i++) {
      dispenserRow.children[i].classList.toggle("active", (i - 1) === currentSpeed);
    }
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

  const areaW = area.clientWidth || 310;
  const areaH = area.clientHeight || 220;

  petGame = {
    area,
    statusBar,
    items: [],
    pets: [],
    poops: [],
    animationId: null,
    prevTimestamp: 0,
    splitTimer: 30000,
    poopTimer: POOP_TICK_INTERVAL,
    roombas: [],
  };

  const firstPet = createPet(area, areaW / 2 - PET_SIZE / 2, areaH / 2 - PET_SIZE / 2);
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
  };
  onInventoryChange(petGame.inventoryListener);

  entry.onResize = debounce(checkPetPopulationCap, 200);
  petGame.animationId = requestAnimationFrame(petLoop);

  // Spawn visual roombas
  spawnRoombas();

  // Auto-Dispenser: recursive setTimeout, reads dispenseSpeed setting each tick
  function autoDispenseTick() {
    if (!petGame) return;
    const speed = getDispenseSpeed();
    if (speed < 1) { petGame.autoDispenseTimeout = null; return; }
    const wanting = petGame.pets.filter((p) => p.alive && p.want);
    if (wanting.length > 0) {
      const pet = wanting[0];
      if (inventory[pet.want] > 0) {
        dropItem(pet.want);
      }
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

  // Listen for upgrade/speed changes so auto-dispense restarts with new interval
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

export { killPet };

// Register accessor so upgrades.js can call these without circular imports
registerPetAccessor({ getLivingPets, killPet, isPetGameOpen });
