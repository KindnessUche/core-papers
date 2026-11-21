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
import { binCounts, isPlausibleYear, niceScale } from '../year-bins';

const HEIGHT = 240;
const MARGIN = { top: 22, right: 8, bottom: 28, left: 34 };
const MAX_BAR = 24; // bars are never thicker than this; spare room stays as air
const GAP = 2; // surface-coloured gap between neighbouring bars
const MIN_BAND = 10; // narrowest a year's slot may get before bins widen
const LABEL_SPACE = 46; // room an x-axis label needs
const MIN_SPAN = 3; // fewest years a zoomed view may show
const MAX_Y_ZOOM = 16;
const DRAG_THRESHOLD = 8; // px; below this a press is a click, not a selection

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
 * Papers per year across every paper that matches the search, as a column chart. The tallest bar is the only
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
  /** Papers per publication year across every match, keyed by year. */
  readonly counts = input.required<Readonly<Record<string, number>>>();
  /** How many papers match in CORE, so the chart can say how many have no usable year. */
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
    const valid: [number, number][] = [];
    for (const [key, count] of Object.entries(this.counts())) {
      const year = Number(key);
      if (isPlausibleYear(year) && count > 0) valid.push([year, count]);
    }
    valid.sort((x, y) => x[0] - y[0]);
    return { valid };
  });

  /** First and last year with papers: the widest the chart can ever show. */
  private readonly extent = computed(() => {
    const { valid } = this.years();
    return valid.length ? { from: valid[0][0], to: valid.at(-1)![0] } : null;
  });

  /** The years on screen. Null is the default: everything, so the biggest bar always fits. */
  protected readonly range = signal<{ from: number; to: number } | null>(null);
  /** How much taller bars are drawn. 1 fits the tallest bar exactly. */
  protected readonly yZoom = signal(1);
  /** A drag in progress, as plot x positions. */
  protected readonly selection = signal<{ x1: number; x2: number } | null>(null);

  protected readonly view = computed(() => {
    const extent = this.extent();
    const range = this.range();
    if (!extent) return null;
    return range
      ? { from: Math.max(extent.from, range.from), to: Math.min(extent.to, range.to) }
      : extent;
  });

  protected readonly zoomed = computed(() => this.range() !== null || this.yZoom() > 1);
  protected readonly canZoomInX = computed(() => {
    const v = this.view();
    return !!v && v.to - v.from + 1 > MIN_SPAN;
  });
  protected readonly canZoomOutX = computed(() => this.range() !== null);
  protected readonly canPan = computed(() => this.range() !== null);

  /** Papers that match but have no year CORE could count, or one that isn't a real year. */
  protected readonly skipped = computed(() => {
    const counted = this.years().valid.reduce((sum, [, count]) => sum + count, 0);
    return Math.max(0, this.total() - counted);
  });
  protected readonly chartedCount = computed(() => this.total() - this.skipped());

  private readonly innerW = computed(() => Math.max(40, this.width() - MARGIN.left - MARGIN.right));
  protected readonly innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  protected readonly baseline = MARGIN.top + this.innerH;

  protected readonly bins = computed(() => {
    const view = this.view();
    if (!view) return [];
    const inView = this.years().valid.filter(([year]) => year >= view.from && year <= view.to);
    return binCounts(inView, Math.max(6, Math.floor(this.innerW() / MIN_BAND)), view);
  });

  /** The tallest bar's height, in papers. */
  private readonly tallest = computed(() => Math.max(0, ...this.bins().map((b) => b.count)));
  protected readonly canZoomInY = computed(
    () => this.yZoom() < MAX_Y_ZOOM && this.tallest() / (this.yZoom() * 2) >= 2,
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

  protected readonly scale = computed(() => niceScale(this.tallest() / this.yZoom()));

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
      const clipped = bin.count > max;
      const height = bin.count === 0 ? 0 : Math.max(2, Math.min(1, bin.count / max) * this.innerH);
      const x = MARGIN.left + i * band + (band - barWidth) / 2;
      const y = this.baseline - height;
      return {
        bin,
        bandX: MARGIN.left + i * band,
        y,
        clipped,
        notchX: x,
        notchW: barWidth,
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
      (this.zoomed() ? 'Zoomed in. ' : '') +
      `The most, ${peak.count} ${unit}, were published in ${peak.range}. ` +
      `Use the left and right arrow keys to read each bar. Plus and minus zoom, zero resets.`
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
        this.selection.set(null);
        return;
      case '+':
      case '=':
        event.preventDefault();
        this.zoomX(1);
        return;
      case '-':
        event.preventDefault();
        this.zoomX(-1);
        return;
      case '0':
        event.preventDefault();
        this.reset();
        return;
      default:
        return;
    }
    event.preventDefault();
    this.active.set(next);
  }

  /** Halves (direction 1) or doubles (-1) the years on screen, around the bar being read if there is one. */
  protected zoomX(direction: 1 | -1): void {
    const view = this.view();
    const extent = this.extent();
    if (!view || !extent) return;
    const span = view.to - view.from + 1;
    const bar = this.active() === null ? null : this.bins()[this.active()!];
    const centre = bar ? (bar.start + bar.end) / 2 : (view.from + view.to) / 2;
    const nextSpan = direction === 1 ? Math.max(MIN_SPAN, Math.round(span / 2)) : span * 2;
    this.setRange(Math.round(centre - (nextSpan - 1) / 2), nextSpan);
  }

  /** Slides the window by half its width. */
  protected pan(direction: 1 | -1): void {
    const view = this.view();
    if (!view || !this.range()) return;
    const span = view.to - view.from + 1;
    this.setRange(view.from + direction * Math.max(1, Math.round(span / 2)), span);
  }

  /** Keeps a window of `span` years inside the data; the full extent goes back to the default. */
  private setRange(from: number, span: number): void {
    const extent = this.extent()!;
    const total = extent.to - extent.from + 1;
    if (span >= total) {
      this.range.set(null);
      return;
    }
    const start = Math.min(Math.max(from, extent.from), extent.to - span + 1);
    this.range.set({ from: start, to: start + span - 1 });
  }

  protected zoomY(direction: 1 | -1): void {
    this.yZoom.update((z) => (direction === 1 ? Math.min(MAX_Y_ZOOM, z * 2) : Math.max(1, z / 2)));
  }

  protected reset(): void {
    this.range.set(null);
    this.yZoom.set(1);
    this.selection.set(null);
  }

  private plotX(event: PointerEvent): number {
    const rect = this.frame().nativeElement.getBoundingClientRect();
    return Math.min(Math.max(event.clientX - rect.left, MARGIN.left), this.width() - MARGIN.right);
  }

  protected dragStart(event: PointerEvent): void {
    if (event.button !== 0 || this.bins().length < 2) return;
    const x = this.plotX(event);
    this.selection.set({ x1: x, x2: x });
    this.frame().nativeElement.setPointerCapture?.(event.pointerId);
  }

  protected dragMove(event: PointerEvent): void {
    const sel = this.selection();
    if (sel) this.selection.set({ ...sel, x2: this.plotX(event) });
  }

  /** Releasing a drag zooms to the bars it covered. A short press is just a press. */
  protected dragEnd(): void {
    const sel = this.selection();
    this.selection.set(null);
    if (!sel || Math.abs(sel.x2 - sel.x1) < DRAG_THRESHOLD) return;
    const bins = this.bins();
    const index = (x: number) =>
      Math.min(bins.length - 1, Math.max(0, Math.floor((x - MARGIN.left) / this.band())));
    const first = bins[index(Math.min(sel.x1, sel.x2))];
    const last = bins[index(Math.max(sel.x1, sel.x2))];
    const span = Math.max(MIN_SPAN, last.end - first.start + 1);
    this.setRange(first.start, span);
  }

  protected readonly selectionRect = computed(() => {
    const sel = this.selection();
    return sel ? { x: Math.min(sel.x1, sel.x2), width: Math.abs(sel.x2 - sel.x1) } : null;
  });

  protected readonly viewLabel = computed(() => {
    const v = this.view();
    if (!v) return '';
    return v.from === v.to ? `${v.from}` : `${v.from}–${v.to}`;
  });
}
