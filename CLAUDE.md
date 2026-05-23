# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web-based blind box lottery mini-game with an Ultraman cartoon theme. Players spend energy points to draw random gifts with different rarity levels (common, rare, epic, legendary). Gifts, point costs, and daily rewards are fully customizable via an in-game settings panel. The game runs as a single-page application with no build step or dependencies.

## Running the Game

Open `index.html` directly in a browser. No server, bundler, or package manager is needed.

```bash
# On Windows:
start index.html
```

## Architecture

Three plain files, no framework:

- **index.html** — Semantic page structure with modals (result, settings, daily check-in, history sidebar), a blind-box machine area, and a prize display grid.
- **css/style.css** — Ultraman-inspired design system: CSS custom properties for theme colors (`--ultra-red`, `--ultra-gold`, etc.), keyframe animations for box shake/open/aura/sparkle, rarity-based glow effects, confetti/particle animations, and screen-shake.
- **js/game.js** — All game logic in a single file. Key functions:

### Data flow
`loadState()` reads from `localStorage` key `ultraman-blindbox` → `gameState` object drives all UI via `updateAllUI()` → `saveState()` on every draw and settings change.

### Core systems
- **`drawGift()`** — Weighted random selection using the probability field on each gift. Sums all probabilities, rolls a random number, and walks the gift list.
- **`performDraw()`** — Async orchestration of the draw sequence: deduct points, shake box (1.2s suspense), spawn particles + confetti + screen-shake based on rarity, show result modal, persist history.
- **`spawnParticles(x, y, count, color)`** — CSS-animated particle burst at screen coordinates. Uses CSS custom properties (`--dx`, `--dy`) for random radial trajectories.
- **`spawnConfetti(count)`** — Colored confetti bars falling from top of screen with randomized delay/duration.
- **Settings panel** (`renderGiftSettings()` / `bindGiftSettingsEvents()`) — Dynamic form that rebuilds the gift pool. Add/remove/edit gifts (emoji, name, rarity, probability). Save persists to localStorage.
- **Background particles** (`initBackgroundParticles()`) — Canvas-based particle network with connection lines, rendered behind all UI.
- **Daily check-in** — Once per calendar day, grants configurable point reward.

### State shape
```js
gameState = {
  points: number,         // current points balance
  drawCost: number,       // points per draw
  dailyReward: number,    // points from daily check-in
  gifts: [{ id, name, emoji, rarity, probability }],
  history: [{ ...gift, time: ISO string }],  // most recent 50
  isDrawing: boolean,     // lock during draw animation
  lastDailyDate: string,  // date string for daily check-in cooldown
}
```

### Rarity tiers
| rarity | label | color | effects |
|--------|-------|-------|---------|
| common | 普通 | #9CA3AF | particle burst |
| rare | 稀有 | #3B82F6 | particles + card glow |
| epic | 史诗 | #A855F7 | particles + 40 confetti + card glow |
| legendary | 传说 | #FFD700 | particles + 80 confetti + screen shake + multi-wave burst + pulsing card glow |
