/**
 * Draws a one-page progress summary as a PNG image, entirely in the browser.
 * The student chooses whether to hand it in. Nothing is sent anywhere by the app.
 */
import { ActivityProgress, dayToDate, STEP } from './types';

export interface SummaryRow {
  tag: string;
  title: string;
  progress?: ActivityProgress;
}

export interface SummaryOptions {
  appTitle: string;
  levelNames: string[];
  rows: SummaryRow[];
  code: string;
  now?: Date;
}

const NAVY = '#1B3A6B';
const RED = '#C8102E';
const INK = '#1a1f29';
const SOFT = '#4a5263';
const HEAD = 'Georgia, "Times New Roman", serif';
const BODY = 'Calibri, Carlito, "Segoe UI", Arial, sans-serif';

export function drawSummary(canvas: HTMLCanvasElement, o: SummaryOptions) {
  const W = 1240, H = 1754; // A4 at 150 dpi
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  if (!g) return;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);

  g.fillStyle = NAVY;
  g.fillRect(0, 0, W, 150);
  g.fillStyle = RED;
  g.fillRect(0, 150, W, 8);
  g.fillStyle = '#fff';
  g.font = `bold 46px ${HEAD}`;
  g.fillText(o.appTitle, 70, 80);
  g.font = `28px ${BODY}`;
  g.fillText('My progress summary', 70, 122);

  const now = o.now ?? new Date();
  g.fillStyle = INK;
  g.font = `26px ${BODY}`;
  g.fillText(`Made on ${now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`, 70, 215);
  g.fillStyle = SOFT;
  g.font = `22px ${BODY}`;
  g.fillText('Self-ratings are the student’s own formative ratings. Scores come from Check it questions.', 70, 252);

  const cols = [70, 470, 760, 960];
  let y = 320;
  g.fillStyle = '#eef2f8';
  g.fillRect(50, y - 40, W - 100, 56);
  g.fillStyle = NAVY;
  g.font = `bold 24px ${BODY}`;
  ['Activity', 'Steps done', 'Check it', 'Self-rating'].forEach((h, i) => g.fillText(h, cols[i], y));
  y += 60;

  for (const r of o.rows) {
    const p = r.progress;
    g.fillStyle = INK;
    g.font = `bold 24px ${BODY}`;
    g.fillText(fit(g, r.title, 380), cols[0], y);
    g.font = `20px ${BODY}`;
    g.fillStyle = SOFT;
    g.fillText(fit(g, r.tag, 380), cols[0], y + 28);

    g.font = `22px ${BODY}`;
    g.fillStyle = INK;
    const names = ['Learn', 'Try', 'Check', 'Rate'];
    const flags = [STEP.learn, STEP.try, STEP.check, STEP.rated];
    flags.forEach((f, i) => {
      const done = !!p && (p.steps & f) !== 0;
      const x = cols[1] + (i % 2) * 120;
      const yy = y + Math.floor(i / 2) * 32;
      drawMark(g, x, yy - 18, done);
      g.fillText(names[i], x + 26, yy);
    });

    g.fillText(p && p.total ? `${p.correct} of ${p.total} correct` : 'Not yet', cols[2], y);
    if (p && p.total) {
      g.fillStyle = SOFT;
      g.fillText(`${p.hints} ${p.hints === 1 ? 'hint' : 'hints'}`, cols[2], y + 30);
      g.fillStyle = INK;
    }
    g.fillText(p && p.rating ? o.levelNames[p.rating - 1] ?? '' : 'Not rated', cols[3], y);
    if (p && p.updated) {
      g.fillStyle = SOFT;
      g.font = `18px ${BODY}`;
      g.fillText(`Updated ${dayToDate(p.updated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`, cols[3], y + 30);
    }
    y += 52;
    g.strokeStyle = '#c9d1de';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(50, y);
    g.lineTo(W - 50, y);
    g.stroke();
    y += 42;
    if (y > H - 220) break;
  }

  g.fillStyle = SOFT;
  g.font = `20px ${BODY}`;
  g.fillText('Progress code (loads this progress on another device):', 70, H - 130);
  g.fillStyle = INK;
  g.font = `bold 22px "Courier New", monospace`;
  wrapText(g, o.code, 70, H - 98, W - 140, 28);
  g.fillStyle = SOFT;
  g.font = `18px ${BODY}`;
  g.fillText('Made in the student’s browser. The app did not send this information anywhere.', 70, H - 30);
}

function drawMark(g: CanvasRenderingContext2D, x: number, y: number, done: boolean) {
  g.lineWidth = 2;
  g.strokeStyle = done ? '#1e6b3a' : '#9aa3b2';
  g.strokeRect(x, y, 20, 20);
  if (done) {
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x + 4, y + 10);
    g.lineTo(x + 9, y + 15);
    g.lineTo(x + 17, y + 5);
    g.stroke();
  }
}

function fit(g: CanvasRenderingContext2D, text: string, max: number) {
  if (g.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && g.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  let line = '';
  for (const ch of text) {
    if (g.measureText(line + ch).width > max && ch === '-') {
      g.fillText(line + ch, x, y);
      y += lh;
      line = '';
    } else line += ch;
  }
  g.fillText(line, x, y);
}

/** Triggers a download of the canvas as a PNG file. */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}
