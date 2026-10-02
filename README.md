# Bear & Burrow

A cozy, original browser merge game about helping a little bear community grow its woodland home. Gather items from producers, merge matching items into richer treasures, deliver bear requests, and spend coins improving Bear Hollow. Progress stays in the browser; there is no account or backend.

## Run it

Requirements: Node.js 20.19+ (or 22+) and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually <http://localhost:5173/>. The first minute walks you through two gathers, a merge, and Bruno's first order. Mouse, touch, and pointer dragging work on the 8×8 board. You can also select an item and then select a destination, which provides a keyboard-friendly way to move or merge.

```bash
npm test           # deterministic engine and save tests
npm run typecheck
npm run lint
npm run build      # production output in dist/
```

The browser walkthrough uses **playwriter** with the connected Chrome extension, following this repository's browser tooling rule. Run `npm run test:e2e` in PowerShell. It starts a temporary Vite server on its own port and a new playwriter tab, then tests the tutorial, pointer merge, delivery, save reload, storage, a Hollow upgrade, the Collection Book, a phone viewport, and reset. It stops the server and closes the test tab afterward. The script is currently Windows/PowerShell specific.

## How the game works

- A **merge chain** is a sequence of six item tiers. Two identical items at one tier become one item at the next tier. A tier 6 item is the end of its chain.
- A **producer** is a board object you tap to gather items. It usually gives tier 1 items, sometimes tier 2, rarely tier 3. Each producer has its own 25 charges and refills one every six seconds, including while the game is closed. Producers cannot be sold.
- An **order** is a bear's request for one or more items. Items on the board and in storage both count. Delivering consumes only the requested items and awards coins and Friendship XP. Orders never expire; a free reroll has a short cooldown.
- **Bear Hollow** turns coins into visible village improvements. Configured upgrades unlock more producers, chains, and bears. Once the authored improvements are done, orders continue indefinitely.
- The **Collection Book** records every item discovered, even if that item was later delivered or sold. First discoveries award a small bonus.
- **Storage** starts with eight slots. Select an item and choose Store, or drag it into a slot. Sell is a separate selected-item action with a brief Undo button.

## Project map

| Area                                                   | Purpose                                                                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| [`src/game/data.ts`](src/game/data.ts)                 | Chains, all 30 item definitions, producers, bears, upgrades, and balance values.                                |
| [`src/game/engine.ts`](src/game/engine.ts)             | Pure game rules: merging, weighted output, offline charges, inventory, orders, economy, and progression.        |
| [`src/game/types.ts`](src/game/types.ts)               | Stable IDs and state/content types. Board item instances have their own IDs.                                    |
| [`src/store/gameStore.ts`](src/store/gameStore.ts)     | Zustand actions, UI notices, immediate meaningful autosave, periodic fallback save, and cross-tab save updates. |
| [`src/store/persistence.ts`](src/store/persistence.ts) | Versioned JSON save validation, loading, and migration entry point.                                             |
| [`src/App.tsx`](src/App.tsx)                           | Board, order cards, storage, Hollow, Collection, settings, and development tools.                               |
| [`src/styles.css`](src/styles.css)                     | Responsive storybook presentation and reduced-motion rules.                                                     |
| [`public/assets/painted/`](public/assets/painted/)     | Storybook landscapes, cottage interior, village location scenes, bear portraits, and item and producer atlases. |
| [`public/assets/`](public/assets/)                     | Earlier local SVG artwork, retained as fallback material.                                                       |
| [`scripts/generate-art.mjs`](scripts/generate-art.mjs) | Rebuilds the earlier SVG artwork without changing the painted assets.                                           |

## Add content

**New bear:** Add a stable ID, name, species, portrait path, and short note in `bears` in `src/game/data.ts`. Put its portrait in `public/assets/painted/` or point `asset` to another local image. Unlock it from an upgrade or include it in the initial unlocked bear list in `createNewGame`. Order generation draws from `unlockedBears` automatically.

**New merge chain:** Add a chain entry with a stable `id`, six tier names, and color in `chainData`. The derived `chains` and `items` registries automatically give it merge rules, collection entries, order eligibility, item information, selling, and save compatibility. Add a 3×2 atlas at `/assets/painted/<chain-id>-atlas.webp` with tiers in reading order; `spriteIndex` selects the tile. Keep existing IDs stable once people have saves.

**New producer:** Add a `ProducerDefinition` in `producers` with a stable ID, associated chain, asset path, `spriteIndex`, `maxCharges`, `rechargeMs`, and weighted `outputs`. Add its picture to the 3×2 `producers-atlas.webp` or point the asset to a separate atlas. Unlock it from an upgrade. The engine handles output distribution, capacity, offline regeneration, and full-board failure generically.

**Balance and progression:** `balance` and `upgrades` in `src/game/data.ts` hold the tunable values and authored unlock path. `itemCost(tier)` in the engine computes theoretical crafting cost as `2^(tier - 1)` and informs order rewards. Order tier weighting and complexity rules are in `generateOrder`.

**Replace artwork:** The painted assets are local WebP images and contain no external game artwork or icon pack. Bear portraits and landscapes are standalone files. Item and producer art are six-tile atlases; keep each tile in reading order or update `spriteIndex` in the registry. The original concept images in `dev-dontcommit/images/` are design references and are not bundled into the app. The optional SVG generator only overwrites the earlier SVG assets.

## Saves and development tools

The `SaveGame` state carries schema `version: 1`. `migrateSave` is the explicit gate for future migrations; add a migration branch there when changing the schema. The game saves meaningful changes immediately and saves play time/charge recovery periodically. Settings has JSON Export, Import with validation and overwrite confirmation, and Reset with confirmation. Local storage key: `bear-and-burrow-save`.

In development builds, **Developer tools** appears in the footer. It can add coins or XP, unlock all content, fill charges, spawn any item, complete orders, clear the board, simulate offline recovery, inspect/export raw state, and reset progression. It is hidden in production builds.

Sound effects are gentle tones generated locally by Web Audio after interaction. The music volume setting is ready for a future ambient track; the initial release has no music file. Balance is tuned for a generous first version but has not had a long human playtest.

## GitHub Pages

The Vite build uses relative asset paths so the game works under a repository subpath. Pushing to `main` runs [the Pages workflow](.github/workflows/pages.yml), which builds `dist/` and publishes it. In repository Settings → Pages, select **GitHub Actions** as the source. The live game is at <https://jasonshaw0.github.io/BearSort/>.
