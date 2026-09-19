/** Mutable, upgrade-driven player stats. Cloned from CONFIG at run start. */
export interface PlayerStats {
  maxHp: number;
  speed: number;
  fireInterval: number;
  projectileDamage: number;
  projectileSpeed: number;
  projectileCount: number;
  projectilePierce: number;
  projectileRange: number;
  critChance: number;
  critMult: number;
  magnet: number;
  regen: number;
}

export type EnemyKind = "grunt" | "swarmer" | "brute" | "shooter" | "boss";

export interface RunStats {
  kills: number;
  level: number;
  timeSurvived: number;
  wave: number;
}
