import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SearchResponse, YearAggregation } from './paper.model';

/** Proxied to https://api.core.ac.uk/v3 by proxy.conf.js, which also adds the API key. */
export const API_BASE = '/core-api';

@Injectable({ providedIn: 'root' })
export class CoreApiService {
  private readonly http = inject(HttpClient);

  /**
   * Search works. `query` is passed through untouched so CORE evaluates the boolean syntax.
   * `offset` is how many results to skip: page 3 of 25 per page is offset 50.
   */
  search(query: string, limit = 10, offset = 0): Observable<SearchResponse> {
    let params = new HttpParams().set('q', query).set('limit', limit);
    if (offset > 0) params = params.set('offset', offset);
    return this.http.get<SearchResponse>(`${API_BASE}/search/works`, { params });
  }

  /**
   * How many matching papers were published in each year, counted by CORE across all matches
   * (not just the page on screen). Keys are years, values are counts.
   */
  yearCounts(query: string): Observable<Record<string, number>> {
    return this.http
      .post<YearAggregation>(`${API_BASE}/search/works/aggregate`, {
        q: query,
        aggregations: ['yearPublished'],
      })
      .pipe(map((res) => res.aggregations?.yearPublished ?? {}));
  }
}
