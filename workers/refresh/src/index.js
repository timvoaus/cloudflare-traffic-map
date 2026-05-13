// Traffic Map refresh Worker — GraphQL edition.
//
// Uses Cloudflare Analytics GraphQL (`gatewayResolverQueriesAdaptiveGroups`)
// with dimensions `srcIpCountry` and `resolvedIpCountries`. A single POST
// returns fully aggregated counts over the last 24 h, regardless of volume
// (tested with >55k queries). No pagination, no per-IP geo lookup.
//
// Required secrets:  CF_ACCOUNT_ID, CF_API_TOKEN, REFRESH_TOKEN
// D1 binding:        DB

import { COUNTRY_CENTROIDS } from './centroids.js';

const normCC = v => String(v || '').trim().toUpperCase();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─────────────────────── Rate-limited fetch ───────────────────────
async function rlFetch(url, init = {}, { tries = 6, baseDelay = 400 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '', 10);
        const delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 30_000)
          : Math.min(baseDelay * 2 ** attempt, 15_000);
        await sleep(delay);
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      await sleep(Math.min(baseDelay * 2 ** attempt, 15_000));
    }
  }
  throw lastErr || new Error(`Failed after ${tries} attempts: ${url}`);
}

// ─────────────────────── GraphQL pull ───────────────────────
const GQL_QUERY = `
query TrafficMap($acct: string!, $start: Time!, $end: Time!, $rowLimit: Int!) {
  viewer {
    accounts(filter: { accountTag: $acct }) {
      total: gatewayResolverQueriesAdaptiveGroups(
        filter: { datetime_geq: $start, datetime_leq: $end }
        limit: 1
      ) { count }

      sources: gatewayResolverQueriesAdaptiveGroups(
        filter: { datetime_geq: $start, datetime_leq: $end }
        limit: $rowLimit
        orderBy: [count_DESC]
      ) { count dimensions { srcIpCountry } }

      destinations: gatewayResolverQueriesAdaptiveGroups(
        filter: { datetime_geq: $start, datetime_leq: $end }
        limit: $rowLimit
        orderBy: [count_DESC]
      ) { count dimensions { resolvedIpCountries } }

      routes: gatewayResolverQueriesAdaptiveGroups(
        filter: { datetime_geq: $start, datetime_leq: $end }
        limit: $rowLimit
        orderBy: [count_DESC]
      ) { count dimensions { srcIpCountry resolvedIpCountries } }
    }
  }
}`;

async function fetchTrafficFromGraphQL(env) {
  // Free plan keeps logs only 24h — clamp to 24h max.
  const MAX_HOURS = 24;
  const hours = Math.min(Math.max(1, parseInt(env.WINDOW_HOURS || '24', 10)), MAX_HOURS);
  const end = new Date();
  const start = new Date(end.getTime() - hours * 3600 * 1000);

  const body = {
    query: GQL_QUERY,
    variables: {
      acct: env.CF_ACCOUNT_ID,
      start: start.toISOString(),
      end: end.toISOString(),
      rowLimit: 10000,
    },
  };

  const res = await rlFetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(data.errors || data).slice(0, 500)}`);
  }
  const acct = data.data?.viewer?.accounts?.[0];
  if (!acct) throw new Error('GraphQL: no account node returned');

  return {
    total: acct.total?.[0]?.count || 0,
    rawSources: acct.sources || [],
    rawDestinations: acct.destinations || [],
    rawRoutes: acct.routes || [],
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
  };
}

// ─────────────────────── Aggregation ───────────────────────
function countryPoint(cc) {
  const c = COUNTRY_CENTROIDS[cc];
  return c ? { lat: c[0], lng: c[1] } : null;
}

// Unique country codes from a resolvedIpCountries array.
function uniqueDestCountries(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  for (const v of list) {
    const cc = normCC(v);
    if (cc) seen.add(cc);
  }
  return [...seen];
}

function aggregate(raw) {
  // Tracks any ISO code we couldn't plot because it's missing from
  // COUNTRY_CENTROIDS (so we surface it in the run summary / meta table).
  const unmapped = new Map();
  const noteUnmapped = cc => {
    if (!cc) return;
    unmapped.set(cc, (unmapped.get(cc) || 0) + 1);
  };

  // Sources
  const sources = new Map();
  for (const row of raw.rawSources) {
    const cc = normCC(row.dimensions?.srcIpCountry);
    if (!cc) continue;
    const p = countryPoint(cc);
    if (!p) { noteUnmapped(cc); continue; }
    sources.set(cc, (sources.get(cc) || 0) + (row.count || 0));
  }

  // Destinations: collapse resolvedIpCountries arrays to unique countries per row.
  const destinations = new Map();
  for (const row of raw.rawDestinations) {
    const countries = uniqueDestCountries(row.dimensions?.resolvedIpCountries);
    if (countries.length === 0) continue; // blocked / unresolved
    for (const cc of countries) {
      const p = countryPoint(cc);
      if (!p) { noteUnmapped(cc); continue; }
      destinations.set(cc, (destinations.get(cc) || 0) + (row.count || 0));
    }
  }

  // Routes (source → destination pairs)
  const routes = new Map();
  for (const row of raw.rawRoutes) {
    const src = normCC(row.dimensions?.srcIpCountry);
    const dstList = uniqueDestCountries(row.dimensions?.resolvedIpCountries);
    if (!src || dstList.length === 0) continue;
    const srcP = countryPoint(src);
    if (!srcP) { noteUnmapped(src); continue; }
    for (const dst of dstList) {
      if (dst === src) continue; // skip self-loops for visual clarity
      const dstP = countryPoint(dst);
      if (!dstP) { noteUnmapped(dst); continue; }
      const key = `${src}->${dst}`;
      const cur = routes.get(key);
      if (cur) { cur.count += (row.count || 0); continue; }
      routes.set(key, {
        source_country: src, destination_country: dst,
        source_lat: srcP.lat, source_lng: srcP.lng,
        destination_lat: dstP.lat, destination_lng: dstP.lng,
        count: row.count || 0,
      });
    }
  }

  return {
    sources: [...sources.entries()].map(([cc, count]) => {
      const p = countryPoint(cc);
      return { country: cc, lat: p.lat, lng: p.lng, count };
    }).sort((a, b) => b.count - a.count),
    destinations: [...destinations.entries()].map(([cc, count]) => {
      const p = countryPoint(cc);
      return { country: cc, lat: p.lat, lng: p.lng, count };
    }).sort((a, b) => b.count - a.count),
    routes: [...routes.values()].sort((a, b) => b.count - a.count),
    unmapped: [...unmapped.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([country, hits]) => ({ country, hits })),
  };
}

// ─────────────────────── D1 writes ───────────────────────
async function runInChunks(env, stmts, chunk = 100) {
  for (let i = 0; i < stmts.length; i += chunk) {
    await env.DB.batch(stmts.slice(i, i + chunk));
  }
}

async function writeAggregate(env, agg) {
  const stmts = [
    env.DB.prepare('DELETE FROM sources'),
    env.DB.prepare('DELETE FROM destinations'),
    env.DB.prepare('DELETE FROM routes'),
  ];
  const insSrc = env.DB.prepare('INSERT INTO sources (country, lat, lng, count) VALUES (?, ?, ?, ?)');
  for (const s of agg.sources) stmts.push(insSrc.bind(s.country, s.lat, s.lng, s.count));

  const insDst = env.DB.prepare('INSERT INTO destinations (country, lat, lng, count) VALUES (?, ?, ?, ?)');
  for (const d of agg.destinations) stmts.push(insDst.bind(d.country, d.lat, d.lng, d.count));

  const insRoute = env.DB.prepare(
    `INSERT INTO routes
       (source_country, destination_country, source_lat, source_lng,
        destination_lat, destination_lng, count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const r of agg.routes) {
    stmts.push(insRoute.bind(
      r.source_country, r.destination_country,
      r.source_lat, r.source_lng,
      r.destination_lat, r.destination_lng,
      r.count,
    ));
  }
  await runInChunks(env, stmts);
}

