// story-bodies.jsx — long-form narrative bodies for the Read section.
//
// STORY_BODIES maps story id → body spec:
//   headline?()  — rich <h1> content (italic em span); falls back to story.title
//   dek?()       — intro paragraph; falls back to story.dek
//   blocks       — ordered array of typed nodes rendered by <StoryBody/>:
//                    { type:'p',       text: () => node|string }
//                    { type:'h2',      text: 'Section heading' }
//                    { type:'callout', text: () => node|string }
//                    { type:'quote',   text: '…', cite: '…' }   (real, attributed quotes only)
//                    { type:'figure',  render: () => node }      (small inline chart)
//   charts?(s)   — renders the sticky right-hand chart column; receives the
//                  shared chart state {range,setRange,mode,setMode,compareOn,
//                  setCompareOn}. When absent the story renders as single-
//                  column prose (720px — explainers embed figures inline).
//
// House rules (same as copy.jsx): neutral and figures-first; reading age
// ~12–14; every statistic computed from the window globals at render time —
// fixed dates and attributed historical figures may be literal. Never invent
// a quote. `text` is a function so the numbers stay current as data updates.

const _fmtS = n => n == null ? '—' : Math.round(n).toLocaleString('en-GB');
const _pctS = (a, b) => (a != null && b) ? (a - b) / b * 100 : null;

// ── Block renderer ───────────────────────────────────────────
// Typography lifted from the original hand-written story body so the
// refactor is visually identical: 16.5/1.65 serif prose, 22px section
// heads, drop-cap on the first paragraph.
function StoryBody({ blocks }) {
  if (!Array.isArray(blocks) || !blocks.length) return null;
  let firstP = true;
  return (
    <div style={{fontFamily:'var(--serif)',fontSize:16.5,lineHeight:1.65,color:'var(--ink-2)'}}>
      {blocks.map((b, i) => {
        if (!b) return null;
        if (b.type === 'h2') {
          return <h3 key={i} style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-0.1,margin:'36px 0 12px',color:'var(--ink)'}}>{b.text}</h3>;
        }
        if (b.type === 'callout') {
          const node = typeof b.text === 'function' ? b.text() : b.text;
          if (node == null) return null;
          return (
            <div key={i} style={{background:'var(--bg-2)',borderLeft:'3px solid var(--accent)',padding:'14px 20px',margin:'24px 0',fontSize:15,lineHeight:1.6,textWrap:'pretty'}}>
              {node}
            </div>
          );
        }
        if (b.type === 'quote') {
          return (
            <blockquote key={i} style={{margin:'24px 0',padding:'0 0 0 22px',borderLeft:'2px solid var(--accent)',fontFamily:'var(--serif)',fontSize:18,lineHeight:1.45,fontStyle:'italic',color:'var(--ink)'}}>
              “{b.text}”{b.cite && <span style={{display:'block',marginTop:8,fontSize:13,fontStyle:'normal',color:'var(--muted)'}}>— {b.cite}</span>}
            </blockquote>
          );
        }
        if (b.type === 'figure') {
          const node = b.render ? b.render() : null;
          if (node == null) return null;
          return <div key={i} style={{margin:'28px 0',padding:'20px 22px',background:'#fff',border:'1px solid var(--rule)'}}>{node}</div>;
        }
        // paragraph
        const node = typeof b.text === 'function' ? b.text() : b.text;
        if (node == null) return null;
        const drop = firstP && typeof node === 'string';
        firstP = false;
        if (drop) {
          return (
            <React.Fragment key={i}>
              <div style={{fontFamily:'var(--serif)',fontSize:52,lineHeight:0.9,float:'left',marginRight:10,marginTop:6,color:'var(--accent)',fontWeight:400}}>{node.charAt(0)}</div>
              <p style={{margin:'0 0 20px',textWrap:'pretty'}}>{node.slice(1)}</p>
            </React.Fragment>
          );
        }
        return <p key={i} style={{margin:'0 0 20px',textWrap:'pretty'}}>{node}</p>;
      })}
    </div>
  );
}

