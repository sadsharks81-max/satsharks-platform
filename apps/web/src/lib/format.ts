const pad = (value: number) => String(value).padStart(2, "0");

// 41:32, or 1:05:09 past an hour. Used for clocks and time used.
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}` : `${pad(minutes)}:${pad(seconds % 60)}`;
}

// "1m 05s" / "42s": short form for per-question times.
export function formatShortDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${pad(seconds % 60)}s`;
}

export const multiplierLabel = (multiplier: number) => (multiplier === 1 ? "Standard time" : `Extended time (${multiplier}×)`);
