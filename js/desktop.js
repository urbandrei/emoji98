// ========== Desktop, Start Menu, Static Apps ==========

import { createWindow, closeWindow } from "./index.js";
import { recycleBin, onRecycleBinChange, offRecycleBinChange } from "./index.js";
import { playMenuOpen, playMenuClose, playClick, playShutdown } from "./sounds.js";
import { getLayoutWidth } from "./scaling.js";

export function initDesktopIcons(launchApp) {
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

  document.getElementById("desktop").addEventListener("mousedown", (e) => {
    if (e.target === e.currentTarget) {
      icons.forEach((i) => i.classList.remove("selected"));
    }
  });
}

export function initStartMenu(launchApp) {
  const startBtn = document.getElementById("start-button");
  const startMenu = document.getElementById("start-menu");

  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !startMenu.hidden;
    startMenu.hidden = isOpen;
    startBtn.classList.toggle("active", !isOpen);
    if (isOpen) playMenuClose(); else playMenuOpen();
  });

  document.querySelectorAll("#start-menu-list li[data-app]").forEach((li) => {
    li.addEventListener("click", () => {
      const app = li.dataset.app;
      playClick();
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

export function initClock() {
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

export function launchMyComputer() {
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

function renderRecycleBinList(container) {
  if (recycleBin.length === 0) {
    container.innerHTML = "<p>Shredder is empty.</p>";
    return;
  }
  container.innerHTML = "";
  for (let i = recycleBin.length - 1; i >= 0; i--) {
    const entry = recycleBin[i];
    const row = document.createElement("div");
    row.className = "recycle-bin-item";
    const fileName = `${entry.name.first.toLowerCase()}_${entry.name.last.toLowerCase()}.emoji`;
    row.innerHTML = `<span class="recycle-bin-icon">📄</span><span class="recycle-bin-name">${fileName}</span>`;
    container.appendChild(row);
  }
}

export function launchRecycleBin() {
  const body = document.createElement("div");
  body.className = "recycle-bin-body";
  renderRecycleBinList(body);

  const listener = onRecycleBinChange(() => renderRecycleBinList(body));

  const entry = createWindow("recycle-bin", "Shredder", body, {
    width: 320,
    height: 260,
    icon: "icons/recycle-bin.svg",
    onClose: () => offRecycleBinChange(listener),
  });
}

function launchShutdown() {
  playShutdown();
  const body = document.createElement("div");
  body.className = "shutdown-body";
  body.innerHTML = "<p>It's now safe to turn off<br>your computer.</p>";
  const restartBtn = document.createElement("button");
  restartBtn.textContent = "Restart";
  restartBtn.addEventListener("click", () => closeWindow("shutdown"));
  body.appendChild(restartBtn);

  createWindow("shutdown", "Shut Down", body, {
    width: 340,
    height: 200,
    x: (getLayoutWidth() - 340) / 2,
    y: (810 - 230) / 2,
    icon: "icons/shutdown.svg",
  });
}
