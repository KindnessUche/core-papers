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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('renders the hero and sends no request until something is searched', () => {
    expect(el.querySelector('h1')?.textContent).toContain('Read what the world');
    expect(text()).toContain('Nothing on the desk yet');
    http.expectNone('/core-api/search/works');
  });

  it('searches when an example is picked', () => {
    el.querySelector<HTMLButtonElement>('.example')!.click();
    fixture.detectChanges();
    TestBed.tick();
    request('drone AND (package OR delivery)').flush(page([]));
  });

  it('lists what CORE returns, with the count and the query', async () => {
    submitQuery('drone');
    expect(text()).toContain('Searching CORE');
    request('drone').flush(
      page([{ id: 1, title: 'Delivery drones in cities', yearPublished: 2021 }], 1234),
    );
    await flushed();

    expect(text()).toContain('Delivery drones in cities');
    expect(text()).toContain('1,234 papers match drone');
  });

  it('fetches again with the new limit, keeping old results on screen meanwhile', async () => {
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
    submitQuery('zzzz');
    request('zzzz').flush(page([], 0));
    await flushed();
    expect(text()).toContain('No papers match that');
  });

  it('explains a rejected key and retries on request', async () => {
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
    submitQuery('drone AND (package');
    expect(text()).toContain('Missing a closing ")".');
    http.expectNone('/core-api/search/works');
  });

  it('returns to the starting screen when the search is cleared', async () => {
    submitQuery('drone');
    request('drone').flush(page([{ id: 1, title: 'A paper' }]));
    await flushed();

    el.querySelector<HTMLButtonElement>('.clear')!.click();
    await flushed();
    expect(text()).toContain('Nothing on the desk yet');
    expect(text()).not.toContain('A paper');
  });
});
