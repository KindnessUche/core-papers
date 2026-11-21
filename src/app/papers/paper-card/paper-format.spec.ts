import {
  authorLine,
  citationLabel,
  cleanAbstract,
  coreUrlOf,
  doiUrl,
  httpUrl,
  kindOf,
  readUrlOf,
  venueOf,
  yearOf,
} from './paper-format';

describe('paper-format', () => {
  it('summarises long author lists', () => {
    const names = ['A', 'B', 'C', 'D', 'E'].map((name) => ({ name }));
    expect(authorLine(names)).toBe('A, B, C and 2 more');
    expect(authorLine(names.slice(0, 2))).toBe('A, B');
    expect(authorLine([{ name: ' ' }, {}])).toBe('');
    expect(authorLine(undefined)).toBe('');
  });

  it('falls back to the published date for the year', () => {
    expect(yearOf({ id: 1, yearPublished: 2020 })).toBe(2020);
    expect(yearOf({ id: 1, publishedDate: '2018-05-03T00:00:00' })).toBe(2018);
    expect(yearOf({ id: 1 })).toBeNull();
  });

  it('picks a venue in order of preference', () => {
    expect(venueOf({ id: 1, journals: [{ title: 'Nature' }], publisher: 'Springer' })).toBe('Nature');
    expect(venueOf({ id: 1, publisher: 'Springer' })).toBe('Springer');
    expect(venueOf({ id: 1, dataProviders: [{ name: 'arXiv' }] })).toBe('arXiv');
    expect(venueOf({ id: 1 })).toBe('');
  });

  it('strips markup from abstracts', () => {
    expect(cleanAbstract('<jats:p>Hello\n\n  <b>world</b></jats:p>')).toBe('Hello world');
    expect(cleanAbstract(null)).toBe('');
  });

  it('only allows http(s) links', () => {
    expect(httpUrl('https://x.org/a.pdf')).toBe('https://x.org/a.pdf');
    expect(httpUrl('javascript:alert(1)')).toBe('');
    expect(doiUrl('10.1000/abc')).toBe('https://doi.org/10.1000/abc');
    expect(doiUrl('https://doi.org/10.1000/abc')).toBe('https://doi.org/10.1000/abc');
    expect(doiUrl(undefined)).toBe('');
  });

  it('pluralises citations', () => {
    expect(citationLabel(0)).toBe('');
    expect(citationLabel(1)).toBe('1 citation');
    expect(citationLabel(1204)).toBe('1,204 citations');
  });
});

describe('paper-format with real CORE data', () => {
  it('decodes HTML-escaped abstracts, including a truncated closing tag', () => {
    const raw = '&lt;p&gt;This is the first release for DRONE.&lt;/p&gt';
    expect(cleanAbstract(raw)).toBe('This is the first release for DRONE.');
  });

  it('keeps maths that merely contains angle brackets', () => {
    expect(cleanAbstract('Effects were significant when p < 0.05 and n > 30.')).toBe(
      'Effects were significant when p < 0.05 and n > 30.',
    );
  });

  it('finds the PDF and CORE page in the links list when downloadUrl is empty', () => {
    const paper = {
      id: 1,
      downloadUrl: '',
      links: [
        { type: 'download', url: 'https://core.ac.uk/download/1.pdf' },
        { type: 'display', url: 'https://core.ac.uk/works/1' },
      ],
    };
    expect(readUrlOf(paper)).toBe('https://core.ac.uk/download/1.pdf');
    expect(coreUrlOf(paper)).toBe('https://core.ac.uk/works/1');
    expect(readUrlOf({ id: 2, downloadUrl: '', links: [{ type: 'display', url: 'https://core.ac.uk/works/2' }] })).toBe('');
  });

  it('uses fieldOfStudy when documentType is null', () => {
    expect(kindOf({ id: 1, documentType: null, fieldOfStudy: 'Manuscript' })).toBe('Manuscript');
    expect(kindOf({ id: 1, documentType: 'text', fieldOfStudy: 'Text' })).toBe('text');
    expect(kindOf({ id: 1 })).toBe('');
  });
});
