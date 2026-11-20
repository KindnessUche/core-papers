# Marginalia

Search open-access research papers from [CORE](https://core.ac.uk) and see the shape of a field at a glance. Built with Angular.

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
