// Cloudflare Pages Function — GET /api/traffic-map
// Reads aggregated traffic data from the bound D1 database (binding name: DB)

export const onRequestGet = async ({ env }) => {
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

  try {
    const [sourcesRes, destsRes, routesRes, historyRes, metaRes] = await Promise.all([
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

    return new Response(JSON.stringify({
      success: true,
      sources,
      destinations,
      routes,
      dailyHistory,
      lastRefresh,
      updatedAt: new Date().toISOString(),
    }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message || String(err),
    }), { status: 500, headers });
  }
};
