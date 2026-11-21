import { HttpErrorResponse } from '@angular/common/http';
import { describeError } from './describe-error';

const http = (status: number) => new HttpErrorResponse({ status });

describe('describeError', () => {
  it.each([
    [0, "Couldn't reach CORE"],
    [401, "didn't accept the API key"],
    [403, "didn't accept the API key"],
    [429, 'limiting requests'],
    [400, "couldn't understand that query"],
    [503, 'error 503'],
    [418, 'unexpected error (418)'],
  ])('explains HTTP %i', (status, fragment) => {
    expect(describeError(http(status))).toContain(fragment);
  });

  it('looks inside a wrapped error', () => {
    expect(describeError({ cause: http(429) })).toContain('limiting requests');
  });

  it('falls back for anything else', () => {
    expect(describeError(new Error('boom'))).toBe('Something went wrong while talking to CORE.');
    expect(describeError(undefined)).toBe('Something went wrong while talking to CORE.');
  });
});
