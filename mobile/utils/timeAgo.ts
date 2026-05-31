export function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const normalized = dateStr.includes("T") || dateStr.endsWith("Z")
    ? dateStr
    : dateStr.replace(" ", "T") + "Z";
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function formatFullDate(dateStr: string): string {
  if (!dateStr) return "";
  const normalized = dateStr.includes("T") || dateStr.endsWith("Z")
    ? dateStr
    : dateStr.replace(" ", "T") + "Z";
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
