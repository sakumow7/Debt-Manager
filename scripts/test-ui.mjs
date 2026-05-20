// Browser-based UI test for Chisel Finance v1.1 features
// Run after: npx vite --port 5173
// Usage: node scripts/test-ui.mjs
import { chromium } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'test-screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const BASE = 'http://localhost:5173';

async function shot(page, name) {
  const f = path.join(SHOTS, name + '.png');
  await page.screenshot({ path: f, fullPage: true });
  console.log('  screenshot:', name + '.png');
}

async function nav(page, linkText) {
  await page.evaluate(t => {
    const el = [...document.querySelectorAll('nav a, nav button, aside a, aside button')]
      .find(e => e.textContent?.trim() === t || e.textContent?.includes(t));
    if (el) el.click();
    else throw new Error('nav not found: ' + t);
  }, linkText);
  await page.waitForTimeout(700);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('Navigating to', BASE);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Dismiss any onboarding/welcome modal
  const dismissed = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const skip = btns.find(b => /skip|close|dismiss|got it|start|begin|later/i.test(b.textContent || ''));
    if (skip) { skip.click(); return skip.textContent?.trim(); }
    // fallback: click X button in modal
    const x = btns.find(b => b.textContent?.trim() === '×' || b.getAttribute('aria-label') === 'Close');
    if (x) { x.click(); return 'X-close'; }
    return null;
  });
  if (dismissed) console.log('  dismissed modal:', dismissed);
  await page.waitForTimeout(600);
  // Dismiss a second modal if nested (some onboarding has multiple steps)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 1 — Dashboard
  console.log('\n[1] Dashboard');
  await shot(page, '01-dashboard');

  // 2 — Debts (credit score estimator)
  console.log('\n[2] Debts');
  await nav(page, 'Debts');
  await shot(page, '02-debts');

  // 3 — Add Debt modal
  console.log('\n[3] Add Debt modal');
  const addDebt = page.locator('button', { hasText: 'Add Debt' }).first();
  if (await addDebt.isVisible()) {
    await addDebt.click();
    await page.waitForTimeout(500);
    await shot(page, '03-add-debt-modal');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // 4 — Attack Plan (biweekly toggle + balance transfer)
  console.log('\n[4] Attack Plan');
  await nav(page, 'Attack Plan');
  await shot(page, '04-attack-plan');

  // Try to reveal balance transfer section
  const btBtn = page.locator('button', { hasText: /balance transfer/i }).first();
  if (await btBtn.isVisible()) {
    await btBtn.click();
    await page.waitForTimeout(400);
    await shot(page, '04b-balance-transfer');
  }

  // 5 — Net Worth
  console.log('\n[5] Net Worth');
  await nav(page, 'Net Worth');
  await shot(page, '05-net-worth');

  // 6 — Settings (theme + notification toggle)
  console.log('\n[6] Settings');
  await nav(page, 'Settings');
  await shot(page, '06-settings');

  // 7 — Dark mode: find the theme toggle and click it
  console.log('\n[7] Dark mode toggle');
  const toggled = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('label, button')];
    const toggle = labels.find(el =>
      el.textContent?.toLowerCase().includes('dark') ||
      el.textContent?.toLowerCase().includes('theme')
    );
    if (toggle) { toggle.click(); return true; }
    // try any checkbox near "dark" text
    const darkText = [...document.querySelectorAll('*')].find(el =>
      el.childElementCount === 0 && el.textContent?.toLowerCase().includes('dark mode'));
    if (darkText) {
      const nearby = darkText.closest('label') || darkText.parentElement;
      const cb = nearby?.querySelector('input[type=checkbox], button') || nearby;
      if (cb) { cb.click(); return true; }
    }
    return false;
  });
  await page.waitForTimeout(800);
  await shot(page, '07-dark-mode' + (toggled ? '-toggled' : '-not-found'));

  // 8 — Toast: trigger a save action to produce a toast
  console.log('\n[8] Toast notification (trigger via add asset on Net Worth)');
  await nav(page, 'Net Worth');
  const addAsset = page.locator('button', { hasText: /add asset/i }).first();
  if (await addAsset.isVisible()) {
    await addAsset.click();
    await page.waitForTimeout(400);
    await shot(page, '08-add-asset-modal');
    await page.keyboard.press('Escape');
  }

  // 9 — Help page
  console.log('\n[9] Help');
  await nav(page, 'Help');
  await shot(page, '09-help');

  // 10 — Budget page
  console.log('\n[10] Budget');
  await nav(page, 'Budget');
  await shot(page, '10-budget');

  console.log('\nDone. All screenshots in:', SHOTS);
  await browser.close();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
