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
