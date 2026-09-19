import { CONFIG } from "./config";
import { Input } from "../core/Input";
import { Camera } from "../core/Camera";
import { AudioEngine } from "../core/Audio";
import { UI } from "../ui/UI";
import { Starfield } from "./Starfield";
import { ParticleSystem } from "./systems/Particles";
import { FloatingTextSystem } from "./systems/FloatingText";
import { Spawner } from "./systems/Spawner";
import { UpgradeState, type Upgrade } from "./upgrades";
import { Player } from "./entities/Player";
import { Enemy } from "./entities/Enemy";
import { Projectile, EnemyProjectile } from "./entities/Projectile";
import { XPGem, HealthPack } from "./entities/Pickup";
import { angleTo, chance, circlesOverlap, dist2, rand, TAU } from "./math";

type State = "menu" | "playing" | "levelup" | "paused" | "gameover";

const HS_KEY = "star-tide-survivors:besttime";

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: Input;
  private camera = new Camera();
  private audio = new AudioEngine();
  private ui: UI;
  private starfield = new Starfield();
  private particles = new ParticleSystem();
  private floaters = new FloatingTextSystem();
  private spawner = new Spawner();

  private player = new Player();
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private enemyProjectiles: EnemyProjectile[] = [];
  private gems: XPGem[] = [];
  private packs: HealthPack[] = [];
  private upgrades = new UpgradeState();
  private boss: Enemy | null = null;

  private state: State = "menu";
  private time = 0;
  private kills = 0;
  private level = 1;
  private xp = 0;
  private xpForNext: number = CONFIG.xp.base;
  private pendingLevels = 0;
  private highScore = 0;
  private lastTs = 0;
  private dpr = 1;
  private bossBanner = 0;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.input = new Input(canvas);
    this.ui = new UI(uiRoot);
    this.highScore = Number(localStorage.getItem(HS_KEY) ?? 0);

    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.ui.showMenu(this.highScore, () => this.startRun());

    requestAnimationFrame((t) => {
      this.lastTs = t;
      this.loop(t);
    });
  }

  private resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.camera.resize(w, h);
  }

  private startRun() {
    this.audio.resume();
    this.player = new Player();
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.gems = [];
    this.packs = [];
    this.upgrades = new UpgradeState();
    this.boss = null;
    this.spawner.reset();
    this.time = 0;
    this.kills = 0;
    this.level = 1;
    this.xp = 0;
    this.xpForNext = CONFIG.xp.base;
    this.pendingLevels = 0;
    this.camera.x = 0;
    this.camera.y = 0;
    this.state = "playing";
    this.ui.clearOverlay();
    this.ui.showHud(true);
  }

  private xpNeededFor(level: number): number {
    return Math.round(CONFIG.xp.base * Math.pow(CONFIG.xp.growth, level - 1));
  }

  // ------------------------------------------------------------------ loop
  private loop = (ts: number) => {
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
    this.lastTs = ts;
    this.handleGlobalKeys();
    if (this.state === "playing") this.update(dt);
    this.render(dt);
    this.input.endFrame();
    requestAnimationFrame(this.loop);
  };

  private handleGlobalKeys() {
    if (this.input.justPressed("m")) this.audio.toggleMute();
    if (this.input.justPressed("p", "escape")) {
      if (this.state === "playing") {
        this.state = "paused";
        this.ui.showPause(
          () => {
            this.state = "playing";
            this.ui.clearOverlay();
          },
          () => this.toMenu(),
        );
      } else if (this.state === "paused") {
        this.state = "playing";
        this.ui.clearOverlay();
      }
    }
  }

  private toMenu() {
    this.state = "menu";
    this.ui.clearOverlay();
    this.ui.showMenu(this.highScore, () => this.startRun());
  }

  // ---------------------------------------------------------------- update
  private update(dt: number) {
    this.time += dt;
    const mv = this.input.moveVector();

    if (this.input.justPressed(" ")) {
      if (this.player.tryDash(mv.x, mv.y)) {
        this.audio.play("dash");
        this.particles.burst(this.player.x, this.player.y, "#4dd0ff", 14, 260, 3);
      }
    }

    this.player.update(dt, mv.x, mv.y);

    // Aim at nearest enemy; the ship nose points that way.
    const target = this.nearestEnemy(this.player.x, this.player.y);
    if (target) {
      this.player.facing = angleTo(this.player.x, this.player.y, target.x, target.y);
    } else if (mv.x !== 0 || mv.y !== 0) {
      this.player.facing = Math.atan2(mv.y, mv.x);
    }

    this.autoFire(dt, target);
    this.updateEnemies(dt);
    this.updateProjectiles();
    this.updatePickups(dt);
    this.particles.update(dt);
    this.floaters.update(dt);

    this.camera.follow(this.player.x, this.player.y, dt);
    if (this.bossBanner > 0) this.bossBanner -= dt;

    // Boss bar sync.
    if (this.boss) {
      if (this.boss.dead) {
        this.boss = null;
        this.ui.clearBoss();
      } else {
        this.ui.setBoss("首领 · THE WARDEN", this.boss.hp / this.boss.maxHp);
      }
    }

    this.ui.updateHud({
      hp: this.player.hp,
      maxHp: this.player.stats.maxHp,
      xp: this.xp,
      xpForNext: this.xpForNext,
      level: this.level,
      time: this.time,
      kills: this.kills,
      wave: this.spawner.waveFor(this.time),
      dashReady: this.player.dashCooldown <= 0,
      dashFrac: 1 - this.player.dashCooldown / CONFIG.player.dashCooldown,
      enemies: this.enemies.length,
    });

    if (this.player.hp <= 0) this.gameOver();
    if (this.pendingLevels > 0) this.openLevelUp();
  }

  private nearestEnemy(x: number, y: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      const d = dist2(x, y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private autoFire(_dt: number, target: Enemy | null) {
    if (!target) return;
    if (this.player.fireTimer > 0) return;
    this.player.fireTimer = this.player.stats.fireInterval;

    const s = this.player.stats;
    const baseAngle = angleTo(this.player.x, this.player.y, target.x, target.y);
    const count = s.projectileCount;
    const spread = 0.16; // radians between multishot bullets
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spread;
      const a = baseAngle + offset;
      const isCrit = chance(s.critChance);
      const dmg = s.projectileDamage * (isCrit ? s.critMult : 1);
      this.projectiles.push(
        new Projectile(
          this.player.x + Math.cos(a) * this.player.radius,
          this.player.y + Math.sin(a) * this.player.radius,
          Math.cos(a) * s.projectileSpeed,
          Math.sin(a) * s.projectileSpeed,
          dmg,
          s.projectilePierce,
          s.projectileRange,
          isCrit,
        ),
      );
    }
    this.audio.play("shoot");
    this.particles.spark(
      this.player.x + Math.cos(baseAngle) * this.player.radius,
      this.player.y + Math.sin(baseAngle) * this.player.radius,
      baseAngle,
      "#bfe9ff",
    );
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      const shot = e.update(dt, this.player.x, this.player.y, this.time);
      if (shot) {
        const a = shot.fireAngle;
        this.enemyProjectiles.push(
          new EnemyProjectile(
            e.x + Math.cos(a) * e.radius,
            e.y + Math.sin(a) * e.radius,
            Math.cos(a) * e.projectileSpeed,
            Math.sin(a) * e.projectileSpeed,
            e.projectileDamage,
          ),
        );
        // Bosses fire a small spread.
        if (e.kind === "boss") {
          for (const da of [-0.3, 0.3]) {
            this.enemyProjectiles.push(
              new EnemyProjectile(
                e.x,
                e.y,
                Math.cos(a + da) * e.projectileSpeed,
                Math.sin(a + da) * e.projectileSpeed,
                e.projectileDamage,
              ),
            );
          }
        }
      }

      // Touch damage to player.
      if (circlesOverlap(e.x, e.y, e.radius, this.player.x, this.player.y, this.player.radius)) {
        if (this.player.takeDamage(e.touchDamage)) {
          this.audio.play("hurt");
          this.camera.addShake(0.5);
          this.particles.burst(this.player.x, this.player.y, "#ff5470", 12);
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    this.spawner.update(dt, this.time, this.player.x, this.player.y, this.enemies, () => {
      this.audio.play("boss");
      this.camera.addShake(0.8);
      this.bossBanner = 2.2;
      this.boss = this.enemies[this.enemies.length - 1];
    });
  }

  private updateProjectiles() {
    // Player bullets vs enemies.
    for (const p of this.projectiles) {
      p.update(1 / 60);
      for (const e of this.enemies) {
        if (e.dead || p.hitSet.has(e.id)) continue;
        if (circlesOverlap(p.x, p.y, p.radius, e.x, e.y, e.radius)) {
          e.takeDamage(p.damage);
          p.hitSet.add(e.id);
          this.audio.play("hit");
          this.floaters.add(
            e.x,
            e.y - e.radius,
            String(Math.round(p.damage)),
            p.isCrit ? "#ffd54a" : "#ffffff",
            p.isCrit ? 22 : 15,
          );
          this.particles.spark(p.x, p.y, Math.atan2(p.vy, p.vx), e.color);
          if (e.dead) this.onEnemyKilled(e);
          if (p.hitSet.size > p.pierce) {
            p.dead = true;
            break;
          }
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    // Enemy bullets vs player.
    for (const b of this.enemyProjectiles) {
      b.update(1 / 60);
      if (circlesOverlap(b.x, b.y, b.radius, this.player.x, this.player.y, this.player.radius)) {
        b.dead = true;
        if (this.player.takeDamage(b.damage)) {
          this.audio.play("hurt");
          this.camera.addShake(0.4);
          this.particles.burst(this.player.x, this.player.y, "#ff5470", 8);
        }
      }
    }
    this.enemyProjectiles = this.enemyProjectiles.filter((b) => !b.dead);
  }

  private onEnemyKilled(e: Enemy) {
    this.kills++;
    this.audio.play("explode");
    this.camera.addShake(e.kind === "boss" ? 1.2 : 0.18);
    this.particles.burst(e.x, e.y, e.color, e.kind === "boss" ? 60 : 16, e.kind === "boss" ? 380 : 240, e.kind === "boss" ? 5 : 3);

    // Drop XP — bigger enemies drop a larger gem.
    const big = e.xp >= 4;
    const gemVal = big ? CONFIG.xp.bigGemValue : CONFIG.xp.gemValue;
    const drops = Math.max(1, Math.round(e.xp / gemVal));
    for (let i = 0; i < drops; i++) {
      this.gems.push(new XPGem(e.x + rand(-14, 14), e.y + rand(-14, 14), gemVal));
    }
    // Occasional health pack, guaranteed from bosses.
    if (e.kind === "boss" || chance(0.03)) {
      this.packs.push(new HealthPack(e.x, e.y, e.kind === "boss" ? 45 : 20));
    }
  }

  private updatePickups(dt: number) {
    for (const g of this.gems) {
      if (g.update(dt, this.player.x, this.player.y, this.player.stats.magnet, this.player.radius)) {
        this.gainXp(g.value);
        this.audio.play("pickup");
      }
    }
    this.gems = this.gems.filter((g) => !g.dead);

    for (const pk of this.packs) {
      if (pk.update(dt, this.player.x, this.player.y, this.player.radius)) {
        this.player.heal(pk.amount);
        this.floaters.add(this.player.x, this.player.y - 24, `+${pk.amount}`, "#7dffa0", 18);
        this.audio.play("pickup");
      }
    }
    this.packs = this.packs.filter((pk) => !pk.dead);
  }

  private gainXp(amount: number) {
    this.xp += amount;
    while (this.xp >= this.xpForNext) {
      this.xp -= this.xpForNext;
      this.level++;
      this.pendingLevels++;
      this.xpForNext = this.xpNeededFor(this.level);
    }
  }

  private openLevelUp() {
    this.state = "levelup";
    this.audio.play("levelup");
    const choices = this.upgrades.roll(3);
    this.ui.showLevelUp(
      choices,
      (id) => this.upgrades.levelOf(id),
      (u: Upgrade) => this.pickUpgrade(u),
    );
  }

  private pickUpgrade(u: Upgrade) {
    if (u.id === "__heal") {
      this.player.heal(30);
    } else {
      const before = this.player.stats.maxHp;
      this.upgrades.take(u, this.player.stats);
      // maxhp upgrade also tops up the gained amount.
      if (u.id === "maxhp") this.player.heal(this.player.stats.maxHp - before);
    }
    this.pendingLevels--;
    this.ui.clearOverlay();
    if (this.pendingLevels > 0) {
      this.openLevelUp();
    } else {
      this.state = "playing";
    }
  }

  private gameOver() {
    this.state = "gameover";
    this.camera.addShake(1.5);
    this.particles.burst(this.player.x, this.player.y, "#4dd0ff", 80, 420, 5);
    const isBest = this.time > this.highScore;
    if (isBest) {
      this.highScore = this.time;
      localStorage.setItem(HS_KEY, String(this.highScore));
    }
    this.ui.showGameOver(
      { kills: this.kills, level: this.level, timeSurvived: this.time, wave: this.spawner.waveFor(this.time) },
      this.highScore,
      isBest,
      () => this.startRun(),
      () => this.toMenu(),
    );
  }

  // ---------------------------------------------------------------- render
  private render(dt: number) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    this.starfield.render(ctx, this.camera.x, this.camera.y, this.camera.viewW, this.camera.viewH);

    const ox = this.camera.originX;
    const oy = this.camera.originY;

    this.drawArena(ctx, ox, oy);

    if (this.state !== "menu") {
      for (const g of this.gems) this.drawGem(ctx, g, ox, oy);
      for (const pk of this.packs) this.drawPack(ctx, pk, ox, oy);
      for (const b of this.enemyProjectiles) this.drawEnemyBullet(ctx, b, ox, oy);
      for (const e of this.enemies) this.drawEnemy(ctx, e, ox, oy);
      for (const p of this.projectiles) this.drawBullet(ctx, p, ox, oy);
      this.particles.render(ctx, ox, oy);
      if (this.state !== "gameover") this.drawPlayer(ctx, ox, oy);
      this.floaters.render(ctx, ox, oy);
      this.drawBossBanner(ctx);
    }
    void dt;
  }

  private drawArena(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
    const b = CONFIG.world.halfSize;
    ctx.save();
    ctx.strokeStyle = "rgba(120,150,255,0.25)";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 12]);
    ctx.strokeRect(-b - ox, -b - oy, b * 2, b * 2);
    // faint grid
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(90,110,190,0.06)";
    ctx.lineWidth = 1;
    const step = 160;
    for (let gx = -b; gx <= b; gx += step) {
      ctx.beginPath();
      ctx.moveTo(gx - ox, -b - oy);
      ctx.lineTo(gx - ox, b - oy);
      ctx.stroke();
    }
    for (let gy = -b; gy <= b; gy += step) {
      ctx.beginPath();
      ctx.moveTo(-b - ox, gy - oy);
      ctx.lineTo(b - ox, gy - oy);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
    const p = this.player;
    const x = p.x - ox;
    const y = p.y - oy;
    ctx.save();
    // Dash / invuln glow.
    if (p.isDashing) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#4dd0ff";
      ctx.beginPath();
      ctx.arc(x, y, p.radius + 12, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.translate(x, y);
    ctx.rotate(p.facing);

    // Glow.
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, p.radius + 14);
    grad.addColorStop(0, "rgba(120,220,255,0.55)");
    grad.addColorStop(1, "rgba(120,220,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 14, 0, TAU);
    ctx.fill();

    // Ship body (triangle).
    const flash = p.hitFlash > 0 || (p.invulnTimer > 0 && Math.floor(this.time * 20) % 2 === 0);
    ctx.fillStyle = flash ? "#ffffff" : "#eaf6ff";
    ctx.strokeStyle = "#4dd0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.radius + 4, 0);
    ctx.lineTo(-p.radius * 0.8, -p.radius * 0.8);
    ctx.lineTo(-p.radius * 0.4, 0);
    ctx.lineTo(-p.radius * 0.8, p.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Engine flame.
    ctx.fillStyle = "rgba(255,180,80," + (0.5 + Math.random() * 0.4) + ")";
    ctx.beginPath();
    ctx.moveTo(-p.radius * 0.4, 0);
    ctx.lineTo(-p.radius * 0.9 - Math.random() * 10, -4);
    ctx.lineTo(-p.radius * 0.9 - Math.random() * 10, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, ox: number, oy: number) {
    const x = e.x - ox;
    const y = e.y - oy;
    ctx.save();
    // Glow.
    const grad = ctx.createRadialGradient(x, y, 1, x, y, e.radius + 8);
    grad.addColorStop(0, e.color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, e.radius + 8, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : e.color;
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;

    if (e.kind === "boss") {
      // Rotating spiky core.
      this.drawStar(ctx, x, y, e.radius, e.radius * 0.6, 8, this.time * 0.6);
    } else if (e.kind === "brute") {
      this.drawStar(ctx, x, y, e.radius, e.radius * 0.7, 6, this.time * 0.4);
    } else if (e.kind === "shooter") {
      // Diamond.
      ctx.beginPath();
      ctx.moveTo(x, y - e.radius);
      ctx.lineTo(x + e.radius, y);
      ctx.lineTo(x, y + e.radius);
      ctx.lineTo(x - e.radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, e.radius, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }

    // Health ring for tanky enemies.
    if ((e.kind === "brute" || e.kind === "boss") && e.hp < e.maxHp) {
      ctx.strokeStyle = "#ff5470";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, e.radius + 6, -Math.PI / 2, -Math.PI / 2 + TAU * (e.hp / e.maxHp));
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outer: number,
    inner: number,
    points: number,
    rot: number,
  ) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = rot + (i / (points * 2)) * TAU;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawBullet(ctx: CanvasRenderingContext2D, p: Projectile, ox: number, oy: number) {
    const x = p.x - ox;
    const y = p.y - oy;
    ctx.save();
    ctx.shadowColor = p.isCrit ? "#ffd54a" : "#4dd0ff";
    ctx.shadowBlur = 12;
    ctx.fillStyle = p.isCrit ? "#ffe58a" : "#dff6ff";
    ctx.beginPath();
    ctx.arc(x, y, p.radius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawEnemyBullet(ctx: CanvasRenderingContext2D, b: EnemyProjectile, ox: number, oy: number) {
    const x = b.x - ox;
    const y = b.y - oy;
    ctx.save();
    ctx.shadowColor = "#ff5470";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ff8aa0";
    ctx.beginPath();
    ctx.arc(x, y, b.radius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawGem(ctx: CanvasRenderingContext2D, g: XPGem, ox: number, oy: number) {
    const x = g.x - ox;
    const y = g.y - oy;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.time * 2);
    ctx.shadowColor = g.value >= 5 ? "#b96bff" : "#4dff9e";
    ctx.shadowBlur = 8;
    ctx.fillStyle = g.value >= 5 ? "#c98bff" : "#7dffb0";
    const r = g.radius;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawPack(ctx: CanvasRenderingContext2D, pk: HealthPack, ox: number, oy: number) {
    const x = pk.x - ox;
    const y = pk.y - oy;
    ctx.save();
    // Blink when about to expire.
    if (pk.life < 3 && Math.floor(pk.life * 6) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.shadowColor = "#7dffa0";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#7dffa0";
    ctx.fillRect(x - 3, y - 9, 6, 18);
    ctx.fillRect(x - 9, y - 3, 18, 6);
    ctx.restore();
  }

  private drawBossBanner(ctx: CanvasRenderingContext2D) {
    if (this.bossBanner <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.bossBanner);
    ctx.textAlign = "center";
    ctx.font = "800 46px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#ff5470";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 18;
    ctx.fillText("⚠ 首领降临 ⚠", this.camera.viewW / 2, this.camera.viewH * 0.38);
    ctx.restore();
  }
}
