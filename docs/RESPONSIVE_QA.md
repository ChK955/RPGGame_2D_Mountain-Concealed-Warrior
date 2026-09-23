# Responsive HUD QA

Date: 2026-09-15. Local Vite build at `http://localhost:5177`, Chromium through Playwright CLI, isolated session `mistsize`.

## Finding and fix

Fixed a fractional-pixel HUD scaling error in `src/ui/Hud.ts`. At a 390 × 844 viewport, the 16:9 game area is 390 × 219.375 CSS pixels. Using integer `clientHeight` reduced the HUD stage to 389.333 × 219 while the canvas remained 390 × 219.375. `resize()` now reads `getBoundingClientRect()` so HUD and canvas preserve the same fractional dimensions. All measurements below were repeated after this fix.

## Results

The canvas, `#hud-root`, and `.hud-stage` matched in position and dimensions at every tested size. All game regions maintained 16:9, were centered, and had no document scroll overflow.

| Browser viewport | Canvas and HUD size | Canvas and HUD position | Expanded pause/controls |
| --- | --- | --- | --- |
| 1280 × 720 | 1280 × 720 | x 0, y 0 | Fits; panel 410 × 558 |
| 800 × 600 | 800 × 450 | x 0, y 75 | Fits; panel 256.25 × 348.75 |
| 390 × 844 | 390 × 219.375 | x 0, y 312.3125 | Fits; panel 124.921875 × 170.015625 |
| 1920 × 1080 | 1920 × 1080 | x 0, y 0 | Fits; panel 615 × 837 |

The pause button was clicked, then Controls was expanded through the actual menu button. Both the complete pause panel and the control list remained inside the game shell at all four dimensions. Desktop and portrait gameplay and menu screenshots were visually inspected: the center/lower-middle playfield is clear during play, edge HUD clusters stay inside the game, and menus do not clip.

Portrait uses the specified proportional letterboxing: its text and buttons are correspondingly small. This pass verifies layout integrity; touch controls and a dedicated mobile interface are outside this keyboard-demo scope.

The isolated browser console reported **0 errors and 0 warnings**. All 144 captured network requests, including application modules and local image assets across reloads, returned HTTP 200; no 404s were recorded. The `mistsize` browser was closed after capture to avoid focus interference with the separate gameplay test session.

## Screenshots

| Viewport | Gameplay | Expanded pause and controls |
| --- | --- | --- |
| 1280 × 720 | [Gameplay](../output/playwright/responsive-1280x720.png) | [Pause](../output/playwright/responsive-1280x720-pause-controls.png) |
| 800 × 600 | [Gameplay](../output/playwright/responsive-800x600.png) | [Pause](../output/playwright/responsive-800x600-pause-controls.png) |
| 390 × 844 | [Gameplay](../output/playwright/responsive-390x844.png) | [Pause](../output/playwright/responsive-390x844-pause-controls.png) |
| 1920 × 1080 | [Gameplay](../output/playwright/responsive-1920x1080.png) | [Pause](../output/playwright/responsive-1920x1080-pause-controls.png) |

Console source: `.playwright-cli/console-2026-09-15T14-31-26-172Z.log`. Gameplay behavior and combat verification are recorded separately by the main playtest pass.
