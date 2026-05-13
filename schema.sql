-- =============================================================
-- D1 schema for the Traffic Destination Map (single source of truth)
-- Run once with:
--   npm run d1:seed:remote
-- Safe to re-run: every statement uses IF EXISTS / IF NOT EXISTS.
-- =============================================================

-- Latest 24-hour aggregates (overwritten by the refresh Worker every 5 min).
CREATE TABLE IF NOT EXISTS sources (
  country TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS destinations (
  country TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS routes (
  source_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  source_lat REAL NOT NULL,
  source_lng REAL NOT NULL,
  destination_lat REAL NOT NULL,
  destination_lng REAL NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (source_country, destination_country)
);

-- Run metadata: stores the last_refresh summary JSON so the UI and
-- /status endpoint can report freshness + unmapped-country warnings.
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 30-day rolling history of daily snapshots.
-- The Worker upserts the current UTC day on every refresh and prunes
-- anything older than 30 days.
CREATE TABLE IF NOT EXISTS daily_snapshots (
  day TEXT PRIMARY KEY,            -- YYYY-MM-DD (UTC)
  total_queries INTEGER NOT NULL,
  source_count INTEGER NOT NULL,
  destination_count INTEGER NOT NULL,
  route_count INTEGER NOT NULL,
  payload TEXT NOT NULL,           -- full JSON: { sources, destinations, routes }
  updated_at INTEGER NOT NULL      -- unix seconds
);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_day ON daily_snapshots(day);
