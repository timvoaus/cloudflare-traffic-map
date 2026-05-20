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
    DO: 'Dominican Republic', GE: 'Georgia', CO: 'Colombia', PE: 'Peru', VE: 'Venezuela',
    EC: 'Ecuador', UY: 'Uruguay', PY: 'Paraguay', BO: 'Bolivia', CR: 'Costa Rica',
    PA: 'Panama', GT: 'Guatemala', HN: 'Honduras', SV: 'El Salvador', PR: 'Puerto Rico',
    MA: 'Morocco', DZ: 'Algeria', TN: 'Tunisia', KE: 'Kenya', GH: 'Ghana',
    ET: 'Ethiopia', PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka', NP: 'Nepal',
    KZ: 'Kazakhstan', UZ: 'Uzbekistan', AZ: 'Azerbaijan', AM: 'Armenia', QA: 'Qatar',
    KW: 'Kuwait', OM: 'Oman', BH: 'Bahrain', JO: 'Jordan', LB: 'Lebanon',
    AF: 'Afghanistan', AX: 'Åland Islands', AL: 'Albania', AS: 'American Samoa', AD: 'Andorra',
    AO: 'Angola', AI: 'Anguilla', AQ: 'Antarctica', AG: 'Antigua and Barbuda', AW: 'Aruba',
    BS: 'Bahamas', BB: 'Barbados', BY: 'Belarus', BZ: 'Belize', BJ: 'Benin',
    BM: 'Bermuda', BT: 'Bhutan', BQ: 'Caribbean Netherlands', BA: 'Bosnia and Herzegovina', BW: 'Botswana',
    BV: 'Bouvet Island', IO: 'British Indian Ocean Territory', BN: 'Brunei', BG: 'Bulgaria', BF: 'Burkina Faso',
    BI: 'Burundi', CV: 'Cape Verde', KH: 'Cambodia', CM: 'Cameroon', KY: 'Cayman Islands',
    CF: 'Central African Republic', TD: 'Chad', CX: 'Christmas Island', CC: 'Cocos Islands', KM: 'Comoros',
    CG: 'Republic of the Congo', CD: 'Democratic Republic of the Congo', CK: 'Cook Islands', CI: 'Côte d’Ivoire',
    HR: 'Croatia', CU: 'Cuba', CW: 'Curaçao', CY: 'Cyprus', DJ: 'Djibouti',
    DM: 'Dominica', GQ: 'Equatorial Guinea', ER: 'Eritrea', EE: 'Estonia', SZ: 'Eswatini',
    FK: 'Falkland Islands', FO: 'Faroe Islands', FJ: 'Fiji', GF: 'French Guiana', PF: 'French Polynesia',
    TF: 'French Southern Territories', GA: 'Gabon', GM: 'Gambia', GI: 'Gibraltar', GL: 'Greenland',
    GD: 'Grenada', GP: 'Guadeloupe', GU: 'Guam', GG: 'Guernsey', GN: 'Guinea',
    GW: 'Guinea-Bissau', GY: 'Guyana', HT: 'Haiti', HM: 'Heard Island and McDonald Islands', VA: 'Vatican City',
    HU: 'Hungary', IM: 'Isle of Man', IR: 'Iran', IQ: 'Iraq', JM: 'Jamaica',
    JE: 'Jersey', KI: 'Kiribati', KP: 'North Korea', KG: 'Kyrgyzstan', LA: 'Laos',
    LV: 'Latvia', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya', LI: 'Liechtenstein',
    LT: 'Lithuania', LU: 'Luxembourg', MO: 'Macao', MG: 'Madagascar', MW: 'Malawi',
    MV: 'Maldives', ML: 'Mali', MT: 'Malta', MH: 'Marshall Islands', MQ: 'Martinique',
    MR: 'Mauritania', MU: 'Mauritius', YT: 'Mayotte', FM: 'Micronesia', MD: 'Moldova',
    MC: 'Monaco', MN: 'Mongolia', ME: 'Montenegro', MS: 'Montserrat', MZ: 'Mozambique',
    MM: 'Myanmar', NA: 'Namibia', NR: 'Nauru', NC: 'New Caledonia', NI: 'Nicaragua',
    NE: 'Niger', NU: 'Niue', NF: 'Norfolk Island', MK: 'North Macedonia', MP: 'Northern Mariana Islands',
    PW: 'Palau', PS: 'Palestine', PG: 'Papua New Guinea', PN: 'Pitcairn Islands', RE: 'Réunion',
    BL: 'Saint Barthélemy', SH: 'Saint Helena', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia',
    MF: 'Saint Martin', PM: 'Saint Pierre and Miquelon', VC: 'Saint Vincent and the Grenadines',
    WS: 'Samoa', SM: 'San Marino', ST: 'São Tomé and Príncipe', SN: 'Senegal', RS: 'Serbia',
    SC: 'Seychelles', SL: 'Sierra Leone', SX: 'Sint Maarten', SK: 'Slovakia', SI: 'Slovenia',
    SB: 'Solomon Islands', SO: 'Somalia', GS: 'South Georgia and the South Sandwich Islands',
    SS: 'South Sudan', SD: 'Sudan', SR: 'Suriname', SJ: 'Svalbard and Jan Mayen',
    SY: 'Syria', TJ: 'Tajikistan', TZ: 'Tanzania', TL: 'Timor-Leste', TG: 'Togo',
    TK: 'Tokelau', TO: 'Tonga', TT: 'Trinidad and Tobago', TM: 'Turkmenistan',
    TC: 'Turks and Caicos Islands', TV: 'Tuvalu', UG: 'Uganda', UM: 'U.S. Outlying Islands',
    VI: 'U.S. Virgin Islands', VU: 'Vanuatu', WF: 'Wallis and Futuna', EH: 'Western Sahara',
    YE: 'Yemen', ZM: 'Zambia', ZW: 'Zimbabwe',
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
    const compactCanvas = Math.min(width, height) < 520;
    const dpr = Math.min(window.devicePixelRatio || 1, compactCanvas ? 1.25 : 1.5);
    cometCanvas.width = Math.round(width * dpr);
    cometCanvas.height = Math.round(height * dpr);
    svg.attr('viewBox', `0 0 ${width} ${height}`)
       .attr('preserveAspectRatio', 'xMidYMid meet');

    projection = d3.geoEquirectangular();
    projection.fitSize([width, height], { type: 'Sphere' });
    pathGen = d3.geoPath(projection);
    svg.selectAll('*').remove();
    rootGroup = svg.append('g').attr('class', 'root');

    rootGroup.append('g').attr('class', 'countries-layer');
    rootGroup.append('g').attr('class', 'arcs-layer');
    rootGroup.append('g').attr('class', 'arc-flows-layer');
    rootGroup.append('g').attr('class', 'route-hover-layer');
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
    const viewMin = Math.max(280, Math.min(canvasWidth || 960, canvasHeight || 520));
    const isCompactView = viewMin < 520;
    const routes = (data.routes || [])
      .filter(r => r.sourceLat != null && r.destinationLat != null);
    const isDenseRoutes = routes.length > 300;
    document.documentElement.classList.toggle('is-dense-routes', isDenseRoutes);

    const maxDest = Math.max(1, ...destinations.map(d => d.count));
    const maxSrc  = Math.max(1, ...sources.map(s => s.count));
    const maxRoute = Math.max(1, ...routes.map(r => r.count));
    const mobileFactor = Math.max(0.58, Math.min(1, viewMin / 640));
    const destMin = Math.max(2.8, 4 * mobileFactor);
    const destMax = Math.min(22, Math.max(9, viewMin * 0.032));
    const pinMin = Math.max(0.58, 0.85 * mobileFactor);
    const pinMax = Math.min(1.55, Math.max(0.95, viewMin * 0.00235));
    const arcMin = Math.max(0.75, 1.2 * mobileFactor);
    const arcMax = Math.min(3.2, Math.max(1.65, viewMin * 0.0048));
    const cometMin = Math.max(1.7, 2.8 * mobileFactor);
    const cometMax = Math.min(7.8, Math.max(3.8, viewMin * 0.0115));
    const destR = d3.scaleSqrt().domain([1, maxDest]).range([destMin, destMax]);
    const srcR  = d3.scaleSqrt().domain([1, maxSrc]).range([6 * mobileFactor, 18 * mobileFactor]);
    const arcW  = d3.scaleSqrt().domain([1, maxRoute]).range([arcMin, arcMax]);
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
    const routeKey = r => `${r.sourceCountry}->${r.destinationCountry}`;
    const setRouteHover = route => {
      const key = route ? routeKey(route) : null;
      rootGroup.select('.arc-flows-layer')
        .selectAll('path')
        .classed('is-hovered', d => !!key && routeKey(d) === key);

      const hoverLayer = rootGroup.select('.route-hover-layer');
      const points = route ? [
        {
          role: 'origin',
          color: originColor(route.sourceCountry),
          point: projection([route.sourceLng, route.sourceLat]),
        },
        {
          role: 'destination',
          color: originColor(route.sourceCountry),
          point: projection([route.destinationLng, route.destinationLat]),
        },
      ] : [];
      hoverLayer.selectAll('circle')
        .data(points, d => d.role)
        .join(
          enter => enter.append('circle')
            .attr('class', d => `route-endpoint route-endpoint-${d.role}`)
            .attr('pointer-events', 'none'),
          update => update,
          exit => exit.remove(),
        )
        .attr('cx', d => d.point[0])
        .attr('cy', d => d.point[1])
        .attr('r', d => d.role === 'origin' ? 3.8 : 4.8)
        .attr('stroke', d => d.color);
    };

    // Invisible route hit areas for tooltips.
    const arcSel = rootGroup.select('.arcs-layer')
      .selectAll('path')
      .data(routes, r => `${r.sourceCountry}->${r.destinationCountry}`);
    arcSel.exit().remove();
    const arcEnter = arcSel.enter().append('path')
      .attr('class', 'arc-path')
      .attr('fill', 'none')
      .on('mousemove', (e, d) => {
        setRouteHover(d);
        showTooltip(
          `<strong>${escapeHtml(countryLabel(d.sourceCountry))} → ${escapeHtml(countryLabel(d.destinationCountry))}</strong><br>${formatNumber(d.count)} queries`, e);
      })
      .on('mouseleave', () => {
        setRouteHover(null);
        hideTooltip();
      });

    arcEnter.merge(arcSel)
      .attr('d', d => curvedArc(
        { lat: d.sourceLat, lng: d.sourceLng },
        { lat: d.destinationLat, lng: d.destinationLng }))
      .attr('stroke', 'transparent')
      .attr('stroke-width', d => Math.max(12, arcW(d.count) * 4))
      .attr('opacity', 0);

    const staticArcSel = rootGroup.select('.arc-flows-layer')
      .selectAll('path')
      .data(routes, r => `${r.sourceCountry}->${r.destinationCountry}`);
    staticArcSel.exit().remove();
    staticArcSel.enter().append('path')
      .attr('class', 'route-static-arc')
      .attr('fill', 'none')
      .attr('pointer-events', 'none')
      .merge(staticArcSel)
      .attr('d', d => curvedArc(
        { lat: d.sourceLat, lng: d.sourceLng },
        { lat: d.destinationLat, lng: d.destinationLng }))
      .attr('stroke', d => originColor(d.sourceCountry))
      .attr('stroke-width', d => Math.max(0.55, arcW(d.count) * 0.42))
      .attr('stroke-opacity', d => Math.min(isDenseRoutes ? 0.16 : 0.24, arcOpacity(d.count) * (isDenseRoutes ? 0.18 : 0.26)));

    const flowSpeed = d3.scalePow().exponent(0.35).domain([1, maxRoute]).range(
      isDenseRoutes ? [8.2, 18.2] : [6.6, 15.2],
    );
    const cometSize = d3.scalePow().exponent(0.35).domain([1, maxRoute]).range([cometMin, cometMax]);
    const routeSampleMin = isDenseRoutes ? 72 : routes.length > 160 ? 72 : routes.length > 100 ? 84 : isCompactView ? 90 : 110;
    const routeSampleMax = isDenseRoutes
      ? isCompactView ? 180 : 280
      : routes.length > 160
        ? isCompactView ? 150 : 200
      : routes.length > 100
        ? isCompactView ? 180 : 240
        : isCompactView ? 240 : 340;
    const routeSampleFactor = isDenseRoutes
      ? isCompactView ? 0.5 : 0.68
      : routes.length > 160
        ? isCompactView ? 0.42 : 0.5
      : routes.length > 100
        ? isCompactView ? 0.5 : 0.6
        : isCompactView ? 0.6 : 0.75;
    const routePaths = routes.map(route => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', curvedArc(
        { lat: route.sourceLat, lng: route.sourceLng },
        { lat: route.destinationLat, lng: route.destinationLng }));
      const length = path.getTotalLength();
      const sampleCount = Math.max(
        routeSampleMin,
        Math.min(routeSampleMax, Math.round(length * routeSampleFactor)),
      );
      const xs = new Float32Array(sampleCount + 1);
      const ys = new Float32Array(sampleCount + 1);
      for (let i = 0; i <= sampleCount; i++) {
        const pt = path.getPointAtLength((i / sampleCount) * length);
        xs[i] = pt.x;
        ys[i] = pt.y;
      }
      const size = cometSize(route.count);
      const colorRgb = hexToRgb(originColor(route.sourceCountry));
      const lightRgb = lightModeRgb(colorRgb);
      return {
        xs,
        ys,
        sampleCount,
        // Random initial phase so comets are visible along the full path
        // immediately after refresh instead of all clustered at the source.
        start: performance.now() - Math.random() * flowSpeed(route.count) * 1000,
        duration: flowSpeed(route.count) * 1000,
        color: originColor(route.sourceCountry),
        colorRgb,
        lightRgb,
        headGlow: `rgba(${colorRgb.r}, ${colorRgb.g}, ${colorRgb.b}, 0.22)`,
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
    const drawComets = now => {
      const isLight = document.documentElement.dataset.theme === 'light';
      const dpr = isDenseRoutes ? 1 : Math.min(window.devicePixelRatio || 1, isCompactView ? 1.25 : 1.5);
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
        const head = sampleAt(rp, headProgress);
        cometCtx.globalAlpha = 1;
        const headFill = isLight
          ? `rgb(${rp.lightRgb.r}, ${rp.lightRgb.g}, ${rp.lightRgb.b})`
          : rp.color;
        cometCtx.fillStyle = headFill;
        cometCtx.shadowColor = rp.color;
        cometCtx.shadowBlur = 0;
        const headSize = isDenseRoutes ? rp.size * 0.46 : rp.size * 0.72;
        cometCtx.globalAlpha = 1;
        cometCtx.fillStyle = isLight
          ? `rgba(${rp.lightRgb.r}, ${rp.lightRgb.g}, ${rp.lightRgb.b}, ${isDenseRoutes ? 0.1 : 0.12})`
          : `rgba(${rp.colorRgb.r}, ${rp.colorRgb.g}, ${rp.colorRgb.b}, ${isDenseRoutes ? 0.13 : 0.15})`;
        cometCtx.beginPath();
        cometCtx.arc(head.x, head.y, headSize * (isDenseRoutes ? 1.05 : 1.55), 0, Math.PI * 2);
        cometCtx.fill();
        if (isDenseRoutes) {
          cometCtx.fillStyle = headFill;
          cometCtx.beginPath();
          cometCtx.arc(head.x, head.y, Math.max(0.75, headSize * 0.62), 0, Math.PI * 2);
          cometCtx.fill();
          continue;
        }
        cometCtx.fillStyle = isLight
          ? `rgba(${rp.lightRgb.r}, ${rp.lightRgb.g}, ${rp.lightRgb.b}, 0.38)`
          : `rgba(${rp.colorRgb.r}, ${rp.colorRgb.g}, ${rp.colorRgb.b}, 0.46)`;
        cometCtx.beginPath();
        cometCtx.arc(head.x, head.y, headSize * 1.28, 0, Math.PI * 2);
        cometCtx.fill();
        cometCtx.fillStyle = headFill;
        cometCtx.beginPath();
        cometCtx.arc(head.x, head.y, headSize * 0.68, 0, Math.PI * 2);
        cometCtx.fill();
        cometCtx.shadowBlur = 0;
      }
      cometCtx.globalAlpha = 1;
      cometCtx.globalCompositeOperation = 'source-over';
      cometCtx.shadowBlur = 0;
    };

    let lastCometFrame = 0;
    const cometFrameInterval = isDenseRoutes ? 16 : routePaths.length > 160 ? 33 : routePaths.length > 100 ? 24 : 16;
    requestAnimationFrame(() => drawComets(performance.now()));
    cometTimer = d3.timer(() => {
      const now = performance.now();
      if (document.hidden || now - lastCometFrame < cometFrameInterval) return;
      lastCometFrame = now;
      drawComets(now);
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
    const pinSize = d3.scaleSqrt().domain([1, maxSrc]).range([pinMin, pinMax]);

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
    // Total queries: prefer backend-provided value (authoritative for multi-day ranges).
    const total = (typeof data.totalQueries === 'number')
      ? data.totalQueries
      : sources.reduce((s, d) => s + (d.count || 0), 0);
    document.getElementById('stat-total').textContent = formatNumber(total);
    const totalLabelEl = document.getElementById('stat-total-label');
    if (totalLabelEl && data.range) {
      totalLabelEl.textContent = `Total queries (${data.range})`;
    }

    const fmtShort = iso => {
      try {
        const d = new Date(iso);
        return d.toLocaleString(undefined, {
          month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
      } catch { return ''; }
    };
    const range = data.dataRange;
    const win = data.lastRefresh && data.lastRefresh.window;
    if (range && range.oldest && range.latest) {
      updatedBadge.textContent = `Data: ${fmtShort(range.oldest)} → ${fmtShort(range.latest)}`;
      const refreshedAt = (data.lastRefresh && data.lastRefresh.updatedAt) || data.updatedAt;
      const lines = [
        'Data span stored in D1',
        `Oldest: ${range.oldest}`,
        `Latest: ${range.latest}`,
      ];
      if (refreshedAt) lines.push(`Last refreshed: ${new Date(refreshedAt).toLocaleString()}`);
      updatedBadge.title = lines.join('\n');
    } else if (win && win.from && win.to) {
      updatedBadge.textContent = `Data: ${fmtShort(win.from)} → ${fmtShort(win.to)}`;
      const refreshedAt = data.lastRefresh.updatedAt || data.updatedAt;
      updatedBadge.title = refreshedAt
        ? `Cloudflare GraphQL window\nFrom: ${win.from}\nTo:   ${win.to}\nLast refreshed: ${new Date(refreshedAt).toLocaleString()}`
        : `Cloudflare GraphQL window\nFrom: ${win.from}\nTo:   ${win.to}`;
    } else if (data.updatedAt) {
      const dt = new Date(data.updatedAt);
      updatedBadge.textContent = `Updated ${dt.toLocaleTimeString()}`;
      updatedBadge.title = `Loaded at ${dt.toLocaleString()}`;
    } else {
      updatedBadge.textContent = 'Live';
      updatedBadge.title = '';
    }
  }

  const RANGE_STORAGE_KEY = 'cf-traffic-map.range';
  const VALID_RANGES = new Set(['24h', '7d', '30d']);
  let currentRange = '24h';
  try {
    const saved = localStorage.getItem(RANGE_STORAGE_KEY);
    if (saved && VALID_RANGES.has(saved)) currentRange = saved;
  } catch (_) {}

  async function loadData() {
    loadingEl.hidden = false;
    errorEl.hidden = true;
    try {
      const res = await fetch(`/api/traffic-map?range=${encodeURIComponent(currentRange)}`);
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

  // Range switch (24h / 7d / 30d). Daily granularity only.
  const rangeButtons = Array.from(document.querySelectorAll('.range-btn'));
  const syncRangeButtons = () => {
    for (const btn of rangeButtons) {
      btn.classList.toggle('is-active', btn.dataset.range === currentRange);
      btn.setAttribute('aria-pressed', btn.dataset.range === currentRange ? 'true' : 'false');
    }
  };
  syncRangeButtons();
  for (const btn of rangeButtons) {
    btn.addEventListener('click', () => {
      const next = btn.dataset.range;
      if (!VALID_RANGES.has(next) || next === currentRange) return;
      currentRange = next;
      try { localStorage.setItem(RANGE_STORAGE_KEY, currentRange); } catch (_) {}
      syncRangeButtons();
      loadData();
    });
  }
  const legendEl = document.getElementById('route-legend');
  const legendToggleBtn = document.getElementById('legend-toggle');
  const LEGEND_STORAGE_KEY = 'cf-traffic-map.legend-collapsed';
  const applyLegendCollapsed = collapsed => {
    legendEl.classList.toggle('is-collapsed', collapsed);
    legendToggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    legendToggleBtn.setAttribute('aria-label', collapsed ? 'Expand legend' : 'Collapse legend');
    legendToggleBtn.title = collapsed ? 'Expand legend' : 'Collapse legend';
  };
  try {
    applyLegendCollapsed(localStorage.getItem(LEGEND_STORAGE_KEY) === '1');
  } catch (_) { /* ignore storage errors */ }
  legendToggleBtn.addEventListener('click', () => {
    const collapsed = !legendEl.classList.contains('is-collapsed');
    applyLegendCollapsed(collapsed);
    try { localStorage.setItem(LEGEND_STORAGE_KEY, collapsed ? '1' : '0'); } catch (_) {}
  });
  document.getElementById('zoom-in').addEventListener('click', () => svg.transition().call(zoomBehavior.scaleBy, 1.5));
  document.getElementById('zoom-out').addEventListener('click', () => svg.transition().call(zoomBehavior.scaleBy, 1 / 1.5));
  document.getElementById('zoom-reset').addEventListener('click', () => svg.transition().call(zoomBehavior.transform, d3.zoomIdentity));
  document.getElementById('btn-theme').addEventListener('click', () => {
    const html = document.documentElement;
    html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
  });

  // Fullscreen toggle (works on desktop and mobile; falls back to a
  // CSS pseudo-fullscreen mode for iOS Safari which lacks the API on <body>).
  const fsBtn = document.getElementById('btn-fullscreen');
  const fsEnterIcon = fsBtn.querySelector('.icon-fs-enter');
  const fsExitIcon = fsBtn.querySelector('.icon-fs-exit');
  const isFsApiAvailable = () => !!(
    document.documentElement.requestFullscreen
    || document.documentElement.webkitRequestFullscreen
    || document.documentElement.msRequestFullscreen
  );
  const getFsElement = () =>
    document.fullscreenElement
    || document.webkitFullscreenElement
    || document.msFullscreenElement;
  const updateFsUi = () => {
    const active = !!getFsElement() || document.body.classList.contains('is-pseudo-fullscreen');
    fsBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    fsBtn.title = active ? 'Exit fullscreen' : 'Toggle fullscreen';
    if (fsEnterIcon) fsEnterIcon.hidden = active;
    if (fsExitIcon) fsExitIcon.hidden = !active;
    setTimeout(init, 80);
  };
  const enterFs = async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
      else document.body.classList.add('is-pseudo-fullscreen');
    } catch {
      document.body.classList.add('is-pseudo-fullscreen');
    }
    updateFsUi();
  };
  const exitFs = async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    } catch {}
    document.body.classList.remove('is-pseudo-fullscreen');
    updateFsUi();
  };
  fsBtn.addEventListener('click', () => {
    const active = !!getFsElement() || document.body.classList.contains('is-pseudo-fullscreen');
    if (active) exitFs(); else enterFs();
  });
  document.addEventListener('fullscreenchange', updateFsUi);
  document.addEventListener('webkitfullscreenchange', updateFsUi);
  document.addEventListener('msfullscreenchange', updateFsUi);
  if (!isFsApiAvailable()) {
    // Still allow pseudo-fullscreen on iOS Safari.
    fsBtn.title = 'Toggle fullscreen (in-app)';
  }

  // Responsive
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 200);
  });

  init();
})();
