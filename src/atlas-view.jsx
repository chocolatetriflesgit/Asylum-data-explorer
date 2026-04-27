// atlas-view.jsx — interactive world map with per-country detail panel.
// Surfaces applicants + grant rate + returns + age disputes for the selected
// country. Data comes from NAT_FULL / NAT_QUARTERLY / RETURNS_BY_NATIONALITY /
// AGE_DISPUTES_BY_NATIONALITY, all inlined at bundle time.

const { useState: uSA, useMemo: uMA } = React;

// Some globals use slightly different nationality strings than Natural
// Earth's country names. Map the known divergences so clicks resolve.
const ATLAS_NAME_ALIASES = {
  'United States of America': 'United States',
  'Czech Rep.': 'Czechia',
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Dem. Rep. Congo': 'Congo (Democratic Republic)',
  'Congo': 'Congo',
  'Côte d\'Ivoire': "Cote d'Ivoire",
  'Central African Rep.': 'Central African Republic',
  'Dominican Rep.': 'Dominican Republic',
  'Eq. Guinea': 'Equatorial Guinea',
  'Myanmar': 'Myanmar (Burma)',
  'Palestine': 'Palestine',
  'Lao PDR': 'Laos',
  'Korea': 'South Korea',
  'Dem. Rep. Korea': 'North Korea',
  'S. Sudan': 'South Sudan',
  'W. Sahara': 'Western Sahara',
  'Bahamas': 'Bahamas, The',
  'Gambia': 'Gambia, The',
  'Solomon Is.': 'Solomon Islands',
  'Fr. S. Antarctic Lands': null,
  'Antarctica': null,
};

function resolveNat(mapCountryName) {
  if (mapCountryName in ATLAS_NAME_ALIASES) return ATLAS_NAME_ALIASES[mapCountryName];
  return mapCountryName;
}

// ATLAS_PALETTE, atlasLerpHex and atlasPaletteColor are defined in charts.jsx
// (loaded before this file in the bundle) so that both the dashboard's
// WorldMapChoropleth and this top-level atlas view share the same 6-stop scale.

function pathCentroid(d) {
  const re = /[ML]\s*([-\d.]+)[,\s]([-\d.]+)/g;
  const pts = []; let m;
  while ((m = re.exec(d))) pts.push([+m[1], +m[2]]);
  if (!pts.length) return null;
  return [pts.reduce((s,p)=>s+p[0],0)/pts.length, pts.reduce((s,p)=>s+p[1],0)/pts.length];
}

const ATLAS_METRIC_OPTIONS = [
  { id: 'applicants',   label: 'Applicants' },
  { id: 'grant_rate',   label: 'Grant rate' },
  { id: 'bivariate',    label: 'Applicants × grant rate' },
  { id: 'per_capita',   label: 'Per 100k displaced',
    needsData: () => (typeof UNHCR_POC_ANNUAL !== 'undefined' && UNHCR_POC_ANNUAL.length > 0) },
  { id: 'small_boats',  label: 'Small-boat arrivals',
    needsData: () => (typeof IRR_BOATS_BY_NATIONALITY !== 'undefined' && IRR_BOATS_BY_NATIONALITY.length > 0) },
  { id: 'returns',      label: 'Returns' },
  { id: 'age_disputes', label: 'Age disputes' },
];

// 3×3 bivariate palette: rows = applicants tercile (low→high),
// columns = grant-rate tercile (low→high). Cells combine accent-warn
// (low grants) → accent-gold (mid) → accent (high grants), with the
// mix percentage rising with applicant volume.
const BIVARIATE_PALETTE = [
  ['color-mix(in srgb, var(--accent-warn) 25%, var(--bg-2))',
   'color-mix(in srgb, var(--accent-gold) 25%, var(--bg-2))',
   'color-mix(in srgb, var(--accent) 25%, var(--bg-2))'],
  ['color-mix(in srgb, var(--accent-warn) 55%, var(--bg-2))',
   'color-mix(in srgb, var(--accent-gold) 55%, var(--bg-2))',
   'color-mix(in srgb, var(--accent) 55%, var(--bg-2))'],
  ['color-mix(in srgb, var(--accent-warn) 90%, var(--bg-2))',
   'color-mix(in srgb, var(--accent-gold) 90%, var(--bg-2))',
   'color-mix(in srgb, var(--accent) 90%, var(--bg-2))'],
];

// Terciles for a list of positive numbers. Returns [lowCut, midCut].
function terciles(values) {
  const arr = values.filter(v => v != null && v > 0).slice().sort((a,b)=>a-b);
  if (!arr.length) return [0, 0];
  const q = p => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
  return [q(1/3), q(2/3)];
}
function tercileBin(v, cuts) {
  if (v == null || !(v > 0)) return null;
  if (v <= cuts[0]) return 0;
  if (v <= cuts[1]) return 1;
  return 2;
}

function AtlasChoropleth({ countryValues, selectedNames = [], onSelect, metricLabel = 'applicants', bivariate=false, width=820, height=540, zoom }) {
  const worldMap = (typeof WORLD_MAP !== 'undefined') ? WORLD_MAP : null;
  if (!worldMap) {
    return <div style={{padding:40,color:'var(--muted)',fontStyle:'italic'}}>World map not loaded.</div>;
  }

  // Univariate branch: flat numeric values → sqrt-scaled ATLAS_PALETTE.
  // Bivariate branch: values are {v, grant} objects → 3×3 lookup.
  let fillFor;
  let titleFor;
  if (bivariate) {
    const vCuts = terciles(Object.values(countryValues).map(o => o?.v));
    const gCuts = terciles(Object.values(countryValues).map(o => o?.grant));
    fillFor = obj => {
      const vb = tercileBin(obj?.v, vCuts);
      const gb = tercileBin(obj?.grant, gCuts);
      if (vb == null || gb == null) return ATLAS_PALETTE[0];
      return BIVARIATE_PALETTE[vb][gb];
    };
    titleFor = (name, obj) => {
      if (!obj || !(obj.v > 0)) return name;
      const g = obj.grant != null ? `${Math.round(obj.grant * 100)}% grant rate` : 'no grant data';
      return `${name} — ${obj.v.toLocaleString()} applicants · ${g}`;
    };
  } else {
    const vMax = Math.max(...Object.values(countryValues), 1);
    fillFor = v => {
      if (!(v > 0)) return ATLAS_PALETTE[0];
      return atlasPaletteColor(Math.sqrt(v / vMax));
    };
    titleFor = (name, v) => `${name}${v > 0 ? ` — ${v.toLocaleString()} ${metricLabel}` : ''}`;
  }

  return (
    <div style={{position:'relative'}}>
      <svg width="100%" height={height} viewBox={zoom.viewBox} {...zoom.svgProps}
        style={{display:'block',background:'var(--map-bg, var(--bg-2))', ...zoom.svgProps.style}}>
        <g>
          {worldMap.map((c, i) => {
            const nat = resolveNat(c.name);
            const raw = nat ? countryValues[nat] : null;
            const v = bivariate ? raw : (raw ?? 0);
            const isSel = nat && selectedNames.includes(nat);
            return (
              <path key={`${c.iso || ''}-${c.name}-${i}`} d={c.d}
                fill={fillFor(v)}
                stroke={isSel ? '#e91e63' : 'var(--rule-2)'} strokeWidth={isSel ? 2.5 : 0.4}
                onClick={() => { if (!zoom.didDrag() && nat) onSelect(nat); }}
                style={{cursor: nat ? (zoom.zoomed ? 'grab' : 'pointer') : 'default'}}>
                <title>{titleFor(c.name, v)}</title>
              </path>
            );
          })}
        </g>
      </svg>
      <ZoomControls zoom={zoom}/>
    </div>
  );
}

