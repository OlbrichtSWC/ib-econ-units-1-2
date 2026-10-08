/** Makes a QR code as an SVG string, entirely in the browser (no outside service). */
import qrcode from 'qrcode-generator';

export function qrSvg(text: string, cellSize = 4): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize, margin: 4, scalable: true });
}
