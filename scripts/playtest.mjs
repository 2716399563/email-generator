// End-to-end smoke playtest for Star Tide Survivors.
// Drives real keyboard input in Chrome, captures screenshots + video,
// and asserts the core loop (menu -> play -> level up -> pause) works.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.GAME_URL || "http://localhost:5173/";
const OUT = process.env.ART_DIR || "/opt/cursor/artifacts";
const SHOTS = `${OUT}/screenshots`;
mkdirSync(SHOTS, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[playtest]", ...a);

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => pageErrors.push(String(e)));

// Read the live HUD text straight from the DOM.
async function hud() {
  return page.evaluate(() => ({
    level: document.querySelector("#lvlTxt")?.textContent ?? "",
    hp: document.querySelector("#hpTxt")?.textContent ?? "",
    time: document.querySelector("#timeTxt")?.textContent ?? "",
    wave: document.querySelector("#waveTxt")?.textContent ?? "",
    kills: document.querySelector("#killsTxt")?.textContent ?? "",
    cards: document.querySelectorAll(".card").length,
    overlay: document.querySelector(".overlay .badge, .overlay .title")?.textContent ?? "",
    hudVisible: getComputedStyle(document.querySelector("#ui-root > div:nth-child(2)")).display,
  }));
}

const shot = async (name) => {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  log("screenshot", name);
};

// Move in a heading for `ms`, holding the two relevant keys; occasionally dash.
async function moveHeading(keys, ms, { dash = false } = {}) {
  for (const k of keys) await page.keyboard.down(k);
  if (dash) {
    await page.keyboard.press("Space");
  }
  await sleep(ms);
  for (const k of keys) await page.keyboard.up(k);
}

// Circle-strafe pattern; break early and return true if a level-up appears.
async function playUntilLevelUp(maxMs) {
  const headings = [["w"], ["w", "d"], ["d"], ["s", "d"], ["s"], ["s", "a"], ["a"], ["w", "a"]];
  const start = Date.now();
  let i = 0;
  while (Date.now() - start < maxMs) {
    await moveHeading(headings[i % headings.length], 550, { dash: i % 4 === 0 });
    i++;
    const cards = await page.evaluate(() => document.querySelectorAll(".card").length);
    if (cards > 0) return true;
  }
  return false;
}

try {
  log("navigate", URL);
  await page.goto(URL, { waitUntil: "networkidle" });
  await sleep(1200);
  const menu = await page.evaluate(() => ({
    title: document.querySelector(".title")?.textContent ?? "",
    hasStart: [...document.querySelectorAll(".btn")].some((b) => b.textContent.includes("开始")),
    subtitle: document.querySelector(".subtitle")?.textContent ?? "",
  }));
  log("MENU", JSON.stringify(menu));
  await shot("01-main-menu");

  // Start the run.
  await page.getByText("开始游戏", { exact: false }).click();
  await sleep(1500);
  log("AFTER START", JSON.stringify(await hud()));
  await shot("02-gameplay-start");

  // Play until we get a level-up (bounded).
  const leveled = await playUntilLevelUp(45000);
  await shot("03-active-gameplay");
  log("reached level-up?", leveled, JSON.stringify(await hud()));

  if (leveled) {
    await shot("04-level-up-cards");
    const before = await hud();
    await page.locator(".card").first().click();
    await sleep(600);
    const after = await hud();
    log("LEVELUP pick", { beforeLevel: before.level, afterOverlayGone: after.cards === 0 });
  }

  // Keep playing a bit more; may trigger more level-ups (auto-pick first card).
  const t2 = Date.now();
  while (Date.now() - t2 < 18000) {
    const got = await playUntilLevelUp(4000);
    if (got) {
      await page.locator(".card").first().click();
      await sleep(400);
    }
  }
  const mid = await hud();
  log("MID-RUN", JSON.stringify(mid));
  await shot("05-mid-run");

  // Pause / resume.
  await page.keyboard.press("p");
  await sleep(600);
  const paused = await page.evaluate(
    () => document.querySelector(".overlay .title")?.textContent ?? "",
  );
  log("PAUSE overlay:", paused);
  await shot("06-paused");
  await page.keyboard.press("p");
  await sleep(500);
  const resumed = await page.evaluate(() => document.querySelectorAll(".overlay .title").length);
  log("resumed (overlay title count should be 0):", resumed);
  await shot("07-resumed");

  // Final HUD snapshot.
  const finalHud = await hud();
  log("FINAL HUD", JSON.stringify(finalHud));

  // ---- Assertions ----
  const problems = [];
  if (!menu.title.includes("星潮")) problems.push("menu title missing");
  if (!menu.hasStart) problems.push("start button missing");
  if (!leveled) problems.push("never leveled up");
  if (paused !== "已暂停") problems.push("pause overlay did not show 已暂停");
  if (resumed !== 0) problems.push("did not resume from pause");
  if (pageErrors.length) problems.push("pageerror: " + pageErrors.join(" | "));
  // Ignore benign favicon/network 404s in console noise.
  const realConsoleErrors = consoleErrors.filter((e) => !/favicon|404|net::ERR/i.test(e));
  if (realConsoleErrors.length) problems.push("console errors: " + realConsoleErrors.join(" | "));

  log("CONSOLE ERRORS:", JSON.stringify(consoleErrors));
  log("PAGE ERRORS:", JSON.stringify(pageErrors));

  if (problems.length) {
    log("RESULT: FAIL");
    for (const p of problems) log("  -", p);
    process.exitCode = 1;
  } else {
    log("RESULT: PASS — core loop verified (menu, gameplay, level-up, pause/resume).");
  }
} catch (err) {
  log("FATAL", err);
  process.exitCode = 2;
} finally {
  await context.close(); // flushes the recorded video
  await browser.close();
  log("done. artifacts in", OUT);
}
