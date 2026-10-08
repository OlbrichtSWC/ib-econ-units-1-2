// Takes screenshots of pages for a quick visual check. Usage: node scripts/shots.mjs <baseUrl> <outDir> <route...>
import { chromium } from 'playwright-core';
const [base, out, ...routes] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [i, r] of routes.entries()) {
  const [route, w] = r.split('@');
  const page = await browser.newPage({ viewport: { width: Number(w || 1280), height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base + '/#/' + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${i}-${route.replace(/\W+/g, '_') || 'home'}-${w || 1280}.png`, fullPage: true });
  if (errors.length) console.log(route, 'ERRORS', errors);
  await page.close();
}
await browser.close();
