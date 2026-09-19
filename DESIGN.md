# 星潮幸存者 · Star Tide Survivors — Game Design Document

## 1. High concept

A fast, arcade **roguelite wave-survival shooter**. The player pilots a lone star-fighter caught in an endless "star tide" of enemies. The ship fires automatically, so the player focuses purely on **movement, positioning, and build-crafting**. Every level-up presents a choice of upgrades, so each run grows into a unique power fantasy — until the tide overwhelms you.

- **Genre:** Roguelite / bullet-heaven / arena survival
- **Session length:** 3–10 minutes per run
- **Platform:** Browser (desktop, keyboard + mouse)
- **Camera:** Top-down, smooth-follow, screen-shake juice
- **Pillars:** *Readable chaos · meaningful choices · escalating tension*

## 2. Core loop

```
Move & dodge  →  auto-fire kills enemies  →  collect XP gems  →  level up
      ↑                                                              │
      └───────  choose an upgrade (3 options)  ←──────────────────┘
```

Every ~20 seconds is a new "wave" (difficulty tier); every 60 seconds a **boss** appears. The run ends when the ship's HP reaches zero. The goal is **longest survival time**, persisted as a local high score.

## 3. Player

| Stat | Base | Notes |
| --- | --- | --- |
| Max HP | 100 | Death at 0 |
| Move speed | 240 px/s | |
| Fire interval | 0.42 s | Auto-fires at nearest enemy |
| Projectile damage | 22 | |
| Projectile speed | 620 px/s | |
| Projectile count | 1 | Multishot fans out with spread |
| Pierce | 0 | Extra enemies a bullet passes through |
| Range | 620 px | Bullets expire after this distance |
| Crit chance / mult | 5% / ×2 | |
| Magnet radius | 90 px | XP auto-collection range |
| Regen | 0 hp/s | |

**Dash** (`Space`): a 0.16 s burst at 900 px/s with **invulnerability frames**, on a 1.6 s cooldown — the primary skill-expression tool for escaping surrounds. Taking a hit grants 0.6 s of i-frames to prevent instant melts.

## 4. Enemies

| Kind | Role | HP | Speed | Touch dmg | Behavior |
| --- | --- | --- | --- | --- | --- |
| Grunt | Baseline chaser | 30 | 92 | 10 | Walks straight at you |
| Swarmer | Fast, fragile | 14 | 168 | 7 | Spawns in packs, overwhelms |
| Brute | Tank | 160 | 58 | 22 | Slow, high HP, big body |
| Shooter | Ranged | 46 | 74 | 9 | Keeps distance, fires bolts |
| Boss | Elite | 2600+ | 66 | 34 | Spread-fires, huge HP bar, drops big rewards |

All enemies use a subtle sinusoidal wobble so crowds feel organic rather than laser-straight. Enemy HP and damage scale with elapsed time.

## 5. Difficulty director

The `Spawner` is purely time-driven:

- **Spawn interval** shrinks from 1.5 s toward a floor of 0.28 s (`intervalDecayPerMin = 0.28`).
- **Batch size** grows (`batchGrowthPerMin = 0.9`), so more enemies arrive per spawn over time.
- **Enemy HP** scales `+55%/min`, **damage** `+22%/min`.
- **Enemy mix** shifts: early game is grunts/swarmers; shooters, then brutes, join later.
- Occasional **swarm packs** create pressure spikes.
- **Bosses** every 60 s, each stronger than the last.
- Hard cap of 420 concurrent enemies for performance.

This creates a smooth tension curve: comfortable opening, mounting chaos, periodic boss spikes.

## 6. Progression & upgrades

XP required for level *N* follows `base · growth^(N-1)` (`base = 5`, `growth = 1.32`). On level-up the game pauses and offers **3 random, non-maxed upgrades**:

| Upgrade | Effect | Max |
| --- | --- | --- |
| 高能弹头 High-Energy Warhead | +25% damage | 8 |
| 急速连射 Rapid Fire | −18% fire interval | 8 |
| 多重射击 Multishot | +1 projectile | 6 |
| 穿透弹 Piercing Rounds | +1 pierce | 5 |
| 推进强化 Thrusters | +12% move speed | 6 |
| 护盾扩容 Shield Capacity | +25 max HP (and heal it) | 6 |
| 纳米修复 Nano-Repair | +1.5 HP/s regen | 5 |
| 精准弱点 Weak Point | +7% crit chance | 6 |
| 超远射程 Long Range | +20% range, +10% bullet speed | 5 |
| 引力线圈 Gravity Coil | +45% pickup radius | 5 |

Distinct builds emerge: glass-cannon multishot/crit, tanky regen bruiser, piercing sniper, etc. When everything is maxed, level-ups grant a heal instead.

## 7. Game feel ("juice")

- **Particles:** explosions on death, muzzle sparks, dash burst, hit sparks.
- **Screen shake:** scaled by event (small on hit, large on boss death / player death).
- **Hit flash:** enemies flash white when damaged; player flashes during i-frames.
- **Floating damage numbers:** crits are larger and gold.
- **Parallax starfield:** multi-depth stars scroll against camera motion.
- **Procedural audio:** Web Audio synthesizes shoot/hit/explosion/level-up/hurt/dash/boss cues — zero audio files.

## 8. UI / UX

- **Main menu:** title, tagline, best-time, controls hint, Start.
- **HUD:** XP bar + level, HP bar with numbers, dash-ready pip, run timer, current wave + live enemy count, kill count.
- **Boss bar:** appears at the top with the boss's name and health.
- **Level-up:** three selectable cards showing icon, name, effect, and current→next level.
- **Pause / Game-over:** resume/quit; end screen shows survival time, level, kills, wave, and a "new record" badge.

## 9. Architecture

Clean separation between a reusable **`core/`** engine layer (`Input`, `Camera`, `Audio`) and the **`game/`** domain (entities, systems, config, orchestrator). `Game.ts` owns a small state machine (`menu → playing → levelup/paused → gameover`) and a fixed render/update pipeline driven by `requestAnimationFrame` with a clamped delta-time. All tunables live in `config.ts` for fast balancing.

## 10. Future extensions

- Evolved / combined weapons, secondary abilities, and passive relics.
- More boss patterns and telegraphed attacks.
- Meta-progression (persistent unlocks between runs).
- Mobile touch controls and a virtual joystick.
- Leaderboards and seeded daily runs.
