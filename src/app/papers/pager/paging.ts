import { MAX_RESULTS } from '../../search/limits';

/** How many pages there are to visit, given how many papers match. Always at least one. */
export function pageCount(totalHits: number, limit: number): number {
  const reachable = Math.min(Math.max(totalHits, 0), MAX_RESULTS);
  return Math.max(1, Math.ceil(reachable / limit));
}

export type PageItem = number | 'gap';

/**
 * The page numbers to show: the first, the last, and the neighbourhood of the current page.
 * Always seven items when there are more than seven pages, so the pager never changes width
 * under the pointer as you click through it.
 */
export function pageWindow(current: number, last: number): PageItem[] {
  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);

  if (last <= 7) return range(1, last);
  if (current <= 4) return [...range(1, 5), 'gap', last];
  if (current >= last - 3) return [1, 'gap', ...range(last - 4, last)];
  return [1, 'gap', current - 1, current, current + 1, 'gap', last];
}
