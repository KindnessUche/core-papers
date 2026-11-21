import { DEFAULT_LIMIT, LIMIT_OPTIONS, MAX_RESULTS } from '../search/limits';

export interface SearchState {
  q: string;
  limit: number;
  /** 1-based. */
  page: number;
}

/** A query longer than this is not something a person typed. */
const MAX_QUERY = 500;

/** Reads `?q=…&n=…&p=…`. Anything missing or unrecognised falls back to the defaults. */
export function parseState(search: string): SearchState {
  const params = new URLSearchParams(search);
  const q = (params.get('q') ?? '').trim().slice(0, MAX_QUERY);
  const n = Number(params.get('n'));
  const limit = LIMIT_OPTIONS.includes(n) ? n : DEFAULT_LIMIT;
  // A page beyond the paging depth does not exist; land on the last one that does
  const p = Number(params.get('p'));
  const page = Number.isInteger(p) && p >= 1 ? Math.min(p, Math.ceil(MAX_RESULTS / limit)) : 1;
  return { q, limit, page };
}

/** The query string for a state, leaving out whatever is default so clean searches have clean links. */
export function buildSearch(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.q && state.limit !== DEFAULT_LIMIT) params.set('n', String(state.limit));
  if (state.q && state.page > 1) params.set('p', String(state.page));
  const text = params.toString();
  return text ? `?${text}` : '';
}
