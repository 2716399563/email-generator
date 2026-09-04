import "./style.css";
import { Game } from "./game/Game";

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
const uiRoot = document.getElementById("ui-root");

if (!canvas || !uiRoot) {
  throw new Error("Missing #game canvas or #ui-root element");
}

// Boot the game. Everything else is driven by the internal RAF loop.
new Game(canvas, uiRoot);
