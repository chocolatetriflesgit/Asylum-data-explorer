// dashboard-view.jsx — synchronised dashboard with pride-of-place KPIs + charts + tables

const { useState: uSD, useMemo: uMD, useRef: uRD, useEffect: uED } = React;

function DashboardView({ setRoute }) {
  const [range, setRange] = uSD([2018, DATA_MAX_YEAR]);
  const [focus, setFocus] = uSD('all'); // all | applications | decisions | geography

  const filteredAnnual = uMD(()=>ASYLUM_ANNUAL.filter(d => d.y >= range[0] && d.y <= range[1]), [range]);
  const latest = ASYLUM_ANNUAL[ASYLUM_ANNUAL.length - 1];
  const prev = ASYLUM_ANNUAL[ASYLUM_ANNUAL.length - 2];
  // Range-aware headline values — cards track the selected window, not just the overall latest year.
  const rangeLatest = filteredAnnual.length ? filteredAnnual[filteredAnnual.length - 1] : latest;
  const rangePrev   = filteredAnnual.length > 1 ? filteredAnnual[filteredAnnual.length - 2] : null;
  const pctChange   = (rangePrev && rangePrev.v > 0) ? ((rangeLatest.v - rangePrev.v) / rangePrev.v * 100).toFixed(1) : null;
  // Use pipeline-generated BACKLOG_LATEST when available; fall back to legacy BACKLOG.
  const backlogData = (typeof BACKLOG_LATEST !== 'undefined' && BACKLOG_LATEST.length)
    ? BACKLOG_LATEST : BACKLOG;
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
  const interceptionsWeekly = boatsWeekly
    .filter(w => w.e != null)
    .map((w, i) => ({ y: i, v: w.e, label: w.we }));
  const interceptionsFirstWe = interceptionsWeekly[0]?.label ?? null;
  const interceptionsLastWe = interceptionsWeekly[interceptionsWeekly.length - 1]?.label ?? null;

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
  const returnsCard = returnsData ? {
    enforced: returnsData.reduce((s,r) => s + (r.enforced||0), 0),
    voluntary: returnsData.reduce((s,r) => s + (r.voluntary||0), 0),
    total: returnsData.reduce((s,r) => s + (r.total||0), 0),
    year: returnsMeta?.year ?? '—',
  } : null;

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
      <div style={{borderBottom:'1px solid var(--rule)',paddingBottom:22,marginBottom:28,display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:40,flexWrap:'wrap'}}>
        <div>
          <div className="kicker-rule" style={{color:'var(--accent-warn)',fontSize:11,letterSpacing:0.1,textTransform:'uppercase',fontWeight:500}}>Live dashboard · Q1 2026</div>
          <h1 style={{fontFamily:'var(--serif)',fontSize:42,letterSpacing:-0.4,fontWeight:400,margin:'6px 0 10px'}}>Asylum &amp; resettlement at a glance</h1>
          <p style={{fontSize:15.5,color:'var(--ink-2)',maxWidth:680,margin:0,lineHeight:1.5}}>
            Eight key figures, six charts, and the regional table — all driven by a single time-range filter. Updated when the Home Office releases its quarterly figures.
          </p>
        </div>
        <div style={{minWidth:480,flex:'0 1 520px'}}>
          <div className="uc" style={{color:'var(--muted)',marginBottom:6}}>
            <span className="tick tick-accent"/>Time range
          </div>
          <FilterRange range={range} setRange={setRange} min={2014} max={DATA_MAX_YEAR}/>
        </div>
      </div>

      {/* KPI strip row 1 — Small boat arrivals · Preventions · Applications · Initial decisions · Appeals allowed */}
      <section style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14,marginBottom:14}}>
        {[
          boatsRangeLatest
            ? { cls:'', label:`Small-boat arrivals · ${boatsRangeLatest.y}`, v:fmtN(boatsRangeLatest.m),
                d: boatsPct!=null ? `${+boatsPct>=0?'+':''}${boatsPct}% vs ${boatsRangePrev?.y??''}` : `${boatsRangeLatest.y} only`,
                dPos: boatsPct!=null ? +boatsPct<0 : null }
            : { cls:'', label:'Small-boat arrivals', v:'—', d:'No data in range', pending:true },
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
            return { cls:'accent', label:'Resettled under schemes', v:fmtN(total), d:'Across 5 programmes'};
          })(),
          topNatCard
            ? { cls:'gold', label:`Top nationality · ${topNatCard.quarter}`, v:topNatCard.name,
                d: topNatCard.share!=null ? `${fmtN(topNatCard.v)} · ${topNatCard.share}% of total` : `${fmtN(topNatCard.v)} apps`, pending:false }
            : { cls:'gold', label:'Top nationality · Q-o-Q', v:'—', d:'Data pending', pending:true },
          hotelsCard
            ? { cls:'ink', label:`In asylum hotels · ${hotelsCard.date}`, v:fmtN(hotelsCard.persons_in_hotels), d: hotelsCard.delta==null ? 'latest snapshot' : `${hotelsCard.delta>=0?'+':''}${hotelsCard.delta.toFixed(1)}% vs prior`, pending:false }
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
              ? { cls:'ink', label:`Returns · ${returnsCard.year}`, v:fmtN(returnsCard.total), d:`${fmtN(returnsCard.enforced)} enforced · ${fmtN(returnsCard.voluntary)} voluntary` }
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

      {/* Section focus — placed after KPIs so the numbers are visible before the user filters */}
      <div style={{display:'flex',alignItems:'center',gap:10,margin:'28px 0',paddingTop:24,paddingBottom:24,borderTop:'1px solid var(--rule)',borderBottom:'1px solid var(--rule)',flexWrap:'wrap'}}>
        <span className="uc" style={{color:'var(--muted)',marginRight:4}}>Jump to</span>
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

      {/* Provisional last-7-days strip — daily gov.uk update between weekly ODS releases. */}
      {provisional && provisionalDays.length > 0 && (focus === 'all' || focus === 'applications') && (
        <section style={{marginBottom:36,padding:'18px 22px',border:'1px dashed var(--rule-2)',background:'var(--bg-2)',borderRadius:4}}>
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
          <div style={{fontSize:11.5,color:'var(--muted)',marginTop:10,fontStyle:'italic'}}>
            Daily figures from gov.uk provisional page. Faded cells have been verified by the weekly ODS. Hover a cell for details.
          </div>
        </section>
      )}

      {/* Main chart grid — 2 columns */}
      {(focus === 'all' || focus === 'applications') && (
        <section style={{marginBottom:44}}>
          <DashSectionHeader kicker="Applications and journeys" title="Volume and composition" accent="var(--accent-warn)" cadence="Annual · boats weekly"/>
          <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:20}}>
            <DashFrame number="01" kickerColor="var(--accent-warn)" title="Asylum applications" sub={`UK · ${range[0]}–${range[1]}`}>
              <LineChart data={ASYLUM_ANNUAL} yearRange={range} width={720} height={280}
                annotations={[
                  range[0] <= 2023 && range[1] >= 2023 && { y:2023, label:'84,425', dx:-90, dy:-14 }
                ].filter(Boolean)}
                source="Home Office · ASY_D01"/>
            </DashFrame>
            <DashFrame number="02" kickerColor="var(--accent-2)" title="Small-boat arrivals" sub={`UK · ${range[0]}–${range[1]}`}>
              {(() => {
                const boatsAnnual = (typeof BOATS_ANNUAL !== 'undefined' && BOATS_ANNUAL.length)
                  ? BOATS_ANNUAL.map(d => ({ y: d.y, v: d.m }))
                  : ASYLUM_ANNUAL.map(d => ({ y: d.y, v: d.boats }));
                const latestDate = (typeof BOATS_META !== 'undefined' && BOATS_META.latestDataPoint)
                  || (typeof BOATS_RECORDS !== 'undefined' && BOATS_RECORDS.latestDate)
                  || null;
                const partialYear = latestDate ? Number(latestDate.slice(0,4)) : null;
                const partialLabel = latestDate
                  ? `${partialYear} YTD (to ${new Date(latestDate + 'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short'})})`
                  : null;
                return (
                  <LineChart data={boatsAnnual} yearRange={range}
                    stroke="var(--accent-warn)" width={520} height={280}
                    annotations={partialYear && range[0] <= partialYear && range[1] >= partialYear ? [
                      { y: partialYear, label: partialLabel, dx: -90, dy: -14 }
                    ] : []}
                    source="Home Office · SB_01"/>
                );
              })()}
            </DashFrame>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:20,marginTop:20}}>
            <DashFrame number="03" kickerColor="var(--accent-gold)" title="Top five nationalities"
              sub={`2020–${(typeof NAT_SERIES_META !== 'undefined' ? NAT_SERIES_META.year_end : NAT_SERIES.years[NAT_SERIES.years.length-1])}`}>
              {(() => { const ns = (typeof NAT_SERIES_LATEST !== 'undefined') ? NAT_SERIES_LATEST : NAT_SERIES;
                return <MultiLineChart years={ns.years} series={ns.series} width={760} height={260}/>; })()}
            </DashFrame>
            <DashFrame number="03a" kickerColor="var(--accent-2)" title="All nationalities" sub={natFull ? `${natFull.length} nationalities, latest year` : 'Data pending'}>
              <NationalitiesTable data={natFull}/>
            </DashFrame>
          </div>
          {interceptionsWeekly.length > 0 && (
            <DashFrame number="04" kickerColor="var(--accent)" title="Weekly interceptions" sub={`Border Force events · ${interceptionsFirstWe}–${interceptionsLastWe}`} style={{marginTop:20}}>
              <LineChart data={interceptionsWeekly} width={1120} height={220}
                stroke="var(--accent)" area={true} showLine={true}
                xLabelFmt={(_, i, p) => p?.label ? p.label.slice(0,7) : ''}
                caption="Events in which Border Force prevented a crossing in progress. Weekly totals; preventions counted separately (see KPI strip)."
                source="Home Office · SB_02"/>
            </DashFrame>
          )}
        </section>
      )}

      {(focus === 'all' || focus === 'decisions') && (
        <section style={{marginBottom:44}}>
          <DashSectionHeader kicker="Decisions" title="Outcomes and the backlog" accent="var(--accent-2)" cadence="Quarterly"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <DashFrame number="04" kickerColor="var(--accent-warn)" title={`Initial decisions, ${decisionsYear}`} sub="Share of substantive outcomes">
              <StackedBar data={decisionsData} width={600} height={110}/>
              <div style={{marginTop:18,display:'grid',gridTemplateColumns:'auto 1fr',gap:12,alignItems:'center'}}>
                <Ring value={grantRate} size={110} stroke={12} label="Grant rate" sub={`${decisionsYear}`}/>
                <div style={{fontSize:14,lineHeight:1.5,color:'var(--ink-2)',textWrap:'pretty'}}>
                  {Math.round(grantRate*100)}% of all decided cases in {decisionsYear} resulted in a grant of protection — up from 24% in 2019. The shift reflects changes in nationality composition (Afghan and Sudanese claims have very high grant rates).
                </div>
              </div>
            </DashFrame>
            <DashFrame number="05" kickerColor="var(--accent-gold)" title="Pending cases (backlog)"
              sub={`${range[0]}–${range[1]}${backlogMeta ? ` · 31 Dec snapshots · Asy_D03` : ''}`}>
              <LineChart data={filteredBacklog} yearRange={range} width={560} height={260}
                stroke="var(--accent-gold)"
                annotations={[
                  range[0] <= 2022 && range[1] >= 2022 && { y:2022, label:'Peak 132k', dx:-80, dy:-10 },
                ].filter(Boolean)}
                source="Home Office · Asy_D03"/>
            </DashFrame>
          </div>
        </section>
      )}

      {(focus === 'all' || focus === 'geography') && (
        <section style={{marginBottom:44}}>
          <DashSectionHeader kicker="Geography" title="Asylum seeker countries of origin and where they're housed" accent="var(--accent-gold)" cadence="Quarterly snapshot · hotels"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
            {(() => {
              const regData = (typeof SUPPORT_REGIONS !== 'undefined' && SUPPORT_REGIONS.length)
                ? SUPPORT_REGIONS : REGIONS;
              const regMeta = typeof SUPPORT_REGIONS_META !== 'undefined' ? SUPPORT_REGIONS_META : null;
              return (
                <DashFrame number="06" kickerColor="var(--accent-warn)"
                  title="Asylum seekers in receipt of Home Office support, by region"
                  sub={regMeta ? `UK regions · as at ${regMeta.date} · Asy_D11` : 'UK · 2024'}>
                  <BarChart data={regData} width={560} color="var(--accent)"/>
                  <div style={{marginTop:14,paddingTop:12,borderTop:'1px dotted var(--rule-2)',fontSize:12.5,lineHeight:1.6,color:'var(--muted)'}}>
                    Counts people receiving Section 95 support (accommodation and subsistence for destitute asylum seekers awaiting a decision), Section 98 (emergency support while a Section 95 application is assessed), or Section 4 (support for failed asylum seekers unable to leave the UK). This is where people are housed — not where claims were lodged.
                  </div>
                </DashFrame>
              );
            })()}
            <DashFrame number="07" kickerColor="var(--accent-2)" title="Top nationalities" sub={`All asylum applications · UK · ${natFullYear ?? 2024}`} tableSub="Grant rate from ASY_D02">
              <BarChart data={(natFull ?? TOP_NATIONALITIES).slice(0,8)} width={560} color="var(--accent-warn)" showGrant={true}/>
            </DashFrame>
          </div>
          {natFull && (
            <div style={{display:'grid',gridTemplateColumns:'1fr',gap:20}}>
              <DashFrame number="08" kickerColor="var(--accent-gold)" title="Applicants by region of origin" sub={`UK · ${natFullYear ?? ''} · grouped from ASY_D01`}>
                <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.3fr) minmax(260px,1fr)',gap:28,alignItems:'start'}}>
                  <WorldMapChoropleth data={groupNatByRegion(natFull)} width={720} height={380}/>
                  <RegionTable data={groupNatByRegion(natFull)} rows={natFull}/>
                </div>
              </DashFrame>
            </div>
          )}
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
              <div className="uc" style={{color:'var(--muted-2)',marginTop:14}}>Source: Home Office · RES_D01</div>
            </div>
            <div style={{border:'1px solid var(--rule)',background:'var(--bg-2)',padding:'26px 28px'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:500,color:'var(--ink)',marginBottom:14}} className="rule-terra" >
                <span style={{paddingBottom:8,display:'inline-block'}}>What the numbers mean</span>
              </div>
              <p style={{fontSize:14.5,lineHeight:1.6,color:'var(--ink-2)',margin:'0 0 14px',textWrap:'pretty'}}>
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
          const showLabel = y === min || y === max || y % 2 === 0;
          return (
            <g key={y} onClick={onTickClick(y)} style={{cursor:'pointer'}}>
              <rect x={x-4} y={trackY-8} width={8} height={16} fill="transparent"/>
              <line x1={x} x2={x} y1={trackY-5} y2={trackY+5}
                    stroke={inRange ? 'var(--accent)' : 'var(--muted-2)'} strokeWidth={1}/>
              {showLabel && (
                <text x={x} y={trackY+22} fontSize={10} textAnchor="middle"
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

// Scrollable full-nationalities table with sortable columns
function NationalitiesTable({ data }) {
  const [sortBy, setSortBy] = uSD('v');
  const [asc, setAsc] = uSD(false);

  if (!data || !data.length) {
    return (
      <div style={{padding:'48px 0',textAlign:'center',color:'var(--muted-2)',fontSize:13,fontStyle:'italic',border:'1px dashed var(--rule-2)'}}>
        Data pending — NAT_FULL not yet loaded
      </div>
    );
  }

  const sorted = [...data].sort((a,b) => {
    const av = a[sortBy], bv = b[sortBy];
    if (typeof av === 'string') return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    return asc ? av - bv : bv - av;
  });

  const click = (col) => () => {
    if (sortBy === col) setAsc(!asc);
    else { setSortBy(col); setAsc(col === 'name'); }
  };
  const arrow = (col) => sortBy===col ? (asc?' ↑':' ↓') : '';

  return (
    <div style={{maxHeight:260,overflowY:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
        <thead style={{position:'sticky',top:0,background:'#fff'}}>
          <tr>
            <th className="uc" onClick={click('name')} style={{textAlign:'left',padding:'6px 8px 6px 0',fontWeight:500,color:'var(--muted)',borderBottom:'1px solid var(--rule)',cursor:'pointer'}}>Nationality{arrow('name')}</th>
            <th className="uc" onClick={click('v')}    style={{textAlign:'right',padding:'6px 0',fontWeight:500,color:'var(--muted)',borderBottom:'1px solid var(--rule)',cursor:'pointer'}}>Apps{arrow('v')}</th>
            <th className="uc" onClick={click('grant')}style={{textAlign:'right',padding:'6px 0 6px 8px',fontWeight:500,color:'var(--muted)',borderBottom:'1px solid var(--rule)',cursor:'pointer'}}>Grant{arrow('grant')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r,i)=>(
            <tr key={r.name} style={{borderBottom:'1px dotted var(--rule)'}}>
              <td style={{padding:'5px 8px 5px 0',color:'var(--ink)'}}>{r.name}</td>
              <td className="tnum" style={{padding:'5px 0',textAlign:'right'}}>{fmtN(r.v)}</td>
              <td className="tnum" style={{padding:'5px 0 5px 8px',textAlign:'right',color:'var(--muted)'}}>{r.grant!=null ? Math.round(r.grant*100)+'%' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

function DashFrame({ number, kickerColor, title, sub, children, style={} }) {
  return (
    <div style={{background:'#fff',border:'1px solid var(--rule)',padding:'22px 26px 24px',position:'relative',...style}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,paddingBottom:12,borderBottom:'1px solid var(--rule)',gap:16}}>
        <div style={{flex:'1 1 auto',minWidth:0}}>
          <div style={{fontSize:10.5,letterSpacing:0.12,textTransform:'uppercase',color:kickerColor,fontWeight:500,display:'inline-block',paddingBottom:4,borderBottom:`1.5px solid ${kickerColor}`,marginBottom:10}}>Fig. {number}</div>
          <div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:500,color:'var(--ink)',letterSpacing:-0.1,lineHeight:1.25}}>{title}</div>
          {sub && <div style={{fontSize:12.5,color:'var(--muted)',marginTop:6,fontStyle:'italic',lineHeight:1.4}}>{sub}</div>}
        </div>
        <div style={{display:'flex',gap:10,fontSize:11,color:'var(--muted-2)',flex:'0 0 auto',paddingTop:2}} className="uc">
          <span className="pressable" style={{cursor:'pointer'}}>↓</span>
          <span className="pressable" style={{cursor:'pointer'}}>⇢</span>
          <span className="pressable" style={{cursor:'pointer'}}>⎘</span>
        </div>
      </div>
      {children}
    </div>
  );
}

Object.assign(window, { DashboardView });
