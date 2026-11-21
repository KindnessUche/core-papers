import { DecimalPipe, I18nPluralPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { map } from 'rxjs';
import { CoreApiService } from './data/core-api.service';
import { describeError } from './data/describe-error';
import { SearchResponse } from './data/paper.model';
import { csvFilename, downloadText, papersToCsv } from './export/papers-csv';
import { YearChart } from './chart/year-chart/year-chart';
import { LimitControl } from './papers/limit-control/limit-control';
import { Pager } from './papers/pager/pager';
import { pageCount } from './papers/pager/paging';
import { PaperCardSkeleton } from './papers/paper-card/paper-card-skeleton';
import { PaperCard } from './papers/paper-card/paper-card';
import { MAX_RESULTS } from './search/limits';
import { checkQuery } from './search/query-check';
import { SearchBar } from './search/search-bar/search-bar';
import { buildSearch, parseState } from './state/url-state';

/** A response together with the query that produced it, so labels never mix the two up. */
interface Found {
  query: string;
  response: SearchResponse;
  /** Where this page starts, and how big the pages were, when it was fetched. */
  offset: number;
  limit: number;
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
    Pager,
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
  private readonly results = viewChild.required<ElementRef<HTMLElement>>('results');

  private readonly initial = stateFromUrl();
  /** What is being searched. Empty means nothing yet. */
  protected readonly query = signal(this.initial.q);
  /** Papers per page. */
  protected readonly limit = signal(this.initial.limit);
  /** Which page of results, counting from 1. */
  protected readonly page = signal(this.initial.page);
  protected readonly maxResults = MAX_RESULTS;

  protected readonly examples = [
    'drone AND (package OR delivery)',
    '"climate change" AND adaptation',
    'crispr NOT review',
  ];
  protected readonly skeletons = [0, 1, 2, 3, 4, 5];
  protected readonly matchLabel = { '=1': 'paper matches', other: 'papers match' };

  protected readonly papers = rxResource({
    // No query, no request: the resource stays idle
    params: () =>
      this.query()
        ? { q: this.query(), limit: this.limit(), offset: (this.page() - 1) * this.limit() }
        : undefined,
    stream: ({ params }) =>
      this.api.search(params.q, params.limit, params.offset).pipe(
        map(
          (response): Found => ({
            query: params.q,
            response,
            offset: params.offset,
            limit: params.limit,
          }),
        ),
      ),
  });

  /**
   * Papers per year across every match, counted by CORE. It depends on the query alone, so
   * paging and changing the page size never refetch it.
   */
  protected readonly years = rxResource({
    params: () => (this.query() ? { q: this.query() } : undefined),
    stream: ({ params }) => this.api.yearCounts(params.q),
  });

  /** Keeps the previous results on screen while the next ones load, so the page never jumps. */
  protected readonly shown = linkedSignal<Found | undefined, Found | undefined>({
    source: () => (this.papers.hasValue() ? this.papers.value() : undefined),
    computation: (next, previous) => (this.query() ? (next ?? previous?.value) : undefined),
  });

  constructor() {
    // The address bar mirrors the search, so a search can be shared, bookmarked and walked back through.
    effect(() => {
      const state = { q: this.query(), limit: this.limit(), page: this.page() };
      const next = buildSearch(state);
      if (next === location.search) return;
      // A new query or a new page is a new place in history. Changing the page size only
      // refines where you already are, so it replaces the entry instead of adding one.
      const current = parseState(location.search);
      const refinesOnly =
        current.q === state.q && (current.limit !== state.limit || current.page === state.page);
      history[refinesOnly ? 'replaceState' : 'pushState'](null, '', location.pathname + next);
    });

    effect(() => {
      const q = this.query();
      const page = this.page();
      this.title.setTitle(q ? `${q}${page > 1 ? ` · page ${page}` : ''} · Marginalia` : BASE_TITLE);
    });

    // Back and forward change the address; follow it
    const follow = () => {
      const state = stateFromUrl();
      this.query.set(state.q);
      this.limit.set(state.limit);
      this.page.set(state.page);
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

  protected pagesOf(found: Found): number {
    return pageCount(found.response.totalHits, found.limit);
  }

  protected exportCsv(found: Found): void {
    const page = Math.floor(found.offset / found.limit) + 1;
    downloadText(csvFilename(found.query, new Date(), page), papersToCsv(found.response.results));
  }

  protected search(query: string): void {
    // Searching the same thing again is a request to refresh it
    if (query && query === this.query()) {
      this.papers.reload();
      this.years.reload();
    } else {
      this.page.set(1);
      this.query.set(query);
    }
  }

  /** A new page size keeps you near the paper you were looking at, rather than jumping to page 1. */
  protected setLimit(next: number): void {
    const firstShown = (this.page() - 1) * this.limit();
    this.limit.set(next);
    this.page.set(Math.floor(firstShown / next) + 1);
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.results().nativeElement.scrollIntoView?.({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
}
