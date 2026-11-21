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

/** Abstracts sometimes arrive with markup and ragged whitespace. */
export function cleanAbstract(text?: string | null): string {
  return (text ?? '')
    .replace(/<\/?(?:[\w-]+:)?(?:p|br|div|li|ul|ol|title|sec|h\d)\b[^>]*>/gi, ' ') // block tags break words apart
    .replace(/<[^>]*>/g, '') // inline tags (b, i, sup…) vanish without leaving a gap
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
