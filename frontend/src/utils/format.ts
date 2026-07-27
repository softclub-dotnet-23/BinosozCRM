const numberFormatter = new Intl.NumberFormat("ru-RU");

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatCurrency(value: number): string {
  return `${numberFormatter.format(value)} сомони`;
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

export function formatCompact(value: number): string {
  if (value === 0) return "0";
  if (value >= 1000) {
    return `${numberFormatter.format(Math.round(value / 1000))}k`;
  }
  return `${value}`;
}

export function formatMillionsCompact(value: number): string {
  if (value === 0) return "0";
  const millions = Math.round((value / 1_000_000) * 10) / 10;
  const str = Number.isInteger(millions) ? String(millions) : millions.toFixed(1);
  return `${str}M`;
}
