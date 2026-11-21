import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Paper } from '../../data/paper.model';
import {
  authorLine,
  citationLabel,
  cleanAbstract,
  doiUrl,
  httpUrl,
  venueOf,
  yearOf,
} from './paper-format';

@Component({
  selector: 'app-paper-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './paper-card.css',
  templateUrl: './paper-card.html',
})
export class PaperCard {
  readonly paper = input.required<Paper>();

  protected readonly title = computed(() => this.paper().title?.trim() || 'Untitled paper');
  protected readonly year = computed(() => yearOf(this.paper()));
  protected readonly venue = computed(() => venueOf(this.paper()));
  protected readonly authors = computed(() => authorLine(this.paper().authors));
  protected readonly abstract = computed(() => cleanAbstract(this.paper().abstract));
  protected readonly citations = computed(() => citationLabel(this.paper().citationCount));
  protected readonly type = computed(() => this.paper().documentType?.trim() ?? '');
  protected readonly readUrl = computed(() => httpUrl(this.paper().downloadUrl));
  protected readonly doi = computed(() => doiUrl(this.paper().doi));
}
