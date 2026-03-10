// === Emoji98 — Windows 98 Desktop Simulator with Emoji Chaos Game ===

(function () {
  "use strict";

  // ========== Constants ==========

  const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/";

  const PET_CODEPOINTS = [
    "1f600", // happy
    "1f610", // neutral :|
    "1f622", // sad
    "1f621", // angry
    "1f60a", // pleased
    "1f354", // hamburger (food)
    "1f4a7", // water droplet
    "26bd",  // soccer ball (play)
    "1f331", // seedling (farm)
    "1f33f", // herb (farm)
    "1f33e", // rice/wheat (farm)
    "1faa3", // bucket (water plant)
    "1f534", // red circle (factory)
    "1f535", // blue circle (factory)
    "1f7e1", // yellow circle (factory)
    "1f7e2", // green circle (factory)
    "1f480", // skull (dead pet)
  ];

  // ========== Global Inventory ==========
  const inventory = { food: 3, water: 3, play: 3 };
  const inventoryListeners = [];

  function onInventoryChange(fn) {
    inventoryListeners.push(fn);
  }

  function notifyInventory() {
    for (const fn of inventoryListeners) fn();
  }

  function addInventory(type, amount) {
    inventory[type] += amount;
    notifyInventory();
  }

  function useInventory(type) {
    if (inventory[type] <= 0) return false;
    inventory[type]--;
    notifyInventory();
    return true;
  }

  // ========== Utilities ==========

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // Pixelation resolution — emojis are drawn at this size then scaled up
  const PIXEL_RES = 14;

  // Cache for pixelated emoji data URLs
  const pixelCache = {};

  // ========== Emoji Pixelation ==========

  // Quantize a color channel to fewer steps to reduce color count
  function quantizeColor(r, g, b) {
    // Snap each channel to nearest multiple of 85 (gives 4 levels: 0, 85, 170, 255)
    r = Math.round(r / 85) * 85;
    g = Math.round(g / 85) * 85;
    b = Math.round(b / 85) * 85;
    return [r, g, b];
  }

  // Renders a Twemoji SVG onto a tiny canvas with reduced colors and no antialiasing
  function pixelateEmoji(codepoint) {
    return new Promise((resolve) => {
      if (pixelCache[codepoint]) {
        resolve(pixelCache[codepoint]);
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = PIXEL_RES;
        canvas.height = PIXEL_RES;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, PIXEL_RES, PIXEL_RES);

        // Get pixel data and reduce colors
        const imageData = ctx.getImageData(0, 0, PIXEL_RES, PIXEL_RES);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];

          // Hard alpha threshold — no antialiasing, fully opaque or fully transparent
          if (a < 128) {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 0;
          } else {
            const [r, g, b] = quantizeColor(data[i], data[i + 1], data[i + 2]);
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = 255;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        pixelCache[codepoint] = dataUrl;
        resolve(dataUrl);
      };
      img.onerror = function () {
        resolve(TWEMOJI_BASE + codepoint + ".svg");
      };
      img.src = TWEMOJI_BASE + codepoint + ".svg";
    });
  }

  // Preload and pixelate all pet emojis on startup
  function preloadEmojis() {
    return Promise.all(PET_CODEPOINTS.map((cp) => pixelateEmoji(cp)));
  }

  // Set the Bliss wallpaper
  function pixelateWallpaper() {
    const WALLPAPER_URL = "https://upload.wikimedia.org/wikipedia/en/2/27/Bliss_%28Windows_XP%29.png";
    document.getElementById("desktop").style.backgroundImage = `url(${WALLPAPER_URL})`;
  }

  // ========== Window Manager ==========

  const windowManager = {
    windows: [],
    zIndexCounter: 100,
    activeWindowId: null,
  };

  function createWindow(id, title, bodyContent, options = {}) {
    // Prevent duplicates
    if (windowManager.windows.find((w) => w.id === id)) {
      focusWindow(id);
      return null;
    }

    const {
      width = 400,
      height = 300,
      x = 60 + Math.random() * 100,
      y = 30 + Math.random() * 80,
      icon = null,
      onClose = null,
      minWidth = 200,
      minHeight = 150,
    } = options;

    // Build window element
    const win = document.createElement("div");
    win.className = "window";
    win.dataset.windowId = id;
    win.style.width = width + "px";
    win.style.height = height + "px";
    win.style.left = x + "px";
    win.style.top = y + "px";
    win.style.zIndex = ++windowManager.zIndexCounter;

    win.innerHTML = `
      <div class="title-bar">
        <div class="title-bar-text">${title}</div>
        <div class="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close"></button>
        </div>
      </div>
      <div class="window-body"></div>
    `;

    const body = win.querySelector(".window-body");
    if (typeof bodyContent === "string") {
      body.innerHTML = bodyContent;
    } else if (bodyContent instanceof HTMLElement) {
      body.appendChild(bodyContent);
    }

    // Wire up title bar buttons
    const controls = win.querySelectorAll(".title-bar-controls button");
    controls[0].addEventListener("click", () => minimizeWindow(id));
    controls[1].addEventListener("click", () => toggleMaximize(id));
    controls[2].addEventListener("click", () => closeWindow(id));

    // Focus on mousedown
    win.addEventListener("mousedown", () => focusWindow(id));

    document.getElementById("windows-container").appendChild(win);

    const entry = {
      id,
      title,
      icon,
      element: win,
      minimized: false,
      maximized: false,
      prevBounds: null,
      onClose,
      onResize: null,
      minWidth,
      minHeight,
    };
    windowManager.windows.push(entry);

    makeDraggable(win, entry);
    makeResizable(win, entry);
    addTaskbarButton(entry);
    focusWindow(id);

    return entry;
  }

  function closeWindow(id) {
    const idx = windowManager.windows.findIndex((w) => w.id === id);
    if (idx === -1) return;
    const entry = windowManager.windows[idx];
    if (entry.onClose) entry.onClose();
    entry.element.remove();
    windowManager.windows.splice(idx, 1);
    removeTaskbarButton(id);

    // Focus the topmost remaining window
    if (windowManager.windows.length > 0) {
      const top = windowManager.windows.reduce((a, b) =>
        parseInt(a.element.style.zIndex) > parseInt(b.element.style.zIndex) ? a : b
      );
      focusWindow(top.id);
    } else {
      windowManager.activeWindowId = null;
    }
  }

  function minimizeWindow(id) {
    const entry = windowManager.windows.find((w) => w.id === id);
    if (!entry) return;
    entry.minimized = true;
    entry.element.classList.add("minimized");
    updateTaskbarButtonState();

    // Focus next visible window
    const visible = windowManager.windows
      .filter((w) => !w.minimized)
      .sort((a, b) => parseInt(b.element.style.zIndex) - parseInt(a.element.style.zIndex));
    if (visible.length > 0) {
      focusWindow(visible[0].id);
    } else {
      windowManager.activeWindowId = null;
      updateTaskbarButtonState();
    }
  }

  function restoreWindow(id) {
    const entry = windowManager.windows.find((w) => w.id === id);
    if (!entry) return;
    entry.minimized = false;
    entry.element.classList.remove("minimized");
    focusWindow(id);
  }

  function toggleMaximize(id) {
    const entry = windowManager.windows.find((w) => w.id === id);
    if (!entry) return;

    if (entry.maximized) {
      entry.maximized = false;
      entry.element.classList.remove("maximized");
      if (entry.prevBounds) {
        entry.element.style.left = entry.prevBounds.left;
        entry.element.style.top = entry.prevBounds.top;
        entry.element.style.width = entry.prevBounds.width;
        entry.element.style.height = entry.prevBounds.height;
      }
    } else {
      entry.prevBounds = {
        left: entry.element.style.left,
        top: entry.element.style.top,
        width: entry.element.style.width,
        height: entry.element.style.height,
      };
      entry.maximized = true;
      entry.element.classList.add("maximized");
    }
    focusWindow(id);
    if (entry.onResize) entry.onResize();
  }

  function focusWindow(id) {
    const entry = windowManager.windows.find((w) => w.id === id);
    if (!entry) return;

    windowManager.activeWindowId = id;
    entry.element.style.zIndex = ++windowManager.zIndexCounter;

    windowManager.windows.forEach((w) => {
      w.element.classList.toggle("inactive", w.id !== id);
    });

    updateTaskbarButtonState();
  }

  // ========== Dragging ==========

  function makeDraggable(winEl, entry) {
    const titleBar = winEl.querySelector(".title-bar");
    let dragging = false;
    let offsetX, offsetY;

    titleBar.addEventListener("mousedown", (e) => {
      if (e.target.closest(".title-bar-controls")) return;
      if (entry.maximized) return;
      dragging = true;
      offsetX = e.clientX - winEl.offsetLeft;
      offsetY = e.clientY - winEl.offsetTop;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      winEl.style.left = (e.clientX - offsetX) + "px";
      winEl.style.top = (e.clientY - offsetY) + "px";
    });

    document.addEventListener("mouseup", () => {
      dragging = false;
    });
  }

  // ========== Resizing ==========

  function makeResizable(winEl, entry) {
    const handles = [
      { cls: "rh-right",  edges: { right: true } },
      { cls: "rh-bottom", edges: { bottom: true } },
      { cls: "rh-left",   edges: { left: true } },
      { cls: "rh-top",    edges: { top: true } },
      { cls: "rh-br",     edges: { bottom: true, right: true } },
      { cls: "rh-bl",     edges: { bottom: true, left: true } },
      { cls: "rh-tr",     edges: { top: true, right: true } },
      { cls: "rh-tl",     edges: { top: true, left: true } },
    ];

    for (const h of handles) {
      const div = document.createElement("div");
      div.className = "window-resize-handle " + h.cls;

      let resizing = false;
      let startX, startY, startLeft, startTop, startW, startH;

      div.addEventListener("mousedown", (e) => {
        if (entry.maximized) return;
        e.preventDefault();
        e.stopPropagation();
        resizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = winEl.offsetLeft;
        startTop = winEl.offsetTop;
        startW = winEl.offsetWidth;
        startH = winEl.offsetHeight;
      });

      document.addEventListener("mousemove", (e) => {
        if (!resizing) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newW = startW;
        let newH = startH;
        let newLeft = startLeft;
        let newTop = startTop;

        if (h.edges.right) newW = startW + dx;
        if (h.edges.bottom) newH = startH + dy;
        if (h.edges.left) { newW = startW - dx; newLeft = startLeft + dx; }
        if (h.edges.top) { newH = startH - dy; newTop = startTop + dy; }

        // Enforce minimums
        if (newW < entry.minWidth) {
          if (h.edges.left) newLeft = startLeft + startW - entry.minWidth;
          newW = entry.minWidth;
        }
        if (newH < entry.minHeight) {
          if (h.edges.top) newTop = startTop + startH - entry.minHeight;
          newH = entry.minHeight;
        }

        winEl.style.width = newW + "px";
        winEl.style.height = newH + "px";
        winEl.style.left = newLeft + "px";
        winEl.style.top = newTop + "px";

        if (entry.onResize) entry.onResize();
      });

      document.addEventListener("mouseup", () => {
        resizing = false;
      });

      winEl.appendChild(div);
    }
  }

  // ========== Taskbar ==========

  function addTaskbarButton(entry) {
    const btn = document.createElement("button");
    btn.className = "taskbar-button";
    btn.dataset.windowId = entry.id;

    if (entry.icon) {
      const img = document.createElement("img");
      img.src = entry.icon;
      img.alt = "";
      btn.appendChild(img);
    }

    const text = document.createTextNode(entry.title);
    btn.appendChild(text);

    btn.addEventListener("click", () => {
      if (entry.minimized) {
        restoreWindow(entry.id);
      } else if (windowManager.activeWindowId === entry.id) {
        minimizeWindow(entry.id);
      } else {
        focusWindow(entry.id);
      }
    });

    document.getElementById("taskbar-buttons").appendChild(btn);
  }

  function removeTaskbarButton(id) {
    const btn = document.querySelector(`.taskbar-button[data-window-id="${id}"]`);
    if (btn) btn.remove();
  }

  function updateTaskbarButtonState() {
    document.querySelectorAll(".taskbar-button").forEach((btn) => {
      const isActive =
        btn.dataset.windowId === windowManager.activeWindowId &&
        !windowManager.windows.find((w) => w.id === btn.dataset.windowId)?.minimized;
      btn.classList.toggle("active", isActive);
    });
  }

  // ========== Start Menu ==========

  function initStartMenu() {
    const startBtn = document.getElementById("start-button");
    const startMenu = document.getElementById("start-menu");

    startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !startMenu.hidden;
      startMenu.hidden = isOpen;
      startBtn.classList.toggle("active", !isOpen);
    });

    document.querySelectorAll("#start-menu-list li[data-app]").forEach((li) => {
      li.addEventListener("click", () => {
        const app = li.dataset.app;
        startMenu.hidden = true;
        startBtn.classList.remove("active");
        launchApp(app);
      });
    });

    document.getElementById("start-shutdown").addEventListener("click", () => {
      startMenu.hidden = true;
      startBtn.classList.remove("active");
      launchShutdown();
    });

    document.addEventListener("click", (e) => {
      if (!startMenu.hidden && !startMenu.contains(e.target) && e.target !== startBtn && !startBtn.contains(e.target)) {
        startMenu.hidden = true;
        startBtn.classList.remove("active");
      }
    });
  }

  // ========== Desktop Icons ==========

  function initDesktopIcons() {
    const icons = document.querySelectorAll(".desktop-icon");

    icons.forEach((icon) => {
      icon.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        icons.forEach((i) => i.classList.remove("selected"));
        icon.classList.add("selected");
      });

      icon.addEventListener("dblclick", () => {
        launchApp(icon.dataset.app);
      });
    });

    // Click on desktop deselects icons
    document.getElementById("desktop").addEventListener("mousedown", (e) => {
      if (e.target === e.currentTarget) {
        icons.forEach((i) => i.classList.remove("selected"));
      }
    });
  }

  // ========== App Launchers ==========

  function launchApp(appId) {
    switch (appId) {
      case "emoji-game":
        launchEmojiGame();
        break;
      case "my-computer":
        launchMyComputer();
        break;
      case "recycle-bin":
        launchRecycleBin();
        break;
      case "farm-sim":
        launchFarmSim();
        break;
      case "water-plant":
        launchWaterPlant();
        break;
      case "toy-factory":
        launchToyFactory();
        break;
      case "supply":
        launchSupply();
        break;
    }
  }

  function launchMyComputer() {
    createWindow("my-computer", "My Computer", `
      <div class="my-computer-body">
        <ul class="tree-view">
          <li>3&#189; Floppy (A:)</li>
          <li>(C:)</li>
          <li>(D:)</li>
          <li>Control Panel</li>
          <li>Printers</li>
          <li>Dial-Up Networking</li>
        </ul>
      </div>
    `, {
      width: 380,
      height: 280,
      icon: "icons/my-computer.svg",
    });
  }

  function launchRecycleBin() {
    createWindow("recycle-bin", "Recycle Bin", `
      <div class="recycle-bin-body">
        <p>Recycle Bin is empty.</p>
      </div>
    `, {
      width: 320,
      height: 220,
      icon: "icons/recycle-bin.svg",
    });
  }

  function launchShutdown() {
    const body = document.createElement("div");
    body.className = "shutdown-body";
    body.innerHTML = "<p>It's now safe to turn off<br>your computer.</p>";
    const restartBtn = document.createElement("button");
    restartBtn.textContent = "Restart";
    restartBtn.addEventListener("click", () => closeWindow("shutdown"));
    body.appendChild(restartBtn);

    createWindow("shutdown", "Shut Down Windows", body, {
      width: 340,
      height: 200,
      x: (window.innerWidth - 340) / 2,
      y: (window.innerHeight - 230) / 2,
      icon: "icons/shutdown.svg",
    });
  }

  // ========== Emoji Pet Game (Multi-Pet) ==========

  const MOOD_FACES = {
    happy: "1f600",
    neutral: "1f610",
    sad: "1f622",
    angry: "1f621",
    pleased: "1f60a",
  };

  const ITEMS = {
    food:  { codepoint: "1f354", label: "Feed" },
    water: { codepoint: "1f4a7", label: "Water" },
    play:  { codepoint: "26bd",  label: "Play" },
  };

  const ITEM_TYPES = ["food", "water", "play"];

  let petGame = null;

  const PET_SIZE = 20;
  const ITEM_SIZE = 20;

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

    const pet = {
      el: petEl,
      bubble,
      bubbleImg,
      x, y,
      targetX: x,
      targetY: y,
      speed: 0.8,
      mood: "happy",
      want: null,
      missedWants: 0,
      alive: true,
      wanderTimer: 0,
      wantTimeout: null,
      ignoreTimeout: null,
      pleasedTimeout: null,
    };

    setPetFaceFor(pet, "happy");
    petEl.style.transform = `translate(${x}px, ${y}px)`;
    return pet;
  }

  async function setPetFaceFor(pet, mood) {
    pet.mood = mood;
    const src = await pixelateEmoji(MOOD_FACES[mood]);
    if (pet.alive || mood === "happy") pet.el.src = src;
  }

  function calcPetCap() {
    if (!petGame) return 1;
    const w = petGame.area.clientWidth;
    const h = petGame.area.clientHeight;
    return Math.max(1, Math.floor((w * h) / 6400));
  }

  function scheduleNextWantFor(pet) {
    if (!petGame || !pet.alive) return;
    const delay = 15000 + Math.random() * 15000;
    pet.wantTimeout = setTimeout(() => {
      if (!petGame || !pet.alive) return;
      const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
      setPetWantFor(pet, type);
    }, delay);
  }

  async function setPetWantFor(pet, type) {
    if (!petGame || !pet.alive) return;
    pet.want = type;

    setPetFaceFor(pet, "neutral");

    const src = await pixelateEmoji(ITEMS[type].codepoint);
    pet.bubbleImg.src = src;
    pet.bubble.style.display = "flex";

    updatePetStatus();

    // Ignore timer → sad after 10s, then miss want after 5s more
    pet.ignoreTimeout = setTimeout(() => {
      if (!petGame || !pet.alive || !pet.want) return;
      pet.missedWants++;
      setPetFaceFor(pet, "sad");
      updatePetStatus();

      if (pet.missedWants >= 3) {
        killPet(pet);
        return;
      }

      // Clear want after 5 more seconds
      setTimeout(() => {
        if (!petGame || !pet.alive) return;
        pet.want = null;
        pet.bubble.style.display = "none";
        setPetFaceFor(pet, "happy");
        scheduleNextWantFor(pet);
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

  function consumeItemFor(pet, item) {
    if (!petGame || !pet.alive) return;

    item.consumed = true;
    item.el.remove();
    if (item.fadeTimer) clearTimeout(item.fadeTimer);

    // Clear want
    pet.want = null;
    pet.bubble.style.display = "none";
    pet.missedWants = 0;

    // Clear ignore timer
    if (pet.ignoreTimeout) { clearTimeout(pet.ignoreTimeout); pet.ignoreTimeout = null; }

    // Show pleased face briefly
    setPetFaceFor(pet, "pleased");

    if (pet.pleasedTimeout) clearTimeout(pet.pleasedTimeout);
    pet.pleasedTimeout = setTimeout(() => {
      if (!petGame || !pet.alive) return;
      setPetFaceFor(pet, "happy");
    }, 2000);

    updatePetStatus();
    scheduleNextWantFor(pet);
  }

  async function killPet(pet) {
    pet.alive = false;
    pet.want = null;
    pet.bubble.style.display = "none";

    if (pet.wantTimeout) clearTimeout(pet.wantTimeout);
    if (pet.ignoreTimeout) clearTimeout(pet.ignoreTimeout);
    if (pet.pleasedTimeout) clearTimeout(pet.pleasedTimeout);

    const skullSrc = await pixelateEmoji("1f480");
    pet.el.src = skullSrc;
    pet.el.style.cursor = "pointer";

    // Click to dismiss skull
    pet.el.addEventListener("click", () => dismissSkull(pet));

    updatePetStatus();
  }

  function dismissSkull(pet) {
    if (!petGame) return;
    pet.el.remove();
    pet.bubble.remove();
    petGame.pets = petGame.pets.filter((p) => p !== pet);

    // If all pets dead, spawn a new one
    const living = petGame.pets.filter((p) => p.alive);
    if (living.length === 0) {
      const areaW = petGame.area.clientWidth;
      const areaH = petGame.area.clientHeight;
      const newPet = createPet(petGame.area, areaW / 2, areaH / 2);
      petGame.pets.push(newPet);
      scheduleNextWantFor(newPet);
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

  function checkPetPopulationCap() {
    if (!petGame) return;
    const cap = calcPetCap();
    let living = petGame.pets.filter((p) => p.alive);
    while (living.length > cap) {
      const victim = getMostNeglectedPet(living);
      if (!victim) break;
      killPet(victim);
      living = petGame.pets.filter((p) => p.alive);
    }
  }

  function tryPetSplit() {
    if (!petGame) return;
    const cap = calcPetCap();
    for (const pet of petGame.pets) {
      if (!pet.alive) continue;
      if (petGame.pets.filter((p) => p.alive).length >= cap) break;
      if (Math.random() < 0.25) {
        spawnChildPet(pet);
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
    const child = createPet(petGame.area, x, y);
    petGame.pets.push(child);
    scheduleNextWantFor(child);

    // Brief flash on parent
    parent.el.style.filter = "brightness(2)";
    setTimeout(() => { if (parent.alive) parent.el.style.filter = ""; }, 200);
  }

  function launchEmojiGame() {
    const body = document.createElement("div");
    body.className = "pet-app";

    // Green area
    const area = document.createElement("div");
    area.className = "pet-area";
    body.appendChild(area);

    // Buttons
    const btnGroup = document.createElement("div");
    btnGroup.className = "pet-buttons";

    ITEM_TYPES.forEach((type) => {
      const btn = document.createElement("button");
      btn.dataset.itemType = type;
      btn.textContent = `${ITEMS[type].label} (${inventory[type]})`;
      btn.disabled = inventory[type] === 0;
      btn.addEventListener("click", () => dropItem(type));
      btnGroup.appendChild(btn);
    });

    body.appendChild(btnGroup);

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

    // Status bar
    const statusBar = document.createElement("div");
    statusBar.className = "status-bar";
    statusBar.innerHTML = '<p class="status-bar-field">Pets: 1</p>';
    entry.element.appendChild(statusBar);

    // Init pet state
    const areaW = area.clientWidth || 310;
    const areaH = area.clientHeight || 220;

    petGame = {
      area,
      statusBar,
      items: [],
      pets: [],
      animationId: null,
      prevTimestamp: 0,
      splitTimer: 30000,
    };

    // Create initial pet
    const firstPet = createPet(area, areaW / 2 - PET_SIZE / 2, areaH / 2 - PET_SIZE / 2);
    petGame.pets.push(firstPet);
    scheduleNextWantFor(firstPet);

    // Register inventory listener for pet buttons
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

    // Resize handler for population cap
    entry.onResize = debounce(checkPetPopulationCap, 200);

    // Start animation
    petGame.animationId = requestAnimationFrame(petLoop);
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

    // Drop from random X at top, land at random Y in lower half
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

  function petLoop(timestamp) {
    if (!petGame) return;

    const elapsed = petGame.prevTimestamp ? timestamp - petGame.prevTimestamp : 16.667;
    const dt = Math.min(elapsed / 16.667, 3);
    petGame.prevTimestamp = timestamp;

    const area = petGame.area;
    const areaW = area.clientWidth;
    const areaH = area.clientHeight;

    // --- Split timer ---
    petGame.splitTimer -= elapsed;
    if (petGame.splitTimer <= 0) {
      petGame.splitTimer = 30000;
      tryPetSplit();
    }

    // --- Update each pet ---
    for (const pet of petGame.pets) {
      if (!pet.alive) continue;

      // Wander
      pet.wanderTimer -= elapsed;
      if (pet.wanderTimer <= 0) {
        pet.targetX = 5 + Math.random() * (areaW - PET_SIZE - 10);
        pet.targetY = 5 + Math.random() * (areaH - PET_SIZE - 10);
        pet.wanderTimer = 2000 + Math.random() * 2000;
      }

      // Check if pet should walk to a wanted item
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

      // Move pet toward target
      const dx = walkX - pet.x;
      const dy = walkY - pet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = targetItem ? 1.5 : pet.speed;

      if (dist > 1) {
        const step = Math.min(moveSpeed * dt, dist);
        pet.x += (dx / dist) * step;
        pet.y += (dy / dist) * step;
      }

      // Flip sprite
      const scaleX = dx < -1 ? -1 : 1;
      pet.el.style.transform = `translate(${pet.x}px, ${pet.y}px) scaleX(${scaleX})`;

      // Position bubble above pet
      if (pet.bubble.style.display !== "none") {
        pet.bubble.style.left = (pet.x - 1) + "px";
        pet.bubble.style.top = (pet.y - 26) + "px";
      }

      // Check if pet reached wanted item
      if (targetItem && targetItem.landed && !targetItem.consumed) {
        const petCX = pet.x + PET_SIZE / 2;
        const petCY = pet.y + PET_SIZE / 2;
        const itemCX = targetItem.x + ITEM_SIZE / 2;
        const itemCY = targetItem.y + ITEM_SIZE / 2;
        const d = Math.sqrt((petCX - itemCX) ** 2 + (petCY - itemCY) ** 2);
        if (d < PET_SIZE * 0.7) {
          consumeItemFor(pet, targetItem);
        }
      }
    }

    // --- Items: gravity + landing ---
    const anyPetWants = petGame.pets.some((p) => p.alive && p.want);
    for (const item of petGame.items) {
      if (item.consumed) continue;

      if (!item.landed) {
        item.vy += 0.3 * dt;
        item.y += item.vy * dt;
        if (item.y >= item.landY) {
          item.y = item.landY;
          item.landed = true;

          // If no pet wants this type, fade out after 3 seconds
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

    // Clean up consumed items
    petGame.items = petGame.items.filter((i) => !i.consumed);

    petGame.animationId = requestAnimationFrame(petLoop);
  }

  function stopPetGame() {
    if (!petGame) return;
    if (petGame.animationId) cancelAnimationFrame(petGame.animationId);
    // Clear all per-pet timers
    for (const pet of petGame.pets) {
      if (pet.wantTimeout) clearTimeout(pet.wantTimeout);
      if (pet.ignoreTimeout) clearTimeout(pet.ignoreTimeout);
      if (pet.pleasedTimeout) clearTimeout(pet.pleasedTimeout);
    }
    petGame.items.forEach((i) => { if (i.fadeTimer) clearTimeout(i.fadeTimer); });
    // Remove inventory listener
    const idx = inventoryListeners.indexOf(petGame.inventoryListener);
    if (idx !== -1) inventoryListeners.splice(idx, 1);
    petGame = null;
  }

  // ========== Farm Sim (Dynamic Grid) ==========

  let farmGame = null;

  function calcFarmDimensions(grid) {
    const w = grid.clientWidth;
    const h = grid.clientHeight;
    const cols = Math.max(3, Math.floor(w / 60));
    const rows = Math.max(2, Math.floor(h / 60));
    return { cols, rows, total: cols * rows };
  }

  function createFarmTile() {
    const tile = document.createElement("div");
    tile.className = "farm-tile";
    tile.dataset.state = "empty";
    tile.addEventListener("click", () => farmTileClick(tile));
    return tile;
  }

  function rebuildFarmGrid() {
    if (!farmGame) return;
    const grid = farmGame.grid;
    const { cols, rows, total } = calcFarmDimensions(grid);

    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    const currentCount = farmGame.tiles.length;

    if (total > currentCount) {
      // Add tiles
      for (let i = currentCount; i < total; i++) {
        const tile = createFarmTile();
        grid.appendChild(tile);
        farmGame.tiles.push(tile);
      }
    } else if (total < currentCount) {
      // Remove tiles from end (crops are lost)
      for (let i = currentCount - 1; i >= total; i--) {
        farmGame.tiles[i].remove();
        farmGame.tiles.pop();
      }
    }

    farmGame.cols = cols;
    farmGame.rows = rows;
  }

  function launchFarmSim() {
    const body = document.createElement("div");
    body.className = "farm-app";

    const grid = document.createElement("div");
    grid.className = "farm-grid";
    body.appendChild(grid);

    const tools = document.createElement("div");
    tools.className = "farm-tools";
    ["Plant", "Water", "Harvest"].forEach((name, idx) => {
      const btn = document.createElement("button");
      btn.textContent = name;
      btn.dataset.tool = name.toLowerCase();
      if (idx === 0) btn.classList.add("active-tool");
      btn.addEventListener("click", () => {
        tools.querySelectorAll("button").forEach((b) => b.classList.remove("active-tool"));
        btn.classList.add("active-tool");
        farmGame.tool = name.toLowerCase();
      });
      tools.appendChild(btn);
    });
    body.appendChild(tools);

    const entry = createWindow("farm-sim", "Farm Sim", body, {
      width: 350,
      height: 350,
      icon: "icons/farm.svg",
      onClose: stopFarmSim,
      minWidth: 220,
      minHeight: 180,
    });

    if (!entry) return;

    const statusBar = document.createElement("div");
    statusBar.className = "status-bar";
    statusBar.innerHTML = `<p class="status-bar-field">Food supply: ${inventory.food}</p>`;
    entry.element.appendChild(statusBar);

    farmGame = { grid, tiles: [], tool: "plant", statusBar, cols: 0, rows: 0 };

    // Build initial grid
    rebuildFarmGrid();

    // Wire resize
    entry.onResize = debounce(rebuildFarmGrid, 150);

    farmGame.inventoryListener = () => {
      statusBar.querySelector(".status-bar-field").textContent = `Food supply: ${inventory.food}`;
    };
    onInventoryChange(farmGame.inventoryListener);
  }

  async function farmTileClick(tile) {
    if (!farmGame) return;
    const state = tile.dataset.state;
    const tool = farmGame.tool;

    if (tool === "plant" && state === "empty") {
      tile.dataset.state = "planted";
      const src = await pixelateEmoji("1f331");
      tile.innerHTML = `<img src="${src}" />`;
    } else if (tool === "water" && state === "planted") {
      tile.dataset.state = "watered";
      const src = await pixelateEmoji("1f33f");
      tile.innerHTML = `<img src="${src}" />`;
      setTimeout(async () => {
        if (tile.dataset.state === "watered") {
          tile.dataset.state = "grown";
          const grownSrc = await pixelateEmoji("1f33e");
          tile.innerHTML = `<img src="${grownSrc}" />`;
        }
      }, 3000);
    } else if (tool === "harvest" && state === "grown") {
      tile.dataset.state = "empty";
      tile.innerHTML = "";
      addInventory("food", 1);
    }
  }

  function stopFarmSim() {
    if (!farmGame) return;
    const idx = inventoryListeners.indexOf(farmGame.inventoryListener);
    if (idx !== -1) inventoryListeners.splice(idx, 1);
    farmGame = null;
  }

  // ========== Water Plant (Width-Scaling) ==========

  let waterGame = null;

  async function launchWaterPlant() {
    const body = document.createElement("div");
    body.className = "water-app";

    const area = document.createElement("div");
    area.className = "water-area";

    const bucketImg = document.createElement("img");
    bucketImg.className = "water-bucket";
    const bucketSrc = await pixelateEmoji("1faa3");
    bucketImg.src = bucketSrc;
    bucketImg.draggable = false;
    area.appendChild(bucketImg);

    body.appendChild(area);

    const entry = createWindow("water-plant", "Water Plant", body, {
      width: 300,
      height: 350,
      icon: "icons/water-plant.svg",
      onClose: stopWaterPlant,
      minWidth: 200,
      minHeight: 200,
    });

    if (!entry) return;

    const statusBar = document.createElement("div");
    statusBar.className = "status-bar";
    statusBar.innerHTML = `<p class="status-bar-field">Water supply: ${inventory.water}</p>`;
    entry.element.appendChild(statusBar);

    const areaW = area.clientWidth || 260;
    waterGame = {
      area,
      bucketImg,
      bucketX: areaW / 2 - 15,
      drops: [],
      spawnTimer: 0,
      animationId: null,
      prevTimestamp: 0,
      statusBar,
    };

    bucketImg.style.left = waterGame.bucketX + "px";

    // Click controls
    area.addEventListener("click", (e) => {
      if (!waterGame) return;
      const rect = area.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const mid = rect.width / 2;
      const step = 30;
      if (clickX < mid) {
        waterGame.bucketX = Math.max(0, waterGame.bucketX - step);
      } else {
        waterGame.bucketX = Math.min(rect.width - 30, waterGame.bucketX + step);
      }
      waterGame.bucketImg.style.left = waterGame.bucketX + "px";
    });

    // Keyboard controls
    waterGame.keyHandler = (e) => {
      if (!waterGame) return;
      const areaW = waterGame.area.clientWidth;
      const step = 30;
      if (e.key === "ArrowLeft") {
        waterGame.bucketX = Math.max(0, waterGame.bucketX - step);
        waterGame.bucketImg.style.left = waterGame.bucketX + "px";
      } else if (e.key === "ArrowRight") {
        waterGame.bucketX = Math.min(areaW - 30, waterGame.bucketX + step);
        waterGame.bucketImg.style.left = waterGame.bucketX + "px";
      }
    };
    document.addEventListener("keydown", waterGame.keyHandler);

    // Resize: clamp bucket
    entry.onResize = debounce(() => {
      if (!waterGame) return;
      const areaW = waterGame.area.clientWidth;
      waterGame.bucketX = Math.min(waterGame.bucketX, areaW - 30);
      waterGame.bucketImg.style.left = waterGame.bucketX + "px";
    }, 100);

    waterGame.inventoryListener = () => {
      statusBar.querySelector(".status-bar-field").textContent = `Water supply: ${inventory.water}`;
    };
    onInventoryChange(waterGame.inventoryListener);

    waterGame.animationId = requestAnimationFrame(waterLoop);
  }

  async function spawnDrop() {
    if (!waterGame) return;
    const area = waterGame.area;
    const areaW = area.clientWidth;
    const dropEl = document.createElement("img");
    dropEl.className = "water-drop";
    const src = await pixelateEmoji("1f4a7");
    dropEl.src = src;
    dropEl.draggable = false;
    const x = Math.random() * (areaW - 20);
    dropEl.style.left = x + "px";
    dropEl.style.top = "-20px";
    area.appendChild(dropEl);
    waterGame.drops.push({ el: dropEl, x, y: -20 });
  }

  function waterLoop(timestamp) {
    if (!waterGame) return;

    const elapsed = waterGame.prevTimestamp ? timestamp - waterGame.prevTimestamp : 16.667;
    waterGame.prevTimestamp = timestamp;

    const areaH = waterGame.area.clientHeight;
    const areaW = waterGame.area.clientWidth;
    const bucketY = areaH - 32;
    const speed = 2;

    // Spawn drops — scale by width (wider = more frequent)
    waterGame.spawnTimer -= elapsed;
    if (waterGame.spawnTimer <= 0) {
      spawnDrop();
      const baseInterval = 800 + Math.random() * 700;
      waterGame.spawnTimer = baseInterval * (300 / Math.max(areaW, 100));
    }

    // Move drops
    for (let i = waterGame.drops.length - 1; i >= 0; i--) {
      const drop = waterGame.drops[i];
      drop.y += speed * (elapsed / 16.667);
      drop.el.style.top = drop.y + "px";

      // Check catch
      if (drop.y + 20 >= bucketY && drop.y <= bucketY + 24) {
        if (drop.x + 10 >= waterGame.bucketX && drop.x + 10 <= waterGame.bucketX + 30) {
          drop.el.remove();
          waterGame.drops.splice(i, 1);
          addInventory("water", 1);
          continue;
        }
      }

      // Off screen
      if (drop.y > areaH) {
        drop.el.remove();
        waterGame.drops.splice(i, 1);
      }
    }

    waterGame.animationId = requestAnimationFrame(waterLoop);
  }

  function stopWaterPlant() {
    if (!waterGame) return;
    if (waterGame.animationId) cancelAnimationFrame(waterGame.animationId);
    document.removeEventListener("keydown", waterGame.keyHandler);
    const idx = inventoryListeners.indexOf(waterGame.inventoryListener);
    if (idx !== -1) inventoryListeners.splice(idx, 1);
    waterGame = null;
  }

  // ========== Toy Factory (Multi-Belt) ==========

  let factoryGame = null;

  const FACTORY_COLORS = [
    { name: "red", codepoint: "1f534" },
    { name: "blue", codepoint: "1f535" },
    { name: "yellow", codepoint: "1f7e1" },
    { name: "green", codepoint: "1f7e2" },
  ];

  function calcBeltCount(container) {
    return Math.max(1, Math.floor(container.clientHeight / 50));
  }

  function createBeltElement() {
    const belt = document.createElement("div");
    belt.className = "factory-belt";
    const line = document.createElement("div");
    line.className = "factory-belt-line";
    belt.appendChild(line);
    return belt;
  }

  function rebuildFactoryBelts() {
    if (!factoryGame) return;
    const container = factoryGame.beltContainer;
    const desired = calcBeltCount(container);
    const current = factoryGame.belts.length;

    if (desired > current) {
      for (let i = current; i < desired; i++) {
        const beltEl = createBeltElement();
        container.appendChild(beltEl);
        factoryGame.belts.push({ el: beltEl, pieces: [] });
      }
    } else if (desired < current) {
      for (let i = current - 1; i >= desired; i--) {
        const belt = factoryGame.belts[i];
        // Remove pieces on this belt
        for (const p of belt.pieces) p.el.remove();
        belt.el.remove();
        factoryGame.belts.pop();
      }
    }
  }

  function getAllFactoryPieces() {
    if (!factoryGame) return [];
    return factoryGame.belts.flatMap((b) => b.pieces);
  }

  function getLeftmostPiece() {
    const all = getAllFactoryPieces();
    return all.reduce((best, p) => !best || p.x < best.x ? p : best, null);
  }

  function launchToyFactory() {
    const body = document.createElement("div");
    body.className = "factory-app";

    const nextDiv = document.createElement("div");
    nextDiv.className = "factory-next";
    nextDiv.textContent = "Next: ...";
    body.appendChild(nextDiv);

    const beltContainer = document.createElement("div");
    beltContainer.className = "factory-belt-container";
    body.appendChild(beltContainer);

    const buttons = document.createElement("div");
    buttons.className = "factory-buttons";
    FACTORY_COLORS.forEach((color) => {
      const btn = document.createElement("button");
      btn.className = `factory-btn btn-${color.name}`;
      btn.textContent = color.name.charAt(0).toUpperCase() + color.name.slice(1);
      btn.addEventListener("click", () => factoryPress(color.name));
      buttons.appendChild(btn);
    });
    body.appendChild(buttons);

    const entry = createWindow("toy-factory", "Toy Factory", body, {
      width: 380,
      height: 280,
      icon: "icons/toy-factory.svg",
      onClose: stopToyFactory,
      minWidth: 250,
      minHeight: 160,
    });

    if (!entry) return;

    const statusBar = document.createElement("div");
    statusBar.className = "status-bar";
    statusBar.innerHTML = `<p class="status-bar-field">Toy supply: ${inventory.play}</p>`;
    entry.element.appendChild(statusBar);

    factoryGame = {
      beltContainer,
      belts: [],
      nextDiv,
      streak: 0,
      spawnTimer: 0,
      animationId: null,
      prevTimestamp: 0,
      statusBar,
    };

    // Build initial belts
    rebuildFactoryBelts();

    // Wire resize
    entry.onResize = debounce(rebuildFactoryBelts, 150);

    factoryGame.inventoryListener = () => {
      statusBar.querySelector(".status-bar-field").textContent = `Toy supply: ${inventory.play}`;
    };
    onInventoryChange(factoryGame.inventoryListener);

    factoryGame.animationId = requestAnimationFrame(factoryLoop);
  }

  async function spawnFactoryPiece() {
    if (!factoryGame || factoryGame.belts.length === 0) return;
    // Pick a random belt
    const beltIdx = Math.floor(Math.random() * factoryGame.belts.length);
    const belt = factoryGame.belts[beltIdx];
    const beltW = belt.el.clientWidth;
    const color = FACTORY_COLORS[Math.floor(Math.random() * FACTORY_COLORS.length)];
    const el = document.createElement("img");
    el.className = "factory-piece";
    const src = await pixelateEmoji(color.codepoint);
    el.src = src;
    el.draggable = false;
    const beltH = belt.el.clientHeight;
    const y = Math.max(0, beltH - 34);
    el.style.top = y + "px";
    el.style.left = beltW + "px";
    belt.el.appendChild(el);
    belt.pieces.push({ el, color: color.name, x: beltW, y, beltIdx });
    updateFactoryNext();
  }

  function updateFactoryNext() {
    if (!factoryGame) return;
    const leftmost = getLeftmostPiece();
    if (leftmost) {
      factoryGame.nextDiv.textContent = `Next: ${leftmost.color.toUpperCase()} (streak: ${factoryGame.streak}/3)`;
    } else {
      factoryGame.nextDiv.textContent = `Next: ... (streak: ${factoryGame.streak}/3)`;
    }
  }

  function factoryPress(colorName) {
    if (!factoryGame) return;
    const leftmost = getLeftmostPiece();
    if (!leftmost) return;

    if (leftmost.color === colorName) {
      // Correct!
      leftmost.el.classList.add("flash");
      setTimeout(() => { leftmost.el.remove(); }, 200);
      // Remove from its belt
      const belt = factoryGame.belts[leftmost.beltIdx];
      if (belt) belt.pieces = belt.pieces.filter((p) => p !== leftmost);
      factoryGame.streak++;
      if (factoryGame.streak >= 3) {
        addInventory("play", 1);
        factoryGame.streak = 0;
      }
    } else {
      // Wrong
      leftmost.el.style.filter = "grayscale(1)";
      leftmost.el.classList.add("falling");
      leftmost.el.style.transform = `translateY(40px)`;
      setTimeout(() => { leftmost.el.remove(); }, 300);
      const belt = factoryGame.belts[leftmost.beltIdx];
      if (belt) belt.pieces = belt.pieces.filter((p) => p !== leftmost);
      factoryGame.streak = 0;
    }
    updateFactoryNext();
  }

  function factoryLoop(timestamp) {
    if (!factoryGame) return;

    const elapsed = factoryGame.prevTimestamp ? timestamp - factoryGame.prevTimestamp : 16.667;
    factoryGame.prevTimestamp = timestamp;

    const speed = 0.8;

    // Spawn pieces
    factoryGame.spawnTimer -= elapsed;
    if (factoryGame.spawnTimer <= 0) {
      spawnFactoryPiece();
      factoryGame.spawnTimer = 2000;
    }

    // Move pieces on each belt
    for (const belt of factoryGame.belts) {
      for (let i = belt.pieces.length - 1; i >= 0; i--) {
        const piece = belt.pieces[i];
        piece.x -= speed * (elapsed / 16.667);
        piece.el.style.left = piece.x + "px";

        // Off screen left = miss
        if (piece.x + 28 < 0) {
          piece.el.remove();
          belt.pieces.splice(i, 1);
          factoryGame.streak = 0;
        }
      }
    }

    updateFactoryNext();
    factoryGame.animationId = requestAnimationFrame(factoryLoop);
  }

  function stopToyFactory() {
    if (!factoryGame) return;
    if (factoryGame.animationId) cancelAnimationFrame(factoryGame.animationId);
    const idx = inventoryListeners.indexOf(factoryGame.inventoryListener);
    if (idx !== -1) inventoryListeners.splice(idx, 1);
    factoryGame = null;
  }

  // ========== Supply Dashboard ==========

  let supplyDash = null;

  async function launchSupply() {
    const body = document.createElement("div");
    body.className = "supply-app";

    const resources = [
      { type: "food", name: "Food", codepoint: "1f354" },
      { type: "water", name: "Water", codepoint: "1f4a7" },
      { type: "play", name: "Toys", codepoint: "26bd" },
    ];

    const rows = {};
    for (const res of resources) {
      const row = document.createElement("div");
      row.className = "supply-row";

      const img = document.createElement("img");
      img.src = await pixelateEmoji(res.codepoint);
      img.draggable = false;
      row.appendChild(img);

      const name = document.createElement("span");
      name.className = "supply-name";
      name.textContent = res.name;
      row.appendChild(name);

      const bar = document.createElement("div");
      bar.className = "supply-bar";
      const fill = document.createElement("div");
      fill.className = "supply-bar-fill";
      bar.appendChild(fill);
      row.appendChild(bar);

      const count = document.createElement("span");
      count.className = "supply-count";
      row.appendChild(count);

      body.appendChild(row);
      rows[res.type] = { fill, count };
    }

    const entry = createWindow("supply", "Supply", body, {
      width: 280,
      height: 220,
      icon: "icons/supply.svg",
      onClose: stopSupply,
    });

    if (!entry) return;

    const statusBar = document.createElement("div");
    statusBar.className = "status-bar";
    statusBar.innerHTML = `<p class="status-bar-field">Total items: 0</p>`;
    entry.element.appendChild(statusBar);

    supplyDash = { rows, statusBar };

    function updateSupplyDash() {
      if (!supplyDash) return;
      let total = 0;
      for (const type of ["food", "water", "play"]) {
        const val = inventory[type];
        total += val;
        const r = supplyDash.rows[type];
        r.count.textContent = val;
        r.fill.style.width = Math.min(val / 10, 1) * 100 + "%";
      }
      supplyDash.statusBar.querySelector(".status-bar-field").textContent = `Total items: ${total}`;
    }

    supplyDash.inventoryListener = updateSupplyDash;
    onInventoryChange(updateSupplyDash);
    updateSupplyDash();
  }

  function stopSupply() {
    if (!supplyDash) return;
    const idx = inventoryListeners.indexOf(supplyDash.inventoryListener);
    if (idx !== -1) inventoryListeners.splice(idx, 1);
    supplyDash = null;
  }

  // ========== Clock ==========

  function initClock() {
    function update() {
      const now = new Date();
      document.getElementById("clock").textContent = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    update();
    setInterval(update, 1000);
  }

  // ========== Init ==========

  document.addEventListener("DOMContentLoaded", () => {
    preloadEmojis();
    pixelateWallpaper();
    initDesktopIcons();
    initStartMenu();
    initClock();
  });
})();
