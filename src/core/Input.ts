import type { Vec2 } from "../game/math";

/**
 * Keyboard + pointer input. Tracks held keys and exposes a normalized
 * movement vector plus edge-triggered "just pressed" queries.
 */
export class Input {
  private held = new Set<string>();
  private pressedThisFrame = new Set<string>();
  readonly pointer: Vec2 = { x: 0, y: 0 };
  pointerDown = false;

  constructor(private target: HTMLElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("pointermove", this.onPointerMove);
    target.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerUp);
    // Avoid the page scrolling / context menu while playing.
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("blur", () => this.held.clear());
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
      e.preventDefault();
    }
    if (!this.held.has(k)) this.pressedThisFrame.add(k);
    this.held.add(k);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.held.delete(e.key.toLowerCase());
  };

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.target.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
  };

  private onPointerDown = (e: PointerEvent) => {
    this.pointerDown = true;
    this.onPointerMove(e);
  };

  private onPointerUp = () => {
    this.pointerDown = false;
  };

  isDown(...keys: string[]): boolean {
    return keys.some((k) => this.held.has(k));
  }

  justPressed(...keys: string[]): boolean {
    return keys.some((k) => this.pressedThisFrame.has(k));
  }

  /** Normalized movement direction from WASD / arrow keys. */
  moveVector(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.isDown("a", "arrowleft")) x -= 1;
    if (this.isDown("d", "arrowright")) x += 1;
    if (this.isDown("w", "arrowup")) y -= 1;
    if (this.isDown("s", "arrowdown")) y += 1;
    const len = Math.hypot(x, y);
    if (len > 0) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  /** Must be called at the end of every frame to clear edge triggers. */
  endFrame() {
    this.pressedThisFrame.clear();
  }
}
