function niceStep(roughStep: number): number {
  const exponent = Math.floor(Math.log10(roughStep));
  const fraction = roughStep / 10 ** exponent;
  let niceFraction: number;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * 10 ** exponent;
}

export function computeNiceTicks(maxValue: number, tickCount = 5): number[] {
  if (maxValue <= 0) return [0];
  const step = niceStep(maxValue / tickCount);
  const niceMax = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= niceMax + 1e-6; v += step) {
    ticks.push(Math.round(v));
  }
  return ticks;
}
