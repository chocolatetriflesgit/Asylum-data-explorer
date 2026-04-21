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

function AtlasChoropleth({ countryValues, selectedName, onSelect, width=820, height=440 }) {
  const worldMap = (typeof WORLD_MAP !== 'undefined') ? WORLD_MAP : null;
  // Hooks must be called unconditionally — call before the early return.
  const zoom = useMapZoom(width, height);
  if (!worldMap) {
    return <div style={{padding:40,color:'var(--muted)',fontStyle:'italic'}}>World map not loaded.</div>;
  }
  const vMax = Math.max(...Object.values(countryValues), 1);
  // sqrt compresses the long tail so mid-range countries reach the middle
  // stops of the palette instead of all collapsing into the lightest band.
  const fillFor = v => {
    if (!(v > 0)) return ATLAS_PALETTE[0];
    return atlasPaletteColor(Math.sqrt(v / vMax));
  };
  return (
    <div style={{position:'relative'}}>
      <svg width="100%" height={height} viewBox={zoom.viewBox} {...zoom.svgProps}
        style={{display:'block',background:'var(--map-bg, var(--bg-2))', ...zoom.svgProps.style}}>
        <g>
          {worldMap.map((c, i) => {
            const nat = resolveNat(c.name);
            const v = nat ? (countryValues[nat] ?? 0) : 0;
            const isSel = nat && nat === selectedName;
            return (
              <path key={`${c.iso || ''}-${c.name}-${i}`} d={c.d}
                fill={isSel ? 'var(--accent-warn)' : fillFor(v)}
                stroke={isSel ? 'var(--accent)' : 'var(--rule-2)'} strokeWidth={isSel ? 1.4 : 0.4}
                onClick={() => { if (!zoom.didDrag() && nat) onSelect(nat); }}
                style={{cursor: nat ? (zoom.zoomed ? 'grab' : 'pointer') : 'default'}}>
                <title>{c.name}{v > 0 ? ` — ${v.toLocaleString()} applicants` : ''}</title>
              </path>
            );
          })}
        </g>
      </svg>
      <ZoomControls zoom={zoom}/>
    </div>
  );
}

function AtlasLegend({ countryValues }) {
  const vMax = Math.max(...Object.values(countryValues), 1);
  const stops = ATLAS_PALETTE.length;
  // Breakpoint at each transition between adjacent colour stops (sqrt scale).
  const breakpoints = Array.from({length: stops - 1}, (_, i) =>
    Math.round(vMax * Math.pow((i + 1) / (stops - 1), 2))
  );
  const fmtTick = v => v >= 1000 ? `${Math.round(v/1000)}k` : v.toLocaleString();
  return (
    <div style={{marginTop:10,fontSize:11}}>
      <div className="uc" style={{fontSize:10.5,color:'var(--muted)',marginBottom:6}}>Applicants</div>
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
      </div>
    </div>
  );
}

function AtlasKPI({ label, value, sub }) {
  return (
    <div style={{border:'1px solid var(--rule)',padding:'14px 16px',background:'#fff'}}>
      <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:4}}>{label}</div>
      <div className="tnum" style={{fontFamily:'var(--serif)',fontSize:26,fontWeight:500,color:'var(--ink)',letterSpacing:-0.3}}>{value}</div>
      {sub && <div style={{fontSize:11.5,color:'var(--muted-2)',marginTop:4}}>{sub}</div>}
    </div>
  );
}

