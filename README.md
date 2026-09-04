# 星潮幸存者 · Star Tide Survivors

A polished, self-contained **roguelite wave-survival** top-down shooter that runs entirely in the browser. Built with **TypeScript + HTML5 Canvas + Vite** — no game engine, no external assets, no network calls. Everything (graphics, particles, sound) is generated procedurally at runtime.

> 在无尽的星潮中生存，升级你的战舰，击溃周期降临的首领。

## Gameplay

- **移动 / Move** — `W` `A` `S` `D` or Arrow keys
- **冲刺 / Dash** — `Space` (short burst of speed + brief invulnerability, on cooldown)
- **暂停 / Pause** — `P` or `Esc`
- **静音 / Mute** — `M`
- Your ship **auto-aims and fires** at the nearest enemy. Focus on positioning and dodging.
- Kill enemies to drop **XP gems**. Fill the XP bar to **level up** and pick one of three random **upgrades**.
- Difficulty scales with time: enemies get tougher and spawn faster. A **boss** arrives every 60 seconds.
- Survive as long as you can — your best time is saved locally.

## Core systems

| System | Highlights |
| --- | --- |
| Entities | Player ship, 5 enemy archetypes (grunt, swarmer, brute, ranged shooter, boss), player/enemy projectiles, XP gems, health packs |
| Combat | Auto-targeting, multishot, piercing, crits, damage falloff by range, i-frames + dash dodging |
| Progression | 10 stackable upgrades with per-upgrade level caps, exponential XP curve |
| Director | Time-scaled spawn cadence + stat scaling, swarm packs, fixed-cadence boss waves |
| Juice | Procedural particles, screen shake, hit flashes, floating damage numbers, parallax starfield, Web Audio SFX |
| UI | Main menu, live HUD (HP/XP/level/timer/wave/kills/dash), level-up card selection, pause, game-over with high score |

See [`DESIGN.md`](./DESIGN.md) for the full game design document.

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server at http://localhost:5173
```

Other scripts:

```bash
npm run build      # type-check (tsc --noEmit) then bundle to dist/
npm run preview    # serve the production build
npm run typecheck  # type-check only
```

## Project structure

```
src/
  main.ts                 # entry point
  style.css               # UI / overlay styling
  core/                   # engine-level, game-agnostic modules
    Input.ts              # keyboard + pointer, movement vector, edge triggers
    Camera.ts             # smooth follow + screen shake, world<->screen
    Audio.ts              # procedural Web Audio sound effects
  game/
    config.ts             # all gameplay tuning constants
    types.ts              # shared types (PlayerStats, EnemyKind, RunStats)
    math.ts               # vectors, clamp/lerp, RNG, collision helpers
    Game.ts               # orchestrator: state machine, loop, collisions, render
    Starfield.ts          # parallax background
    upgrades.ts           # upgrade definitions + level-up roll logic
    entities/             # Player, Enemy, Projectile, Pickup
    systems/              # Particles, FloatingText, Spawner
  ui/
    UI.ts                 # DOM overlays + HUD
```

## Tech

- **TypeScript** (strict mode)
- **Vite** dev server / bundler
- **HTML5 Canvas 2D** rendering
- **Web Audio API** for synthesized sound

## License

MIT
