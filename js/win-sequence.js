// ========== Win Sequence ==========

import { pixelateEmoji } from "./emoji-utils.js";
import { closeWindow } from "./window-manager.js";
import { clearSave } from "./upgrades.js";
import { playBSOD } from "./sounds.js";

const FACE_CODEPOINTS = ["1f600", "1f60a", "1f622", "1f921", "1f60e", "1f917", "1f92a", "1f60d"];

export async function startWinSequence() {
  // Close all windows
  const windows = document.querySelectorAll("#windows-container .window");
  for (const win of windows) {
    const id = win.dataset.windowId;
    if (id) closeWindow(id);
  }

  // Hide taskbar and desktop icons
  document.getElementById("taskbar").style.display = "none";
  document.getElementById("desktop").style.pointerEvents = "none";

  // Preload face images
  const faceSrcs = await Promise.all(FACE_CODEPOINTS.map((cp) => pixelateEmoji(cp)));

  // === Phase 1: Emojis escape (5s) ===
  const emojis = [];
  const emojiCount = 50 + Math.floor(Math.random() * 50);

  for (let i = 0; i < emojiCount; i++) {
    const img = document.createElement("img");
    img.className = "escape-emoji";
    img.src = faceSrcs[Math.floor(Math.random() * faceSrcs.length)];
    img.draggable = false;
    img.style.width = (20 + Math.random() * 24) + "px";
    img.style.height = img.style.width;
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    img.style.left = x + "px";
    img.style.top = y + "px";
    document.body.appendChild(img);
    emojis.push({
      el: img,
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
    });
  }

  const textEl = document.createElement("div");
  textEl.className = "escape-text";
  textEl.textContent = "THE EMOJIS HAVE ESCAPED!";
  document.body.appendChild(textEl);

  let animId;
  function bounceLoop() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const e of emojis) {
      e.x += e.vx;
      e.y += e.vy;
      if (e.x < 0 || e.x > w - 30) e.vx *= -1;
      if (e.y < 0 || e.y > h - 30) e.vy *= -1;
      e.x = Math.max(0, Math.min(w - 30, e.x));
      e.y = Math.max(0, Math.min(h - 30, e.y));
      e.el.style.left = e.x + "px";
      e.el.style.top = e.y + "px";
    }
    animId = requestAnimationFrame(bounceLoop);
  }
  animId = requestAnimationFrame(bounceLoop);

  // === Phase 2: Congratulations + confetti (5s) ===
  await wait(5000);
  textEl.textContent = "CONGRATULATIONS!";

  const confettiEls = [];
  const colors = ["#ff0", "#f0f", "#0ff", "#f00", "#0f0", "#00f", "#ff8800"];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.left = Math.random() * window.innerWidth + "px";
    c.style.top = -10 + "px";
    c.style.width = (4 + Math.random() * 8) + "px";
    c.style.height = (4 + Math.random() * 8) + "px";
    document.body.appendChild(c);
    confettiEls.push({ el: c, x: parseFloat(c.style.left), y: -10, vy: 1 + Math.random() * 3, vx: (Math.random() - 0.5) * 2 });
  }

  let confId;
  function confettiLoop() {
    for (const c of confettiEls) {
      c.y += c.vy;
      c.x += c.vx;
      c.el.style.top = c.y + "px";
      c.el.style.left = c.x + "px";
      if (c.y > window.innerHeight) { c.y = -10; c.x = Math.random() * window.innerWidth; }
    }
    confId = requestAnimationFrame(confettiLoop);
  }
  confId = requestAnimationFrame(confettiLoop);

  // === Phase 3: BSOD (after 5s) ===
  await wait(5000);
  cancelAnimationFrame(animId);
  cancelAnimationFrame(confId);

  // Clean up phase 1 & 2
  for (const e of emojis) e.el.remove();
  for (const c of confettiEls) c.el.remove();
  textEl.remove();

  playBSOD();

  const bsod = document.createElement("div");
  bsod.className = "bsod";
  bsod.innerHTML = `<pre>
EMOJI98

A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMCPD(01) +
00011986. The current application has performed an illegal operation
and will be shut down.

All emojis have been freed. The virtual desktop is no longer viable.

*  Press any key to start over.               *
*  You have been a wonderful caretaker.        *

<span class="bsod-cursor"></span></pre>`;
  document.body.appendChild(bsod);

  // Click or key → reset
  function onDismiss() {
    bsod.removeEventListener("click", onDismiss);
    document.removeEventListener("keydown", onDismiss);
    bsod.remove();

    clearSave();

    // Show taskbar again
    document.getElementById("taskbar").style.display = "";
    document.getElementById("desktop").style.pointerEvents = "";

    // Show win dialog
    const dialog = document.createElement("div");
    dialog.className = "window";
    dialog.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:300000;width:240px;";
    dialog.innerHTML = `
      <div class="title-bar"><div class="title-bar-text">You Won!</div></div>
      <div class="window-body" style="padding:16px;text-align:center;">
        <p style="margin:0 0 12px;font-size:13px;">You won Emoji98!<br>Thanks for playing.</p>
        <button id="win-ok-btn" style="min-width:60px;">OK</button>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector("#win-ok-btn").addEventListener("click", () => {
      dialog.remove();
      location.reload();
    });
  }

  bsod.addEventListener("click", onDismiss);
  document.addEventListener("keydown", onDismiss);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
