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
  ];

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
    };
    windowManager.windows.push(entry);

    makeDraggable(win, entry);
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

  // ========== Emoji Pet Game ==========

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

  function launchEmojiGame() {
    const body = document.createElement("div");
    body.className = "pet-app";

    // Green area
    const area = document.createElement("div");
    area.className = "pet-area";

    // Pet sprite
    const petEl = document.createElement("img");
    petEl.className = "pet-sprite";
    petEl.draggable = false;
    area.appendChild(petEl);

    // Chat bubble (hidden initially)
    const bubble = document.createElement("div");
    bubble.className = "pet-bubble";
    bubble.style.display = "none";
    const bubbleImg = document.createElement("img");
    bubbleImg.draggable = false;
    bubble.appendChild(bubbleImg);
    area.appendChild(bubble);

    body.appendChild(area);

    // Buttons
    const btnGroup = document.createElement("div");
    btnGroup.className = "pet-buttons";

    ITEM_TYPES.forEach((type) => {
      const btn = document.createElement("button");
      btn.textContent = ITEMS[type].label;
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
    });

    if (!entry) return;

    // Status bar
    const statusBar = document.createElement("div");
    statusBar.className = "status-bar";
    statusBar.innerHTML = '<p class="status-bar-field">Your pet is happy!</p>';
    entry.element.appendChild(statusBar);

    // Init pet state
    const areaW = area.clientWidth || 310;
    const areaH = area.clientHeight || 220;

    petGame = {
      area,
      petEl,
      bubble,
      bubbleImg,
      statusBar,
      x: areaW / 2 - PET_SIZE / 2,
      y: areaH / 2 - PET_SIZE / 2,
      targetX: areaW / 2 - PET_SIZE / 2,
      targetY: areaH / 2 - PET_SIZE / 2,
      speed: 0.8,
      mood: "happy",
      want: null,
      wanderTimer: 0,
      wantInterval: null,
      ignoreTimeout: null,
      angryTimeout: null,
      pleasedTimeout: null,
      items: [],
      animationId: null,
      prevTimestamp: 0,
    };

    // Set initial face
    setPetFace("happy");
    petEl.style.transform = `translate(${petGame.x}px, ${petGame.y}px)`;

    // Start want timer (first want in 8-15 seconds)
    scheduleNextWant();

    // Start animation
    petGame.animationId = requestAnimationFrame(petLoop);
  }

  async function setPetFace(mood) {
    if (!petGame) return;
    const src = await pixelateEmoji(MOOD_FACES[mood]);
    petGame.petEl.src = src;
  }

  function scheduleNextWant() {
    if (!petGame) return;
    const delay = 15000 + Math.random() * 15000; // 15-30 seconds
    petGame.wantInterval = setTimeout(() => {
      if (!petGame) return;
      // Pick a random want
      const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
      setPetWant(type);
    }, delay);
  }

  async function setPetWant(type) {
    if (!petGame) return;
    petGame.want = type;

    // Show neutral face when wanting
    petGame.mood = "neutral";
    setPetFace("neutral");

    // Show bubble
    const src = await pixelateEmoji(ITEMS[type].codepoint);
    petGame.bubbleImg.src = src;
    petGame.bubble.style.display = "flex";

    // Update status
    updatePetStatus(`Your pet wants ${type}!`);

    // Ignore timer → sad after 10s
    petGame.ignoreTimeout = setTimeout(() => {
      if (!petGame || !petGame.want) return;
      petGame.mood = "sad";
      setPetFace("sad");
      updatePetStatus("Your pet is sad...");
    }, 10000);
  }

  function updatePetStatus(text) {
    if (!petGame || !petGame.statusBar) return;
    petGame.statusBar.querySelector(".status-bar-field").textContent = text;
  }

  async function dropItem(type) {
    if (!petGame) return;

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

    // --- Wander in 2D ---
    petGame.wanderTimer -= elapsed;
    if (petGame.wanderTimer <= 0) {
      petGame.targetX = 5 + Math.random() * (areaW - PET_SIZE - 10);
      petGame.targetY = 5 + Math.random() * (areaH - PET_SIZE - 10);
      petGame.wanderTimer = 2000 + Math.random() * 2000;
    }

    // Check if pet should walk to a wanted item
    let walkX = petGame.targetX;
    let walkY = petGame.targetY;
    let targetItem = null;

    if (petGame.want) {
      for (const item of petGame.items) {
        if (item.type === petGame.want && item.landed && !item.consumed) {
          targetItem = item;
          walkX = item.x;
          walkY = item.y;
          break;
        }
      }
    }

    // Move pet toward target in 2D
    const dx = walkX - petGame.x;
    const dy = walkY - petGame.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveSpeed = targetItem ? 1.5 : petGame.speed;

    if (dist > 1) {
      const step = Math.min(moveSpeed * dt, dist);
      petGame.x += (dx / dist) * step;
      petGame.y += (dy / dist) * step;
    }

    // Flip sprite based on horizontal direction
    const scaleX = dx < -1 ? -1 : 1;
    petGame.petEl.style.transform = `translate(${petGame.x}px, ${petGame.y}px) scaleX(${scaleX})`;

    // Position bubble above pet
    if (petGame.bubble.style.display !== "none") {
      petGame.bubble.style.left = (petGame.x - 1) + "px";
      petGame.bubble.style.top = (petGame.y - 26) + "px";
    }

    // --- Items: gravity + landing ---
    for (const item of petGame.items) {
      if (item.consumed) continue;

      if (!item.landed) {
        item.vy += 0.3 * dt;
        item.y += item.vy * dt;
        if (item.y >= item.landY) {
          item.y = item.landY;
          item.landed = true;

          // If not wanted, fade out after 3 seconds
          if (!petGame.want || item.type !== petGame.want) {
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

      // Check if pet reached wanted item
      if (targetItem === item && item.landed) {
        const petCX = petGame.x + PET_SIZE / 2;
        const petCY = petGame.y + PET_SIZE / 2;
        const itemCX = item.x + ITEM_SIZE / 2;
        const itemCY = item.y + ITEM_SIZE / 2;
        const d = Math.sqrt((petCX - itemCX) ** 2 + (petCY - itemCY) ** 2);
        if (d < PET_SIZE * 0.7) {
          consumeItem(item);
        }
      }
    }

    // Clean up consumed items
    petGame.items = petGame.items.filter((i) => !i.consumed);

    petGame.animationId = requestAnimationFrame(petLoop);
  }

  function consumeItem(item) {
    if (!petGame) return;

    item.consumed = true;
    item.el.remove();
    if (item.fadeTimer) clearTimeout(item.fadeTimer);

    // Clear want
    petGame.want = null;
    petGame.bubble.style.display = "none";

    // Clear ignore timers
    if (petGame.ignoreTimeout) { clearTimeout(petGame.ignoreTimeout); petGame.ignoreTimeout = null; }
    if (petGame.angryTimeout) { clearTimeout(petGame.angryTimeout); petGame.angryTimeout = null; }

    // Show pleased face briefly
    petGame.mood = "pleased";
    setPetFace("pleased");
    updatePetStatus("Your pet is pleased!");

    if (petGame.pleasedTimeout) clearTimeout(petGame.pleasedTimeout);
    petGame.pleasedTimeout = setTimeout(() => {
      if (!petGame) return;
      petGame.mood = "happy";
      setPetFace("happy");
      updatePetStatus("Your pet is happy!");
    }, 2000);

    // Schedule next want
    scheduleNextWant();
  }

  function stopPetGame() {
    if (!petGame) return;
    if (petGame.animationId) cancelAnimationFrame(petGame.animationId);
    if (petGame.wantInterval) clearTimeout(petGame.wantInterval);
    if (petGame.ignoreTimeout) clearTimeout(petGame.ignoreTimeout);
    if (petGame.angryTimeout) clearTimeout(petGame.angryTimeout);
    if (petGame.pleasedTimeout) clearTimeout(petGame.pleasedTimeout);
    petGame.items.forEach((i) => { if (i.fadeTimer) clearTimeout(i.fadeTimer); });
    petGame = null;
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
