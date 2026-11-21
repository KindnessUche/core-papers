import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';

const page = (results: object[], totalHits = results.length) => ({
  totalHits,
  limit: 10,
  offset: 0,
  results,
});

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const text = () => el.textContent!.replace(/\s+/g, ' ');
  /** What CORE's year aggregate answers with. Every search also asks for it. */
  let yearCounts: Record<string, number> = {};
  const answerYears = () =>
    http
      .match((r) => r.url === '/core-api/search/works/aggregate')
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush({ aggregations: { yearPublished: yearCounts } }));
  const flushed = async () => {
    answerYears();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const submitQuery = (query: string) => {
    const input = el.querySelector<HTMLInputElement>('input[name="q"]')!;
    input.value = query;
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    TestBed.tick();
  };
  const request = (query: string) =>
    http.expectOne((r) => r.url === '/core-api/search/works' && r.params.get('q') === query);

  /** Creates the app as if the page had been opened at `url`. Nothing is searched until it runs. */
  const start = (url = '/') => {
    history.replaceState(null, '', url);
    fixture = TestBed.createComponent(App);
    el = fixture.nativeElement;
    fixture.detectChanges();
    TestBed.tick();
  };

  beforeEach(async () => {
    yearCounts = {};
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    answerYears();
    http.verify();
    fixture?.destroy();
    history.replaceState(null, '', '/');
    document.title = '';
  });

  it('renders the hero and sends no request until something is searched', () => {
    start();
    expect(el.querySelector('h1')?.textContent).toContain('Read what the world');
    expect(text()).toContain('Nothing on the desk yet');
    http.expectNone('/core-api/search/works');
  });

  it('searches when an example is picked', () => {
    start();
    el.querySelector<HTMLButtonElement>('.example')!.click();
    fixture.detectChanges();
    TestBed.tick();
    request('drone AND (package OR delivery)').flush(page([]));
  });

  it('lists what CORE returns, with the count and the query', async () => {
    start();
    submitQuery('drone');
    expect(text()).toContain('Searching CORE');
    request('drone').flush(
      page([{ id: 1, title: 'Delivery drones in cities', yearPublished: 2021 }], 1234),
    );
    await flushed();

    expect(text()).toContain('Delivery drones in cities');
    expect(text()).toContain('1,234 papers match drone');
  });

  it('charts every match by year, not just the papers on the page', async () => {
    yearCounts = { '2019': 300, '2020': 450, '2021': 150 };
    start();
    submitQuery('drone');
    // The page itself holds a single paper
    request('drone').flush(page([{ id: 1, title: 'A', yearPublished: 2020 }], 900));
    await flushed();

    expect(el.querySelectorAll('path.bar').length).toBe(3);
    expect(el.querySelector('.peak-label')?.textContent?.trim()).toBe('450');
    expect(text()).toContain('Counted across all 900 papers that match.');
  });

  it('asks CORE to aggregate the query by year', async () => {
    start();
    submitQuery('drone AND (package OR delivery)');
    request('drone AND (package OR delivery)').flush(page([{ id: 1 }], 5));
    const agg = http.expectOne((r) => r.url === '/core-api/search/works/aggregate');
    expect(agg.request.method).toBe('POST');
    expect(agg.request.body).toEqual({
      q: 'drone AND (package OR delivery)',
      aggregations: ['yearPublished'],
    });
    agg.flush({ aggregations: { yearPublished: { '2020': 5 } } });
    await flushed();
  });

  it('does not recount the years when the page or page size changes', async () => {
    yearCounts = { '2020': 100 };
    start();
    submitQuery('drone');
    request('drone').flush(page([{ id: 1 }], 100));
    await flushed();

    Array.from(el.querySelectorAll<HTMLButtonElement>('.pager button'))
      .find((b) => b.textContent!.trim() === 'Next')!
      .click();
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne((r) => r.params.get('offset') === '10').flush(page([{ id: 11 }], 100));
    await flushed();
    http.expectNone((r) => r.url === '/core-api/search/works/aggregate');
  });

  it('says so, and offers a retry, when the year counts fail', async () => {
    start();
    submitQuery('drone');
    request('drone').flush(page([{ id: 1, title: 'A' }], 5));
    http
      .expectOne((r) => r.url === '/core-api/search/works/aggregate')
      .flush('nope', { status: 500, statusText: 'Server Error' });
    await flushed();

    expect(text()).toContain('A'); // the papers still show
    expect(text()).toContain("Couldn't load the chart");
    yearCounts = { '2020': 5 };
    el.querySelector<HTMLButtonElement>('.chart-note .retry')!.click();
    fixture.detectChanges();
    TestBed.tick();
    await flushed();
    expect(el.querySelectorAll('path.bar').length).toBe(1);
  });

  it('shows no chart before a search', () => {
    start();
    expect(el.querySelector('app-year-chart')).toBeNull();
  });

  it('fetches again with the new limit, keeping old results on screen meanwhile', async () => {
    start();
    submitQuery('drone');
    request('drone').flush(page([{ id: 1, title: 'First batch' }]));
    await flushed();

    el.querySelector<HTMLInputElement>('input[type="radio"][value="50"]')!.click();
    fixture.detectChanges();
    TestBed.tick();

    const next = http.expectOne((r) => r.params.get('limit') === '50');
    expect(text()).toContain('First batch');
    next.flush(page([{ id: 2, title: 'Second batch' }]));
    await flushed();
    expect(text()).toContain('Second batch');
  });

  it('says so when nothing matches', async () => {
    start();
    submitQuery('zzzz');
    request('zzzz').flush(page([], 0));
    await flushed();
    expect(text()).toContain('No papers match that');
  });

  it('explains a rejected key and retries on request', async () => {
    start();
    submitQuery('drone');
    request('drone').flush('nope', { status: 401, statusText: 'Unauthorized' });
    await flushed();
    expect(text()).toContain("didn't accept the API key");

    el.querySelector<HTMLButtonElement>('.retry')!.click();
    fixture.detectChanges();
    request('drone').flush(page([{ id: 1, title: 'Back again' }]));
    await flushed();
    expect(text()).toContain('Back again');
  });

  it('refuses an invalid query without calling CORE', () => {
    start();
    submitQuery('drone AND (package');
    expect(text()).toContain('Missing a closing ")".');
    http.expectNone('/core-api/search/works');
  });

  it('returns to the starting screen when the search is cleared', async () => {
    start();
    submitQuery('drone');
    request('drone').flush(page([{ id: 1, title: 'A paper' }]));
    await flushed();

    el.querySelector<HTMLButtonElement>('.clear')!.click();
    await flushed();
    expect(text()).toContain('Nothing on the desk yet');
    expect(text()).not.toContain('A paper');
  });

  describe('paging', () => {
    const requestAt = (q: string, offset: string | null, limit = '10') =>
      http.expectOne(
        (r) =>
          r.url === '/core-api/search/works' &&
          r.params.get('q') === q &&
          r.params.get('offset') === offset &&
          r.params.get('limit') === limit,
      );
    const pagerButton = (label: string) =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('.pager button')).find(
        (b) => b.textContent!.trim() === label,
      )!;
    const pick = (size: string) => {
      el.querySelector<HTMLInputElement>(`input[type="radio"][value="${size}"]`)!.click();
      fixture.detectChanges();
      TestBed.tick();
    };
    const papers = (n: number, from = 1) =>
      Array.from({ length: n }, (_, i) => ({ id: from + i, title: `Paper ${from + i}` }));

    it('asks for the next page by offset and says which papers it is showing', async () => {
      start();
      submitQuery('drone');
      request('drone').flush(page(papers(10), 100));
      await flushed();
      expect(text()).toContain('showing 1–10');
      const entries = history.length;

      pagerButton('Next').click();
      fixture.detectChanges();
      TestBed.tick();
      requestAt('drone', '10').flush(page(papers(10, 11), 100));
      await flushed();

      expect(text()).toContain('showing 11–20');
      expect(text()).toContain('Paper 11');
      expect(location.search).toBe('?q=drone&p=2');
      expect(history.length).toBe(entries + 1); // a page is a place you can go Back from
      expect(document.title).toBe('drone · page 2 · Marginalia');
    });

    it('scrolls back to the top of the results when the page changes', async () => {
      start();
      submitQuery('drone');
      request('drone').flush(page(papers(10), 100));
      await flushed();

      const calls: ScrollIntoViewOptions[] = [];
      HTMLElement.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) {
        calls.push(options as ScrollIntoViewOptions);
      };
      try {
        pagerButton('Next').click();
        fixture.detectChanges();
        TestBed.tick();
        requestAt('drone', '10').flush(page(papers(10, 11), 100));
      } finally {
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
      }
      expect(calls).toHaveLength(1);
      expect(calls[0].block).toBe('start');
    });

    it('keeps you near the same paper when the page size changes', async () => {
      start('/?q=drone&p=5'); // papers 41–50
      requestAt('drone', '40').flush(page(papers(10, 41), 500));
      await flushed();

      pick('25'); // paper 41 now lives on page 2 (26–50)
      requestAt('drone', '25', '25').flush(page(papers(25, 26), 500));
      await flushed();

      expect(location.search).toBe('?q=drone&n=25&p=2');
      expect(text()).toContain('showing 26–50');
    });

    it('does not add a history entry when only the page size changes', async () => {
      start();
      submitQuery('drone');
      request('drone').flush(page(papers(10), 500));
      await flushed();
      const entries = history.length;

      pick('50');
      requestAt('drone', null, '50').flush(page(papers(50), 500));
      await flushed();

      expect(location.search).toBe('?q=drone&n=50');
      expect(history.length).toBe(entries);
    });

    it('starts again from page 1 for a different search', async () => {
      start('/?q=drone&p=3');
      requestAt('drone', '20').flush(page(papers(10, 21), 500));
      await flushed();

      submitQuery('crispr');
      requestAt('crispr', null).flush(page(papers(10), 500));
      await flushed();
      expect(location.search).toBe('?q=crispr');
    });

    it('follows Back and Forward between pages', async () => {
      start('/?q=drone');
      requestAt('drone', null).flush(page(papers(10), 100));
      await flushed();

      history.replaceState(null, '', '/?q=drone&p=4');
      dispatchEvent(new PopStateEvent('popstate'));
      fixture.detectChanges();
      TestBed.tick();
      requestAt('drone', '30').flush(page(papers(10, 31), 100));
      await flushed();
      expect(text()).toContain('showing 31–40');
    });

    it('shows a pager only when there is more than one page', async () => {
      start();
      submitQuery('drone');
      request('drone').flush(page(papers(10), 10));
      await flushed();
      expect(el.querySelector('app-pager')).toBeNull();

      submitQuery('crispr');
      request('crispr').flush(page(papers(10), 11));
      await flushed();
      expect(el.querySelector('app-pager')).not.toBeNull();
      expect(text()).toContain('Page 1 of 2');
    });

    it('explains that paging stops at 10,000 results', async () => {
      start();
      submitQuery('drone');
      request('drone').flush(page(papers(10), 71213));
      await flushed();
      expect(text()).toContain('Page 1 of 1,000');
      expect(text()).toContain('Paging stops at the first 10,000 results');
    });

    it('offers a way back when a page is past the last result', async () => {
      start('/?q=drone&p=3');
      requestAt('drone', '20').flush(page([], 5));
      await flushed();
      expect(text()).toContain('Nothing on this page');

      el.querySelector<HTMLButtonElement>('.retry')!.click();
      fixture.detectChanges();
      TestBed.tick();
      requestAt('drone', null).flush(page(papers(5), 5));
      await flushed();
      expect(text()).toContain('Paper 1');
    });

    it('names an exported file after its page', async () => {
      start('/?q=drone&p=2');
      requestAt('drone', '10').flush(page(papers(10, 11), 100));
      await flushed();

      const names: string[] = [];
      URL.createObjectURL = () => 'blob:test';
      URL.revokeObjectURL = () => undefined;
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        names.push(this.download);
      };
      try {
        el.querySelector<HTMLButtonElement>('.export')!.click();
      } finally {
        HTMLAnchorElement.prototype.click = click;
      }
      expect(names[0]).toMatch(/-page-2\.csv$/);
    });
  });

  describe('export', () => {
    it('downloads the papers on screen as a CSV named after the search', async () => {
      start();
      submitQuery('drone AND package');
      request('drone AND package').flush(
        page([{ id: 1, title: 'Delivery drones', yearPublished: 2021 }]),
      );
      await flushed();

      const created: Blob[] = [];
      const names: string[] = [];
      URL.createObjectURL = (blob: Blob | MediaSource) => {
        created.push(blob as Blob);
        return 'blob:test';
      };
      URL.revokeObjectURL = () => undefined;
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        names.push(this.download);
      };
      try {
        el.querySelector<HTMLButtonElement>('.export')!.click();
      } finally {
        HTMLAnchorElement.prototype.click = click;
      }

      expect(names).toHaveLength(1);
      expect(names[0]).toMatch(/^marginalia-drone-and-package-\d{4}-\d{2}-\d{2}\.csv$/);
      const csv = await created[0].text();
      expect(csv).toContain('id,title,authors');
      expect(csv).toContain('Delivery drones');
    });

    it('offers no export when there is nothing to export', async () => {
      start();
      submitQuery('zzzz');
      request('zzzz').flush(page([], 0));
      await flushed();
      expect(el.querySelector('.export')).toBeNull();
    });
  });

  describe('address bar', () => {
    it('starts the search a link describes, including its result count', () => {
      start('/?q=drone&n=25');
      http.expectOne((r) => r.params.get('q') === 'drone' && r.params.get('limit') === '25').flush(page([]));
      expect(el.querySelector<HTMLInputElement>('input[name="q"]')!.value).toBe('drone');
      expect(document.title).toBe('drone · Marginalia');
    });

    it('ignores a query in the link that would not pass the search bar', () => {
      start('/?q=(drone%20AND');
      http.expectNone('/core-api/search/works');
      expect(text()).toContain('Nothing on the desk yet');
      expect(location.search).toBe('');
    });

    it('writes each search to the address, a new entry for a new query but not for a new count', () => {
      start();
      const before = history.length;

      submitQuery('drone');
      request('drone').flush(page([]));
      expect(location.search).toBe('?q=drone');
      expect(history.length).toBe(before + 1);

      el.querySelector<HTMLInputElement>('input[type="radio"][value="50"]')!.click();
      fixture.detectChanges();
      TestBed.tick();
      http.expectOne((r) => r.params.get('limit') === '50').flush(page([]));
      expect(location.search).toBe('?q=drone&n=50');
      expect(history.length).toBe(before + 1);
    });

    it('follows back and forward', async () => {
      start();
      submitQuery('drone');
      request('drone').flush(page([{ id: 1, title: 'Drone paper' }]));
      await flushed();

      history.replaceState(null, '', '/?q=crispr');
      dispatchEvent(new PopStateEvent('popstate'));
      fixture.detectChanges();
      TestBed.tick();
      request('crispr').flush(page([{ id: 2, title: 'CRISPR paper' }]));
      await flushed();
      expect(text()).toContain('CRISPR paper');

      history.replaceState(null, '', '/');
      dispatchEvent(new PopStateEvent('popstate'));
      await flushed();
      expect(text()).toContain('Nothing on the desk yet');
    });
  });

  describe('keyboard', () => {
    const press = (key: string, target: EventTarget = document.body) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event;
    };

    it('jumps to the search box on "/"', () => {
      start();
      const event = press('/');
      expect(document.activeElement).toBe(el.querySelector('input[name="q"]'));
      expect(event.defaultPrevented).toBe(true);
    });

    it('lets "/" be typed when already in a text field, and ignores shortcuts with modifiers', () => {
      start();
      const input = el.querySelector<HTMLInputElement>('input[name="q"]')!;
      expect(press('/', input).defaultPrevented).toBe(false);
      input.blur();
      const withCtrl = new KeyboardEvent('keydown', { key: '/', ctrlKey: true, bubbles: true, cancelable: true });
      document.body.dispatchEvent(withCtrl);
      expect(withCtrl.defaultPrevented).toBe(false);
    });
  });
});
