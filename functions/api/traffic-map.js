// Cloudflare Pages Function — GET /api/traffic-map[?range=24h|7d|30d]
// Reads aggregated traffic data from the bound D1 database (binding name: DB).
//
// range=24h (default) — returns the latest refresh window from the live tables
//                       (sources / destinations / routes).
// range=7d  / 30d    — aggregates per-day payloads from daily_snapshots over
//                       the requested N-day window. Minimum granularity is 1 day.

const RANGE_TO_DAYS = { '24h': 1, '7d': 7, '30d': 30 };

export const onRequestGet = async ({ env, request }) => {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=30',
  };

  if (!env.DB) {
    return new Response(JSON.stringify({
      success: false,
      error: 'D1 binding "DB" is not configured for this Pages project.',
    }), { status: 500, headers });
  }

  const url = new URL(request.url);
  const rangeParam = (url.searchParams.get('range') || '24h').toLowerCase();
  const days = RANGE_TO_DAYS[rangeParam] || 1;
  const range = days === 1 ? '24h' : `${days}d`;

  try {
    if (days > 1) {
      return await aggregatedResponse(env, days, range, headers);
    }
    const [sourcesRes, destsRes, routesRes, historyRes, metaRes, rangeRes] = await Promise.all([
      env.DB.prepare('SELECT country, lat, lng, count FROM sources ORDER BY count DESC').all(),
      env.DB.prepare('SELECT country, lat, lng, count FROM destinations ORDER BY count DESC').all(),
      env.DB.prepare(`SELECT source_country, destination_country,
                             source_lat, source_lng,
                             destination_lat, destination_lng, count
                      FROM routes ORDER BY count DESC`).all(),
      env.DB.prepare(`SELECT day, total_queries, source_count, destination_count, route_count, updated_at
                      FROM daily_snapshots
                      WHERE day >= date('now', '-30 days')
                      ORDER BY day ASC`).all(),
      env.DB.prepare("SELECT value FROM meta WHERE key='last_refresh'").first(),
      env.DB.prepare(`SELECT MIN(day) AS oldest_day,
                             MAX(day) AS latest_day,
                             MIN(updated_at) AS oldest_updated,
                             MAX(updated_at) AS latest_updated
                      FROM daily_snapshots`).first(),
    ]);

    const sources = (sourcesRes.results || []).map(r => ({
      country: r.country, lat: r.lat, lng: r.lng, count: r.count,
    }));
    const destinations = (destsRes.results || []).map(r => ({
      country: r.country, lat: r.lat, lng: r.lng, count: r.count,
    }));
    const routes = (routesRes.results || []).map(r => ({
      sourceCountry: r.source_country,
      destinationCountry: r.destination_country,
      sourceLat: r.source_lat,
      sourceLng: r.source_lng,
      destinationLat: r.destination_lat,
      destinationLng: r.destination_lng,
      count: r.count,
    }));

    const dailyHistory = (historyRes.results || []).map(r => ({
      day: r.day,
      totalQueries: r.total_queries,
      sourceCount: r.source_count,
      destinationCount: r.destination_count,
      routeCount: r.route_count,
    }));
    let lastRefresh = null;
    try { lastRefresh = metaRes ? JSON.parse(metaRes.value) : null; } catch {}

    // 24h dataRange = the most recent refresh window from the worker meta.
    let dataRange = null;
    if (lastRefresh && lastRefresh.window && lastRefresh.window.from && lastRefresh.window.to) {
      dataRange = { oldest: lastRefresh.window.from, latest: lastRefresh.window.to };
    } else if (rangeRes && rangeRes.latest_day) {
      // Fallback if meta is missing.
      const latestUpdatedIso = rangeRes.latest_updated
        ? new Date(rangeRes.latest_updated * 1000).toISOString()
        : `${rangeRes.latest_day}T23:59:59Z`;
      dataRange = { oldest: `${rangeRes.latest_day}T00:00:00Z`, latest: latestUpdatedIso };
    }
    const totalQueries = sources.reduce((s, d) => s + (d.count || 0), 0);

    return new Response(JSON.stringify({
      success: true,
      range,
      sources,
      destinations,
      routes,
      totalQueries,
      dailyHistory,
      lastRefresh,
      dataRange,
      updatedAt: new Date().toISOString(),
    }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message || String(err),
    }), { status: 500, headers });
  }
};

