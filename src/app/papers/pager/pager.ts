import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { pageWindow } from './paging';

/** Previous / numbered pages / Next. On a phone the numbers give way to "Page 3 of 400". */
@Component({
  selector: 'app-pager',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './pager.css',
  templateUrl: './pager.html',
})
export class Pager {
  readonly page = input.required<number>();
  readonly pageCount = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly items = computed(() => pageWindow(this.page(), this.pageCount()));

  protected go(target: number): void {
    if (target >= 1 && target <= this.pageCount() && target !== this.page()) {
      this.pageChange.emit(target);
    }
  }
}
