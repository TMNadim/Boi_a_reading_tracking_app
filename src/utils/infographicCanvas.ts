import type { Book, NoteEntry } from '../types/bookly';
import { formatMinutesReadable } from './readingStats';

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 8
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      lineCount += 1;
      if (lineCount >= maxLines) {
        ctx.fillText(`${line}…`, x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function triggerDownload(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export interface InfographicPayload {
  totalMinutes: number;
  totalPages: number;
  booksFinished: number;
  currentStreak: number;
  avgSpeed: number;
  topBookTitle?: string;
  topBookAuthor?: string;
  dateLabel: string;
}

export function downloadReadingInfographic(payload: InfographicPayload): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clean paper background
  ctx.fillStyle = '#F7F8FA';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle architectural border
  ctx.strokeStyle = '#DCE2EC';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

  // Header brand
  ctx.fillStyle = '#1D63ED';
  ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Boi', 96, 128);

  ctx.fillStyle = '#5A6577';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Reading Report · ${payload.dateLabel}`, 96, 168);

  // Hero Headline
  ctx.fillStyle = '#121826';
  ctx.font = '600 68px "Fraunces", Georgia, serif';
  ctx.fillText('Your Reading', 96, 286);
  ctx.fillText('Snapshot', 96, 362);

  // Divider
  ctx.strokeStyle = '#E4E7EC';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 418);
  ctx.lineTo(canvas.width - 96, 418);
  ctx.stroke();

  // 2x2 Stat Grid
  const stats = [
    { label: 'Total Time Read', value: formatMinutesReadable(payload.totalMinutes) },
    { label: 'Pages Turned', value: payload.totalPages.toLocaleString() },
    { label: 'Books Finished', value: String(payload.booksFinished) },
    { label: 'Reading Streak', value: `${payload.currentStreak} days` },
  ];

  stats.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 96 + col * 460;
    const y = 472 + row * 220;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E4E7EC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, 428, 184, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#5A6577';
    ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.label, x + 32, y + 58);

    ctx.fillStyle = '#121826';
    ctx.font = '600 54px "JetBrains Mono", monospace';
    ctx.fillText(item.value, x + 32, y + 138);
  });

  // Speed & Top Book Banner
  ctx.fillStyle = '#121826';
  ctx.beginPath();
  ctx.roundRect(96, 932, canvas.width - 192, 240, 24);
  ctx.fill();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Average Reading Speed', 136, 996);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 44px "JetBrains Mono", monospace';
  ctx.fillText(`${payload.avgSpeed} pages / hour`, 136, 1054);

  if (payload.topBookTitle) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `Featured Book · ${payload.topBookTitle}${payload.topBookAuthor ? ` by ${payload.topBookAuthor}` : ''}`,
      136,
      1124
    );
  }

  // Footer
  ctx.fillStyle = '#64748B';
  ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Tracked with Boi Reading Studio', 96, 1252);

  triggerDownload(canvas, 'boi-reading-infographic.png');
}

export function downloadQuoteCard(note: NoteEntry, book?: Book): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#121826';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle geometric accent arc
  ctx.strokeStyle = 'rgba(29, 99, 237, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(960, 140, 260, 0, Math.PI * 2);
  ctx.stroke();

  // Opening quotation mark
  ctx.fillStyle = '#3B82F6';
  ctx.font = '600 128px "Fraunces", Georgia, serif';
  ctx.fillText('“', 96, 220);

  // Quote text
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '500 44px "Fraunces", Georgia, serif';
  const endY = wrapText(ctx, note.content, 104, 290, 870, 64, 9);

  // Hairline divider
  const lineY = Math.max(endY + 48, 780);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(104, lineY);
  ctx.lineTo(976, lineY);
  ctx.stroke();

  // Attribution
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(book?.title ?? 'Personal Reading Note', 104, lineY + 62);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '400 22px "Plus Jakarta Sans", sans-serif';
  const meta = [book?.author, note.page ? `Page ${note.page}` : undefined]
    .filter(Boolean)
    .join(' · ');
  ctx.fillText(meta || 'Saved in Boi', 104, lineY + 102);

  ctx.fillStyle = '#60A5FA';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Boi', 935, lineY + 102);

  triggerDownload(canvas, 'boi-quote-card.png');
}
