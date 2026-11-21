import { DecimalPipe, I18nPluralPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CoreApiService } from './data/core-api.service';
import { PaperCard } from './papers/paper-card/paper-card';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, I18nPluralPipe, PaperCard],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly api = inject(CoreApiService);

  // Fixed for now; the search bar and limit control arrive in later commits.
  protected readonly query = signal('drone');
  protected readonly limit = signal(10);

  protected readonly matchLabel = { '=1': 'paper matches', other: 'papers match' };

  protected readonly papers = rxResource({
    params: () => ({ q: this.query(), limit: this.limit() }),
    stream: ({ params }) => this.api.search(params.q, params.limit),
  });
}
