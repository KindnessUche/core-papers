import { TestBed } from '@angular/core/testing';
import { Paper } from '../../data/paper.model';
import { YearChart } from './year-chart';

function render(papers: Paper[], total = papers.length) {
  const fixture = TestBed.createComponent(YearChart);
  fixture.componentRef.setInput('papers', papers);
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

  it('is honest about being a sample, and about what it left out', () => {
    const { text } = render(papers, 71213);
    expect(text()).toContain('Based on the 7 papers shown, out of 71,213 matches.');
    expect(text()).toContain('2 without a usable year are left out.');
  });

  it('says so when it covers every match', () => {
    const { text } = render([{ id: 1, yearPublished: 2020 }]);
    expect(text()).toContain('Based on all 1 paper that match.');
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
