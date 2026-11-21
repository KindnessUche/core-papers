import { TestBed } from '@angular/core/testing';
import { Pager } from './pager';

function setup(page: number, pageCount: number) {
  const fixture = TestBed.createComponent(Pager);
  fixture.componentRef.setInput('page', page);
  fixture.componentRef.setInput('pageCount', pageCount);
  const emitted: number[] = [];
  fixture.componentInstance.pageChange.subscribe((p) => emitted.push(p));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
  const named = (text: string) => buttons().find((b) => b.textContent!.trim() === text)!;
  return { fixture, el, emitted, buttons, named };
}

describe('Pager', () => {
  it('goes to the next and previous page', () => {
    const { named, emitted } = setup(5, 40);
    named('Next').click();
    named('Previous').click();
    expect(emitted).toEqual([6, 4]);
  });

  it('cannot go before the first page or past the last', () => {
    const first = setup(1, 40);
    expect(first.named('Previous').disabled).toBe(true);
    expect(first.named('Next').disabled).toBe(false);

    const last = setup(40, 40);
    expect(last.named('Next').disabled).toBe(true);
    expect(last.named('Previous').disabled).toBe(false);
  });

  it('jumps to a numbered page, and marks the current one', () => {
    const { el, named, emitted } = setup(5, 40);
    const current = el.querySelector('[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('5');
    named('40').click();
    named('1').click();
    expect(emitted).toEqual([40, 1]);
  });

  it('does not re-emit the page you are already on', () => {
    const { el, emitted } = setup(5, 40);
    el.querySelector<HTMLButtonElement>('[aria-current="page"]')!.click();
    expect(emitted).toEqual([]);
  });

  it('says where you are in words, for narrow screens', () => {
    const { el } = setup(3, 1234);
    expect(el.querySelector('.where')?.textContent?.trim()).toBe('Page 3 of 1,234');
  });

  it('gives every page button an accessible name', () => {
    const { el } = setup(5, 40);
    const labels = Array.from(el.querySelectorAll('.page')).map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Page 1', 'Page 4', 'Page 5', 'Page 6', 'Page 40']);
  });
});
