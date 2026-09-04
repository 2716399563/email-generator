import { rand, TAU } from "../math";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

/** Lightweight pooled-ish particle system for explosions, sparks, trails. */
export class ParticleSystem {
  private particles: Particle[] = [];

  burst(x: number, y: number, color: string, count: number, speed = 220, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = rand(speed * 0.3, speed);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.3, 0.7),
        maxLife: 0.7,
        size: rand(size * 0.6, size * 1.6),
        color,
      });
    }
  }

  spark(x: number, y: number, dirAngle: number, color: string) {
    for (let i = 0; i < 4; i++) {
      const a = dirAngle + rand(-0.5, 0.5);
      const s = rand(60, 200);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.15, 0.35),
        maxLife: 0.35,
        size: rand(1.5, 3),
        color,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
  }

  render(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - ox, p.y - oy, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  get count(): number {
    return this.particles.length;
  }
}
