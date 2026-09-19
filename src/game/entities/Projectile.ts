export class Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  pierce: number;
  isCrit: boolean;
  traveled = 0;
  maxRange: number;
  dead = false;
  /** Enemy ids already hit, so pierce doesn't double-hit the same target. */
  hitSet = new Set<number>();

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    pierce: number,
    maxRange: number,
    isCrit: boolean,
    radius = 6,
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.pierce = pierce;
    this.maxRange = maxRange;
    this.isCrit = isCrit;
    this.radius = radius;
  }

  update(dt: number) {
    const dx = this.vx * dt;
    const dy = this.vy * dt;
    this.x += dx;
    this.y += dy;
    this.traveled += Math.hypot(dx, dy);
    if (this.traveled >= this.maxRange) this.dead = true;
  }
}

/** Simple hostile projectile fired by ranged enemies / bosses. */
export class EnemyProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  dead = false;

  constructor(x: number, y: number, vx: number, vy: number, damage: number, life = 4, radius = 8) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.life = life;
    this.radius = radius;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}
