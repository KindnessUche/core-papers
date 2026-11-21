import { DecimalPipe, I18nPluralPipe } from '@angular/common';
import { Component, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CoreApiService } from './data/core-api.service';
import { SearchResponse } from './data/paper.model';
import { LimitControl } from './papers/limit-control/limit-control';
import { PaperCard } from './papers/paper-card/paper-card';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, I18nPluralPipe, PaperCard, LimitControl],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly api = inject(CoreApiService);

  // The query is fixed for now; the search bar arrives in the next commit.
  protected readonly query = signal('drone');
  protected readonly limit = signal(10);

  protected readonly matchLabel = { '=1': 'paper matches', other: 'papers match' };

  protected readonly papers = rxResource({
    params: () => ({ q: this.query(), limit: this.limit() }),
    stream: ({ params }) => this.api.search(params.q, params.limit),
  });

  /** Keeps the previous results on screen while the next ones load, so the page never jumps. */
  protected readonly shown = linkedSignal<SearchResponse | undefined, SearchResponse | undefined>({
    source: () => this.papers.value(),
    computation: (next, previous) => next ?? previous?.value,
  });
}
