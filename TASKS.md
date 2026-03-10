# Emoji98 — Task List

## Prep: Split script.js into ES Modules [DONE]

Split the monolithic `script.js` (1,739 lines) into individual ES module files using `<script type="module">` and `import`/`export` syntax.

**Suggested module breakdown:**

| File | Contents |
|------|----------|
| `js/emoji-utils.js` | `PET_CODEPOINTS`, `pixelateEmoji()`, emoji cache |
| `js/inventory.js` | `inventory`, `addInventory()`, `useInventory()`, listener system |
| `js/window-manager.js` | `windowManager`, `createWindow()`, dragging, resizing, focus, taskbar |
| `js/pet-game.js` | Emoji pet game — spawning, wants, moods, reproduction, death |
| `js/farm-sim.js` | Farm minigame — grid, planting, watering, harvesting |
| `js/water-plant.js` | Water plant minigame — drops, bucket, collection |
| `js/toy-factory.js` | Toy factory minigame — belts, pieces, color matching |
| `js/supply-dashboard.js` | Supply dashboard — inventory bars display |
| `js/desktop.js` | Desktop icons, start menu, clock, recycle bin |
| `js/main.js` | Entry point — init, preload, wire everything together |

---

## Task 1: Toy Factory — Emoji Overhaul & Auto-Select [DONE]

**Current state:** Factory uses colored circles (red, blue, yellow, green) on conveyor belts. Player presses color buttons to match the leftmost piece. Streak of 3 correct = 1 toy.

**Changes:**

- **Replace colored circles with toy emojis** — soccer ball, basketball, teddy bear, rubber duck, etc. Each type has its own emoji rendered via the pixelation system.
- **Auto-select mechanic** — Instead of pressing buttons, the player selects a toy type (e.g. soccer ball). Any pieces of that type that reach the left edge of the conveyor are automatically collected. Non-matching pieces fall off and are lost.
- **Diminishing returns** — The longer you stay on one type without switching, the fewer of that type are spawned on the belts. Spawn rate decreases gradually down to a **minimum of ~10%** of normal.
- **Gradual reset** — When switching to a different type, the previously diminished type's spawn rate **gradually restores over a few seconds** (not instant).

**Gameplay loop:** Pick a type → auto-collect matching pieces → notice that type becoming rarer → switch to a new type → repeat. Strategic switching maximizes output.

---

## Task 2: Farm — Full Auto-Progression [DONE]

**Current state:** Farm is entirely manual. Player selects a tool (plant/water/harvest) and clicks tiles to advance crop stages: empty → planted → watered → grown → harvested.

**Changes:**

- **Full auto cycle** — The farm automatically:
  1. Plants seeds in random empty tiles
  2. Waters planted crops
  3. Advances watered crops to grown
  4. Harvests grown crops (adding to food inventory)
- **Much slower than manual** — Auto-progression runs at a significantly reduced rate compared to clicking by hand, so manual interaction remains valuable.
- **Random planting** — New seeds are planted in random empty tiles at intervals.
- Manual interaction still works and is faster.

---

## Task 3: Water Plant — Smooth Controls & Sporadic Drops [DONE]

**Current state:** Bucket moves in discrete 30px jumps via keyboard arrows or clicking left/right halves of the game area. Drops fall at a regular interval scaled by area width.

**Changes:**

- **Left/right buttons below the game** — Add two visible buttons beneath the water game area for moving the bucket. These **replace** the existing keyboard and click-area controls.
- **Smooth bucket movement** — Bucket moves smoothly (continuous animation) instead of jumping 30px at a time. Hold button = continuous movement.
- **Slow drip pattern** — Water drops fall with more sporadic, random timing. Slower overall with more variance between drops (not regular intervals).

---

## Task 4: Named Emojis in Recycle Bin [DONE]

**Current state:** Recycle bin opens as an empty window with "Recycle Bin is empty." text. Emojis have no names.

**Changes:**

- **Random name generation** — Every emoji pet is assigned a random name at birth, combining a first name and last name from a diverse international pool.
- **~200+ first names and ~200+ last names** — Sourced from the most common names across many countries worldwide (e.g. Yuki, Priya, Carlos, Olga, Kwame, Fatima, Liam, Mei, etc.).
- **Names visible only in recycle bin** — Names are not displayed on the desktop or in the pet game. When an emoji is thrown away, the recycle bin shows entries like `yuki_patel.emoji`, `carlos_nakamura.emoji`.
- **Recycle bin UI** — Update the recycle bin window to list disposed items as file entries (Win98 file list style).

---

## Task 5: Poop & Sickness System [DONE]

**Current state:** No poop or sickness mechanics exist. Pets only die from missed wants (3 misses = death).

**Changes:**

- **Random pooping** — Emojis randomly produce a poop emoji (💩) at their current location every so often.
- **Poop cleanup** — Poop must be **dragged to the recycle bin icon on the desktop** to dispose (see Task 6 for drag mechanics). Poop entries appear in the recycle bin.
- **Sickness from proximity** — If an emoji is near poop for **~15 seconds**, it gets sick and displays a throw-up/nauseated emoji face.
- **Death from sickness** — If an emoji remains sick for **~60 seconds** without the poop being cleaned up, it dies.
- **New codepoints needed:** 💩 (1f4a9), 🤮 (1f92e) or 🤢 (1f922)

---

## Task 6: Drag-to-Desktop-Bin Interaction [DONE]