// ── Story bodies ─────────────────────────────────────────────
const STORY_BODIES = {

  // ───────────────────────────────────────────────────────────
  // Story 1 · After the 2022 surge (id: long-tail)
  // Moved here from the hard-coded StoryView markup. Figures that were
  // hand-typed (84,425 · 80,782 · −4.3% · +25%) are now derived from
  // ASYLUM_ANNUAL so they survive revisions; a follow-on paragraph picks
  // up whatever the latest complete year says.
  // ───────────────────────────────────────────────────────────
  'long-tail': {
    headline: () => <>The <em style={{fontStyle:'italic',color:'var(--accent)'}}>long tail</em> of the 2022 surge</>,
    dek: () => {
      const aa = ASYLUM_ANNUAL;
      if (!aa.length) return null;
      const peak = aa.reduce((a, b) => (b.v || 0) > (a.v || 0) ? b : a, aa[0]);
      return <>UK asylum applications peaked at {_fmtS(peak.v)} in {peak.y} — the highest in the modern series — before easing the following year. But the composition of who is claiming, and who is being granted protection, has shifted faster than the total.</>;
    },
    blocks: [
      { type: 'p', text: () =>
        'The British asylum system receives claims from people who have reached the UK and are asking to be recognised as refugees. For most of the past forty years the number of claims has moved in a narrow band — between 20,000 and 40,000 a year — with two striking departures.' },
      { type: 'p', text: () => {
        const aa = ASYLUM_ANNUAL;
        const y2020 = aa.find(r => r.y === 2020), peak = aa.reduce((a, b) => (b.v || 0) > (a.v || 0) ? b : a, aa[0]);
        const mult = (y2020?.v && peak?.v) ? (peak.v / y2020.v) : null;
        return <>The first came in the early 2000s, peaking above 84,000 in 2002 and triggering a decade of policy change. The second is the one we are in now. Between 2020 and {peak.y}, annual applications {mult != null && mult >= 2.7 ? 'nearly tripled' : mult != null ? `rose ${mult.toFixed(1)}-fold` : 'rose sharply'}, driven by a combination of the post-Covid rebound, the collapse of Afghanistan, and a sharp increase in arrivals by small boat across the Channel.</>;
      } },
      { type: 'h2', text: 'A tale of two spikes' },
      { type: 'p', text: () =>
        'The chart on the right compares the two surges of the last twenty-five years. What’s different this time isn’t the height of the peak — it’s the speed of the climb. In 2002 applications plateaued gently; in 2023 they tripled in three years.' },
      { type: 'h2', text: 'The 2024 dip' },
      { type: 'p', text: () => {
        const aa = ASYLUM_ANNUAL;
        const y2023 = aa.find(r => r.y === 2023), y2024 = aa.find(r => r.y === 2024);
        if (!y2023?.v || !y2024?.v) return null;
        const dip = _pctS(y2024.v, y2023.v);
        const boatsDelta = _pctS(y2024.boats, y2023.boats);
        return <>Figures for 2024 showed the first annual fall in five years — down {Math.abs(dip).toFixed(1)}% to {_fmtS(y2024.v)}. Officials attributed much of the decline to faster handling of <Gloss term="inadmissible">inadmissible</Gloss> claims rather than a genuine fall in arrivals{boatsDelta != null && <> — small-boat arrivals themselves {boatsDelta >= 0 ? 'rose' : 'fell'} {Math.abs(Math.round(boatsDelta))}% year on year</>}.</>;
      } },
      { type: 'p', text: () => {
        const aa = ASYLUM_ANNUAL;
        const last = aa[aa.length - 1], prev = aa[aa.length - 2];
        if (!last || last.y <= 2024 || !prev?.v) return null;
        const d = _pctS(last.v, prev.v);
        return <>{last.y} {d != null && d >= 0 ? `edged back up ${d.toFixed(1)}%` : d != null ? `eased a further ${Math.abs(d).toFixed(1)}%` : 'continued the pattern'}, to {_fmtS(last.v)}. The plateau, at roughly three times the 2018 level, is holding — whether it tilts down or settles is what the next few quarterly releases will show.</>;
      } },
    ],
    charts: ({ range, setRange, mode, setMode, compareOn, setCompareOn }) => (
      <>
        {/* controls */}
        <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:18,flexWrap:'wrap'}}>
          <div className="seg">
            <button className={mode==='line'?'on':''} onClick={()=>setMode('line')}>Line</button>
            <button className={mode==='bar'?'on':''} onClick={()=>setMode('bar')}>Bar</button>
          </div>
          <div style={{flex:1,minWidth:180}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11}} className="uc">
              <span style={{color:'var(--muted)'}}>From {range[0]}</span>
              <span style={{color:'var(--muted)'}}>to {range[1]}</span>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center',marginTop:6}}>
              <input type="range" min={2014} max={DATA_MAX_YEAR} value={range[0]} onChange={e=>setRange([Math.min(+e.target.value, range[1]-1), range[1]])}/>
              <input type="range" min={2014} max={DATA_MAX_YEAR} value={range[1]} onChange={e=>setRange([range[0], Math.max(+e.target.value, range[0]+1)])}/>
            </div>
          </div>
          <label className="chk" style={{fontSize:12.5,color:'var(--muted)'}}>
            <input type="checkbox" checked={compareOn} onChange={e=>setCompareOn(e.target.checked)}/>
            Compare small-boat arrivals
          </label>
        </div>

        <div style={{background:'var(--bg-2)',padding:'24px 28px',border:'1px solid var(--rule)'}}>
          {mode === 'line' ? (
            <LineChart
              data={ASYLUM_ANNUAL}
              yearRange={range}
              title="Asylum applications, UK"
              subtitle={`Applications annual · main applicants only · UK, ${range[0]}–${range[1]}`}
              source="Home Office · Asy_D01"
              asOf={(typeof NAT_FULL_META !== 'undefined' && NAT_FULL_META) ? (NAT_FULL_META.latestDataPoint || NAT_FULL_META.asOf || NAT_FULL_META.generatedAt) : null}
              nextUpdate={(typeof NAT_FULL_META !== 'undefined' && NAT_FULL_META) ? NAT_FULL_META.nextUpdate : null}
              annotations={[
                range[0] <= 2023 && range[1] >= 2023 && { y: 2023, label: '84,425', dx: -80, dy: -14 },
                range[0] <= 2020 && range[1] >= 2020 && { y: 2020, label: 'Covid', dx: -46, dy: 44 },
              ].filter(Boolean)}
              caption="Main applicants only. Provisional for 2024."
              width={720} height={340}
            />
          ) : (
            <BarChart
              data={ASYLUM_ANNUAL.filter(d => d.y >= range[0] && d.y <= range[1]).map(d=>({name:String(d.y), v:d.v}))}
              width={720} height={360}
            />
          )}
        </div>

        {compareOn && (
          <div style={{background:'#fff',padding:'20px 28px',border:'1px solid var(--rule)',marginTop:16}}>
            <LineChart
              data={ASYLUM_ANNUAL.map(d=>({y:d.y,v:d.boats}))}
              yearRange={range}
              title="Small-boat arrivals, UK"
              subtitle={`Small-boat arrivals annual · English Channel · UK, ${range[0]}–${range[1]}`}
              stroke="var(--accent-warn)"
              source="Home Office · Irr_02b"
              asOf={(typeof IRR_BOATS_META !== 'undefined' && IRR_BOATS_META) ? (IRR_BOATS_META.asOf || IRR_BOATS_META.generatedAt) : (typeof BOATS_META !== 'undefined' ? BOATS_META.latestDataPoint : null)}
              nextUpdate={(typeof IRR_BOATS_META !== 'undefined' && IRR_BOATS_META) ? IRR_BOATS_META.nextUpdate : null}
              caption="Border Force-recorded arrivals by small boat across the Channel. Series begins 2018; figures for earlier years are zero by definition."
              width={720} height={220}
            />
          </div>
        )}

        {/* related figure — nationalities */}
        <div style={{background:'#fff',padding:'20px 28px',border:'1px solid var(--rule)',marginTop:16}}>
          <div style={{marginBottom:12}}>
            <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>Applications by top nationality · main applicants</div>
            <div style={{fontSize:19,fontWeight:500,color:'var(--ink)',letterSpacing:-0.1}}>Top five nationalities</div>
          </div>
          <MultiLineChart years={NAT_SERIES.years} series={NAT_SERIES.series} width={720} height={280}/>
          <div className="uc" style={{marginTop:14,color:'var(--muted-2)'}}>Source: Home Office · Asy_D01</div>
        </div>
      </>
    ),
  },

  // ───────────────────────────────────────────────────────────
  // Story 2 · Nationality (id: pakistan — id kept for routing; the
  // narrative follows the data, which now has Eritrea on top).
  // ───────────────────────────────────────────────────────────
  'pakistan': {
    dek: () => {
      const top = _natSorted();
      if (top.length < 2) return null;
      const year = _CW.NAT_FULL_META?.year;
      const leaders = _natLeadersByYear();
      const distinct = new Set(leaders.map(l => l.name)).size;
      return <>{_natAdj(top[0].name)} nationals filed more claims than any other group in {year ?? 'the latest year'}{distinct > 1 ? <> — the {['','','second','third','fourth','fifth'][distinct] ?? `${distinct}th`} different leader of the table in six years</> : ''}. The ranking by volume and the ranking by outcome remain very different lists.</>;
    },
    blocks: [
      { type: 'p', text: () =>
        'Every asylum claim records the nationality the applicant declares, and the ranking of those nationalities is one of the most quoted numbers in the migration debate. It is also one of the least stable.' },
      { type: 'p', text: () => {
        const top = _natSorted();
        if (top.length < 3) return null;
        const year = _CW.NAT_FULL_META?.year;
        return <>In {year ?? 'the latest full year'}, {top[0].name} led with {_fmtS(top[0].v)} main applicants, ahead of {top[1].name} ({_fmtS(top[1].v)}) and {top[2].name} ({_fmtS(top[2].v)}).</>;
      } },
      { type: 'p', text: () => {
        const leaders = _natLeadersByYear();
        if (!leaders.length) return null;
        return <>The lead changes hands often. {leaders.map((l, i) => `${l.name} topped ${l.years}`).join('; ')}. Each handover has its own story — a war, a route, a policy — and none of them shows up in the total alone.</>;
      } },
      { type: 'p', text: () =>
        <>A note on what “nationality” means here: it is the nationality the applicant declares when the claim is lodged. Dual nationals are recorded under a single nationality, and <Gloss term="asylum seeker">applicants</Gloss> with no recognised nationality sit in their own “stateless” row. The counts are main applicants only — one per claim, however large the family it covers.</> },
      { type: 'h2', text: 'Volume is not outcome' },
      { type: 'p', text: () => {
        const top = _natSorted().slice(0, 5);
        const withGrant = top.filter(r => r.grant != null);
        if (withGrant.length < 3) return null;
        const hi = withGrant.reduce((a, b) => b.grant > a.grant ? b : a);
        const lo = withGrant.reduce((a, b) => b.grant < a.grant ? b : a);
        return <>Among the five biggest groups, <Gloss term="grant rate">grant rates</Gloss> stretch from {Math.round(lo.grant * 100)}% ({lo.name}) to {Math.round(hi.grant * 100)}% ({hi.name}). Ranking nationalities by how many people claim gives one list; ranking them by how many claims succeed gives another.</>;
      } },
      { type: 'p', text: () => {
        const rows = Array.isArray(_CW.NAT_FULL) ? _CW.NAT_FULL : [];
        const afg = rows.find(r => r.name === 'Afghanistan');
        if (!afg || afg.grant == null) return null;
        const year = _CW.NAT_FULL_META?.year;
        return <>The sharpest recent reversal is Afghanistan. Afghan claims were granted almost automatically in the years after Kabul fell — above 95% — but the {year ?? 'latest'} rate was {Math.round(afg.grant * 100)}%. A change that size moves the national headline rate on its own, because Afghan claims are such a large share of the total.</>;
      } },
      { type: 'h2', text: 'Why the mix matters' },
      { type: 'p', text: () => {
        const rows = _natSorted();
        const total = rows.reduce((s, r) => s + (r.v || 0), 0) || 1;
        const share5 = Math.round(rows.slice(0, 5).reduce((s, r) => s + (r.v || 0), 0) / total * 100);
        const year = _CW.NAT_FULL_META?.year;
        return <>The five biggest nationalities were {share5}% of all {year ?? 'latest-year'} claims; the other {Math.max(rows.length - 5, 0)} recorded nationalities share the rest. When commentary treats “asylum seekers” as one group, it averages across populations whose situations — and whose outcomes under the same rules — have almost nothing in common.</>;
      } },
      { type: 'p', text: () => {
        const rows = Array.isArray(_CW.NAT_FULL) ? _CW.NAT_FULL : [];
        if (!rows.length || typeof groupNatByRegion !== 'function') return null;
        const regions = groupNatByRegion(rows);
        if (regions.length < 2) return null;
        const total = regions.reduce((s, r) => s + (r.v || 0), 0) || 1;
        return <>Grouped by region of origin, the picture steadies a little: {regions[0].name} leads with {Math.round(regions[0].v / total * 100)}% of applicants, ahead of {regions[1].name} ({Math.round(regions[1].v / total * 100)}%). Countries move up and down the table faster than regions do — conflicts are local, but the routes people travel are shared.</>;
      } },
      { type: 'p', text: () =>
        <>It is also worth separating this table from the small-boats one. Small-boat arrivals are counted by nationality on the day they arrive; asylum claims are counted when they are lodged, whatever the route in. The two rankings overlap but do not match — a nationality can be prominent on the boats and modest in the claims table, or the reverse.</> },
      { type: 'callout', text: () =>
        'Reading tip: the chart alongside shows the five biggest nationalities as separate lines. Watch for lines crossing — the years when the lead changes hands — rather than the height of any one line.' },
    ],
    charts: () => (
      <>
        <div style={{background:'var(--bg-2)',padding:'24px 28px',border:'1px solid var(--rule)'}}>
          <div style={{marginBottom:12}}>
            <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>Applications by top nationality · main applicants</div>
            <div style={{fontSize:19,fontWeight:500,color:'var(--ink)',letterSpacing:-0.1}}>Top five nationalities over time</div>
          </div>
          <MultiLineChart years={NAT_SERIES.years} series={NAT_SERIES.series} width={720} height={300}/>
          <div className="uc" style={{marginTop:14,color:'var(--muted-2)'}}>Source: Home Office · Asy_D01</div>
        </div>
        {(() => {
          const rows = _natSorted().slice(0, 10);
          if (!rows.length) return null;
          return (
            <div style={{background:'#fff',padding:'20px 28px',border:'1px solid var(--rule)',marginTop:16}}>
              <div style={{marginBottom:12}}>
                <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>Applications · {_CW.NAT_FULL_META?.year ?? 'latest year'}</div>
                <div style={{fontSize:19,fontWeight:500,color:'var(--ink)',letterSpacing:-0.1}}>Top ten, with grant rate</div>
              </div>
              <BarChart data={rows.map(r => ({name: `${r.name}${r.grant != null ? ` · ${Math.round(r.grant*100)}% granted` : ''}`, v: r.v}))} width={720}/>
              <div className="uc" style={{marginTop:14,color:'var(--muted-2)'}}>Source: Home Office · Asy_D01 + Asy_D02</div>
            </div>
          );
        })()}
      </>
    ),
  },

  // ───────────────────────────────────────────────────────────
  // Story 3 · The backlog, halved (id: backlog)
  // Uses 31 December snapshots only — the documented definition — which
  // also keeps any mid-year partial rows out of the narrative and chart.
  // ───────────────────────────────────────────────────────────
  'backlog': {
    dek: () => {
      const snaps = _backlogDec();
      if (snaps.length < 2) return null;
      const peak = snaps.reduce((a, b) => b.v > a.v ? b : a);
      const last = snaps[snaps.length - 1];
      return <>The queue of undecided cases fell from {_fmtS(peak.v)} at the end of {peak.y} to {_fmtS(last.v)} at the end of {last.y}. The wait has not disappeared — much of it has moved downstream.</>;
    },
    blocks: [
      { type: 'p', text: () =>
        'Behind every asylum statistic is a queue. The backlog — cases waiting for a first decision — is where arrivals, staffing and policy meet, and for four years it was the system’s defining number.' },
      { type: 'p', text: () => {
        const snaps = _backlogDec();
        const first = snaps[0], peak = snaps.reduce((a, b) => b.v > a.v ? b : a, snaps[0]);
        if (!first || !peak || first.y === peak.y) return null;
        return <>Between the end of {first.y} and the end of {peak.y} the queue grew from {_fmtS(first.v)} to {_fmtS(peak.v)} — roughly {(peak.v / first.v).toFixed(1)} times over. Claims rose sharply in those years, but the bigger driver was throughput: decisions slowed while applications climbed, so the queue absorbed the difference.</>;
      } },
      { type: 'p', text: () => {
        const snaps = _backlogDec();
        if (snaps.length < 2) return null;
        const last = snaps[snaps.length - 1], prev = snaps[snaps.length - 2];
        const y2020 = snaps.find(r => r.y === 2020);
        const drop = _pctS(last.v, prev.v);
        return <>The fall since has been steep. The queue ended {last.y} at {_fmtS(last.v)} — {drop != null ? `${Math.abs(drop).toFixed(0)}% lower than a year earlier` : 'sharply lower'}{y2020 && last.v < y2020.v ? `, and below where it stood before the surge (${_fmtS(y2020.v)} at the end of 2020)` : ''}.</>;
      } },
      { type: 'h2', text: 'How the queue was cut' },
      { type: 'p', text: () => {
        const dec = Array.isArray(_CW.DECISIONS_LATEST) ? _CW.DECISIONS_LATEST : [];
        const total = dec.reduce((s, r) => s + (r.v || 0), 0);
        const year = _CW.DECISIONS_META?.year;
        if (!total) return null;
        return <>Mostly by deciding faster. The Home Office issued {_fmtS(total)} initial outcomes in {year ?? 'the latest year'} — an unusually high throughput. Deciding at that pace changes who is left waiting: straightforward cases clear quickly, and the remaining queue concentrates in nationalities and case types that take longer.</>;
      } },
      { type: 'p', text: () => {
        const bands = (Array.isArray(_CW.BACKLOG_AGE_BANDS) ? _CW.BACKLOG_AGE_BANDS : []).filter(r => /^31 Dec/.test(r.date || ''));
        const last = bands[bands.length - 1];
        if (!last || !last.total) return null;
        return <>The queue’s shape matters as much as its size. At the end of {last.y}, {Math.round((last.gtYearShare || 0) * 100)}% of waiting cases — {_fmtS(last.gt12)} people — had already been waiting more than a year.</>;
      } },
      { type: 'p', text: () => {
        const snaps = _backlogDec();
        const last = snaps[snaps.length - 1];
        const dec = Array.isArray(_CW.DECISIONS_LATEST) ? _CW.DECISIONS_LATEST : [];
        const throughput = dec.reduce((s, r) => s + (r.v || 0), 0);
        if (!last || !throughput) return null;
        const months = (last.v / throughput) * 12;
        return <>A useful way to read the number: divide the queue by the pace of decisions and you get months of work. At the end-of-{last.y} queue size and the latest year’s decision rate, that is about {months.toFixed(1)} months — a system working through its inbox, where three years earlier the same sum gave well over a year.</>;
      } },
      { type: 'p', text: () =>
        <>The queue also drives the numbers around it. Clearing the easy cases first pushed the national <Gloss term="grant rate">grant rate</Gloss> up and then down as the remaining mix hardened — which is why the backlog story and the grant-rate story are really one story read from two ends.</> },
      { type: 'h2', text: 'Where the pressure went' },
      { type: 'p', text: () =>
        <>Clearing first decisions faster does not end cases: a refusal can be appealed, and an unusually large share of recent refusals have been. By spring 2026 the appeals queue was reported at about 87,000 cases, up 72% in a year (as reported to Parliament, March 2026 — the Home Office does not currently publish a live appeals series). Much of the wait has moved downstream rather than disappearing.</> },
      { type: 'callout', text: () =>
        'What this measures: cases awaiting an initial decision at the 31 December snapshot each year, main applicants only. Appeals, administrative reviews and later stages sit outside this count — which is exactly why the backlog can fall while the total number of people waiting somewhere in the system does not.' },
    ],
    charts: () => (
      <>
        <div style={{background:'var(--bg-2)',padding:'24px 28px',border:'1px solid var(--rule)'}}>
          <LineChart
            data={_backlogDec()}
            title="Cases awaiting an initial decision"
            subtitle="Year-end snapshots · main applicants · UK"
            stroke="var(--accent-gold)"
            source="Home Office · Asy_D07"
            caption="31 December snapshot each year. Mid-year peaks and troughs are not visible in this series."
            width={720} height={320}
          />
        </div>
        {(() => {
          const bands = (Array.isArray(_CW.BACKLOG_AGE_BANDS) ? _CW.BACKLOG_AGE_BANDS : []).filter(r => /^31 Dec/.test(r.date || ''));
          if (!bands.length) return null;
          const series = [
            { name: '< 3 months',  data: bands.map(b => b.lt3m  || 0) },
            { name: '3–6 months',  data: bands.map(b => b.m3to6 || 0) },
            { name: '6–12 months', data: bands.map(b => b.m6to12|| 0) },
            { name: '> 12 months', data: bands.map(b => b.gt12  || 0) },
          ];
          return (
            <div style={{background:'#fff',padding:'20px 28px',border:'1px solid var(--rule)',marginTop:16}}>
              <div style={{marginBottom:12}}>
                <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>How long pending cases have waited</div>
                <div style={{fontSize:19,fontWeight:500,color:'var(--ink)',letterSpacing:-0.1}}>Backlog age profile</div>
              </div>
              <StackedColumnsMulti years={bands.map(b => b.y)} series={series}
                colors={['var(--accent-2)', 'var(--accent)', 'var(--accent-gold)', 'var(--accent-warn)']}
                width={720} height={260}/>
              <div className="uc" style={{marginTop:14,color:'var(--muted-2)'}}>Source: Home Office · Asy_D07 duration bands</div>
            </div>
          );
        })()}
      </>
    ),
  },

  // ───────────────────────────────────────────────────────────
  // Story 4 · Eight seasons on the Channel (id: boats)
  // ───────────────────────────────────────────────────────────
  'boats': {
    dek: () => {
      const rec = _CW.BOATS_RECORDS;
      if (!rec) return null;
      return <>{_fmtS(rec.totalMigrants)} people have been detected crossing the Channel in small boats since counting began in 2018, on {_fmtS(rec.totalBoats)} boats. The season’s shape barely changes; almost everything else about the crossings has.</>;
    },
    blocks: [
      { type: 'p', text: () => {
        const rec = _CW.BOATS_RECORDS;
        if (!rec) return null;
        return `On 1 January 2018 the Home Office began publishing a daily count of people detected crossing the English Channel in small boats. In that first year the count was ${_fmtS((_CW.BOATS_ANNUAL || []).find(r => r.y === 2018)?.m)} people. The running total has since passed ${_fmtS(Math.floor((rec.totalMigrants || 0) / 1000) * 1000)}.`;
      } },
      { type: 'p', text: () => {
        const rec = _CW.BOATS_RECORDS;
        if (!rec?.busiestDay) return null;
        const d = new Date(rec.busiestDay.date + 'T00:00:00Z');
        const dLabel = `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
        const m = rec.busiestMonth?.month ? rec.busiestMonth.month.split('-') : null;
        return <>The records cluster in one summer. The busiest single day remains {dLabel}, when {_fmtS(rec.busiestDay.migrants)} people arrived{m ? <>; the busiest month is {MONTHS_LONG[+m[1] - 1]} {m[0]}, with {_fmtS(rec.busiestMonth.migrants)}</> : ''}.</>;
      } },
      { type: 'h2', text: 'The shape of a season' },
      { type: 'p', text: () =>
        'Crossings follow the weather. Nearly every year is quiet from January to March, rises through spring, and peaks in late summer — a pattern stable across all eight years of the series. Annual totals swing on wind, waves and interception, not on the shape of the calendar.' },
      { type: 'p', text: () => {
        const ba = Array.isArray(_CW.BOATS_ANNUAL) ? _CW.BOATS_ANNUAL : [];
        const y2022 = ba.find(r => r.y === 2022);
        const fullYears = ba.filter(r => r.y < new Date().getUTCFullYear());
        const last = fullYears[fullYears.length - 1];
        if (!y2022 || !last) return null;
        return <>The peak year is still 2022, at {_fmtS(y2022.m)} arrivals. The total fell by more than a third in 2023, then climbed again: {fullYears.slice(-2).map(r => `${_fmtS(r.m)} in ${r.y}`).join(', then ')}. The year-to-date comparison in the chart alongside shows where the current year sits against every previous one, day by day.</>;
      } },
      { type: 'h2', text: 'More people per boat' },
      { type: 'p', text: () => {
        const ba = Array.isArray(_CW.BOATS_ANNUAL) ? _CW.BOATS_ANNUAL : [];
        const first = ba.find(r => r.y === 2018);
        const fullYears = ba.filter(r => r.y < new Date().getUTCFullYear());
        const last = fullYears[fullYears.length - 1];
        if (!first?.perBoat || !last?.perBoat) return null;
        return <>The quietest change is the most telling. In 2018 the average boat carried {Math.round(first.perBoat)} people; by {last.y} it carried {Math.round(last.perBoat)}. The boats have not grown nine-fold — they are more crowded, which is central to why crossings have become more dangerous.</>;
      } },
      { type: 'p', text: () => {
        const annual = Array.isArray(_CW.DEATHS_ANNUAL) ? _CW.DEATHS_ANNUAL : [];
        if (!annual.length) return null;
        const worst = annual.filter(r => r.y < new Date().getUTCFullYear()).reduce((a, b) => (b.total || 0) > (a.total || 0) ? b : a, annual[0]);
        return <>The IOM’s Missing Migrants Project records deaths and disappearances on the route; its worst year so far is {worst.y}, with {_fmtS(worst.total)} recorded. IOM counts only incidents it can verify, so the true number is likely higher.</>;
      } },
      { type: 'h2', text: 'Arrivals are not attempts' },
      { type: 'p', text: () => {
        const wk = Array.isArray(_CW.BOATS_WEEKLY) ? _CW.BOATS_WEEKLY : [];
        const withP = wk.filter(w => w && w.p != null && w.m != null);
        if (withP.length < 14) return null;
        const recent = withP.slice(-13);
        const p = recent.reduce((s, w) => s + w.p, 0);
        const m = recent.reduce((s, w) => s + w.m, 0);
        if (!(p + m)) return null;
        return <>Since 2024 the weekly release has also reported <Gloss term="preventions">preventions</Gloss> — crossing attempts stopped on the French side. Over the latest thirteen reported weeks, {Math.round(p / (p + m) * 100)}% of recorded attempts ended in a prevention rather than a UK arrival. The arrivals number alone understates how many people set out.</>;
      } },
      { type: 'p', text: () =>
        <>Two things this series does not count: people who enter clandestinely by other routes (lorries, ferries, air), and people turned back or rescued who never left French waters in a recorded event. It is a count of one route, precisely measured — not a count of irregular entry as a whole.</> },
      { type: 'callout', text: () =>
        'Provisional data: the “last 7 days” figures published daily are provisional and are revised when the official weekly series lands each Tuesday. Charts on this site mark the provisional strip separately.' },
    ],
    charts: () => (
      <>
        <div style={{background:'var(--bg-2)',padding:'24px 28px',border:'1px solid var(--rule)'}}>
          {(typeof BOATS_YOY !== 'undefined' && BOATS_YOY && Object.keys(BOATS_YOY).length) ? (
            <YoYCumulative series={BOATS_YOY} width={720} height={320}
              yLabel="Cumulative migrants" xLabel="Day of year"
              caption="Each line traces cumulative small-boat arrivals through one year. The current-year line stops at the most recent published week."
              source="Home Office · SB_01"/>
          ) : (
            <LineChart data={(_CW.BOATS_ANNUAL || []).map(r => ({y: r.y, v: r.m}))}
              title="Small-boat arrivals by year" stroke="var(--accent-warn)"
              source="Home Office · SB_01" width={720} height={320}/>
          )}
        </div>
        {(() => {
          const ba = Array.isArray(_CW.BOATS_ANNUAL) ? _CW.BOATS_ANNUAL : [];
          if (!ba.length) return null;
          return (
            <div style={{background:'#fff',padding:'20px 28px',border:'1px solid var(--rule)',marginTop:16}}>
              <LineChart data={ba.map(r => ({y: r.y, v: r.perBoat}))}
                title="Average people per boat"
                subtitle="Annual · migrants ÷ boats · English Channel"
                stroke="var(--accent-gold)"
                caption="The current year is a running average and can still move."
                source="Home Office · SB_01 (derived)"
                width={720} height={220}/>
            </div>
          );
        })()}
      </>
    ),
  },

  // ───────────────────────────────────────────────────────────
  // Story 5 · Grant rate, doubled and drifting (id: grant-rate)
  // ───────────────────────────────────────────────────────────
  'grant-rate': {
    dek: () => {
      const g = _grantFigures();
      if (!g) return null;
      return <>In {g.year}, {g.allPct}% of initial outcomes granted protection. That headline is a weighted blend of nationalities granted at over 90% and nationalities granted at nearly zero — and it moves when the mix moves.</>;
    },
    blocks: [
      { type: 'p', text: () =>
        'When people ask what share of asylum claims succeed, they usually mean the grant rate. It sounds like one number. It is really three: the initial rate, the rate excluding cases that never get a substantive decision, and the final rate once appeals are counted.' },
      { type: 'p', text: () => {
        const g = _grantFigures();
        if (!g) return null;
        return <>Start with the published pieces. In {g.year} the Home Office issued {_fmtS(g.total)} initial outcomes: {_fmtS(g.granted)} granted protection or other leave ({g.allPct}% of everything, including withdrawn and administrative closures), {_fmtS(g.refused)} were refused, and {_fmtS(g.withdrawn)} were withdrawn or closed. On substantive decisions alone, the grant rate was {g.substPct}%.</>;
      } },
      { type: 'p', text: () =>
        'The recent history is a steep climb and a slide. The initial rate roughly doubled between 2019 and 2022–23 — from around a quarter of decisions to more than half — and has eased since as the backlog-clearing drive changed which cases were being decided.' },
      { type: 'h2', text: 'A weighted blend' },
      { type: 'p', text: () => {
        const rows = _natSorted().filter(r => r.grant != null && r.v >= 500);
        if (rows.length < 4) return null;
        const hi = [...rows].sort((a, b) => b.grant - a.grant).slice(0, 2);
        const lo = [...rows].sort((a, b) => a.grant - b.grant).slice(0, 2);
        const year = _CW.NAT_FULL_META?.year;
        return <>The national rate is an average across populations with almost nothing in common. In {year ?? 'the latest year'}, {hi.map(r => `${r.name} claims were granted at ${Math.round(r.grant * 100)}%`).join(' and ')}, while {lo.map(r => `${r.name} sat at ${Math.round(r.grant * 100)}%`).join(' and ')}. The headline moves when the case mix moves — not necessarily when the system gets stricter or more generous.</>;
      } },
      { type: 'p', text: () => {
        const rows = Array.isArray(_CW.NAT_FULL) ? _CW.NAT_FULL : [];
        const afg = rows.find(r => r.name === 'Afghanistan');
        if (!afg || afg.grant == null) return null;
        return <>The small-multiples chart alongside makes the point country by country. Watch Afghanistan: granted above 95% in the years after Kabul fell, {Math.round(afg.grant * 100)}% in the latest year — one of the sharpest reversals in the series, and large enough to move the national headline on its own.</>;
      } },
      { type: 'p', text: () => {
        const g = _grantFigures();
        if (!g || !g.withdrawn) return null;
        return <>The often-ignored third bucket is withdrawals and administrative closures — {_fmtS(g.withdrawn)} outcomes in {g.year}, {Math.round(g.withdrawn / g.total * 100)}% of the total. A claim can be withdrawn by the applicant, or closed by the Home Office when someone misses appointments or cannot be traced. Where these land matters: counting them shrinks the grant rate; excluding them inflates it.</>;
      } },
      { type: 'p', text: () =>
        <>One definitional note: “granted” on this site combines refugee status with <Gloss term="refugee">humanitarian protection</Gloss> and other forms of leave, following Home Office practice. The decisions chart alongside shows them separately — humanitarian and other grants are a thin slice next to full refugee status.</> },
      { type: 'h2', text: 'The missing 15–20 points' },
      { type: 'p', text: () =>
        <>The initial rate is not the end of the story. Refused applicants can appeal to an independent tribunal, and roughly a third of appeals heard have succeeded in recent published figures (36% in 2024, as published). Historically, appeal outcomes have raised the final grant rate by 15–20 percentage points above the initial one. The Home Office has not published appeal outcome data since 2023, so the final rate for recent cohorts is not yet knowable.</> },
      { type: 'callout', text: () => {
        const g = _grantFigures();
        return <>{'One number, three answers'}{g ? <>: for {g.year}, {g.allPct}% of all initial outcomes, {g.substPct}% of substantive decisions, and an unknown-but-higher final rate once appeals resolve.</> : '.'} When two commentators quote different “grant rates”, they are usually both right — about different denominators.</>;
      } },
    ],
    charts: () => (
      <>
        {(() => {
          const dec = Array.isArray(_CW.DECISIONS_LATEST) ? _CW.DECISIONS_LATEST : [];
          if (!dec.length) return null;
          return (
            <div style={{background:'var(--bg-2)',padding:'24px 28px',border:'1px solid var(--rule)'}}>
              <div style={{marginBottom:12}}>
                <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>Initial decisions · {_CW.DECISIONS_META?.year ?? 'latest year'}</div>
                <div style={{fontSize:19,fontWeight:500,color:'var(--ink)',letterSpacing:-0.1}}>Where claims land at first decision</div>
              </div>
              <StackedBar data={dec} width={660} height={110}/>
              <div className="uc" style={{marginTop:14,color:'var(--muted-2)'}}>Source: Home Office · Asy_D02</div>
            </div>
          );
        })()}
        {(typeof NAT_GRANT_ANNUAL !== 'undefined' && NAT_GRANT_ANNUAL) && (
          <div style={{background:'#fff',padding:'20px 28px',border:'1px solid var(--rule)',marginTop:16}}>
            <div style={{marginBottom:12}}>
              <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>Grant rate by nationality · {NAT_GRANT_ANNUAL.years[0]}–{NAT_GRANT_ANNUAL.years[NAT_GRANT_ANNUAL.years.length-1]}</div>
              <div style={{fontSize:19,fontWeight:500,color:'var(--ink)',letterSpacing:-0.1}}>Small multiples</div>
            </div>
            <GrantRateSmallMultiples series={NAT_GRANT_ANNUAL} width={720} height={420} cols={3}
              highlight={['Afghanistan','Syria','Eritrea','Pakistan']}
              caption="Each cell is one nationality; y-axis is 0–100% grant rate. The dashed line marks 50%."
              source="Home Office · Asy_D02 (derived)"/>
          </div>
        )}
      </>
    ),
  },

  // ───────────────────────────────────────────────────────────
  // Story 6 · Where the wait happens (id: regions)
  // ───────────────────────────────────────────────────────────
  'regions': {
    dek: () => {
      const la = _laSorted();
      if (!la.rows.length) return null;
      return <>{la.thirdCount} of the UK’s {la.rows.length} council areas house a third of all supported asylum seekers. The geography of the wait is contracted, not chosen — and it is changing fast as hotels close.</>;
    },
    blocks: [
      { type: 'p', text: () =>
        'Where asylum seekers live while their claim is decided has little to do with where they arrived or where their case is heard. Destitute applicants are housed wherever the Home Office’s accommodation contractors have space — a system called dispersal.' },
      { type: 'p', text: () => {
        const la = _laSorted();
        if (la.rows.length < 3) return null;
        const date = _CW.SUPPORT_REGIONS_META?.date;
        const top3 = la.rows.slice(0, 3);
        return <>The result is heavy concentration. Of the {_fmtS(la.total)} people receiving Home Office support{date ? ` at ${date}` : ''}, a third live in just {la.thirdCount} of {la.rows.length} council areas. {top3[0].name} houses more than anywhere else ({_fmtS(top3[0].total)}), followed by {top3[1].name} ({_fmtS(top3[1].total)}) and {top3[2].name} ({_fmtS(top3[2].total)}).</>;
      } },
      { type: 'h2', text: 'The hotel wind-down' },
      { type: 'p', text: () => {
        const h = Array.isArray(_CW.HOTELS) ? _CW.HOTELS : [];
        if (h.length < 3) return null;
        const last = h[h.length - 1];
        const twoBack = h[h.length - 3];
        const drop = _pctS(last.persons_in_hotels, twoBack.persons_in_hotels);
        const fmtD = s => { const d = new Date(s + 'T00:00:00Z'); return `${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
        return <>Hotels are the volatile part of the map. They are contingency accommodation — used when dispersal housing is full — and the government has committed to closing them, shifting people to large sites and standard housing. The snapshots show it happening: {_fmtS(twoBack.persons_in_hotels)} people were in hotels in {fmtD(twoBack.date)}; by {fmtD(last.date)} it was {_fmtS(last.persons_in_hotels)}{drop != null ? ` — a fall of ${Math.abs(drop).toFixed(0)}% in six months` : ''}.</>;
      } },
      { type: 'p', text: () => {
        const t = _CW.SUPPORT_TIERS_LATEST;
        if (!t || !t.total) return null;
        return <>Support comes in three legal flavours. Section 95 — housing and subsistence while a claim is decided — covers {Math.round((t.s95 || 0) / t.total * 100)}% of the total. Section 98 is the emergency bridge while a Section 95 application is assessed, and Section 4 supports people whose claim failed but who cannot leave the UK.</>;
      } },
      { type: 'p', text: () => {
        const h = Array.isArray(_CW.HOTELS) ? _CW.HOTELS : [];
        if (h.length < 4) return null;
        const peak = h.reduce((a, b) => (b.persons_in_hotels || 0) > (a.persons_in_hotels || 0) ? b : a, h[0]);
        const last = h[h.length - 1];
        if (!peak.persons_in_hotels || peak.date === last.date) return null;
        const fmtD = s => { const d = new Date(s + 'T00:00:00Z'); return `${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
        const drop = _pctS(last.persons_in_hotels, peak.persons_in_hotels);
        return <>For scale: at the peak of hotel use, in {fmtD(peak.date)}, {_fmtS(peak.persons_in_hotels)} people were in hotel accommodation. The latest snapshot is {drop != null ? `${Math.abs(drop).toFixed(0)}% below that peak` : 'well below that peak'}. Whether the fall continues, and where those people go instead, is the thing to watch in the next snapshots.</>;
      } },
      { type: 'h2', text: 'Contracted geography' },
      { type: 'p', text: () => {
        const regs = Array.isArray(_CW.SUPPORT_REGIONS) ? _CW.SUPPORT_REGIONS : [];
        if (regs.length < 3) return null;
        const total = regs.reduce((s, r) => s + (r.v || 0), 0) || 1;
        const sorted = [...regs].sort((a, b) => (b.v || 0) - (a.v || 0));
        const top3 = sorted.slice(0, 3);
        const share = Math.round(top3.reduce((s, r) => s + (r.v || 0), 0) / total * 100);
        return <>At regional level, {top3.map(r => r.name).join(', ')} together house {share}% of the supported population. Accommodation contracts follow housing costs, which is why the map of the wait looks nothing like the map of where claims are lodged — or the map of population.</>;
      } },
      { type: 'p', text: () =>
        <>That geography is set by accommodation providers under regional Home Office contracts, not by the people housed — asylum seekers on support cannot choose where to live without losing it. The concentration runs both ways: some councils host thousands, while many host almost none.</> },
      { type: 'callout', text: () =>
        'What this measures: people in receipt of Section 95, 98 or 4 support, counted where they are housed. Asylum seekers who support themselves, people in detention, and resettled refugees sit outside this count.' },
    ],
    charts: () => (
      <>
        <div style={{background:'var(--bg-2)',padding:'24px 28px',border:'1px solid var(--rule)'}}>
          <div style={{marginBottom:12}}>
            <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>Supported asylum seekers · {_CW.SUPPORT_REGIONS_META?.date ?? 'latest snapshot'}</div>
            <div style={{fontSize:19,fontWeight:500,color:'var(--ink)',letterSpacing:-0.1}}>By UK region</div>
          </div>
          <BarChart data={(Array.isArray(_CW.SUPPORT_REGIONS) && _CW.SUPPORT_REGIONS.length ? _CW.SUPPORT_REGIONS : REGIONS)} width={720} color="var(--accent)"/>
          <div className="uc" style={{marginTop:14,color:'var(--muted-2)'}}>Source: Home Office · Asy_D05/D11</div>
        </div>
        {(() => {
          const la = _laSorted();
          if (la.rows.length < 10) return null;
          return (
            <div style={{background:'#fff',padding:'20px 28px',border:'1px solid var(--rule)',marginTop:16}}>
              <div style={{marginBottom:12}}>
                <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>Top ten council areas</div>
                <div style={{fontSize:19,fontWeight:500,color:'var(--ink)',letterSpacing:-0.1}}>Where the concentration is</div>
              </div>
              <BarChart data={la.rows.slice(0, 10).map(r => ({name: r.name, v: r.total}))} width={720} color="var(--accent-warn)"/>
              <div className="uc" style={{marginTop:14,color:'var(--muted-2)'}}>Source: Home Office · Asy_D11</div>
            </div>
          );
        })()}
      </>
    ),
  },

  // ───────────────────────────────────────────────────────────
  // Explainer · How the UK asylum system works (id: how-the-system-works)
  // Single-column prose with inline figures; no chart column.
  // ───────────────────────────────────────────────────────────
  'how-the-system-works': {
    blocks: [
      { type: 'p', text: () =>
        'Asylum is protection given to someone who has left their country and cannot safely return to it. The rules descend from the 1951 Refugee Convention, which the UK helped write: a refugee is someone with a well-founded fear of persecution for reasons such as race, religion, nationality, political opinion or membership of a particular social group. A claim can only be made from inside the UK — there is no visa for travelling here to seek asylum — which is the single fact that explains most of what follows.' },
      { type: 'h2', text: 'Stage one — arriving and claiming' },
      { type: 'p', text: () => {
        const rows = Array.isArray(_CW.ROUTE_OF_ENTRY_QUARTERLY) ? _CW.ROUTE_OF_ENTRY_QUARTERLY : [];
        const total = rows.reduce((s, r) => s + (r.v || 0), 0);
        if (!total) return 'People reach the UK by many routes — small boats, lorries, or legally on a visa that they hold when they later claim asylum.';
        const irr = rows.filter(r => /illegal|irregular/i.test(r.group || '')).reduce((s, r) => s + (r.v || 0), 0);
        const visa = rows.filter(r => /visa/i.test(r.group || '')).reduce((s, r) => s + (r.v || 0), 0);
        const boat = rows.filter(r => /small boat/i.test(r.sub || '')).reduce((s, r) => s + (r.v || 0), 0);
        const year = _CW.ROUTE_OF_ENTRY_META?.year;
        return <>People reach the UK by many routes. In {year ?? 'the latest year'}, {Math.round(irr / total * 100)}% of asylum claims came from people who entered without permission — small boats alone accounted for {Math.round(boat / total * 100)}% — while {Math.round(visa / total * 100)}% came from people who had arrived legally on a visa and claimed afterwards. Once a claim is lodged the person is an <Gloss term="asylum seeker">asylum seeker</Gloss>: legally present while the claim is decided, whatever the route in.</>;
      } },
      { type: 'figure', render: () => {
        const rows = Array.isArray(_CW.ROUTE_OF_ENTRY_QUARTERLY) ? _CW.ROUTE_OF_ENTRY_QUARTERLY : [];
        if (!rows.length) return null;
        const groups = {};
        for (const r of rows) groups[r.group] = (groups[r.group] || 0) + (r.v || 0);
        const palette = { }; let i = 0;
        const colors = ['var(--accent-warn)', 'var(--accent)', 'var(--accent-gold)', 'var(--muted-2)'];
        const data = Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, v, color: colors[i++] || 'var(--muted-2)' }));
        return (
          <>
            <div className="uc" style={{color:'var(--muted)',marginBottom:10}}>How people who claimed asylum entered · {_CW.ROUTE_OF_ENTRY_META?.year ?? 'latest year'} · includes dependants</div>
            <StackedBar data={data} width={640} height={90}/>
            <div className="uc" style={{marginTop:12,color:'var(--muted-2)'}}>Source: Home Office · route of entry (claim date basis)</div>
          </>
        );
      } },
      { type: 'h2', text: 'Stage two — waiting' },
      { type: 'p', text: () => {
        const snaps = _backlogDec();
        const last = snaps[snaps.length - 1];
        const t = _CW.SUPPORT_TIERS_LATEST;
        return <>Claims are not decided at the border. {last ? <>At the end of {last.y}, {_fmtS(last.v)} people were waiting for a first decision — the <Gloss term="backlog">backlog</Gloss>.</> : 'The queue of undecided cases is called the backlog.'} Most asylum seekers cannot work while they wait. Those who would otherwise be destitute get accommodation and subsistence{t?.total ? <> — {_fmtS(t.total)} people were on some form of support at the latest snapshot</> : ''} — and are housed wherever the accommodation contractors have space, which is why support concentrates in particular towns and cities.</>;
      } },
      { type: 'h2', text: 'Stage three — the first decision' },
      { type: 'p', text: () => {
        const g = _grantFigures();
        if (!g) return null;
        return <>A caseworker eventually decides the claim: protection granted, another form of leave granted, refused, or the claim is withdrawn. In {g.year} there were {_fmtS(g.total)} initial outcomes, of which {g.allPct}% granted protection or leave. Since early 2026, a successful claim brings “core protection” of 30 months at a time, reviewed and renewed only while protection is still needed — before that, refugees received five years’ leave on a track to permanent settlement. The route to settled status now runs to 20 years, with an “earned settlement” consultation to define shortcuts.</>;
      } },
      { type: 'h2', text: 'Stage four — appeal' },
      { type: 'p', text: () =>
        <>A refused applicant can usually appeal to the First-tier Tribunal — a court independent of the Home Office. Appeals matter to the statistics: roughly a third of appeals heard have succeeded in recent published figures (36% in 2024, as published), historically lifting the final grant rate 15–20 percentage points above the initial one. The Home Office has not published appeal outcomes since 2023, and the appeals queue itself — reported at about 87,000 cases by spring 2026 — has become the system’s new bottleneck.</> },
      { type: 'h2', text: 'Stage five — after the decision' },
      { type: 'p', text: () => {
        const rows = Array.isArray(_CW.RETURNS_BY_NATIONALITY) ? _CW.RETURNS_BY_NATIONALITY : [];
        const year = _CW.RETURNS_META?.year;
        const total = rows.reduce((s, r) => s + (r.total || 0), 0);
        const enforced = rows.reduce((s, r) => s + (r.enforced || 0), 0);
        return <>Refused claims that exhaust their appeals end in departure — voluntary or enforced — or in limbo. {total ? <>In {year ?? 'the latest year'} there were {_fmtS(total)} returns of all kinds, of which {_fmtS(enforced)} were enforced.</> : ''} Granted claims end in protection, now time-limited and reviewable. Between those poles sits a population the statistics see only sideways: people refused but not returned, supported under Section 4, or simply no longer in contact with the system.</>;
      } },
      { type: 'p', text: () => {
        const res = Array.isArray(_CW.RESETTLEMENT_SERIES) ? _CW.RESETTLEMENT_SERIES : [];
        if (!res.length) return null;
        const years = Object.keys(res[0] || {}).filter(k => /^\d{4}$/.test(k)).sort();
        const latest = years[years.length - 1];
        const total = latest ? res.reduce((s, r) => s + (r[latest] || 0), 0) : null;
        return <>There is one route that skips every stage above: resettlement. Refugees selected abroad — mostly via the UN refugee agency — are brought directly to the UK with status already granted{total ? <>; {_fmtS(total)} people arrived this way in {latest}</> : ''}. From 2026 the government sets an annual cap on these safe routes, sized, it says, to community capacity.</>;
      } },
      { type: 'callout', text: () =>
        <>Where to find each stage on this site: arrivals live on the Dashboard (and the Flow page shows routes into the system); waiting is the backlog chart and the geography stories; decisions and grant rates have their own story and dashboard figures; appeals appear only as caveats, because the data is not published; returns are on the Atlas. Every figure in this article is computed live from the same sources as the charts.</> },
    ],
  },

  // ───────────────────────────────────────────────────────────
  // Explainer · What the 2025–26 policy changes mean for the numbers
  // (id: policy-2026)
  // ───────────────────────────────────────────────────────────
  'policy-2026': {
    blocks: [
      { type: 'p', text: () =>
        'Between late 2025 and the middle of 2026 the UK asylum system was reshaped more thoroughly than at any point since the early 2000s. This explainer is not an assessment of whether the changes are working — it is a map: what each change is, and which line on which chart it should eventually show up in.' },
      { type: 'h2', text: 'The Border Security, Asylum and Immigration Act' },
      { type: 'p', text: () =>
        <>The Act became law in December 2025. It created a Border Security Commander, new offences aimed at smuggling networks — supplying boat parts, handling crossing logistics, endangering lives at sea — with sentences up to 14 years, and stronger powers to seize and search phones. Its stated target is the supply side of crossings: the gangs, not the passengers.</> },
      { type: 'p', text: () => {
        const yoy = _CW.BOATS_YOY || {};
        const yrs = Object.keys(yoy).sort();
        const latest = yrs[yrs.length - 1], prior = yrs[yrs.length - 2];
        if (!latest || !prior) return null;
        const arr = yoy[latest] || [];
        let ytd = null, day = null;
        for (let i = arr.length - 1; i >= 0; i--) { if (arr[i] != null) { ytd = arr[i]; day = i; break; } }
        const priorPoint = day != null && (yoy[prior] || [])[day] != null ? yoy[prior][day] : null;
        const delta = (ytd != null && priorPoint) ? _pctS(ytd, priorPoint) : null;
        return <>Where to look: the arrivals and preventions series. So far in {latest}, {_fmtS(ytd)} people have crossed{delta != null ? <> — {Math.abs(delta).toFixed(0)}% {delta >= 0 ? 'more' : 'fewer'} than at the same point in {prior}</> : ''}. One honest caution applies to every section of this article: a single year’s move has many causes — weather, French policing, routes shifting — and no chart can attribute it to one law.</>;
      } },
      { type: 'h2', text: 'Temporary protection' },
      { type: 'p', text: () =>
        <>From early 2026, a successful asylum claim brings “core protection” lasting 30 months at a time, renewed only while protection is still needed — replacing the five years’ leave that previously led to settlement. The settlement route itself stretches to 20 years, with consultations on letting people earn it faster. This is the deepest structural change of the set, and the one the current statistics see least: it does not change how many people arrive or how many claims are granted, but what a grant means afterwards. Its numbers — reviews, renewals, revocations — do not yet exist as published series.</> },
      { type: 'h2', text: 'Support becomes discretionary' },
      { type: 'p', text: () => {
        const t = _CW.SUPPORT_TIERS_LATEST;
        return <>The legal duty to support destitute asylum seekers has been replaced by a discretionary power, with support refusable on grounds including criminality, and contributions expected from those with assets or income. Where to look: the supported-population series{t?.total ? <> ({_fmtS(t.total)} people at the latest snapshot)</> : ''} and its split between support types. If discretion is used at scale, the supported total should fall faster than the backlog does.</>;
      } },
      { type: 'h2', text: 'The France deal' },
      { type: 'p', text: () =>
        <>A “one in, one out” pilot agreed with France in July 2025 allows the UK to return some small-boat arrivals to France, admitting an equal number of asylum seekers from France through a legal route. By early March 2026 about 354 people had been returned under it (as reported). In April 2026 the two governments agreed a new three-year funding cycle worth £662 million for enforcement on the French coast.</> },
      { type: 'p', text: () => {
        const wk = Array.isArray(_CW.BOATS_WEEKLY) ? _CW.BOATS_WEEKLY : [];
        const withP = wk.filter(w => w && w.p != null && w.m != null).slice(-13);
        const p = withP.reduce((s, w) => s + w.p, 0), m = withP.reduce((s, w) => s + w.m, 0);
        return <>Where to look: two places. Returns under the deal are small next to arrivals — hundreds against tens of thousands — so their effect, if any, would be through deterrence rather than volume. The French-side effort shows up more directly in <Gloss term="preventions">preventions</Gloss>{(p + m) ? <>: over the latest thirteen reported weeks, {Math.round(p / (p + m) * 100)}% of recorded crossing attempts were stopped before reaching UK waters</> : ''}.</>;
      } },
      { type: 'h2', text: 'The hotels wind-down' },
      { type: 'p', text: () => {
        const h = Array.isArray(_CW.HOTELS) ? _CW.HOTELS : [];
        if (h.length < 3) return null;
        const last = h[h.length - 1];
        const peak = h.reduce((a, b) => (b.persons_in_hotels || 0) > (a.persons_in_hotels || 0) ? b : a, h[0]);
        const fmtD = s => { const d = new Date(s + 'T00:00:00Z'); return `${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
        const drop = _pctS(last.persons_in_hotels, peak.persons_in_hotels);
        return <>The government has pledged to end asylum hotels by the end of this Parliament, moving people to large sites — including former military bases — and standard housing. This is the change the data can already see: {_fmtS(last.persons_in_hotels)} people were in hotels at the {fmtD(last.date)} snapshot{drop != null ? <>, {Math.abs(drop).toFixed(0)}% below the peak of {_fmtS(peak.persons_in_hotels)} in {fmtD(peak.date)}</> : ''}. Hotel spending was £2.1 billion in 2024–25, down from £3.0 billion the year before (as published). Where to look: the hotels snapshot series, quarter by quarter.</>;
      } },
      { type: 'figure', render: () => {
        const h = Array.isArray(_CW.HOTELS) ? _CW.HOTELS : [];
        if (h.length < 4) return null;
        return (
          <>
            <div className="uc" style={{color:'var(--muted)',marginBottom:10}}>People in asylum hotels · quarterly snapshots</div>
            <Spark data={h.map((r, i) => ({ y: i, v: r.persons_in_hotels }))} width={640} height={90} stroke="var(--accent-warn)" area/>
            <div className="uc" style={{marginTop:12,color:'var(--muted-2)'}}>Source: Home Office · Asy_D09 · {h[0].date} → {h[h.length-1].date}</div>
          </>
        );
      } },
      { type: 'h2', text: 'The backlog moved, it didn’t vanish' },
      { type: 'p', text: () => {
        const snaps = _backlogDec();
        if (snaps.length < 2) return null;
        const peak = snaps.reduce((a, b) => b.v > a.v ? b : a);
        const last = snaps[snaps.length - 1];
        return <>The queue for first decisions fell from {_fmtS(peak.v)} at the end of {peak.y} to {_fmtS(last.v)} at the end of {last.y} — the government’s clearest statistical win. But faster refusals feed the appeal courts: the appeals queue was reported at about 87,000 cases by spring 2026, up 72% in a year. Where to look: the backlog chart on the Dashboard tells the first half of this story; the second half is currently invisible in official data, which is itself worth knowing.</>;
      } },
      { type: 'callout', text: () =>
        <>How to read policy claims against these charts: ask which series the claim should move, in which direction, starting when — then look. Most changes in this article are too recent, or their series too noisy, for a verdict either way. Figures marked “as reported” or “as published” come from government statements and parliamentary reporting rather than this site’s data pipeline, with dates given so they can be checked.</> },
    ],
  },
};

// ── Shared derivations for the bodies above ──────────────────
// `_CW` (the window alias) is declared once in copy.jsx, which loads
// earlier in the bundle — do not redeclare it here, the files share one
// script scope after concatenation.
function _natSorted() {
  const rows = Array.isArray(_CW.NAT_FULL) ? _CW.NAT_FULL : [];
  return [...rows].sort((a, b) => (b.v || 0) - (a.v || 0));
}
// "Eritrea" → "Eritrean" etc. Only used for the handful of names that can
// realistically top the table; falls back to "<Name>" + " nationals" being
// rephrased by the caller if unknown.
function _natAdj(name) {
  const map = { Eritrea: 'Eritrean', Pakistan: 'Pakistani', Afghanistan: 'Afghan', Iran: 'Iranian', Sudan: 'Sudanese', Syria: 'Syrian', Albania: 'Albanian', India: 'Indian', Iraq: 'Iraqi', Vietnam: 'Vietnamese', Somalia: 'Somali', Bangladesh: 'Bangladeshi' };
  return map[name] || name;
}
// Which nationality led each year, from the fixed five-series panel —
// compressed to "Name topped YYYY–YYYY" runs.
function _natLeadersByYear() {
  const ns = _CW.NAT_SERIES_LATEST;
  if (!ns || !Array.isArray(ns.years) || !Array.isArray(ns.series)) return [];
  const runs = [];
  ns.years.forEach((y, i) => {
    let best = null;
    for (const s of ns.series) {
      const v = s.data[i];
      if (v != null && (best == null || v > best.v)) best = { name: s.name, v };
    }
    if (!best) return;
    const prev = runs[runs.length - 1];
    if (prev && prev.name === best.name) { prev.to = y; }
    else runs.push({ name: best.name, from: y, to: y });
  });
  return runs.map(r => ({ name: r.name, years: r.from === r.to ? String(r.from) : `${r.from}–${r.to}` }));
}
// Backlog: 31 December snapshots only (the documented definition); guards
// against mid-year partial rows.
function _backlogDec() {
  const rows = Array.isArray(_CW.BACKLOG_LATEST) ? _CW.BACKLOG_LATEST : [];
  return rows.filter(r => /^31 Dec/.test(r.date || '')).map(r => ({ y: r.y, v: r.v }));
}
// Decisions: grant rate two ways (all outcomes vs substantive only).
function _grantFigures() {
  const dec = Array.isArray(_CW.DECISIONS_LATEST) ? _CW.DECISIONS_LATEST : [];
  if (!dec.length) return null;
  const total = dec.reduce((s, r) => s + (r.v || 0), 0);
  if (!total) return null;
  const granted = dec.filter(r => /grant/i.test(r.label)).reduce((s, r) => s + (r.v || 0), 0);
  const withdrawn = dec.filter(r => /withdraw|admin/i.test(r.label)).reduce((s, r) => s + (r.v || 0), 0);
  const refused = dec.filter(r => /refus/i.test(r.label)).reduce((s, r) => s + (r.v || 0), 0);
  const subst = total - withdrawn;
  return {
    year: _CW.DECISIONS_META?.year ?? null,
    total, granted, refused, withdrawn,
    allPct: Math.round(granted / total * 100),
    substPct: subst > 0 ? Math.round(granted / subst * 100) : null,
  };
}
// Local-authority support, sorted, with "how many councils make a third".
function _laSorted() {
  const rows = (Array.isArray(_CW.SUPPORT_LA_LATEST) ? _CW.SUPPORT_LA_LATEST : [])
    .filter(r => r && r.total > 0)
    .sort((a, b) => (b.total || 0) - (a.total || 0));
  const total = rows.reduce((s, r) => s + (r.total || 0), 0);
  let cum = 0, thirdCount = 0;
  for (const r of rows) { cum += r.total || 0; thirdCount++; if (cum >= total / 3) break; }
  return { rows, total, thirdCount };
}

Object.assign(window, { STORY_BODIES, StoryBody });