function AtlasLegend({ countryValues, metricLabel = 'Applicants', bivariate=false }) {
  if (bivariate) {
    return (
      <div style={{marginTop:10,fontSize:11}}>
        <div className="uc" style={{fontSize:10.5,color:'var(--muted)',marginBottom:8}}>Applicants × grant rate</div>
        <div style={{display:'flex',gap:14,alignItems:'flex-end'}}>
          <div style={{display:'flex',flexDirection:'column-reverse',alignItems:'center',gap:2}}>
            {BIVARIATE_PALETTE.map((row, r) => (
              <div key={r} style={{display:'flex',gap:2}}>
                {row.map((c, i) => (
                  <div key={i} style={{width:22,height:22,background:c,border:'1px solid var(--rule-2)'}}/>
                ))}
              </div>
            ))}
            <div style={{marginTop:4,fontSize:10.5,color:'var(--muted-2)'}}>applicants →</div>
          </div>
          <div style={{fontSize:10.5,color:'var(--muted-2)',writingMode:'vertical-rl',transform:'rotate(180deg)',paddingBottom:4}}>↑ grant rate</div>
          <div style={{flex:1,fontSize:11,color:'var(--muted-2)',lineHeight:1.5,maxWidth:220}}>
            Countries split into low/mid/high terciles on each axis. Cells shade warmer where grants are rare and greener where grants are common; saturation rises with applicant volume.
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:10,fontSize:10.5,color:'var(--muted-2)'}}>
          <span style={{display:'inline-block',width:16,height:10,border:'2px solid #e91e63',background:'transparent'}}/>
          Selected
        </div>
      </div>
    );
  }
  const vMax = Math.max(...Object.values(countryValues), 1);
  const stops = ATLAS_PALETTE.length;
  // Breakpoint at each transition between adjacent colour stops (sqrt scale).
  const breakpoints = Array.from({length: stops - 1}, (_, i) =>
    Math.round(vMax * Math.pow((i + 1) / (stops - 1), 2))
  );
  const fmtTick = v => v >= 1000 ? `${Math.round(v/1000)}k` : v.toLocaleString();
  return (
    <div style={{marginTop:10,fontSize:11}}>
      <div className="uc" style={{fontSize:10.5,color:'var(--muted)',marginBottom:6}}>{metricLabel}</div>
      <div style={{position:'relative',maxWidth:360}}>
        <div style={{display:'flex',border:'1px solid var(--rule-2)'}}>
          {ATLAS_PALETTE.map((hex, i) => (
            <div key={hex} style={{flex:1,height:10,background:hex}}/>
          ))}
        </div>
        <div style={{position:'relative',height:14,marginTop:2}}>
          <span style={{position:'absolute',left:0,fontSize:10.5,color:'var(--muted-2)',fontVariantNumeric:'tabular-nums'}}>0</span>
          {breakpoints.map((v, i) => (
            <span key={i} style={{
              position:'absolute',
              left:`${((i + 1) / stops) * 100}%`,
              transform:'translateX(-50%)',
              fontSize:10.5,
              color:'var(--muted-2)',
              fontVariantNumeric:'tabular-nums',
            }}>{fmtTick(v)}</span>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:10,fontSize:10.5,color:'var(--muted-2)'}}>
          <span style={{display:'inline-block',width:16,height:10,border:'2px solid #e91e63',background:'transparent'}}/>
          Selected
        </div>
      </div>
    </div>
  );
}

