# Cloudflare Traffic Destination Map

This project shows your Cloudflare Zero Trust traffic on a world map.

It runs on Cloudflare:

- **Cloudflare Pages** hosts the website.
- **Cloudflare D1** stores the map data.
- **Cloudflare Worker** refreshes the data from your Zero Trust logs.

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

## Beginner deployment guide

Use this guide if you are new to Cloudflare. You mainly need to copy commands,
paste values when asked, and click a few things in the Cloudflare dashboard.

### What you need before starting

1. A [Cloudflare account](https://dash.cloudflare.com/sign-up).
2. [Node.js 18 or newer](https://nodejs.org/).
3. Access to the Cloudflare account that has your Zero Trust logs.

### Step 0: Download this project

You need this project on your computer before running the setup commands.

#### Option A: Download ZIP

1. Open this GitHub repository in your browser.
2. Click **Code**.
3. Click **Download ZIP**.
4. Extract the ZIP file.
5. Open PowerShell inside the extracted folder.

#### Option B: Use Git

```powershell
git clone https://github.com/timvoaus/cloudflare-traffic-map.git
cd cloudflare-traffic-map
```

### Step 1: Install the project

Open PowerShell in this project folder and run:

```powershell
npm install
```

### Step 2: Create your Cloudflare API token

The app needs permission to read your Zero Trust traffic data. Cloudflare makes
you create this token manually for security.

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Click your profile icon.
3. Open **My Profile** → **API Tokens**.
4. Click **Create Token**.
5. Choose **Create Custom Token**.
6. Add this permission:
   - **Account** → **Zero Trust** → **Read**
7. Under **Account Resources**, select the account used by this project.
8. Click through the confirmation screens and copy the token.

Keep this token private. You will paste it into the setup wizard later. Do not
commit it to GitHub.

### Step 3: Run the guided setup wizard

```powershell
npm run setup
```

The wizard asks simple questions and runs most Cloudflare commands for you.
When a browser opens for Cloudflare login, approve it, then return to
PowerShell.

The wizard will help you:

1. Log in to Cloudflare.
2. Create or select the database.
3. Set up the database tables.
4. Deploy the website.
5. Deploy the background refresh Worker.
6. Save the required secrets.

### Step 4: Connect the database to the website

After the website deploys, make sure it is connected to the database:

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages**.
3. Open the `cloudflare-traffic-map` Pages project.
4. Go to **Settings** → **Functions** → **D1 database bindings**.
5. Add this binding if it is missing:
   - **Variable name**: `DB`
   - **D1 database**: `traffic-map-db`
6. Save the setting.

### Step 5: Test your deployment

Use the exact URL printed by Wrangler after deployment. It may be different for
each Cloudflare account.

Your website URL may look like this:

```text
https://cloudflare-traffic-map.pages.dev
```

This is only an example. If Wrangler prints a different URL, use that one.

To test the refresh Worker, use the exact status URL printed by the setup
wizard. It may look like this:

```text
https://traffic-map-refresh.<your-subdomain>.workers.dev/status
```

`<your-subdomain>` is different for each Cloudflare account.

If the map opens but does not show live traffic yet, wait a few minutes. The
refresh Worker runs automatically. You can also run a manual refresh with the
`REFRESH_TOKEN` shown by the wizard.

## Optional: prepare secrets with `.env`

You can copy `.env.example` to `.env` before running the wizard if you prefer to
fill in values once instead of pasting them during setup:

```powershell
Copy-Item .env.example .env
notepad .env
npm run setup
```

## Manual deploy commands

If you already know Cloudflare and prefer manual commands:

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

Run these commands from `workers/refresh/`.

#### 1. Get your Cloudflare account ID

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Select the account that contains your Zero Trust/Gateway logs.
3. Copy the **Account ID** from the account overview page or from the right
   sidebar on most dashboard pages.

#### 2. Create the API token

1. Open **My Profile** → **API Tokens** → **Create Token**.
2. Choose **Create Custom Token**.
3. Add this permission:
   - **Account** → **Zero Trust** → **Read**
4. Set **Account Resources** to the account used by this project.
5. Create the token and copy it immediately. Cloudflare only shows it once.

#### 3. Create a refresh token

`REFRESH_TOKEN` can be any long random string. It is only used to authorize
manual `/refresh` calls. Generate one locally, for example:

```powershell
node -e "console.log(crypto.randomUUID() + crypto.randomUUID())"
```

Then save the values as Worker secrets:

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
