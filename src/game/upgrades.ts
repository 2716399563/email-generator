import type { PlayerStats } from "./types";
import { pick } from "./math";

export interface Upgrade {
  id: string;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  /** Applies one level of the upgrade to the given stats. */
  apply: (s: PlayerStats) => void;
}

export const UPGRADES: Upgrade[] = [
  {
    id: "damage",
    name: "高能弹头",
    icon: "💥",
    description: "子弹伤害 +25%",
    maxLevel: 8,
    apply: (s) => (s.projectileDamage *= 1.25),
  },
  {
    id: "firerate",
    name: "急速连射",
    icon: "⚡",
    description: "射速 +18%",
    maxLevel: 8,
    apply: (s) => (s.fireInterval *= 0.82),
  },
  {
    id: "multishot",
    name: "多重射击",
    icon: "🔱",
    description: "额外发射 +1 发子弹",
    maxLevel: 6,
    apply: (s) => (s.projectileCount += 1),
  },
  {
    id: "pierce",
    name: "穿透弹",
    icon: "🎯",
    description: "子弹可多穿透 1 个敌人",
    maxLevel: 5,
    apply: (s) => (s.projectilePierce += 1),
  },
  {
    id: "speed",
    name: "推进强化",
    icon: "🚀",
    description: "移动速度 +12%",
    maxLevel: 6,
    apply: (s) => (s.speed *= 1.12),
  },
  {
    id: "maxhp",
    name: "护盾扩容",
    icon: "🛡️",
    description: "最大生命 +25 并立即回满该量",
    maxLevel: 6,
    apply: (s) => (s.maxHp += 25),
  },
  {
    id: "regen",
    name: "纳米修复",
    icon: "❤️‍🩹",
    description: "每秒回复生命 +1.5",
    maxLevel: 5,
    apply: (s) => (s.regen += 1.5),
  },
  {
    id: "crit",
    name: "精准弱点",
    icon: "🎲",
    description: "暴击率 +7%",
    maxLevel: 6,
    apply: (s) => (s.critChance += 0.07),
  },
  {
    id: "range",
    name: "超远射程",
    icon: "🔭",
    description: "子弹射程 +20% 且弹速 +10%",
    maxLevel: 5,
    apply: (s) => {
      s.projectileRange *= 1.2;
      s.projectileSpeed *= 1.1;
    },
  },
  {
    id: "magnet",
    name: "引力线圈",
    icon: "🧲",
    description: "经验拾取范围 +45%",
    maxLevel: 5,
    apply: (s) => (s.magnet *= 1.45),
  },
];

/** Tracks how many times each upgrade has been taken. */
export class UpgradeState {
  levels: Record<string, number> = {};

  levelOf(id: string): number {
    return this.levels[id] ?? 0;
  }

  take(u: Upgrade, stats: PlayerStats) {
    u.apply(stats);
    this.levels[u.id] = this.levelOf(u.id) + 1;
    // maxhp upgrade should also top the player up; handled by caller via return.
  }

  /** Returns up to `n` distinct, non-maxed upgrade choices. */
  roll(n = 3): Upgrade[] {
    const available = UPGRADES.filter((u) => this.levelOf(u.id) < u.maxLevel);
    const chosen: Upgrade[] = [];
    const pool = [...available];
    while (chosen.length < n && pool.length > 0) {
      const u = pick(pool);
      chosen.push(u);
      pool.splice(pool.indexOf(u), 1);
    }
    return chosen;
  }
}
