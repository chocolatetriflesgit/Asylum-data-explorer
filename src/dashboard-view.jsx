// dashboard-view.jsx — synchronised dashboard with pride-of-place KPIs + charts + tables

const { useState: uSD, useMemo: uMD } = React;

function DashboardView({ setRoute }) {
  const [range, setRange] = uSD([2018, DATA_MAX_YEAR]);
  const [focus, setFocus] = uSD('all'); // all | applications | decisions | geography

  const filteredAnnual = uMD(()=>ASYLUM_ANNUAL.filter(d => d.y >= range[0] && d.y <= range[1]), [range]);
  const latest = ASYLUM_ANNUAL[ASYLUM_ANNUAL.length - 1];
  const prev = ASYLUM_ANNUAL[ASYLUM_ANNUAL.length - 2];
  const pctChange = ((latest.v - prev.v) / prev.v * 100).toFixed(1);
  const boatsPct = ((latest.boats - prev.boats) / prev.boats * 100).toFixed(1);
  const filteredBacklog = uMD(()=>BACKLOG.filter(d => d.y >= range[0] && d.y <= range[1]), [range]);
  const decisionsTotal = DECISIONS_2024.reduce((s,d)=>s+d.v,0);
  const grantRate = (DECISIONS_2024[0].v + DECISIONS_2024[1].v) / decisionsTotal;

  // Preventions + interceptions (BOATS_WEEKLY.p / .e) — null before first reported week.
  const boatsWeekly = typeof BOATS_WEEKLY !== 'undefined' ? BOATS_WEEKLY : [];
  const preventionsYear = String(latest.y);
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
    return { name: top.name, v: now, delta, quarter: qs[lastIdx], prevQuarter: qs[prevIdx] };
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
        <div style={{minWidth:320}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            <span className="uc" style={{color:'var(--muted)'}}><span className="tick tick-accent"/>Filter range</span>
            <span className="uc tnum" style={{color:'var(--accent)'}}>{range[0]}–{range[1]}</span>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <input type="range" min={2014} max={DATA_MAX_YEAR} value={range[0]} onChange={e=>setRange([Math.min(+e.target.value, range[1]-1), range[1]])}/>
            <input type="range" min={2014} max={DATA_MAX_YEAR} value={range[1]} onChange={e=>setRange([range[0], Math.max(+e.target.value, range[0]+1)])}/>
          </div>
          <div style={{marginTop:14,display:'flex',gap:6,flexWrap:'wrap'}}>
            {[
              { id:'all', label:'All' },
              { id:'applications', label:'Applications and journeys' },
              { id:'decisions', label:'Decisions' },
              { id:'geography', label:'Geography' },
            ].map(f => (
              <button key={f.id} onClick={()=>setFocus(f.id)}
                style={{
                  fontSize:11.5,letterSpacing:0.04,padding:'5px 11px',
                  fontFamily:'var(--serif)',
                  background: focus===f.id ? 'var(--accent)' : '#fff',
                  color: focus===f.id ? 'var(--bg)' : 'var(--ink-2)',
                  border:'1px solid var(--rule-2)',
                }}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI strip — pride of place */}
      <section style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14,marginBottom:36}}>
        {[
          { cls:'accent', label:`Applications · ${latest.y}`, v:fmtN(latest.v),    d:`${pctChange}% vs ${prev.y}`, dPos:+pctChange<0 },
          { cls:'',       label:'Small-boat arrivals',     v:fmtN(latest.boats), d:`${boatsPct}% vs ${prev.y}`, dPos:+boatsPct<0 },
          { cls:'ink',    label:`Preventions · ${latest.y}`, v:fmtN(preventionsYearTotal), d:preventionsFirstWeek ? `since wk ending ${preventionsFirstWeek}` : 'provisional', dPos:true },
          { cls:'olive',  label:'Grant rate',               v:`${Math.round(grantRate*100)}%`,  d:'from 24% in 2019',   dPos:true },
          { cls:'gold',   label:'Backlog',                  v:fmtN(91200),        d:'↓ from 132k peak',    dPos:true },
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.cls}`}>
            <div className="uc" style={{color:'var(--muted)',marginBottom:12}}>{k.label}</div>
            <div style={{fontFamily:'var(--serif)',fontSize:42,fontWeight:400,letterSpacing:-0.4,lineHeight:1,color:'var(--ink)'}} className="tnum">{k.v}</div>
            <div style={{fontSize:13,color: k.dPos ? 'var(--accent-2)' : 'var(--accent-warn)',marginTop:10,fontStyle:'italic'}}>{k.d}</div>
          </div>
        ))}
      </section>

      {/* second row — secondary KPIs */}
      <section style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14,marginBottom:44,paddingBottom:36,borderBottom:'1px solid var(--rule)'}}>
        {[
          { cls:'ink',    label:'Initial decisions',        v:fmtN(decisionsTotal),  d:`${Math.round(DECISIONS_2024[0].v/decisionsTotal*100)}% granted asylum`, pending:false},
          { cls:'accent', label:'Resettled under schemes',  v:fmtN(12410),           d:'Across 5 programmes', pending:false},
          { cls:'olive',  label:'Appeals allowed',          v:'36%',                 d:'of 41k heard in 2024', pending:false},
          topNatCard
            ? { cls:'gold', label:`Top nationality · ${topNatCard.quarter}`, v:topNatCard.name, d: topNatCard.delta==null ? `${fmtN(topNatCard.v)} apps` : `${topNatCard.delta>=0?'+':''}${topNatCard.delta.toFixed(1)}% vs ${topNatCard.prevQuarter}`, pending:false }
            : { cls:'gold', label:'Top nationality · Q-o-Q',  v:'—',                   d:'Data pending', pending:true },
          hotelsCard
            ? { cls:'ink', label:`In asylum hotels · ${hotelsCard.date}`, v:fmtN(hotelsCard.persons_in_hotels), d: hotelsCard.delta==null ? 'latest snapshot' : `${hotelsCard.delta>=0?'+':''}${hotelsCard.delta.toFixed(1)}% vs prior`, pending:false }
            : { cls:'ink', label:'In asylum hotels',            v:'—',                   d:'Data pending', pending:true },
        ].map((k,i)=>(
          <div key={i} className={`kpi-card ${k.cls}`} style={k.pending?{opacity:0.6}:{}}>
            <div className="uc" style={{color:'var(--muted)',marginBottom:12}}>{k.label}</div>
            <div style={{fontFamily:'var(--serif)',fontSize: k.pending?24: (typeof k.v === 'string' && k.v.length>8 ? 22 : 32),fontWeight:400,letterSpacing:-0.3,lineHeight:1,color:'var(--ink)'}} className="tnum">{k.v}</div>
            <div style={{fontSize:12.5,color:'var(--muted)',marginTop:10,fontStyle:'italic'}}>{k.d}</div>
          </div>
        ))}
      </section>

      {/* Provisional last-7-days strip — daily gov.uk update between weekly ODS releases. */}
      {provisional && provisionalDays.length > 0 && (focus === 'all' || focus === 'applications') && (
        <section style={{
          marginBottom:36,padding:'18px 22px',border:'1px dashed var(--rule-2)',
          background:'var(--bg-2)',borderRadius:4,
        }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:12,gap:16,flexWrap:'wrap'}}>
            <div>
              <div className="uc" style={{color:'var(--accent-warn)',fontSize:11,letterSpacing:0.1,fontWeight:500}}>Last 7 days · provisional</div>
              <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>
                Daily gov.uk figures. Overlapping dates are superseded by the weekly ODS when it publishes; provisional-only days are still to be confirmed.
              </div>
            </div>
            <div style={{fontSize:12,color:'var(--muted)',fontStyle:'italic',textAlign:'right'}}>
              {provisionalMeta?.updatedAt ? `Updated ${new Date(provisionalMeta.updatedAt+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}` : ''}
              {canonicalLatest && <div>Canonical ODS through {canonicalLatest}</div>}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:8}}>
            {provisionalDays.map((d,i) => (
              <div key={d.d} style={{
                padding:'10px 10px 12px',
                background:'#fff',
                border: d.superseded ? '1px solid var(--rule)' : '1px dashed var(--accent-warn)',
                opacity: d.superseded ? 0.55 : 1,
              }}>
                <div className="uc" style={{fontSize:10.5,color:'var(--muted)',letterSpacing:0.1}}>{d.label}</div>
                <div className="tnum" style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:400,letterSpacing:-0.3,lineHeight:1.1,marginTop:6,color:'var(--ink)'}}>
                  {d.m.toLocaleString()}
                </div>
                <div style={{fontSize:11.5,color:'var(--muted-2)',marginTop:4}}>
                  {d.b} boat{d.b===1?'':'s'}{d.superseded ? ' · superseded' : ''}
                </div>
              </div>
            ))}
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
              <LineChart data={ASYLUM_ANNUAL.map(d=>({y:d.y,v:d.boats}))} yearRange={range}
                stroke="var(--accent-warn)" width={520} height={280}
                source="Home Office · IRR_D01"/>
            </DashFrame>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:20,marginTop:20}}>
            <DashFrame number="03" kickerColor="var(--accent-gold)" title="Top five nationalities" sub="2020–2024">
              <MultiLineChart years={NAT_SERIES.years} series={NAT_SERIES.series} width={760} height={260}/>
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
            <DashFrame number="04" kickerColor="var(--accent-warn)" title="Initial decisions, 2024" sub="Share of substantive outcomes">
              <StackedBar data={DECISIONS_2024} width={600} height={110}/>
              <div style={{marginTop:18,display:'grid',gridTemplateColumns:'auto 1fr',gap:12,alignItems:'center'}}>
                <Ring value={grantRate} size={110} stroke={12} label="Grant rate" sub="2024"/>
                <div style={{fontSize:14,lineHeight:1.5,color:'var(--ink-2)',textWrap:'pretty'}}>
                  Nearly half of all decided cases in 2024 resulted in a grant of protection — <em>double</em> the rate five years earlier. Most of the shift reflects changes in nationality composition (Afghan and Sudanese claims have very high grant rates).
                </div>
              </div>
            </DashFrame>
            <DashFrame number="05" kickerColor="var(--accent-gold)" title="Pending cases (backlog)" sub={`${range[0]}–${range[1]}`}>
              <LineChart data={BACKLOG} yearRange={range} width={560} height={260}
                stroke="var(--accent-gold)"
                annotations={[
                  range[0] <= 2023 && range[1] >= 2023 && { y:2023, label:'Peak 132k', dx:-80, dy:-10 },
                ].filter(Boolean)}
                source="Home Office · ASY_D02"/>
            </DashFrame>
          </div>
        </section>
      )}

      {(focus === 'all' || focus === 'geography') && (
        <section style={{marginBottom:44}}>
          <DashSectionHeader kicker="Geography" title="Where people apply, and where they're housed" accent="var(--accent-gold)" cadence="Quarterly snapshot · hotels"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
            <DashFrame number="06" kickerColor="var(--accent-warn)" title="Applications by region" sub="UK · 2024">
              <BarChart data={REGIONS} width={560} color="var(--accent)"/>
            </DashFrame>
            <DashFrame number="07" kickerColor="var(--accent-2)" title="Top nationalities" sub={`UK · ${natFullYear ?? 2024}`} tableSub="Grant rate from ASY_D02">
              <BarChart data={(natFull ?? TOP_NATIONALITIES).slice(0,8)} width={560} color="var(--accent-warn)" showGrant={true}/>
            </DashFrame>
          </div>
          {natFull && (
            <div style={{display:'grid',gridTemplateColumns:'1fr',gap:20}}>
              <DashFrame number="08" kickerColor="var(--accent-gold)" title="Applicants by region of origin" sub={`UK · ${natFullYear ?? ''} · grouped from ASY_D01`}>
                <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.3fr) minmax(260px,1fr)',gap:28,alignItems:'start'}}>
                  <WorldMapChoropleth data={groupNatByRegion(natFull)} width={720} height={380}/>
                  <RegionTable data={groupNatByRegion(natFull)}/>
                </div>
                <RegionAccordion rows={natFull}/>
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
                        <th key={y} className="uc" style={{padding:'0 0 12px',textAlign:'right',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent)'}}>{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resettlementSeries.map((r,i)=>(
                      <tr key={r.name} style={{borderBottom:'1px solid var(--rule)'}}>
                        <td style={{padding:'13px 0',color:'var(--ink)'}}><span className="tick" style={{background:['var(--accent)','var(--accent-2)','var(--accent-warn)','var(--accent-gold)','var(--muted)'][i%5]}}/>{r.name}</td>
                        {resettlementYears.map((y,j) => (
                          <td key={y} className="tnum" style={{padding:'13px 0',textAlign:'right',color: j===resettlementYears.length-1 ? 'var(--ink)' : 'var(--muted)',fontWeight: j===resettlementYears.length-1 ? 500 : 400}}>{r[y]!=null ? fmtN(r[y]) : '—'}</td>
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
                          <td style={{padding:'13px 0',color:'var(--ink)'}}><span className="tick" style={{background:['var(--accent)','var(--accent-2)','var(--accent-warn)','var(--accent-gold)','var(--muted)'][i]}}/>{r.name}</td>
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
function DashFrame({ number, kickerColor, title, sub, children, style={} }) {
  return (
    <div style={{background:'#fff',border:'1px solid var(--rule)',padding:'22px 26px 24px',position:'relative',...style}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,paddingBottom:12,borderBottom:'1px solid var(--rule)'}}>
        <div>
          <div style={{fontSize:10.5,letterSpacing:0.12,textTransform:'uppercase',color:kickerColor,fontWeight:500,display:'inline-block',paddingBottom:4,borderBottom:`1.5px solid ${kickerColor}`,marginBottom:8}}>Fig. {number}</div>
          <div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:500,color:'var(--ink)',letterSpacing:-0.1}}>{title}</div>
          {sub && <div style={{fontSize:12.5,color:'var(--muted)',marginTop:3,fontStyle:'italic'}}>{sub}</div>}
        </div>
        <div style={{display:'flex',gap:10,fontSize:11,color:'var(--muted-2)'}} className="uc">
          <span className="pressable" style={{cursor:'pointer'}}>↓</span>
          <span className="pressable" style={{cursor:'pointer'}}>⇢</span>
          <span className="pressable" style={{cursor:'pointer'}}>⎘</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function RegionAccordion({ rows }) {
  if (!rows || !rows.length) return null;
  const byRegion = {};
  for (const r of rows) {
    const reg = REGION_MAP[r.name] ?? 'Other / Unclassified';
    (byRegion[reg] = byRegion[reg] || []).push(r);
  }
  const regionOrder = Object.entries(byRegion)
    .map(([name, list]) => ({ name, list, total: list.reduce((s,x)=>s+x.v,0) }))
    .sort((a,b) => b.total - a.total);
  return (
    <details style={{marginTop:24,borderTop:'1px dotted var(--rule-2)',paddingTop:14}}>
      <summary style={{cursor:'pointer',fontSize:12.5,color:'var(--muted)',letterSpacing:0.08,textTransform:'uppercase',fontWeight:500,padding:'4px 0'}}>Countries by region</summary>
      <div style={{marginTop:14,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:22}}>
        {regionOrder.map(({name, list, total}) => (
          <section key={name} style={{border:'1px solid var(--rule-2)',padding:'14px 16px',background:'#fff'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8,paddingBottom:6,borderBottom:'1px solid var(--rule-2)'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:500,color:'var(--ink)'}}>{name}</div>
              <div className="tnum" style={{fontSize:12,color:'var(--muted)'}}>{total.toLocaleString()} total</div>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
              <tbody>
                {list.sort((a,b)=>b.v-a.v).map(r => (
                  <tr key={r.name} style={{borderBottom:'1px dotted var(--rule-2)'}}>
                    <td style={{padding:'4px 0',color:'var(--ink-2)'}}>{r.name}</td>
                    <td className="tnum" style={{padding:'4px 0',textAlign:'right',color:'var(--ink)'}}>{r.v.toLocaleString()}</td>
                    <td className="tnum" style={{padding:'4px 0 4px 10px',textAlign:'right',color:'var(--muted)',width:44}}>{r.grant != null ? `${Math.round(r.grant*100)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </details>
  );
}

Object.assign(window, { DashboardView });
