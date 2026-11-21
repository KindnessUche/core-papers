import { Paper } from '../../data/paper.model';

/** "A, B, C and 4 more". Empty when CORE has no author names. */
export function authorLine(authors: Paper['authors'], max = 3): string {
  const names = (authors ?? []).map((a) => a.name?.trim()).filter((n): n is string => !!n);
  if (names.length === 0) return '';
  const shown = names.slice(0, max).join(', ');
  const rest = names.length - max;
  return rest > 0 ? `${shown} and ${rest} more` : shown;
}

export function yearOf(paper: Paper): number | null {
  if (paper.yearPublished) return paper.yearPublished;
  const fromDate = Number.parseInt(paper.publishedDate?.slice(0, 4) ?? '', 10);
  return Number.isFinite(fromDate) ? fromDate : null;
}

/** Best guess at where the paper lives: journal, then publisher, then the repository that holds it. */
export function venueOf(paper: Paper): string {
  const journal = paper.journals?.find((j) => j.title?.trim())?.title?.trim();
  const provider = paper.dataProviders?.find((d) => d.name?.trim())?.name?.trim();
  return journal || paper.publisher?.trim() || provider || '';
}

/** Tags that separate words ("<p>a</p><p>b</p>" must not become "ab"). */
const BLOCK_TAG = /<\/?(?:[\w-]+:)?(?:p|br|div|li|ul|ol|title|sec|h\d)\b[^>]*>/gi;
/** Anything that starts like a tag. "p < 0.05" is maths, not markup, so `<` must be followed by a letter. */
const ANY_TAG = /<\/?[a-z][^>]*>/gi;

function stripTags(text: string): string {
  return text.replace(BLOCK_TAG, ' ').replace(ANY_TAG, '');
}

/** Turns "&lt;p&gt;" into "<p>" without ever putting the text into the live DOM. */
function decodeEntities(text: string): string {
  if (typeof DOMParser === 'undefined') return text;
  return new DOMParser().parseFromString(text, 'text/html').documentElement.textContent ?? text;
}

/**
 * CORE abstracts arrive with markup, and often HTML-escaped markup (`&lt;p&gt;…`).
 * Strip tags, decode entities, then strip again to catch what the decoding revealed.
 */
export function cleanAbstract(text?: string | null): string {
  return stripTags(decodeEntities(stripTags(text ?? '')))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Only ever link to http(s); anything else from the API is dropped. */
export function httpUrl(url?: string | null): string {
  const value = url?.trim() ?? '';
  return /^https?:\/\//i.test(value) ? value : '';
}

export function doiUrl(doi?: string | null): string {
  const value = doi?.trim();
  if (!value) return '';
  return httpUrl(value) || `https://doi.org/${value}`;
}

const plural = new Intl.PluralRules('en');
const number = new Intl.NumberFormat('en');

/** "1 citation", "1,204 citations". Empty when there are none to show. */
export function citationLabel(count?: number | null): string {
  if (!count || count < 1) return '';
  return `${number.format(count)} ${plural.select(count) === 'one' ? 'citation' : 'citations'}`;
}

function linkOf(paper: Paper, type: string): string {
  return httpUrl(paper.links?.find((l) => l.type === type)?.url);
}

/** The PDF, when CORE has one. `downloadUrl` is often empty; the `links` list is the fallback. */
export function readUrlOf(paper: Paper): string {
  return httpUrl(paper.downloadUrl) || linkOf(paper, 'download');
}

/** The paper's page on CORE. Every work has one. */
export function coreUrlOf(paper: Paper): string {
  return linkOf(paper, 'display');
}

/** `documentType` is mostly null, so fall back to the broader `fieldOfStudy` ("Manuscript", "Text"). */
export function kindOf(paper: Paper): string {
  return paper.documentType?.trim() || paper.fieldOfStudy?.trim() || '';
}
