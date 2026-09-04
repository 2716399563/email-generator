interface FloatText {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}

/** Damage numbers and pickup labels that drift upward and fade out. */
export class FloatingTextSystem {
  private items: FloatText[] = [];

  add(x: number, y: number, text: string, color: string, size = 16) {
    this.items.push({ x, y, vy: -46, life: 0.8, maxLife: 0.8, text, color, size });
  }

  update(dt: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const t = this.items[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= 0.94;
      if (t.life <= 0) this.items.splice(i, 1);
    }
  }

  render(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "700 16px 'Segoe UI', system-ui, sans-serif";
    for (const t of this.items) {
      ctx.globalAlpha = Math.min(1, t.life / t.maxLife);
      ctx.font = `700 ${t.size}px 'Segoe UI', system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x - ox, t.y - oy);
    }
    ctx.restore();
  }
}
