import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CoreApiService } from './core-api.service';
import { SearchResponse } from './paper.model';

describe('CoreApiService', () => {
  let service: CoreApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CoreApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests works with the query and limit', () => {
    const body: SearchResponse = { totalHits: 1, limit: 5, offset: 0, results: [{ id: 1 }] };
    let received: SearchResponse | undefined;

    service.search('(drone AND (package OR delivery))', 5).subscribe((r) => (received = r));

    const req = http.expectOne((r) => r.url === '/core-api/search/works');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('(drone AND (package OR delivery))');
    expect(req.request.params.get('limit')).toBe('5');
    req.flush(body);

    expect(received).toEqual(body);
  });
});
