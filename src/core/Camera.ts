import { lerp } from "../game/math";
import { CONFIG } from "../game/config";

/**
 * Follows a target in world space and applies a decaying screen shake.
 * Provides world<->screen conversion for input mapping.
 */
export class Camera {
  x = 0;
  y = 0;
  viewW = 0;
  viewH = 0;
  private shake = 0;
  private shakeX = 0;
  private shakeY = 0;

  resize(w: number, h: number) {
    this.viewW = w;
    this.viewH = h;
  }

  follow(tx: number, ty: number, dt: number) {
    // Smoothed follow feels better than hard-locking to the player.
    const t = 1 - Math.pow(0.0025, dt);
    this.x = lerp(this.x, tx, t);
    this.y = lerp(this.y, ty, t);

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * CONFIG.render.shakeDecay);
      const mag = this.shake * this.shake * 16;
      this.shakeX = (Math.random() * 2 - 1) * mag;
      this.shakeY = (Math.random() * 2 - 1) * mag;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  addShake(amount: number) {
    this.shake = Math.min(1.5, this.shake + amount);
  }

  /** Top-left world coordinate currently visible, including shake. */
  get originX(): number {
    return this.x - this.viewW / 2 + this.shakeX;
  }
  get originY(): number {
    return this.y - this.viewH / 2 + this.shakeY;
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: sx + this.originX, y: sy + this.originY };
  }
}