function AtlasKPI({ label, value, sub }) {
  // Returns/age-dispute subs commonly render long compound strings like
  // "Enforced 4,512 · Voluntary 1,233" — split on " · " onto separate lines so
  // the 4-up KPI grid doesn't wrap awkwardly.
  const subLines = typeof sub === 'string' ? sub.split(' · ') : (sub ? [sub] : []);
  return (
    <div style={{border:'1px solid var(--rule)',padding:'16px 18px',background:'#fff',minHeight:118,display:'flex',flexDirection:'column'}}>
      <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:6}}>{label}</div>
      <div className="tnum" style={{fontFamily:'var(--serif)',fontSize:26,fontWeight:500,color:'var(--ink)',letterSpacing:-0.3,lineHeight:1.1}}>{value}</div>
      {subLines.length > 0 && (
        <div style={{fontSize:11.5,color:'var(--muted-2)',marginTop:6,lineHeight:1.45}}>
          {subLines.map((s, i) => (
            <div key={i}>{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function AtlasSelectedTable({ selectedNats, onRemove }) {
  const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
  const natMeta = typeof NAT_FULL_META !== 'undefined' ? NAT_FULL_META : null;
  const returns = typeof RETURNS_BY_NATIONALITY !== 'undefined' ? RETURNS_BY_NATIONALITY : [];
  const ageDisputes = typeof AGE_DISPUTES_BY_NATIONALITY !== 'undefined' ? AGE_DISPUTES_BY_NATIONALITY : [];
  const facts = selectedNats.map(name => ({
    name,
    apps: natFull.find(r => r.name === name) || null,
    ret: returns.find(r => r.name === name) || null,
    ad: ageDisputes.find(r => r.name === name) || null,
  }));
  const fmt = n => n != null ? n.toLocaleString() : '—';
  if (!selectedNats.length) {
    return (
      <div style={{background:'#fff',border:'1px dashed var(--rule-2)',padding:'24px 16px',textAlign:'center',color:'var(--muted)',fontStyle:'italic',fontSize:12.5,height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
        No countries selected. Pick one on the map or from the list on the left — selections appear here.
      </div>
    );
  }
  return (
    <div style={{background:'#fff',border:'1px solid var(--rule-2)',overflow:'hidden',display:'flex',flexDirection:'column'}}>
      <div className="uc" style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'8px 12px',borderBottom:'1px solid var(--rule-2)',fontSize:10.5,color:'var(--muted)',background:'var(--bg-2)'}}>
        <span>Selected · {selectedNats.length} {selectedNats.length === 1 ? 'country' : 'countries'}</span>
        <span style={{letterSpacing:0,textTransform:'none',fontStyle:'italic',fontSize:10.5,color:'var(--muted-2)'}}>{natMeta ? `latest complete year · ${natMeta.year}` : 'latest complete year'}</span>
      </div>
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:320}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5,fontFamily:'var(--serif)'}}>
          <thead>
            <tr style={{color:'var(--muted)',textAlign:'left'}}>
              <th style={{padding:'8px 10px',fontSize:10.5,textTransform:'uppercase',letterSpacing:0.05,fontWeight:500,borderBottom:'1px solid var(--rule-2)'}}>Country</th>
              <th style={{padding:'8px 10px',fontSize:10.5,textTransform:'uppercase',letterSpacing:0.05,fontWeight:500,textAlign:'right',borderBottom:'1px solid var(--rule-2)'}}>Applicants</th>
              <th style={{padding:'8px 10px',fontSize:10.5,textTransform:'uppercase',letterSpacing:0.05,fontWeight:500,textAlign:'right',borderBottom:'1px solid var(--rule-2)'}}>Grant</th>
              <th style={{padding:'8px 10px',fontSize:10.5,textTransform:'uppercase',letterSpacing:0.05,fontWeight:500,textAlign:'right',borderBottom:'1px solid var(--rule-2)'}}>Returns</th>
              <th style={{padding:'8px 10px',fontSize:10.5,textTransform:'uppercase',letterSpacing:0.05,fontWeight:500,textAlign:'right',borderBottom:'1px solid var(--rule-2)'}}>Age disputes</th>
              <th style={{padding:'8px 6px',borderBottom:'1px solid var(--rule-2)'}}></th>
            </tr>
          </thead>
          <tbody>
            {facts.map(f => (
              <tr key={f.name} style={{borderBottom:'1px dotted var(--rule-2)'}}>
                <td style={{padding:'8px 10px',color:'var(--ink)'}}>{f.name}</td>
                <td className="tnum" style={{padding:'8px 10px',textAlign:'right'}}>{fmt(f.apps?.v)}</td>
                <td className="tnum" style={{padding:'8px 10px',textAlign:'right'}}>{f.apps?.grant != null ? `${Math.round(f.apps.grant*100)}%` : '—'}</td>
                <td className="tnum" style={{padding:'8px 10px',textAlign:'right'}}>{fmt(f.ret?.total)}</td>
                <td className="tnum" style={{padding:'8px 10px',textAlign:'right'}}>{fmt(f.ad?.raised)}</td>
                <td style={{padding:'8px 6px',textAlign:'right'}}>
                  <button onClick={()=>onRemove(f.name)} title={`Remove ${f.name}`}
                    style={{color:'var(--muted)',fontSize:14,background:'transparent',border:'none',cursor:'pointer',padding:'0 4px'}}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Country-context strip
//
// External signal that helps a reader interpret why someone might be
// arriving from country X. Four cells: Freedom House status (with
// score), UCDP conflict events (events + deaths), UNHCR persons of
// concern from the origin, World Bank GDP per capita PPP. Each cell
// shows its own as-of year and source code; missing fields render as
// a discreet em-dash so the reader can see the gap.
// ─────────────────────────────────────────────────────────────
function AtlasCountryContextStrip({ selectedNats }) {
  const W = (typeof window !== 'undefined') ? window : {};
  const ctx = W.COUNTRY_CONTEXT || null;
  const ctxMeta = W.COUNTRY_CONTEXT_META || null;
  if (!ctx || !selectedNats || !selectedNats.length) return null;

  // Map the first selected name → ISO3 via WORLD_MAP.
  const worldMap = Array.isArray(W.WORLD_MAP) ? W.WORLD_MAP : [];
  const isoByName = {};
  for (const c of worldMap) if (c.iso && c.name) isoByName[c.name] = c.iso;
  const name = selectedNats[0];
  const iso = isoByName[name];
  const entry = iso ? ctx[iso] : null;
  if (!entry) {
    // Show a neutral placeholder when we can't resolve — keeps the layout
    // consistent and signals that we're aware of the gap.
    return (
      <div style={{background:'#fff',border:'1px solid var(--rule)',padding:'14px 18px',fontSize:12.5,color:'var(--muted)',fontStyle:'italic'}}>
        No external context available for {name}{!iso ? ' (no ISO3 match)' : ''}. Sources update annually; rerun the country-context build to refresh.
      </div>
    );
  }

  const fmtNum = (n) => n == null ? '—' : n.toLocaleString('en-GB');
  const fmtThousands = (n) => {
    if (n == null) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
    if (n >= 10_000) return `${Math.round(n / 1000)}k`;
    if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
    return n.toLocaleString('en-GB');
  };
  const statusColour = (s) => s === 'Free' ? 'var(--accent-2)' : s === 'Partly Free' ? 'var(--accent-warn)' : s === 'Not Free' ? 'var(--ink)' : 'var(--muted)';

  const Cell = ({ label, value, valueColour, source }) => (
    <div style={{background:'var(--bg)',padding:'12px 14px'}}>
      <div className="uc" style={{fontSize:10,color:'var(--muted)',marginBottom:6,letterSpacing:'.06em'}}>{label}</div>
      <div style={{fontFamily:'var(--serif)',fontSize:14.5,fontWeight:500,color: valueColour || 'var(--ink)',lineHeight:1.2}}>{value}</div>
      {source && <div style={{fontFamily:'var(--mono)',fontSize:9.5,color:'var(--muted-2)',marginTop:4,letterSpacing:'.04em'}}>{source}</div>}
    </div>
  );

  const fh = entry.freedomHouse;
  const ucdp = entry.ucdp;
  const unhcr = entry.unhcr;
  const gdp = entry.gdpPerCapitaPPP;

  return (
    <div style={{background:'#fff',border:'1px solid var(--rule)',padding:'18px 22px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:12,gap:14,flexWrap:'wrap'}}>
        <h4 style={{margin:0,fontFamily:'var(--serif)',fontSize:15,fontWeight:500,letterSpacing:-0.1}}>
          Context · {name}
        </h4>
        {ctxMeta && ctxMeta.sources && (
          <div className="uc" style={{color:'var(--muted)',fontSize:10}}>
            Annual signal from {ctxMeta.sources.length} source{ctxMeta.sources.length === 1 ? '' : 's'}
          </div>
        )}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:1,background:'var(--rule)',border:'1px solid var(--rule)'}}>
        <Cell
          label="Freedom House status"
          value={fh ? `${fh.status}${fh.score != null ? ` · ${fh.score}/100` : ''}` : '—'}
          valueColour={fh ? statusColour(fh.status) : 'var(--muted)'}
          source={fh ? `freedomhouse.org · ${fh.year}` : 'no data'}/>
        <Cell
          label="UCDP conflict events"
          value={ucdp
            ? `${fmtNum(ucdp.events)}${ucdp.deaths ? ` · ${fmtThousands(ucdp.deaths)} deaths` : ''}`
            : '— · token-gated'}
          source={ucdp ? `UCDP GED · ${ucdp.year}` : 'requires UCDP_API_TOKEN'}/>
        <Cell
          label="UNHCR persons of concern"
          value={unhcr ? fmtThousands(unhcr.total) : '—'}
          source={unhcr ? `UNHCR · ${unhcr.year}` : 'no data'}/>
        <Cell
          label="GDP per capita · PPP"
          value={gdp ? `$${fmtNum(Math.round(gdp.value))}` : '—'}
          source={gdp ? `World Bank · ${gdp.year}` : 'no data'}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Two-country compare card
//
// Renders only when ≥2 origins are selected. Picks the first two,
// labels them A (terracotta) and B (forest), and shows 4 metrics
// side-by-side: applications volume, initial grant rate, small-boat
// arrivals (latest non-partial year), and returns (latest year).
// ─────────────────────────────────────────────────────────────
function AtlasCompareCard({ selectedNats, onSwap }) {
  if (!selectedNats || selectedNats.length < 2) return null;
  const [a, b] = selectedNats;

  const W = (typeof window !== 'undefined') ? window : {};
  const natFull = Array.isArray(W.NAT_FULL) ? W.NAT_FULL : [];
  const irrBoats = Array.isArray(W.IRR_BOATS_BY_NATIONALITY) ? W.IRR_BOATS_BY_NATIONALITY : [];
  const returns = Array.isArray(W.RETURNS_BY_NATIONALITY) ? W.RETURNS_BY_NATIONALITY : [];

  const findApp = (n) => natFull.find(r => r.name === n);
  const apps = { a: findApp(a), b: findApp(b) };

  // Latest non-partial small-boats year, per country.
  const boatsByYear = (n) => {
    const rows = irrBoats.filter(r => r.nationality === n && !r.partial);
    if (!rows.length) return null;
    const latest = Math.max(...rows.map(r => r.year));
    const row = rows.find(r => r.year === latest);
    return row ? { year: latest, count: row.count } : null;
  };
  const boats = { a: boatsByYear(a), b: boatsByYear(b) };

  const findReturns = (n) => returns.find(r => r.name === n);
  const ret = { a: findReturns(a), b: findReturns(b) };

  const fmtNum = (n) => n == null ? '—' : n.toLocaleString('en-GB');
  const fmtPct = (g) => g == null ? '—' : `${Math.round(g * 100)}%`;

  const Cell = ({ label, valA, valB }) => (
    <div style={{padding:'14px 16px',background:'var(--bg-2)',border:'1px solid var(--rule)'}}>
      <div className="uc" style={{color:'var(--muted)',fontSize:10,letterSpacing:'.06em',marginBottom:10}}>{label}</div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'var(--ink-2)',marginBottom:6,fontVariantNumeric:'tabular-nums'}}>
        <span style={{color:'var(--muted)'}}>A · {a}</span>
        <b style={{fontWeight:500,color:'var(--accent-warn)'}}>{valA}</b>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:14,color:'var(--ink-2)',fontVariantNumeric:'tabular-nums'}}>
        <span style={{color:'var(--muted)'}}>B · {b}</span>
        <b style={{fontWeight:500,color:'var(--accent-2)'}}>{valB}</b>
      </div>
    </div>
  );

  return (
    <div style={{background:'#fff',border:'1px solid var(--rule)',padding:'22px 24px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:16,gap:16,flexWrap:'wrap'}}>
        <h4 style={{margin:0,fontFamily:'var(--serif)',fontSize:17,fontWeight:500,letterSpacing:-0.15}}>Compare two countries</h4>
        <div style={{display:'flex',gap:10,fontFamily:'var(--mono)',fontSize:11,color:'var(--muted)',alignItems:'center'}}>
          <span style={{padding:'4px 10px',border:'1px solid var(--rule-2)',background:'var(--bg-2)',color:'var(--ink-2)'}}>
            <b style={{color:'var(--accent-warn)',fontWeight:500,marginRight:4}}>A</b> {a}
          </span>
          <span style={{padding:'4px 10px',border:'1px solid var(--rule-2)',background:'var(--bg-2)',color:'var(--ink-2)'}}>
            <b style={{color:'var(--accent-2)',fontWeight:500,marginRight:4}}>B</b> {b}
          </span>
          {onSwap && selectedNats.length === 2 && (
            <button onClick={onSwap} title="Swap A and B"
              style={{background:'transparent',border:'1px solid var(--rule-2)',padding:'4px 10px',color:'var(--accent)',cursor:'pointer',fontFamily:'var(--mono)',fontSize:11,letterSpacing:'.04em'}}>
              swap ⇄
            </button>
          )}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:12}}>
        <Cell label="Applications · latest year"
          valA={fmtNum(apps.a?.v)} valB={fmtNum(apps.b?.v)}/>
        <Cell label="Initial grant rate"
          valA={fmtPct(apps.a?.grant)} valB={fmtPct(apps.b?.grant)}/>
        <Cell label={boats.a?.year || boats.b?.year ? `Small-boat arrivals · ${boats.a?.year || boats.b?.year}` : 'Small-boat arrivals'}
          valA={boats.a ? fmtNum(boats.a.count) : '—'} valB={boats.b ? fmtNum(boats.b.count) : '—'}/>
        <Cell label="Returns · latest year"
          valA={fmtNum(ret.a?.total)} valB={fmtNum(ret.b?.total)}/>
      </div>
      <div style={{marginTop:14,fontSize:11,color:'var(--muted-2)',fontStyle:'italic',lineHeight:1.45,maxWidth:'72ch'}}>
        Pick any two origins — A is the first selected, B is the second. The dashboard's <em>"time to decide"</em> figure is excluded here because the workflow-system change broke per-claim linkage; we'll bring it back when the data does.
      </div>
    </div>
  );
}

function AtlasDetail({ selectedNats, setRoute }) {
  const [showLabels, setShowLabels] = uSA(false);
  if (!selectedNats.length) {
    return null;
  }
  const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
  const natQ = typeof NAT_QUARTERLY !== 'undefined' ? NAT_QUARTERLY : null;
  const grantData = typeof NAT_GRANT_ANNUAL !== 'undefined' ? NAT_GRANT_ANNUAL : null;
  const boatsRows = typeof IRR_BOATS_BY_NATIONALITY !== 'undefined' ? IRR_BOATS_BY_NATIONALITY : [];

  const facts = selectedNats.map(name => ({
    name,
    apps: natFull.find(r => r.name === name) || null,
    qRow: natQ?.series?.find(s => s.name === name) || null,
    grantSeries: grantData?.series?.find(s => s.name === name) || null,
  }));

  const qFacts = facts.filter(f => f.qRow);
  const missingQ = facts.filter(f => !f.qRow);
  const grantFacts = facts.filter(f => f.grantSeries && grantData);
  const missingGrant = facts.filter(f => !f.grantSeries && grantData);

  const boatYears = boatsRows.length ? Array.from(new Set(boatsRows.filter(r => !r.partial).map(r => r.year))).sort((a,b)=>a-b) : [];
  const boatSeries = facts.map(f => {
    if (!boatYears.length) return null;
    const byYear = Object.fromEntries(
      boatsRows.filter(r => r.nationality === f.name && !r.partial).map(r => [r.year, r.count])
    );
    const data = boatYears.map(y => byYear[y] ?? null);
    if (data.every(v => v == null || v === 0)) return null;
    return { name: f.name, data };
  }).filter(Boolean);

  return (
    <div style={{border:'1px solid var(--rule)',background:'var(--bg-2)',padding:'20px 22px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:16,paddingBottom:12,borderBottom:'1px solid var(--rule-2)',flexWrap:'wrap',rowGap:4,columnGap:16}}>
        <h2 style={{fontFamily:'var(--serif)',fontSize:24,fontWeight:500,margin:0,letterSpacing:-0.3,color:'var(--ink)'}}>
          {selectedNats.length === 1 ? selectedNats[0] : `${selectedNats.length} countries overlaid`}
        </h2>
        <div className="uc" style={{color:'var(--muted)',fontSize:10.5}}>Trends</div>
      </div>

      {qFacts.length > 0 ? (
        <div style={{background:'#fff',padding:'14px 16px',border:'1px solid var(--rule-2)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div className="uc" style={{color:'var(--muted)',fontSize:10.5}}>Applicants · last 8 quarters</div>
            <button className="ulh" onClick={()=>setShowLabels(v=>!v)} style={{fontSize:10.5,color:'var(--muted)',letterSpacing:0,textTransform:'none'}}>
              {showLabels ? '◉' : '○'} Labels
            </button>
          </div>
          <MultiLineChart
            years={natQ.quarters}
            series={qFacts.map(f => ({ name: f.name, data: f.qRow.data }))}
            width={720} height={qFacts.length > 2 ? 340 : 280}
            showLabels={showLabels}
            legend={qFacts.length > 1}
            yLabel="applicants"
          />
          {missingQ.length > 0 && (
            <div style={{marginTop:8,fontSize:11,color:'var(--muted-2)',fontStyle:'italic',lineHeight:1.45}}>
              No quarterly trend for: {missingQ.map(f => f.name).join(', ')}. Only the top-20 nationalities by applicant volume have a full quarterly series published.
            </div>
          )}
        </div>
      ) : (
        <div style={{padding:'18px 20px',color:'var(--ink-2)',fontSize:13,lineHeight:1.55,background:'#fff',border:'1px dotted var(--rule-2)'}}>
          <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:8,fontStyle:'normal'}}>No quarterly trend</div>
          None of the selected countries appear in the top-20 quarterly series. The Home Office publishes a full quarterly time series only for the 20 nationalities with the largest applicant volumes. For other countries, only the most recent annual and quarterly totals are released.
          {' '}
          <a href="https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables"
             target="_blank" rel="noopener"
             style={{color:'var(--accent)',textDecoration:'underline'}}>
            Immigration system statistics methodology
          </a>.
        </div>
      )}

      {grantData && grantFacts.length > 0 ? (
        <div style={{background:'#fff',padding:'14px 16px',border:'1px solid var(--rule-2)',marginTop:10}}>
          <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:8}}>
            Grant rate · {grantData.years[0]}–{grantData.years[grantData.years.length - 1]} · % of initial decisions granted
          </div>
          <MultiLineChart
            years={grantData.years}
            series={grantFacts.map(f => ({
              name: f.name,
              data: f.grantSeries.data.map(v => v != null ? Math.round(v * 100) : null),
            }))}
            width={720} height={grantFacts.length > 2 ? 320 : 260}
            showLabels={showLabels}
            legend={grantFacts.length > 1}
            yLabel="% granted"
          />
          {missingGrant.length > 0 && (
            <div style={{marginTop:8,fontSize:11,color:'var(--muted-2)',fontStyle:'italic',lineHeight:1.45}}>
              No grant-rate trend for: {missingGrant.map(f => f.name).join(', ')} (fewer than 200 total decisions, or fewer than 5 years with data).
            </div>
          )}
        </div>
      ) : grantData ? (
        <div style={{padding:'14px 16px',color:'var(--muted-2)',fontStyle:'italic',fontSize:13,background:'#fff',border:'1px dotted var(--rule-2)',marginTop:10}}>
          No grant-rate trend for the selected countries (fewer than 200 total decisions, or fewer than 5 years with data).
        </div>
      ) : null}

      {boatSeries.length > 0 && (
        <div style={{background:'#fff',padding:'14px 16px',border:'1px solid var(--rule-2)',marginTop:10}}>
          <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:8}}>
            Small-boat arrivals · {boatYears[0]}–{boatYears[boatYears.length - 1]} · annual (full years only)
          </div>
          <MultiLineChart
            years={boatYears}
            series={boatSeries}
            width={720} height={boatSeries.length > 2 ? 320 : 260}
            showLabels={showLabels}
            legend={boatSeries.length > 1}
            yLabel="arrivals"
          />
        </div>
      )}

      <div style={{marginTop:14,display:'flex',gap:14,fontSize:12}}>
        <button className="ulh" style={{color:'var(--accent)'}}
          onClick={()=>setRoute({name:'build', preselectNat: selectedNats[0]})}>
          Compare in Build a chart →
        </button>
      </div>
    </div>
  );
}

// Find the nationality with the largest quarter-on-quarter absolute delta
// in the latest quarter of NAT_QUARTERLY. Used as a default Atlas focus so
// first-time visitors land on the story most likely to be worth telling.
function topQoQMover() {
  const nq = typeof NAT_QUARTERLY !== 'undefined' ? NAT_QUARTERLY : null;
  if (!nq || !nq.series || !nq.series.length) return null;
  let best = null;
  let bestDelta = -Infinity;
  for (const s of nq.series) {
    const d = s.data;
    if (!d || d.length < 2) continue;
    const last = d[d.length - 1];
    const prev = d[d.length - 2];
    if (last == null || prev == null) continue;
    const delta = Math.abs(last - prev);
    if (delta > bestDelta) { bestDelta = delta; best = s.name; }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────
// Ranked list of origin countries — sits beside the choropleth.
//
// Choropleths are bad at ordering and bad at comparing physically
// unequal regions; a sorted list answers "which countries are biggest /
// rising fastest?" in a way the map can't. Sparklines come from
// NAT_QUARTERLY where available; trend arrows are derived from the
// first vs last halves of the same series.
// ─────────────────────────────────────────────────────────────
function AtlasRankedList({ countryValues, metricLabel, selectedNames, onSelect, limit = 25 }) {
  const W = (typeof window !== 'undefined') ? window : {};
  const nq = W.NAT_QUARTERLY;

  const seriesByName = uMA(() => {
    if (!nq || !Array.isArray(nq.series)) return {};
    const out = {};
    for (const s of nq.series) out[s.name] = s.data;
    return out;
  }, [nq]);

  const sorted = uMA(() => {
    return Object.entries(countryValues || {})
      .filter(([_, v]) => typeof v === 'number' && v > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, limit);
  }, [countryValues, limit]);

  const fmt = (v) => v >= 10000 ? `${(v/1000).toFixed(1)}k` : v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`;

  const arrowFor = (data) => {
    if (!Array.isArray(data) || data.length < 4) return null;
    const win = Math.max(2, Math.floor(data.length / 2));
    const early = data.slice(0, win).reduce((a, b) => a + (b || 0), 0) / win;
    const late = data.slice(-win).reduce((a, b) => a + (b || 0), 0) / win;
    if (!early) return null;
    const pct = (late - early) / early;
    if (pct > 0.5) return { label: '▲▲▲', up: true };
    if (pct > 0.2) return { label: '▲▲', up: true };
    if (pct > 0.05) return { label: '▲', up: true };
    if (pct < -0.5) return { label: '▼▼▼', up: false };
    if (pct < -0.2) return { label: '▼▼', up: false };
    if (pct < -0.05) return { label: '▼', up: false };
    return { label: '·', up: null };
  };

  const buildSparkPath = (data, w = 80, h = 18) => {
    if (!data || data.length < 2) return null;
    const vals = data.map(v => (v == null ? 0 : v));
    const max = Math.max(...vals) || 1;
    const min = Math.min(...vals);
    const range = max - min || 1;
    return vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="atlas-ranked" style={{background:'var(--bg)',border:'1px solid var(--rule)',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'14px 18px',borderBottom:'1px solid var(--rule)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
        <h4 style={{margin:0,fontSize:14,fontWeight:500,letterSpacing:-0.1,fontFamily:'var(--serif)'}}>Top origins</h4>
        <span className="uc" style={{color:'var(--muted)',fontSize:10}}>By {metricLabel.toLowerCase()}</span>
      </div>
      <div style={{flex:1,overflowY:'auto',maxHeight:540}}>
        {sorted.length === 0 ? (
          <div style={{padding:'18px',fontSize:12.5,color:'var(--muted)',fontStyle:'italic'}}>No countries to rank for this metric.</div>
        ) : sorted.map(([name, v], i) => {
          const data = seriesByName[name];
          const arrow = arrowFor(data);
          const path = buildSparkPath(data);
          const on = selectedNames.includes(name);
          return (
            <div key={name}
              onClick={() => onSelect && onSelect(name)}
              style={{
                display:'grid',
                gridTemplateColumns:'26px 1fr 56px 80px 30px',
                gap:10, padding:'8px 18px',
                borderBottom:'1px solid var(--rule)',
                alignItems:'center', fontSize:13.5,
                cursor: onSelect ? 'pointer' : 'default',
                background: on ? 'var(--bg-3)' : 'transparent',
                transition:'background .12s'
              }}
              onMouseEnter={e=>{if(!on) e.currentTarget.style.background='var(--bg-2)'}}
              onMouseLeave={e=>{if(!on) e.currentTarget.style.background='transparent'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--muted)'}}>{String(i+1).padStart(2,'0')}</div>
              <div style={{color:'var(--ink-2)',textWrap:'pretty',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:11.5,textAlign:'right',color:'var(--ink-2)'}} className="tnum">{fmt(v)}</div>
              <div style={{height:18}}>
                {path ? (
                  <svg width={80} height={18} style={{display:'block'}}>
                    <path d={path} fill="none"
                      stroke={arrow?.up ? 'var(--accent-warn)' : (arrow?.up === false ? 'var(--muted-2)' : 'var(--accent)')}
                      strokeWidth="1.4"/>
                  </svg>
                ) : (
                  <span style={{fontSize:10,color:'var(--muted-2)'}}>—</span>
                )}
              </div>
              <div style={{
                fontFamily:'var(--mono)', fontSize:10, textAlign:'right', letterSpacing:'.02em',
                color: arrow?.up ? 'var(--accent-warn)' : (arrow?.up === false ? 'var(--muted-2)' : 'var(--muted)')
              }}>{arrow?.label || ''}</div>
            </div>
          );
        })}
      </div>
      <div style={{padding:'10px 18px',fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)',borderTop:'1px solid var(--rule)',letterSpacing:'.04em'}}>
        Top {sorted.length} of {Object.keys(countryValues || {}).length} · trend arrows from quarterly series where available
      </div>
    </div>
  );
}

function AtlasView({ setRoute }) {
  const defaultSelection = uMA(() => {
    const top = topQoQMover();
    return top ? [top] : [];
  }, []);
  const [selectedNats, setSelectedNats] = uSA(defaultSelection);
  const [metric, setMetric] = uSA('applicants');
  const [natQuery, setNatQuery] = uSA('');
  const zoom = useMapZoom(720, 335);

  const toggleNat = nat => {
    setSelectedNats(prev => {
      if (prev.includes(nat)) return prev.filter(n => n !== nat);
      return [...prev, nat];
    });
  };

  const handleSelect = nat => {
    toggleNat(nat);
  };

  const countryValues = uMA(() => {
    const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
    if (metric === 'applicants') return Object.fromEntries(natFull.map(r => [r.name, r.v]));
    if (metric === 'grant_rate') return Object.fromEntries(natFull.filter(r => r.grant != null).map(r => [r.name, Math.round(r.grant * 100)]));
    if (metric === 'bivariate') return Object.fromEntries(natFull.map(r => [r.name, { v: r.v, grant: r.grant }]));
    if (metric === 'returns') {
      const ret = typeof RETURNS_BY_NATIONALITY !== 'undefined' ? RETURNS_BY_NATIONALITY : [];
      return Object.fromEntries(ret.map(r => [r.name, r.total]));
    }
    if (metric === 'age_disputes') {
      const ad = typeof AGE_DISPUTES_BY_NATIONALITY !== 'undefined' ? AGE_DISPUTES_BY_NATIONALITY : [];
      return Object.fromEntries(ad.map(r => [r.name, r.raised]));
    }
    if (metric === 'small_boats') {
      const rows = typeof IRR_BOATS_BY_NATIONALITY !== 'undefined' ? IRR_BOATS_BY_NATIONALITY : [];
      if (!rows.length) return {};
      const latestYear = Math.max(...rows.map(r => r.year));
      const out = {};
      for (const r of rows) {
        if (r.year !== latestYear) continue;
        if (!(r.count > 0)) continue;
        out[r.nationality] = (out[r.nationality] || 0) + r.count;
      }
      return out;
    }
    if (metric === 'per_capita') {
      // Join NAT_FULL (name) → WORLD_MAP (iso) → UNHCR_POC_ANNUAL (latest
      // year × iso → total displaced). Rate is applicants per 100k of the
      // origin's displaced-persons stock. Countries without POC data fall
      // out of the map cleanly.
      const poc = typeof UNHCR_POC_ANNUAL !== 'undefined' ? UNHCR_POC_ANNUAL : [];
      const world = typeof WORLD_MAP !== 'undefined' ? WORLD_MAP : [];
      if (!poc.length || !world.length) return {};
      const latestYear = Math.max(...poc.map(r => r.year));
      const totalByIso = {};
      for (const r of poc) {
        if (r.year !== latestYear) continue;
        totalByIso[r.originIso] = r.total || 0;
      }
      const isoByName = {};
      for (const c of world) isoByName[c.name] = c.iso;
      const out = {};
      for (const r of natFull) {
        const iso = isoByName[r.name];
        const denom = iso ? totalByIso[iso] : 0;
        if (!denom || !(r.v > 0)) continue;
        out[r.name] = Math.round((r.v / denom) * 100000);
      }
      return out;
    }
    return {};
  }, [metric]);

  const metricLabel = ATLAS_METRIC_OPTIONS.find(m => m.id === metric)?.label ?? 'Applicants';
  const bivariate = metric === 'bivariate';

  const topCountries = uMA(() => {
    const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
    return natFull.slice(0, 10);
  }, []);

  return (
    <main className="fade-enter page-section" style={{maxWidth:1240,margin:'0 auto',padding:'40px 48px 80px'}}>
      <div style={{marginBottom:24}}>
        <div className="uc" style={{color:'var(--muted)',marginBottom:8,display:'inline-block',paddingBottom:4,borderBottom:'2px solid var(--accent-warn)'}}>Atlas</div>
        <h1 style={{fontFamily:'var(--serif)',fontSize:42,letterSpacing:-0.4,fontWeight:400,margin:'0 0 10px'}}>The world, by country.</h1>
        <p style={{fontSize:16,color:'var(--ink-2)',maxWidth:680,margin:0,lineHeight:1.5}}>
          Choropleth of asylum applicants by country of origin. Click any country to see applicants, grant rate, returns, and age disputes in one panel.
        </p>
      </div>
      {/* Page-level takeaway — auto-derived from current metric. */}
      {(() => {
        const natFull = (typeof NAT_FULL !== 'undefined') ? NAT_FULL : [];
        if (!natFull.length) return null;
        const sorted = [...natFull].sort((a,b) => (b.v || 0) - (a.v || 0));
        const top = sorted[0], second = sorted[1];
        if (!top || !second) return null;
        const grantTop = top.grant != null ? Math.round(top.grant * 100) : null;
        const grantSecond = second.grant != null ? Math.round(second.grant * 100) : null;
        return (
          <div style={{
            background:'var(--bg-2)',
            borderLeft:'3px solid var(--accent-warn)',
            padding:'12px 18px',
            marginBottom:16,
            fontSize:14.5,
            lineHeight:1.5,
            color:'var(--ink-2)',
            textWrap:'pretty',
            fontStyle:'italic',
            maxWidth:'90ch'
          }}>
            <b style={{fontStyle:'normal',fontWeight:500,color:'var(--ink)'}}>Volume and outcome point in different directions.</b>{' '}
            {top.name} leads on applications{second ? ` ahead of ${second.name}` : ''}
            {grantTop != null && grantSecond != null
              ? <> — but <Gloss term="grant rate">grant rates</Gloss> diverge sharply ({top.name} {grantTop}% vs {second.name} {grantSecond}%), so the volume top and the outcome top are different lists.</>
              : '.'}
          </div>
        );
      })()}
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {ATLAS_METRIC_OPTIONS.map(m => {
          const available = m.needsData ? m.needsData() : true;
          return (
            <button key={m.id}
              onClick={() => available && setMetric(m.id)}
              disabled={!available}
              title={available ? undefined : 'Pending UNHCR ingest — run scripts/fetch_unhcr.py then scripts/build_unhcr.py'}
              style={{
                padding:'4px 16px', fontSize:12, border:'1px solid var(--rule-2)',
                background: metric === m.id ? 'var(--accent)' : 'var(--bg-2)',
                color: metric === m.id ? '#fff' : (available ? 'var(--ink-2)' : 'var(--muted-2)'),
                fontFamily:'var(--serif)', cursor: available ? 'pointer' : 'not-allowed',
                opacity: available ? 1 : 0.55,
              }}>
              {m.label}
            </button>
          );
        })}
      </div>
      <div className="atlas-layout" style={{display:'flex',flexDirection:'column',gap:28}}>
        <div className="atlas-top" style={{display:'grid',gridTemplateColumns:'minmax(0, 1.55fr) minmax(280px, 1fr)',gap:24,alignItems:'start'}}>
        <div style={{border:'1px solid var(--rule)',background:'#fff',padding:'12px'}}>
          <AtlasChoropleth countryValues={countryValues} selectedNames={selectedNats} onSelect={handleSelect} metricLabel={metricLabel.toLowerCase()} bivariate={bivariate} zoom={zoom}/>
          <AtlasLegend countryValues={countryValues} metricLabel={metricLabel} bivariate={bivariate}/>
          <div style={{marginTop:12,paddingTop:10,borderTop:'1px dotted var(--rule-2)'}}>
            {(() => {
              const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
              const allNames = natFull.map(r => r.name).sort((a, b) => a.localeCompare(b));
              const q = natQuery.trim().toLowerCase();
              const filtered = q ? allNames.filter(n => n.toLowerCase().includes(q)) : allNames;
              return (
                <div className="atlas-picker-row" style={{display:'grid',gridTemplateColumns:'minmax(280px, 1fr) 1.6fr',gap:18,alignItems:'start'}}>
                  <div>
                    <div className="uc" style={{color:'var(--muted)',fontSize:10.5,display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
                      <span>Countries</span>
                      <span style={{display:'flex',gap:10,alignItems:'baseline'}}>
                        {selectedNats.length > 0 && (
                          <button onClick={()=>setSelectedNats([])}
                            style={{fontSize:11,color:'var(--accent)',background:'transparent',border:'1px solid var(--accent)',padding:'4px 10px',textTransform:'none',letterSpacing:0,fontFamily:'var(--serif)',cursor:'pointer'}}>
                            Clear all
                          </button>
                        )}
                        <span style={{color:'var(--muted-2)'}} className="tnum">{selectedNats.length} picked</span>
                      </span>
                    </div>
                    {selectedNats.length > 0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:10}}>
                        {selectedNats.map(n => (
                          <button key={n} onClick={()=>toggleNat(n)}
                            style={{fontSize:11,padding:'5px 10px 5px 12px',background:'var(--bg-2)',border:'1px solid var(--rule-2)',color:'var(--ink-2)',fontFamily:'var(--serif)',cursor:'pointer'}}>
                            {n} <span style={{color:'var(--muted)',marginLeft:4}}>×</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <input type="search" value={natQuery} onChange={e=>setNatQuery(e.target.value)}
                      placeholder={`Search ${allNames.length} countries…`}
                      style={{width:'100%',fontSize:12.5,padding:'6px 8px',fontFamily:'var(--serif)',border:'1px solid var(--rule-2)',background:'#fff',marginBottom:8,boxSizing:'border-box'}}/>
                    <div style={{maxHeight:180,overflowY:'auto',marginRight:-6,paddingRight:6,borderTop:'1px dotted var(--rule-2)'}}>
                      {filtered.length === 0 ? (
                        <div style={{fontSize:12,color:'var(--muted-2)',padding:'8px 0',fontStyle:'italic'}}>No matches.</div>
                      ) : filtered.map(n => (
                        <label key={n} className="chk" style={{display:'flex',alignItems:'center',padding:'4px 0',fontSize:12.5,gap:6,cursor:'pointer'}}>
                          <input type="checkbox" checked={selectedNats.includes(n)} onChange={()=>toggleNat(n)} style={{appearance:'auto',width:13,height:13}}/>
                          <span style={{flex:1}}>{n}</span>
                        </label>
                      ))}
                    </div>
                    <details style={{marginTop:10}}>
                      <summary style={{cursor:'pointer',fontSize:11,color:'var(--muted)',fontStyle:'italic'}}>Common choices ▾</summary>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
                        {topCountries.map(c => (
                          <button key={c.name} onClick={()=>toggleNat(c.name)}
                            style={{fontSize:11.5,padding:'4px 10px',background: selectedNats.includes(c.name) ? 'var(--accent)' : 'var(--bg-2)',
                                    color: selectedNats.includes(c.name) ? '#fff' : 'var(--ink-2)',
                                    border:'1px solid var(--rule-2)',fontFamily:'var(--serif)',cursor:'pointer'}}>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </details>
                    <div style={{marginTop:8,fontSize:10.5,color:'var(--muted-2)',fontStyle:'italic'}}>
                      Click a country on the map to toggle it on or off, or tick multiple from the list. Every selected country is overlaid on each chart below.
                    </div>
                  </div>
                  <AtlasSelectedTable selectedNats={selectedNats} onRemove={toggleNat}/>
                </div>
              );
            })()}
          </div>
        </div>
        <AtlasRankedList countryValues={countryValues} metricLabel={metricLabel} selectedNames={selectedNats} onSelect={handleSelect}/>
        </div>
        <AtlasCountryContextStrip selectedNats={selectedNats}/>
        {selectedNats.length >= 2 && (
          <AtlasCompareCard selectedNats={selectedNats} onSwap={() => setSelectedNats(prev => prev.length >= 2 ? [prev[1], prev[0], ...prev.slice(2)] : prev)}/>
        )}
        <AtlasDetail selectedNats={selectedNats} setRoute={setRoute}/>
        <UKAtlasSection/>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// UK Atlas — choropleth of LADs + ranked list + LA detail panel +
// "Where you live" postcode lookup (via the free postcodes.io API).
//
// Reads three globals:
//   UK_LAD_MAP            — pre-projected SVG paths per LAD (build_uk_map.py)
//   SUPPORT_LA_LATEST     — latest snapshot of supported asylum seekers per LAD
//   SUPPORT_LA_QUARTERLY  — last ~5 years of quarterly snapshots (compact)
// ─────────────────────────────────────────────────────────────

const UK_PALETTE = ['#f5ecd8', '#e5d3a4', '#d4b86a', '#b85c38', '#7a3d1f', '#1c3d2e'];

function ukColourFor(value, max) {
  if (value == null || value <= 0 || max <= 0) return 'var(--bg-2)';
  const t = Math.sqrt(value / max);
  const idx = Math.min(UK_PALETTE.length - 1, Math.floor(t * UK_PALETTE.length));
  return UK_PALETTE[idx];
}

function UKChoropleth({ map, valueByCode, selectedCode, onSelect }) {
  const meta = (typeof window !== 'undefined') ? window.UK_MAP_META : null;
  const W = meta?.viewBox?.w || 600, H = meta?.viewBox?.h || 1100;
  const max = Math.max(...Object.values(valueByCode).filter(v => v > 0), 1);
  const [hovered, setHovered] = uSA(null);
  return (
    <div style={{background:'#fff',border:'1px solid var(--rule)',padding:14,position:'relative'}}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
        style={{display:'block',width:'100%',height:'auto',maxHeight:600}}
        onMouseLeave={() => setHovered(null)}>
        {map.map(c => {
          const v = valueByCode[c.code];
          const isSelected = c.code === selectedCode;
          return (
            <path key={c.code} d={c.d}
              fill={ukColourFor(v, max)}
              stroke={isSelected ? 'var(--accent-warn)' : 'rgba(0,0,0,0.18)'}
              strokeWidth={isSelected ? 1.6 : 0.4}
              style={{cursor:'pointer',transition:'stroke-width .12s'}}
              onClick={() => onSelect(c.code)}
              onMouseEnter={() => setHovered({code: c.code, name: c.name, v})}>
              <title>{c.name}{v != null ? ` · ${v.toLocaleString('en-GB')} supported` : ''}</title>
            </path>
          );
        })}
      </svg>
      {hovered && (
        <div style={{position:'absolute',left:14,bottom:14,background:'rgba(251,250,247,.92)',padding:'6px 10px',border:'1px solid var(--rule-2)',fontFamily:'var(--mono)',fontSize:10.5,color:'var(--muted)',pointerEvents:'none'}}>
          <span style={{color:'var(--ink-2)',fontFamily:'var(--serif)',fontSize:12}}>{hovered.name}</span>
          {hovered.v != null && <span> · <b style={{color:'var(--accent-warn)',fontWeight:500}}>{hovered.v.toLocaleString('en-GB')}</b> supported</span>}
        </div>
      )}
      <div style={{display:'flex',gap:10,alignItems:'center',marginTop:10,fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)',letterSpacing:'.04em'}}>
        <span>FEW</span>
        {UK_PALETTE.map((c,i) => <span key={i} style={{display:'inline-block',width:14,height:10,background:c}}/>)}
        <span>MANY</span>
        <span style={{marginLeft:'auto',color:'var(--muted-2)'}}>UK_LAD_MAP · {map.length} LADs</span>
      </div>
    </div>
  );
}

function UKRankedList({ rows, selectedCode, onSelect, limit = 25 }) {
  const fmtN = v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`;
  const top = rows.slice(0, limit);
  return (
    <div style={{background:'var(--bg)',border:'1px solid var(--rule)',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'14px 18px',borderBottom:'1px solid var(--rule)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
        <h4 style={{margin:0,fontSize:14,fontWeight:500,letterSpacing:-0.1,fontFamily:'var(--serif)'}}>Top local authorities</h4>
        <span className="uc" style={{color:'var(--muted)',fontSize:10}}>By people supported</span>
      </div>
      <div style={{flex:1,overflowY:'auto',maxHeight:560}}>
        {top.map((r, i) => {
          const on = r.code === selectedCode;
          return (
            <div key={r.code}
              onClick={() => onSelect(r.code)}
              style={{
                display:'grid', gridTemplateColumns:'26px 1fr 56px',
                gap:10, padding:'8px 18px', borderBottom:'1px solid var(--rule)',
                alignItems:'center', fontSize:13.5,
                cursor:'pointer',
                background: on ? 'var(--bg-3)' : 'transparent',
                transition:'background .12s'
              }}
              onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'var(--bg-2)'; }}
              onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
              <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--muted)'}}>{String(i+1).padStart(2,'0')}</div>
              <div style={{color:'var(--ink-2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {r.name} <span style={{color:'var(--muted-2)',fontSize:11}}>· {r.country}</span>
              </div>
              <div style={{fontFamily:'var(--mono)',fontSize:11.5,textAlign:'right'}} className="tnum">{fmtN(r.total)}</div>
            </div>
          );
        })}
      </div>
      <div style={{padding:'10px 18px',fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)',borderTop:'1px solid var(--rule)',letterSpacing:'.04em'}}>
        Top {top.length} of {rows.length} · click to focus on the map
      </div>
    </div>
  );
}

function UKLAPanel({ row, quarterly, mapRow }) {
  if (!row) return null;
  const series = (quarterly || [])
    .filter(q => q.code === row.code)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const values = series.map(q => q.v);
  const dates = series.map(q => q.date);
  const first = values[0], last = values[values.length - 1];
  const change = (first != null && first > 0 && last != null) ? ((last - first) / first) * 100 : null;

  // Sparkline
  const sparkW = 600, sparkH = 70, pad = 4;
  const max = Math.max(...values, 1), min = Math.min(...values, 0);
  const xAt = i => pad + (i / Math.max(values.length - 1, 1)) * (sparkW - 2 * pad);
  const yAt = v => sparkH - pad - ((v - min) / (max - min || 1)) * (sparkH - 2 * pad);
  const sparkPath = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(v)}`).join(' ');

  const Tier = ({ label, value, share }) => (
    <div style={{padding:'10px 14px',background:'var(--bg-2)',border:'1px solid var(--rule)'}}>
      <div className="uc" style={{color:'var(--muted)',fontSize:10,marginBottom:6}}>{label}</div>
      <div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:500,color:'var(--ink)'}} className="tnum">{value.toLocaleString('en-GB')}</div>
      {share != null && <div style={{fontSize:11.5,color:'var(--muted)',marginTop:2,fontStyle:'italic'}}>{Math.round(share*100)}% of total</div>}
    </div>
  );

  return (
    <div style={{background:'#fff',border:'1px solid var(--rule)',padding:'22px 26px',marginTop:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:16,gap:14,flexWrap:'wrap'}}>
        <div>
          <h3 style={{margin:0,fontFamily:'var(--serif)',fontSize:24,fontWeight:400,letterSpacing:-0.3}}>{row.name}</h3>
          <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginTop:4}}>{row.region || row.country} · {row.code}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div className="tnum" style={{fontFamily:'var(--serif)',fontSize:38,fontWeight:400,letterSpacing:-0.4,lineHeight:1,color:'var(--ink)'}}>{row.total.toLocaleString('en-GB')}</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:4,fontStyle:'italic'}}>people in supported accommodation</div>
          {change != null && dates.length > 1 && (
            <div style={{fontSize:12,marginTop:4,color: change >= 0 ? 'var(--accent-warn)' : 'var(--accent-2)',fontFamily:'var(--mono)',letterSpacing:'.04em'}}>
              {change >= 0 ? '▲ ' : '▼ '}{Math.abs(change).toFixed(0)}% since {dates[0]}
            </div>
          )}
        </div>
      </div>
      {values.length > 1 && (
        <svg width="100%" viewBox={`0 0 ${sparkW} ${sparkH}`} preserveAspectRatio="none"
          style={{display:'block',height:70,marginBottom:14,borderBottom:'1px solid var(--rule)'}}>
          <path d={sparkPath} fill="none" stroke="var(--accent-warn)" strokeWidth="1.6"/>
          <circle cx={xAt(values.length - 1)} cy={yAt(last)} r="3.5" fill="var(--accent-warn)"/>
        </svg>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        <Tier label="Section 95" value={row.s95} share={row.total ? row.s95/row.total : null}/>
        <Tier label="Section 98" value={row.s98} share={row.total ? row.s98/row.total : null}/>
        <Tier label="Section 4" value={row.s4} share={row.total ? row.s4/row.total : null}/>
      </div>
      <div style={{marginTop:14,fontFamily:'var(--mono)',fontSize:10.5,color:'var(--muted)',letterSpacing:'.04em'}}>
        Asy_D11 · last {values.length} quarterly snapshot{values.length === 1 ? '' : 's'}
      </div>
    </div>
  );
}

function WhereYouLive({ supportRows, onPick }) {
  const [postcode, setPostcode] = uSA('');
  const [loading, setLoading] = uSA(false);
  const [error, setError] = uSA(null);
  const [info, setInfo] = uSA(null);

  const lookup = async () => {
    const trimmed = postcode.trim().toUpperCase().replace(/\s+/g, '');
    if (!trimmed) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`);
      if (!r.ok) {
        // Try outcode lookup as a fallback for partial postcodes.
        const r2 = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(trimmed.slice(0, -3) || trimmed)}`);
        if (!r2.ok) throw new Error("That postcode wasn't recognised. Try a full UK postcode (e.g. SW1A 1AA).");
        const body2 = await r2.json();
        const result = body2.result;
        const districts = Array.isArray(result.admin_district) ? result.admin_district : [];
        const match = districts.length ? supportRows.find(s => s.name === districts[0]) : null;
        setInfo({ admin_district: districts.join(' / '), region: result.region?.[0] || result.country?.[0], parliamentary_constituency_2024: result.parliamentary_constituency?.[0], _outcode: true, ladRow: match });
        if (match && onPick) onPick(match);
        return;
      }
      const body = await r.json();
      const result = body.result;
      const match = supportRows.find(s => s.name === result.admin_district);
      setInfo({ ...result, ladRow: match });
      if (match && onPick) onPick(match);
    } catch (e) {
      setError(e.message || 'Lookup failed.');
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="where-you-live" style={{background:'#fff',border:'1px solid var(--rule)',padding:'22px 26px',marginTop:24,display:'grid',gridTemplateColumns:'minmax(0, 1fr) minmax(0, 1.3fr)',gap:30,alignItems:'start'}}>
      <div>
        <div className="uc" style={{color:'var(--accent-warn)',marginBottom:8,paddingBottom:4,borderBottom:'1.5px solid var(--accent-warn)',display:'inline-block'}}>Where you live</div>
        <h4 style={{margin:'4px 0 8px',fontSize:18,fontWeight:500,letterSpacing:-0.2,fontFamily:'var(--serif)'}}>Enter a UK postcode</h4>
        <p style={{margin:'0 0 14px',fontSize:13.5,color:'var(--muted)',fontStyle:'italic',textWrap:'pretty'}}>
          We'll look up your local authority and show how the national figures land where you are. Lookup runs in your browser via <a href="https://postcodes.io" target="_blank" rel="noopener" style={{color:'var(--accent)'}}>postcodes.io</a> — nothing is stored.
        </p>
        <div style={{display:'flex',border:'1px solid var(--rule-2)',background:'#fff'}}>
          <input value={postcode} onChange={e=>setPostcode(e.target.value)}
            placeholder="e.g. SW1A 1AA"
            onKeyDown={e => { if (e.key === 'Enter') lookup(); }}
            style={{flex:1,border:'none',padding:'10px 12px',fontSize:14,fontFamily:'var(--serif)',background:'transparent',outline:'none'}}/>
          <button onClick={lookup} disabled={loading || !postcode.trim()}
            style={{padding:'10px 16px',background:'var(--accent)',color:'var(--bg)',border:'none',fontFamily:'var(--mono)',fontSize:11,letterSpacing:'.06em',cursor: loading?'wait':'pointer',textTransform:'uppercase'}}>
            {loading ? '…' : 'Look up'}
          </button>
        </div>
        {error && <div style={{marginTop:10,fontSize:12,color:'var(--accent-warn)',fontStyle:'italic'}}>{error}</div>}
        <div style={{marginTop:10,fontFamily:'var(--mono)',fontSize:10.5,color:'var(--muted-2)',letterSpacing:'.04em'}}>
          No tracking · postcodes.io · public data
        </div>
      </div>
      <div style={{paddingLeft:24,borderLeft:'1px solid var(--rule)'}}>
        {info ? (
          <>
            <div className="uc" style={{color:'var(--accent)',fontSize:10}}>
              {info.parliamentary_constituency_2024 || info.parliamentary_constituency || 'Constituency'}
            </div>
            <h5 style={{margin:'4px 0 12px',fontSize:16,fontWeight:500}}>
              {info.admin_district}
              {info.region && <i style={{fontStyle:'italic',color:'var(--muted)',fontWeight:400,fontSize:13,marginLeft:6}}>· {info.region}</i>}
            </h5>
            {info.ladRow ? (
              <>
                <div style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--rule)',fontSize:13.5}}>
                  <span style={{color:'var(--ink-2)'}}>People in supported accommodation</span>
                  <span className="tnum" style={{fontFamily:'var(--mono)'}}><b style={{fontWeight:500,color:'var(--ink)'}}>{info.ladRow.total.toLocaleString('en-GB')}</b></span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--rule)',fontSize:13.5}}>
                  <span style={{color:'var(--ink-2)'}}>Section 95 · accommodation + subsistence</span>
                  <span className="tnum" style={{fontFamily:'var(--mono)'}}>{info.ladRow.s95.toLocaleString('en-GB')}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--rule)',fontSize:13.5}}>
                  <span style={{color:'var(--ink-2)'}}>Section 98 · emergency support</span>
                  <span className="tnum" style={{fontFamily:'var(--mono)'}}>{info.ladRow.s98.toLocaleString('en-GB')}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',padding:'9px 0',fontSize:13.5}}>
                  <span style={{color:'var(--ink-2)'}}>Section 4 · failed claims unable to leave</span>
                  <span className="tnum" style={{fontFamily:'var(--mono)'}}>{info.ladRow.s4.toLocaleString('en-GB')}</span>
                </div>
                <div style={{marginTop:14,fontSize:11.5,color:'var(--muted)',fontStyle:'italic'}}>
                  Map and panel above are now centred on {info.ladRow.name}. Dispersal is statutory; the geography is contracted, not chosen by councils.
                </div>
              </>
            ) : (
              <div style={{fontSize:13,color:'var(--muted)',fontStyle:'italic',textWrap:'pretty'}}>
                Found the constituency, but couldn't match it to a local-authority row in our data{info._outcode ? ' (outcode straddles boundaries — try a full postcode)' : ''}. Local-authority names sometimes differ between sources; we'll iron those out.
              </div>
            )}
          </>
        ) : (
          <div style={{fontSize:13,color:'var(--muted)',fontStyle:'italic',textWrap:'pretty'}}>
            Postcode results land here. Hit Enter or click <span style={{fontFamily:'var(--mono)',fontSize:11}}>LOOK UP</span>. Try one of: <code style={{fontFamily:'var(--mono)',fontSize:12}}>SW1A 1AA</code>, <code style={{fontFamily:'var(--mono)',fontSize:12}}>M1 1AA</code>, <code style={{fontFamily:'var(--mono)',fontSize:12}}>BS1 1AA</code>.
          </div>
        )}
      </div>
    </div>
  );
}

function UKAtlasSection() {
  const W = (typeof window !== 'undefined') ? window : {};
  const map = Array.isArray(W.UK_LAD_MAP) ? W.UK_LAD_MAP : [];
  const support = Array.isArray(W.SUPPORT_LA_LATEST) ? W.SUPPORT_LA_LATEST : [];
  const quarterly = Array.isArray(W.SUPPORT_LA_QUARTERLY) ? W.SUPPORT_LA_QUARTERLY : [];
  const meta = W.SUPPORT_LA_META;
  if (!map.length || !support.length) return null;

  const [selectedCode, setSelectedCode] = uSA(support[0]?.code || null);

  const valueByCode = uMA(() => {
    const out = {};
    for (const r of support) out[r.code] = r.total;
    return out;
  }, [support]);
  const selectedRow = support.find(r => r.code === selectedCode);

  // Page-level computed takeaway.
  const total = uMA(() => support.reduce((s, r) => s + (r.total || 0), 0), [support]);
  const top3 = support.slice(0, 3);
  const top3Share = top3.length && total ? top3.reduce((s, r) => s + r.total, 0) / total : 0;

  return (
    <section style={{borderTop:'1px solid var(--rule)',paddingTop:36,marginTop:40}}>
      <div className="uc" style={{color:'var(--muted)',marginBottom:8,display:'inline-block',paddingBottom:4,borderBottom:'2px solid var(--accent-warn)'}}>The UK in detail</div>
      <h2 style={{fontFamily:'var(--serif)',fontSize:30,letterSpacing:-0.4,fontWeight:400,margin:'0 0 8px'}}>Where the wait happens.</h2>
      <p style={{fontSize:15,color:'var(--ink-2)',maxWidth:'70ch',margin:'0 0 6px',lineHeight:1.5}}>
        Asylum seekers receiving Home Office support, by Local Authority District. {meta?.date ? `Snapshot as at ${meta.date}.` : ''} The map of <em>where the wait happens</em> is contracted, not chosen by councils — dispersal is statutory.
      </p>
      <div style={{
        background:'var(--bg-2)',borderLeft:'3px solid var(--accent-warn)',
        padding:'12px 18px',marginBottom:18,fontSize:14.5,lineHeight:1.5,color:'var(--ink-2)',
        textWrap:'pretty',fontStyle:'italic',maxWidth:'90ch'
      }}>
        <b style={{fontStyle:'normal',fontWeight:500,color:'var(--ink)'}}>The top three local authorities — {top3.map(r => r.name).join(', ')} — host {Math.round(top3Share * 100)}% of the {total.toLocaleString('en-GB')} people on Home Office support.</b>{' '}
        Most LADs host none, or fewer than 50; a long tail.
      </div>

      <div className="uk-atlas-grid" style={{display:'grid',gridTemplateColumns:'minmax(0, 1.55fr) minmax(280px, 1fr)',gap:24,alignItems:'start'}}>
        <UKChoropleth map={map} valueByCode={valueByCode} selectedCode={selectedCode} onSelect={setSelectedCode}/>
        <UKRankedList rows={support} selectedCode={selectedCode} onSelect={setSelectedCode}/>
      </div>
      <UKLAPanel row={selectedRow} quarterly={quarterly}/>
      <WhereYouLive supportRows={support} onPick={(row) => setSelectedCode(row.code)}/>
    </section>
  );
}

Object.assign(window, { AtlasView });
