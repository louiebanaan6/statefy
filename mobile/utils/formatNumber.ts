export function fmt(n: number | undefined | null): string {
  const num = n ?? 0;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (num >= 10_000) return Math.floor(num / 1_000) + "k";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(num);
}
