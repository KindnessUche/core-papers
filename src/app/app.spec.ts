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
  const flushed = async () => {
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
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
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

  it('charts the papers by year, and says how many of the matches it covers', async () => {
    start();
    submitQuery('drone');
    request('drone').flush(
      page(
        [
          { id: 1, title: 'A', yearPublished: 2020 },
          { id: 2, title: 'B', yearPublished: 2020 },
          { id: 3, title: 'C', yearPublished: 2021 },
        ],
        900,
      ),
    );
    await flushed();

    expect(el.querySelectorAll('path.bar').length).toBe(2);
    expect(text()).toContain('Papers by year');
    expect(text()).toContain('Based on the 3 papers shown, out of 900 matches.');
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
