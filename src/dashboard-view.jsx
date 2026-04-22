// dashboard-view.jsx — synchronised dashboard with pride-of-place KPIs + charts + tables

const { useState: uSD, useMemo: uMD, useRef: uRD, useEffect: uED } = React;

// Parse a "2018-2025" style token from the location hash so a shared
// URL reopens the dashboard pinned to the same range. Falls back to
// localStorage so the range is stable across plain reloads too.
function readInitialRange(min, max) {
  try {
    const fromHash = /[#&]r=(\d{4})-(\d{4})/.exec(typeof location !== 'undefined' ? location.hash : '');
    if (fromHash) {
      const a = Math.max(min, Math.min(max, +fromHash[1]));
      const b = Math.max(min, Math.min(max, +fromHash[2]));
      if (a <= b) return [a, b];
    }
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('dashRange') : null;
    if (stored) {
      const [a, b] = stored.split('-').map(Number);
      if (Number.isFinite(a) && Number.isFinite(b) && a <= b) {
        return [Math.max(min, Math.min(max, a)), Math.max(min, Math.min(max, b))];
      }
    }
  } catch (_) { /* ignore */ }
  return [2018, max];
}

// Pull a freshness date off a *_META global — prefers the upstream publication
// date ("latestDataPoint", "asOf") over the pipeline's own generation stamp.
// Returned value is the raw string; SourceStrip formats it for display.
function metaAsOf(meta) {
  if (!meta) return null;
  return meta.latest_date || meta.latestDataPoint || meta.asOf || meta.generatedAt || null;
}
function metaNext(meta) {
  if (!meta) return null;
  return meta.nextUpdate || null;
}

function DashboardView({ setRoute }) {
  const [range, setRange] = uSD(() => readInitialRange(2014, DATA_MAX_YEAR));
  const [focus, setFocus] = uSD('all'); // all | applications | decisions | geography

  // Cache per-source freshness once per render — one lookup per *_META.
  const _boatsMeta = typeof BOATS_META !== 'undefined' ? BOATS_META : null;
  const _natMeta   = typeof NAT_FULL_META !== 'undefined' ? NAT_FULL_META : null;
  const _decMeta   = typeof DECISIONS_META !== 'undefined' ? DECISIONS_META : null;
  const _blgMeta   = typeof BACKLOG_META !== 'undefined' ? BACKLOG_META : null;
  const _grantMeta = typeof NAT_GRANT_ANNUAL !== 'undefined' && NAT_GRANT_ANNUAL?._meta ? NAT_GRANT_ANNUAL._meta : null;
  const srcAsOf = {
    SB_01: metaAsOf(_boatsMeta),  SB_01_next: metaNext(_boatsMeta),
    SB_02: _boatsMeta ? metaAsOf(_boatsMeta) : null, SB_02_next: metaNext(_boatsMeta),
    Asy_D01: metaAsOf(_natMeta),  Asy_D01_next: metaNext(_natMeta),
    Asy_D02: metaAsOf(_decMeta ?? _natMeta), Asy_D02_next: metaNext(_decMeta ?? _natMeta),
    Asy_D03: metaAsOf(_blgMeta),  Asy_D03_next: metaNext(_blgMeta),
    GRANT: metaAsOf(_grantMeta ?? _natMeta), GRANT_next: metaNext(_grantMeta ?? _natMeta),
  };

  // Persist range to both localStorage and the URL hash so a link carries it.
  uED(() => {
    try {
      const val = `${range[0]}-${range[1]}`;
      localStorage.setItem('dashRange', val);
      if (typeof location !== 'undefined') {
        const other = location.hash.replace(/([#&])r=\d{4}-\d{4}/g, '$1').replace(/^#&/, '#').replace(/&&/g, '&');
        const sep = other && other !== '#' ? (other.endsWith('#') ? '' : '&') : '#';
        const next = (other && other !== '#' ? other : '') + sep + `r=${val}`;
        if (next !== location.hash) history.replaceState(null, '', next);
      }
    } catch (_) { /* ignore */ }
  }, [range]);

  const filteredAnnual = uMD(()=>ASYLUM_ANNUAL.filter(d => d.y >= range[0] && d.y <= range[1]), [range]);
  const latest = ASYLUM_ANNUAL[ASYLUM_ANNUAL.length - 1];
  const prev = ASYLUM_ANNUAL[ASYLUM_ANNUAL.length - 2];
  // Range-aware headline values — cards track the selected window, not just the overall latest year.
  const rangeLatest = filteredAnnual.length ? filteredAnnual[filteredAnnual.length - 1] : latest;
  const rangePrev   = filteredAnnual.length > 1 ? filteredAnnual[filteredAnnual.length - 2] : null;
  const pctChange   = (rangePrev && rangePrev.v > 0) ? ((rangeLatest.v - rangePrev.v) / rangePrev.v * 100).toFixed(1) : null;
  const backlogData = (typeof BACKLOG_LATEST !== 'undefined' && BACKLOG_LATEST.length) ? BACKLOG_LATEST : [];
  const backlogMeta = typeof BACKLOG_META !== 'undefined' ? BACKLOG_META : null;
  const filteredBacklog = uMD(()=>backlogData.filter(d => d.y >= range[0] && d.y <= range[1]), [range, backlogData]);
  const backlogRangeLatest = filteredBacklog.length ? filteredBacklog[filteredBacklog.length - 1] : null;
  const backlogRangePrev   = filteredBacklog.length > 1 ? filteredBacklog[filteredBacklog.length - 2] : null;
  const backlogDelta = (backlogRangeLatest && backlogRangePrev && backlogRangePrev.v > 0)
    ? ((backlogRangeLatest.v - backlogRangePrev.v) / backlogRangePrev.v * 100).toFixed(1) : null;
  const filteredBoats = uMD(() => {
    const all = typeof BOATS_ANNUAL !== 'undefined' ? BOATS_ANNUAL : [];
    return all.filter(d => d.y >= range[0] && d.y <= range[1]);
  }, [range]);
  const boatsRangeLatest = filteredBoats.length ? filteredBoats[filteredBoats.length - 1] : null;
  const boatsRangePrev   = filteredBoats.length > 1 ? filteredBoats[filteredBoats.length - 2] : null;
  const boatsPct = (boatsRangeLatest && boatsRangePrev && boatsRangePrev.m > 0)
    ? ((boatsRangeLatest.m - boatsRangePrev.m) / boatsRangePrev.m * 100).toFixed(1) : null;
  // Use pipeline-generated DECISIONS_LATEST when available; fall back to legacy DECISIONS_2024.
  const decisionsData = (typeof DECISIONS_LATEST !== 'undefined' && DECISIONS_LATEST.length)
    ? DECISIONS_LATEST : DECISIONS_2024;
  const decisionsYear = (typeof DECISIONS_META !== 'undefined') ? DECISIONS_META.year : 2024;
  const decisionsTotal = decisionsData.reduce((s,d)=>s+d.v,0);
  const grantRate = (decisionsData[0].v + decisionsData[1].v) / decisionsTotal;

  // Preventions + interceptions (BOATS_WEEKLY.p / .e) — null before first reported week.
  const boatsWeekly = typeof BOATS_WEEKLY !== 'undefined' ? BOATS_WEEKLY : [];
  const preventionsYear = String(rangeLatest?.y ?? latest.y);
  const preventionsYearTotal = boatsWeekly
    .filter(w => w.we?.startsWith(preventionsYear) && w.p != null)
    .reduce((s,w) => s + w.p, 0);
  const preventionsFirstWeek = boatsWeekly.find(w => w.p != null)?.we ?? null;
  const _fmtMonth = (ym) => {
    if (!ym || ym.length < 7) return ym ?? '';
    const [y, m] = ym.split('-');
    const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(+m)-1] || m;
    return `${mn} ${y.slice(2)}`;
  };
  const _aggregateByMonth = (field) => {
    const by = {};
    for (const w of boatsWeekly) {
      if (w[field] == null) continue;
      const ym = w.we?.slice(0,7);
      if (!ym) continue;
      by[ym] = (by[ym] || 0) + w[field];
    }
    return Object.entries(by)
      .map(([ym, v], i) => ({ y: i, v, label: ym }))
      .sort((a,b) => a.label.localeCompare(b.label))
      .map((row, i) => ({ ...row, y: i }));
  };
  const interceptionsMonthly = _aggregateByMonth('e');
  const interceptionsFirstMonth = interceptionsMonthly[0]?.label ?? null;
  const interceptionsLastMonth = interceptionsMonthly[interceptionsMonthly.length - 1]?.label ?? null;
  const preventionsMonthly = _aggregateByMonth('p');
  const preventionsFirstMonth = preventionsMonthly[0]?.label ?? null;
  const preventionsLastMonth = preventionsMonthly[preventionsMonthly.length - 1]?.label ?? null;

  // Phase 4 placeholders — hydrate from globals when data lands.
  const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : null;
  const natFullYear = typeof NAT_FULL_META !== 'undefined' ? NAT_FULL_META.year : null;
  const natQuarterly = typeof NAT_QUARTERLY !== 'undefined' ? NAT_QUARTERLY : null;
  const resettlementSeries = typeof RESETTLEMENT_SERIES !== 'undefined' ? RESETTLEMENT_SERIES : null;
  const resettlementYears = typeof RESETTLEMENT_META !== 'undefined' ? RESETTLEMENT_META.years : [2022,2023,2024];
  const hotels = typeof HOTELS !== 'undefined' ? HOTELS : null;

  // Sex / age breakdown (SEX_AGE_ANNUAL from build_sex_age.py).
  const sexAgeData = typeof SEX_AGE_ANNUAL !== 'undefined' ? SEX_AGE_ANNUAL : null;
  const sexAgeMeta = typeof SEX_AGE_META !== 'undefined' ? SEX_AGE_META : null;
  const sexAgeLatest = sexAgeData ? sexAgeData[sexAgeData.length - 1] : null;
  const sexAgePrev = sexAgeData && sexAgeData.length > 1 ? sexAgeData[sexAgeData.length - 2] : null;
  const filteredSexAge = uMD(() => sexAgeData ? sexAgeData.filter(d => d.y >= range[0] && d.y <= range[1]) : [], [range, sexAgeData]);
  const sexAgeRangeLatest = filteredSexAge.length ? filteredSexAge[filteredSexAge.length - 1] : null;
  const sexAgeRangePrev   = filteredSexAge.length > 1 ? filteredSexAge[filteredSexAge.length - 2] : null;

  // Returns totals (RETURNS_BY_NATIONALITY from build_returns.py).
  const returnsData = typeof RETURNS_BY_NATIONALITY !== 'undefined' ? RETURNS_BY_NATIONALITY : null;
  const returnsMeta = typeof RETURNS_META !== 'undefined' ? RETURNS_META : null;
  const returnsCard = returnsData ? (() => {
    const total = returnsData.reduce((s,r) => s + (r.total||0), 0);
    const priorTotal = returnsMeta?.priorYearTotal ?? null;
    const priorYear = returnsMeta?.priorYear ?? null;
    const yoyPct = (priorTotal && priorTotal > 0)
      ? Number(((total - priorTotal) / priorTotal * 100).toFixed(1))
      : null;
    return {
      enforced: returnsData.reduce((s,r) => s + (r.enforced||0), 0),
      voluntary: returnsData.reduce((s,r) => s + (r.voluntary||0), 0),
      total,
      year: returnsMeta?.year ?? '—',
      priorYear,
      yoyPct,
    };
  })() : null;

  // Age disputes totals (AGE_DISPUTES_BY_NATIONALITY from build_age_disputes.py).
  const ageDisputesData = typeof AGE_DISPUTES_BY_NATIONALITY !== 'undefined' ? AGE_DISPUTES_BY_NATIONALITY : null;
  const ageDisputesMeta = typeof AGE_DISPUTES_META !== 'undefined' ? AGE_DISPUTES_META : null;
  const ageDisputesCard = ageDisputesData ? {
    raised: ageDisputesData.reduce((s,r) => s + (r.raised||0), 0),
    over18: ageDisputesData.reduce((s,r) => s + (r.resolved_over_18||0), 0),
    under18: ageDisputesData.reduce((s,r) => s + (r.resolved_under_18||0), 0),
    year: ageDisputesMeta?.year ?? '—',
  } : null;

  // Derive "top nationality + QoQ delta" from NAT_QUARTERLY when available.
  const topNatCard = (() => {
    if (!natQuarterly || !natQuarterly.quarters?.length || !natQuarterly.series?.length) return null;
    const qs = natQuarterly.quarters;
    const lastIdx = qs.length - 1;
    const prevIdx = Math.max(0, lastIdx - 1);
    // Find the series with the highest value in the latest quarter.
    let top = natQuarterly.series[0];
    for (const s of natQuarterly.series) {
      if ((s.data[lastIdx] ?? 0) > (top.data[lastIdx] ?? 0)) top = s;
    }
    const now = top.data[lastIdx] ?? 0;
    const was = top.data[prevIdx] ?? 0;
    const delta = was === 0 ? null : ((now - was) / was * 100);
    const quarterTotal = natQuarterly.series.reduce((s, ser) => s + (ser.data[lastIdx] ?? 0), 0);
    const share = quarterTotal > 0 ? Math.round(now / quarterTotal * 100) : null;
    return { name: top.name, v: now, delta, quarter: qs[lastIdx], prevQuarter: qs[prevIdx], share };
  })();

  // Hotels KPI: latest value + previous for delta, if data is present.
  const hotelsCard = (() => {
    if (!hotels || !hotels.length) return null;
    const last = hotels[hotels.length - 1];
    const prev2 = hotels[hotels.length - 2];
    const delta = prev2 ? ((last.persons_in_hotels - prev2.persons_in_hotels) / prev2.persons_in_hotels * 100) : null;
    return { ...last, delta };
  })();

  // Provisional last-7-days small-boats data (from the gov.uk HTML page).
  // Canonical BOATS_DAILY from the weekly ODS wins for any overlapping date;
  // the provisional values fill the visible gap between releases.
  const provisional = typeof BOATS_PROVISIONAL !== 'undefined' ? BOATS_PROVISIONAL : null;
  const provisionalMeta = typeof BOATS_PROVISIONAL_META !== 'undefined' ? BOATS_PROVISIONAL_META : null;
  const canonicalLatest = (typeof BOATS_META !== 'undefined' && BOATS_META.latestDataPoint) || null;
  const provisionalDays = uMD(() => {
    if (!provisional) return [];
    return provisional.map(row => {
      const superseded = canonicalLatest ? row.d <= canonicalLatest : false;
      const date = new Date(row.d + 'T00:00:00Z');
      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getUTCDay()];
      const day = date.getUTCDate();
      const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getUTCMonth()];
      return { ...row, superseded, label: `${dayName} ${day} ${month}` };
    });
  }, [provisional, canonicalLatest]);
  const provisionalWeekTotal = uMD(() => provisionalDays.reduce((s,d) => s + (d.m||0), 0), [provisionalDays]);
  const sameWeekLastYear = uMD(() => {
    if (!provisionalDays.length || !boatsWeekly.length) return null;
    const latestD = provisionalDays[provisionalDays.length - 1]?.d;
    if (!latestD) return null;
    const target = new Date(latestD + 'T00:00:00Z');
    target.setUTCFullYear(target.getUTCFullYear() - 1);
    let best = null, bestDiff = Infinity;
    for (const w of boatsWeekly) {
      if (!w.we) continue;
      const diff = Math.abs(new Date(w.we + 'T00:00:00Z') - target);
      if (diff < bestDiff && diff <= 7 * 86400000) { bestDiff = diff; best = w; }
    }
    return best;
  }, [provisionalDays, boatsWeekly]);

  return (
    <main className="fade-enter" style={{maxWidth:1300,margin:'0 auto',padding:'36px 48px 80px'}}>
      {/* title strip */}
      <div style={{borderBottom:'1px solid var(--rule)',paddingBottom:22,marginBottom:28}}>
        <div className="kicker-rule" style={{color:'var(--accent-warn)',fontSize:11,letterSpacing:0.1,textTransform:'uppercase',fontWeight:500}}>Live dashboard · Q1 2026</div>
        <div style={{display:'flex',alignItems:'baseline',gap:14,flexWrap:'wrap',margin:'6px 0 10px'}}>
          <h1 style={{fontFamily:'var(--serif)',fontSize:42,letterSpacing:-0.4,fontWeight:400,margin:0}}>Asylum &amp; resettlement at a glance</h1>
          <button
            onClick={()=>{
              const anchor = document.getElementById('dash-range');
              if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            title="Jump to range filter"
            style={{
              fontFamily:'var(--mono, var(--serif))',fontSize:11,padding:'3px 10px',
              border:'1px solid var(--rule-2)',background:'var(--bg-2)',color:'var(--ink-2)',
              letterSpacing:0.04,cursor:'pointer',
            }}>
            <span style={{color:'var(--muted)',marginRight:6}}>Filtering</span>
            <span className="tnum">{range[0]}–{range[1]}</span>
          </button>
        </div>
        <p style={{fontSize:15.5,color:'var(--ink-2)',maxWidth:680,margin:0,lineHeight:1.5}}>
          Headline figures from Home Office data. Updated when the Home Office releases its quarterly figures.
        </p>
      </div>

      {/* Provisional last-7-days strip — lifted above KPI rows as the freshest data point. */}
      {provisional && provisionalDays.length > 0 && (
        <section style={{marginBottom:28,padding:'18px 22px',border:'1px dashed var(--rule-2)',background:'var(--bg-2)',borderRadius:0,borderLeft:'none',borderRight:'none'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,gap:24,flexWrap:'wrap'}}>
            <div>
              <div className="uc" style={{color:'var(--accent-warn)',fontSize:11,letterSpacing:0.1,fontWeight:500,marginBottom:8}}>Last 7 days · provisional</div>
              <div style={{display:'flex',alignItems:'baseline',gap:14,flexWrap:'wrap'}}>
                <div style={{fontFamily:'var(--serif)',fontSize:36,fontWeight:400,letterSpacing:-0.4,lineHeight:1,color:'var(--ink)'}} className="tnum">
                  {provisionalWeekTotal.toLocaleString()}
                </div>
                {sameWeekLastYear && sameWeekLastYear.m > 0 && (() => {
                  const diff = provisionalWeekTotal - sameWeekLastYear.m;
                  const pct = (diff / sameWeekLastYear.m * 100).toFixed(0);
                  return (
                    <div style={{fontSize:13,color: diff > 0 ? 'var(--accent-warn)' : 'var(--accent-2)',fontStyle:'italic'}}>
                      {diff>=0?'+':''}{pct}% vs same week {sameWeekLastYear.we.slice(0,4)}
                    </div>
                  );
                })()}
              </div>
              {/* Mini sparkline */}
              <svg width={provisionalDays.length * 22} height={30} style={{display:'block',marginTop:8}}>
                {(() => {
                  const vals = provisionalDays.map(d => d.m);
                  const maxV = Math.max(...vals, 1);
                  return vals.map((v, i) => (
                    <rect key={i} x={i * 22} y={30 - Math.round((v / maxV) * 24)} width={18} height={Math.round((v / maxV) * 24)}
                      fill={provisionalDays[i].superseded ? 'var(--muted-2)' : 'var(--accent-warn)'}/>
                  ));
                })()}
              </svg>
            </div>
            <div style={{fontSize:12,color:'var(--muted)',fontStyle:'italic',textAlign:'right',marginTop:4}}>
              {provisionalMeta?.updatedAt
                ? `Updated ${new Date(provisionalMeta.updatedAt+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}`
                : ''}
              {canonicalLatest && <div style={{marginTop:4}}>Canonical ODS through {canonicalLatest}</div>}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:8}}>
            {provisionalDays.map((d,i) => (
              <div key={d.d}
                title={d.superseded
                  ? 'Verified — this date has been incorporated into the weekly ODS time series and is no longer provisional.'
                  : 'Provisional — not yet confirmed by the weekly ODS. May be revised when the next release publishes.'}
                style={{padding:'10px 10px 12px',background:'#fff',
                  border: d.superseded ? '1px solid var(--rule)' : '1px dashed var(--accent-warn)',
                  opacity: d.superseded ? 0.5 : 1,cursor:'help'}}>
                <div className="uc" style={{fontSize:10.5,color:'var(--muted)',letterSpacing:0.1}}>{d.label}</div>
                <div className="tnum" style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:400,letterSpacing:-0.3,lineHeight:1.1,marginTop:6,color:'var(--ink)'}}>
                  {d.m.toLocaleString()}
                </div>
                <div style={{fontSize:11.5,color:'var(--muted-2)',marginTop:4}}>
                  {d.b} boat{d.b===1?'':'s'}{d.superseded ? ' · verified' : ''}
                </div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11.5,color:'var(--muted)',marginTop:10,fontStyle:'italic',lineHeight:1.5}}>
            Figures are provisional, drawn from the Home Office{' '}
            <a href={(typeof BOATS_PROVISIONAL_META !== 'undefined' && BOATS_PROVISIONAL_META?.sourceUrl)
                      || 'https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats/migrants-detected-crossing-the-english-channel-in-small-boats-last-7-days'}
               target="_blank" rel="noopener noreferrer"
               style={{color:'inherit',textDecoration:'underline',textDecorationStyle:'dotted',textUnderlineOffset:2}}>
              small-boat crossings · last 7 days
            </a>{' '}page and updated each day. Faded cells have already been confirmed by the weekly ODS time series; unfaded cells may still be revised. Hover a cell for details.
          </div>
        </section>
      )}

      {/* Hero KPI row — four promoted statistics with sparklines.
          Deliberately large and quiet: this is what a casual visitor should
          see first. The full 15-card grid sits underneath, collapsed. */}
      {(() => {
        const W = (typeof window !== 'undefined') ? window : {};
        // This-week arrivals — last row of BOATS_WEEKLY.
        const wk = (W.BOATS_WEEKLY || []);
        const lastWk = wk[wk.length - 1];
        // YTD arrivals — last non-null value of the current year's BOATS_YOY series.
        const yoy = W.BOATS_YOY || {};
        const yoyYears = Object.keys(yoy).sort();
        const latestYoyYear = yoyYears[yoyYears.length - 1];
        const latestYoyArr = latestYoyYear ? yoy[latestYoyYear] : [];
        let ytd = null, ytdDay = null;
        for (let i = latestYoyArr.length - 1; i >= 0; i--) {
          if (latestYoyArr[i] != null) { ytd = latestYoyArr[i]; ytdDay = i + 1; break; }
        }
        const priorYoyArr = yoyYears.length > 1 ? yoy[yoyYears[yoyYears.length - 2]] : [];
        const ytdPrior = (ytdDay != null && priorYoyArr[ytdDay - 1] != null) ? priorYoyArr[ytdDay - 1] : null;
        const ytdDelta = (ytd && ytdPrior) ? ((ytd - ytdPrior) / ytdPrior * 100) : null;
        // Weighted UK grant rate series — from NAT_GRANT_ANNUAL if we have NAT_FULL counts per year
        // we could weight properly; without per-year counts, fall back to the DECISIONS_LATEST point.
        // Sparklines driven by BOATS_ANNUAL (arrivals), BACKLOG_LATEST (backlog).
        const boatsAnnual = (W.BOATS_ANNUAL || []).map(r => ({ y: r.y, v: r.m }));
        const backlogSeries = (W.BACKLOG_LATEST || []).map(r => ({ y: r.y, v: r.v }));
        // Grant-rate sparkline: unweighted average across NAT_GRANT_ANNUAL series for each year.
        const nga = W.NAT_GRANT_ANNUAL;
        const grantSpark = (nga && Array.isArray(nga.years) && Array.isArray(nga.series)) ? nga.years.map((yr, i) => {
          const vals = nga.series.map(s => s.data[i]).filter(v => v != null);
          const avg = vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length : null;
          return avg == null ? null : { y: yr, v: avg };
        }).filter(Boolean) : [];

        const heroCards = [
          { label: 'This week · arrivals',
            v: lastWk ? fmtN(lastWk.m) : '—',
            d: lastWk ? `week ending ${lastWk.we}` : 'Data pending',
            spark: wk.slice(-12).map((w,i) => ({ y: i, v: w.m || 0 })),
            sparkStroke: 'var(--accent-warn)' },
          { label: `Small-boat arrivals · ${latestYoyYear ?? ''}`,
            v: ytd != null ? fmtN(ytd) : '—',
            d: ytdDelta != null ? `${ytdDelta>=0?'+':''}${ytdDelta.toFixed(1)}% vs same point in ${+latestYoyYear - 1}` : 'cumulative year-to-date',
            spark: boatsAnnual, sparkStroke: 'var(--accent-warn)' },
          { label: `Backlog · ${backlogSeries[backlogSeries.length-1]?.y ?? ''}`,
            v: backlogSeries.length ? fmtN(backlogSeries[backlogSeries.length-1].v) : '—',
            d: (() => {
              if (backlogSeries.length < 2) return 'pending initial decision';
              const a = backlogSeries[backlogSeries.length-1].v, b = backlogSeries[backlogSeries.length-2].v;
              return b>0 ? `${((a-b)/b*100).toFixed(1)}% vs prior year` : 'pending initial decision';
            })(),
            spark: backlogSeries, sparkStroke: 'var(--accent-gold)' },
          { label: `Grant rate · ${decisionsYear}`,
            v: `${Math.round(grantRate*100)}%`,
            d: 'of initial decisions',
            spark: grantSpark, sparkStroke: 'var(--accent-2)' },
        ];
        return (
          <section style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24,paddingBottom:22,borderBottom:'1px solid var(--rule)'}}>
            {heroCards.map((k,i) => (
              <div key={i} style={{padding:'20px 22px',background:'var(--bg-2)',border:'1px solid var(--rule)'}}>
                <div className="uc" style={{color:'var(--muted)',marginBottom:10,fontSize:10.5}}>{k.label}</div>
                <div style={{fontFamily:'var(--serif)',fontSize:40,fontWeight:400,letterSpacing:-0.4,lineHeight:1,color:'var(--ink)'}} className="tnum">{k.v}</div>
                <div style={{fontSize:12.5,color:'var(--muted)',marginTop:8,fontStyle:'italic'}}>{k.d}</div>
                {k.spark && k.spark.length > 1 && (
                  <div style={{marginTop:12}}>
                    <Spark data={k.spark} width={220} height={36} stroke={k.sparkStroke}/>
                  </div>
                )}
              </div>
            ))}
          </section>
        );
      })()}

      {/* Detail statistics — full 15-card grid, collapsed by default. */}
      <details style={{marginBottom:14}}>
        <summary style={{cursor:'pointer',listStyle:'none',padding:'10px 0',borderBottom:'1px solid var(--rule)',display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
          <span className="uc" style={{color:'var(--muted)',fontSize:10.5}}>Detail · 15 statistics</span>
          <span style={{fontSize:11,color:'var(--muted-2)',fontStyle:'italic'}}>click to expand ▾</span>
        </summary>
        <div style={{paddingTop:18}}>
      {/* KPI strip row 1 — Preventions · Applications · Initial decisions · Appeals allowed.
          The "Small-boat arrivals · YYYY" card that lived here was a duplicate of the
          hero card above (same number, same year) and was removed in the polish pass. */}
      <section style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:14}}>
        {[
          { cls:'ink', label:`Preventions · ${preventionsYear}`, v:fmtN(preventionsYearTotal),
            d: preventionsFirstWeek ? `since wk ending ${preventionsFirstWeek}` : 'provisional', dPos:true },
          { cls:'accent', label:`Applications · ${rangeLatest.y}`, v:fmtN(rangeLatest.v),
            d: pctChange!=null ? `${+pctChange>=0?'+':''}${pctChange}% vs ${rangePrev?.y??''}` : `${rangeLatest.y} only`,
            dPos: pctChange!=null ? +pctChange<0 : null },
          { cls:'ink', label:`Initial decisions · ${decisionsYear}`, v:fmtN(decisionsTotal),
            d: `${Math.round(decisionsData[0].v/decisionsTotal*100)}% granted asylum${(range[0]>decisionsYear||range[1]<decisionsYear)?' · outside range':''}` },
          { cls:'olive', label:'Appeals allowed', v:'36%', d:'of 41k heard in 2024' },
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.cls}`}>
            <div className="uc" style={{color:'var(--muted)',marginBottom:12}}>{k.label}</div>
            <div style={{fontFamily:'var(--serif)',fontSize:42,fontWeight:400,letterSpacing:-0.4,lineHeight:1,color:'var(--ink)'}} className="tnum">{k.v}</div>
            <div style={{fontSize:13,color: k.dPos != null ? (k.dPos ? 'var(--accent-2)' : 'var(--accent-warn)') : 'var(--muted)',marginTop:10,fontStyle:'italic'}}>{k.d}</div>
          </div>
        ))}
      </section>

      {/* KPI strip row 2 — Grant rate · Backlog · Resettled · Top nationality · Hotels */}
      <section style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14,marginBottom:14}}>
        {[
          { cls:'olive', label:`Grant rate · ${decisionsYear}`, v:`${Math.round(grantRate*100)}%`,
            d: (range[0]<=decisionsYear&&decisionsYear<=range[1]) ? 'from 24% in 2019' : 'latest available', dPos:true },
          { cls:'gold', label:`Backlog${backlogRangeLatest ? ` · ${backlogRangeLatest.y}` : (backlogMeta ? ` · ${backlogMeta.latest_year}` : '')}`,
            v: fmtN(backlogRangeLatest?.v ?? backlogData[backlogData.length-1]?.v ?? 91200),
            d: backlogDelta!=null ? `${+backlogDelta>=0?'+':''}${backlogDelta}% vs ${backlogRangePrev?.y??''}` : 'snapshot', dPos: backlogDelta!=null ? +backlogDelta<0 : true },
          (() => {
            const total = resettlementSeries
              ? resettlementSeries.reduce((s,r) => {
                  const last = resettlementYears[resettlementYears.length-1];
                  return s + (r[last] ?? 0);
                }, 0)
              : 12410;
            const yrs = resettlementYears || [];
            const first = yrs.length ? yrs[0] : null;
            const last  = yrs.length ? yrs[yrs.length - 1] : null;
            const yrRange = (first && last) ? (first === last ? `${last}` : `${first}–${last}`) : '';
            return {
              cls:'accent',
              label: `Resettled under schemes${last ? ` · ${last}` : ''}`,
              v: fmtN(total),
              d: yrRange ? `${yrRange} · across 5 programmes` : 'Across 5 programmes',
            };
          })(),
          topNatCard
            ? { cls:'gold', label:`Top nationality · ${topNatCard.quarter}`, v:topNatCard.name,
                d: topNatCard.share!=null ? `${fmtN(topNatCard.v)} · ${topNatCard.share}% of total` : `${fmtN(topNatCard.v)} apps`, pending:false }
            : { cls:'gold', label:'Top nationality · Q-o-Q', v:'—', d:'Data pending', pending:true },
          hotelsCard
            ? { cls:'ink', label:`In asylum hotels · ${hotelsCard.date}`, v:fmtN(hotelsCard.persons_in_hotels), d: hotelsCard.delta==null ? 'latest snapshot' : `${hotelsCard.delta>=0?'+':''}${hotelsCard.delta.toFixed(1)}% vs previous snapshot`, pending:false }
            : { cls:'ink', label:'In asylum hotels', v:'—', d:'Data pending', pending:true },
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.cls}`} style={k.pending?{opacity:0.6}:{}}>
            <div className="uc" style={{color:'var(--muted)',marginBottom:12}}>{k.label}</div>
            <div style={{fontFamily:'var(--serif)',fontSize: k.pending?24: (typeof k.v === 'string' && k.v.length>8 ? 22 : 32),fontWeight:400,letterSpacing:-0.3,lineHeight:1,color:'var(--ink)'}} className="tnum">{k.v}</div>
            <div style={{fontSize:12.5,color: k.dPos != null ? (k.dPos ? 'var(--accent-2)' : 'var(--accent-warn)') : 'var(--muted)',marginTop:10,fontStyle:'italic'}}>{k.d}</div>
          </div>
        ))}
      </section>

      {/* KPI strip row 3 — Returns · Sex ratios · Children · Age disputes */}
      <section style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14,marginBottom:0,paddingBottom:36}}>
        {(() => {
          const yr = sexAgeRangeLatest?.y ?? sexAgeMeta?.latest_year ?? '—';
          const maleRatio = sexAgeRangeLatest && (sexAgeRangeLatest.male + sexAgeRangeLatest.female) > 0
            ? Math.round(sexAgeRangeLatest.male / (sexAgeRangeLatest.male + sexAgeRangeLatest.female) * 100) : null;
          const maleAdultRatio = sexAgeRangeLatest && (sexAgeRangeLatest.male_adult + sexAgeRangeLatest.female_adult) > 0
            ? Math.round(sexAgeRangeLatest.male_adult / (sexAgeRangeLatest.male_adult + sexAgeRangeLatest.female_adult) * 100) : null;
          const under18Delta = sexAgeRangeLatest && sexAgeRangePrev && sexAgeRangePrev.under18 > 0
            ? ((sexAgeRangeLatest.under18 - sexAgeRangePrev.under18) / sexAgeRangePrev.under18 * 100).toFixed(1) : null;
          return [
            returnsCard
              ? { cls:'ink', label:`Returns · ${returnsCard.year}`, v:fmtN(returnsCard.total),
                  d: returnsCard.yoyPct != null
                      ? `${returnsCard.yoyPct>=0?'+':''}${returnsCard.yoyPct}% vs ${returnsCard.priorYear} · ${fmtN(returnsCard.enforced)} enforced · ${fmtN(returnsCard.voluntary)} voluntary`
                      : `${fmtN(returnsCard.enforced)} enforced · ${fmtN(returnsCard.voluntary)} voluntary`,
                  dPos: returnsCard.yoyPct != null ? returnsCard.yoyPct >= 0 : null }
              : { cls:'ink', label:'Returns', v:'—', d:'Data pending', pending:true },
            sexAgeRangeLatest && maleAdultRatio != null
              ? { cls:'', label:`Sex ratio (adults) · ${yr}`, v:`${maleAdultRatio}% male`, d:`${fmtN(sexAgeRangeLatest.male_adult)}M / ${fmtN(sexAgeRangeLatest.female_adult)}F` }
              : { cls:'', label:'Sex ratio (adults)', v:'—', d:'Data pending', pending:true },
            sexAgeRangeLatest && maleRatio != null
              ? { cls:'', label:`Sex ratio (all) · ${yr}`, v:`${maleRatio}% male`, d:`${fmtN(sexAgeRangeLatest.male)}M / ${fmtN(sexAgeRangeLatest.female)}F` }
              : { cls:'', label:'Sex ratio (all applicants)', v:'—', d:'Data pending', pending:true },
            sexAgeRangeLatest
              ? { cls:'gold', label:`Child applicants · ${yr}`, v:fmtN(sexAgeRangeLatest.under18), d: under18Delta != null ? `${+under18Delta>=0?'+':''}${under18Delta}% vs ${sexAgeRangePrev?.y??''}` : 'main applicants under 18' }
              : { cls:'gold', label:'Child applicants', v:'—', d:'Data pending', pending:true },
            ageDisputesCard
              ? { cls:'accent-2', label:`Age disputes raised · ${ageDisputesCard.year}`, v:fmtN(ageDisputesCard.raised), d:`${fmtN(ageDisputesCard.over18)} found adult · ${fmtN(ageDisputesCard.under18)} found child` }
              : { cls:'', label:'Age disputes', v:'—', d:'Data pending', pending:true },
          ];
        })().map((k,i)=>(
          <div key={i} className={`kpi-card ${k.cls ?? ''}`} style={k.pending?{opacity:0.6}:{}}>
            <div className="uc" style={{color:'var(--muted)',marginBottom:12}}>{k.label}</div>
            <div style={{fontFamily:'var(--serif)',fontSize: k.pending?24: (typeof k.v === 'string' && k.v.length>8 ? 18 : 28),fontWeight:400,letterSpacing:-0.3,lineHeight:1.1,color:'var(--ink)'}} className="tnum">{k.v}</div>
            <div style={{fontSize:11.5,color:'var(--muted)',marginTop:10,fontStyle:'italic',lineHeight:1.4}}>{k.d}</div>
          </div>
        ))}
      </section>
        </div>
      </details>

      {/* Time range filter (sticky so it stays visible while scrolling) */}
      <div id="dash-range" style={{position:'sticky',top:0,zIndex:6,borderTop:'1px solid var(--rule)',borderBottom:'1px solid var(--rule)',padding:'20px 24px',margin:'20px 0',background:'var(--bg-2)',display:'flex',alignItems:'flex-start',gap:40,flexWrap:'wrap'}}>
        <div style={{flex:'0 1 540px',minWidth:300}}>
          <div className="uc" style={{color:'var(--muted)',marginBottom:6,fontSize:10.5}}>
            <span className="tick tick-accent"/>Time range
          </div>
          <FilterRange range={range} setRange={setRange} min={2014} max={DATA_MAX_YEAR}/>
        </div>
        <div style={{flex:'1 1 260px',maxWidth:360,fontSize:12.5,color:'var(--muted)',fontStyle:'italic',lineHeight:1.5,paddingTop:22}}>
          Drag the handles to change the years covered by every statistic and chart below. Use the presets for common ranges.
        </div>
      </div>

      {/* Section focus nav */}
      <div style={{display:'flex',alignItems:'center',gap:10,margin:'0 0 28px',paddingTop:20,paddingBottom:20,borderBottom:'1px solid var(--rule)',flexWrap:'wrap'}}>
        <span className="uc" style={{color:'var(--muted)',marginRight:4}}>Show only</span>
        {[
          { id:'all', label:'All sections' },
          { id:'applications', label:'Applications & journeys' },
          { id:'decisions', label:'Decisions' },
          { id:'geography', label:'Geography' },
        ].map(f => (
          <button key={f.id} onClick={()=>setFocus(f.id)}
            style={{
              fontSize:12,letterSpacing:0.04,padding:'6px 14px',
              fontFamily:'var(--serif)',
              background: focus===f.id ? 'var(--accent)' : '#fff',
              color: focus===f.id ? 'var(--bg)' : 'var(--ink-2)',
              border:'1px solid ' + (focus===f.id ? 'var(--accent)' : 'var(--rule-2)'),
              cursor:'pointer',
            }}>{f.label}</button>
        ))}
      </div>

      {/* Main chart grid — 2 columns */}
      {(focus === 'all' || focus === 'applications') && (
        <section style={{marginBottom:44}}>
          <DashSectionHeader kicker="Applications and journeys" title="Volume and composition" accent="var(--accent-warn)" cadence="Annual · boats weekly"/>
          <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:20}}>
            <DashFrame number="01" kickerColor="var(--accent-warn)" title="Asylum applications" sub={`UK · ${range[0]}–${range[1]}`}
              setRoute={setRoute} forkPreset={{ d:'applications', ct:'line', g:'annual', r:`${range[0]}-${range[1]}` }}>
              <LineChart data={ASYLUM_ANNUAL} yearRange={range} width={720} height={280}
                yLabel="Applications" xLabel="Year"
                annotations={[
                  range[0] <= 2023 && range[1] >= 2023 && { y:2023, label:'84,425', dx:-90, dy:-14 }
                ].filter(Boolean)}
                source="Home Office · Asy_D01"
                asOf={srcAsOf.Asy_D01} nextUpdate={srcAsOf.Asy_D01_next}/>
            </DashFrame>
            <DashFrame number="02" kickerColor="var(--accent-2)" title="Small-boat arrivals · year-to-date comparison" sub="Cumulative crossings by day of year"
              setRoute={setRoute} forkPreset={{ d:'boats', ct:'line', g:'daily' }}>
              {(() => {
                if (typeof BOATS_YOY !== 'undefined' && BOATS_YOY && Object.keys(BOATS_YOY).length) {
                  return (
                    <YoYCumulative series={BOATS_YOY} width={520} height={280}
                      yearRange={range}
                      yLabel="Cumulative migrants" xLabel="Day of year"
                      caption="Each line traces cumulative small-boat arrivals through the year. The current-year line stops at the most recent published week — no interpolation past that point. Hover a line to bring it forward."
                      source="Home Office · SB_01"
                      asOf={srcAsOf.SB_01} nextUpdate={srcAsOf.SB_01_next}/>
                  );
                }
                const boatsAnnual = (typeof BOATS_ANNUAL !== 'undefined' && BOATS_ANNUAL.length)
                  ? BOATS_ANNUAL.map(d => ({ y: d.y, v: d.m }))
                  : ASYLUM_ANNUAL.filter(d => d.boats != null).map(d => ({ y: d.y, v: d.boats }));
                return (
                  <LineChart data={boatsAnnual} yearRange={range}
                    stroke="var(--accent-warn)" width={520} height={280}
                    source="Home Office · SB_01"
                    asOf={srcAsOf.SB_01} nextUpdate={srcAsOf.SB_01_next}/>
                );
              })()}
            </DashFrame>
          </div>
          {/* Seasonal heat-map — one row per year, 52 weekly cells.
              Reveals the strong spring→autumn seasonality that the annual line
              flattens out. */}
          {typeof BOATS_WEEKLY !== 'undefined' && BOATS_WEEKLY.length > 0 && (
            <div style={{marginTop:20}}>
              <DashFrame number="03" kickerColor="var(--accent-warn)" title="Arrivals by week · seasonal pattern" sub="Weekly crossings, 2018–latest · darker = more arrivals"
                setRoute={setRoute} forkPreset={{ d:'boats', ct:'line', g:'weekly' }}>
                <SeasonalHeatMap data={BOATS_WEEKLY} width={1100} height={260}
                  yearRange={range}
                  yLabel="Year" xLabel="Month"
                  caption="Each cell is one ISO week × year. Darker cells are weeks with more crossings. Seasonality is unmistakable: very low from January to March, rising from April, peaking late summer."
                  source="Home Office · SB_01"
                  asOf={srcAsOf.SB_01} nextUpdate={srcAsOf.SB_01_next}/>
              </DashFrame>
            </div>
          )}
          <div style={{marginTop:20}}>
            <ChannelDeathsCard/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:20,marginTop:20}}>
            <DashFrame number="04" kickerColor="var(--accent-gold)" title="Top five nationalities"
              sub={`2020–${(typeof NAT_SERIES_META !== 'undefined' ? NAT_SERIES_META.year_end : NAT_SERIES.years[NAT_SERIES.years.length-1])}`}
              setRoute={setRoute} forkPreset={{ d:'nationalities_custom', ct:'line', g:'annual', nats:'Pakistan,Afghanistan,Iran,Eritrea,Syria' }}>
              {(() => { const ns = (typeof NAT_SERIES_LATEST !== 'undefined') ? NAT_SERIES_LATEST : NAT_SERIES;
                return <MultiLineChart years={ns.years} series={ns.series} yearRange={range} width={760} height={260}/>; })()}
            </DashFrame>
            <DashFrame number="05" kickerColor="var(--accent-2)" title="All nationalities" sub={natFull ? `${natFull.length} nationalities, latest year` : 'Data pending'}
              setRoute={setRoute} forkPreset={{ d:'nationalities_custom', ct:'bar', g:'annual' }}>
              <NationalitiesTable data={natFull}/>
            </DashFrame>
          </div>
          {(interceptionsMonthly.length > 0 || preventionsMonthly.length > 0) && (() => {
            // Merged dual-axis chart: interceptions (events) on the left axis,
            // preventions (migrants) on the right axis. Re-index both series
            // onto a shared monthly grid (union of all labels) so the x-axis
            // aligns — otherwise DualAxisChart would plot two series against
            // separate index spaces and their shapes wouldn't be comparable.
            const monthLabels = Array.from(new Set([
              ...interceptionsMonthly.map(p => p.label),
              ...preventionsMonthly.map(p => p.label),
            ])).sort();
            const indexByLabel = Object.fromEntries(monthLabels.map((lbl, i) => [lbl, i]));
            const leftAligned  = interceptionsMonthly.map(p => ({ y: indexByLabel[p.label], v: p.v, label: p.label }));
            const rightAligned = preventionsMonthly.map(p => ({ y: indexByLabel[p.label], v: p.v, label: p.label }));
            const firstMonth = monthLabels[0];
            const lastMonth  = monthLabels[monthLabels.length - 1];
            return (
              <div style={{marginTop:20}}>
                <DashFrame number="06" kickerColor="var(--accent)"
                  title="Monthly interceptions and preventions"
                  sub={`Border Force · ${_fmtMonth(firstMonth)}–${_fmtMonth(lastMonth)} · dual axis`}>
                  <DualAxisChart
                    left={leftAligned} right={rightAligned}
                    yearRange={range}
                    leftStroke="var(--accent)" rightStroke="var(--accent-warn)"
                    leftLabel="Interceptions" rightLabel="Preventions"
                    yLabelLeft="Events (interceptions)"
                    yLabelRight="Migrants (preventions)"
                    xLabel="Month"
                    width={1100} height={280}
                    xLabelFmt={(_, i, p) => _fmtMonth(p?.label ?? p?.y)}
                    caption="Interceptions (solid, left axis) count the events in which Border Force prevented a crossing in progress; preventions (dashed, right axis) count the migrants involved. Reporting of preventions began in May 2024 — the dashed line starts there."
                    source="Home Office · SB_02"
                    asOf={srcAsOf.SB_02} nextUpdate={srcAsOf.SB_02_next}/>
                </DashFrame>
              </div>
            );
          })()}
        </section>
      )}

      {(focus === 'all' || focus === 'decisions') && (
        <section style={{marginBottom:44}}>
          <DashSectionHeader kicker="Decisions" title="Outcomes and the backlog" accent="var(--accent-2)" cadence="Quarterly"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <DashFrame number="07" kickerColor="var(--accent-warn)" title={`Initial decisions, ${decisionsYear}`} sub="Share of substantive outcomes">
              <StackedBar data={decisionsData} width={600} height={110}/>
              <div style={{marginTop:18,display:'grid',gridTemplateColumns:'auto 1fr',gap:22,alignItems:'center'}}>
                <Ring value={grantRate} size={220} stroke={22}
                  ghostValue={0.24} ghostLabel="from 24% in 2019"
                  label="Grant rate" sub={`${decisionsYear}`}/>
                <div style={{fontSize:14,lineHeight:1.5,color:'var(--ink-2)',textWrap:'pretty'}}>
                  {Math.round(grantRate*100)}% of all decided cases in {decisionsYear} resulted in a grant of protection — up from 24% in 2019 (faint inner arc). The shift reflects changes in nationality composition (Afghan and Sudanese claims have very high grant rates) and the unwinding of a backlog weighted toward older, harder-to-grant cases.
                </div>
              </div>
            </DashFrame>
            <DashFrame number="08" kickerColor="var(--accent-gold)" title="Pending cases (backlog)"
              sub={`${range[0]}–${range[1]}${backlogMeta ? ` · 31 Dec snapshots · Asy_D03` : ''}`}
              setRoute={setRoute} forkPreset={{ d:'backlog', ct:'line', g:'annual', r:`${range[0]}-${range[1]}` }}>
              <LineChart data={filteredBacklog} yearRange={range} width={560} height={260}
                stroke="var(--accent-gold)"
                yLabel="Pending cases" xLabel="Year"
                annotations={[
                  range[0] <= 2022 && range[1] >= 2022 && { y:2022, label:'Peak 132k', dx:-80, dy:-10 },
                ].filter(Boolean)}
                source="Home Office · Asy_D03"
                asOf={srcAsOf.Asy_D03} nextUpdate={srcAsOf.Asy_D03_next}/>
            </DashFrame>
          </div>
          {/* Grant-rate small multiples — 12 nationalities, one cell each. */}
          {typeof NAT_GRANT_ANNUAL !== 'undefined' && NAT_GRANT_ANNUAL && (
            <div style={{marginTop:20}}>
              <DashFrame number="09" kickerColor="var(--accent-2)"
                title="Grant rate by nationality · small multiples"
                sub={`${NAT_GRANT_ANNUAL.years[0]}–${NAT_GRANT_ANNUAL.years[NAT_GRANT_ANNUAL.years.length-1]} · 12 nationalities · independent trends`}
                setRoute={setRoute} forkPreset={{ d:'grant_rate', ct:'line' }}>
                <GrantRateSmallMultiples series={NAT_GRANT_ANNUAL} yearRange={range} width={1100} height={380} cols={4}
                  highlight={['Afghanistan','Syria','Iran','Eritrea']}
                  caption="Each cell is one nationality. Y-axis is 0–100% grant rate; x-axis runs across the full window. Dashed grid line marks 50%. Most nationalities move independently — no single macro driver explains all of them."
                  source="Home Office · Asy_D02 (derived)"
                  asOf={srcAsOf.GRANT} nextUpdate={srcAsOf.GRANT_next}/>
              </DashFrame>
            </div>
          )}
        </section>
      )}

      {(focus === 'all' || focus === 'geography') && (
        <section style={{marginBottom:44}}>
          <DashSectionHeader kicker="Geography" title="Who applies" accent="var(--accent-gold)" cadence={`Applications · ${natFullYear ?? 'latest'}`}/>
          {natFull && (
            <div style={{display:'grid',gridTemplateColumns:'1.35fr 1fr',gap:20,alignItems:'start'}}>
              <DashFrame number="10" kickerColor="var(--accent-gold)" title="Applicants by region of origin" sub={`UK · ${natFullYear ?? ''} · grouped from Asy_D01`}>
                <WorldMapChoropleth data={groupNatByRegion(natFull)} width={720} height={420}/>
              </DashFrame>
              <DashFrame number="11" kickerColor="var(--accent-gold)" title="Applicants by region — detail" sub={`UK · ${natFullYear ?? ''} · grouped from Asy_D01`}>
                <RegionTable data={groupNatByRegion(natFull)} rows={natFull}/>
              </DashFrame>
            </div>
          )}
        </section>
      )}

      {(focus === 'all' || focus === 'geography') && (
        <section style={{marginBottom:44,paddingTop:30,borderTop:'1px solid var(--rule)'}}>
          <DashSectionHeader kicker="Geography" title="Where they live while waiting" accent="var(--accent-warn)" cadence="Quarterly snapshot · Home Office support"/>
          {(() => {
            const regData = (typeof SUPPORT_REGIONS !== 'undefined' && SUPPORT_REGIONS.length)
              ? SUPPORT_REGIONS : REGIONS;
            const regMeta = typeof SUPPORT_REGIONS_META !== 'undefined' ? SUPPORT_REGIONS_META : null;
            const tiers = typeof SUPPORT_TIERS_LATEST !== 'undefined' ? SUPPORT_TIERS_LATEST : null;
            return (
              <>
              <DashFrame number="12" kickerColor="var(--accent-warn)"
                title="Asylum seekers in receipt of Home Office support, by region"
                sub={regMeta ? `UK regions · as at ${regMeta.date} · Asy_D11` : 'UK · 2024'}>
                <BarChart data={regData} width={1100} color="var(--accent)"/>
                <div style={{marginTop:14,paddingTop:12,borderTop:'1px dotted var(--rule-2)',fontSize:12.5,lineHeight:1.6,color:'var(--muted)',maxWidth:820}}>
                  Counts people receiving Section 95 support (accommodation and subsistence for destitute asylum seekers awaiting a decision), Section 98 (emergency support while a Section 95 application is assessed), or Section 4 (support for failed asylum seekers unable to leave the UK). This is where people are housed — not where claims were lodged.
                </div>
              </DashFrame>
              {tiers && tiers.total > 0 && (
                <DashFrame number="13" kickerColor="var(--accent-warn)"
                  title="Support by type · Section 95 / 98 / 4"
                  sub={`UK · as at ${tiers.date} · Asy_D11`} source="Home Office · Asy_D11">
                  <SupportTiersCard tiers={tiers}/>
                </DashFrame>
              )}
              </>
            );
          })()}
        </section>
      )}

      {/* Resettlement table */}
      {(focus === 'all' || focus === 'decisions') && (
        <section style={{marginTop:44,paddingTop:30,borderTop:'1px solid var(--rule)'}}>
          <DashSectionHeader kicker="Resettlement" title="Arrivals by scheme" accent="var(--accent)" cadence="Annual"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
            <div style={{border:'1px solid var(--rule)',background:'#fff',padding:'22px 26px'}}>
              {resettlementSeries ? (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                  <thead>
                    <tr>
                      <th className="uc" style={{padding:'0 0 12px',textAlign:'left',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent)'}}>Scheme</th>
                      {resettlementYears.map(y => (
                        <th key={y} className="uc" style={{padding:'0 0 12px',paddingLeft:16,textAlign:'right',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent)'}}>{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resettlementSeries.map((r,i)=>(
                      <tr key={r.name} style={{borderBottom:'1px solid var(--rule)'}}>
                        <SchemeCell name={r.name} colorIdx={i}/>
                        {resettlementYears.map((y,j) => (
                          <td key={y} className="tnum" style={{padding:'13px 0',paddingLeft:16,textAlign:'right',color: j===resettlementYears.length-1 ? 'var(--ink)' : 'var(--muted)',fontWeight: j===resettlementYears.length-1 ? 500 : 400}}>{r[y]!=null ? fmtN(r[y]) : '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                  <thead>
                    <tr>
                      <th className="uc" style={{padding:'0 0 12px',textAlign:'left',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent)'}}>Scheme</th>
                      <th className="uc" style={{padding:'0 0 12px',textAlign:'right',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent)'}}>2024 arrivals</th>
                      <th className="uc" style={{padding:'0 0 12px',textAlign:'right',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent)'}}>Share</th>
                      <th className="uc" style={{padding:'0 0 12px',textAlign:'right',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent)'}}>2022–23 <span style={{fontStyle:'italic',fontWeight:400,textTransform:'none'}}>data pending</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {RESETTLEMENT.map((r,i)=>{
                      const total = RESETTLEMENT.reduce((s,x)=>s+x.v,0);
                      return (
                        <tr key={r.name} style={{borderBottom:'1px solid var(--rule)'}}>
                          <SchemeCell name={r.name} colorIdx={i}/>
                          <td className="tnum" style={{padding:'13px 0',textAlign:'right'}}>{fmtN(r.v)}</td>
                          <td className="tnum" style={{padding:'13px 0',textAlign:'right',color:'var(--muted)'}}>{Math.round(r.v/total*100)}%</td>
                          <td className="tnum" style={{padding:'13px 0',textAlign:'right',color:'var(--muted-2)',fontStyle:'italic'}}>—</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td style={{padding:'13px 0',color:'var(--ink)',fontWeight:500,fontStyle:'italic'}}>Total</td>
                      <td className="tnum" style={{padding:'13px 0',textAlign:'right',fontWeight:500}}>{fmtN(RESETTLEMENT.reduce((s,x)=>s+x.v,0))}</td>
                      <td className="tnum" style={{padding:'13px 0',textAlign:'right',color:'var(--muted)'}}>100%</td>
                      <td className="tnum" style={{padding:'13px 0',textAlign:'right',color:'var(--muted-2)'}}>—</td>
                    </tr>
                  </tbody>
                </table>
              )}
              <div className="uc" style={{color:'var(--muted-2)',marginTop:14}}>Source: Home Office · Res_D01</div>
            </div>
            <div style={{background:'var(--bg-3)',borderLeft:'2px solid var(--accent)',padding:'24px 26px'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:500,color:'var(--ink)',marginBottom:14}}>
                What the numbers mean
              </div>
              <p className="method-dropcap" style={{fontSize:14.5,lineHeight:1.6,color:'var(--ink-2)',margin:'0 0 14px',textWrap:'pretty'}}>
                The five schemes on the left are the main routes for people arriving as refugees <em>by invitation</em> — distinct from those who claim asylum after arrival. Together they brought around 12,400 people to the UK in 2024.
              </p>
              <p style={{fontSize:14.5,lineHeight:1.6,color:'var(--ink-2)',margin:'0 0 14px',textWrap:'pretty'}}>
                ACRS and ARAP continue to dominate — both are the legacy of the 2021 Afghan evacuation. The Ukraine schemes are winding down as their successor, the <em>Ukraine Permission Extension</em>, moves people onto domestic visas.
              </p>
              <div style={{marginTop:20,paddingTop:18,borderTop:'1px dotted var(--rule-2)',display:'flex',justifyContent:'space-between',fontSize:12.5,color:'var(--muted)'}}>
                <span className="uc"><span className="tick tick-accent"/>Read: Resettlement explained</span>
                <span className="ulh" style={{color:'var(--accent)',cursor:'pointer'}}>Full story →</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

// Dual-handle year-range slider with ticks, preset chips, and a promoted selection label.
// Replaces the pair of overlapping native <input type="range"> sliders — those had no
// visible selected segment, no ticks, and the active years were easy to misread.
function FilterRange({ range, setRange, min, max }) {
  const svgRef = uRD(null);
  const dragRef = uRD(null);
  const width = 460;
  const pad = 14;
  const trackY = 18;
  const trackW = width - pad * 2;
  const yToX = y => pad + ((y - min) / (max - min)) * trackW;
  const xToY = x => Math.round(min + ((x - pad) / trackW) * (max - min));

  const setFromPointer = (e) => {
    if (!dragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = Math.max(min, Math.min(max, xToY(x)));
    if (dragRef.current === 'start') setRange([Math.min(y, range[1] - 1), range[1]]);
    else setRange([range[0], Math.max(y, range[0] + 1)]);
  };
  const endDrag = () => { dragRef.current = null; };

  uED(() => {
    window.addEventListener('pointermove', setFromPointer);
    window.addEventListener('pointerup', endDrag);
    return () => {
      window.removeEventListener('pointermove', setFromPointer);
      window.removeEventListener('pointerup', endDrag);
    };
  }, [range]);

  const onTickClick = (y) => () => {
    // Click a tick to move the nearer handle there.
    const dStart = Math.abs(y - range[0]);
    const dEnd = Math.abs(y - range[1]);
    if (dStart <= dEnd) setRange([Math.min(y, range[1] - 1), range[1]]);
    else setRange([range[0], Math.max(y, range[0] + 1)]);
  };

  const presets = [
    { label: 'Last 3y',    r: [max - 2, max] },
    { label: 'Since 2018', r: [2018, max] },
    { label: 'Since 2020', r: [2020, max] },
    { label: 'All time',   r: [min, max] },
  ];
  const isActive = (p) => p.r[0] === range[0] && p.r[1] === range[1];

  const years = [];
  for (let y = min; y <= max; y++) years.push(y);

  return (
    <div>
      <div style={{fontFamily:'var(--serif)',fontSize:17,color:'var(--ink)',marginBottom:10,letterSpacing:-0.1}}>
        Showing <span className="tnum" style={{fontWeight:500}}>{range[0]}–{range[1]}</span>
        <span style={{color:'var(--muted-2)',fontSize:13,marginLeft:8,fontStyle:'italic'}}>
          {range[1] - range[0] + 1} year{range[1]-range[0]===0?'':'s'}
        </span>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
        {presets.map(p => (
          <button key={p.label} onClick={()=>setRange(p.r)} style={{
            fontSize:11.5,padding:'4px 10px',fontFamily:'var(--serif)',
            background: isActive(p) ? 'var(--accent)' : 'transparent',
            color: isActive(p) ? 'var(--bg)' : 'var(--ink-2)',
            border: '1px solid ' + (isActive(p) ? 'var(--accent)' : 'var(--rule-2)'),
            cursor: 'pointer',
          }}>{p.label}</button>
        ))}
      </div>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${width} 52`} height={52}
           style={{display:'block',touchAction:'none',userSelect:'none'}}>
        <line x1={pad} x2={width-pad} y1={trackY} y2={trackY} stroke="var(--rule-2)" strokeWidth={3}/>
        <line x1={yToX(range[0])} x2={yToX(range[1])} y1={trackY} y2={trackY} stroke="var(--accent)" strokeWidth={3}/>
        {years.map(y => {
          const x = yToX(y);
          const inRange = y >= range[0] && y <= range[1];
          const isHandle = y === range[0] || y === range[1];
          const showLabel = (y === min || y === max || y % 2 === 0) && !isHandle;
          const anchor = y === min ? 'start' : y === max ? 'end' : 'middle';
          return (
            <g key={y} onClick={onTickClick(y)} style={{cursor:'pointer'}}>
              <rect x={x-4} y={trackY-8} width={8} height={16} fill="transparent"/>
              <line x1={x} x2={x} y1={trackY-5} y2={trackY+5}
                    stroke={inRange ? 'var(--accent)' : 'var(--muted-2)'} strokeWidth={1}/>
              {showLabel && (
                <text x={x} y={trackY+22} fontSize={10} textAnchor={anchor}
                      fill={inRange ? 'var(--ink-2)' : 'var(--muted-2)'}
                      style={{letterSpacing:0.04}}>{y}</text>
              )}
            </g>
          );
        })}
        {['start','end'].map(which => {
          const y = range[which==='start'?0:1];
          return (
            <circle key={which} cx={yToX(y)} cy={trackY} r={8}
                    fill="#fff" stroke="var(--accent)" strokeWidth={2}
                    style={{cursor:'grab'}}
                    onPointerDown={(e)=>{e.preventDefault(); dragRef.current = which;}}>
              <title>{which==='start'?'Start year':'End year'}: {y}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

// Section header with coloured rule
function DashSectionHeader({ kicker, title, accent, cadence }) {
  return (
    <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:18,paddingBottom:12,borderBottom:`1px solid var(--rule)`}}>
      <div>
        <div className="uc" style={{color:accent,display:'inline-block',paddingBottom:6,borderBottom:`2px solid ${accent}`,marginBottom:10}}>{kicker}</div>
        <h2 style={{fontFamily:'var(--serif)',fontSize:26,fontWeight:500,letterSpacing:-0.2,margin:0,color:'var(--ink)'}}>{title}</h2>
      </div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
        {cadence && <div className="uc" style={{color:'var(--muted-2)',fontSize:10.5,border:'1px solid var(--rule-2)',padding:'2px 7px',background:'var(--bg-2)'}}>{cadence}</div>}
        <div className="uc" style={{color:'var(--muted)'}}>↓ Export section</div>
      </div>
    </div>
  );
}

function ChannelDeathsCard() {
  const annual = typeof DEATHS_ANNUAL !== 'undefined' ? DEATHS_ANNUAL : [];
  const meta = typeof DEATHS_META !== 'undefined' ? DEATHS_META : null;
  const pending = !annual.length || !meta || meta.pending;
  const latest = annual[annual.length - 1];
  const prior = annual[annual.length - 2];
  const delta = latest && prior && prior.total > 0
    ? ((latest.total - prior.total) / prior.total) * 100 : null;
  const spark = annual.map(r => ({ y: r.y, v: r.total }));
  return (
    <DashFrame number="03a" kickerColor="var(--accent-warn)"
      title="Channel deaths · recorded by IOM"
      sub={pending ? 'Pending first IOM fetch' : `English Channel · ${annual[0]?.y}–${latest.y}`}
      source="IOM Missing Migrants Project">
      {pending ? (
        <div style={{padding:'36px 0',color:'var(--muted-2)',fontStyle:'italic',fontSize:13.5,maxWidth:720,lineHeight:1.6}}>
          Pending first pull from the IOM Missing Migrants Project. Run
          <code style={{margin:'0 4px',fontSize:12.5}}>scripts/fetch_deaths.py</code>
          then <code style={{margin:'0 4px',fontSize:12.5}}>scripts/build_deaths.py</code>.
          Cited as IOM, not Home Office, since IOM is the authority for this figure.
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:28,alignItems:'center'}}>
          <div>
            <div className="uc" style={{color:'var(--muted)',marginBottom:6}}>{latest.y} total</div>
            <div className="tnum" style={{fontFamily:'var(--serif)',fontSize:42,fontWeight:500,color:'var(--ink)',lineHeight:1}}>
              {(latest.total).toLocaleString()}
            </div>
            <div style={{fontSize:12.5,color:'var(--muted)',marginTop:6}}>
              {latest.dead.toLocaleString()} dead · {latest.missing.toLocaleString()} missing
            </div>
            {delta != null && (
              <div style={{fontSize:12.5,marginTop:10,color: delta < 0 ? 'var(--accent-2)' : 'var(--accent-warn)',fontStyle:'italic'}}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}% vs {prior.y}
              </div>
            )}
          </div>
          <div>
            <Spark data={spark} width={460} height={78} stroke="var(--accent-warn)" area/>
            <div style={{marginTop:10,fontSize:12.5,color:'var(--muted)',lineHeight:1.55,maxWidth:460}}>
              Annual totals of deaths and disappearances recorded on the English Channel route. IOM records only incidents it can verify from media, NGO or official sources — undercount is likely.
            </div>
          </div>
        </div>
      )}
    </DashFrame>
  );
}

function SupportTiersCard({ tiers }) {
  const rows = [
    { key:'s95', label:'Section 95', sub:'accommodation + subsistence while awaiting a decision', v:tiers.s95 },
    { key:'s98', label:'Section 98', sub:'emergency support while an S95 claim is assessed',       v:tiers.s98 },
    { key:'s4',  label:'Section 4',  sub:'support for failed claimants unable to leave the UK',     v:tiers.s4  },
  ];
  const total = tiers.total || rows.reduce((s,r)=>s+r.v,0);
  const palette = ['var(--accent)', 'var(--accent-warn)', 'var(--accent-2)'];
  return (
    <div>
      <div style={{display:'flex',width:'100%',height:14,border:'1px solid var(--rule)',background:'var(--bg-2)',marginBottom:18}}>
        {rows.map((r,i) => (
          <div key={r.key} style={{width:`${(r.v/total)*100}%`,background:palette[i]}} title={`${r.label}: ${r.v.toLocaleString()}`}/>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:18}}>
        {rows.map((r,i) => (
          <div key={r.key} style={{borderTop:`2px solid ${palette[i]}`,paddingTop:12}}>
            <div className="uc" style={{color:'var(--muted)',marginBottom:6}}>{r.label}</div>
            <div className="tnum" style={{fontFamily:'var(--serif)',fontSize:30,fontWeight:500,color:'var(--ink)',lineHeight:1.1}}>{r.v.toLocaleString()}</div>
            <div className="tnum" style={{fontSize:12.5,color:'var(--muted)',marginTop:4}}>{total ? Math.round((r.v/total)*100) : 0}% of total</div>
            <div style={{fontSize:12.5,color:'var(--muted)',marginTop:8,lineHeight:1.5}}>{r.sub}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:14,paddingTop:12,borderTop:'1px dotted var(--rule-2)',fontSize:12.5,color:'var(--muted)'}}>
        Total: {total.toLocaleString()} people — matches the regional sum in figure 12 by construction.
      </div>
    </div>
  );
}

// Scrollable full-nationalities table with sortable columns
function NationalitiesTable({ data }) {
  const [sortBy, setSortBy] = uSD('v');
  const [asc, setAsc] = uSD(false);
  const [query, setQuery] = uSD('');
  const [region, setRegion] = uSD('all');

  if (!data || !data.length) {
    return (
      <div style={{padding:'48px 0',textAlign:'center',color:'var(--muted-2)',fontSize:13,fontStyle:'italic',border:'1px dashed var(--rule-2)'}}>
        Data pending — NAT_FULL not yet loaded
      </div>
    );
  }

  // All regions from REGION_MAP — 'Other / Unclassified' bucket covers names
  // missing from the map. Built once per render from the data slice so the
  // filter dropdown only lists regions present in the current dataset.
  const regionOptions = uMD(() => {
    const set = new Set();
    data.forEach(r => set.add(REGION_MAP[r.name] ?? 'Other / Unclassified'));
    return Array.from(set).sort();
  }, [data]);

  // Apply text + region filter, then sort.
  const filtered = uMD(() => {
    const q = query.trim().toLowerCase();
    return data.filter(r => {
      const rg = REGION_MAP[r.name] ?? 'Other / Unclassified';
      if (region !== 'all' && rg !== region) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, query, region]);

  const sorted = [...filtered].sort((a,b) => {
    const av = a[sortBy], bv = b[sortBy];
    if (typeof av === 'string') return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    return asc ? av - bv : bv - av;
  });

  // Axis for the inline grant-rate bar — fixed at 1.0 so the bar reads as a
  // share of all decisions, not a relative share within the visible rows.
  const grantBarColour = g => g == null ? 'var(--muted-2)' : g >= 0.6 ? 'var(--accent-2)' : g >= 0.35 ? 'var(--accent-gold)' : 'var(--accent-warn)';

  const click = (col) => () => {
    if (sortBy === col) setAsc(!asc);
    else { setSortBy(col); setAsc(col === 'name'); }
  };
  const arrow = (col) => sortBy===col ? (asc?' ↑':' ↓') : '';

  return (
    <div style={{marginTop:12}}>
      {/* Filter row — text search + region pick */}
      <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center',flexWrap:'wrap'}}>
        <input type="search" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Find a nationality…"
          style={{flex:'1 1 140px',minWidth:120,padding:'5px 10px',fontSize:12.5,border:'1px solid var(--rule)',background:'var(--bg)',color:'var(--ink)',fontFamily:'var(--serif)',outline:'none'}}/>
        <select value={region} onChange={e => setRegion(e.target.value)}
          style={{padding:'5px 8px',fontSize:12,border:'1px solid var(--rule)',background:'var(--bg)',color:'var(--ink-2)',fontFamily:'var(--serif)'}}>
          <option value="all">All regions</option>
          {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="uc" style={{color:'var(--muted-2)',fontSize:10.5}}>{sorted.length} of {data.length}</span>
      </div>

      <div style={{maxHeight:260,overflowY:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,tableLayout:'fixed'}}>
          <colgroup>
            <col style={{width:'44%'}}/>
            <col style={{width:'20%'}}/>
            <col style={{width:'36%'}}/>
          </colgroup>
          <thead style={{position:'sticky',top:0,background:'#fff'}}>
            <tr>
              <th className="uc" onClick={click('name')} style={{textAlign:'left',padding:'6px 8px 6px 0',fontWeight:500,color:'var(--muted)',borderBottom:'1px solid var(--rule)',cursor:'pointer',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Nationality{arrow('name')}</th>
              <th className="uc" onClick={click('v')}    style={{textAlign:'right',padding:'6px 0',fontWeight:500,color:'var(--muted)',borderBottom:'1px solid var(--rule)',cursor:'pointer'}}>Apps{arrow('v')}</th>
              <th className="uc" onClick={click('grant')}style={{textAlign:'right',padding:'6px 0 6px 16px',fontWeight:500,color:'var(--muted)',borderBottom:'1px solid var(--rule)',cursor:'pointer'}}>Grant{arrow('grant')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r,i)=>(
              <tr key={r.name} style={{borderBottom:'1px dotted var(--rule)'}}>
                <td style={{padding:'5px 8px 5px 0',color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}} title={r.name}>{r.name}</td>
                <td className="tnum" style={{padding:'5px 0',textAlign:'right'}}>{fmtN(r.v)}</td>
                <td style={{padding:'5px 0 5px 16px',textAlign:'right'}}>
                  {r.grant != null ? (
                    <div style={{display:'inline-flex',alignItems:'center',gap:6,justifyContent:'flex-end',width:'100%'}}>
                      <div style={{position:'relative',width:56,height:8,background:'var(--bg-2)'}} title={`${Math.round(r.grant*100)}%`}>
                        <div style={{position:'absolute',inset:0,width:`${Math.min(100, r.grant*100)}%`,background:grantBarColour(r.grant)}}/>
                      </div>
                      <span className="tnum" style={{color:'var(--muted)',fontSize:11,minWidth:30,textAlign:'right'}}>{Math.round(r.grant*100)}%</span>
                    </div>
                  ) : (
                    <span className="tnum" style={{color:'var(--muted-2)'}}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Framed figure card with number + coloured kicker
// Resettlement schemes — acronym expansions, eligibility summary, status, and
// gov.uk link. Kept here rather than pipeline-generated because these facts
// change rarely and aren't in the source ODS.
const SCHEME_INFO = {
  'ACRS': {
    full: 'Afghan Citizens Resettlement Scheme',
    eligibility: 'Afghan nationals at risk after the 2021 evacuation — three pathways (evacuees, UNHCR referrals, at-risk groups).',
    status: 'Open',
    url: 'https://www.gov.uk/guidance/afghan-citizens-resettlement-scheme',
  },
  'ARAP': {
    full: 'Afghan Relocations and Assistance Policy',
    eligibility: 'Afghans who worked for or with HM Government in Afghanistan and their families.',
    status: 'Closed to new principal applications (Dec 2024); family reunion continues.',
    url: 'https://www.gov.uk/guidance/the-afghan-relocations-and-assistance-policy',
  },
  'UK Resettlement Scheme': {
    full: 'UK Resettlement Scheme (UKRS)',
    eligibility: 'Refugees referred by UNHCR, prioritising the most vulnerable. Replaced VPRS in 2021.',
    status: 'Open',
    url: 'https://www.gov.uk/government/publications/uk-resettlement-scheme-factsheet',
  },
  'Community Sponsorship': {
    full: 'Community Sponsorship Scheme',
    eligibility: 'Refugees matched to community groups that provide housing and integration support for the first year.',
    status: 'Open',
    url: 'https://www.gov.uk/government/publications/apply-for-full-community-sponsor-status',
  },
  'Mandate Scheme': {
    full: 'Mandate Resettlement Scheme',
    eligibility: 'Refugees anywhere in the world with a close family member settled in the UK willing to accommodate them.',
    status: 'Open',
    url: 'https://www.gov.uk/government/publications/mandate-refugee-programme-policy-and-process',
  },
  'Afghan Resettlement Programme': {
    full: 'Afghan Resettlement Programme (ARP)',
    eligibility: 'Umbrella programme from 2024 consolidating ACRS and ARAP delivery. No new pathways beyond its constituents.',
    status: 'Programme ongoing',
    url: 'https://www.gov.uk/government/publications/afghan-resettlement-programme-consolidation',
  },
};

function resolveSchemeKey(name) {
  if (SCHEME_INFO[name]) return name;
  const n = name.toUpperCase();
  if (n.startsWith('ACRS')) return 'ACRS';
  if (n.startsWith('ARAP')) return 'ARAP';
  if (n.startsWith('UKRS') || n.startsWith('UK RESETTLEMENT')) return 'UK Resettlement Scheme';
  if (n.startsWith('COMMUNITY')) return 'Community Sponsorship';
  if (n.startsWith('MANDATE')) return 'Mandate Scheme';
  if (n.startsWith('AFGHAN RESETTLEMENT')) return 'Afghan Resettlement Programme';
  return name;
}

function SchemeCell({ name, colorIdx }) {
  const key = resolveSchemeKey(name);
  const info = SCHEME_INFO[key];
  const tip = info ? `${info.full}\nEligibility: ${info.eligibility}\nStatus: ${info.status}` : null;
  return (
    <td style={{padding:'13px 0',color:'var(--ink)'}}>
      <span className="tick" style={{background:['var(--accent)','var(--accent-2)','var(--accent-warn)','var(--accent-gold)','var(--muted)','var(--muted-2)'][colorIdx%6]}}/>
      <span style={{fontWeight:500}}>{name}</span>
      {info && (
        <>
          {info.full !== name && (
            <div style={{fontSize:11.5,color:'var(--muted)',fontStyle:'italic',marginTop:2,marginLeft:22,lineHeight:1.4}}>
              {info.full}
            </div>
          )}
          <div style={{fontSize:11,color:'var(--muted-2)',marginTop:3,marginLeft:22,display:'flex',gap:10,alignItems:'center'}}>
            <span title={tip} style={{cursor:'help',borderBottom:'1px dotted var(--muted-2)'}}>{info.status}</span>
            <a href={info.url} target="_blank" rel="noopener noreferrer" style={{color:'var(--accent)',textDecoration:'none'}}>gov.uk ↗</a>
          </div>
        </>
      )}
    </td>
  );
}

function DashFrame({ number, kickerColor, title, sub, children, style={}, forkPreset=null, setRoute=null }) {
  // Fork to Build-a-chart, pre-selecting a dataset / overlay / granularity.
  // `forkPreset` is a partial config keyed like BuildView's URL hash:
  // { d: 'applications', g: 'annual', ct: 'line', o: 'boats', r: '2018-2025' }.
  const openInBuild = forkPreset && setRoute ? () => {
    try {
      const parts = Object.entries(forkPreset)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
      if (parts.length) history.replaceState(null, '', '#' + parts.join('&'));
    } catch (_) { /* ignore */ }
    setRoute({ name: 'build' });
  } : null;
  return (
    <div style={{background:'#fff',border:'1px solid var(--rule)',padding:'22px 26px 24px',position:'relative',...style}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,paddingBottom:12,borderBottom:'1px solid var(--rule)',gap:16}}>
        <div style={{flex:'1 1 auto',minWidth:0}}>
          <div style={{fontSize:10.5,letterSpacing:0.12,textTransform:'uppercase',color:kickerColor,fontWeight:500,display:'inline-block',paddingBottom:4,borderBottom:`1.5px solid ${kickerColor}`,marginBottom:10}}>Fig. {number}</div>
          <div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:500,color:'var(--ink)',letterSpacing:-0.1,lineHeight:1.25}}>{title}</div>
          {sub && <div style={{fontSize:12.5,color:'var(--muted)',marginTop:6,fontStyle:'italic',lineHeight:1.4}}>{sub}</div>}
          {openInBuild && (
            <button onClick={openInBuild}
              className="ulh"
              style={{display:'inline-block',marginTop:8,fontSize:11,color:'var(--accent)',textTransform:'none',letterSpacing:0}}
              title="Open this chart's dataset in Build-a-chart">
              ↗ Fork in Build-a-chart
            </button>
          )}
        </div>
        <div style={{display:'flex',gap:10,fontSize:11,color:'var(--muted-2)',flex:'0 0 auto',paddingTop:2}} className="uc">
          <span className="pressable" style={{cursor:'pointer'}}>↓</span>
          {openInBuild ? (
            <span className="pressable" style={{cursor:'pointer'}} onClick={openInBuild} title="Fork in Build-a-chart">⇢</span>
          ) : (
            <span className="pressable" style={{cursor:'pointer',opacity:0.5}}>⇢</span>
          )}
          <span className="pressable" style={{cursor:'pointer'}}>⎘</span>
        </div>
      </div>
      {children}
    </div>
  );
}

Object.assign(window, { DashboardView });