**Current state:** No drag-and-drop exists. Dead pets are dismissed by clicking.

**Changes:**

- **Cross-window dragging** — Player can click and drag emojis and poop from the pet game window to the recycle bin icon on the desktop.
- **Visual feedback** — The dragged item (emoji or poop image) follows below the mouse cursor during the drag, rendered as a floating element above all windows.
- **Drop detection** — Releasing over the recycle bin icon disposes the item. Releasing elsewhere cancels the drag and returns the item.
- Applies to: dead emojis, live emojis (killing them), and poop.

---

## Task 7: Click Emoji for Heart [DONE]

**Current state:** Clicking on pets does nothing (only dead pets are clickable to dismiss).

**Changes:**

- **Heart speech bubble** — Clicking a living emoji shows a speech bubble containing a heart emoji (❤️).
- **Brief popup** — The bubble appears for **~1.5 seconds** then fades away.
- **Purely cosmetic** — No gameplay effect (no mood boost, no want delay).
- Should not interfere with the existing want speech bubble system.

---

## Task 8: Macrohard 2026 Rebranding [DONE]

**Current state:** The game uses Windows 98 styling with a Microsoft-inspired aesthetic. The wallpaper is a pixelated version of the Bliss hills (bliss.svg). Start button uses a Windows-style icon.

**Changes:**

- **Replace all Microsoft/Windows references** with "Macrohard 2026".
- **New logo** — 4 arrows pointing outward (up, down, left, right) in **different shades of pink**. Create as SVG.
- **Logo placement** — Start menu button, taskbar, boot screen (Task 11), My Computer window.
- **Replace wallpaper** — Replace `icons/bliss.svg` with a similar **CC0 nature/landscape scene** (rolling hills, sky, etc.). Pixelate it the same way.
- Update window titles, about text, and any other branding strings.

---

## Task 9: Sound Effects [DONE]

**Current state:** No audio of any kind.

**Changes:**

- **Hybrid approach** — Mix of Web Audio API synthesis and CC0 audio files:
  - **Synthesized** (Web Audio API): UI clicks, button presses, beeps, simple chimes, error buzzes
  - **Audio files** (CC0/public domain): Startup chime, dial-up modem (for boot screen), shutdown sound, more complex retro jingles
- **Win98/XP classic sounds** — Startup, shutdown, error, menu open/close, window actions
- **Retro game sounds for emojis** — Pet happy sound, pet death sound, feeding sound, water splash, factory conveyor, harvest chime, poop splat
- Sound system should integrate with Settings (Task 13) for volume/mute control.

---

## Task 10: Nubby the Eraser (Clippy-like Helper)

**Current state:** No helper character exists.

**Changes:**

- **Character** — "Nubby the Eraser" — a CC0 eraser image with eyes, styled to look friendly/helpful.
- **Idle position** — Sits in a corner of the screen (bottom-right, like Clippy).
- **Interactive** — Clickable to open a help dialog with tips and advice about the current context.
- **Event-triggered popups** — Automatically appears with contextual advice for critical events:
  - Pet is dying or sick
  - Resources critically low
  - First time opening an app (tutorial tips)
  - Idle for a while
- **Dismissable** — Can be closed/minimized by the player.
- Speech bubble with Win98-styled text box.

---

## Task 11: Win98 Boot Screen

**Current state:** Game loads directly into the desktop.

**Changes:**

- **Boot sequence on every page load** — Before the desktop appears, show a Windows 98-style boot screen:
  - Dark screen with Macrohard 2026 logo
  - Progress bar / loading animation
  - Fake BIOS text or "Starting Macrohard 2026..." text
- **Dial-up modem sound** — Plays the classic dial-up connection sound during the boot sequence (CC0 audio file, see Task 9).
- **No skip option** — The full boot animation always plays to completion before the desktop is revealed.
- **Sequence:** Black screen → logo + loading bar + dial-up sound → desktop fades in.

---

## Task 12: Pipes Screensaver

**Current state:** No screensaver or idle detection.

**Changes:**

- **Idle detection** — Track mouse movement and keyboard input. After **2 minutes** of no activity, activate the screensaver.
- **Canvas-rendered pipes** — Full-screen `<canvas>` overlay rendering animated 3D-style pipes, similar to the classic Windows 98 screensaver:
  - Pipes grow in random directions (up/down/left/right)
  - Random colors
  - Ball joints at direction changes
  - Pipes wrap or restart when they fill the screen
- **Dismiss on input** — Any mouse movement or keypress dismisses the screensaver and returns to the desktop.
- Screensaver timeout should be configurable in Settings (Task 13).

---

## Task 13: Settings App

**Current state:** No settings app exists.

**Changes:**

- **New desktop icon** — Settings/Control Panel icon on the desktop.
- **Settings window** with the following options:

| Setting | Control | Details |
|---------|---------|---------|
| Sound volume | Slider (0-100%) | Master volume for all sounds |
| Sound mute | Toggle checkbox | Mute/unmute all audio |
| Screensaver timeout | Dropdown or slider | Time before pipes screensaver activates (default: 2 min) |
| Wallpaper | Selection + upload | Choose from presets or upload your own image |

- **Wallpaper upload** — File input that accepts images. Uploaded wallpaper is pixelated using the existing `pixelateWallpaper()` system and applied to the desktop.
- Settings persist in `localStorage`.
- Win98-styled control panel layout.
