# Marginalia

Search open-access research papers from [CORE](https://core.ac.uk) and see the shape of a field at a glance. Built with Angular.

## Searching

Queries use CORE's boolean syntax:

| You type | It means |
| --- | --- |
| `drone AND (package OR delivery)` | both ideas, with either of two wordings |
| `"climate change"` | the exact phrase |
| `crispr NOT review` | exclude a word |

Operators must be capitals. The search bar checks for unbalanced parentheses or quotes and operators
with nothing to act on, and explains the problem before any request is sent. Searches run when you press
Enter or Search, not on every keystroke, which keeps well inside CORE's rate limits.

## Run it

You need Node 22.22+ (or 24.15+) and a free [CORE API key](https://core.ac.uk/services/api).

```bash
npm install
cp .env.local.example .env.local   # then paste your key into .env.local
npm start                          # http://localhost:4200
```

The key lives in `.env.local` (gitignored). It is read by the dev proxy in `proxy.conf.js`, which
forwards `/core-api/*` to `https://api.core.ac.uk/v3/*` and adds the `Authorization` header, so the key is
never shipped in the browser bundle and there are no CORS issues.

```bash
npm test      # unit tests
npm run build # production build
```

> The proxy only exists in `ng serve`. To host the built app, put any reverse proxy in front of
> `/core-api` that does the same rewrite and adds the key.
