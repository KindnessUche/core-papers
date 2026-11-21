import { DEFAULT_LIMIT, LIMIT_OPTIONS } from '../search/limits';

export interface SearchState {
  q: string;
  limit: number;
}

/** A query longer than this is not something a person typed. */
const MAX_QUERY = 500;

/** Reads `?q=…&n=…`. Anything missing or unrecognised falls back to the defaults. */
export function parseState(search: string): SearchState {
  const params = new URLSearchParams(search);
  const q = (params.get('q') ?? '').trim().slice(0, MAX_QUERY);
  const n = Number(params.get('n'));
  return { q, limit: LIMIT_OPTIONS.includes(n) ? n : DEFAULT_LIMIT };
}

/** The query string for a state, leaving out whatever is default so clean searches have clean links. */
export function buildSearch(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.q && state.limit !== DEFAULT_LIMIT) params.set('n', String(state.limit));
  const text = params.toString();
  return text ? `?${text}` : '';
}
