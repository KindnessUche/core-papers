export interface YearBin {
  start: number;
  end: number;
  /** Short axis label: "2019", or "1990s" for ten-year bins. */
  label: string;
  /** Full span for tooltips and the table: "2015–2019". */
  range: string;
  count: number;
}

const WIDTHS = [1, 2, 5, 10, 20, 50, 100];

/** Years outside this window are catalogue noise (placeholder dates, typos), not publication years. */
export function isPlausibleYear(year: unknown, now = new Date().getFullYear()): year is number {
  return typeof year === 'number' && Number.isInteger(year) && year >= 1000 && year <= now + 1;
}

/**
 * Groups years into evenly sized bins covering min to max, with no gaps (empty years stay as
 * zero-height bins, so the time axis is honest). Picks the narrowest bin width that keeps
 * the number of bins at or under `maxBins`.
 */
export function binYears(years: readonly number[], maxBins: number): YearBin[] {
  return binCounts(
    years.map((year) => [year, 1] as const),
    maxBins,
  );
}

/** Like binYears, but each year arrives with how many papers it holds. */
export function binCounts(entries: readonly (readonly [number, number])[], maxBins: number): YearBin[] {
  const years = entries.filter(([, count]) => count > 0).map(([year]) => year);
  if (years.length === 0) return [];

  const min = Math.min(...years);
  const max = Math.max(...years);
  const span = max - min + 1;
  const width = WIDTHS.find((w) => Math.ceil(span / w) <= maxBins) ?? WIDTHS[WIDTHS.length - 1];
  // Align wide bins to round numbers: 1990–1999, not 1987–1996
  const first = width === 1 ? min : Math.floor(min / width) * width;

  const bins: YearBin[] = [];
  for (let start = first; start <= max; start += width) {
    const end = start + width - 1;
    bins.push({
      start,
      end,
      label: width === 10 ? `${start}s` : `${start}`,
      range: width === 1 ? `${start}` : `${start}–${end}`,
      count: 0,
    });
  }
  for (const [year, count] of entries) {
    if (count > 0) bins[Math.floor((year - first) / width)].count += count;
  }
  return bins;
}

/** A y-axis that ends on a round number with at most four steps. Counts are whole papers, so steps are whole too. */
export function niceScale(max: number): { max: number; ticks: number[] } {
  if (max <= 0) return { max: 1, ticks: [0, 1] };
  let step = 1;
  while (max / step > 4) {
    const magnitude = 10 ** Math.floor(Math.log10(step));
    const lead = Math.round(step / magnitude);
    step = lead === 1 ? 2 * magnitude : lead === 2 ? 5 * magnitude : 10 * magnitude;
  }
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return { max: top, ticks };
}
