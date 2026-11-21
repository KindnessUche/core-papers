import { Paper } from '../data/paper.model';
import {
  authorLine,
  cleanAbstract,
  coreUrlOf,
  doiUrl,
  kindOf,
  readUrlOf,
  venueOf,
  yearOf,
} from '../papers/paper-card/paper-format';

const COLUMNS = [
  'id',
  'title',
  'authors',
  'year',
  'published',
  'venue',
  'type',
  'doi',
  'citations',
  'abstract',
  'core_url',
  'pdf_url',
] as const;

/**
 * One cell, safe to open in a spreadsheet. Quotes are doubled, and a cell that begins with
 * = + - @ gets a leading apostrophe so Excel and Sheets read it as text, not as a formula
 * (a paper titled "=HYPERLINK(…)" is otherwise a live link in the exported file).
 */
export function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text))) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(paper: Paper): string {
  const names = (paper.authors ?? []).map((a) => a.name?.trim()).filter(Boolean);
  return [
    paper.id,
    paper.title?.trim(),
    names.join('; '),
    yearOf(paper),
    paper.publishedDate?.slice(0, 10),
    venueOf(paper),
    kindOf(paper),
    doiUrl(paper.doi),
    paper.citationCount,
    cleanAbstract(paper.abstract),
    coreUrlOf(paper),
    readUrlOf(paper),
  ]
    .map(csvCell)
    .join(',');
}

/** Starts with a byte-order mark so Excel reads the accents and non-Latin names as UTF-8. */
export function papersToCsv(papers: readonly Paper[]): string {
  return '﻿' + [COLUMNS.join(','), ...papers.map(row)].join('\r\n') + '\r\n';
}

/** "marginalia-drone-and-package-2026-11-21.csv" */
export function csvFilename(query: string, date = new Date()): string {
  const slug = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return `marginalia-${slug || 'papers'}-${date.toISOString().slice(0, 10)}.csv`;
}

export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url));
}
