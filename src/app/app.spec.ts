import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('renders the hero heading', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Read what the world');
  });

  it('lists the titles CORE returns', async () => {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http
      .expectOne((r) => r.url === '/core-api/search/works')
      .flush({
        totalHits: 1234,
        limit: 10,
        offset: 0,
        results: [{ id: 1, title: 'Delivery drones in cities', yearPublished: 2021 }],
      });
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Delivery drones in cities');
    expect(text).toContain('1,234');
  });

  it('fetches again with the new limit when the control changes', async () => {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);
    const el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    http
      .expectOne((r) => r.params.get('limit') === '10')
      .flush({ totalHits: 5, limit: 10, offset: 0, results: [{ id: 1, title: 'First batch' }] });
    await fixture.whenStable();

    el.querySelector<HTMLInputElement>('input[type="radio"][value="50"]')!.click();
    // Not whenStable(): that would wait for the request we have yet to answer
    fixture.detectChanges();
    TestBed.tick();

    const next = http.expectOne((r) => r.params.get('limit') === '50');
    // The old results stay visible while the new request is in flight
    expect(el.textContent).toContain('First batch');
    next.flush({ totalHits: 5, limit: 50, offset: 0, results: [{ id: 2, title: 'Second batch' }] });
    await fixture.whenStable();
    expect(el.textContent).toContain('Second batch');
  });
});
