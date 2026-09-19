/**
 * Central tuning constants for 星潮幸存者 (Star Tide Survivors).
 * Keeping gameplay numbers in one place makes balancing straightforward.
 */
export const CONFIG = {
  world: {
    /** Half-size of the playable arena (square, centered on origin). */
    halfSize: 1600,
  },

  player: {
    radius: 16,
    baseSpeed: 240, // px/s
    baseMaxHp: 100,
    baseFireInterval: 0.42, // seconds between shots
    baseProjectileDamage: 22,
    baseProjectileSpeed: 620,
    baseProjectileCount: 1,
    baseProjectilePierce: 0,
    baseProjectileRange: 620, // px before a bullet expires
    baseCritChance: 0.05,
    baseCritMult: 2.0,
    baseMagnet: 90, // XP pickup radius
    baseRegen: 0, // hp/s
    invulnAfterHit: 0.6, // seconds of i-frames after taking damage
    dashSpeed: 900,
    dashDuration: 0.16,
    dashCooldown: 1.6,
  },

  xp: {
    /** XP required for level N is base * growth^(N-1), rounded. */
    base: 5,
    growth: 1.32,
    gemValue: 1,
    bigGemValue: 5,
  },

  spawner: {
    startInterval: 1.5, // seconds between spawns at t=0
    minInterval: 0.28,
    // Interval shrinks and enemy stats grow with elapsed minutes.
    intervalDecayPerMin: 0.28,
    hpScalePerMin: 0.55, // +55% enemy hp per minute
    dmgScalePerMin: 0.22,
    batchGrowthPerMin: 0.9,
    bossEverySeconds: 60,
    maxEnemies: 420,
  },

  render: {
    hitFlash: 0.08,
    shakeDecay: 6,
  },
} as const;

export type Config = typeof CONFIG;
