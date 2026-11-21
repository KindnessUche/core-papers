import { DecimalPipe, I18nPluralPipe } from '@angular/common';
import { Component, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CoreApiService } from './data/core-api.service';
import { describeError } from './data/describe-error';
import { SearchResponse } from './data/paper.model';
import { YearChart } from './chart/year-chart/year-chart';
import { LimitControl } from './papers/limit-control/limit-control';
import { PaperCardSkeleton } from './papers/paper-card/paper-card-skeleton';
import { PaperCard } from './papers/paper-card/paper-card';
import { SearchBar } from './search/search-bar/search-bar';

/** A response together with the query that produced it, so labels never mix the two up. */
interface Found {
  query: string;
  response: SearchResponse;
}

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
})
export class App {
  private readonly api = inject(CoreApiService);

  /** What is being searched. Empty means nothing yet. */
  protected readonly query = signal('');
  protected readonly limit = signal(10);

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

  protected readonly errorMessage = () =>
    this.papers.error() ? describeError(this.papers.error()) : '';

  protected search(query: string): void {
    // Searching the same thing again is a request to refresh it
    if (query && query === this.query()) {
      this.papers.reload();
    } else {
      this.query.set(query);
    }
  }
}
