import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

let nextId = 0;

/** Segmented radio group that picks how many papers to fetch. Two-way bind with `[(value)]`. */
@Component({
  selector: 'app-limit-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './limit-control.css',
  templateUrl: './limit-control.html',
})
export class LimitControl {
  readonly value = model.required<number>();
  readonly options = input<readonly number[]>([10, 25, 50, 100]);

  protected readonly id = `limit-${nextId++}`;
  protected readonly index = computed(() => Math.max(0, this.options().indexOf(this.value())));
}
