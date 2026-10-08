// Runs axe on the game modes that need a click to open (paint, seasons, mystery, café campaign, stamp toast),
// and takes phone-width screenshots of them. Usage: node scripts/a11y-modes.mjs <baseUrl> <outDir>
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const [base, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const cases = [
  ['surplus-shader', 'Paint the surplus'],
  ['ppc-explorer', 'Four seasons'],
  ['ped-line', 'Mystery: hidden points'],
  ['elasticity-cafe', 'Start the 4-week campaign'],
];
let total = 0;
for (const [id, button] of cases) {
  for (const width of [1280, 390]) {
    const ctx = await browser.newContext({ bypassCSP: true, viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/#/a/${id}/try`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: button }).click();
    if (id === 'elasticity-cafe') await page.getByRole('button', { name: 'Open the café' }).click();
    await page.waitForTimeout(1200);
    if (width === 390) await page.screenshot({ path: `${out}/phone-${id}.png`, fullPage: true });
    else {
      await page.addScriptTag({ content: axe });
      const res = await page.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
      for (const v of res.violations) {
        total++;
        console.log(`[${id}] ${v.id} (${v.impact}): ${v.help}`);
        v.nodes.slice(0, 3).forEach((n) => console.log('    ', n.target.join(' '), '|', n.failureSummary.split('\n')[1]?.trim()));
      }
    }
    await ctx.close();
  }
}
console.log(total ? `${total} problem types found` : 'No accessibility problems found in the game modes');
await browser.close();
