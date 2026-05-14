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
    EU: 'European Union', AP: 'Asia / Pacific',
    T1: 'Tor network', A1: 'Anonymous proxy', A2: 'Satellite provider',
    O1: 'Other / unspecified', XX: 'Unknown',
    AC: 'Ascension Island', CP: 'Clipperton Island', DG: 'Diego Garcia',
    EA: 'Ceuta & Melilla', IC: 'Canary Islands', TA: 'Tristan da Cunha',
    UK: 'United Kingdom', AN: 'Netherlands Antilles',
    CS: 'Serbia & Montenegro', YU: 'Yugoslavia', SU: 'Soviet Union',
    TP: 'East Timor', ZR: 'Zaire', BU: 'Burma',
  };

  const svgEl = document.getElementById('world-map');
  const cometCanvas = document.getElementById('comet-canvas');
  const cometCtx = cometCanvas.getContext('2d');
  const tooltipEl = document.getElementById('tooltip');
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const errorMsgEl = document.getElementById('error-msg');
  const updatedBadge = document.getElementById('updated-badge');

  const formatNumber = n => Number(n || 0).toLocaleString();
  const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const countryLabel = code => COUNTRY_NAMES[code] || code || 'Unknown';
  const hexToRgb = hex => {
    const h = hex.replace('#', '');
    const value = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return { r: value >> 16 & 255, g: value >> 8 & 255, b: value & 255 };
  };
  const rgba = (hex, alpha = 1) => {
    const c = hexToRgb(hex);
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
  };
  const lightModeRgb = (color, saturation = 1.18, brightness = 0.92) => {
    const avg = (color.r + color.g + color.b) / 3;
    return {
      r: Math.round(Math.min(255, (avg + (color.r - avg) * saturation) * brightness)),
      g: Math.round(Math.min(255, (avg + (color.g - avg) * saturation) * brightness)),
      b: Math.round(Math.min(255, (avg + (color.b - avg) * saturation) * brightness)),
    };
  };

  let projection, pathGen, zoomBehavior, rootGroup;
  let cometTimer;
  let currentZoom = d3.zoomIdentity;
  let canvasWidth = 0;
  let canvasHeight = 0;
  const svg = d3.select(svgEl);

  function setupMap(width, height) {
    canvasWidth = width;
    canvasHeight = height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cometCanvas.width = Math.round(width * dpr);
    cometCanvas.height = Math.round(height * dpr);
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

    currentZoom = d3.zoomIdentity;
    zoomBehavior = d3.zoom().scaleExtent([1, 8]).on('zoom', e => {
      currentZoom = e.transform;
      rootGroup.attr('transform', currentZoom);
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
    if (cometTimer) {
      cometTimer.stop();
      cometTimer = null;
    }
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

    // Invisible route hit areas for tooltips.
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
      .attr('stroke', 'transparent')
      .attr('stroke-width', d => Math.max(12, arcW(d.count) * 4))
      .attr('opacity', 0);

    rootGroup.select('.arc-flows-layer').selectAll('*').remove();
    const flowSpeed = d3.scalePow().exponent(0.35).domain([1, maxRoute]).range([3.4, 8.8]);
    const tailScale = d3.scalePow().exponent(0.35).domain([1, maxRoute]).range([16, 28]);
    const tailGapScale = d3.scalePow().exponent(0.35).domain([1, maxRoute]).range([0.018, 0.03]);
    const cometSize = d3.scalePow().exponent(0.35).domain([1, maxRoute]).range([2.8, 7.8]);
    const routePaths = routes.map((route, routeIndex) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', curvedArc(
        { lat: route.sourceLat, lng: route.sourceLng },
        { lat: route.destinationLat, lng: route.destinationLng }));
      const length = path.getTotalLength();
      const sampleCount = Math.max(120, Math.min(420, Math.round(length * 0.9)));
      const xs = new Float32Array(sampleCount + 1);
      const ys = new Float32Array(sampleCount + 1);
      for (let i = 0; i <= sampleCount; i++) {
        const pt = path.getPointAtLength((i / sampleCount) * length);
        xs[i] = pt.x;
        ys[i] = pt.y;
      }
      const tailSteps = Math.round(tailScale(route.count));
      const gap = tailGapScale(route.count);
      const size = cometSize(route.count);
      const tail = Array.from({ length: tailSteps }, (_, idx) => {
        const step = idx + 1;
        const fade = 1 - step / (tailSteps + 1);
        return {
          offset: step * gap,
          width: Math.max(1.05, size * 0.56 * Math.pow(fade, 0.85)),
          alpha: Math.max(0.035, 0.62 * Math.pow(fade, 1.65)),
        };
      });
      return {
        xs,
        ys,
        sampleCount,
        // Random initial phase so comets are visible along the full path
        // immediately after refresh instead of all clustered at the source.
        start: performance.now() - Math.random() * flowSpeed(route.count) * 1000,
        duration: flowSpeed(route.count) * 1000,
        color: originColor(route.sourceCountry),
        colorRgb: hexToRgb(originColor(route.sourceCountry)),
        lightRgb: lightModeRgb(hexToRgb(originColor(route.sourceCountry))),
        tail,
        gap,
        size,
      };
    });
    const sampleAt = (routePath, t) => {
      const f = Math.max(0, Math.min(1, t)) * routePath.sampleCount;
      const i = Math.min(routePath.sampleCount - 1, f | 0);
      const frac = f - i;
      return {
        x: routePath.xs[i] + (routePath.xs[i + 1] - routePath.xs[i]) * frac,
        y: routePath.ys[i] + (routePath.ys[i + 1] - routePath.ys[i]) * frac,
      };
    };
    cometTimer = d3.timer(now => {
      const isLight = document.documentElement.dataset.theme === 'light';
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cometCtx.setTransform(1, 0, 0, 1, 0, 0);
      cometCtx.clearRect(0, 0, cometCanvas.width, cometCanvas.height);
      cometCtx.setTransform(dpr * currentZoom.k, 0, 0, dpr * currentZoom.k, dpr * currentZoom.x, dpr * currentZoom.y);
      cometCtx.globalCompositeOperation = isLight ? 'source-over' : 'lighter';
      cometCtx.lineCap = 'round';
      for (let i = 0; i < routePaths.length; i++) {
        const rp = routePaths[i];
        const headProgress = ((now - rp.start) / rp.duration) % 1;
        cometCtx.strokeStyle = isLight
          ? `rgb(${rp.lightRgb.r}, ${rp.lightRgb.g}, ${rp.lightRgb.b})`
          : rp.color;
        cometCtx.shadowColor = rp.color;
        cometCtx.shadowBlur = 0;
        const tailEndOffset = rp.tail.length ? rp.tail[rp.tail.length - 1].offset : rp.gap;
        const startProgress = Math.max(0, headProgress - tailEndOffset);
        const tailStart = sampleAt(rp, startProgress);
        const head = sampleAt(rp, headProgress);
        const gradient = cometCtx.createLinearGradient(tailStart.x, tailStart.y, head.x, head.y);
        if (isLight) {
          gradient.addColorStop(0, `rgba(${rp.lightRgb.r}, ${rp.lightRgb.g}, ${rp.lightRgb.b}, 0)`);
          gradient.addColorStop(0.45, `rgba(${rp.lightRgb.r}, ${rp.lightRgb.g}, ${rp.lightRgb.b}, 0.24)`);
          gradient.addColorStop(0.82, `rgba(${rp.lightRgb.r}, ${rp.lightRgb.g}, ${rp.lightRgb.b}, 0.62)`);
          gradient.addColorStop(1, `rgba(${rp.lightRgb.r}, ${rp.lightRgb.g}, ${rp.lightRgb.b}, 0.95)`);
        } else {
          gradient.addColorStop(0, `rgba(${rp.colorRgb.r}, ${rp.colorRgb.g}, ${rp.colorRgb.b}, 0)`);
          gradient.addColorStop(0.45, `rgba(${rp.colorRgb.r}, ${rp.colorRgb.g}, ${rp.colorRgb.b}, 0.22)`);
          gradient.addColorStop(0.82, `rgba(${rp.colorRgb.r}, ${rp.colorRgb.g}, ${rp.colorRgb.b}, 0.7)`);
          gradient.addColorStop(1, `rgba(${rp.colorRgb.r}, ${rp.colorRgb.g}, ${rp.colorRgb.b}, 1)`);
        }
        cometCtx.globalAlpha = 1;
        cometCtx.strokeStyle = gradient;
        cometCtx.lineWidth = Math.max(1.2, rp.size * 0.5);
        cometCtx.beginPath();
        const tailSamples = Math.max(10, Math.min(22, rp.tail.length));
        for (let step = 0; step <= tailSamples; step++) {
          const progress = startProgress + (headProgress - startProgress) * (step / tailSamples);
          const p = sampleAt(rp, progress);
          if (step === 0) {
            cometCtx.moveTo(p.x, p.y);
          } else {
            cometCtx.lineTo(p.x, p.y);
          }
        }
        cometCtx.stroke();
        cometCtx.globalAlpha = 1;
        cometCtx.fillStyle = isLight
          ? `rgb(${rp.lightRgb.r}, ${rp.lightRgb.g}, ${rp.lightRgb.b})`
          : rp.color;
        cometCtx.shadowColor = rp.color;
        cometCtx.shadowBlur = isLight ? 0 : rp.size * 2.2;
        cometCtx.beginPath();
        cometCtx.arc(head.x, head.y, rp.size, 0, Math.PI * 2);
        cometCtx.fill();
      }
      cometCtx.globalAlpha = 1;
      cometCtx.globalCompositeOperation = 'source-over';
      cometCtx.shadowBlur = 0;
    });

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

    // Legend — origins + scrollable destinations list
    const legendEl = document.getElementById('route-legend');
    const legendListEl = document.getElementById('route-legend-list');
    const destListEl = document.getElementById('dest-legend-list');
    if (legendEl && legendListEl) {
      if (sources.length === 0 && destinations.length === 0) {
        legendEl.hidden = true;
      } else {
        legendEl.hidden = false;
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

        if (destListEl) {
          const totalDst = destinations.reduce((s, d) => s + (d.count || 0), 0) || 1;
          destListEl.innerHTML = destinations.map(d => {
            const pct = ((d.count / totalDst) * 100).toFixed(d.count / totalDst >= 0.1 ? 0 : 1);
            const label = countryLabel(d.country);
            return `<div class="route-legend-item" title="${escapeHtml(label)}">
              <span class="route-legend-swatch dest-swatch"></span>
              <span class="route-legend-pair">${escapeHtml(d.country)} · ${escapeHtml(label)}</span>
              <span class="route-legend-count">${formatNumber(d.count)} (${pct}%)</span>
            </div>`;
          }).join('');
        }
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
