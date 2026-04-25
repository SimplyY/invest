export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

export function roundToUnit(value: number, unit: number): number {
  if (unit <= 0) {
    return value;
  }

  return Math.round(value / unit) * unit;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** East Asian / wide code points count as 2 columns in monospace terminals. */
function codePointDisplayWidth(cp: number): number {
  if (cp <= 0x1f) {
    return 0;
  }
  if (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x9fff) ||
    (cp >= 0xa960 && cp <= 0xa97f) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe19) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6)
  ) {
    return 2;
  }
  return 1;
}

export function displayWidth(s: string): number {
  let n = 0;
  for (const ch of s) {
    n += codePointDisplayWidth(ch.codePointAt(0)!);
  }
  return n;
}

export function truncateToDisplayWidth(s: string, maxWidth: number): string {
  if (displayWidth(s) <= maxWidth) {
    return s;
  }
  const ellipsis = "…";
  const ellW = displayWidth(ellipsis);
  let out = "";
  let w = 0;
  for (const ch of s) {
    const cw = codePointDisplayWidth(ch.codePointAt(0)!);
    if (w + cw + ellW > maxWidth) {
      break;
    }
    out += ch;
    w += cw;
  }
  return out + ellipsis;
}

export function padToDisplayWidth(
  s: string,
  width: number,
  align: "left" | "right" = "left",
): string {
  let cell = s;
  if (displayWidth(cell) > width) {
    cell = truncateToDisplayWidth(cell, width);
  }
  const w = displayWidth(cell);
  const pad = Math.max(0, width - w);
  const spaces = " ".repeat(pad);
  return align === "left" ? cell + spaces : spaces + cell;
}

export function formatCurrency(value: number): string {
  // 精度改为保留 k（千元），如 12000 显示为 "1.2万"
  if (Math.abs(value) >= 10000) {
    // 保留一位小数，整数直接显示，无小数部分则不加 .0
    const num = value / 10000;
    const formatted = Number.isInteger(num)
      ? num.toFixed(0)
      : num.toFixed(0).replace(/\.0$/, "");
    return `${formatted}万`;
  }
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatSignedCurrency(value: number): string {
  const formatted = formatCurrency(Math.abs(value));
  return value > 0
    ? `+${formatted}`
    : value < 0
      ? `-${formatted}`
      : formatCurrency(0);
}

export function formatSignedPercent(value: number): string {
  const formatted = `${Math.abs(value * 100).toFixed(2)}%`;
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : "0.00%";
}

export function formatIsoTimestamp(date = new Date()): string {
  return date.toISOString();
}
