import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SearchResponse } from './paper.model';

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
}
