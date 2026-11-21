import { TestBed } from '@angular/core/testing';
import { Paper } from '../../data/paper.model';
import { YearChart } from './year-chart';

function countByYear(papers: Paper[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of papers) {
    if (p.yearPublished != null) counts[p.yearPublished] = (counts[p.yearPublished] ?? 0) + 1;
  }
  return counts;
}

function render(papers: Paper[], total = papers.length) {
  const fixture = TestBed.createComponent(YearChart);
  fixture.componentRef.setInput('counts', countByYear(papers));
  fixture.componentRef.setInput('total', total);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, text: () => el.textContent!.replace(/\s+/g, ' ') };
}

/** Text of each child element, space-separated, the way a reader sees separate cells. */
const cells = (el: Element | null) =>
  Array.from(el?.children ?? [])
    .map((c) => c.textContent!.trim())
    .join(' ');

const papers: Paper[] = [
  { id: 1, yearPublished: 2020 },
  { id: 2, yearPublished: 2020 },
  { id: 3, yearPublished: 2020 },
  { id: 4, yearPublished: 2018 },
  { id: 5, yearPublished: 2022 },
  { id: 6, yearPublished: null },
  { id: 7, yearPublished: 1 }, // not a real year
];

describe('YearChart', () => {
  it('draws a bar for each year that has papers, and only the tallest is the accent colour', () => {
    const { el } = render(papers);
    expect(el.querySelectorAll('path.bar').length).toBe(3); // 2018, 2020, 2022; 2019 and 2021 are empty
    const peaks = el.querySelectorAll('path.bar.peak');
    expect(peaks.length).toBe(1);
    expect(el.querySelector('.peak-label')?.textContent?.trim()).toBe('3');
  });

  it('lists the same numbers in the table view, including empty years', () => {
    const { el } = render(papers);
    const rows = Array.from(el.querySelectorAll('tbody tr')).map(cells);
    expect(rows).toEqual(['2018 1', '2019 0', '2020 3', '2021 0', '2022 1']);
  });

  it('says it counted every match, and how many have no usable year', () => {
    const { text } = render(papers, 71213);
    expect(text()).toContain('Counted across all 71,213 papers that match.');
    // Only 5 of the 71,213 have a year CORE could count
    expect(text()).toContain('71,208 without a usable year are left out.');
  });

  it('leaves nothing out when every match has a year', () => {
    const { text } = render([{ id: 1, yearPublished: 2020 }]);
    expect(text()).toContain('Counted across all 1 paper that match.');
    expect(text()).not.toContain('left out');
  });

  it('explains itself when no paper has a year', () => {
    const { el, text } = render([{ id: 1 }, { id: 2, yearPublished: null }]);
    expect(el.querySelector('svg')).toBeNull();
    expect(text()).toContain('nothing to chart');
  });

  it('shows a tooltip for the bar under the arrow keys, and hides it on Escape', () => {
    const { fixture, el } = render(papers);
    const plot = el.querySelector<HTMLElement>('.plot')!;
    const press = (key: string) => {
      plot.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };

    press('ArrowRight'); // first bar: 2018
    expect(cells(el.querySelector('.tip'))).toBe('1 paper 2018');
    press('ArrowRight');
    press('ArrowRight'); // 2020
    expect(el.querySelector('.tip')?.textContent).toContain('3');
    expect(el.querySelector('.tip')?.textContent).toContain('2020');
    press('End');
    expect(el.querySelector('.tip')?.textContent).toContain('2022');
    press('Escape');
    expect(el.querySelector('.tip')).toBeNull();
  });

  it('describes the chart to screen readers', () => {
    const { el } = render(papers);
    const label = el.querySelector('.plot')!.getAttribute('aria-label')!;
    expect(label).toContain('The most, 3 papers, were published in 2020');
  });
});

describe('YearChart zoom', () => {
  const many: Paper[] = [
    ...Array.from({ length: 8 }, (_, i) => ({ id: 100 + i, yearPublished: 2000 })),
    ...Array.from({ length: 2 }, (_, i) => ({ id: 200 + i, yearPublished: 2010 })),
    { id: 300, yearPublished: 2020 },
  ];
  const click = (fixture: { detectChanges(): void }, el: HTMLElement, label: string) => {
    el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
    fixture.detectChanges();
  };

  it('starts at the default view with reset disabled', () => {
    const { el } = render(many);
    expect(el.querySelector<HTMLButtonElement>('.reset')!.disabled).toBe(true);
    expect(el.querySelector('.hint')!.textContent).toContain('Drag across the chart');
  });

  it('zooming in narrows the years, and reset returns to the full range', () => {
    const { fixture, el } = render(many);
    const before = el.querySelectorAll('tbody tr').length;
    click(fixture, el, 'Zoom in on years');
    expect(el.querySelectorAll('tbody tr').length).toBeLessThan(before);
    expect(el.querySelector('.hint')!.textContent).toMatch(/Showing\s+\d{4}–\d{4}/);

    el.querySelector<HTMLButtonElement>('.reset')!.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('tbody tr').length).toBe(before);
    expect(el.querySelector<HTMLButtonElement>('.reset')!.disabled).toBe(true);
  });

  it('never zooms outside the years that have papers', () => {
    const { fixture, el } = render(many);
    click(fixture, el, 'Zoom in on years');
    for (let i = 0; i < 4; i++) click(fixture, el, 'Move to earlier years');
    const years = Array.from(el.querySelectorAll('tbody th')).map((th) => th.textContent!.trim());
    expect(Number.parseInt(years[0], 10)).toBeGreaterThanOrEqual(2000);
    for (let i = 0; i < 8; i++) click(fixture, el, 'Move to later years');
    const later = Array.from(el.querySelectorAll('tbody th')).map((th) => th.textContent!.trim());
    expect(Number.parseInt(later.at(-1)!, 10)).toBeLessThanOrEqual(2020);
  });

  it('taller bars cut the biggest bars off and mark them, keeping the real value in the table', () => {
    const { fixture, el } = render(many);
    click(fixture, el, 'Make bars taller');
    expect(el.querySelectorAll('rect.notch').length).toBeGreaterThan(0);
    expect(el.querySelector('.hint')!.textContent).toContain('2× taller');
    const rows = Array.from(el.querySelectorAll('tbody tr')).map((r) => r.textContent!.replace(/\s+/g, '').trim());
    expect(rows.join('|')).toContain('20008');
    el.querySelector<HTMLButtonElement>('.reset')!.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('rect.notch').length).toBe(0);
  });

  it('plus, minus and 0 work from the keyboard', () => {
    const { fixture, el } = render(many);
    const plot = el.querySelector<HTMLElement>('.plot')!;
    const press = (key: string) => {
      plot.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    press('+');
    expect(el.querySelector('.hint')!.textContent).toContain('Showing');
    press('0');
    expect(el.querySelector('.hint')!.textContent).toContain('Drag across');
  });
});
