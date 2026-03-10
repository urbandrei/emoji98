// ========== Window Manager ==========

import { playWindowOpen, playWindowClose } from "./sounds.js";
import { getUpgradeLevel, onUpgradeChange, offUpgradeChange } from "./upgrades.js";

const windowManager = {
  windows: [],
  zIndexCounter: 100,
  activeWindowId: null,
};

export function createWindow(id, title, bodyContent, options = {}) {
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

  const controls = win.querySelectorAll(".title-bar-controls button");
  controls[0].addEventListener("click", () => minimizeWindow(id));
  controls[1].addEventListener("click", () => toggleMaximize(id));
  controls[2].addEventListener("click", () => closeWindow(id));

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
  playWindowOpen();

  // Resize lock: add class if upgrade not owned, remove when purchased
  if (getUpgradeLevel("window_resize") < 1) {
    win.classList.add("resize-locked");
    const listener = onUpgradeChange(() => {
      if (getUpgradeLevel("window_resize") >= 1) {
        win.classList.remove("resize-locked");
        offUpgradeChange(listener);
      }
    });
    entry._resizeLockUnsub = listener;
  }

  return entry;
}

export function closeWindow(id) {
  const idx = windowManager.windows.findIndex((w) => w.id === id);
  if (idx === -1) return;
  const entry = windowManager.windows[idx];
  if (entry.onClose) entry.onClose();
  if (entry._resizeLockUnsub) offUpgradeChange(entry._resizeLockUnsub);
  playWindowClose();
  entry.element.remove();
  windowManager.windows.splice(idx, 1);
  removeTaskbarButton(id);

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
  if (getUpgradeLevel("window_resize") < 1) return;

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
      if (getUpgradeLevel("window_resize") < 1) return;
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

export function isWindowActive(id) {
  return windowManager.activeWindowId === id;
}

export function isWindowMinimized(id) {
  const entry = windowManager.windows.find((w) => w.id === id);
  return entry ? entry.minimized : false;
}

function updateTaskbarButtonState() {
  document.querySelectorAll(".taskbar-button").forEach((btn) => {
    const isActive =
      btn.dataset.windowId === windowManager.activeWindowId &&
      !windowManager.windows.find((w) => w.id === btn.dataset.windowId)?.minimized;
    btn.classList.toggle("active", isActive);
  });
}
