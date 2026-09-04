import { CONFIG } from "../config";
import { Enemy } from "../entities/Enemy";
import type { EnemyKind } from "../types";
import { TAU, clamp, chance, randInt } from "../math";

/**
 * Time-driven enemy director. Spawn cadence tightens and enemy stats grow
 * as the run progresses; bosses appear on a fixed cadence.
 */
export class Spawner {
  private spawnTimer = 0;
  private bossTimer = CONFIG.spawner.bossEverySeconds;
  bossesSpawned = 0;

  reset() {
    this.spawnTimer = 1;
    this.bossTimer = CONFIG.spawner.bossEverySeconds;
    this.bossesSpawned = 0;
  }

  private hpMult(minutes: number): number {
    return 1 + minutes * CONFIG.spawner.hpScalePerMin;
  }
  private dmgMult(minutes: number): number {
    return 1 + minutes * CONFIG.spawner.dmgScalePerMin;
  }

  private interval(minutes: number): number {
    return clamp(
      CONFIG.spawner.startInterval - minutes * CONFIG.spawner.intervalDecayPerMin,
      CONFIG.spawner.minInterval,
      CONFIG.spawner.startInterval,
    );
  }

  private pointOnRing(cx: number, cy: number, r: number): { x: number; y: number } {
    const a = Math.random() * TAU;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  }

  /** Chooses an enemy kind based on how far into the run we are. */
  private rollKind(minutes: number): EnemyKind {
    const r = Math.random();
    if (minutes < 0.5) return r < 0.85 ? "grunt" : "swarmer";
    if (minutes < 1.5) {
      if (r < 0.5) return "grunt";
      if (r < 0.85) return "swarmer";
      return "shooter";
    }
    if (minutes < 3) {
      if (r < 0.35) return "grunt";
      if (r < 0.65) return "swarmer";
      if (r < 0.85) return "shooter";
      return "brute";
    }
    if (r < 0.25) return "grunt";
    if (r < 0.55) return "swarmer";
    if (r < 0.78) return "shooter";
    return "brute";
  }

  update(
    dt: number,
    time: number,
    playerX: number,
    playerY: number,
    enemies: Enemy[],
    onBoss: () => void,
  ) {
    const minutes = time / 60;
    const hp = this.hpMult(minutes);
    const dmg = this.dmgMult(minutes);

    // Regular waves.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && enemies.length < CONFIG.spawner.maxEnemies) {
      this.spawnTimer = this.interval(minutes);
      const batch = 1 + Math.floor(minutes * CONFIG.spawner.batchGrowthPerMin) + randInt(0, 2);
      const ringR = Math.hypot(innerWidthSafe(), innerHeightSafe()) / 2 + 120;
      for (let i = 0; i < batch; i++) {
        const kind = this.rollKind(minutes);
        const p = this.pointOnRing(playerX, playerY, ringR + Math.random() * 160);
        enemies.push(new Enemy(kind, p.x, p.y, hp, dmg));
      }
      // Occasional tight swarm pack for pressure spikes.
      if (minutes > 1 && chance(0.15)) {
        const p = this.pointOnRing(playerX, playerY, ringR);
        for (let i = 0; i < 6; i++) {
          enemies.push(
            new Enemy("swarmer", p.x + randInt(-40, 40), p.y + randInt(-40, 40), hp, dmg),
          );
        }
      }
    }

    // Boss cadence.
    this.bossTimer -= dt;
    if (this.bossTimer <= 0) {
      this.bossTimer = CONFIG.spawner.bossEverySeconds;
      this.bossesSpawned++;
      const ringR = Math.hypot(innerWidthSafe(), innerHeightSafe()) / 2 + 160;
      const p = this.pointOnRing(playerX, playerY, ringR);
      // Bosses get extra scaling per appearance.
      const boss = new Enemy("boss", p.x, p.y, hp * (1 + this.bossesSpawned * 0.4), dmg);
      enemies.push(boss);
      onBoss();
    }
  }

  /** Current wave index shown in the HUD (derived from elapsed time). */
  waveFor(time: number): number {
    return 1 + Math.floor(time / 20);
  }
}

function innerWidthSafe(): number {
  return typeof window !== "undefined" ? window.innerWidth : 1280;
}
function innerHeightSafe(): number {
  return typeof window !== "undefined" ? window.innerHeight : 720;
}
