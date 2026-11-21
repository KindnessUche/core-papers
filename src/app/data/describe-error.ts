import { HttpErrorResponse } from '@angular/common/http';

/** Resources wrap what a stream throws, so look one level down for the HTTP error. */
function findHttpError(error: unknown): HttpErrorResponse | null {
  if (error instanceof HttpErrorResponse) return error;
  const cause = (error as { cause?: unknown } | null)?.cause;
  return cause instanceof HttpErrorResponse ? cause : null;
}

/** A failed request, in words a person can act on. */
export function describeError(error: unknown): string {
  const http = findHttpError(error);
  if (!http) return 'Something went wrong while talking to CORE.';

  const { status } = http;
  if (status === 0) return "Couldn't reach CORE. Check your connection, and that npm start is still running.";
  if (status === 401 || status === 403) {
    return "CORE didn't accept the API key. Check .env.local, then restart npm start.";
  }
  if (status === 429) return 'CORE is limiting requests right now. Wait a few seconds and try again.';
  if (status === 400 || status === 422) return "CORE couldn't understand that query. Try simplifying it.";
  if (status >= 500) return `CORE is having trouble right now (error ${status}). Try again in a moment.`;
  return `CORE returned an unexpected error (${status}).`;
}
