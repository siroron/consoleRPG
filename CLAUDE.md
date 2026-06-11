# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start the game (tsx src/main.ts)
npm run build        # Bundle to dist/main.js via tsup
npm run test         # Run all tests once (vitest run)
npm run test:watch   # Watch mode
npm run lint         # ESLint over src/
npm run format       # Prettier over src/**/*.ts
npx tsc --noEmit     # Type-check without emitting
```

Run a single test file:
```bash
npx vitest run tests/battle/DamageCalculator.test.ts
```

## Architecture

### Layer order (strict — lower layers never import upper)

```
ui/ + scenes/          ← rendering and input only
    ↕
core/ + battle/ + systems/ + entities/   ← domain logic, no I/O
    ↕
data-access/           ← JSON read + zod validation + save/load
    ↕
constants/ + utils/    ← pure values, no dependencies
```

### Runtime wiring (`src/main.ts`)

`main.ts` is the only place where all services are constructed and wired together. It builds a `SceneContext` object (`{ sceneManager, gameState, eventBus, rng, dataLoader }`) and passes it into every scene factory. Scenes never import services directly — they always use `this.ctx`.

`GameLoop` drives execution: it calls `sceneManager.tick()` in a `while (running)` loop. Each tick awaits the active scene's `update()`, which in turn awaits `@inquirer/prompts` input. This makes the loop naturally sequential with no timers.

### Scene system

`Scene` (abstract) defines `onEnter()`, `onExit()`, `update()`. Scenes are registered in `main.ts` as **factories** (`() => new FooScene(ctx)`), so each transition constructs a fresh instance. Add new scene names to the `SceneName` union in `src/core/EventBus.ts` before registering them.

### Cross-cutting concerns

- **EventBus**: typed pub/sub for loose coupling between scenes and systems. All event types are declared in `EventMap` inside `EventBus.ts`. `emit()` is `async` and runs handlers sequentially.
- **RNG**: seeded via `seedrandom`. Pass `rng.next` as a callback to pure math functions in `utils/math.ts` — never call a global random inside domain logic.
- **DataLoader**: reads `data/*.json`, validates with zod, and caches results. Path is resolved relative to the compiled file using `fileURLToPath(import.meta.url)`. Add a new getter method and schema pair to extend it.
- **GameState**: thin key/value store for global mutable state. Supports `snapshot()` / `restore()` for save/load. Extend `GameStateSnapshot` interface to add new state fields.

### ESM constraints

This project is pure ESM (`"type": "module"`). All relative imports **must use `.js` extensions** even for `.ts` source files (e.g. `import { X } from './X.js'`). TypeScript is configured with `"module": "NodeNext"` and `"moduleResolution": "NodeNext"` — forgetting the `.js` extension causes runtime module-not-found errors.

### Game data

All game content (monsters, skills, items, etc.) lives in `data/*.json`. Schemas live in `src/data-access/schemas/`. When adding a new data type: create the zod schema in `schemas/`, add a getter to `DataLoader`, and add at least one entry to the JSON file. `z.enum(ELEMENTS)` and `z.enum(STATUS_TYPES)` reference the `as const` arrays in `constants/` — element/status additions must be made there first.

### Development phases

See `console-rpg-design.md` for the full roadmap. Phase 1 (foundation) is complete. Phase 2 implements `src/battle/`, `src/entities/`, and `BattleScene`. Phase 3 onwards adds `src/systems/` and save/load.
