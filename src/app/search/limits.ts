/** How many papers one search can fetch. The control offers exactly these, and so does the URL. */
export const LIMIT_OPTIONS: readonly number[] = [10, 25, 50, 100];
export const DEFAULT_LIMIT = LIMIT_OPTIONS[0];

/**
 * How deep paging goes. Search engines stop serving results from a fixed depth, and deep pages
 * of a broad query are rarely useful anyway, so paging ends at the first 10,000 results.
 * Every page size above divides this evenly, so the last page is always full.
 */
export const MAX_RESULTS = 10_000;
