// Playwright-based Electron driver for Windows — launches the built app and
// screenshots key v1.1 features. Run: node scripts/test-driver.mjs
import { _electron as electron } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'test-screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const ELECTRON_BIN = path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe');

async function shot(page, name) {
  const f = path.join(SHOTS, name + '.png');
  await page.screenshot({ path: f, fullPage: true });
  console.log('  screenshot:', f);
}

async function clickNav(page, text) {
  await page.evaluate(t => {
    const els = [...document.querySelectorAll('a, button, [role="button"], nav *')];
    const el = els.find(e => e.textContent?.trim() === t) ?? els.find(e => e.textContent?.includes(t));
    if (el) el.click();
    else throw new Error('nav item not found: ' + t);
  }, text);
  await page.waitForTimeout(600);
}

async function main() {
  console.log('Launching Chisel Finance...');
  const app = await electron.launch({
    executablePath: ELECTRON_BIN,
    args: ['--no-sandbox', ROOT],
    timeout: 30_000,
  });

  await new Promise(r => setTimeout(r, 4000));

  const page = app.windows().find(w => !w.url().startsWith('devtools://'))
    ?? await app.firstWindow();

  console.log('Windows:', app.windows().map(w => w.url()));
  await page.waitForTimeout(2000);

  // --- Dashboard ---
  console.log('\n[1] Dashboard');
  await shot(page, '01-dashboard');

  // --- Debts page (credit score estimator) ---
  console.log('\n[2] Debts + Credit Score Estimator');
  await clickNav(page, 'Debts');
  await shot(page, '02-debts');

  // --- Attack Plan (biweekly + balance transfer) ---
  console.log('\n[3] Attack Plan');
  await clickNav(page, 'Attack Plan');
  await page.waitForTimeout(500);
  await shot(page, '03-attack-plan');

  // --- Net Worth ---
  console.log('\n[4] Net Worth');
  await clickNav(page, 'Net Worth');
  await page.waitForTimeout(500);
  await shot(page, '04-net-worth');

  // --- Settings (theme + notifications) ---
  console.log('\n[5] Settings');
  await clickNav(page, 'Settings');
  await page.waitForTimeout(500);
  await shot(page, '05-settings');

  // --- Toggle dark mode, screenshot ---
  console.log('\n[6] Dark mode toggle');
  await page.evaluate(() => {
    const toggles = [...document.querySelectorAll('button, input[type="checkbox"]')];
    const darkToggle = toggles.find(el => el.closest('label')?.textContent?.toLowerCase().includes('dark')
      || el.textContent?.toLowerCase().includes('dark')
      || el.getAttribute('aria-label')?.toLowerCase().includes('dark'));
    if (darkToggle) darkToggle.click();
  });
  await page.waitForTimeout(800);
  await shot(page, '06-dark-mode');

  // --- Add a debt and trigger celebration (if possible) ---
  console.log('\n[7] Add debt flow');
  await clickNav(page, 'Debts');
  await page.waitForTimeout(500);
  // Click "Add Debt" button
  const addDebtClicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Add Debt'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (addDebtClicked) {
    await page.waitForTimeout(600);
    await shot(page, '07-add-debt-modal');
  }

  console.log('\nAll screenshots saved to:', SHOTS);
  await app.close();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
