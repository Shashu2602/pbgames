# PRATIBIMB — The Investment Arcade

Five educational mini-games about alternative investments, built for the PRATIBIMB 2026 school exhibition.
Each game takes about three minutes and is worth up to 500 points (2,500 in total).

| # | Investment | Game | Plays like | Controls |
|---|---|---|---|---|
| 01 | Venture Capital | Startup Run | side-scrolling platformer | ← → / A D move · Space / W / ↑ jump (hold = higher) |
| 02 | Cryptocurrency | Crypto Slice | swipe-to-slice arcade | hold mouse button (or touch) and swipe |
| 03 | Collectibles | Price Hunter | price-guessing show | drag slider or type (e.g. `50k`, `1.2L`) · Enter locks in |
| 04 | Hedge Funds | Hedge Defense | lane defense | drag strategy cards onto the grid · keys 1–4, 5 = close |
| 05 | Private Equity | Buy, Build, Exit | falling-block puzzle | ← → move · ↑ rotate · ↓ soft drop · Space hard drop · B borrow |

Every game pauses with **Esc** (or **P**) and pauses automatically if the window loses focus.

## Run it

Requires Node.js 20 or newer. No backend, accounts, API keys or internet connection are needed once installed.

```bash
npm install
npm run dev        # http://localhost:3000
```

The dev server is pinned to port 3000 (`strictPort`) — if something else is using that port it stops with an error
instead of silently moving to another port.

Production build: `npm run build`, then `npm run preview` (also serves on port 3000).

## At the stall

- **Fullscreen** and **Sound** toggles are in the top-right of the arcade. Sound starts **off**; switch it on once and the
  browser remembers it.
- Each visitor enters a nickname only (no personal data). Use **New player** between visitors — the previous player's
  scores stay on the leaderboard.
- Replaying a game can only raise that game's best score; points never double up.
- **Score slip** prints a small slip (browser print) or copies the score text for the paper leaderboard.
- The **Leaderboard** (Hall of Fame) is stored only in this browser on this device — it is not shared between laptops.
  "Full challenge" ranks only players who finished all five games.
- **Staff: clear board** wipes the local leaderboard after typing `CLEAR`. It is a convenience, not a security feature.

## Project structure

```text
src/
  app/          App shell, routing state, session / score / hall-of-fame store (localStorage)
  components/   Dashboard, game cards + animated previews, GameShell (HUD, pause, freeze-frames,
                decision cards, results), leaderboard, score slip, dialogs
  engine/       Game loop, pause controller, keyboard input, collisions, seeded RNG,
                pixel-art toolkit + bitmap fonts, particles, Web Audio sound effects
  data/         Game metadata, learning-moment copy, collectible catalogue
  games/        One folder per game: rules/engine, original pixel art, React wrapper
```

All artwork, sounds and characters are original and generated in code. All companies, tokens other than BTC/ETH,
collectibles, prices and returns are fictional.

> An educational simulation. Points and examples are fictional and do not represent investment advice or guaranteed returns.
