import { dist } from "../math";

export class XPGem {
  x: number;
  y: number;
  value: number;
  radius: number;
  dead = false;
  private attracted = false;

  constructor(x: number, y: number, value: number) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = value >= 5 ? 8 : 5;
  }

  /** Flies toward the player once within magnet range; collected on contact. */
  update(dt: number, px: number, py: number, magnet: number, playerRadius: number): boolean {
    const d = dist(this.x, this.y, px, py);
    if (this.attracted || d < magnet) {
      this.attracted = true;
      const speed = 520;
      const dx = px - this.x;
      const dy = py - this.y;
      const len = Math.hypot(dx, dy) || 1;
      this.x += (dx / len) * speed * dt;
      this.y += (dy / len) * speed * dt;
    }
    if (d < playerRadius + this.radius) {
      this.dead = true;
      return true;
    }
    return false;
  }
}

export class HealthPack {
  x: number;
  y: number;
  radius = 12;
  amount: number;
  life = 12;
  dead = false;

  constructor(x: number, y: number, amount: number) {
    this.x = x;
    this.y = y;
    this.amount = amount;
  }

  update(dt: number, px: number, py: number, playerRadius: number): boolean {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
    if (dist(this.x, this.y, px, py) < playerRadius + this.radius) {
      this.dead = true;
      return true;
    }
    return false;
  }
}
