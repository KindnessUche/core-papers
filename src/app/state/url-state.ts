import { DEFAULT_LIMIT, LIMIT_OPTIONS, MAX_RESULTS } from '../search/limits';

export interface SearchState {
  q: string;
  limit: number;
  page: number;
}

const MAX_QUERY = 500;

/** Reads `?q=…&n=…&p=…`. Anything missing or unrecognised falls back to the defaults. */
export function parseState(search: string): SearchState {
  const params = new URLSearchParams(search);
  const q = (params.get('q') ?? '').trim().slice(0, MAX_QUERY);
  const n = Number(params.get('n'));
  const limit = LIMIT_OPTIONS.includes(n) ? n : DEFAULT_LIMIT;
  const p = Number(params.get('p'));
  const page = Number.isInteger(p) && p >= 1 ? Math.min(p, Math.ceil(MAX_RESULTS / limit)) : 1;
  return { q, limit, page };
}


export function buildSearch(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.q && state.limit !== DEFAULT_LIMIT) params.set('n', String(state.limit));
  if (state.q && state.page > 1) params.set('p', String(state.page));
  const text = params.toString();
  return text ? `?${text}` : '';
}
