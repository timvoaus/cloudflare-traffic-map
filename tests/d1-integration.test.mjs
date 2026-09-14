import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import worker from '../workers/refresh/src/index.js';
import { onRequestGet } from '../functions/api/traffic-map.js';

const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("ok")}}', d1Databases: ['DB'] });
const originalFetch = globalThis.fetch;
try {
  const DB = await mf.getD1Database('DB');
  const schema = (await readFile(new URL('../schema.sql', import.meta.url), 'utf8')).replace(/--[^\n]*/g, '');
  for (const sql of schema.split(';').filter(s => s.trim())) await DB.prepare(sql).run();
  let count = 4;
  globalThis.fetch = async () => Response.json({ data: { viewer: { accounts: [{
    total: [{ count }], sources: [{ count, dimensions: { srcIpCountry: 'US' } }],
    destinations: [{ count, dimensions: { resolvedIpCountries: ['AU'] } }],
    routes: [{ count, dimensions: { srcIpCountry: 'US', resolvedIpCountries: ['AU'] } }],
  }] } } });
  const env = { DB, CF_ACCOUNT_ID: 'test', CF_API_TOKEN: 'test', REFRESH_TOKEN: 'test' };
  const refresh = () => worker.fetch(new Request('https://test/refresh?token=test'), env);
  assert.equal((await refresh()).status, 200);
  for (const range of ['24h', '7d', '30d']) {
    const response = await onRequestGet({ env, request: new Request(`https://test/api/traffic-map?range=${range}`) });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.totalQueries, 4);
    assert.equal(data.routes[0].sourceCountry, 'US');
    assert.equal(data.routes[0].destinationCountry, 'AU');
    assert.equal(data.routes[0].count, 4);
    assert.equal(data.dailyHistory.length, 1);
  }
  const before = await DB.prepare('SELECT key, value FROM meta ORDER BY key').all();
  await DB.prepare("CREATE TRIGGER fail_snapshot BEFORE UPDATE ON daily_snapshots BEGIN SELECT RAISE(ABORT, 'test failure'); END").run();
  count = 9;
  assert.equal((await refresh()).status, 500);
  assert.deepEqual((await DB.prepare('SELECT key, value FROM meta ORDER BY key').all()).results, before.results, 'failed batch must roll back current snapshot and metadata');
  await DB.prepare('DROP TRIGGER fail_snapshot').run();
  assert.equal((await refresh()).status, 200);
  assert.equal((await DB.prepare('SELECT total_queries FROM daily_snapshots').first()).total_queries, 9);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM routes').first()).n, 0, 'refresh must not write legacy routes');
  console.log('Real D1 integration passed: all ranges, route fields, atomic rollback, repeated refresh.');
} finally {
  globalThis.fetch = originalFetch;
  await mf.dispose();
}
