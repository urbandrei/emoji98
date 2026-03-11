// ========== Viewport Scaling ==========
// Height-based scaling with flexible width. No horizontal black bars.

let scale = 1;
let marginX = 0;
let marginY = 0;
let layoutWidth = 1440;

export function getScale() { return scale; }
export function getLayoutWidth() { return layoutWidth; }
export function toLayoutX(clientX) { return (clientX - marginX) / scale; }
export function toLayoutY(clientY) { return (clientY - marginY) / scale; }

export function initScaling() {
  const root = document.getElementById("game-root");
  function update() {
    // Height-based scale, capped so content never narrower than 1440
    scale = Math.min(window.innerWidth / 1440, window.innerHeight / 810);
    // Flexible width: fill the full viewport width
    layoutWidth = Math.max(1440, window.innerWidth / scale);
    root.style.width = layoutWidth + "px";
    root.style.transform = `scale(${scale})`;
    root.style.transformOrigin = "top left";
    // No horizontal bars; vertical margin only if height-capped (rare)
    const scaledW = layoutWidth * scale;
    const scaledH = 810 * scale;
    marginX = Math.max(0, (window.innerWidth - scaledW) / 2);
    marginY = Math.max(0, (window.innerHeight - scaledH) / 2);
    root.style.marginLeft = marginX + "px";
    root.style.marginTop = marginY + "px";
  }
  update();
  window.addEventListener("resize", update);
}
