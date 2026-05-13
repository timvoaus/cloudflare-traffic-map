# Cloudflare Traffic Destination Map

Standalone version of the **traffic destination map** extracted from the
Zero‑Trust Gateway dashboard. It runs entirely on the Cloudflare edge:

- **Pages** serves the static UI (`public/`).
- **Pages Functions (Workers)** expose `/api/traffic-map`.
- **D1** (`traffic-map-db`) stores the aggregated `sources`, `destinations` and `routes`.

## Architecture

```
Browser  ─┬─►  Cloudflare Pages (static: index.html / style.css / script.js)
          │
          └─►  /api/traffic-map  (Pages Function in functions/api/traffic-map.js)
                                 └─► D1 binding "DB" (traffic-map-db)
```

The frontend uses **D3 v7** + **topojson-client** + the
[world-atlas](https://github.com/topojson/world-atlas) `countries-110m.json`
TopoJSON file to render the world map, source pins, destination bubbles and
curved arcs between origin and destination countries.

## Prerequisites

- Node.js 18+
- A Cloudflare account
- `npx wrangler login` will open a browser to authenticate.

## One-shot deploy

From this folder:

```powershell
npm install
npx wrangler login           # browser auth, once

# 1. Create the D1 database (captures the database_id)
npx wrangler d1 create traffic-map-db
#   → copy the printed database_id into wrangler.toml

# 2. Apply schema + seed data to the remote D1
npx wrangler d1 execute traffic-map-db --remote --file=schema.sql

# 3. Deploy to Cloudflare Pages
npx wrangler pages deploy public --project-name=cloudflare-traffic-map
```

After the first deploy, bind D1 to the Pages project (only once):

```powershell
npx wrangler pages project create cloudflare-traffic-map --production-branch=main
# In Cloudflare dashboard → Pages → cloudflare-traffic-map → Settings → Functions → D1 bindings
# add: variable name = DB, database = traffic-map-db
```

(Subsequent deploys just need `npm run deploy`.)

## Local development

```powershell
npm install
npx wrangler d1 execute traffic-map-db --local --file=schema.sql
npx wrangler pages dev public --d1 DB=traffic-map-db
```

Open <http://localhost:8788>.

## Updating data

Edit `schema.sql` (or insert rows directly) and re-run:

```powershell
npx wrangler d1 execute traffic-map-db --remote --file=schema.sql
```

## Files

- `public/index.html` — page shell, toolbar, stats, SVG map container
- `public/style.css` — provided dark/light themed styling
- `public/script.js` — D3 rendering: countries, arcs, origin/destination bubbles, tooltip, zoom
- `functions/api/traffic-map.js` — Pages Function that reads from D1
- `schema.sql` — single-source D1 schema (sources, destinations, routes, meta, daily_snapshots)
- `wrangler.toml` — Pages + D1 binding config
- `workers/refresh/` — standalone Worker that pulls aggregated traffic data
  from Cloudflare's **Analytics GraphQL API** and writes the latest 24-h
  snapshot plus a 30-day rolling daily history into D1.

## Live data ingestion (Refresh Worker)

The Pages site reads from D1 only. A separate Cloudflare Worker
(`traffic-map-refresh`) is responsible for populating D1 with live data.

### Deploy

```powershell
cd workers/refresh
npx wrangler deploy
```

### Secrets (set once)

```powershell
# 1. Your Cloudflare account ID
"<ACCOUNT_ID>" | npx wrangler secret put CF_ACCOUNT_ID

# 2. API token with: Account → Zero Trust → Read
"<API_TOKEN>"  | npx wrangler secret put CF_API_TOKEN

# 3. Random secret used to authorize manual /refresh calls
"<random>"     | npx wrangler secret put REFRESH_TOKEN
```

> If using PowerShell, pipe through `cmd /c "type file.txt | npx wrangler …"`
> to avoid trailing CRLF being included in the secret.

### Triggers

- **Cron**: configured in `workers/refresh/wrangler.toml` (`*/5 * * * *` = every 5 min).
- **Manual**: `POST https://traffic-map-refresh.<acct>.workers.dev/refresh?token=<REFRESH_TOKEN>`
- **Status**: `GET  https://traffic-map-refresh.<acct>.workers.dev/status`

### How it works

1. Issues a **single GraphQL query** to Cloudflare's Analytics API
   (`gatewayResolverQueriesAdaptiveGroups`) with three aliases: `sources`
   (grouped by `srcIpCountry`), `destinations` (grouped by
   `resolvedIpCountries`) and `routes` (grouped by both).
2. Maps every ISO country code to a centroid via the embedded
   `centroids.js` lookup (247 codes). Unknown codes are counted and
   reported under `summary.unmappedCountries`.
3. Clears and rewrites `sources`, `destinations` and `routes` in one
   chunked D1 batch, then upserts a daily snapshot into
   `daily_snapshots` and prunes anything older than 30 days.
4. Records the run summary (including `totalQueries`, window, duration,
   `unmappedCountries`) in `meta.last_refresh`.

One GraphQL call → one external subrequest per run. Total run is well
under Workers' free-plan 50-subrequest cap regardless of traffic volume
(tested with ≥ 60 k queries/day).

### Tunables (vars in `workers/refresh/wrangler.toml`)

| Var            | Default | Meaning |
|----------------|---------|---------|
| `WINDOW_HOURS` | `24`    | Aggregation window (hard-capped to 24 in code; Cloudflare free plan only retains 24 h of Gateway data) |
