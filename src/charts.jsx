// charts.jsx — SVG charts with interactive tooltips

// ─────────────────────────────────────────────────────────────
// Tooltip helper hook
// ─────────────────────────────────────────────────────────────
function useTooltip() {
  const [tt, setTt] = React.useState(null);
  const show = (e, content) => {
    const r = e.currentTarget.closest('.chart-wrap')?.getBoundingClientRect?.();
    if (!r) return;
    setTt({ x: e.clientX - r.left, y: e.clientY - r.top, content });
  };
  const hide = () => setTt(null);
  const node = tt && (
    <div className="tt on" style={{ left: tt.x, top: tt.y }}>{tt.content}</div>
  );
  return { show, hide, node };
}

const fmtK = v => {
  if (v >= 1000) return (v/1000).toFixed(v >= 10000 ? 0 : 1) + 'k';
  return String(v);
};
const fmtN = v => v.toLocaleString('en-GB');

// Format an ISO date or a free-form date string into a short "21 May 2026" style.
// Accepts: 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ssZ', anything new Date() can parse,
// or an arbitrary label — returned unchanged if not recognisable.
function fmtShortDate(value) {
  if (!value) return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getUTCDate()).padStart(2,'0')} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Registry of Home Office / other publication codes → gov.uk landing page.
// Used by SourceStrip to turn the "Source: …" text into a hyperlink when the
// source string mentions a known code. Mirrors scripts/_sources.py so updating
// a landing URL in one place covers both the pipeline and the rendered UI.
const SOURCE_URLS = {
  // Small boats — Home Office weekly ODS (SB_01 arrivals, SB_02 arrivals + preventions).
  'SB_01':   'https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats',
  'SB_02':   'https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats',
  'SB_01':  'https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats',
  'SB_02':  'https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats/migrants-detected-crossing-the-english-channel-in-small-boats-last-7-days',
  // Immigration system statistics — one landing page, many sub-sheets.
  'Asy_D01': 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables',
  'Asy_D02': 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables',
  'Asy_D03': 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables',
  'Asy_D04': 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables',
  'Asy_D05': 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables',
  'Asy_D07': 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables',
  'Asy_D09': 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables',
  'Asy_D11': 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables',
  'Res_D02': 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables',
  // Irregular migration — separate landing page, quarterly ODS.
  'Irr_02b': 'https://www.gov.uk/government/statistical-data-sets/irregular-migration-detailed-dataset-and-summary-tables',
  // UNHCR Refugee Data Finder — public REST API, no filename stem.
  'UNHCR':   'https://www.unhcr.org/refugee-statistics/',
};

// Resolve a publication URL from a source string like "Home Office · SB_01".
// Returns the first matching URL from SOURCE_URLS, or null. Explicit sourceUrl
// props always win — this is the fallback when a view hasn't set one yet.
function resolveSourceUrl(source) {
  if (!source || typeof source !== 'string') return null;
  const codes = Object.keys(SOURCE_URLS).sort((a, b) => b.length - a.length);
  for (const code of codes) {
    // Word-boundary match against the code — tolerant to surrounding text and
    // parenthetical notes like "Asy_D02 (derived)".
    const re = new RegExp(`(^|[^A-Za-z0-9_])${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_]|$)`, 'i');
    if (re.test(source)) return SOURCE_URLS[code];
  }
  return null;
}

