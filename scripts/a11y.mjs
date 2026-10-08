// Runs the axe accessibility checker (WCAG 2 A and AA rules) on each page. Usage: node scripts/a11y.mjs <baseUrl> <route...>
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const [base, ...routes] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let total = 0;
for (const route of routes) {
  const page = await (await browser.newContext({ bypassCSP: true })).newPage();
  await page.goto(base + '/#/' + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.addScriptTag({ content: axe });
  const res = await page.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
  for (const v of res.violations) {
    total++;
    console.log(`[${route || 'home'}] ${v.id} (${v.impact}): ${v.help}`);
    v.nodes.slice(0, 3).forEach((n) => console.log('    ', n.target.join(' '), '|', n.failureSummary.split('\n')[1]?.trim()));
  }
  await page.close();
}
console.log(total ? `${total} problem types found` : 'No accessibility problems found');
await browser.close();