async function updateMeta(env, payload) {
  await env.DB.prepare(
    `INSERT INTO meta (key, value) VALUES ('last_refresh', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).bind(JSON.stringify(payload)).run();
}

// Persist today's snapshot (UTC day) and prune anything older than 30 days.
async function upsertDailySnapshot(env, agg, totalQueries) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const payload = JSON.stringify({
    sources: agg.sources,
    destinations: agg.destinations,
    routes: agg.routes,
  });
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO daily_snapshots
         (day, total_queries, source_count, destination_count, route_count, payload, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(day) DO UPDATE SET
         total_queries = excluded.total_queries,
         source_count = excluded.source_count,
         destination_count = excluded.destination_count,
         route_count = excluded.route_count,
         payload = excluded.payload,
         updated_at = excluded.updated_at`,
    ).bind(
      day,
      totalQueries,
      agg.sources.length,
      agg.destinations.length,
      agg.routes.length,
      payload,
      Math.floor(Date.now() / 1000),
    ),
    // Keep only the last 30 days.
    env.DB.prepare(
      `DELETE FROM daily_snapshots WHERE day < date('now', '-30 days')`,
    ),
  ]);
}

// ─────────────────────── Orchestrator ───────────────────────
async function refreshAll(env) {
  const start = Date.now();
  const raw = await fetchTrafficFromGraphQL(env);
  const agg = aggregate(raw);
  await writeAggregate(env, agg);
  await upsertDailySnapshot(env, agg, raw.total);

  const summary = {
    totalQueries: raw.total,
    sources: agg.sources.length,
    destinations: agg.destinations.length,
    routes: agg.routes.length,
    unmappedCountries: agg.unmapped, // [{ country, hits }] — empty when all codes are plotted
    window: { from: raw.windowStart, to: raw.windowEnd },
    durationMs: Date.now() - start,
    updatedAt: new Date().toISOString(),
  };
  if (agg.unmapped.length > 0) {
    console.warn('Unmapped country codes (add to centroids.js):',
      agg.unmapped.map(u => `${u.country}×${u.hits}`).join(', '));
  }
  await updateMeta(env, summary);
  return summary;
}

// ─────────────────────── Entry points ───────────────────────
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshAll(env).then(s => console.log('refresh ok', s))
      .catch(e => console.error('refresh failed', e)));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/refresh') {
      const token = url.searchParams.get('token');
      if (!env.REFRESH_TOKEN || token !== env.REFRESH_TOKEN) {
        return new Response('forbidden', { status: 403 });
      }
      try {
        const summary = await refreshAll(env);
        return Response.json({ success: true, ...summary });
      } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 500 });
      }
    }
    if (url.pathname === '/status') {
      const row = await env.DB.prepare("SELECT value FROM meta WHERE key='last_refresh'").first();
      return Response.json(row ? JSON.parse(row.value) : { success: false, error: 'no data' });
    }
    return new Response('traffic-map-refresh (GraphQL). Use POST /refresh?token=… or GET /status', {
      headers: { 'content-type': 'text/plain' },
    });
  },
};