// Aggregate N days of daily_snapshots payloads into the same shape as the
// 24h response. Daily-grained only — no hourly granularity.
async function aggregatedResponse(env, days, range, headers) {
  try {
    const [snapsRes, totalRes, historyRes, metaRes] = await Promise.all([
      env.DB.prepare(
        `SELECT day, payload, updated_at
         FROM daily_snapshots
         WHERE day >= date('now', ?)
         ORDER BY day ASC`,
      ).bind(`-${days - 1} days`).all(),
      env.DB.prepare(
        `SELECT SUM(total_queries) AS total,
                MIN(day) AS oldest_day,
                MAX(day) AS latest_day,
                MAX(updated_at) AS latest_updated
         FROM daily_snapshots
         WHERE day >= date('now', ?)`,
      ).bind(`-${days - 1} days`).first(),
      env.DB.prepare(`SELECT day, total_queries, source_count, destination_count, route_count, updated_at
                      FROM daily_snapshots
                      WHERE day >= date('now', '-30 days')
                      ORDER BY day ASC`).all(),
      env.DB.prepare("SELECT value FROM meta WHERE key='last_refresh'").first(),
    ]);

    const sourceMap = new Map();      // country -> { country, lat, lng, count }
    const destMap = new Map();        // country -> { country, lat, lng, count }
    const routeMap = new Map();       // `${src}->${dst}` -> route obj
    let parseFailures = 0;

    for (const row of (snapsRes.results || [])) {
      let payload;
      try { payload = JSON.parse(row.payload); } catch { parseFailures++; continue; }
      for (const s of (payload.sources || [])) {
        const cur = sourceMap.get(s.country);
        if (cur) {
          cur.count += s.count || 0;
        } else {
          sourceMap.set(s.country, { country: s.country, lat: s.lat, lng: s.lng, count: s.count || 0 });
        }
      }
      for (const d of (payload.destinations || [])) {
        const cur = destMap.get(d.country);
        if (cur) {
          cur.count += d.count || 0;
        } else {
          destMap.set(d.country, { country: d.country, lat: d.lat, lng: d.lng, count: d.count || 0 });
        }
      }
      for (const r of (payload.routes || [])) {
        // Stored payload uses snake_case (matches D1 column names from worker).
        const sourceCountry = r.sourceCountry ?? r.source_country;
        const destinationCountry = r.destinationCountry ?? r.destination_country;
        if (!sourceCountry || !destinationCountry) continue;
        const sourceLat = r.sourceLat ?? r.source_lat;
        const sourceLng = r.sourceLng ?? r.source_lng;
        const destinationLat = r.destinationLat ?? r.destination_lat;
        const destinationLng = r.destinationLng ?? r.destination_lng;
        const key = `${sourceCountry}->${destinationCountry}`;
        const cur = routeMap.get(key);
        if (cur) {
          cur.count += r.count || 0;
        } else {
          routeMap.set(key, {
            sourceCountry,
            destinationCountry,
            sourceLat,
            sourceLng,
            destinationLat,
            destinationLng,
            count: r.count || 0,
          });
        }
      }
    }

    const sources = Array.from(sourceMap.values()).sort((a, b) => b.count - a.count);
    const destinations = Array.from(destMap.values()).sort((a, b) => b.count - a.count);
    const routes = Array.from(routeMap.values()).sort((a, b) => b.count - a.count);

    const dailyHistory = (historyRes.results || []).map(r => ({
      day: r.day,
      totalQueries: r.total_queries,
      sourceCount: r.source_count,
      destinationCount: r.destination_count,
      routeCount: r.route_count,
    }));
    let lastRefresh = null;
    try { lastRefresh = metaRes ? JSON.parse(metaRes.value) : null; } catch {}

    // dataRange spans the requested aggregation window.
    let dataRange = null;
    if (totalRes && totalRes.oldest_day) {
      const oldestIso = `${totalRes.oldest_day}T00:00:00Z`;
      const latestDayEndIso = `${totalRes.latest_day}T23:59:59Z`;
      const latestUpdatedIso = totalRes.latest_updated
        ? new Date(totalRes.latest_updated * 1000).toISOString()
        : null;
      const refreshEnd = lastRefresh && lastRefresh.window && lastRefresh.window.to;
      const candidates = [latestUpdatedIso, refreshEnd, latestDayEndIso].filter(Boolean);
      const latestIso = candidates.reduce((a, b) => (new Date(b) > new Date(a) ? b : a), candidates[0]);
      dataRange = { oldest: oldestIso, latest: latestIso };
    }

    return new Response(JSON.stringify({
      success: true,
      range,
      sources,
      destinations,
      routes,
      totalQueries: (totalRes && totalRes.total) || 0,
      dailyHistory,
      lastRefresh,
      dataRange,
      parseFailures,
      updatedAt: new Date().toISOString(),
    }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message || String(err),
    }), { status: 500, headers });
  }
}
