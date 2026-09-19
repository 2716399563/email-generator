import { CONFIG } from "../config";
import type { PlayerStats } from "../types";
import { clamp } from "../math";

export class Player {
  x = 0;
  y = 0;
  radius = CONFIG.player.radius;
  hp: number;
  stats: PlayerStats;

  fireTimer = 0;
  invulnTimer = 0;
  hitFlash = 0;

  // Dash state.
  dashTimer = 0;
  dashCooldown = 0;
  dashDirX = 1;
  dashDirY = 0;

  facing = 0; // radians, for rendering the ship nose

  constructor() {
    this.stats = {
      maxHp: CONFIG.player.baseMaxHp,
      speed: CONFIG.player.baseSpeed,
      fireInterval: CONFIG.player.baseFireInterval,
      projectileDamage: CONFIG.player.baseProjectileDamage,
      projectileSpeed: CONFIG.player.baseProjectileSpeed,
      projectileCount: CONFIG.player.baseProjectileCount,
      projectilePierce: CONFIG.player.baseProjectilePierce,
      projectileRange: CONFIG.player.baseProjectileRange,
      critChance: CONFIG.player.baseCritChance,
      critMult: CONFIG.player.baseCritMult,
      magnet: CONFIG.player.baseMagnet,
      regen: CONFIG.player.baseRegen,
    };
    this.hp = this.stats.maxHp;
  }

  get isDashing(): boolean {
    return this.dashTimer > 0;
  }

  /** Returns true if the hit connected (i.e. not blocked by i-frames/dash). */
  takeDamage(amount: number): boolean {
    if (this.invulnTimer > 0 || this.isDashing) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnTimer = CONFIG.player.invulnAfterHit;
    this.hitFlash = 0.15;
    return true;
  }

  heal(amount: number) {
    this.hp = clamp(this.hp + amount, 0, this.stats.maxHp);
  }

  tryDash(dirX: number, dirY: number) {
    if (this.dashCooldown > 0) return false;
    this.dashTimer = CONFIG.player.dashDuration;
    this.dashCooldown = CONFIG.player.dashCooldown;
    // Dash toward movement input, else toward facing direction.
    if (dirX === 0 && dirY === 0) {
      this.dashDirX = Math.cos(this.facing);
      this.dashDirY = Math.sin(this.facing);
    } else {
      this.dashDirX = dirX;
      this.dashDirY = dirY;
    }
    return true;
  }

  update(dt: number, moveX: number, moveY: number) {
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (this.stats.regen > 0) this.heal(this.stats.regen * dt);

    let vx: number;
    let vy: number;
    if (this.isDashing) {
      this.dashTimer -= dt;
      vx = this.dashDirX * CONFIG.player.dashSpeed;
      vy = this.dashDirY * CONFIG.player.dashSpeed;
    } else {
      vx = moveX * this.stats.speed;
      vy = moveY * this.stats.speed;
    }

    this.x += vx * dt;
    this.y += vy * dt;

    const bound = CONFIG.world.halfSize;
    this.x = clamp(this.x, -bound, bound);
    this.y = clamp(this.y, -bound, bound);

    if (this.fireTimer > 0) this.fireTimer -= dt;
  }
}
