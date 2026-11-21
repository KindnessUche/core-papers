import { csvCell, csvFilename, papersToCsv } from './papers-csv';

describe('csvCell', () => {
  it('quotes cells that need it and doubles inner quotes', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('defuses spreadsheet formulas but leaves plain numbers alone', () => {
    expect(csvCell('=HYPERLINK("http://evil","click")')).toBe(`"'=HYPERLINK(""http://evil"",""click"")"`);
    expect(csvCell('+1 attack')).toBe("'+1 attack");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('-5')).toBe('-5');
    expect(csvCell(2021)).toBe('2021');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
});

describe('papersToCsv', () => {
  const paper = {
    id: 42,
    title: 'Delivery drones, in cities',
    authors: [{ name: 'A. Okafor' }, { name: '李 雷' }],
    yearPublished: 2021,
    publishedDate: '2021-05-03T00:00:00+00:00',
    publisher: 'Zenodo',
    documentType: null,
    fieldOfStudy: 'Manuscript',
    doi: '10.1000/xyz',
    citationCount: 0,
    abstract: '&lt;p&gt;We study &quot;routing&quot;.&lt;/p&gt;',
    links: [
      { type: 'display', url: 'https://core.ac.uk/works/42' },
      { type: 'download', url: 'https://core.ac.uk/download/42.pdf' },
    ],
  };

  it('starts with a byte-order mark and a header, and ends each row with CRLF', () => {
    const csv = papersToCsv([paper]);
    expect(csv.startsWith('﻿id,title,authors,year,')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(3); // header, one row, trailing newline
  });

  it('writes one row per paper using the same cleaned values as the cards', () => {
    const [, line] = papersToCsv([paper]).split('\r\n');
    expect(line).toBe(
      [
        '42',
        '"Delivery drones, in cities"',
        'A. Okafor; 李 雷',
        '2021',
        '2021-05-03',
        'Zenodo',
        'Manuscript',
        'https://doi.org/10.1000/xyz',
        '0',
        '"We study ""routing""."',
        'https://core.ac.uk/works/42',
        'https://core.ac.uk/download/42.pdf',
      ].join(','),
    );
  });

  it('copes with a paper that has almost nothing', () => {
    const [, line] = papersToCsv([{ id: 7 }]).split('\r\n');
    expect(line).toBe('7,,,,,,,,,,,');
  });
});

describe('csvFilename', () => {
  const day = new Date('2026-11-21T12:00:00Z');

  it('makes a readable, safe name from the query', () => {
    expect(csvFilename('drone AND (package OR delivery)', day)).toBe(
      'marginalia-drone-and-package-or-delivery-2026-11-21.csv',
    );
    expect(csvFilename('"climate change"', day)).toBe('marginalia-climate-change-2026-11-21.csv');
  });

  it('falls back when nothing usable is left, and caps the length', () => {
    expect(csvFilename('(((', day)).toBe('marginalia-papers-2026-11-21.csv');
    expect(csvFilename('a'.repeat(200), day).length).toBeLessThan(80);
  });
});
