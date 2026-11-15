// Numbers as the window shows them.

import { LOCALE } from '@hyperpane/sdk/client';

const whole = new Intl.NumberFormat(LOCALE);
const short = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });

export const number = (n: number) => whole.format(n);

/** 1.2K, 3.4M: for the big figures at the top. */
export const compact = (n: number) => (n < 10_000 ? whole.format(n) : short.format(n));

/** A share as a percent: one decimal under 10%, `<0.1%` for a sliver. */
export function percent(share: number): string {
  if (share <= 0) return '0%';
  const p = share * 100;
  if (p < 0.1) return '<0.1%';
  return `${p < 10 ? p.toFixed(1) : Math.round(p)}%`;
}

export function duration(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}
