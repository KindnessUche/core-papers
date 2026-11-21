export interface QueryCheck {
  /** A mistake that would make CORE reject or misread the query. Blocks the search. */
  error: string | null;
  /** A likely slip that is still a valid query. Never blocks. */
  hint: string | null;
}

type Kind = 'open' | 'close' | 'and' | 'or' | 'not' | 'term';
interface Token {
  kind: Kind;
  text: string;
}

const OPERATORS: Record<string, Kind> = { AND: 'and', OR: 'or', NOT: 'not' };

function tokenize(query: string) {
  const tokens: Token[] = [];
  let unclosedQuote = false;
  let lowercaseOperator = false;
  let i = 0;

  while (i < query.length) {
    const ch = query[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (ch === '(') {
      tokens.push({ kind: 'open', text: '(' });
      i++;
    } else if (ch === ')') {
      tokens.push({ kind: 'close', text: ')' });
      i++;
    } else if (ch === '"') {
      const end = query.indexOf('"', i + 1);
      if (end === -1) {
        unclosedQuote = true;
        break;
      }
      tokens.push({ kind: 'term', text: query.slice(i, end + 1) });
      i = end + 1;
    } else {
      let end = i;
      while (end < query.length && !/[\s()"]/.test(query[end])) end++;
      const word = query.slice(i, end);
      const kind = OPERATORS[word];
      if (kind) {
        tokens.push({ kind, text: word });
      } else {
        if (/^(and|or|not)$/i.test(word)) lowercaseOperator = true;
        tokens.push({ kind: 'term', text: word });
      }
      i = end;
    }
  }
  return { tokens, unclosedQuote, lowercaseOperator };
}

const isOperator = (t: Token | null): t is Token =>
  t !== null && (t.kind === 'and' || t.kind === 'or' || t.kind === 'not');

/**
 * Checks a CORE boolean query for the mistakes people actually make: unbalanced
 * parentheses or quotes, and operators with nothing to operate on.
 * It reports the first problem, in plain words. An empty query is not an error;
 * the caller decides what empty means.
 */
export function checkQuery(query: string): QueryCheck {
  const { tokens, unclosedQuote, lowercaseOperator } = tokenize(query);
  const hint = lowercaseOperator ? 'Operators only work in capitals: AND, OR, NOT.' : null;
  const fail = (error: string): QueryCheck => ({ error, hint });

  if (unclosedQuote) return fail('Close the quotation mark, or remove it.');

  let depth = 0;
  let prev: Token | null = null;

  for (const token of tokens) {
    switch (token.kind) {
      case 'open':
        depth++;
        break;
      case 'close':
        if (depth === 0) return fail('There is a ")" with no matching "(".');
        if (prev?.kind === 'open') return fail('Empty parentheses: put a term between ( and ).');
        if (isOperator(prev)) return fail(`${prev.text} needs a term after it, before the ")".`);
        depth--;
        break;
      case 'and':
      case 'or':
        if (!prev) return fail(`A search can't start with ${token.text}.`);
        if (prev.kind === 'open') return fail(`${token.text} can't come straight after "(".`);
        if (isOperator(prev)) return fail(`Two operators in a row: ${prev.text} ${token.text}.`);
        break;
      case 'not':
        if (prev?.kind === 'not') return fail('Two operators in a row: NOT NOT.');
        break;
      case 'term':
        break;
    }
    prev = token;
  }

  if (isOperator(prev)) return fail(`A search can't end with ${prev.text}.`);
  if (depth > 0) return fail(depth === 1 ? 'Missing a closing ")".' : `Missing ${depth} closing ")".`);
  return { error: null, hint };
}