function AtlasDetail({ name, setRoute }) {
  if (!name) {
    return (
      <div style={{padding:'60px 24px',textAlign:'center',color:'var(--muted)',fontStyle:'italic',border:'1px dashed var(--rule-2)'}}>
        Click a country on the map to see details.
      </div>
    );
  }
  const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
  const natMeta = typeof NAT_FULL_META !== 'undefined' ? NAT_FULL_META : null;
  const natQ = typeof NAT_QUARTERLY !== 'undefined' ? NAT_QUARTERLY : null;
  const returns = typeof RETURNS_BY_NATIONALITY !== 'undefined' ? RETURNS_BY_NATIONALITY : [];
  const ageDisputes = typeof AGE_DISPUTES_BY_NATIONALITY !== 'undefined' ? AGE_DISPUTES_BY_NATIONALITY : [];

  const apps = natFull.find(r => r.name === name);
  const qRow = natQ?.series?.find(s => s.name === name);
  const ret = returns.find(r => r.name === name);
  const ad = ageDisputes.find(r => r.name === name);

  const grantPct = apps && apps.grant != null ? `${Math.round(apps.grant * 100)}%` : '—';
  const applicants = apps ? apps.v.toLocaleString() : '—';
  const retTotal = ret ? ret.total.toLocaleString() : '—';
  const adRaised = ad ? ad.raised.toLocaleString() : '—';

  return (
    <div style={{border:'1px solid var(--rule)',background:'var(--bg-2)',padding:'20px 22px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:16,paddingBottom:12,borderBottom:'1px solid var(--rule-2)'}}>
        <h2 style={{fontFamily:'var(--serif)',fontSize:24,fontWeight:500,margin:0,letterSpacing:-0.3,color:'var(--ink)'}}>{name}</h2>
        <div className="uc" style={{color:'var(--muted)',fontSize:10.5}}>Latest complete year</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginBottom:16}}>
        <AtlasKPI label="Applicants" value={applicants} sub={natMeta ? `${natMeta.year} · NAT_FULL` : null}/>
        <AtlasKPI label="Grant rate" value={grantPct} sub="Initial decisions"/>
        <AtlasKPI label="Returns" value={retTotal} sub={ret ? `Enforced ${ret.enforced.toLocaleString()} · Voluntary ${ret.voluntary.toLocaleString()}` : null}/>
        <AtlasKPI label="Age disputes raised" value={adRaised} sub={ad ? `Resolved <18: ${ad.resolved_under_18}` : 'No data'}/>
      </div>
      {qRow ? (
        <div style={{background:'#fff',padding:'14px 16px',border:'1px solid var(--rule-2)'}}>
          <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:8}}>Applicants · last 8 quarters</div>
          <MultiLineChart
            years={natQ.quarters}
            series={[{ name, data: qRow.data }]}
            width={720} height={180}
          />
        </div>
      ) : (
        <div style={{padding:'18px 16px',color:'var(--muted-2)',fontStyle:'italic',fontSize:13,background:'#fff',border:'1px dotted var(--rule-2)'}}>
          No quarterly trend available (country not in NAT_QUARTERLY top-20).
        </div>
      )}
      {!apps && !ret && !ad && (
        <div style={{marginTop:12,fontSize:12,color:'var(--muted-2)',fontStyle:'italic'}}>
          No applicants, returns, or age-dispute records for this country in the latest data.
        </div>
      )}
      <div style={{marginTop:14,display:'flex',gap:14,fontSize:12}}>
        <button className="ulh" style={{color:'var(--accent)'}}
          onClick={()=>setRoute({name:'build', preselectNat: name})}>
          Compare in Build a chart →
        </button>
      </div>
    </div>
  );
}

function AtlasView({ setRoute }) {
  const [selected, setSelected] = uSA(null);

  const countryValues = uMA(() => {
    const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
    return Object.fromEntries(natFull.map(r => [r.name, r.v]));
  }, []);

  const topCountries = uMA(() => {
    const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
    return natFull.slice(0, 10);
  }, []);

  return (
    <main className="fade-enter" style={{maxWidth:1240,margin:'0 auto',padding:'40px 48px 80px'}}>
      <div style={{marginBottom:24}}>
        <div className="uc" style={{color:'var(--muted)',marginBottom:8,display:'inline-block',paddingBottom:4,borderBottom:'2px solid var(--accent-warn)'}}>Atlas</div>
        <h1 style={{fontFamily:'var(--serif)',fontSize:42,letterSpacing:-0.4,fontWeight:400,margin:'0 0 10px'}}>The world, by country.</h1>
        <p style={{fontSize:16,color:'var(--ink-2)',maxWidth:680,margin:0,lineHeight:1.5}}>
          Choropleth of asylum applicants by country of origin. Click any country to see applicants, grant rate, returns, and age disputes in one panel.
        </p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.4fr) minmax(360px,1fr)',gap:28,alignItems:'start'}}>
        <div style={{border:'1px solid var(--rule)',background:'#fff',padding:'12px'}}>
          <AtlasChoropleth countryValues={countryValues} selectedName={selected} onSelect={setSelected}/>
          <AtlasLegend countryValues={countryValues}/>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:12,paddingTop:10,borderTop:'1px dotted var(--rule-2)'}}>
            <span className="uc" style={{fontSize:10.5,color:'var(--muted)',marginRight:8}}>Jump to:</span>
            {topCountries.map(c => (
              <button key={c.name} onClick={()=>setSelected(c.name)}
                style={{fontSize:11.5,padding:'2px 8px',background: selected===c.name ? 'var(--accent)' : 'var(--bg-2)',
                        color: selected===c.name ? '#fff' : 'var(--ink-2)',
                        border:'1px solid var(--rule-2)',fontFamily:'var(--serif)'}}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <AtlasDetail name={selected} setRoute={setRoute}/>
      </div>
    </main>
  );
}

Object.assign(window, { AtlasView });
