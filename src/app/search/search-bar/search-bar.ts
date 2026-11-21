import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { checkQuery } from '../query-check';

let nextId = 0;

/**
 * Boolean search box. It owns the text being typed and tells its parent only when the
 * person submits a query that passes the checks. Empty text means "clear the search".
 * Project the result-count control into it with the `settings` attribute.
 */
@Component({
  selector: 'app-search-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './search-bar.css',
  templateUrl: './search-bar.html',
})
export class SearchBar {
  /** The query currently being searched. Changing it replaces whatever is typed. */
  readonly query = input('');
  readonly busy = input(false);
  readonly search = output<string>();

  protected readonly noteId = `search-note-${nextId++}`;
  private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

  protected readonly draft = linkedSignal(() => this.query());
  protected readonly check = computed(() => checkQuery(this.draft()));

  /**
   * Mistakes are shown when the person leaves the field or presses Search, and hidden
   * again as soon as they resume typing. Nobody wants an error for a half-typed "(drone AND".
   */
  private readonly checked = signal(false);
  protected readonly showError = computed(() => this.checked() && this.check().error !== null);

  protected onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
    this.checked.set(false);
  }

  protected onBlur(): void {
    this.checked.set(true);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.checked.set(true);
    if (this.check().error) {
      this.box().nativeElement.focus();
      return;
    }
    this.search.emit(this.draft().trim());
  }

  protected clear(): void {
    this.draft.set('');
    this.checked.set(false);
    this.box().nativeElement.focus();
    this.search.emit('');
  }
}
