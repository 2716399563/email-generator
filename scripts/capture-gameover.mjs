// Captures the game-over screen by starting a run and staying still.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.GAME_URL || "http://localhost:5173/";
const SHOTS = "/opt/cursor/artifacts/screenshots";
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });
await page.goto(URL, { waitUntil: "networkidle" });
await sleep(1000);
await page.getByText("开始游戏", { exact: false }).click();

// Stand still (no movement) so the tide overwhelms the ship; auto-pick any
// level-up cards that pop so the run isn't blocked on the upgrade overlay.
const start = Date.now();
let over = "";
while (Date.now() - start < 120000) {
  await sleep(800);
  const state = await page.evaluate(() => ({
    cards: document.querySelectorAll(".card").length,
    title: document.querySelector(".overlay .title")?.textContent ?? "",
  }));
  if (state.cards > 0) {
    await page.locator(".card").first().click();
  }
  if (state.title.includes("战舰陨落")) {
    over = state.title;
    break;
  }
}
await sleep(500);
await page.screenshot({ path: `${SHOTS}/08-game-over.png` });
const stats = await page.evaluate(() =>
  [...document.querySelectorAll(".overlay .stat-line")].map((e) => e.textContent.trim()),
);
console.log("[gameover] reached:", over || "(timed out)", "stats:", JSON.stringify(stats));
await browser.close();
