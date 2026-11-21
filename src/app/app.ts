import { DecimalPipe, I18nPluralPipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { map } from 'rxjs';
import { CoreApiService } from './data/core-api.service';
import { describeError } from './data/describe-error';
import { SearchResponse } from './data/paper.model';
import { csvFilename, downloadText, papersToCsv } from './export/papers-csv';
import { YearChart } from './chart/year-chart/year-chart';
import { LimitControl } from './papers/limit-control/limit-control';
import { PaperCardSkeleton } from './papers/paper-card/paper-card-skeleton';
import { PaperCard } from './papers/paper-card/paper-card';
import { checkQuery } from './search/query-check';
import { SearchBar } from './search/search-bar/search-bar';
import { buildSearch, parseState } from './state/url-state';

/** A response together with the query that produced it, so labels never mix the two up. */
interface Found {
  query: string;
  response: SearchResponse;
}

/** A query from the address bar is only trusted if it would pass the same checks as one typed in. */
function stateFromUrl() {
  const state = parseState(location.search);
  return checkQuery(state.q).error ? { ...state, q: '' } : state;
}

const BASE_TITLE = 'Marginalia · Search open research';

@Component({
  selector: 'app-root',
  imports: [
    DecimalPipe,
    I18nPluralPipe,
    PaperCard,
    PaperCardSkeleton,
    LimitControl,
    SearchBar,
    YearChart,
  ],
  styleUrl: './app.css',
  templateUrl: './app.html',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class App {
  private readonly api = inject(CoreApiService);
  private readonly title = inject(Title);
  private readonly searchBar = viewChild.required(SearchBar);

  private readonly initial = stateFromUrl();
  /** What is being searched. Empty means nothing yet. */
  protected readonly query = signal(this.initial.q);
  protected readonly limit = signal(this.initial.limit);

  protected readonly examples = [
    'drone AND (package OR delivery)',
    '"climate change" AND adaptation',
    'crispr NOT review',
  ];
  protected readonly skeletons = [0, 1, 2, 3, 4, 5];
  protected readonly matchLabel = { '=1': 'paper matches', other: 'papers match' };

  protected readonly papers = rxResource({
    // No query, no request: the resource stays idle
    params: () => (this.query() ? { q: this.query(), limit: this.limit() } : undefined),
    stream: ({ params }) =>
      this.api
        .search(params.q, params.limit)
        .pipe(map((response): Found => ({ query: params.q, response }))),
  });

  /** Keeps the previous results on screen while the next ones load, so the page never jumps. */
  protected readonly shown = linkedSignal<Found | undefined, Found | undefined>({
    source: () => (this.papers.hasValue() ? this.papers.value() : undefined),
    computation: (next, previous) => (this.query() ? (next ?? previous?.value) : undefined),
  });

  constructor() {
    // The address bar mirrors the search, so a search can be shared, bookmarked and walked back through.
    effect(() => {
      const state = { q: this.query(), limit: this.limit() };
      const next = buildSearch(state);
      if (next === location.search) return;
      // A new query is a new place in history; changing only the count just refines this one
      const sameQuery = parseState(location.search).q === state.q;
      history[sameQuery ? 'replaceState' : 'pushState'](null, '', location.pathname + next);
    });

    effect(() => {
      const q = this.query();
      this.title.setTitle(q ? `${q} · Marginalia` : BASE_TITLE);
    });

    // Back and forward change the address; follow it
    const follow = () => {
      const state = stateFromUrl();
      this.query.set(state.q);
      this.limit.set(state.limit);
    };
    addEventListener('popstate', follow);
    inject(DestroyRef).onDestroy(() => removeEventListener('popstate', follow));
  }

  /** "/" jumps to the search box, unless the person is already typing somewhere. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    this.searchBar().focus();
  }

  protected readonly errorMessage = () =>
    this.papers.error() ? describeError(this.papers.error()) : '';

  protected exportCsv(found: Found): void {
    downloadText(csvFilename(found.query), papersToCsv(found.response.results));
  }

  protected search(query: string): void {
    // Searching the same thing again is a request to refresh it
    if (query && query === this.query()) {
      this.papers.reload();
    } else {
      this.query.set(query);
    }
  }
}
