import { Page } from '@playwright/test';

/** Pause with +/-15% jitter for human-like feel */
export async function humanDelay(ms: number): Promise<void> {
  const jitter = ms * 0.15;
  const actual = ms + (Math.random() * jitter * 2 - jitter);
  await new Promise(r => setTimeout(r, Math.max(50, actual)));
}

/** Fixed delay between scenes — no jitter */
export async function scenePause(ms: number): Promise<void> {
  await new Promise(r => setTimeout(r, ms));
}

/** Smooth cursor glide to coordinates */
export async function humanMove(page: Page, x: number, y: number, steps = 25): Promise<void> {
  await page.mouse.move(x, y, { steps });
}

/** Locate element, move cursor to center, pause, click, settle */
export async function humanClick(page: Page, selector: string): Promise<void> {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 10000 });
  const box = await el.boundingBox();
  if (!box) throw new Error(`No bounding box for ${selector}`);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await humanMove(page, cx, cy);
  await humanDelay(400); // hesitation before click
  await page.mouse.click(cx, cy);
  await humanDelay(300); // settle after click
}

/** Click field, then type character by character */
export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 10000 });
  await el.click();
  await humanDelay(200);
  await page.keyboard.type(text, { delay: 70 });
  await humanDelay(200);
}

/** Move cursor to element center and dwell */
export async function humanHover(page: Page, selector: string, dwellMs = 800): Promise<void> {
  const el = page.locator(selector).first();
  if (await el.count() === 0) return;
  const box = await el.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await humanMove(page, cx, cy);
  await scenePause(dwellMs);
}

/** Smooth horizontal cursor sweep across the board */
export async function slowSweep(
  page: Page,
  startX: number,
  endX: number,
  y: number,
  durationMs: number
): Promise<void> {
  const steps = Math.ceil(durationMs / 30); // ~30ms per step
  const dx = (endX - startX) / steps;
  for (let i = 0; i <= steps; i++) {
    await page.mouse.move(startX + dx * i, y);
    await new Promise(r => setTimeout(r, 30));
  }
}
