import { TestBed } from '@angular/core/testing';
import { Paper } from '../../data/paper.model';
import { PaperCard } from './paper-card';

function render(paper: Paper): HTMLElement {
  const fixture = TestBed.createComponent(PaperCard);
  fixture.componentRef.setInput('paper', paper);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PaperCard', () => {
  it('shows the details it has', () => {
    const el = render({
      id: 1,
      title: 'Delivery drones in cities',
      yearPublished: 2021,
      authors: [{ name: 'A. Okafor' }],
      abstract: 'We study <b>routing</b>.',
      journals: [{ title: 'Journal of Drones' }],
      downloadUrl: 'https://example.org/paper.pdf',
      doi: '10.1000/xyz',
      citationCount: 1,
    });
    const text = el.textContent ?? '';
    expect(text).toContain('Delivery drones in cities');
    expect(text).toContain('2021');
    expect(text).toContain('Journal of Drones');
    expect(text).toContain('We study routing.');
    expect(text).toContain('1 citation');
    expect(el.querySelector<HTMLAnchorElement>('.primary')?.href).toBe('https://example.org/paper.pdf');
    expect(el.querySelector<HTMLAnchorElement>('.link:not(.primary)')?.href).toBe('https://doi.org/10.1000/xyz');
  });

  it('leaves out what is missing instead of showing placeholders', () => {
    const el = render({ id: 2 });
    expect(el.querySelector('.title')?.textContent).toContain('Untitled paper');
    for (const selector of ['.meta', '.authors', '.abstract', '.foot']) {
      expect(el.querySelector(selector)).toBeNull();
    }
  });
});
