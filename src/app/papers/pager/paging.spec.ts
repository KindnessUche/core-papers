import { pageCount, pageWindow } from './paging';

describe('pageCount', () => {
  it('rounds up, and is never less than one', () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(1, 25)).toBe(1);
    expect(pageCount(25, 25)).toBe(1);
    expect(pageCount(26, 25)).toBe(2);
    expect(pageCount(-5, 10)).toBe(1);
  });

  it('stops at the paging depth', () => {
    expect(pageCount(71_213, 10)).toBe(1000);
    expect(pageCount(71_213, 25)).toBe(400);
    expect(pageCount(71_213, 50)).toBe(200);
    expect(pageCount(71_213, 100)).toBe(100);
    expect(pageCount(10_000, 100)).toBe(100);
  });
});

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps the current page and its neighbours in view', () => {
    expect(pageWindow(1, 100)).toEqual([1, 2, 3, 4, 5, 'gap', 100]);
    expect(pageWindow(4, 100)).toEqual([1, 2, 3, 4, 5, 'gap', 100]);
    expect(pageWindow(50, 100)).toEqual([1, 'gap', 49, 50, 51, 'gap', 100]);
    expect(pageWindow(97, 100)).toEqual([1, 'gap', 96, 97, 98, 99, 100]);
    expect(pageWindow(100, 100)).toEqual([1, 'gap', 96, 97, 98, 99, 100]);
  });

  it('always has seven items beyond seven pages, and always includes the current page', () => {
    for (const last of [8, 9, 20, 400]) {
      for (let current = 1; current <= last; current++) {
        const items = pageWindow(current, last);
        expect(items).toHaveLength(7);
        expect(items).toContain(current);
        expect(items[0]).toBe(1);
        expect(items.at(-1)).toBe(last);
      }
    }
  });
});
