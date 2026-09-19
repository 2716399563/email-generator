import type { Upgrade } from "../game/upgrades";
import type { RunStats } from "../game/types";

export interface HudState {
  hp: number;
  maxHp: number;
  xp: number;
  xpForNext: number;
  level: number;
  time: number;
  kills: number;
  wave: number;
  dashReady: boolean;
  dashFrac: number; // 0..1 cooldown progress
  enemies: number;
}

function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  html?: string,
): HTMLElementTagNameMap[K] => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};

/** Owns all DOM overlays: menu, HUD, level-up, pause and game-over screens. */
export class UI {
  private root: HTMLElement;
  private hud: HTMLElement;
  private overlay: HTMLElement;
  private bossBar: HTMLElement;

  // HUD sub-elements updated every frame.
  private hpFill!: HTMLElement;
  private hpText!: HTMLElement;
  private xpFill!: HTMLElement;
  private levelText!: HTMLElement;
  private timeText!: HTMLElement;
  private killsText!: HTMLElement;
  private waveText!: HTMLElement;
  private dashPip!: HTMLElement;
  private bossFill!: HTMLElement;
  private bossName!: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.hud = el("div");
    this.overlay = el("div");
    this.bossBar = el("div");
    this.buildHud();
    this.root.append(this.bossBar, this.hud, this.overlay);
  }

  private buildHud() {
    this.hud.style.cssText =
      "position:absolute;inset:0;pointer-events:none;font-family:'Segoe UI',system-ui,sans-serif;";
    this.hud.innerHTML = `
      <div style="position:absolute;top:16px;left:16px;display:flex;flex-direction:column;gap:8px;min-width:280px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span id="lvlTxt" style="font-weight:800;color:#4dd0ff;font-size:15px;letter-spacing:1px;">LV 1</span>
          <div style="flex:1;height:12px;background:rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;border:1px solid rgba(120,150,255,.25);">
            <div id="xpFill" style="height:100%;width:0%;background:linear-gradient(90deg,#4dd0ff,#b96bff);transition:width .12s;"></div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:18px;">❤️</span>
          <div style="flex:1;height:18px;background:rgba(255,60,90,.15);border-radius:9px;overflow:hidden;border:1px solid rgba(255,120,140,.35);position:relative;">
            <div id="hpFill" style="height:100%;width:100%;background:linear-gradient(90deg,#ff5470,#ff9aa8);transition:width .12s;"></div>
            <span id="hpTxt" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;text-shadow:0 1px 2px #000;">100 / 100</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#9fb0e8;">
          <span id="dashPip" style="padding:3px 10px;border-radius:6px;background:#1a2148;border:1px solid rgba(120,150,255,.3);">冲刺 ✔</span>
          <span style="opacity:.6">Space</span>
        </div>
      </div>

      <div style="position:absolute;top:16px;right:18px;text-align:right;display:flex;flex-direction:column;gap:4px;">
        <span id="timeTxt" style="font-size:30px;font-weight:800;color:#e8ecff;letter-spacing:2px;text-shadow:0 0 16px rgba(120,150,255,.4);">0:00</span>
        <span id="waveTxt" style="font-size:14px;color:#ffd54a;letter-spacing:1px;">第 1 波</span>
        <span id="killsTxt" style="font-size:14px;color:#9fb0e8;">击杀 0</span>
      </div>`;

    this.hpFill = this.hud.querySelector("#hpFill")!;
    this.hpText = this.hud.querySelector("#hpTxt")!;
    this.xpFill = this.hud.querySelector("#xpFill")!;
    this.levelText = this.hud.querySelector("#lvlTxt")!;
    this.timeText = this.hud.querySelector("#timeTxt")!;
    this.killsText = this.hud.querySelector("#killsTxt")!;
    this.waveText = this.hud.querySelector("#waveTxt")!;
    this.dashPip = this.hud.querySelector("#dashPip")!;

    this.bossBar.style.cssText =
      "position:absolute;top:14px;left:50%;transform:translateX(-50%);width:min(560px,70vw);display:none;flex-direction:column;gap:4px;align-items:center;pointer-events:none;z-index:5;";
    this.bossBar.innerHTML = `
      <span id="bossName" style="font-size:13px;letter-spacing:3px;color:#ff5470;font-weight:700;text-shadow:0 0 10px #000;">首领</span>
      <div style="width:100%;height:14px;background:rgba(255,60,90,.12);border:1px solid rgba(255,80,100,.5);border-radius:8px;overflow:hidden;">
        <div id="bossFill" style="height:100%;width:100%;background:linear-gradient(90deg,#ff4060,#ff8a3c);"></div>
      </div>`;
    this.bossFill = this.bossBar.querySelector("#bossFill")!;
    this.bossName = this.bossBar.querySelector("#bossName")!;
    this.hud.style.display = "none";
  }

  updateHud(s: HudState) {
    const hpPct = Math.max(0, (s.hp / s.maxHp) * 100);
    this.hpFill.style.width = `${hpPct}%`;
    this.hpText.textContent = `${Math.ceil(s.hp)} / ${Math.round(s.maxHp)}`;
    this.xpFill.style.width = `${Math.min(100, (s.xp / s.xpForNext) * 100)}%`;
    this.levelText.textContent = `LV ${s.level}`;
    this.timeText.textContent = fmtTime(s.time);
    this.waveText.textContent = `第 ${s.wave} 波 · 敌 ${s.enemies}`;
    this.killsText.textContent = `击杀 ${s.kills}`;
    if (s.dashReady) {
      this.dashPip.textContent = "冲刺 ✔";
      this.dashPip.style.color = "#4dd0ff";
      this.dashPip.style.opacity = "1";
    } else {
      this.dashPip.textContent = `冲刺 ${Math.ceil((1 - s.dashFrac) * 100) / 100 > 0 ? "" : ""}${Math.ceil(s.dashFrac * 100)}%`;
      this.dashPip.style.color = "#7f8ec2";
      this.dashPip.style.opacity = "0.7";
    }
  }

  setBoss(name: string, hpFrac: number) {
    this.bossBar.style.display = "flex";
    this.bossName.textContent = name;
    this.bossFill.style.width = `${Math.max(0, hpFrac * 100)}%`;
  }
  clearBoss() {
    this.bossBar.style.display = "none";
  }

  showHud(v: boolean) {
    this.hud.style.display = v ? "block" : "none";
  }

  clearOverlay() {
    this.overlay.innerHTML = "";
    this.overlay.className = "";
  }

  showMenu(highScore: number, onStart: () => void) {
    this.showHud(false);
    this.clearBoss();
    this.overlay.className = "overlay";
    this.overlay.innerHTML = `
      <div class="badge">ROGUELITE · 波次生存</div>
      <div class="title">星潮幸存者</div>
      <div class="subtitle">STAR TIDE SURVIVORS<br/>在无尽的星潮中生存，升级你的战舰，击溃周期降临的首领。</div>
      <div class="stat-line">历史最佳生存时间：<b id="hsTime">${fmtTimeStatic(highScore)}</b></div>
    `;
    const btn = el("button", "btn", "开始游戏 ▶");
    btn.onclick = onStart;
    const hint = el(
      "div",
      "hint",
      `移动 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / 方向键 &nbsp;·&nbsp; 冲刺 <kbd>Space</kbd> &nbsp;·&nbsp; 暂停 <kbd>P</kbd> / <kbd>Esc</kbd> &nbsp;·&nbsp; 静音 <kbd>M</kbd><br/>自动瞄准最近的敌人开火 · 拾取经验升级 · 每 60 秒降临首领`,
    );
    this.overlay.append(btn, hint);
  }

  showLevelUp(choices: Upgrade[], levelOf: (id: string) => number, onPick: (u: Upgrade) => void) {
    this.overlay.className = "overlay";
    this.overlay.innerHTML = `<div class="badge">升级！选择一项强化</div>`;
    const cards = el("div", "cards");
    for (const u of choices) {
      const lvl = levelOf(u.id);
      const card = el("div", "card");
      card.innerHTML = `
        <div class="icon">${u.icon}</div>
        <div class="name">${u.name}</div>
        <div class="desc">${u.description}</div>
        <div class="lvl">等级 ${lvl} → ${lvl + 1} / ${u.maxLevel}</div>`;
      card.onclick = () => onPick(u);
      cards.append(card);
    }
    if (choices.length === 0) {
      const card = el("div", "card");
      card.innerHTML = `<div class="icon">✨</div><div class="name">全能</div><div class="desc">所有强化已满级，回复 30 点生命。</div>`;
      card.onclick = () => onPick({ id: "__heal", name: "", icon: "", description: "", maxLevel: 1, apply: () => {} });
      cards.append(card);
    }
    this.overlay.append(cards);
  }

  showPause(onResume: () => void, onQuit: () => void) {
    this.overlay.className = "overlay";
    this.overlay.innerHTML = `<div class="title" style="font-size:56px;">已暂停</div>`;
    const resume = el("button", "btn", "继续 ▶");
    resume.onclick = onResume;
    const quit = el("button", "btn secondary", "返回主菜单");
    quit.onclick = onQuit;
    this.overlay.append(resume, quit);
  }

  showGameOver(stats: RunStats, highScore: number, isNewBest: boolean, onRestart: () => void, onMenu: () => void) {
    this.showHud(false);
    this.clearBoss();
    this.overlay.className = "overlay";
    this.overlay.innerHTML = `
      <div class="title" style="font-size:64px;background:linear-gradient(120deg,#ff5470,#ffd54a);-webkit-background-clip:text;background-clip:text;color:transparent;">战舰陨落</div>
      ${isNewBest ? '<div class="badge" style="color:#ffd54a;border-color:#ffd54a;">🏆 新纪录！</div>' : ""}
      <div class="stat-line">生存时间 <b>${fmtTimeStatic(stats.timeSurvived)}</b></div>
      <div class="stat-line">达到等级 <b>${stats.level}</b> &nbsp; 击杀 <b>${stats.kills}</b> &nbsp; 抵达 <b>第 ${stats.wave} 波</b></div>
      <div class="stat-line" style="font-size:14px;color:#9fb0e8;">历史最佳：${fmtTimeStatic(highScore)}</div>
    `;
    const again = el("button", "btn", "再来一局 ↻");
    again.onclick = onRestart;
    const menu = el("button", "btn secondary", "主菜单");
    menu.onclick = onMenu;
    this.overlay.append(again, menu);
  }
}

function fmtTimeStatic(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
