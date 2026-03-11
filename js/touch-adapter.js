// ========== Touch-to-Mouse Adapter ==========
// Converts touch events to mouse events so all existing mouse handlers work on mobile.

let lastTap = 0;

document.addEventListener("touchstart", (e) => {
  const touch = e.touches[0];
  // Double-tap detection for dblclick
  const now = Date.now();
  if (now - lastTap < 300) {
    e.target.dispatchEvent(new MouseEvent("dblclick", {
      bubbles: true, clientX: touch.clientX, clientY: touch.clientY
    }));
  }
  lastTap = now;

  e.target.dispatchEvent(new MouseEvent("mousedown", {
    bubbles: true, clientX: touch.clientX, clientY: touch.clientY
  }));
  e.preventDefault();
}, { passive: false });

document.addEventListener("touchmove", (e) => {
  const touch = e.touches[0];
  document.dispatchEvent(new MouseEvent("mousemove", {
    bubbles: true, clientX: touch.clientX, clientY: touch.clientY
  }));
  e.preventDefault();
}, { passive: false });

document.addEventListener("touchend", (e) => {
  const touch = e.changedTouches[0];
  document.dispatchEvent(new MouseEvent("mouseup", {
    bubbles: true, clientX: touch.clientX, clientY: touch.clientY
  }));
});
