-- =============================================================
-- D1 schema for the Traffic Destination Map (single source of truth)
-- Run once with:
--   npm run d1:seed:remote
-- Safe to re-run: every statement uses IF EXISTS / IF NOT EXISTS.
-- =============================================================

-- Legacy aggregates retained for rollout/rollback. New refreshes publish
-- the current map as the current_snapshot JSON value in meta instead.
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

-- current_snapshot holds the map arrays and their lastRefresh summary.
-- last_refresh is also stored separately for history and /status.
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
