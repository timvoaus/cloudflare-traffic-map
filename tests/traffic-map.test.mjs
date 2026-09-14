import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/traffic-map.js';
import refreshWorker from '../workers/refresh/src/index.js';

const snapshot = {
  sources: [{ country: 'US', lat: 38, lng: -97, count: 4 }],
  destinations: [{ country: 'AU', lat: -25, lng: 134, count: 4 }],
  routes: [{ source_country: 'US', destination_country: 'AU', source_lat: 38, source_lng: -97, destination_lat: -25, destination_lng: 134, count: 4 }],
  lastRefresh: { totalQueries: 4, window: { from: '2026-09-14T00:00:00Z', to: '2026-09-14T01:00:00Z' } },
};

function dbFor({ current = snapshot, legacy = false, fail = false } = {}) {
  return { prepare(sql) {
    return {
      async first() {
        if (fail) throw new Error('d1 unavailable');
        if (sql.includes('current_snapshot')) return current ? { value: JSON.stringify(current) } : null;
        if (sql.includes('last_refresh')) return { value: JSON.stringify(snapshot.lastRefresh) };
        if (sql.includes('MIN(day)')) return { latest_day: '2026-09-14', latest_updated: 1 };
        return null;
      },
      async all() {
        if (fail) throw new Error('d1 unavailable');
        if (sql.includes('daily_snapshots')) return { results: [] };
        if (sql.includes('sources')) return { results: legacy ? [{ country: 'US', lat: 38, lng: -97, count: 4 }] : [] };
        if (sql.includes('destinations')) return { results: legacy ? [{ country: 'AU', lat: -25, lng: 134, count: 4 }] : [] };
        return { results: legacy ? [{ source_country: 'US', destination_country: 'AU', source_lat: 38, source_lng: -97, destination_lat: -25, destination_lng: 134, count: 4 }] : [] };
      },
    };
  } };
}

async function read(db, range = '24h', waitUntil = () => {}) {
  const response = await onRequestGet({ env: { DB: db }, request: new Request(`https://example.test/api/traffic-map?range=${range}`), waitUntil });
  return { response, body: await response.json() };
}

const cacheStore = new Map();
Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: {
  async match(key) { return cacheStore.get(key.url) || undefined; },
  async put(key, value) { cacheStore.set(key.url, value); },
} } });

const first = await read(dbFor());
assert.deepEqual(first.body.sources, snapshot.sources);
assert.deepEqual(first.body.routes, [{ sourceCountry: 'US', destinationCountry: 'AU', sourceLat: 38, sourceLng: -97, destinationLat: -25, destinationLng: 134, count: 4 }]);
assert.equal(first.body.lastRefresh.totalQueries, 4);
assert.equal(cacheStore.size, 1);

const cached = await read(dbFor({ fail: true }));
assert.deepEqual(cached.body.sources, snapshot.sources);

cacheStore.clear();
const legacy = await read(dbFor({ current: null, legacy: true }));
assert.deepEqual(legacy.body.sources, snapshot.sources);

cacheStore.clear();
const invalid = await read(dbFor({ current: { sources: [], destinations: [], routes: 'invalid' }, legacy: true }));
assert.equal(invalid.response.status, 500);
assert.equal(invalid.response.headers.get('cache-control'), 'no-store');

cacheStore.clear();
const failed = await read(dbFor({ fail: true }));
assert.equal(failed.response.status, 500);
assert.equal(cacheStore.size, 0);

console.log('traffic-map API snapshot/fallback/cache/error checks passed');

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({ data: { viewer: { accounts: [{
  total: [{ count: 4 }],
  sources: [{ count: 4, dimensions: { srcIpCountry: 'US' } }],
  destinations: [{ count: 4, dimensions: { resolvedIpCountries: ['AU'] } }],
  routes: [{ count: 4, dimensions: { srcIpCountry: 'US', resolvedIpCountries: ['AU'] } }],
}] } } }), { headers: { 'content-type': 'application/json' } });

function refreshDb(shouldFail = false) {
  const batches = [];
  return {
    batches,
    prepare(sql) {
      return { sql, bind(...args) { this.args = args; return this; } };
    },
    async batch(statements) {
      batches.push(statements);
      if (shouldFail) throw new Error('atomic batch failed');
      return statements.map(() => ({ meta: { rows_read: 1, rows_written: 1 } }));
    },
  };
}

try {
  const db = refreshDb();
  const result = await refreshWorker.fetch(new Request('https://refresh.test/refresh?token=test'), { DB: db, REFRESH_TOKEN: 'test', CF_ACCOUNT_ID: 'acct', CF_API_TOKEN: 'token' });
  assert.equal(result.status, 200);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 4);
  assert.equal(db.batches[0][0].args[0], 'current_snapshot');
  assert.ok(db.batches[0].every(statement => !/DELETE FROM (sources|destinations|routes)/.test(statement.sql)));

  const failedDb = refreshDb(true);
  const failedRefresh = await refreshWorker.fetch(new Request('https://refresh.test/refresh?token=test'), { DB: failedDb, REFRESH_TOKEN: 'test', CF_ACCOUNT_ID: 'acct', CF_API_TOKEN: 'token' });
  assert.equal(failedRefresh.status, 500);
  assert.equal(failedDb.batches.length, 1);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('refresh Worker atomic snapshot batch checks passed');