// Shared source-strip footer for every chart. Renders:
//   Source: <source> · as of <date> · next update <date>
// omitting any segment whose prop is missing. Also prints raw strings
// (e.g. "Q4 2025") when asOf / nextUpdate aren't parseable as dates.
// When `sourceUrl` is provided (or can be inferred from the source code),
// the "Source: <source>" segment renders as a hyperlink to the publication.
function SourceStrip({ source, asOf, nextUpdate, sourceUrl, style }) {
  if (!source && !asOf && !nextUpdate) return null;
  const asOfStr = asOf ? (fmtShortDate(asOf) || String(asOf)) : null;
  const nextStr = nextUpdate ? (fmtShortDate(nextUpdate) || String(nextUpdate)) : null;
  const url = sourceUrl || resolveSourceUrl(source);
  const sourceEl = source
    ? (url
        ? <a href={url} target="_blank" rel="noopener noreferrer"
            style={{color:'inherit',textDecoration:'underline',textDecorationStyle:'dotted',textUnderlineOffset:2}}>
            Source: {source}
          </a>
        : <span>Source: {source}</span>)
    : null;
  const bits = [];
  if (sourceEl) bits.push(<span key="src">{sourceEl}</span>);
  if (asOfStr)  bits.push(<span key="asOf">as of {asOfStr}</span>);
  if (nextStr)  bits.push(<span key="next">next update {nextStr}</span>);
  return (
    <div className="uc" style={{marginTop:12,color:'var(--muted-2)',...(style||{})}}>
      {bits.map((b, i) => (
        <React.Fragment key={i}>{i > 0 ? ' \u00B7 ' : ''}{b}</React.Fragment>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Line chart — single series with optional annotations.
// breakY={[lo, hi]} adds a y-axis break: shaded band + zigzag
// edges cover the skipped range; grid intervals stay consistent
// on both sides so the slope of the line is preserved.
// ─────────────────────────────────────────────────────────────
function LineChart({
  data, width=720, height=320, annotations=[],
  stroke='var(--accent)', area=true, title='', subtitle='', source='',
  asOf=null, nextUpdate=null, sourceUrl=null,
  yearRange=null,
  caption=null,
  showLabels=false,
  showLine=true,
  xLabelFmt=null,
  breakY=null,
  yLabel=null,            // axis title, drawn vertically immediately left of the y-axis
  xLabel=null,            // axis title, drawn horizontally immediately below the x-axis
  overlay=null,           // optional secondary series: [{y, v, label?}] — drawn dashed
  overlayStroke='var(--accent-warn)',
  overlayLabel='',        // short label for the overlay series (rendered at end of line)
  compact=false,
  everyYear=false,        // force a tick at every data point (no stride-thinning)
  rotateTicks=false,      // rotate x-tick labels -30° (useful when dense)
}) {
  const { show, hide, node } = useTooltip();
  const W = width, H = height;
  const fs = compact ? 22 : 11;

  const yrFiltered = yearRange ? data.filter(d => d.y >= yearRange[0] && d.y <= yearRange[1]) : data;
  // Drop null/undefined v's so missing years (e.g. pre-2018 boats) don't plot as 0.
  const filtered = yrFiltered.filter(p => p && p.v != null);
  const d = filtered.length ? filtered : data.filter(p => p && p.v != null);

  const xs = d.map(p => p.y);
  const ys = d.map(p => p.v);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMax = Math.max(...ys) * 1.1;

  // Only apply break when data genuinely spans both zones.
  const effectiveBreak = breakY && d.some(p => p.v < breakY[0]) && d.some(p => p.v > breakY[1]) ? breakY : null;

  const BAND_H = 28;
  // Reserve extra gutter space when axis titles are present so the y-title sits
  // clear of the tick values, and the x-title clears the tick row below.
  const pad = {
    t: 16,
    r: effectiveBreak ? 92 : 24,
    b: xLabel ? 48 : 32,
    l: yLabel ? 64 : 48,
  };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

  // Break band pixel positions — resolved once, reused in y() and render.
  let bandBot = null, bandTop = null;
  if (effectiveBreak) {
    const [bLo, bHi] = effectiveBreak;
    const lowerPx = (ih - BAND_H) * bLo / (bLo + (yMax - bHi));
    bandBot = H - pad.b - lowerPx;
    bandTop = bandBot - BAND_H;
  }

  const x = v => pad.l + (xMax === xMin ? iw / 2 : ((v - xMin) / (xMax - xMin)) * iw);
  const y = v => {
    if (!effectiveBreak) return pad.t + (1 - v / yMax) * ih;
    const [bLo, bHi] = effectiveBreak;
    if (v <= bLo) return H - pad.b - (v / bLo) * (H - pad.b - bandBot);
    if (v >= bHi) return bandTop - ((v - bHi) / (yMax - bHi)) * (bandTop - pad.t);
    return bandBot - ((v - bLo) / (bHi - bLo)) * BAND_H;
  };

  const pts = d.map(p => `${x(p.y)},${y(p.v)}`).join(' ');
  // Overlay series — uses the same x/y mapping; filtered to the primary's year range
  // so points align visually. Any null/undefined `v` is dropped rather than plotted as 0.
  const overlayFiltered = Array.isArray(overlay)
    ? overlay.filter(p => p && p.v != null && p.y >= xMin && p.y <= xMax)
    : [];
  const overlayPts = overlayFiltered.map(p => `${x(p.y)},${y(p.v)}`).join(' ');
  const overlayLast = overlayFiltered[overlayFiltered.length - 1];
  const areaPath = d.length
    ? `M${x(d[0].y)},${y(0)} L${d.map(p => `${x(p.y)},${y(p.v)}`).join(' L')} L${x(d[d.length - 1].y)},${y(0)} Z`
    : '';

  let yTicks;
  if (effectiveBreak) {
    const [bLo, bHi] = effectiveBreak;
    const step = 10000;
    const lower = [], upper = [];
    for (let t = 0; t <= bLo; t += step) lower.push(t);
    for (let t = bHi; t <= Math.ceil(yMax / step) * step; t += step) upper.push(t);
    yTicks = [...lower, ...upper];
  } else {
    const step = yMax / 4;
    yTicks = Array.from({length: 5}, (_, i) => Math.round(i * step / 5000) * 5000).filter((v, i, a) => a.indexOf(v) === i);
  }

  // Zigzag path spanning the chart width at a given y pixel.
  const zigzagPath = yPos => {
    const x1 = pad.l, x2 = W - pad.r, amp = 2.5, half = 5;
    const segs = [`M ${x1} ${yPos}`];
    const n = Math.ceil((x2 - x1) / half);
    for (let i = 0; i < n; i++) {
      segs.push(`L ${Math.min(x1 + (i + 1) * half, x2)} ${yPos + (i % 2 === 0 ? -amp : amp)}`);
    }
    return segs.join(' ');
  };

  const breakNote = effectiveBreak
    ? `Y-axis break between ${fmtK(effectiveBreak[0])} and ${fmtK(effectiveBreak[1])} — shaded band marks the gap. Grid intervals are consistent on either side so the slope of the line means what it looks like it means.`
    : null;

  return (
    <figure className="chart-wrap" style={{position: 'relative', margin: 0}}>
      {title && (
        <figcaption style={{marginBottom: 14}}>
          <div className="uc" style={{color: 'var(--muted)', marginBottom: 3}}>{subtitle}</div>
          <div style={{fontSize: 19, fontWeight: 500, letterSpacing: -0.1, color: 'var(--ink)'}}>{title}</div>
        </figcaption>
      )}
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{display: 'block', overflow: 'visible'}}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={stroke} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Area fill drawn first so band and line render on top */}
        {area && <path d={areaPath} fill="url(#areaGrad)"/>}
        {/* Grid lines + y-axis labels */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth="1"/>
            <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" fontSize={fs} fill="var(--muted)"
              style={{fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--serif)'}}>{fmtK(t)}</text>
          </g>
        ))}
        {/* X-axis labels */}
        {d.map((p, i) => ({p, i}))
          .filter(({i}) => everyYear || i % Math.max(1, Math.ceil(d.length / 8)) === 0 || i === d.length - 1)
          .map(({p, i}) => {
            const tx = x(p.y), ty = H - pad.b + 18;
            const rot = rotateTicks || (everyYear && d.length > 10);
            return (
              <text key={`xt-${i}`} x={tx} y={ty}
                textAnchor={rot ? 'end' : 'middle'}
                transform={rot ? `rotate(-30 ${tx} ${ty})` : undefined}
                fontSize={fs} fill="var(--muted)"
                style={{fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--serif)'}}>
                {xLabelFmt ? xLabelFmt(p.y, i, p) : (p.label ?? p.y)}
              </text>
            );
          })}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--rule-2)"/>
        {/* Axis titles — placed immediately adjacent to each axis */}
        {yLabel && (
          <text
            x={14} y={pad.t + ih / 2}
            transform={`rotate(-90 14 ${pad.t + ih / 2})`}
            textAnchor="middle" fontSize={compact ? 24 : 13} fontWeight={500} fill="var(--ink-2)"
            style={{fontFamily: 'var(--serif)'}}>
            {yLabel}
          </text>
        )}
        {xLabel && (
          <text
            x={pad.l + iw / 2} y={H - 6}
            textAnchor="middle" fontSize={compact ? 24 : 13} fontWeight={500} fill="var(--ink-2)"
            style={{fontFamily: 'var(--serif)'}}>
            {xLabel}
          </text>
        )}
        {/* Break band — over area fill, under data line */}
        {effectiveBreak && (
          <>
            <rect x={pad.l} y={bandTop} width={iw} height={BAND_H} fill="var(--bg-2)" opacity={0.97}/>
            <path d={zigzagPath(bandBot)} fill="none" stroke="var(--rule-2)" strokeWidth="0.8"/>
            <path d={zigzagPath(bandTop)} fill="none" stroke="var(--rule-2)" strokeWidth="0.8"/>
            <text x={W - pad.r + 5} y={(bandTop + bandBot) / 2 + 4} fontSize="10" fill="var(--muted-2)"
              style={{fontFamily: 'var(--serif)', fontStyle: 'italic'}}>
              break · {fmtK(effectiveBreak[0])}–{fmtK(effectiveBreak[1])}
            </text>
          </>
        )}
        {/* Data line */}
        {showLine && <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>}
        {/* Overlay line — dashed, lighter, no dots, no area fill */}
        {overlayPts && (
          <g>
            <polyline points={overlayPts} fill="none" stroke={overlayStroke} strokeWidth="1.4"
              strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" opacity="0.9"/>
            {overlayLast && overlayLabel && (
              <text x={x(overlayLast.y) + 6} y={y(overlayLast.v) + 4} fontSize="11" fill={overlayStroke}
                style={{fontFamily: 'var(--serif)', fontStyle: 'italic'}}>{overlayLabel}</text>
            )}
          </g>
        )}
        {/* Data points + hit areas */}
        {d.map((p, i) => (
          <g key={`pt-${i}`}>
            <circle cx={x(p.y)} cy={y(p.v)} r={showLine ? 3 : 4} fill={stroke}/>
            <circle cx={x(p.y)} cy={y(p.v)} r="14" fill="transparent"
              onMouseMove={e => show(e, <span><b>{p.label ?? p.y}</b> · <span className="tnum">{fmtN(p.v)}</span></span>)}
              onMouseLeave={hide} style={{cursor: 'crosshair'}}/>
            {showLabels && (() => {
              // Offset above or below based on local slope so labels don't sit on the line.
              const prev = d[i-1], next = d[i+1];
              const slopePrev = prev ? (p.v - prev.v) : 0;
              const slopeNext = next ? (next.v - p.v) : 0;
              const rising = (slopePrev + slopeNext) >= 0;
              // Alternate above/below on flat segments to avoid stacking.
              const flat = prev && next && slopePrev === 0 && slopeNext === 0;
              const below = flat ? (i % 2 === 1) : !rising;
              const dy = below ? 16 : -10;
              return (
                <text x={x(p.y)} y={y(p.v) + dy} textAnchor="middle" fontSize="12" fontWeight={500} fill="var(--ink-2)"
                  style={{fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--serif)'}}>{fmtK(p.v)}</text>
              );
            })()}
          </g>
        ))}
        {/* Annotations */}
        {annotations.map((a, i) => {
          const pt = d.find(p => p.y === a.y); if (!pt) return null;
          const px = x(pt.y), py = y(pt.v);
          const dx = a.dx || 30, dy = a.dy || -26;
          return (
            <g key={i}>
              <circle cx={px} cy={py} r="5" fill="none" stroke={stroke} strokeWidth="1"/>
              <line x1={px} y1={py} x2={px + dx} y2={py + dy} stroke={stroke} strokeWidth="0.8"/>
              <text x={px + dx + 4} y={py + dy + 4} fontSize="11.5" fill="var(--ink-2)"
                style={{fontFamily: 'var(--serif)', fontStyle: 'italic'}}>{a.label}</text>
            </g>
          );
        })}
      </svg>
      {(caption || breakNote) && (
        <div style={{fontSize: 12.5, color: 'var(--muted)', marginTop: 10, fontStyle: 'italic', lineHeight: 1.5, maxWidth: 640}}>
          {caption}{caption && breakNote ? ' ' : ''}{breakNote}
        </div>
      )}
      <SourceStrip source={source} asOf={asOf} nextUpdate={nextUpdate}/>
      {node}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// YoY cumulative — one line per year across day-of-year 1..366.
// Expects a `series` object shaped like BOATS_YOY:
//   { '2018': [cum_day_1, cum_day_2, ...366], ... }
// Current-year line stops at the first null; previous-year lines
// run the full 365/366 days. Latest year painted in --accent;
// prior years faded muted-2 with descending opacity.
// ─────────────────────────────────────────────────────────────
function YoYCumulative({
  series,
  width=720, height=300,
  title='', subtitle='', source='',
  asOf=null, nextUpdate=null, sourceUrl=null,
  caption=null,
  highlightYear=null,
  yLabel=null, xLabel=null,
  yearRange=null,
}) {
  const { show, hide, node } = useTooltip();
  const [hoverYr, setHoverYr] = React.useState(null);
  const W = width, H = height;
  const pad = {
    t: 16,
    r: 80,
    b: xLabel ? 48 : 32,
    l: yLabel ? 72 : 56,
  };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

  if (!series || typeof series !== 'object') {
    return <div style={{padding:'40px 0',textAlign:'center',color:'var(--muted)',fontStyle:'italic'}}>No data.</div>;
  }
  const allYears = Object.keys(series).filter(k => Array.isArray(series[k])).sort();
  const years = yearRange
    ? allYears.filter(y => +y >= yearRange[0] && +y <= yearRange[1])
    : allYears;
  if (!years.length) {
    return <div style={{padding:'40px 0',textAlign:'center',color:'var(--muted)',fontStyle:'italic'}}>No data.</div>;
  }
  const latest = highlightYear != null ? String(highlightYear) : years[years.length - 1];

  // Global yMax across all years so the axis is fixed and lines compare fairly.
  let yMax = 0;
  years.forEach(y => {
    series[y].forEach(v => { if (v != null && v > yMax) yMax = v; });
  });
  yMax = yMax * 1.08 || 1;

  const N = 366;
  const x = i => pad.l + (i / (N - 1)) * iw;
  const y = v => pad.t + (1 - v / yMax) * ih;

  // Day-of-year → month-label positions (1 Jan, 1 Feb, ... 1 Dec).
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Approximate month starts on a 366-day axis (use non-leap cum days).
  const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

  // yTicks — 4 intervals.
  const step = yMax / 4;
  const yTicks = Array.from({length: 5}, (_, i) => Math.round(i * step / 1000) * 1000).filter((v, i, a) => a.indexOf(v) === i);

  // Build one polyline per year. Stop latest at first null (do not interpolate).
  const lines = years.map((yr, idx) => {
    const arr = series[yr];
    const pts = [];
    for (let i = 0; i < arr.length && i < N; i++) {
      const v = arr[i];
      if (v == null) {
        if (yr === latest) break;     // current-year line stops at first null
        continue;                      // prior years: just skip null (should be rare)
      }
      pts.push(`${x(i)},${y(v)}`);
    }
    const isLatest = yr === latest;
    const ageIdx = years.length - 1 - idx;       // 0 = most-recent, N = oldest
    // Baseline opacity raised so past years remain readable; hover/highlight win.
    const opacity = isLatest ? 1 : Math.max(0.45, 1 - ageIdx * 0.07);
    return { yr, pts: pts.join(' '), isLatest, opacity, lastI: arr.findIndex(v => v == null) - 1 };
  });

  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      {title && (
        <figcaption style={{marginBottom:14}}>
          <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>{subtitle}</div>
          <div style={{fontSize:19,fontWeight:500,letterSpacing:-0.1,color:'var(--ink)'}}>{title}</div>
        </figcaption>
      )}
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block',overflow:'visible'}}>
        {/* Grid + y-axis labels */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth="1"/>
            <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)"
              style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK(t)}</text>
          </g>
        ))}
        {/* Month ticks on x-axis */}
        {MONTH_STARTS.map((doy, mi) => (
          <text key={mi} x={x(doy + 14)} y={H - pad.b + 18} textAnchor="middle" fontSize="11" fill="var(--muted)"
            style={{fontFamily:'var(--serif)'}}>{MONTHS[mi]}</text>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--rule-2)"/>
        {/* Axis titles */}
        {yLabel && (
          <text x={18} y={pad.t + ih / 2}
            transform={`rotate(-90 18 ${pad.t + ih / 2})`}
            textAnchor="middle" fontSize="13" fontWeight={500} fill="var(--ink-2)"
            style={{fontFamily:'var(--serif)'}}>{yLabel}</text>
        )}
        {xLabel && (
          <text x={pad.l + iw / 2} y={H - 6}
            textAnchor="middle" fontSize="13" fontWeight={500} fill="var(--ink-2)"
            style={{fontFamily:'var(--serif)'}}>{xLabel}</text>
        )}
        {/* Prior-year lines — hover raises opacity + stroke width */}
        {lines.filter(l => !l.isLatest).map(l => {
          const isHover = hoverYr === l.yr;
          const op = isHover ? 1 : (hoverYr ? Math.max(0.2, l.opacity * 0.55) : l.opacity);
          return (
            <g key={l.yr}>
              <polyline points={l.pts} fill="none"
                stroke="var(--muted-2)" strokeOpacity={op}
                strokeWidth={isHover ? 2.1 : 1.2} strokeLinejoin="round"/>
              {/* Wide, invisible hit line for easier hovering */}
              <polyline points={l.pts} fill="none" stroke="transparent" strokeWidth="10"
                onMouseEnter={() => setHoverYr(l.yr)}
                onMouseLeave={() => setHoverYr(null)}
                style={{cursor:'crosshair'}}/>
            </g>
          );
        })}
        {/* Latest-year line (on top) */}
        {lines.filter(l => l.isLatest).map(l => (
          <polyline key={l.yr} points={l.pts} fill="none"
            stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        ))}
        {/* End-of-line labels for each year */}
        {lines.map(l => {
          const arr = series[l.yr];
          // Find the last plotted index.
          let lastI = -1;
          for (let i = 0; i < arr.length && i < N; i++) if (arr[i] != null) lastI = i;
          if (lastI < 0) return null;
          const vv = arr[lastI];
          return (
            <text key={`lbl-${l.yr}`} x={x(lastI) + 6} y={y(vv) + 4}
              fontSize={l.isLatest ? 12 : 11}
              fill={l.isLatest ? 'var(--accent)' : 'var(--muted-2)'}
              fillOpacity={l.isLatest ? 1 : l.opacity}
              style={{fontFamily:'var(--serif)',fontWeight: l.isLatest ? 600 : 400}}>
              {l.yr}
            </text>
          );
        })}
      </svg>
      {caption && (
        <div style={{fontSize:12.5,color:'var(--muted)',marginTop:10,fontStyle:'italic',lineHeight:1.5,maxWidth:640}}>
          {caption}
        </div>
      )}
      <SourceStrip source={source} asOf={asOf} nextUpdate={nextUpdate} sourceUrl={sourceUrl}/>
      {node}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Grant-rate small multiples — one mini line per nationality in a grid.
// Expects a series object shaped like NAT_GRANT_ANNUAL:
//   { years: [2009..2025], series: [{name, data: [0..1 or null, ...]}, ...] }
// Each cell shares the same x-axis (years) and y-axis (0..1) so cells compare
// fairly. `highlight` names (string[]) render in --accent; everything else is
// --muted to keep the eye on the chosen set.
// ─────────────────────────────────────────────────────────────
function GrantRateSmallMultiples({
  series, width=900, height=380,
  title='', subtitle='', source='',
  asOf=null, nextUpdate=null, sourceUrl=null,
  countries=null,        // subset to display; default = top 12 most recent-year rates
  cols=4,
  highlight=[],
  caption=null,
  yearRange=null,
}) {
  // hover = { cellIdx, yearIdx } — identifies which cell + year the reader
  // is nearest, so the renderer can draw a crosshair and a year/% label.
  const [hover, setHover] = React.useState(null);
  if (!series || !Array.isArray(series.years) || !Array.isArray(series.series)) {
    return <div style={{padding:'40px 0',textAlign:'center',color:'var(--muted)',fontStyle:'italic'}}>No data.</div>;
  }
  const yearIdx = yearRange
    ? series.years.map((y, i) => (+y >= yearRange[0] && +y <= yearRange[1]) ? i : -1).filter(i => i !== -1)
    : series.years.map((_, i) => i);
  const years = yearIdx.length ? yearIdx.map(i => series.years[i]) : series.years;
  const xMin = years[0], xMax = years[years.length - 1];
  // Subset the series array (and slice each row's data to the active years).
  let rows = (countries
    ? series.series.filter(s => countries.includes(s.name))
    : series.series.slice()
  ).map(s => yearIdx.length && yearIdx.length !== series.years.length
    ? { ...s, data: yearIdx.map(i => s.data[i]) }
    : s);
  if (!countries) {
    // Default pick: 12 nationalities with the highest count of non-null years
    // (most complete decade+ records) — this is a legibility-first default.
    rows.sort((a,b) => b.data.filter(v => v != null).length - a.data.filter(v => v != null).length);
    rows = rows.slice(0, 12);
  }
  const n = rows.length;
  const rowCount = Math.ceil(n / cols);
  const cellW = Math.floor(width / cols);
  const cellH = Math.floor((height - 28) / rowCount); // 28px for title strip
  const pad = { t: 18, r: 8, b: 18, l: 8 };
  const iw = cellW - pad.l - pad.r, ih = cellH - pad.t - pad.b;
  const x = i => pad.l + (i / (years.length - 1)) * iw;
  const y = v => pad.t + (1 - v) * ih;     // v is 0..1

  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      {title && (
        <figcaption style={{marginBottom:12}}>
          <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>{subtitle}</div>
          <div style={{fontSize:19,fontWeight:500,letterSpacing:-0.1,color:'var(--ink)'}}>{title}</div>
        </figcaption>
      )}
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{display:'block',overflow:'visible'}}>
        {rows.map((s, idx) => {
          const r = Math.floor(idx / cols), c = idx % cols;
          const ox = c * cellW, oy = r * cellH;
          const isHi = highlight.includes(s.name);
          const stroke = isHi ? 'var(--accent)' : 'var(--muted)';
          const pts = [];
          s.data.forEach((v, i) => {
            if (v == null) return;
            pts.push(`${ox + x(i)},${oy + y(v)}`);
          });
          // Latest non-null value → end-point dot.
          let lastI = -1;
          for (let i = s.data.length - 1; i >= 0; i--) { if (s.data[i] != null) { lastI = i; break; } }
          const lastV = lastI >= 0 ? s.data[lastI] : null;
          return (
            <g key={s.name}>
              {/* Cell frame + y-grid at 0.5 */}
              <rect x={ox + 1} y={oy + 1} width={cellW - 2} height={cellH - 2} fill="none" stroke="var(--rule)" strokeWidth="0.5"/>
              <line x1={ox + pad.l} x2={ox + cellW - pad.r} y1={oy + y(0.5)} y2={oy + y(0.5)}
                stroke="var(--rule-2)" strokeWidth="0.5" strokeDasharray="2 3"/>
              {/* Country label */}
              <text x={ox + pad.l} y={oy + 11} fontSize="11" fill="var(--ink-2)" style={{fontFamily:'var(--serif)',fontWeight:500}}>{s.name}</text>
              {/* Grant-rate line */}
              <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth={isHi ? 1.6 : 1.1}/>
              {/* End dot + % label */}
              {lastV != null && (
                <g>
                  <circle cx={ox + x(lastI)} cy={oy + y(lastV)} r={isHi ? 2.8 : 2} fill={stroke}/>
                  <text x={ox + cellW - pad.r - 2} y={oy + y(lastV) - 4} textAnchor="end" fontSize="10" fill={stroke}
                    style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>
                    {Math.round(lastV*100)}%
                  </text>
                </g>
              )}
              {/* X-axis tick labels: first + last years only, once per row */}
              {c === 0 && (
                <text x={ox + pad.l} y={oy + cellH - 4} fontSize="9.5" fill="var(--muted-2)"
                  style={{fontFamily:'var(--serif)'}}>{xMin}</text>
              )}
              {c === cols - 1 && (
                <text x={ox + cellW - pad.r} y={oy + cellH - 4} textAnchor="end" fontSize="9.5" fill="var(--muted-2)"
                  style={{fontFamily:'var(--serif)'}}>{xMax}</text>
              )}
              {/* Per-cell hit rect — snaps to the nearest year and sets the hover state */}
              <rect x={ox + pad.l} y={oy + pad.t} width={iw} height={ih}
                fill="transparent"
                onMouseMove={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const rel = (e.clientX - rect.left) / Math.max(1, rect.width);
                  const yrI = Math.max(0, Math.min(years.length - 1, Math.round(rel * (years.length - 1))));
                  setHover({ cellIdx: idx, yearIdx: yrI });
                }}
                onMouseLeave={() => setHover(null)}
                style={{cursor:'crosshair'}}/>
              {/* Crosshair + label, drawn only for the hovered cell */}
              {hover && hover.cellIdx === idx && (() => {
                const i = hover.yearIdx;
                const v = s.data[i];
                const cx = ox + x(i);
                return (
                  <g pointerEvents="none">
                    <line x1={cx} x2={cx} y1={oy + pad.t} y2={oy + cellH - pad.b}
                      stroke={stroke} strokeOpacity="0.45" strokeWidth="0.8" strokeDasharray="2 2"/>
                    {v != null && (
                      <>
                        <circle cx={cx} cy={oy + y(v)} r="3" fill={stroke}/>
                        <text x={ox + cellW / 2} y={oy + 11 + 13}
                          textAnchor="middle" fontSize="10.5" fill="var(--ink-2)"
                          style={{fontFamily:'var(--serif)',fontVariantNumeric:'tabular-nums'}}>
                          {years[i]} · {Math.round(v * 100)}%
                        </text>
                      </>
                    )}
                    {v == null && (
                      <text x={ox + cellW / 2} y={oy + 11 + 13}
                        textAnchor="middle" fontSize="10.5" fill="var(--muted)"
                        style={{fontFamily:'var(--serif)',fontStyle:'italic'}}>
                        {years[i]} · no data
                      </text>
                    )}
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>
      {caption && (
        <div style={{fontSize:12.5,color:'var(--muted)',marginTop:10,fontStyle:'italic',lineHeight:1.5,maxWidth:680}}>
          {caption}
        </div>
      )}
      <SourceStrip source={source} asOf={asOf} nextUpdate={nextUpdate} sourceUrl={sourceUrl}/>
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Seasonal heat-map — one row per year × 52/53 week columns.
// Expects an array of BOATS_WEEKLY-shaped rows: {we: "YYYY-MM-DD", m: migrants}.
// Each cell is an isoweek × year; intensity = migrants that week.
// Empty (null/missing) cells render transparent — no zero-plotting.
// ─────────────────────────────────────────────────────────────
function SeasonalHeatMap({
  data,
  width=720, height=300,
  title='', subtitle='', source='',
  asOf=null, nextUpdate=null, sourceUrl=null,
  caption=null,
  yLabel=null, xLabel=null,
  yearRange=null,
}) {
  const { show, hide, node } = useTooltip();
  const W = width, H = height;
  // Layout
  const pad = {
    t: 18,
    r: 14,
    b: xLabel ? 52 : 36,
    l: yLabel ? 76 : 60,
  };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

  if (!Array.isArray(data) || !data.length) {
    return <div style={{padding:'40px 0',textAlign:'center',color:'var(--muted)',fontStyle:'italic'}}>No data.</div>;
  }

  // Derive (year, isoWeek) for every row. We use the Saturday-ending week
  // convention from BOATS_WEEKLY; taking the week number of the week-end
  // Saturday gives 1..52/53 per calendar year.
  const isoWeek = (d) => {
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return { wk: Math.ceil((((t - yearStart) / 86400000) + 1) / 7), isoYear: t.getUTCFullYear() };
  };

  // Build { year: { week: migrants } } map.
  const cells = {};
  let vMax = 0;
  data.forEach(r => {
    if (!r || !r.we || r.m == null) return;
    const d = new Date(r.we);
    if (isNaN(d)) return;
    const { wk, isoYear } = isoWeek(d);
    if (!cells[isoYear]) cells[isoYear] = {};
    cells[isoYear][wk] = r.m;
    if (r.m > vMax) vMax = r.m;
  });

  const allYears = Object.keys(cells).map(Number).sort((a,b) => a-b);
  const years = yearRange
    ? allYears.filter(y => y >= yearRange[0] && y <= yearRange[1])
    : allYears;
  if (!years.length) {
    return <div style={{padding:'40px 0',textAlign:'center',color:'var(--muted)',fontStyle:'italic'}}>No data.</div>;
  }

  const WEEKS = 53;
  const cellW = iw / WEEKS;
  const cellH = ih / years.length;

  // Colour ramp: bg-2 → accent-warn via accent at full intensity. Nulls
  // render as bg-2. Power < 1 (sqrt steeper than 0.5) lifts mid-range
  // cells off the floor so low-but-not-zero weeks are visible, while
  // hot weeks shift toward accent-warn so the "summer peak" pops.
  const intensity = v => v == null ? 0 : Math.pow(v / vMax, 0.42);
  const colorFor = v => {
    if (v == null) return 'var(--bg-2)';
    const t = intensity(v);
    if (t < 0.6) {
      // 0 → 0.6 sits inside the accent band.
      const pct = Math.round((t / 0.6) * 100);
      return `color-mix(in srgb, var(--accent) ${pct}%, var(--bg-2))`;
    }
    // 0.6 → 1.0 rolls from accent toward accent-warn for the hottest weeks.
    const pct = Math.round(((t - 0.6) / 0.4) * 100);
    return `color-mix(in srgb, var(--accent-warn) ${pct}%, var(--accent))`;
  };

  // Month marker positions (approximate: week of month-start / 7).
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthWeeks = [1, 5, 9, 14, 18, 22, 27, 31, 35, 40, 44, 48];

  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      {title && (
        <figcaption style={{marginBottom:14}}>
          <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>{subtitle}</div>
          <div style={{fontSize:19,fontWeight:500,letterSpacing:-0.1,color:'var(--ink)'}}>{title}</div>
        </figcaption>
      )}
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block',overflow:'visible'}}>
        {/* Year labels on the left */}
        {years.map((yr, i) => (
          <text key={`yr-${yr}`} x={pad.l - 10} y={pad.t + cellH * (i + 0.5) + 4}
            textAnchor="end" fontSize="11" fill="var(--muted)"
            style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{yr}</text>
        ))}
        {/* Month markers along the bottom */}
        {monthWeeks.map((w, i) => (
          <text key={`m-${i}`} x={pad.l + cellW * (w - 0.5)} y={H - pad.b + 18}
            textAnchor="middle" fontSize="11" fill="var(--muted)"
            style={{fontFamily:'var(--serif)'}}>{MONTHS[i]}</text>
        ))}
        {/* Axis titles */}
        {yLabel && (
          <text x={18} y={pad.t + ih / 2}
            transform={`rotate(-90 18 ${pad.t + ih / 2})`}
            textAnchor="middle" fontSize="13" fontWeight={500} fill="var(--ink-2)"
            style={{fontFamily:'var(--serif)'}}>{yLabel}</text>
        )}
        {xLabel && (
          <text x={pad.l + iw / 2} y={H - 6}
            textAnchor="middle" fontSize="13" fontWeight={500} fill="var(--ink-2)"
            style={{fontFamily:'var(--serif)'}}>{xLabel}</text>
        )}
        {/* Heat cells */}
        {years.map((yr, yi) => {
          const row = cells[yr];
          const rects = [];
          for (let w = 1; w <= WEEKS; w++) {
            const v = row[w];
            rects.push(
              <rect key={`c-${yr}-${w}`}
                x={pad.l + (w - 1) * cellW}
                y={pad.t + yi * cellH}
                width={cellW - 1} height={cellH - 1}
                fill={colorFor(v)}
                onMouseMove={e => show(e,
                  <span><b>{yr} · week {w}</b>{v != null
                    ? <> · <span className="tnum">{fmtN(v)}</span> migrants</>
                    : <> · no data</>}
                  </span>)}
                onMouseLeave={hide}
                style={{cursor:'crosshair'}}/>
            );
          }
          return <g key={`row-${yr}`}>{rects}</g>;
        })}
        {/* Legend: a small gradient bar on the right — kept minimal so the grid dominates */}
        <g transform={`translate(${W - pad.r - 90} ${H - 12})`}>
          <text x={0} y={-2} fontSize="10" fill="var(--muted)" style={{fontFamily:'var(--serif)'}}>0</text>
          <rect x={14} y={-10} width={60} height={8} fill="url(#heatGrad)"/>
          <text x={78} y={-2} fontSize="10" fill="var(--muted)" style={{fontFamily:'var(--serif)'}}>{fmtK(vMax)}</text>
        </g>
        <defs>
          <linearGradient id="heatGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--bg-2)"/>
            <stop offset="60%" stopColor="var(--accent)"/>
            <stop offset="100%" stopColor="var(--accent-warn)"/>
          </linearGradient>
        </defs>
      </svg>
      {caption && (
        <div style={{fontSize:12.5,color:'var(--muted)',marginTop:10,fontStyle:'italic',lineHeight:1.5,maxWidth:680}}>
          {caption}
        </div>
      )}
      <SourceStrip source={source} asOf={asOf} nextUpdate={nextUpdate} sourceUrl={sourceUrl}/>
      {node}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Multi-line chart
// ─────────────────────────────────────────────────────────────
const MULTI_COLORS = [
  'var(--accent)', 'var(--accent-warn)', 'var(--accent-2)', 'var(--accent-gold)',
  'var(--ink-2)', 'var(--muted-2)',
  '#6b2a8b', '#1c5c3d', '#c44a2a', '#2a5c8b', '#8b1f4a', '#2a8b6b'
];
function MultiLineChart({ years, series, width=720, height=300, showLabels=false, legend=false, yLabel=null, breakY=null, yearRange=null, rotateTicks=false }) {
  const { show, hide, node } = useTooltip();
  const pad = { t: 16, r: legend ? 24 : 120, b: 32, l: yLabel ? 64 : 48 };
  const W = width, H = height;
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  // Slice both years and each series in lock-step when a range is supplied.
  const yearIdx = yearRange
    ? years.map((y, i) => (+y >= yearRange[0] && +y <= yearRange[1]) ? i : -1).filter(i => i !== -1)
    : years.map((_, i) => i);
  const yrs = yearIdx.map(i => years[i]);
  const ser = series.map(s => ({ ...s, data: yearIdx.map(i => s.data[i]) }));
  const activeYears = yrs.length ? yrs : years;
  const activeSeries = yrs.length ? ser : series;
  // Null/undefined values are treated as missing data — excluded from yMax and drawn as line breaks.
  const allV = activeSeries.flatMap(s=>s.data).filter(v => v != null);
  const yMax = (allV.length ? Math.max(...allV) : 0) * 1.12;
  const x = i => pad.l + (i/Math.max(1, activeYears.length-1))*iw;

  const effectiveBreak = breakY && allV.some(v=>v<breakY[0]) && allV.some(v=>v>breakY[1]) ? breakY : null;
  const BAND_H = 28;
  let bandBot = null, bandTop = null;
  if (effectiveBreak) {
    const [bLo, bHi] = effectiveBreak;
    const lowerPx = (ih - BAND_H) * bLo / (bLo + (yMax - bHi));
    bandBot = H - pad.b - lowerPx;
    bandTop = bandBot - BAND_H;
  }
  const y = v => {
    if (!effectiveBreak) return pad.t + (1 - v/yMax)*ih;
    const [bLo, bHi] = effectiveBreak;
    if (v <= bLo) return H - pad.b - (v/bLo) * (H - pad.b - bandBot);
    if (v >= bHi) return bandTop - ((v-bHi)/(yMax-bHi)) * (bandTop - pad.t);
    return bandBot - ((v-bLo)/(bHi-bLo)) * BAND_H;
  };

  let yTicks;
  if (effectiveBreak) {
    const [bLo, bHi] = effectiveBreak;
    const loStep = Math.max(1000, Math.round(bLo/2/1000)*1000);
    const hiStep = Math.max(1000, Math.round((Math.ceil(yMax/1000)*1000-bHi)/2/1000)*1000);
    const lower = [], upper = [];
    for (let v=0; v<=bLo; v+=loStep) lower.push(v);
    for (let v=bHi; v<=Math.ceil(yMax/1000)*1000; v+=hiStep) upper.push(v);
    yTicks = [...new Set([...lower, ...upper])];
  } else {
    // Scale rounding step with yMax so percentage-range charts (0–100) get
    // distinct ticks instead of five entries all snapping to 0.
    const step = Math.max(1, Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(yMax, 1))) - 1)));
    yTicks = [0, yMax*0.25, yMax*0.5, yMax*0.75, yMax].map(v=>Math.round(v/step)*step).filter((v,i,a)=>a.indexOf(v)===i);
  }

  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      {legend && (
        <div style={{display:'flex',flexWrap:'wrap',gap:'4px 12px',marginBottom:8,paddingBottom:6,borderBottom:'1px dotted var(--rule-2)'}}>
          {series.map((s,si) => {
            const c = MULTI_COLORS[si % MULTI_COLORS.length];
            return (
              <span key={s.name} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11.5,color:'var(--ink-2)',fontFamily:'var(--serif)'}}>
                <span style={{display:'inline-block',width:16,height:2,background:c,flexShrink:0}}/>
                {s.name}
              </span>
            );
          })}
        </div>
      )}
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block',overflow:'visible'}}>
        {yTicks.map(t=>(
          <g key={t}>
            <line x1={pad.l} x2={W-pad.r} y1={y(t)} y2={y(t)} stroke="var(--rule)"/>
            <text x={pad.l-10} y={y(t)+4} textAnchor="end" fontSize="11" fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK(t)}</text>
          </g>
        ))}
        {activeYears.map((yr,i)=>{
          const tx = x(i), ty = H-pad.b+18;
          const rot = rotateTicks || activeYears.length > 10;
          return (
            <text key={yr} x={tx} y={ty}
              textAnchor={rot ? 'end' : 'middle'}
              transform={rot ? `rotate(-30 ${tx} ${ty})` : undefined}
              fontSize="11" fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{yr}</text>
          );
        })}
        <line x1={pad.l} x2={W-pad.r} y1={H-pad.b} y2={H-pad.b} stroke="var(--rule-2)"/>
        {yLabel && (
          <text x={18} y={pad.t + ih/2}
            transform={`rotate(-90 18 ${pad.t + ih/2})`}
            textAnchor="middle" fontSize="13" fontWeight={500} fill="var(--ink-2)"
            style={{fontFamily:'var(--serif)'}}>{yLabel}</text>
        )}
        {/* Lines rendered first so break band can mask them */}
        {activeSeries.map((s,si)=>{
          const color = MULTI_COLORS[si % MULTI_COLORS.length];
          // Split into contiguous runs so null gaps become real line breaks rather than plotted as zero.
          const runs = [];
          let cur = [];
          s.data.forEach((v,i) => {
            if (v == null) { if (cur.length) { runs.push(cur); cur = []; } }
            else cur.push(`${x(i)},${y(v)}`);
          });
          if (cur.length) runs.push(cur);
          return runs.map((run, ri) => (
            <polyline key={`line-${si}-${ri}`} points={run.join(' ')} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
          ));
        })}
        {/* Break band mask */}
        {effectiveBreak && (()=>{
          const [bLo, bHi] = effectiveBreak;
          const zigzag = yPos => {
            const amp=2.5, period=10, steps=Math.ceil(iw/period);
            let d=`M ${pad.l} ${yPos}`;
            for (let i=0;i<=steps;i++) d+=` L ${Math.min(pad.l+i*period,pad.l+iw)} ${yPos+(i%2===0?amp:-amp)}`;
            return d;
          };
          return (<>
            <rect x={pad.l} y={bandTop} width={iw} height={BAND_H} fill="var(--bg-2)" opacity="0.97"/>
            <path d={zigzag(bandBot)} fill="none" stroke="var(--muted)" strokeWidth="0.8" strokeDasharray="2 1"/>
            <path d={zigzag(bandTop)} fill="none" stroke="var(--muted)" strokeWidth="0.8" strokeDasharray="2 1"/>
            <text x={pad.l+iw+8} y={(bandTop+bandBot)/2+4} fontSize="10" fill="var(--muted-2)" style={{fontFamily:'var(--serif)',fontStyle:'italic'}}>break</text>
          </>);
        })()}
        {/* Dots and labels on top of break band */}
        {activeSeries.map((s,si)=>{
          const color = MULTI_COLORS[si % MULTI_COLORS.length];
          const last = s.data.length-1;
          // End-of-line label anchors on the last non-null point.
          let lastNonNull = -1;
          for (let i = s.data.length - 1; i >= 0; i--) { if (s.data[i] != null) { lastNonNull = i; break; } }
          return (
            <g key={`pts-${si}-${s.name}`}>
              {s.data.map((v,i)=> v == null ? null : (
                <g key={i}>
                  <circle cx={x(i)} cy={y(v)} r="2.6" fill={color}/>
                  <circle cx={x(i)} cy={y(v)} r="12" fill="transparent"
                    onMouseMove={e=>show(e, <span><b>{s.name}</b> · {activeYears[i]} · <span className="tnum">{fmtN(v)}</span></span>)}
                    onMouseLeave={hide}
                  />
                </g>
              ))}
              {!legend && lastNonNull >= 0 && <text x={x(lastNonNull)+10} y={y(s.data[lastNonNull])+4} fontSize="12" fill={color} style={{fontFamily:'var(--serif)',fontStyle:'italic'}}>{s.name}</text>}
              {showLabels && s.data.map((v,i)=> {
                if (v == null) return null;
                const prev = s.data[i-1], next = s.data[i+1];
                const slopePrev = prev != null ? (v - prev) : 0;
                const slopeNext = next != null ? (next - v) : 0;
                const rising = (slopePrev + slopeNext) >= 0;
                const flat = prev != null && next != null && slopePrev === 0 && slopeNext === 0;
                const below = flat ? (i % 2 === 1) : !rising;
                const dy = below ? 14 : -8;
                return (
                  <text key={`lbl-${i}`} x={x(i)} y={y(v)+dy} textAnchor="middle" fontSize="12" fontWeight={500} fill={color} style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK(v)}</text>
                );
              })}
            </g>
          );
        })}
      </svg>
      {node}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// DualAxisChart — two series sharing an x-axis, each on its own y-axis.
// Designed for comparable-but-differently-scaled metrics (e.g. monthly
// interceptions vs monthly preventions). Each series takes the shape
//   [{y, v, label?}]
// Axis titles are colour-keyed to their series so it's obvious which
// axis belongs to which line. A single point with null `v` is skipped
// rather than plotted as zero.
// ─────────────────────────────────────────────────────────────
function DualAxisChart({
  left, right,                // series arrays [{y, v, label?}]
  width=720, height=320,
  leftStroke='var(--accent)', rightStroke='var(--accent-warn)',
  leftLabel='', rightLabel='',
  yLabelLeft=null, yLabelRight=null, xLabel=null,
  title='', subtitle='', source='',
  asOf=null, nextUpdate=null, sourceUrl=null,
  caption=null,
  xLabelFmt=null,
  yearRange=null,             // optional [min, max] — filters points whose
                              // label's leading YYYY is out of range.
  compact=false,
}) {
  const { show, hide, node } = useTooltip();
  const W = width, H = height;
  const fs = compact ? 22 : 11;
  // When yearRange is supplied, filter on the label's leading YYYY. The
  // `y` field is an index from the caller's shared x-grid, not a year, so
  // we can't filter on it directly — but the caller ships a "YYYY-MM"
  // label we can read cheaply.
  const inRange = (p) => {
    if (!yearRange) return true;
    const m = p && p.label ? String(p.label).match(/^(\d{4})/) : null;
    if (!m) return true;
    const yr = +m[1];
    return yr >= yearRange[0] && yr <= yearRange[1];
  };
  const L = Array.isArray(left)  ? left.filter(p => p && p.v != null  && inRange(p)) : [];
  const R = Array.isArray(right) ? right.filter(p => p && p.v != null && inRange(p)) : [];
  if (!L.length && !R.length) {
    return <div style={{padding:'40px 0',textAlign:'center',color:'var(--muted)',fontStyle:'italic'}}>No data.</div>;
  }
  const pad = { t: 16, r: yLabelRight ? 76 : 56, b: xLabel ? 48 : 32, l: yLabelLeft ? 72 : 56 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

  const xsAll = [...L.map(p=>p.y), ...R.map(p=>p.y)];
  const xMin = Math.min(...xsAll), xMax = Math.max(...xsAll);
  const lMax = L.length ? Math.max(...L.map(p=>p.v)) * 1.1 : 1;
  const rMax = R.length ? Math.max(...R.map(p=>p.v)) * 1.1 : 1;

  const x  = v => pad.l + (xMax===xMin ? iw/2 : ((v-xMin)/(xMax-xMin))*iw);
  const yL = v => pad.t + (1 - v / lMax) * ih;
  const yR = v => pad.t + (1 - v / rMax) * ih;

  const step4 = (m) => Math.max(1, m/4);
  const lTicks = [0,1,2,3,4].map(i => Math.round(i * step4(lMax) / 1000) * 1000).filter((v,i,a)=>a.indexOf(v)===i);
  const rTicks = [0,1,2,3,4].map(i => Math.round(i * step4(rMax) / 1000) * 1000).filter((v,i,a)=>a.indexOf(v)===i);

  const lPts = L.map(p => `${x(p.y)},${yL(p.v)}`).join(' ');
  const rPts = R.map(p => `${x(p.y)},${yR(p.v)}`).join(' ');

  // x-tick source: pick whichever series is denser so labels don't crowd.
  const xSrc = L.length >= R.length ? L : R;

  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      {title && (
        <figcaption style={{marginBottom:14}}>
          <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>{subtitle}</div>
          <div style={{fontSize:19,fontWeight:500,letterSpacing:-0.1,color:'var(--ink)'}}>{title}</div>
        </figcaption>
      )}
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block',overflow:'visible'}}>
        {/* Left y-grid + left tick labels */}
        {lTicks.map(t => (
          <g key={`lt-${t}`}>
            <line x1={pad.l} x2={W-pad.r} y1={yL(t)} y2={yL(t)} stroke="var(--rule)"/>
            <text x={pad.l-10} y={yL(t)+4} textAnchor="end" fontSize={fs} fill={leftStroke}
              style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK(t)}</text>
          </g>
        ))}
        {/* Right tick labels (no grid — avoids double-ruled background) */}
        {rTicks.map(t => (
          <text key={`rt-${t}`} x={W-pad.r+10} y={yR(t)+4} textAnchor="start" fontSize={fs} fill={rightStroke}
            style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK(t)}</text>
        ))}
        {/* X-axis labels */}
        {xSrc.map((p,i) => ({p,i}))
          .filter(({i}) => i % Math.max(1, Math.ceil(xSrc.length/8)) === 0 || i === xSrc.length-1)
          .map(({p,i}) => (
            <text key={`xt-${i}`} x={x(p.y)} y={H-pad.b+18} textAnchor="middle" fontSize={fs} fill="var(--muted)"
              style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>
              {xLabelFmt ? xLabelFmt(p.y, i, p) : (p.label ?? p.y)}
            </text>
          ))}
        <line x1={pad.l} x2={W-pad.r} y1={H-pad.b} y2={H-pad.b} stroke="var(--rule-2)"/>
        {/* Axis titles — colour-keyed to the series they describe */}
        {yLabelLeft && (
          <text x={14} y={pad.t + ih/2}
            transform={`rotate(-90 14 ${pad.t + ih/2})`}
            textAnchor="middle" fontSize={compact ? 24 : 13} fontWeight={500} fill={leftStroke}
            style={{fontFamily:'var(--serif)'}}>{yLabelLeft}</text>
        )}
        {yLabelRight && (
          <text x={W-14} y={pad.t + ih/2}
            transform={`rotate(90 ${W-14} ${pad.t + ih/2})`}
            textAnchor="middle" fontSize={compact ? 24 : 13} fontWeight={500} fill={rightStroke}
            style={{fontFamily:'var(--serif)'}}>{yLabelRight}</text>
        )}
        {xLabel && (
          <text x={pad.l + iw/2} y={H-6}
            textAnchor="middle" fontSize={compact ? 24 : 13} fontWeight={500} fill="var(--ink-2)"
            style={{fontFamily:'var(--serif)'}}>{xLabel}</text>
        )}
        {/* Left series — solid */}
        {lPts && <polyline points={lPts} fill="none" stroke={leftStroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>}
        {L.map((p,i) => (
          <g key={`lp-${i}`}>
            <circle cx={x(p.y)} cy={yL(p.v)} r="2.6" fill={leftStroke}/>
            <circle cx={x(p.y)} cy={yL(p.v)} r="12" fill="transparent"
              onMouseMove={e => show(e, <span><b>{p.label ?? p.y}</b> · {leftLabel || 'left'} <span className="tnum">{fmtN(p.v)}</span></span>)}
              onMouseLeave={hide} style={{cursor:'crosshair'}}/>
          </g>
        ))}
        {/* Right series — dashed to differentiate */}
        {rPts && <polyline points={rPts} fill="none" stroke={rightStroke} strokeWidth="1.6"
          strokeDasharray="5 3" strokeLinejoin="round" strokeLinecap="round"/>}
        {R.map((p,i) => (
          <g key={`rp-${i}`}>
            <circle cx={x(p.y)} cy={yR(p.v)} r="2.6" fill={rightStroke}/>
            <circle cx={x(p.y)} cy={yR(p.v)} r="12" fill="transparent"
              onMouseMove={e => show(e, <span><b>{p.label ?? p.y}</b> · {rightLabel || 'right'} <span className="tnum">{fmtN(p.v)}</span></span>)}
              onMouseLeave={hide} style={{cursor:'crosshair'}}/>
          </g>
        ))}
        {/* End-of-line labels */}
        {L.length > 0 && leftLabel && (
          <text x={x(L[L.length-1].y) + 6} y={yL(L[L.length-1].v) + 4}
            fontSize="11" fill={leftStroke}
            style={{fontFamily:'var(--serif)',fontStyle:'italic'}}>{leftLabel}</text>
        )}
        {R.length > 0 && rightLabel && (
          <text x={x(R[R.length-1].y) + 6} y={yR(R[R.length-1].v) + 4}
            fontSize="11" fill={rightStroke}
            style={{fontFamily:'var(--serif)',fontStyle:'italic'}}>{rightLabel}</text>
        )}
      </svg>
      {caption && (
        <div style={{fontSize:12.5,color:'var(--muted)',marginTop:10,fontStyle:'italic',lineHeight:1.5,maxWidth:640}}>
          {caption}
        </div>
      )}
      <SourceStrip source={source} asOf={asOf} nextUpdate={nextUpdate} sourceUrl={sourceUrl}/>
      {node}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Stacked columns — two series stacked at each x
// ─────────────────────────────────────────────────────────────
function StackedColumns({ data, series=['A','B'], colors=['var(--accent)','var(--accent-warn)'], width=720, height=340, showLabels=false }) {
  const { show, hide, node } = useTooltip();
  const pad = { t: 16, r: 24, b: 32, l: 48 };
  const W=width, H=height, iw=W-pad.l-pad.r, ih=H-pad.t-pad.b;
  const totals = data.map(d => (d.a||0) + (d.b||0));
  const yMax = (Math.max(...totals, 1)) * 1.1;
  const bw = Math.max(8, (iw/data.length) * 0.55);
  const xCenter = i => pad.l + ((i+0.5)/data.length)*iw;
  const yPx = v => pad.t + (1 - v/yMax)*ih;
  const step = yMax/4;
  const yTicks = [0,1,2,3,4].map(i=>Math.round(i*step/1000)*1000).filter((v,i,a)=>a.indexOf(v)===i);
  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block',overflow:'visible'}}>
        {yTicks.map(t=>(
          <g key={t}>
            <line x1={pad.l} x2={W-pad.r} y1={yPx(t)} y2={yPx(t)} stroke="var(--rule)"/>
            <text x={pad.l-10} y={yPx(t)+4} textAnchor="end" fontSize="11" fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK(t)}</text>
          </g>
        ))}
        {data.map((d,i)=>{
          const aH = (d.a||0)/yMax*ih;
          const bH = (d.b||0)/yMax*ih;
          const aY = H-pad.b - aH;
          const bY = aY - bH;
          const cx = xCenter(i);
          return (
            <g key={i} onMouseMove={e=>show(e, <span><b>{d.label ?? d.y}</b> · {series[0]} <span className="tnum">{fmtN(d.a||0)}</span>{(series[1] && (d.b||0) > 0) ? <> · {series[1]} <span className="tnum">{fmtN(d.b)}</span></> : null}</span>)} onMouseLeave={hide} style={{cursor:'crosshair'}}>
              <rect x={cx-bw/2} y={aY} width={bw} height={aH} fill={colors[0]}/>
              {(d.b||0) > 0 && <rect x={cx-bw/2} y={bY} width={bw} height={bH} fill={colors[1]}/>}
              <text x={cx} y={H-pad.b+18} textAnchor="middle" fontSize="11" fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{d.label ?? d.y}</text>
              {showLabels && (
                <text x={cx} y={bY-4} textAnchor="middle" fontSize="10.5" fill="var(--ink-2)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK((d.a||0)+(d.b||0))}</text>
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={W-pad.r} y1={H-pad.b} y2={H-pad.b} stroke="var(--rule-2)"/>
      </svg>
      {node}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Stacked columns, N series (one column per year/period, stacked segments)
// ─────────────────────────────────────────────────────────────
function StackedColumnsMulti({ years, series, colors, width=800, height=360, showLabels=false }) {
  const { show, hide, node } = useTooltip();
  // Rotate x-axis labels and expand bottom padding when there are many
  // categories (e.g. returns-by-nationality with 20 labels) so they don't
  // collide. Threshold matches B3 in the pre-copy polish plan.
  const rotateX = years.length > 10;
  const pad = { t: 16, r: 160, b: rotateX ? 72 : 36, l: 56 };
  const W=width, H=height, iw=W-pad.l-pad.r, ih=H-pad.t-pad.b;
  const palette = colors || [
    'var(--accent)', 'var(--accent-warn)', 'var(--accent-2)',
    'var(--accent-gold)', 'var(--muted-2)', 'var(--ink-2)',
  ];
  const totals = years.map((_, i) => series.reduce((s, r) => s + (r.data[i] || 0), 0));
  const yMax = Math.max(...totals, 1) * 1.1;
  const bw = Math.max(10, (iw/years.length) * 0.6);
  const xCenter = i => pad.l + ((i+0.5)/years.length)*iw;
  const yPx = v => pad.t + (1 - v/yMax)*ih;
  const step = yMax/4;
  const yTicks = [0,1,2,3,4].map(i=>Math.round(i*step/1000)*1000).filter((v,i,a)=>a.indexOf(v)===i);
  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block',overflow:'visible'}}>
        {yTicks.map(t=>(
          <g key={t}>
            <line x1={pad.l} x2={W-pad.r} y1={yPx(t)} y2={yPx(t)} stroke="var(--rule)"/>
            <text x={pad.l-10} y={yPx(t)+4} textAnchor="end" fontSize="11" fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK(t)}</text>
          </g>
        ))}
        {years.map((yr, i) => {
          const cx = xCenter(i);
          let yCursor = H - pad.b;
          const segs = series.map((s, si) => {
            const v = s.data[i] || 0;
            const segH = (v/yMax) * ih;
            const segY = yCursor - segH;
            yCursor = segY;
            return { name: s.name, v, segY, segH, color: palette[si % palette.length] };
          });
          const total = totals[i];
          return (
            <g key={yr} onMouseMove={e=>show(e, (
              <span>
                <b>{yr}</b>
                {segs.map((s, si) => (
                  <span key={si}> · {s.name} <span className="tnum">{fmtN(s.v)}</span></span>
                ))}
                {' '}· total <span className="tnum">{fmtN(total)}</span>
              </span>
            ))} onMouseLeave={hide} style={{cursor:'crosshair'}}>
              {segs.map((s, si) => (
                s.segH > 0 ? <rect key={si} x={cx-bw/2} y={s.segY} width={bw} height={s.segH} fill={s.color}/> : null
              ))}
              {rotateX ? (
                <text x={cx} y={H-pad.b+14} textAnchor="end" transform={`rotate(-35 ${cx} ${H-pad.b+14})`} fontSize="11" fill="var(--muted)" style={{fontFamily:'var(--serif)'}}>{yr}</text>
              ) : (
                <text x={cx} y={H-pad.b+18} textAnchor="middle" fontSize="11" fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{yr}</text>
              )}
              {showLabels && total > 0 && (
                <text x={cx} y={yPx(total)-6} textAnchor="middle" fontSize="10.5" fill="var(--ink-2)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK(total)}</text>
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={W-pad.r} y1={H-pad.b} y2={H-pad.b} stroke="var(--rule-2)"/>
        {/* Legend */}
        {series.map((s, si) => (
          <g key={s.name} transform={`translate(${W-pad.r+14}, ${pad.t+si*18})`}>
            <rect width={10} height={10} fill={palette[si % palette.length]}/>
            <text x={16} y={9} fontSize="11.5" fill="var(--ink-2)" style={{fontFamily:'var(--serif)'}}>{s.name}</text>
          </g>
        ))}
      </svg>
      {node}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Horizontal bar chart
// ─────────────────────────────────────────────────────────────
function BarChart({ data, width=720, height=null, valueFmt=fmtN, color='var(--accent)', showGrant=false, labelWidth=130 }) {
  const { show, hide, node } = useTooltip();
  const rowH = 30;
  const H = height || data.length * rowH + 16;
  // Reserve a wider right gutter when grant-rate labels are shown so value + grant don't collide.
  const pad = { t: 8, r: showGrant ? 110 : 56, b: 8, l: labelWidth };
  const iw = width - pad.l - pad.r;
  const vMax = Math.max(...data.map(d=>d.v));
  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      <svg width="100%" height={H} viewBox={`0 0 ${width} ${H}`} style={{display:'block'}}>
        {data.map((d,i)=>{
          const y = pad.t + i*rowH;
          const w = (d.v/vMax)*iw;
          // Place the value label inside the bar end when there's room (≥ 50px), else outside.
          const inside = w >= 50;
          return (
            <g key={d.name}
              onMouseMove={e=>show(e, <span><b>{d.name}</b> · <span className="tnum">{valueFmt(d.v)}</span>{showGrant && d.grant !== undefined ? <> · grant rate <span className="tnum">{Math.round(d.grant*100)}%</span></> : null}</span>)}
              onMouseLeave={hide}
              style={{cursor:'crosshair'}}>
              <text x={pad.l-10} y={y+rowH/2+4} textAnchor="end" fontSize="13" fill="var(--ink-2)" style={{fontFamily:'var(--serif)'}}>{d.name}</text>
              <rect x={pad.l} y={y+6} width={iw} height={rowH-12} fill="var(--bg-2)"/>
              <rect x={pad.l} y={y+6} width={w} height={rowH-12} fill={color}/>
              <text
                x={inside ? pad.l + w - 6 : pad.l + w + 6}
                y={y+rowH/2+4}
                textAnchor={inside ? 'end' : 'start'}
                fontSize="12"
                fill={inside ? '#fff' : 'var(--ink-2)'}
                style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{valueFmt(d.v)}</text>
              {showGrant && d.grant !== undefined && (
                <text x={width-8} y={y+rowH/2+4} textAnchor="end" fontSize="11" fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)',fontStyle:'italic'}}>{Math.round(d.grant*100)}% grant</text>
              )}
            </g>
          );
        })}
      </svg>
      {node}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Stacked bar / decisions breakdown
// ─────────────────────────────────────────────────────────────
function StackedBar({ data, width=720, height=80 }) {
  const { show, hide, node } = useTooltip();
  const total = data.reduce((s,d)=>s+d.v,0);
  let cum = 0;
  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{display:'block'}}>
        {data.map((d,i)=>{
          const w = (d.v/total)*width;
          const x = cum;
          cum += w;
          return (
            <g key={d.label}
              onMouseMove={e=>show(e, <span><b>{d.label}</b> · <span className="tnum">{fmtN(d.v)}</span> · {Math.round(d.v/total*100)}%</span>)}
              onMouseLeave={hide}
              style={{cursor:'crosshair'}}>
              <rect x={x} y={20} width={w-1} height={36} fill={d.color}/>
              {w > width * 0.06 && <text x={x} y={15} fontSize="11" fill="var(--muted)" className="uc" style={{fontFamily:'var(--serif)'}}>
                {d.label}
              </text>}
              {w > width * 0.06 && <text x={x} y={72} fontSize="12" fill="var(--ink)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>
                {fmtN(d.v)} <tspan fill="var(--muted)">· {Math.round(d.v/total*100)}%</tspan>
              </text>}
            </g>
          );
        })}
      </svg>
      {node}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Tiny sparkline (for index cards)
// ─────────────────────────────────────────────────────────────
function Spark({ data, width=180, height=48, stroke='var(--accent)', area=true }) {
  const pad = 4;
  const xs = data.map(p=>p.y), ys = data.map(p=>p.v);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMax = Math.max(...ys) * 1.1;
  const x = v => pad + ((v-xMin)/(xMax-xMin))*(width-2*pad);
  const y = v => pad + (1 - v/yMax)*(height-2*pad);
  const pts = data.map(p=>`${x(p.y)},${y(p.v)}`).join(' ');
  const areaPath = `M${x(data[0].y)},${y(0)} L${pts.split(' ').join(' L')} L${x(data[data.length-1].y)},${y(0)} Z`;
  return (
    <svg width={width} height={height} style={{display:'block'}}>
      {area && <path d={areaPath} fill={stroke} fillOpacity="0.12"/>}
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.3"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Donut / ring for grant rate
// ─────────────────────────────────────────────────────────────
// Ring renders a primary value as a filled arc and, optionally, a faint "ghost"
// arc for a comparison value (e.g. the same metric in an earlier year).
// `ghostValue` + `ghostLabel` are both optional; pass both to show "from X% in YYYY".
function Ring({ value, size=140, stroke=14, label='', sub='', ghostValue=null, ghostLabel='' }) {
  const r = size/2 - stroke/2;
  const c = 2*Math.PI*r;
  const off = c * (1 - value);
  const ghostOff = ghostValue != null ? c * (1 - ghostValue) : null;
  // Scale the centred number and the ghost chip proportionally to size so the
  // larger 220px ring on the Dashboard reads as a proper callout.
  const numFont = Math.round(size * 0.26);
  return (
    <div style={{display:'inline-flex',flexDirection:'column',alignItems:'center',gap:6}}>
      <svg width={size} height={size} style={{overflow:'visible'}}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={stroke}/>
        {/* Ghost arc — sits on top of the track, under the primary */}
        {ghostValue != null && (
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--muted-2)" strokeWidth={stroke - 4}
            strokeDasharray={c} strokeDashoffset={ghostOff} opacity="0.35"
            transform={`rotate(-90 ${size/2} ${size/2})`}/>
        )}
        {/* Primary arc */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{transition:'stroke-dashoffset .5s ease'}}/>
        <text x={size/2} y={size/2 + numFont*0.08} textAnchor="middle" fontSize={numFont} fill="var(--ink)"
          style={{fontFamily:'var(--serif)',fontVariantNumeric:'tabular-nums'}}>
          {Math.round(value*100)}%
        </text>
        {ghostValue != null && ghostLabel && (
          <text x={size/2} y={size/2 + numFont*0.08 + Math.round(size*0.13)} textAnchor="middle"
            fontSize={Math.max(10, Math.round(size*0.08))} fill="var(--muted)"
            style={{fontFamily:'var(--serif)',fontStyle:'italic'}}>
            {ghostLabel}
          </text>
        )}
      </svg>
      {label && <div className="uc" style={{color:'var(--muted)'}}>{label}</div>}
      {sub && <div style={{fontSize:12,color:'var(--muted)',fontStyle:'italic'}}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Choropleth-ish region list (ranked bars)
// ─────────────────────────────────────────────────────────────
function RegionList({ data }) {
  const vMax = Math.max(...data.map(d=>d.v));
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      {data.map(d=>(
        <div key={d.name} style={{display:'grid',gridTemplateColumns:'170px 1fr 60px',alignItems:'center',gap:16,fontSize:13,padding:'6px 0',borderBottom:'1px dotted var(--rule)'}}>
          <span>{d.name}</span>
          <div style={{position:'relative',height:14,background:'var(--bg-2)'}}>
            <div style={{position:'absolute',inset:0,width:`${(d.v/vMax)*100}%`,background:'var(--accent)'}}/>
          </div>
          <span className="tnum" style={{textAlign:'right',color:'var(--ink-2)'}}>{fmtN(d.v)}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Schematic world map — choropleth by region, rounded-rect blobs
// ─────────────────────────────────────────────────────────────
const REGION_LAYOUT = [
  { name: 'North America',             x: 30,  y: 40,  w: 150, h: 95 },
  { name: 'Americas',                  x: 120, y: 145, w: 120, h: 180 },
  { name: 'Europe',                    x: 320, y: 55,  w: 90,  h: 70 },
  // Caucasus sits between Europe and Central Asia, above the Middle East.
  { name: 'Caucasus',                  x: 415, y: 75,  w: 45,  h: 28 },
  { name: 'Central Asia',              x: 465, y: 65,  w: 75,  h: 68 },
  { name: 'East Asia & Pacific',       x: 545, y: 50,  w: 150, h: 110 },
  { name: 'North Africa',              x: 310, y: 155, w: 105, h: 60 },
  { name: 'Middle East',               x: 420, y: 140, w: 95,  h: 70 },
  { name: 'South Asia',                x: 520, y: 165, w: 85,  h: 85 },
  { name: 'South East Asia',           x: 610, y: 215, w: 85,  h: 85 },
  { name: 'West Africa',               x: 310, y: 225, w: 90,  h: 65 },
  { name: 'East Africa',               x: 405, y: 220, w: 85,  h: 85 },
  { name: 'Central & Southern Africa', x: 330, y: 310, w: 170, h: 50 },
];

function RegionWorldMap({ data, width=720, height=380 }) {
  const { show, hide, node } = useTooltip();
  const zoom = useMapZoom(width, height);
  const byName = Object.fromEntries(data.map(d => [d.name, d.v]));
  const total = data.reduce((s, d) => s + d.v, 0);
  const vMax = Math.max(...data.map(d => d.v), 1);
  // Shared 6-stop palette, sqrt-scaled so small regions stay visible.
  const fillFor = v => {
    if (!(v > 0)) return ATLAS_PALETTE[0];
    return atlasPaletteColor(Math.sqrt(v / vMax));
  };
  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      <svg width="100%" height={height} viewBox={zoom.viewBox} {...zoom.svgProps}
        style={{display:'block', ...zoom.svgProps.style}}>
        <rect x={0} y={0} width={width} height={height} fill="var(--bg-2)"/>
        {REGION_LAYOUT.map(r => {
          const v = byName[r.name] ?? 0;
          const pct = total ? (v/total*100) : 0;
          return (
            <g key={r.name}
              onMouseMove={e => show(e, <span><b>{r.name}</b> · <span className="tnum">{fmtN(v)}</span> · {pct.toFixed(1)}%</span>)}
              onMouseLeave={hide}
              style={{cursor:'crosshair'}}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={10}
                fill={fillFor(v)}
                stroke="var(--rule-2)" strokeWidth={0.75}/>
              <text x={r.x + r.w/2} y={r.y + r.h/2 + 4} textAnchor="middle"
                fontSize={11} fontFamily="var(--serif)" fill="var(--ink)"
                style={{pointerEvents:'none'}}>
                {r.name.length > 22 ? r.name.replace(' & ', ' &\n') : r.name}
              </text>
            </g>
          );
        })}
        {/* "Other / Unclassified" sits as a small legend-style badge in the corner */}
        {byName['Other / Unclassified'] !== undefined && (
          <g onMouseMove={e => show(e, <span><b>Other / Unclassified</b> · <span className="tnum">{fmtN(byName['Other / Unclassified'])}</span> · Stateless, refugee, unknown</span>)} onMouseLeave={hide} style={{cursor:'crosshair'}}>
            <rect x={width-130} y={height-46} width={120} height={34} rx={6}
              fill={fillFor(byName['Other / Unclassified'])}
              stroke="var(--rule-2)" strokeWidth={0.75}/>
            <text x={width-70} y={height-25} textAnchor="middle" fontSize="10.5" fontFamily="var(--serif)" fill="var(--ink)" style={{pointerEvents:'none'}}>Other / Unclassified</text>
          </g>
        )}
      </svg>
      <ZoomControls zoom={zoom}/>
      {node}
    </figure>
  );
}

function RegionTable({ data, rows }) {
  const [expanded, setExpanded] = React.useState(new Set());
  const toggle = name => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  // Build region → sorted country list from raw nationality rows.
  const byRegion = React.useMemo(() => {
    if (!rows) return {};
    const m = {};
    for (const r of rows) {
      const reg = (typeof REGION_MAP !== 'undefined' ? REGION_MAP[r.name] : null) ?? 'Other / Unclassified';
      (m[reg] = m[reg] || []).push(r);
    }
    return m;
  }, [rows]);

  const total = data.reduce((s, d) => s + d.v, 0);
  const vMax = Math.max(...data.map(d => d.v), 1);
  // Legend swatches reuse the same 6-stop palette as the map, so the colour
  // next to a region's name matches the colour painted on the map itself.
  const fillFor = v => {
    if (!(v > 0)) return ATLAS_PALETTE[0];
    return atlasPaletteColor(Math.sqrt(v / vMax));
  };

  return (
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:13.5}}>
      <thead>
        <tr>
          <th className="uc" style={{padding:'0 10px 10px 0',textAlign:'left',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent-gold)'}}>Region</th>
          <th className="uc" style={{padding:'0 10px 10px',textAlign:'right',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent-gold)'}}>Applicants</th>
          <th className="uc" style={{padding:'0 0 10px 10px',textAlign:'right',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent-gold)'}}>Share</th>
        </tr>
      </thead>
      <tbody>
        {data.map(r => {
          const isOpen = expanded.has(r.name);
          const countries = byRegion[r.name] ? [...byRegion[r.name]].sort((a, b) => b.v - a.v) : [];
          const canExpand = rows && countries.length > 0;
          return (
            <React.Fragment key={r.name}>
              <tr
                style={{borderBottom:'1px solid var(--rule)', cursor: canExpand ? 'pointer' : 'default'}}
                onClick={canExpand ? () => toggle(r.name) : undefined}
              >
                <td style={{padding:'10px 10px 10px 0',color:'var(--ink)'}}>
                  {canExpand && (
                    <span style={{
                      display:'inline-block', width:10, marginRight:4, fontSize:9,
                      color:'var(--muted)', userSelect:'none',
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition:'transform 0.15s', verticalAlign:'middle',
                    }}>▶</span>
                  )}
                  <span style={{display:'inline-block',width:12,height:12,marginRight:8,verticalAlign:'middle',background:fillFor(r.v),borderRadius:2,border:'1px solid var(--rule-2)'}}/>
                  {r.name}
                </td>
                <td className="tnum" style={{padding:'10px',textAlign:'right'}}>{fmtN(r.v)}</td>
                <td className="tnum" style={{padding:'10px 0 10px 10px',textAlign:'right',color:'var(--muted)'}}>{(r.v/total*100).toFixed(1)}%</td>
              </tr>
              {isOpen && countries.map(c => (
                <tr key={c.name} style={{borderBottom:'1px solid var(--rule)',background:'var(--bg-2)'}}>
                  <td style={{padding:'5px 10px 5px 26px',color:'var(--ink-2)',fontSize:12.5}}>{c.name}</td>
                  <td className="tnum" style={{padding:'5px 10px',textAlign:'right',fontSize:12.5}}>{fmtN(c.v)}</td>
                  <td className="tnum" style={{padding:'5px 0 5px 10px',textAlign:'right',color:'var(--muted)',fontSize:12.5}}>
                    {(c.v / total * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </React.Fragment>
          );
        })}
        <tr>
          <td className="uc" style={{padding:'12px 10px 0 0',color:'var(--muted)'}}>Total</td>
          <td className="tnum" style={{padding:'12px 10px 0',textAlign:'right',color:'var(--ink)',fontWeight:500}}>{fmtN(total)}</td>
          <td className="tnum" style={{padding:'12px 0 0 10px',textAlign:'right',color:'var(--muted)'}}>100.0%</td>
        </tr>
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared 6-stop choropleth palette + interpolation helpers.
// Used by both WorldMapChoropleth (dashboard Fig.08) and AtlasChoropleth
// (top-level /atlas view). Defined here in charts.jsx so it is in scope
// before atlas-view.jsx loads in the bundle.
// ─────────────────────────────────────────────────────────────
const ATLAS_PALETTE = ['#f5ecd8','#d4b86a','#b85c38','#6b4a2a','#2d4532','#1c3d2e'];

function atlasLerpHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

function atlasPaletteColor(t) {
  const n = ATLAS_PALETTE.length - 1;
  const x = Math.max(0, Math.min(1, t)) * n;
  const i = Math.floor(x);
  if (i >= n) return ATLAS_PALETTE[n];
  return atlasLerpHex(ATLAS_PALETTE[i], ATLAS_PALETTE[i + 1], x - i);
}

// ─────────────────────────────────────────────────────────────
// Pan + zoom hook for SVG maps. Returns a live viewBox string, handlers
// to spread on the <svg>, and imperative zoomIn/zoomOut/reset actions
// (exposed via <ZoomControls/>). Dragging while zoomed pans the map;
// clicks still fall through as long as the pointer didn't move more than
// ~2 px between mousedown and mouseup (didDrag()).
// ─────────────────────────────────────────────────────────────
function useMapZoom(baseW, baseH, { maxZoom = 8 } = {}) {
  const [view, setView] = React.useState({ x: 0, y: 0, w: baseW, h: baseH });
  const drag = React.useRef(null);
  const [, bump] = React.useState(0); // re-render on drag start/end for cursor

  const scale = baseW / view.w;
  const canZoomIn = scale < maxZoom - 1e-6;
  const canZoomOut = scale > 1 + 1e-6;
  const zoomed = scale > 1 + 1e-6;

  // Keep the view inside the world rect, and enforce min / max zoom.
  const clamp = v => {
    const wMin = baseW / maxZoom;
    const w = Math.max(wMin, Math.min(baseW, v.w));
    const h = w * (baseH / baseW);
    const x = Math.max(0, Math.min(baseW - w, v.x));
    const y = Math.max(0, Math.min(baseH - h, v.y));
    return { x, y, w, h };
  };

  const zoomAt = (cx, cy, factor) => {
    setView(prev => {
      const newW = prev.w / factor;
      const newH = prev.h / factor;
      const nx = cx - (cx - prev.x) * (newW / prev.w);
      const ny = cy - (cy - prev.y) * (newH / prev.h);
      return clamp({ x: nx, y: ny, w: newW, h: newH });
    });
  };
  const zoomIn  = () => zoomAt(view.x + view.w / 2, view.y + view.h / 2, 1.5);
  const zoomOut = () => zoomAt(view.x + view.w / 2, view.y + view.h / 2, 1 / 1.5);
  const reset   = () => setView({ x: 0, y: 0, w: baseW, h: baseH });
  const flyTo   = (cx, cy) => {
    const w = baseW / 4, h = baseH / 4;
    setView(clamp({ x: cx - w / 2, y: cy - h / 2, w, h }));
  };
  // Fit the view to a bounding box (in base-SVG coords), padded by `padFrac`
  // on each side. Preferred for country zooms because it keeps the whole
  // country in view regardless of size — Russia, Canada, etc. otherwise
  // overflow a fixed 4× centroid zoom.
  const flyToBox = (bx, by, bw, bh, padFrac = 0.1) => {
    const padX = bw * padFrac, padY = bh * padFrac;
    const targetW = bw + 2 * padX;
    const targetH = bh + 2 * padY;
    // Keep the chart's aspect ratio. Whichever dimension is constraining
    // determines the zoom level.
    const aspect = baseH / baseW;
    let w = targetW, h = w * aspect;
    if (h < targetH) { h = targetH; w = h / aspect; }
    const cx = bx + bw / 2, cy = by + bh / 2;
    setView(clamp({ x: cx - w / 2, y: cy - h / 2, w, h }));
  };

  const onMouseDown = e => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = {
      sx: e.clientX, sy: e.clientY,
      vx: view.x, vy: view.y,
      rect, moved: false,
    };
    bump(n => n + 1);
  };
  const onMouseMove = e => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / d.rect.width  * view.w;
    const dy = (e.clientY - d.sy) / d.rect.height * view.h;
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 2) d.moved = true;
    setView(prev => clamp({ ...prev, x: d.vx - dx, y: d.vy - dy }));
  };
  const stopDrag = () => { drag.current = null; bump(n => n + 1); };

  const didDrag = () => !!(drag.current && drag.current.moved);

  return {
    viewBox: `${view.x} ${view.y} ${view.w} ${view.h}`,
    svgProps: {
      onMouseDown, onMouseMove,
      onMouseUp: stopDrag, onMouseLeave: stopDrag,
      style: {
        cursor: drag.current ? 'grabbing' : (zoomed ? 'grab' : 'default'),
        touchAction: 'none',
      },
    },
    zoomIn, zoomOut, reset, flyTo, flyToBox,
    canZoomIn, canZoomOut, zoomed,
    didDrag,
  };
}

function ZoomControls({ zoom, style = {} }) {
  const btn = (label, onClick, disabled, aria) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={aria} title={aria}
      style={{
        width: 26, height: 26, padding: 0, fontSize: 15, lineHeight: 1,
        background: disabled ? 'var(--bg-2)' : '#fff',
        color: disabled ? 'var(--muted-2)' : 'var(--ink)',
        border: '1px solid var(--rule-2)',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--serif)',
      }}>{label}</button>
  );
  return (
    <div style={{
      position: 'absolute', top: 8, right: 8,
      display: 'flex', flexDirection: 'column', gap: 3, zIndex: 2,
      ...style,
    }}>
      {btn('+', zoom.zoomIn,  !zoom.canZoomIn,  'Zoom in')}
      {btn('\u2212', zoom.zoomOut, !zoom.canZoomOut, 'Zoom out')}
      {btn('\u21BA', zoom.reset,    !zoom.zoomed,     'Reset view')}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Country-level choropleth — each country filled by its region's shade.
// Falls back to the schematic RegionWorldMap if WORLD_MAP hasn't been
// generated (i.e. scripts/build_world_map.py hasn't been run).
// ─────────────────────────────────────────────────────────────
function WorldMapChoropleth({ data, countryData, width=720, height=380 }) {
  const worldMap = (typeof window !== 'undefined' && window.WORLD_MAP) ? window.WORLD_MAP : null;
  const zoom = useMapZoom(width, height);
  if (!worldMap) return <RegionWorldMap data={data} width={width} height={height}/>;
  const { show, hide, node } = useTooltip();
  const byRegion = Object.fromEntries(data.map(d => [d.name, d.v]));
  const total = data.reduce((s, d) => s + d.v, 0);
  const vMax = Math.max(...data.map(d => d.v), 1);
  // Country-level lookup for the second tooltip line.
  const byCountry = Object.fromEntries(
    (Array.isArray(countryData) ? countryData : []).map(r => [r.name, r.v])
  );
  const overallTotal = (Array.isArray(countryData) && countryData.length)
    ? countryData.reduce((s, r) => s + (r.v || 0), 0)
    : total;
  // sqrt compresses the long tail so mid-range regions reach the middle stops
  // of the palette instead of all collapsing into the lightest band.
  const fillFor = v => {
    if (!(v > 0)) return ATLAS_PALETTE[0];
    return atlasPaletteColor(Math.sqrt(v / vMax));
  };
  // Two-line tooltip: region totals on top, country detail below.
  const tipFor = (c, regionTotal) => {
    const regPct = overallTotal ? (regionTotal/overallTotal*100) : 0;
    const cVal = byCountry[c.name];
    const cPct = (cVal != null && overallTotal) ? (cVal/overallTotal*100) : null;
    return (
      <div>
        <div><b>{c.region}</b> · <span className="tnum">{fmtN(regionTotal)}</span>{c.region !== 'Other / Unclassified' ? <> · {regPct.toFixed(1)}%</> : null}</div>
        <div style={{marginTop:2,fontSize:'0.92em',color:'var(--muted)'}}>
          {c.name}{cVal != null ? <> · <span className="tnum">{fmtN(cVal)}</span>{cPct != null ? ` · ${cPct.toFixed(2)}%` : ''}</> : ' · no data'}
        </div>
      </div>
    );
  };
  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      <svg width="100%" height={height} viewBox={zoom.viewBox} {...zoom.svgProps}
        style={{display:'block', ...zoom.svgProps.style}}>
        <rect x={0} y={0} width={width} height={height} fill="var(--bg-2)"/>
        <g>
          {worldMap.map((c, i) => {
            const regionTotal = byRegion[c.region] ?? 0;
            // Natural Earth uses '-99' for disputed / unrecognised territories, so
            // ISO alone isn't unique. Compose with name + index for a stable key.
            return (
              <path key={`${c.iso || ''}-${c.name}-${i}`} d={c.d}
                fill={fillFor(regionTotal)}
                stroke="var(--rule-2)" strokeWidth={0.4}
                onMouseMove={e => show(e, tipFor(c, regionTotal))}
                onMouseLeave={hide}/>
            );
          })}
        </g>
        {/* Corner badge for Other / Unclassified, kept from the schematic version.
            Rendered in world coords so it follows the pan/zoom, but is kept inside
            the overall world rect so it stays visible until the user zooms past it. */}
        {byRegion['Other / Unclassified'] !== undefined && (
          <g onMouseMove={e => show(e, <span><b>Other / Unclassified</b> · <span className="tnum">{fmtN(byRegion['Other / Unclassified'])}</span> · Stateless, refugee, unknown</span>)} onMouseLeave={hide} style={{cursor:'crosshair'}}>
            <rect x={width-130} y={height-46} width={120} height={34} rx={6}
              fill={fillFor(byRegion['Other / Unclassified'])}
              stroke="var(--rule-2)" strokeWidth={0.75}/>
            <text x={width-70} y={height-25} textAnchor="middle" fontSize="10.5" fontFamily="var(--serif)" fill="var(--ink)" style={{pointerEvents:'none'}}>Other / Unclassified</text>
          </g>
        )}
      </svg>
      <ZoomControls zoom={zoom}/>
      {node}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Sankey chart — N-column left-to-right flow
// nodes: [{id, label, col (0..N-1), value, color, mocked?}]
// links: [{source, target, value, dashed?}]  (source.col must be < target.col)
// ─────────────────────────────────────────────────────────────
function SankeyChart({ nodes, links, width = 820, height = 500, compact = false }) {
  const { show, hide, node: ttNode } = useTooltip();
  // Two-tier focus state: hovering a node *previews* the highlight;
  // clicking pins it so the user can study a single cohort without
  // having to keep the pointer still. Clicking the pinned node (or
  // the background) clears the pin.
  const [hoverId, setHoverId] = React.useState(null);
  const [pinnedId, setPinnedId] = React.useState(null);
  const activeId = hoverId ?? pinnedId;
  // A link "belongs to" a node when that node is either its source or target.
  // When there's no active node every link is emphasised equally.
  const isLinkActive = (lk) => !activeId || lk.source === activeId || lk.target === activeId;
  const isNodeActive = (n)  => !activeId || n.id === activeId
      || links.some(lk => (lk.source === activeId && lk.target === n.id)
                       || (lk.target === activeId && lk.source === n.id));

  const NODE_W = compact ? 14 : 20;
  const GAP    = compact ? 6 : 8;
  const PAD    = compact ? { l: 80, r: 90, t: 10, b: 10 } : { l: 150, r: 200, t: 12, b: 12 };

  const cols = Array.from(new Set(nodes.map(n => n.col))).sort((a, b) => a - b);
  const maxCol = cols[cols.length - 1] ?? 0;
  const colNodes = Object.fromEntries(cols.map(c => [c, nodes.filter(n => n.col === c)]));
  const colTotals = Object.fromEntries(cols.map(c => [c, colNodes[c].reduce((s, n) => s + n.value, 0)]));
  const totalVal = colTotals[0] ?? Math.max(...Object.values(colTotals), 1);
  const innerH  = height - PAD.t - PAD.b;

  const xForCol = (c) => {
    if (maxCol === 0) return PAD.l;
    const span = width - PAD.l - PAD.r - NODE_W;
    return PAD.l + (c / maxCol) * span;
  };

  // Compute pixel y and h for every node (scale so the biggest column fills innerH).
  const layout = {};
  for (const c of cols) {
    const ns = colNodes[c];
    const denom = colTotals[c] || totalVal;
    const avail = innerH - GAP * Math.max(0, ns.length - 1);
    let y = PAD.t;
    for (const n of ns) {
      const h = Math.max(2, (n.value / denom) * avail);
      layout[n.id] = { x: xForCol(c), y, h };
      y += h + GAP;
    }
  }

  // Advancing cursors so each link picks up where the last left off
  const srcY = Object.fromEntries(nodes.map(n => [n.id, layout[n.id]?.y ?? 0]));
  const tgtY = Object.fromEntries(nodes.map(n => [n.id, layout[n.id]?.y ?? 0]));

  const renderedLinks = links.map(lk => {
    const sn = nodes.find(n => n.id === lk.source);
    const tn = nodes.find(n => n.id === lk.target);
    const sl = layout[lk.source], tl = layout[lk.target];
    if (!sl || !tl || !sn || !tn || !sn.value || !tn.value || lk.value <= 0) return null;

    const lhS = (lk.value / sn.value) * sl.h;
    const lhT = (lk.value / tn.value) * tl.h;
    const x0 = sl.x + NODE_W, sy = srcY[lk.source];
    const x1 = tl.x,          ty = tgtY[lk.target];
    const mx = (x0 + x1) / 2;

    srcY[lk.source] += lhS;
    tgtY[lk.target] += lhT;

    const d = [
      `M ${x0} ${sy}`,
      `C ${mx} ${sy}, ${mx} ${ty}, ${x1} ${ty}`,
      `L ${x1} ${ty + lhT}`,
      `C ${mx} ${ty + lhT}, ${mx} ${sy + lhS}, ${x0} ${sy + lhS}`,
      'Z',
    ].join(' ');

    const pct = ((lk.value / (colTotals[sn.col] || totalVal)) * 100).toFixed(1);
    const tt  = <span><b>{sn.label}</b> → <b>{tn.label}</b>: <span className="tnum">{fmtN(lk.value)}</span> ({pct}%)</span>;
    return { d, color: sn.color, tt, key: `${lk.source}→${lk.target}`, dashed: lk.dashed || sn.mocked || tn.mocked };
  }).filter(Boolean);

  return (
    <figure className="chart-wrap" style={{ position: 'relative', margin: 0 }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}
           onClick={() => setPinnedId(null)}>
        {/* Modelled (estimated) ribbons read as provisional through the
            pale fill + dashed node outline below — no moiré hatch overlay. */}
        {renderedLinks.map(lk => {
          const active = isLinkActive(lk);
          const base = lk.dashed ? 0.18 : 0.35;
          return (
            <g key={lk.key} style={{ color: lk.color }}>
              <path d={lk.d}
                fill={lk.color} fillOpacity={active ? base : 0.06}
                onMouseMove={e => show(e, lk.tt)} onMouseLeave={hide}
                style={{ cursor: 'default', transition: 'fill-opacity .12s' }}/>
            </g>
          );
        })}
        {nodes.map(n => {
          const nl = layout[n.id];
          if (!nl) return null;
          const denom = colTotals[n.col] || totalVal;
          const pct  = ((n.value / denom) * 100).toFixed(1);
          const tt   = <span><b>{n.label}</b>: <span className="tnum">{fmtN(n.value)}</span> ({pct}%){n.mocked ? ' · placeholder' : ''}</span>;
          const isLeftmost = n.col === 0;
          const active = isNodeActive(n);
          const isPinned = pinnedId === n.id;
          return (
            <g key={n.id}
              onMouseEnter={() => setHoverId(n.id)}
              onMouseLeave={() => { setHoverId(null); hide(); }}
              onMouseMove={e => show(e, tt)}
              onClick={e => { e.stopPropagation(); setPinnedId(isPinned ? null : n.id); }}
              style={{ cursor: 'pointer', opacity: active ? 1 : 0.35, transition: 'opacity .12s' }}>
              <rect x={nl.x} y={nl.y} width={NODE_W} height={nl.h}
                fill={n.color}
                fillOpacity={n.mocked ? 0.55 : 1}
                stroke={isPinned ? 'var(--accent)' : (n.mocked ? n.color : 'none')}
                strokeDasharray={n.mocked && !isPinned ? '3 2' : undefined}
                strokeWidth={isPinned ? 2 : (n.mocked ? 1 : 0)}
                rx={2}/>
              {isLeftmost ? (
                <text x={nl.x - 8} y={nl.y + nl.h / 2}
                  textAnchor="end" dominantBaseline="middle"
                  fontSize={compact ? 13 : 11} fontFamily="var(--serif)" fill="var(--ink-2)">
                  {n.label}{n.mocked ? ' *' : ''}
                </text>
              ) : (
                <text x={nl.x + NODE_W + 8} y={nl.y + nl.h / 2 - 7}
                  textAnchor="start" fontSize={compact ? 13 : 11} fontFamily="var(--serif)" fill="var(--ink-2)">
                  <tspan>{n.label}{n.mocked ? ' *' : ''}</tspan>
                  <tspan x={nl.x + NODE_W + 8} dy={compact ? 16 : 14} fontSize={compact ? 11 : 10} fill="var(--muted)">{fmtN(n.value)} · {pct}%</tspan>
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {ttNode}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Cohort outcome ribbon (B5). Small-multiples — one panel per
// cohort year. Each panel shows a horizontal ribbon of six
// buckets (protection / otherLeave / refusals / withdrawals /
// admin / notYet) for both Initial and Latest outcomes, sharing
// an x-axis anchored at 0–claims so panel widths are comparable.
//
// `data` shape: array of
//   { year, claims, initial:{...}, latest:{...}, returns:{...} }
// aggregated across nationalities before passing in.
// ─────────────────────────────────────────────────────────────
const COHORT_BUCKETS = ['protection','otherLeave','refusals','withdrawals','admin','notYet'];
const COHORT_COLORS = {
  protection:  'var(--accent-2)',
  otherLeave:  'var(--accent-gold)',
  refusals:    'var(--accent-warn)',
  withdrawals: 'var(--muted-2)',
  admin:       'var(--muted)',
  notYet:      'var(--bg-3)',
};
const COHORT_LABELS = {
  protection:  'Protection',
  otherLeave:  'Other leave',
  refusals:    'Refused',
  withdrawals: 'Withdrawn',
  admin:       'Admin',
  notYet:      'Pending',
};

function CohortRibbon({ data, width=720, cols=4, rowHeight=72, gap=16, annotations=[] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <figure className="chart-wrap" style={{margin:0,padding:'32px 24px',background:'var(--bg-2)',borderLeft:'2px solid var(--accent)',color:'var(--muted)',fontFamily:'var(--serif)'}}>
        <div style={{fontSize:13,lineHeight:1.5}}>
          <b style={{color:'var(--ink-2)'}}>Cohort ribbon · pending data.</b> This chart reads from
          <code style={{margin:'0 4px',fontFamily:'var(--mono)',fontSize:12}}>OUTCOME_COHORT_ANNUAL</code>,
          which will populate once the outcome-analysis xlsx (Asy_D04) is ingested.
          See <code style={{fontFamily:'var(--mono)',fontSize:12}}>scripts/build_outcome_analysis.py</code>.
        </div>
      </figure>
    );
  }
  const { show, hide, node: ttNode } = useTooltip();
  const rows = Math.ceil(data.length / cols);
  // Reserve a left-hand gutter for the phase labels ("At first decision" /
  // "Latest"). The labels are identical for every row, so they render once
  // per row in the gutter rather than repeating on every cell — otherwise
  // the text overflows the 16 px inter-cell gap and lands on top of the
  // neighbouring cohort's bars.
  const labelGutter = 78;
  const cellW = (width - labelGutter - gap*(cols-1)) / cols;
  const ribbonH = 14;
  // Annotations render in their own strip below the latest-phase ribbon with
  // a leader line, so they never overlap ribbon rects.
  const annStripY = 20 + 2 * (ribbonH + 8) + 8; // 8px gap after latest ribbon
  const effRowHeight = Math.max(rowHeight, annStripY + 22);
  const extraBelow = 14;
  const height = rows * (effRowHeight + gap) + extraBelow;
  // Quick lookup: annotations keyed as `${year}|${phase}`.
  const annByKey = {};
  (annotations || []).forEach(a => {
    if (a && a.year != null) annByKey[a.year + '|' + (a.phase || 'latest')] = a.text;
  });
  const stack = (row, phase) => {
    let x = 0;
    const total = row.claims || 1;
    return COHORT_BUCKETS.map(b => {
      const v = row[phase][b] || 0;
      const w = (v/total) * cellW;
      const seg = { b, v, x, w };
      x += w;
      return seg;
    });
  };
  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{display:'block',overflow:'visible'}}>
        {data.map((row, i) => {
          const r = Math.floor(i/cols), c = i%cols;
          const x0 = labelGutter + c*(cellW+gap), y0 = r*(effRowHeight+gap);
          // Pick one annotation per cell (latest takes precedence over initial)
          // and record which phase it attaches to so we can draw a leader line.
          const annLatest = annByKey[row.year + '|latest'];
          const annInitial = annByKey[row.year + '|initial'];
          const annText = annLatest || annInitial || null;
          const annPhaseIdx = annLatest ? 1 : (annInitial ? 0 : null);
          return (
            <g key={row.year} transform={`translate(${x0},${y0})`}>
              <text x={0} y={12} fontSize={12} fontWeight={600} fill="var(--ink)" style={{fontFamily:'var(--serif)'}}>Cohort {row.year}</text>
              <text x={cellW} y={12} textAnchor="end" fontSize={11} fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtN(row.claims)} claims</text>
              {['initial','latest'].map((phase, pi) => (
                <g key={phase} transform={`translate(0, ${20 + pi*(ribbonH+8)})`}>
                  {c === 0 && (
                    <text x={-10} y={ribbonH-3} textAnchor="end" fontSize={10} fill="var(--muted)" style={{fontFamily:'var(--serif)'}}>{phase === 'initial' ? 'At first decision' : 'Latest'}</text>
                  )}
                  {stack(row, phase).map(seg => (
                    <rect key={seg.b} x={seg.x} y={0} width={Math.max(0, seg.w-0.5)} height={ribbonH}
                      fill={COHORT_COLORS[seg.b]} fillOpacity={0.85}
                      onMouseMove={e=>show(e, <span><b>Cohort {row.year}</b> · {phase} · {COHORT_LABELS[seg.b]} <span className="tnum">{fmtN(seg.v)}</span></span>)}
                      onMouseLeave={hide}
                      style={{cursor:'crosshair'}}/>
                  ))}
                </g>
              ))}
              {annText && (
                <g style={{pointerEvents:'none'}}>
                  <line
                    x1={cellW/2}
                    y1={20 + annPhaseIdx*(ribbonH+8) + ribbonH}
                    x2={cellW/2}
                    y2={annStripY - 3}
                    stroke="var(--accent)" strokeWidth={0.75} strokeOpacity={0.6}/>
                  <text x={cellW/2} y={annStripY + 9} textAnchor="middle" fontSize={10} fill="var(--accent)"
                        style={{fontFamily:'var(--serif)',fontStyle:'italic'}}>
                    {annText}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption style={{marginTop:12,fontSize:12,color:'var(--muted)',display:'flex',flexWrap:'wrap',gap:14}}>
        {COHORT_BUCKETS.map(b => (
          <span key={b} style={{display:'inline-flex',alignItems:'center',gap:6}}>
            <span style={{width:11,height:11,background:COHORT_COLORS[b],display:'inline-block',borderRadius:2}}/>
            {COHORT_LABELS[b]}
          </span>
        ))}
      </figcaption>
      {ttNode}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Annual backlog waterfall. Per year block: opening stock (prior
// year-end), + new applications, − completed cases, closing stock.
// Readers' eye traces opening → up → down → closing.
//
// `data` shape: [{year, inflow, decided, pending}], sorted by year.
// ─────────────────────────────────────────────────────────────
function BacklogWaterfall({ data, width=1000, height=340 }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <figure className="chart-wrap" style={{margin:0,padding:'24px',background:'var(--bg-2)',borderLeft:'2px solid var(--accent)',color:'var(--muted)',fontFamily:'var(--serif)',fontSize:13}}>
        <b style={{color:'var(--ink-2)'}}>Backlog waterfall · pending data.</b>
        {' '}Needs annual inflow from ASYLUM_ANNUAL and outflow/residual from OUTCOME_COHORT_ANNUAL. Quarterly version deferred (see plan).
      </figure>
    );
  }
  const { show, hide, node: ttNode } = useTooltip();
  const pad = { t: 22, r: 24, b: 44, l: 64 };
  const iw = width - pad.l - pad.r, ih = height - pad.t - pad.b;
  const N = data.length;
  const yearBlockW = iw / N;
  const barGap = 8;
  const yearGap = 24;
  const innerYearW = Math.max(40, yearBlockW - yearGap);
  const barW = Math.max(6, (innerYearW - 3 * barGap) / 4);
  // yMax covers opening, peak (opening+inflow), and closing across all years.
  const peaks = [];
  data.forEach((d, i) => {
    const prev = i > 0 ? (data[i-1].pending || 0) : 0;
    peaks.push(prev, prev + (d.inflow || 0), d.pending || 0);
  });
  const yMax = Math.max(...peaks, 1) * 1.1;
  const yPx = v => pad.t + (1 - v / yMax) * ih;
  const yBase = yPx(0);
  const ticks = 5;
  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{display:'block',overflow:'visible'}}>
        {/* y gridlines + labels */}
        {Array.from({length: ticks + 1}, (_, k) => k / ticks).map(t => {
          const v = yMax * t;
          return (
            <g key={t}>
              <line x1={pad.l} x2={width-pad.r} y1={yPx(v)} y2={yPx(v)} stroke="var(--rule)"/>
              <text x={pad.l - 8} y={yPx(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK(v)}</text>
            </g>
          );
        })}
        <line x1={pad.l} x2={width-pad.r} y1={yBase} y2={yBase} stroke="var(--rule-2)"/>

        {data.map((d, i) => {
          const prev = i > 0 ? (data[i-1].pending || 0) : 0;
          const curr = d.pending || 0;
          const inflow = d.inflow || 0;
          const outflow = d.decided != null ? d.decided : Math.max(0, prev + inflow - curr);
          const blockX = pad.l + i * yearBlockW + (yearGap / 2);
          const bx0 = blockX;                         // opening
          const bx1 = bx0 + barW + barGap;            // inflow
          const bx2 = bx1 + barW + barGap;            // outflow
          const bx3 = bx2 + barW + barGap;            // closing
          const yOpen  = yPx(prev);
          const yPeak  = yPx(prev + inflow);
          const yClose = yPx(curr);
          const centerX = blockX + innerYearW / 2;
          return (
            <g key={d.year}
               onMouseMove={e=>show(e, <span><b>{d.year}</b> · opening <span className="tnum">{fmtN(prev)}</span> · new applications <span className="tnum">{fmtN(inflow)}</span> · completed <span className="tnum">{fmtN(outflow)}</span> · year-end <span className="tnum">{fmtN(curr)}</span></span>)}
               onMouseLeave={hide}
               style={{cursor:'crosshair'}}>
              {/* Opening stock (prior year-end carried in) */}
              {prev > 0 && (
                <rect x={bx0} y={yOpen} width={barW} height={yBase - yOpen} fill="var(--bg-3)"/>
              )}
              {/* Inflow — stacked above opening, up to peak */}
              {inflow > 0 && (
                <rect x={bx1} y={yPeak} width={barW} height={yOpen - yPeak} fill="var(--accent-warn)" fillOpacity={0.85}/>
              )}
              {/* Outflow — peak down to closing */}
              {outflow > 0 && (
                <rect x={bx2} y={yPeak} width={barW} height={yClose - yPeak} fill="var(--accent-2)" fillOpacity={0.85}/>
              )}
              {/* Closing stock (year-end, carried forward) */}
              {curr > 0 && (
                <rect x={bx3} y={yClose} width={barW} height={yBase - yClose} fill="var(--bg-3)"/>
              )}
              {/* Connectors — dashed, guide the eye across the flow */}
              <line x1={bx0+barW} x2={bx1} y1={yOpen}  y2={yOpen}  stroke="var(--muted-2)" strokeDasharray="2 3" strokeWidth={0.8}/>
              <line x1={bx1+barW} x2={bx2} y1={yPeak}  y2={yPeak}  stroke="var(--muted-2)" strokeDasharray="2 3" strokeWidth={0.8}/>
              <line x1={bx2+barW} x2={bx3} y1={yClose} y2={yClose} stroke="var(--muted-2)" strokeDasharray="2 3" strokeWidth={0.8}/>
              {/* Closing value label */}
              <text x={bx3 + barW/2} y={yClose - 5} textAnchor="middle" fontSize={10.5} fill="var(--ink-2)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK(curr)}</text>
              {/* Year label */}
              <text x={centerX} y={height - pad.b + 18} textAnchor="middle" fontSize={12} fontWeight={500} fill="var(--ink-2)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{d.year}</text>
            </g>
          );
        })}
      </svg>
      <figcaption style={{marginTop:10,fontSize:12,color:'var(--muted)',display:'flex',gap:18,flexWrap:'wrap'}}>
        <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
          <span style={{width:11,height:11,background:'var(--accent-warn)',display:'inline-block',borderRadius:2,opacity:0.85}}/> New cases awaiting initial decision</span>
        <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
          <span style={{width:11,height:11,background:'var(--accent-2)',display:'inline-block',borderRadius:2,opacity:0.85}}/> Cases decided, withdrawn, or closed</span>
        <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
          <span style={{width:11,height:11,background:'var(--bg-3)',display:'inline-block',borderRadius:2}}/> Year-end backlog</span>
      </figcaption>
      <div style={{marginTop:6,fontSize:11.5,color:'var(--muted-2)',fontStyle:'italic',lineHeight:1.5,maxWidth:760}}>
        Each year opens at the prior year's backlog, adds new applications, and subtracts completed cases (decisions, withdrawals, admin closures). The final bar is the year-end backlog carried into the next year.
      </div>
      {ttNode}
    </figure>
  );
}

// TopFiveStackedBars — extracted from flow-view.jsx IrrBoatsByNationality.
// Takes IRR_BOATS_BY_NATIONALITY rows and renders a stacked-by-year column
// chart of the top-5 nationalities plus Other, full years only.
function buildTopFiveStackedByYear(rows) {
  rows = Array.isArray(rows) ? rows : [];
  if (!rows.length) return { years: [], palette: [], matrix: [], latestPartialYear: null };
  const fullYears = [...new Set(rows.filter(r => !r.partial && !r.meta).map(r => r.year))].sort();
  const partialYears = [...new Set(rows.filter(r => r.partial && !r.meta).map(r => r.year))].sort();
  const latestPartialYear = partialYears.length ? partialYears[partialYears.length - 1] : null;
  if (!fullYears.length) return { years: [], palette: [], matrix: [], latestPartialYear };
  const totals = new Map();
  for (const r of rows) {
    if (r.meta) continue;
    if (!fullYears.includes(r.year)) continue;
    totals.set(r.nationality, (totals.get(r.nationality) || 0) + r.count);
  }
  const top5 = [...totals.entries()].sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0]);
  const palette = [...top5, 'Other'];
  const matrix = palette.map(name => fullYears.map(y => {
    if (name === 'Other') {
      let yearTotal = 0, topCount = 0;
      for (const r of rows) {
        if (r.year !== y) continue;
        if (r.meta === 'total') continue;
        if (r.meta === 'other' || r.meta === 'unrecorded') { yearTotal += r.count; continue; }
        yearTotal += r.count;
        if (top5.includes(r.nationality)) topCount += r.count;
      }
      return yearTotal - topCount;
    }
    const row = rows.find(r => r.year === y && r.nationality === name);
    return row ? row.count : 0;
  }));
  return { years: fullYears, palette, matrix, latestPartialYear };
}

function TopFiveStackedBars({ data, width = 1000, height = 240, asOf = null }) {
  const rows = Array.isArray(data) ? data : ((typeof window !== 'undefined' && window.IRR_BOATS_BY_NATIONALITY) || []);
  const { years, palette, matrix, latestPartialYear } = React.useMemo(() => buildTopFiveStackedByYear(rows), [rows]);
  if (!years.length) {
    return (
      <div style={{border:'1px dashed var(--rule)',background:'var(--bg-2)',padding:'40px 20px',textAlign:'center',color:'var(--muted)',fontStyle:'italic',fontSize:13}}>
        Small boats by nationality data unavailable.
      </div>
    );
  }
  const W = width, H = height;
  const M = { top: 16, right: 140, bottom: 28, left: 56 };
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const barW = innerW / years.length * 0.7;
  const totals = years.map((_, yi) => palette.reduce((s, _n, pi) => s + (matrix[pi][yi] || 0), 0));
  const yMax = Math.max(...totals, 1);
  const colors = ['#1c5c3d','#c44a2a','#2a5c8b','#8b6c1c','#6b2a8b','#888888'];
  const nf = (n) => n.toLocaleString('en-GB');
  return (
    <div>
      <svg width={W} height={H} role="img" aria-label="Small-boat arrivals by nationality, stacked by year">
        <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + innerH} stroke="var(--rule-2)"/>
        {[0, 0.5, 1].map((t, i) => {
          const v = Math.round(yMax * (1 - t));
          const y = M.top + innerH * t;
          return (
            <g key={i}>
              <line x1={M.left} y1={y} x2={M.left + innerW} y2={y} stroke="var(--rule-2)" strokeDasharray={t === 1 ? '0' : '2 3'}/>
              <text x={M.left - 6} y={y + 4} textAnchor="end" style={{fontFamily:'var(--mono)',fontSize:10,fill:'var(--muted)'}}>{nf(v)}</text>
            </g>
          );
        })}
        {years.map((y, yi) => {
          const x = M.left + (yi + 0.5) * (innerW / years.length) - barW / 2;
          let acc = 0;
          return (
            <g key={y}>
              {palette.map((name, pi) => {
                const v = matrix[pi][yi] || 0;
                if (v <= 0) return null;
                const h = (v / yMax) * innerH;
                const y0 = M.top + innerH - acc - h;
                acc += h;
                return (
                  <rect key={name} x={x} y={y0} width={barW} height={h} fill={colors[pi]} stroke="#fff" strokeWidth={0.5}>
                    <title>{`${y} · ${name}: ${nf(v)}`}</title>
                  </rect>
                );
              })}
              <text x={x + barW/2} y={M.top + innerH + 16} textAnchor="middle" style={{fontFamily:'var(--mono)',fontSize:10.5,fill:'var(--muted)'}}>{y}</text>
            </g>
          );
        })}
        {palette.map((name, pi) => (
          <g key={name} transform={`translate(${M.left + innerW + 16}, ${M.top + pi * 18})`}>
            <rect x={0} y={0} width={12} height={12} fill={colors[pi]}/>
            <text x={18} y={10} style={{fontFamily:'var(--serif)',fontSize:12,fill:'var(--ink-2)'}}>{name}</text>
          </g>
        ))}
      </svg>
      {latestPartialYear != null ? (
        <div style={{fontSize:11.5,color:'var(--muted-2)',marginTop:6,lineHeight:1.5}}>
          {latestPartialYear} excluded from the chart — it is a partial year in the latest release.
        </div>
      ) : null}
      {asOf ? (
        <div style={{fontSize:11.5,color:'var(--muted-2)',marginTop:2,lineHeight:1.5}}>{asOf}</div>
      ) : null}
    </div>
  );
}

// GroupedBarChart — clustered bars; one cluster per period, one bar per series.
// Used by Build view when the primary dataset is nationalities and the chart
// type is "bar": each year (or quarter) becomes a cluster of per-nationality
// bars so the reader can compare nationalities across time.
function GroupedBarChart({ periods, series, width = 820, height = 360, palette, rotateTicks = false, yLabel = '', showLegend = true }) {
  const pal = Array.isArray(palette) && palette.length ? palette : MULTI_COLORS;
  if (!Array.isArray(periods) || !periods.length || !Array.isArray(series) || !series.length) {
    return (
      <div style={{padding:'40px 20px',textAlign:'center',color:'var(--muted)',fontStyle:'italic',fontSize:13,border:'1px dashed var(--rule)',background:'var(--bg-2)'}}>
        No data to plot — try a different time range or fewer filters.
      </div>
    );
  }
  const M = { top: 16, right: showLegend ? 140 : 24, bottom: rotateTicks ? 64 : 38, left: 58 };
  const innerW = width - M.left - M.right;
  const innerH = height - M.top - M.bottom;
  const nS = series.length;
  const clusterW = innerW / periods.length * 0.82;
  const gap = innerW / periods.length * 0.18;
  const barW = Math.max(3, (clusterW - (nS - 1) * 2) / nS);
  let yMax = 0;
  for (const s of series) for (const v of (s.data || [])) if (v > yMax) yMax = v;
  yMax = yMax || 1;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const nf = (n) => (n == null ? '' : Number(n).toLocaleString('en-GB'));
  return (
    <figure style={{margin:0}}>
      <svg width={width} height={height} role="img" aria-label="Grouped bar chart">
        {yLabel ? <text x={14} y={M.top + innerH/2} textAnchor="middle" transform={`rotate(-90, 14, ${M.top + innerH/2})`} fontSize={13} fontWeight={500} fill="var(--ink-2)">{yLabel}</text> : null}
        {/* gridlines + y-axis ticks */}
        {ticks.map((t, i) => {
          const y = M.top + innerH * (1 - t);
          const v = Math.round(yMax * t);
          return (
            <g key={i}>
              <line x1={M.left} y1={y} x2={M.left + innerW} y2={y} stroke="var(--rule-2)" strokeDasharray={t === 0 ? '0' : '2 3'}/>
              <text x={M.left - 8} y={y + 4} textAnchor="end" fontSize={11} fontFamily="var(--mono)" fill="var(--muted)">{nf(v)}</text>
            </g>
          );
        })}
        {/* clusters */}
        {periods.map((p, pi) => {
          const cx = M.left + (pi + 0.5) * (innerW / periods.length);
          const xStart = cx - clusterW/2;
          return (
            <g key={p}>
              {series.map((s, si) => {
                const v = s.data?.[pi] || 0;
                if (v <= 0) return null;
                const h = (v / yMax) * innerH;
                const x = xStart + si * (barW + 2);
                const y = M.top + innerH - h;
                return (
                  <rect key={s.name} x={x} y={y} width={barW} height={h}
                        fill={s.color || pal[si % pal.length]} stroke="#fff" strokeWidth={0.5}>
                    <title>{`${p} · ${s.name}: ${nf(v)}`}</title>
                  </rect>
                );
              })}
              {rotateTicks ? (
                <text x={cx} y={M.top + innerH + 14} textAnchor="end" transform={`rotate(-30, ${cx}, ${M.top + innerH + 14})`} fontSize={11} fontFamily="var(--mono)" fill="var(--muted)">{p}</text>
              ) : (
                <text x={cx} y={M.top + innerH + 16} textAnchor="middle" fontSize={11} fontFamily="var(--mono)" fill="var(--muted)">{p}</text>
              )}
            </g>
          );
        })}
        {/* legend */}
        {showLegend && series.map((s, si) => (
          <g key={s.name} transform={`translate(${M.left + innerW + 16}, ${M.top + si * 18})`}>
            <rect x={0} y={0} width={12} height={12} fill={s.color || pal[si % pal.length]}/>
            <text x={18} y={10} fontFamily="var(--serif)" fontSize={12} fill="var(--ink-2)">{s.name}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

Object.assign(window, { LineChart, MultiLineChart, BarChart, StackedBar, StackedColumns, StackedColumnsMulti, RegionWorldMap, RegionTable, WorldMapChoropleth, Spark, Ring, RegionList, fmtK, fmtN, fmtShortDate, SourceStrip, useMapZoom, ZoomControls, ATLAS_PALETTE, atlasPaletteColor, SankeyChart, YoYCumulative, SeasonalHeatMap, GrantRateSmallMultiples, CohortRibbon, BacklogWaterfall, TopFiveStackedBars, GroupedBarChart, buildTopFiveStackedByYear });
