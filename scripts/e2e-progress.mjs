// End-to-end check: finish PPC Explorer's Check it, self-rate, move progress to a "new device" with a code.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:4173';
const content = JSON.parse(readFileSync('public/content/activities/ppc-explorer.json', 'utf8'));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
const dev1 = await browser.newContext();
const page = await dev1.newPage();
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base + '/#/a/ppc-explorer/check');
for (const q of content.check) {
  if (q.type === 'choice') {
    const i = q.options.findIndex((o) => o.correct);
    // first pick a wrong option to see feedback, then the right one
    const wrong = i === 0 ? 1 : 0;
    await page.locator('.option').nth(wrong).click();
    await page.getByRole('button', { name: 'Check my answer' }).click();
    await page.getByText('Not yet.').first().waitFor();
    await page.locator('.option').nth(i).click();
  } else if (q.type === 'label') {
    for (const sl of q.slots) await page.locator(`#slot-${q.id}-${sl.letter}`).selectOption(sl.answer);
  } else {
    await page.getByRole('button', { name: 'Get a hint' }).click();
    await page.locator('input[inputmode=decimal]').fill(String(q.answer));
  }
  await page.getByRole('button', { name: 'Check my answer' }).click();
  await page.getByText('Correct.').first().waitFor();
  await page.getByRole('button', { name: /Next question|Finish/ }).click();
}
await page.getByText('Check it complete').waitFor();
const summary = await page.locator('.callout-ok').first().innerText();
await page.getByRole('tab', { name: /Self-rate/ }).click();
const evidence = await page.locator('.card').first().innerText();
await page.getByRole('button', { name: 'Proficient 2' }).click();
await page.goto(base + '/#/progress');
await page.getByRole('button', { name: 'Get my progress code' }).click();
const code = (await page.locator('.progress-code').innerText()).trim();
const saved1 = await page.evaluate(() => localStorage.getItem('ib-econ-1-2.progress'));

// Device 2: empty browser, mistyped code first, then the right one
const dev2 = await browser.newContext();
const p2 = await dev2.newPage();
p2.on('pageerror', (e) => errors.push(e.message));
await p2.goto(base + '/#/progress');
const bad = code.slice(0, 5) + (code[5] === 'A' ? 'B' : 'A') + code.slice(6);
await p2.locator('#code-in').fill(bad);
await p2.getByRole('button', { name: 'Load my progress' }).click();
const badMsg = await p2.getByRole('alert').innerText();
await p2.locator('#code-in').fill(code.toLowerCase());
await p2.getByRole('button', { name: 'Load my progress' }).click();
await p2.getByRole('button', { name: 'Load progress' }).click();
const saved2 = await p2.evaluate(() => localStorage.getItem('ib-econ-1-2.progress'));

// QR link route
const p3 = await (await browser.newContext()).newPage();
await p3.goto(base + '/#/progress/load/' + code);
const qrDialog = await p3.getByRole('dialog').innerText();

// Reset with confirmation
await p2.getByRole('button', { name: 'Reset my progress' }).click();
const confirmText = await p2.getByRole('dialog').innerText();
await p2.getByRole('button', { name: 'Yes, reset my progress' }).click();
const saved3 = await p2.evaluate(() => localStorage.getItem('ib-econ-1-2.progress'));

console.log(JSON.stringify({ summary, evidence, code, badMsg, identical: saved1 === saved2, saved1, qrDialog: qrDialog.slice(0, 60), confirmText: confirmText.slice(0, 40), afterReset: saved3, errors }, null, 1));
await browser.close();
