import { TAU } from "./math";

interface Star {
  x: number;
  y: number;
  z: number; // parallax depth 0.2..1
  size: number;
}

/** Multi-layer parallax starfield that scrolls opposite the camera. */
export class Starfield {
  private stars: Star[] = [];

  constructor(count = 220) {
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        z: 0.2 + Math.random() * 0.8,
        size: Math.random() * 1.8 + 0.4,
      });
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, w: number, h: number) {
    ctx.save();
    for (const s of this.stars) {
      // Wrap stars in a tileable field relative to the parallax-shifted camera.
      const px = mod(s.x - camX * s.z, w + 200) - 100;
      const py = mod(s.y - camY * s.z, h + 200) - 100;
      ctx.globalAlpha = 0.35 + s.z * 0.55;
      ctx.fillStyle = s.z > 0.75 ? "#cfe0ff" : "#5b6aa0";
      ctx.beginPath();
      ctx.arc(px, py, s.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
