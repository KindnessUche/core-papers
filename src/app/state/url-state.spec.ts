import { buildSearch, parseState } from './url-state';

describe('parseState', () => {
  it('reads the query and the limit', () => {
    expect(parseState('?q=drone&n=25')).toEqual({ q: 'drone', limit: 25, page: 1 });
  });

  it('uses defaults for an empty or unrelated URL', () => {
    expect(parseState('')).toEqual({ q: '', limit: 10, page: 1 });
    expect(parseState('?utm_source=x')).toEqual({ q: '', limit: 10, page: 1 });
  });

  it('ignores a limit the control does not offer', () => {
    expect(parseState('?q=a&n=7').limit).toBe(10);
    expect(parseState('?q=a&n=abc').limit).toBe(10);
    expect(parseState('?q=a&n=100000').limit).toBe(10);
  });

  it('reads the page, and keeps it within what exists', () => {
    expect(parseState('?q=a&p=3')).toEqual({ q: 'a', limit: 10, page: 3 });
    expect(parseState('?q=a&p=0').page).toBe(1);
    expect(parseState('?q=a&p=-2').page).toBe(1);
    expect(parseState('?q=a&p=2.5').page).toBe(1);
    expect(parseState('?q=a&p=abc').page).toBe(1);
    expect(parseState('?q=a&p=99999').page).toBe(1000); // 10,000 results at 10 a page
    expect(parseState('?q=a&n=100&p=99999').page).toBe(100);
  });

  it('trims the query and caps its length', () => {
    expect(parseState('?q=%20%20drone%20').q).toBe('drone');
    expect(parseState(`?q=${'a'.repeat(900)}`).q).toHaveLength(500);
  });
});

describe('buildSearch', () => {
  it('leaves out defaults', () => {
    expect(buildSearch({ q: '', limit: 10, page: 1 })).toBe('');
    expect(buildSearch({ q: '', limit: 50, page: 4 })).toBe('');
    expect(buildSearch({ q: 'drone', limit: 10, page: 1 })).toBe('?q=drone');
    expect(buildSearch({ q: 'drone', limit: 50, page: 1 })).toBe('?q=drone&n=50');
    expect(buildSearch({ q: 'drone', limit: 25, page: 3 })).toBe('?q=drone&n=25&p=3');
  });

  it('round-trips awkward queries', () => {
    const q = '"climate change" AND (adaptation OR policy) NOT review & more=1';
    expect(parseState(buildSearch({ q, limit: 25, page: 7 }))).toEqual({ q, limit: 25, page: 7 });
  });
});
