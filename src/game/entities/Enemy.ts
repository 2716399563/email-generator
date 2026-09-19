import type { EnemyKind } from "../types";
import { angleTo, dist } from "../math";

interface EnemyArchetype {
  radius: number;
  baseHp: number;
  speed: number;
  touchDamage: number;
  xp: number;
  color: string;
  ranged?: boolean;
  fireInterval?: number;
  projectileSpeed?: number;
  projectileDamage?: number;
}

export const ARCHETYPES: Record<EnemyKind, EnemyArchetype> = {
  grunt: { radius: 15, baseHp: 30, speed: 92, touchDamage: 10, xp: 1, color: "#ff7a8a" },
  swarmer: { radius: 10, baseHp: 14, speed: 168, touchDamage: 7, xp: 1, color: "#ffb347" },
  brute: { radius: 30, baseHp: 160, speed: 58, touchDamage: 22, xp: 4, color: "#c46bff" },
  shooter: {
    radius: 16,
    baseHp: 46,
    speed: 74,
    touchDamage: 9,
    xp: 3,
    color: "#4de0c0",
    ranged: true,
    fireInterval: 2.2,
    projectileSpeed: 260,
    projectileDamage: 12,
  },
  boss: {
    radius: 56,
    baseHp: 2600,
    speed: 66,
    touchDamage: 34,
    xp: 60,
    color: "#ff4060",
    ranged: true,
    fireInterval: 1.4,
    projectileSpeed: 300,
    projectileDamage: 18,
  },
};

let nextId = 1;

export class Enemy {
  id = nextId++;
  kind: EnemyKind;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  touchDamage: number;
  xp: number;
  color: string;
  ranged: boolean;
  fireInterval: number;
  fireTimer: number;
  projectileSpeed: number;
  projectileDamage: number;
  hitFlash = 0;
  dead = false;
  /** Cosmetic wobble phase so a crowd doesn't move in lockstep. */
  phase = Math.random() * Math.PI * 2;

  constructor(kind: EnemyKind, x: number, y: number, hpMult: number, dmgMult: number) {
    const a = ARCHETYPES[kind];
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.radius = a.radius;
    this.maxHp = a.baseHp * hpMult;
    this.hp = this.maxHp;
    this.speed = a.speed;
    this.touchDamage = a.touchDamage * dmgMult;
    this.xp = a.xp;
    this.color = a.color;
    this.ranged = a.ranged ?? false;
    this.fireInterval = a.fireInterval ?? 0;
    this.fireTimer = this.fireInterval * (0.4 + Math.random() * 0.6);
    this.projectileSpeed = a.projectileSpeed ?? 0;
    this.projectileDamage = (a.projectileDamage ?? 0) * dmgMult;
  }

  /**
   * Moves toward the player. Ranged enemies keep a preferred stand-off
   * distance. Returns a firing solution when a ranged enemy wants to shoot.
   */
  update(
    dt: number,
    px: number,
    py: number,
    time: number,
  ): { fireAngle: number } | null {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    const d = dist(this.x, this.y, px, py);
    const ang = angleTo(this.x, this.y, px, py);

    let move = 1;
    const standOff = 320;
    if (this.ranged && d < standOff) move = -0.5; // back away a bit

    // Slight sinusoidal wobble for organic motion.
    const wobble = Math.sin(time * 3 + this.phase) * 0.25;
    const mvAng = ang + wobble;
    this.x += Math.cos(mvAng) * this.speed * move * dt;
    this.y += Math.sin(mvAng) * this.speed * move * dt;

    if (this.ranged) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && d < 640) {
        this.fireTimer = this.fireInterval;
        return { fireAngle: ang };
      }
    }
    return null;
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    this.hitFlash = 0.09;
    if (this.hp <= 0) this.dead = true;
  }
}
