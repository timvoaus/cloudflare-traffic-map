(() => {
  const COUNTRY_NAMES = {
    US: 'United States', VN: 'Vietnam', CN: 'China', JP: 'Japan', KR: 'South Korea',
    IN: 'India', GB: 'United Kingdom', DE: 'Germany', FR: 'France', AU: 'Australia',
    CA: 'Canada', BR: 'Brazil', RU: 'Russia', SG: 'Singapore', HK: 'Hong Kong',
    TW: 'Taiwan', TH: 'Thailand', ID: 'Indonesia', MY: 'Malaysia', PH: 'Philippines',
    NL: 'Netherlands', IE: 'Ireland', IT: 'Italy', ES: 'Spain', IL: 'Israel',
    MX: 'Mexico', AR: 'Argentina', CL: 'Chile', ZA: 'South Africa', NG: 'Nigeria',
    EG: 'Egypt', AE: 'United Arab Emirates', SA: 'Saudi Arabia', TR: 'Turkey',
    PL: 'Poland', SE: 'Sweden', NO: 'Norway', FI: 'Finland', DK: 'Denmark',
    CH: 'Switzerland', BE: 'Belgium', AT: 'Austria', PT: 'Portugal', GR: 'Greece',
    CZ: 'Czechia', UA: 'Ukraine', RO: 'Romania', NZ: 'New Zealand', IS: 'Iceland',
  };

  const svgEl = document.getElementById('world-map');
  const tooltipEl = document.getElementById('tooltip');
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const errorMsgEl = document.getElementById('error-msg');
  const updatedBadge = document.getElementById('updated-badge');

  const formatNumber = n => Number(n || 0).toLocaleString();
  const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const countryLabel = code => COUNTRY_NAMES[code] || code || 'Unknown';

  let projection, pathGen, zoomBehavior, rootGroup;
  const svg = d3.select(svgEl);

  function setupMap(width, height) {
    svg.attr('viewBox', `0 0 ${width} ${height}`)
       .attr('preserveAspectRatio', 'xMidYMid meet');

    projection = d3.geoNaturalEarth1()
      .scale(width / 6.2)
      .translate([width / 2, height / 1.85]);
    pathGen = d3.geoPath(projection);
    svg.selectAll('*').remove();
    rootGroup = svg.append('g').attr('class', 'root');

    rootGroup.append('g').attr('class', 'countries-layer');
    rootGroup.append('g').attr('class', 'arcs-layer');
    rootGroup.append('g').attr('class', 'arc-flows-layer');
    rootGroup.append('g').attr('class', 'dest-layer');
    rootGroup.append('g').attr('class', 'origin-layer');

    zoomBehavior = d3.zoom().scaleExtent([1, 8]).on('zoom', e => {
      rootGroup.attr('transform', e.transform);
    });
    svg.call(zoomBehavior);
  }

  function showTooltip(html, evt) {
    tooltipEl.innerHTML = html;
    tooltipEl.classList.add('visible');
    const pad = 14;
    const w = tooltipEl.offsetWidth, h = tooltipEl.offsetHeight;
    let x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + w > window.innerWidth) x = evt.clientX - w - pad;
    if (y + h > window.innerHeight) y = evt.clientY - h - pad;
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top = y + 'px';
  }
  function hideTooltip() { tooltipEl.classList.remove('visible'); }

  function curvedArc(src, dst) {
    const [sx, sy] = projection([src.lng, src.lat]);
    const [tx, ty] = projection([dst.lng, dst.lat]);
    const dx = tx - sx, dy = ty - sy;
    const dr = Math.sqrt(dx * dx + dy * dy) * 1.3;
    return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
  }

  async function loadWorld() {
    const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    return res.json();
  }

  function renderCountries(world) {
    const features = topojson.feature(world, world.objects.countries).features;
    rootGroup.select('.countries-layer')
      .selectAll('path')
      .data(features)
      .join('path')
      .attr('class', 'country')
      .attr('d', pathGen);
  }

  function render(data) {
    const sources = (data.sources || []).filter(s => s.lat != null && s.lng != null);
    const destinations = (data.destinations || []).filter(d => d.lat != null && d.lng != null);
    const routes = (data.routes || [])
      .filter(r => r.sourceLat != null && r.destinationLat != null)
      .slice(0, 200);

    const maxDest = Math.max(1, ...destinations.map(d => d.count));
    const maxSrc  = Math.max(1, ...sources.map(s => s.count));
    const maxRoute = Math.max(1, ...routes.map(r => r.count));
    const destR = d3.scaleSqrt().domain([1, maxDest]).range([4, 22]);
    const srcR  = d3.scaleSqrt().domain([1, maxSrc]).range([6, 18]);
    const arcW  = d3.scaleSqrt().domain([1, maxRoute]).range([1.2, 3.2]);
    const arcOpacity = d3.scaleSqrt().domain([1, maxRoute]).range([0.55, 0.95]);

    // One color per ORIGIN country — every arc and pin from that origin
    // shares the same color.
    const palette = [
      ...d3.schemeTableau10,
      ...d3.schemeSet2,
      ...d3.schemePaired,
    ];
    const originKeys = sources.map(s => s.country);
    const originColor = d3.scaleOrdinal(palette).domain(originKeys);

    // Arcs (colored by origin)
    const arcSel = rootGroup.select('.arcs-layer')
      .selectAll('path')
      .data(routes, r => `${r.sourceCountry}->${r.destinationCountry}`);
    arcSel.exit().remove();
    const arcEnter = arcSel.enter().append('path')
      .attr('class', 'arc-path')
      .attr('fill', 'none')
      .on('mousemove', (e, d) => showTooltip(
        `<strong>${escapeHtml(countryLabel(d.sourceCountry))} → ${escapeHtml(countryLabel(d.destinationCountry))}</strong><br>${formatNumber(d.count)} queries`, e))
      .on('mouseleave', hideTooltip);

    arcEnter.merge(arcSel)
      .attr('d', d => curvedArc(
        { lat: d.sourceLat, lng: d.sourceLng },
        { lat: d.destinationLat, lng: d.destinationLng }))
      .attr('stroke', d => originColor(d.sourceCountry))
      .attr('stroke-width', d => arcW(d.count))
      .attr('opacity', d => arcOpacity(d.count));

    // Flow overlay — dotted "data packets" moving origin → destination.
    // One faster-moving stream per route, coloured to match the origin.
    const flowSpeed = d3.scaleSqrt().domain([1, maxRoute]).range([7, 2.2]); // seconds; busier = faster
    const flowSel = rootGroup.select('.arc-flows-layer')
      .selectAll('path')
      .data(routes, r => `${r.sourceCountry}->${r.destinationCountry}`);
    flowSel.exit().remove();
    const flowEnter = flowSel.enter().append('path')
      .attr('class', 'arc-flow')
      .attr('fill', 'none')
      .attr('pointer-events', 'none');

    flowEnter.merge(flowSel)
      .attr('d', d => curvedArc(
        { lat: d.sourceLat, lng: d.sourceLng },
        { lat: d.destinationLat, lng: d.destinationLng }))
      .attr('stroke', d => originColor(d.sourceCountry))
      // `color` drives `currentColor` in the drop-shadow filter so the glow
      // halo picks up the same per-origin colour as the stroke.
      .style('color', d => originColor(d.sourceCountry))
      .attr('stroke-width', d => Math.max(1.4, arcW(d.count) * 0.9))
      .style('animation-duration', d => `${flowSpeed(d.count).toFixed(2)}s`)
      // Stagger each route so packets don't all pulse in unison.
      .style('animation-delay', (_, i) => `${(-0.23 * i).toFixed(2)}s`);

    // Destination bubbles
    const destSel = rootGroup.select('.dest-layer')
      .selectAll('circle')
      .data(destinations, d => d.country);
    destSel.exit().remove();
    destSel.enter().append('circle')
      .attr('class', 'dest-bubble')
      .on('mousemove', (e, d) => showTooltip(
        `<strong>${escapeHtml(countryLabel(d.country))}</strong><br>${formatNumber(d.count)} destination queries`, e))
      .on('mouseleave', hideTooltip)
      .merge(destSel)
      .attr('cx', d => projection([d.lng, d.lat])[0])
      .attr('cy', d => projection([d.lng, d.lat])[1])
      .attr('r', d => destR(d.count));

    // Origin pins (map-pin icon, colored by origin country, sized by volume).
    // Pin path: tip at (0,0), head extending upward. Lucide MapPin shape,
    // re-centered so transform-translate places the tip on the country point.
    const pinPath = 'M0 0 C 0 0 -10 -8 -10 -16 A 10 10 0 1 1 10 -16 C 10 -8 0 0 0 0 Z';
    const pinSize = d3.scaleSqrt().domain([1, maxSrc]).range([0.85, 1.55]);

    const srcSel = rootGroup.select('.origin-layer')
      .selectAll('g.origin-pin')
      .data(sources, d => d.country);
    srcSel.exit().remove();
    const srcEnter = srcSel.enter().append('g')
      .attr('class', 'origin-pin')
      .style('cursor', 'pointer')
      .on('mousemove', (e, d) => showTooltip(
        `<strong>Origin · ${escapeHtml(countryLabel(d.country))}</strong><br>${formatNumber(d.count)} queries`, e))
      .on('mouseleave', hideTooltip);
    srcEnter.append('path')
      .attr('class', 'origin-pin-body')
      .attr('d', pinPath);
    srcEnter.append('circle')
      .attr('class', 'origin-pin-dot')
      .attr('cx', 0)
      .attr('cy', -16)
      .attr('r', 3.5);

    const srcMerge = srcEnter.merge(srcSel);
    srcMerge
      .classed('primary', (d, i) => i === 0)
      .attr('transform', d => {
        const [x, y] = projection([d.lng, d.lat]);
        return `translate(${x}, ${y}) scale(${pinSize(d.count)})`;
      })
      // Halo colour follows the pin colour via CSS var (used in pin-pulse).
      .style('--pin-color', d => originColor(d.country));
    srcMerge.select('path.origin-pin-body')
      .attr('fill', d => originColor(d.country));

    // Origins legend (top origins with their colors + share)
    const legendEl = document.getElementById('route-legend');
    const legendListEl = document.getElementById('route-legend-list');
    const legendTitleEl = document.querySelector('.route-legend-title');
    if (legendEl && legendListEl) {
      if (sources.length === 0) {
        legendEl.hidden = true;
      } else {
        legendEl.hidden = false;
        if (legendTitleEl) legendTitleEl.textContent = 'Origin countries';
        const totalSrc = sources.reduce((s, d) => s + (d.count || 0), 0) || 1;
        legendListEl.innerHTML = sources.slice(0, 14).map(s => {
          const color = originColor(s.country);
          const pct = ((s.count / totalSrc) * 100).toFixed(s.count / totalSrc >= 0.1 ? 0 : 1);
          const label = countryLabel(s.country);
          return `<div class="route-legend-item" title="${escapeHtml(label)}">
            <span class="route-legend-swatch" style="background:${color}"></span>
            <span class="route-legend-pair">${escapeHtml(s.country)} · ${escapeHtml(label)}</span>
            <span class="route-legend-count">${formatNumber(s.count)} (${pct}%)</span>
          </div>`;
        }).join('');
      }
    }

    // Stats
    document.getElementById('stat-origins').textContent = formatNumber(sources.length);
    document.getElementById('stat-dests').textContent = formatNumber(destinations.length);
    document.getElementById('stat-routes').textContent = formatNumber(routes.length);
    // Total queries = sum of sources (each query has exactly one source country).
    const total = sources.reduce((s, d) => s + (d.count || 0), 0);
    document.getElementById('stat-total').textContent = formatNumber(total);

    if (data.updatedAt) {
      const dt = new Date(data.updatedAt);
      updatedBadge.textContent = `Updated ${dt.toLocaleTimeString()}`;
    } else {
      updatedBadge.textContent = 'Live';
    }
  }

  async function loadData() {
    loadingEl.hidden = false;
    errorEl.hidden = true;
    try {
      const res = await fetch('/api/traffic-map');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success === false) throw new Error(data.error || 'API error');
      render(data);
    } catch (e) {
      errorMsgEl.textContent = e.message;
      errorEl.hidden = false;
    } finally {
      loadingEl.hidden = true;
    }
  }

  async function init() {
    const wrap = svgEl.parentElement;
    setupMap(wrap.clientWidth, wrap.clientHeight);
    try {
      const world = await loadWorld();
      renderCountries(world);
    } catch (e) {
      errorMsgEl.textContent = 'Could not load world topology: ' + e.message;
      errorEl.hidden = false;
      loadingEl.hidden = true;
      return;
    }
    await loadData();
  }

  // Controls
  document.getElementById('btn-refresh').addEventListener('click', loadData);
  document.getElementById('zoom-in').addEventListener('click', () => svg.transition().call(zoomBehavior.scaleBy, 1.5));
  document.getElementById('zoom-out').addEventListener('click', () => svg.transition().call(zoomBehavior.scaleBy, 1 / 1.5));
  document.getElementById('zoom-reset').addEventListener('click', () => svg.transition().call(zoomBehavior.transform, d3.zoomIdentity));
  document.getElementById('btn-theme').addEventListener('click', () => {
    const html = document.documentElement;
    html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
  });

  // Responsive
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 200);
  });

  init();
})();
