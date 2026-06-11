export function padNumber(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

export function formatPlaytime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${padNumber(m, 2)}m ${padNumber(s, 2)}s`;
  return `${m}m ${padNumber(s, 2)}s`;
}

export function hpBar(current: number, max: number, width = 10): string {
  const filled = Math.round((current / max) * width);
  const empty = width - filled;
  return `[${'#'.repeat(filled)}${' '.repeat(empty)}]`;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export function rightAlign(n: number, width: number): string {
  return String(n).padStart(width);
}
