// Quick test: verify the Light Mode toggle switches theme
import { chromium } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'test-screenshots');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Dismiss onboarding
await page.evaluate(() => {
  const skip = [...document.querySelectorAll('button')].find(b => /skip/i.test(b.textContent || ''));
  skip?.click();
});
await page.waitForTimeout(600);

// Go to Settings
await page.evaluate(() => {
  const el = [...document.querySelectorAll('nav a, aside a, nav button, aside button')]
    .find(e => e.textContent?.includes('Settings'));
  el?.click();
});
await page.waitForTimeout(700);

// Check current html class
const before = await page.evaluate(() => document.documentElement.className);
console.log('html class before toggle:', JSON.stringify(before));

// Click the Light Mode toggle
const toggled = await page.evaluate(() => {
  const label = [...document.querySelectorAll('label, button, div')]
    .find(el => el.textContent?.includes('Light Mode'));
  const toggle = label?.querySelector('button, input') || label;
  if (toggle) { toggle.click(); return toggle.tagName + ': ' + toggle.textContent?.trim().slice(0, 40); }
  return null;
});
console.log('clicked:', toggled);
await page.waitForTimeout(800);

const after = await page.evaluate(() => document.documentElement.className);
console.log('html class after toggle:', JSON.stringify(after));

const f = path.join(SHOTS, '07-light-mode-active.png');
await page.screenshot({ path: f, fullPage: true });
console.log('screenshot:', f);

await browser.close();
