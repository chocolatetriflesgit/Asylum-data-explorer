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
};

Object.assign(window, { STORY_BODIES, StoryBody });
