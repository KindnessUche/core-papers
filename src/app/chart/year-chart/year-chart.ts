import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Paper } from '../../data/paper.model';
import { yearOf } from '../../papers/paper-card/paper-format';
import { binYears, isPlausibleYear, niceScale } from '../year-bins';

const HEIGHT = 240;
const MARGIN = { top: 22, right: 8, bottom: 28, left: 34 };
const MAX_BAR = 24; // bars are never thicker than this; spare room stays as air
const GAP = 2; // surface-coloured gap between neighbouring bars
const MIN_BAND = 10; // narrowest a year's slot may get before bins widen
const LABEL_SPACE = 46; // room an x-axis label needs

/** A column with a 4px rounded top and a square foot, as one closed shape. */
function columnPath(x: number, y: number, width: number, height: number, baseline: number): string {
  const r = Math.min(4, width / 2, height);
  const right = x + width;
  return (
    `M${x},${baseline}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}` +
    `H${right - r}A${r},${r} 0 0 1 ${right},${y + r}V${baseline}Z`
  );
}

/**
 * Papers per year for the papers on screen, as a column chart. The tallest bar is the only
 * one in the accent colour, so the eye lands on when the field peaked.
 * Every value is also reachable without a pointer: arrow keys step through the bars, and a
 * table view lists the same numbers.
 */
@Component({
  selector: 'app-year-chart',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './year-chart.css',
  templateUrl: './year-chart.html',
})
export class YearChart {
  readonly papers = input.required<readonly Paper[]>();
  /** How many papers match in CORE, so the chart can say how much of them it is looking at. */
  readonly total = input.required<number>();

  protected readonly height = HEIGHT;
  protected readonly margin = MARGIN;
  protected readonly width = signal(640);
  protected readonly active = signal<number | null>(null);

  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const el = this.frame().nativeElement;
      const measure = () => {
        const w = Math.round(el.clientWidth);
        if (w > 0) this.width.set(w);
      };
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private readonly years = computed(() => {
    const all = this.papers().map(yearOf);
    return {
      valid: all.filter((y): y is number => isPlausibleYear(y)),
      skipped: all.filter((y) => !isPlausibleYear(y)).length,
    };
  });

  protected readonly skipped = computed(() => this.years().skipped);
  protected readonly shownCount = computed(() => this.papers().length);
  protected readonly coversAll = computed(() => this.total() <= this.shownCount());

  private readonly innerW = computed(() => Math.max(40, this.width() - MARGIN.left - MARGIN.right));
  protected readonly innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  protected readonly baseline = MARGIN.top + this.innerH;

  protected readonly bins = computed(() =>
    binYears(this.years().valid, Math.max(6, Math.floor(this.innerW() / MIN_BAND))),
  );

  /** Index of the tallest bin (the first, if several tie). */
  protected readonly peak = computed(() => {
    const bins = this.bins();
    let best = 0;
    bins.forEach((b, i) => {
      if (b.count > bins[best].count) best = i;
    });
    return best;
  });

  protected readonly scale = computed(() => niceScale(Math.max(0, ...this.bins().map((b) => b.count))));

  protected readonly ticks = computed(() =>
    this.scale().ticks.map((value) => ({
      value,
      y: this.baseline - (value / this.scale().max) * this.innerH,
    })),
  );

  protected readonly band = computed(() => this.innerW() / Math.max(1, this.bins().length));

  protected readonly bars = computed(() => {
    const band = this.band();
    const barWidth = Math.max(2, Math.min(MAX_BAR, band - GAP));
    const { max } = this.scale();
    return this.bins().map((bin, i) => {
      const height = bin.count === 0 ? 0 : Math.max(2, (bin.count / max) * this.innerH);
      const x = MARGIN.left + i * band + (band - barWidth) / 2;
      const y = this.baseline - height;
      return {
        bin,
        bandX: MARGIN.left + i * band,
        y,
        path: columnPath(x, y, barWidth, height, this.baseline),
      };
    });
  });

  /** Axis labels thin out so neighbours never touch. */
  protected readonly labels = computed(() => {
    const every = Math.max(1, Math.ceil(LABEL_SPACE / this.band()));
    return this.bars()
      .map((bar, i) => ({ text: bar.bin.label, x: bar.bandX + this.band() / 2, i }))
      .filter((l) => l.i % every === 0);
  });

  protected readonly tooltip = computed(() => {
    const i = this.active();
    const bar = i === null ? null : this.bars()[i];
    if (!bar) return null;
    const left = Math.min(Math.max(bar.bandX + this.band() / 2, 64), this.width() - 64);
    return { bin: bar.bin, left, top: Math.max(bar.y - 10, 52) };
  });

  protected readonly summary = computed(() => {
    const bins = this.bins();
    if (bins.length === 0) return 'No publication years to chart.';
    const peak = bins[this.peak()];
    const unit = peak.count === 1 ? 'paper' : 'papers';
    return (
      `Papers by year, from ${bins[0].range.split('–')[0]} to ${bins.at(-1)!.end}. ` +
      `The most, ${peak.count} ${unit}, were published in ${peak.range}. ` +
      `Use the left and right arrow keys to read each bar.`
    );
  });

  protected onKey(event: KeyboardEvent): void {
    const last = this.bins().length - 1;
    const current = this.active();
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
        next = current === null ? 0 : Math.min(last, current + 1);
        break;
      case 'ArrowLeft':
        next = current === null ? last : Math.max(0, current - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      case 'Escape':
        this.active.set(null);
        return;
      default:
        return;
    }
    event.preventDefault();
    this.active.set(next);
  }
}
