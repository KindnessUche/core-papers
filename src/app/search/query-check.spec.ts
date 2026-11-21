import { checkQuery } from './query-check';

const error = (q: string) => checkQuery(q).error;

describe('checkQuery', () => {
  it.each([
    'drone',
    '',
    '   ',
    'drone AND (package OR delivery)',
    '(drone AND (package OR delivery))',
    '"climate change" AND adaptation',
    'crispr NOT review',
    'drone AND NOT military',
    'title:(drone OR uav) AND yearPublished:2020',
    'p < 0.05 AND n > 30',
  ])('accepts %j', (query) => {
    expect(error(query)).toBeNull();
  });

  it.each([
    ['(drone AND package', 'Missing a closing ")".'],
    ['((drone AND package', 'Missing 2 closing ")".'],
    ['drone AND package)', 'There is a ")" with no matching "(".'],
    ['"climate change AND adaptation', 'Close the quotation mark, or remove it.'],
    ['AND drone', "A search can't start with AND."],
    ['OR drone', "A search can't start with OR."],
    ['drone AND', "A search can't end with AND."],
    ['drone NOT', "A search can't end with NOT."],
    ['drone AND OR package', 'Two operators in a row: AND OR.'],
    ['drone NOT NOT package', 'Two operators in a row: NOT NOT.'],
    ['drone NOT AND package', 'Two operators in a row: NOT AND.'],
    ['()', 'Empty parentheses: put a term between ( and ).'],
    ['(AND drone)', `AND can't come straight after "(".`],
    ['(drone AND)', 'AND needs a term after it, before the ")".'],
  ])('explains %j', (query, message) => {
    expect(error(query)).toBe(message);
  });

  it('ignores operators and brackets inside quoted phrases', () => {
    expect(error('"AND (" AND drone')).toBeNull();
  });

  it('hints, without blocking, when operators are lowercase', () => {
    const result = checkQuery('drone and package');
    expect(result.error).toBeNull();
    expect(result.hint).toContain('capitals');
    expect(checkQuery('"this and that"').hint).toBeNull();
  });

  it('still reports the hint alongside an error', () => {
    const result = checkQuery('drone and (package');
    expect(result.error).toBe('Missing a closing ")".');
    expect(result.hint).not.toBeNull();
  });
});
