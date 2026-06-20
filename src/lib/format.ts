export const currency = (n: number | null | undefined, symbol = "$") =>
  `${symbol}${Number(n ?? 0).toFixed(2)}`;

export const fmtDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

export const fmtTime = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

export const minutesAgo = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
};

export const initials = (name?: string | null) => {
  if (!name) return "?";
  return name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
};
