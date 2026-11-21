# Marginalia

Search open-access research from [CORE](https://core.ac.uk) with boolean queries, and see the shape of a
field at a glance. An Angular 22 app, frontend only.

**Concept.** Paper, ink and one red pen. Titles are set in a serif, controls in the system font, and the
single accent colour marks only what matters: the search button, a hovered card, the peak of the chart.

## Run it

You need Node 22.22+ (or 24.15+) and a free [CORE API key](https://core.ac.uk/services/api).

```bash
npm install
cp .env.local.example .env.local   # then paste your key into .env.local
npm start                          # http://localhost:4200
```

```bash
npm test         # unit and component tests
npm run build    # production build
```

### Why there is a dev proxy

The key lives in `.env.local` (gitignored) and is read by `proxy.conf.js`. The browser calls
`/core-api/*`; the dev server forwards it to `https://api.core.ac.uk/v3/*` and adds the
`Authorization` header. The key is never in the browser bundle, and CORS can't get in the way.
The proxy exists only in `ng serve`; to host the built app, put any reverse proxy in front of `/core-api`
that does the same rewrite and adds the key.

## What it does (the brief)

1. **Angular 20+**: Angular 22, standalone components and signals.
2. **Papers from CORE**: `GET /v3/search/works`, through `CoreApiService`.
3. **A clean UI of my own design**: cards with year, venue, title, authors, abstract preview, and links to
   the PDF, the DOI and the CORE page. Missing fields are left out rather than shown as blanks.
4. **Result count**: a segmented control for 10, 25, 50 or 100 papers per page, with a pager (Previous/Next and numbered pages; "Page X of Y" on phones) to move through the rest. The page is in the URL (`p`), so Back and shared links work. Changing the page size keeps you near the paper you were reading.
5. **Boolean search**: `drone AND (package OR delivery)`, `"exact phrase"`, `NOT`. Searches run on
   Enter or Search, not per keystroke, which keeps well inside CORE's rate limits.
6. **Chart**: papers per year for the papers on screen (see the note on scope below).

### A note on the chart

The chart counts the papers the page has fetched (up to 100), not every match in CORE, and it says so
in its caption ("Based on the 50 papers shown, out of 71,213 matches"). I couldn't confirm that the
public API offers server-side aggregation, so I chose the client-side route the brief allows rather than
guess. The number of papers shown is the user's choice, so the chart sharpens as they fetch more. Bins widen
automatically (1, 2, 5, 10 years…) so a 1946 outlier doesn't turn the rest into slivers.

## Additions beyond the brief

- **Query checker.** Catches unbalanced parentheses or quotes, a leading or trailing operator, and two
  operators in a row, and explains each in plain words before any request is sent. Lowercase `and`/`or`
  gets a gentle tip. Errors appear when you leave the field or press Search, never mid-keystroke.
- **Real-data hardening.** CORE sends HTML-escaped abstracts (`&lt;p&gt;…`), empty `downloadUrl`s and mostly-null
  document types. All are handled, and covered by tests built from real responses.
- **Every state designed.** Starting screen with example queries, skeleton cards while loading, "no
  results" advice, and distinct messages for a bad key, rate limiting, no connection and an unparseable
  query, with a retry button. Old results stay visible (dimmed) while new ones load, so the page never jumps.
- **Shareable searches.** The query and count live in the URL (`/?q=crispr+NOT+review&n=25`). A search
  can be bookmarked or shared, Back and Forward walk through earlier searches, and the tab title follows.
- **Keyboard.** `/` jumps to the search box. The chart can be read with the arrow keys, Home, End and Escape.
- **Chart accessibility.** A table view with the same numbers, a spoken summary, a tooltip on hover *and*
  focus, hit areas far larger than the bars, and chart colours checked for contrast and red-green
  colour blindness.
- **Export to CSV.** Downloads the papers on screen, with a UTF-8 byte-order mark so Excel reads accents
  correctly, and with spreadsheet formulas in titles neutralised.
- **Light and dark themes** that follow the system, plus `prefers-reduced-motion`,
  `prefers-reduced-transparency` and `prefers-contrast` support. With reduced motion, things fade instead of move.
- **Motion with a reason.** Press feedback on every button, a sliding pill on the count control, short
  staggered card entrances. Shortcuts like `/` act instantly, with no animation.
- **Safe by construction.** Links are only ever `http(s)`; text is never inserted as HTML.

## How it is built

```
src/app
├── data/        CORE client, response types, error messages
├── search/      search bar, query checker, shared limits
├── papers/      paper card, skeleton, result-count control
├── chart/       year binning and the chart component
├── export/      CSV
└── state/       reading and writing the URL
src/styles       design tokens and base styles
proxy.conf.js    dev proxy that adds the API key
```

- **Small pure functions carry the logic** (query checking, binning, CSV, URL state) and are unit tested
  on their own; components are tested through what a person sees.
- **Tokens first.** Colour, type, spacing, motion curves and durations live in `src/styles/tokens.css`;
  components use only those.
- **Git history.** Each commit leaves a working app: scaffold, tokens and shell, CORE fetch, cards, real-data
  fixes, result count, search, chart, URL state, export, pagination.

## Assumptions and limits

- The chart is based on the current page's papers only (above).
- Paging stops at the first 10,000 results (`MAX_RESULTS` in `src/app/search/limits.ts`), my own guess at a safe offset depth for CORE; raise it if the API allows more.
- The API key is read by the dev proxy; a hosted build needs an equivalent.
- I couldn't test against CORE from my build environment; behaviour was verified against a local stub
  built from a real response, plus unit tests.
