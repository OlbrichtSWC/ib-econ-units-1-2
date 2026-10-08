// Turns the Vitest results (test-report/results.json) into a plain-language report: test-report/TEST-REPORT.md
import { readFileSync, writeFileSync } from 'node:fs';

const r = JSON.parse(readFileSync('test-report/results.json', 'utf8'));
const files = r.testResults.map((f) => ({
  file: f.name.replace(/^.*\/tests\//, 'tests/'),
  tests: f.assertionResults.map((a) => ({ group: a.ancestorTitles.join(' > '), title: a.title, status: a.status })),
}));
const all = files.flatMap((f) => f.tests);
const passed = all.filter((t) => t.status === 'passed').length;
const failed = all.filter((t) => t.status === 'failed').length;
const date = new Date().toISOString().slice(0, 10);

let md = `# Test report\n\nRun on ${date}.\n\n**${passed} of ${all.length} tests passed${failed ? `, ${failed} failed` : ''}.**\n\n`;
md += 'Each line is one automated check. A checkmark (✓) means the app calculated the expected answer.\n';
for (const f of files) {
  md += `\n## ${f.file}\n`;
  let group = '';
  for (const t of f.tests) {
    if (t.group !== group) {
      group = t.group;
      md += `\n**${group}**\n\n`;
    }
    md += `- ${t.status === 'passed' ? '✓' : '✗ FAILED:'} ${t.title}\n`;
  }
}
writeFileSync('test-report/TEST-REPORT.md', md);
console.log(`Wrote test-report/TEST-REPORT.md: ${passed}/${all.length} passed.`);
if (failed) process.exit(1);
