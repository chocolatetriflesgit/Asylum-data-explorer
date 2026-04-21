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

// ─────────────────────────────────────────────────────────────
// Line chart — single series with optional annotations.
// breakY={[lo, hi]} adds a y-axis break: shaded band + zigzag
// edges cover the skipped range; grid intervals stay consistent
// on both sides so the slope of the line is preserved.
// ─────────────────────────────────────────────────────────────
function LineChart({
  data, width=720, height=320, annotations=[],
  stroke='var(--accent)', area=true, title='', subtitle='', source='',
  yearRange=null,
  caption=null,
  showLabels=false,
  showLine=true,
  xLabelFmt=null,
  breakY=null,
}) {
  const { show, hide, node } = useTooltip();
  const W = width, H = height;

  const filtered = yearRange ? data.filter(d => d.y >= yearRange[0] && d.y <= yearRange[1]) : data;
  const d = filtered.length ? filtered : data;

  const xs = d.map(p => p.y);
  const ys = d.map(p => p.v);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMax = Math.max(...ys) * 1.1;

  // Only apply break when data genuinely spans both zones.
  const effectiveBreak = breakY && d.some(p => p.v < breakY[0]) && d.some(p => p.v > breakY[1]) ? breakY : null;

  const BAND_H = 28;
  const pad = { t: 16, r: effectiveBreak ? 92 : 24, b: 32, l: 48 };
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
            <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)"
              style={{fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--serif)'}}>{fmtK(t)}</text>
          </g>
        ))}
        {/* X-axis labels */}
        {d.map((p, i) => ({p, i}))
          .filter(({i}) => i % Math.max(1, Math.ceil(d.length / 8)) === 0 || i === d.length - 1)
          .map(({p, i}) => (
            <text key={`xt-${i}`} x={x(p.y)} y={H - pad.b + 18} textAnchor="middle" fontSize="11" fill="var(--muted)"
              style={{fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--serif)'}}>
              {xLabelFmt ? xLabelFmt(p.y, i, p) : (p.label ?? p.y)}
            </text>
          ))}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--rule-2)"/>
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
        {/* Data points + hit areas */}
        {d.map((p, i) => (
          <g key={`pt-${i}`}>
            <circle cx={x(p.y)} cy={y(p.v)} r={showLine ? 3 : 4} fill={stroke}/>
            <circle cx={x(p.y)} cy={y(p.v)} r="14" fill="transparent"
              onMouseMove={e => show(e, <span><b>{p.label ?? p.y}</b> · <span className="tnum">{fmtN(p.v)}</span></span>)}
              onMouseLeave={hide} style={{cursor: 'crosshair'}}/>
            {showLabels && (
              <text x={x(p.y)} y={y(p.v) - 10} textAnchor="middle" fontSize="10.5" fill="var(--ink-2)"
                style={{fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--serif)'}}>{fmtK(p.v)}</text>
            )}
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
      {source && <div className="uc" style={{marginTop: 12, color: 'var(--muted-2)'}}>Source: {source}</div>}
      {node}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Multi-line chart
// ─────────────────────────────────────────────────────────────
const MULTI_COLORS = ['var(--accent)', 'var(--accent-warn)', 'var(--accent-2)', 'var(--accent-gold)', 'var(--muted)'];
function MultiLineChart({ years, series, width=720, height=300, showLabels=false, legend=false, yLabel=null, breakY=null }) {
  const { show, hide, node } = useTooltip();
  const pad = { t: 16, r: legend ? 24 : 120, b: 32, l: 48 };
  const W = width, H = height;
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const allV = series.flatMap(s=>s.data);
  const yMax = Math.max(...allV) * 1.12;
  const x = i => pad.l + (i/(years.length-1))*iw;

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
    yTicks = [0, yMax*0.25, yMax*0.5, yMax*0.75, yMax].map(v=>Math.round(v/1000)*1000).filter((v,i,a)=>a.indexOf(v)===i);
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
        {years.map((yr,i)=>(
          <text key={yr} x={x(i)} y={H-pad.b+18} textAnchor="middle" fontSize="11" fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{yr}</text>
        ))}
        <line x1={pad.l} x2={W-pad.r} y1={H-pad.b} y2={H-pad.b} stroke="var(--rule-2)"/>
        {yLabel && <text x={pad.l} y={pad.t - 4} textAnchor="start" fontSize="10" fill="var(--muted)" style={{fontFamily:'var(--serif)'}}>{yLabel}</text>}
        {/* Lines rendered first so break band can mask them */}
        {series.map((s,si)=>{
          const color = MULTI_COLORS[si % MULTI_COLORS.length];
          const pts = s.data.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
          return <polyline key={`line-${si}`} points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>;
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
        {series.map((s,si)=>{
          const color = MULTI_COLORS[si % MULTI_COLORS.length];
          const last = s.data.length-1;
          return (
            <g key={`pts-${si}-${s.name}`}>
              {s.data.map((v,i)=>(
                <g key={i}>
                  <circle cx={x(i)} cy={y(v)} r="2.6" fill={color}/>
                  <circle cx={x(i)} cy={y(v)} r="12" fill="transparent"
                    onMouseMove={e=>show(e, <span><b>{s.name}</b> · {years[i]} · <span className="tnum">{fmtN(v)}</span></span>)}
                    onMouseLeave={hide}
                  />
                </g>
              ))}
              {!legend && <text x={x(last)+10} y={y(s.data[last])+4} fontSize="12" fill={color} style={{fontFamily:'var(--serif)',fontStyle:'italic'}}>{s.name}</text>}
              {showLabels && s.data.map((v,i)=>(
                <text key={`lbl-${i}`} x={x(i)} y={y(v)-8} textAnchor="middle" fontSize="10" fill={color} style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK(v)}</text>
              ))}
            </g>
          );
        })}
      </svg>
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
  const pad = { t: 16, r: 160, b: 36, l: 56 };
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
              <text x={cx} y={H-pad.b+18} textAnchor="middle" fontSize="11" fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{yr}</text>
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
function Ring({ value, size=140, stroke=14, label='', sub='' }) {
  const r = size/2 - stroke/2;
  const c = 2*Math.PI*r;
  const off = c * (1 - value);
  return (
    <div style={{display:'inline-flex',flexDirection:'column',alignItems:'center',gap:4}}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{transition:'stroke-dashoffset .5s ease'}}/>
        <text x={size/2} y={size/2+2} textAnchor="middle" fontSize="26" fill="var(--ink)" style={{fontFamily:'var(--serif)',fontVariantNumeric:'tabular-nums'}}>
          {Math.round(value*100)}%
        </text>
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
          <th className="uc" style={{padding:'0 0 10px',textAlign:'left',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent-gold)'}}>Region</th>
          <th className="uc" style={{padding:'0 0 10px',textAlign:'right',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent-gold)'}}>Applicants</th>
          <th className="uc" style={{padding:'0 0 10px',textAlign:'right',fontWeight:500,color:'var(--muted)',borderBottom:'2px solid var(--accent-gold)'}}>Share</th>
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
                <td style={{padding:'10px 0',color:'var(--ink)'}}>
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
                <td className="tnum" style={{padding:'10px 0',textAlign:'right'}}>{fmtN(r.v)}</td>
                <td className="tnum" style={{padding:'10px 0',textAlign:'right',color:'var(--muted)'}}>{(r.v/total*100).toFixed(1)}%</td>
              </tr>
              {isOpen && countries.map(c => (
                <tr key={c.name} style={{borderBottom:'1px solid var(--rule)',background:'var(--bg-2)'}}>
                  <td style={{padding:'5px 0 5px 26px',color:'var(--ink-2)',fontSize:12.5}}>{c.name}</td>
                  <td className="tnum" style={{padding:'5px 0',textAlign:'right',fontSize:12.5}}>{fmtN(c.v)}</td>
                  <td className="tnum" style={{padding:'5px 0',textAlign:'right',color:'var(--muted)',fontSize:12.5}}>
                    {(c.v / total * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </React.Fragment>
          );
        })}
        <tr>
          <td className="uc" style={{padding:'12px 0 0',color:'var(--muted)'}}>Total</td>
          <td className="tnum" style={{padding:'12px 0 0',textAlign:'right',color:'var(--ink)',fontWeight:500}}>{fmtN(total)}</td>
          <td className="tnum" style={{padding:'12px 0 0',textAlign:'right',color:'var(--muted)'}}>100.0%</td>
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
    zoomIn, zoomOut, reset, flyTo,
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
function WorldMapChoropleth({ data, width=720, height=380 }) {
  const worldMap = (typeof window !== 'undefined' && window.WORLD_MAP) ? window.WORLD_MAP : null;
  const zoom = useMapZoom(width, height);
  if (!worldMap) return <RegionWorldMap data={data} width={width} height={height}/>;
  const { show, hide, node } = useTooltip();
  const byRegion = Object.fromEntries(data.map(d => [d.name, d.v]));
  const total = data.reduce((s, d) => s + d.v, 0);
  const vMax = Math.max(...data.map(d => d.v), 1);
  // sqrt compresses the long tail so mid-range regions reach the middle stops
  // of the palette instead of all collapsing into the lightest band.
  const fillFor = v => {
    if (!(v > 0)) return ATLAS_PALETTE[0];
    return atlasPaletteColor(Math.sqrt(v / vMax));
  };
  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      <svg width="100%" height={height} viewBox={zoom.viewBox} {...zoom.svgProps}
        style={{display:'block', ...zoom.svgProps.style}}>
        <rect x={0} y={0} width={width} height={height} fill="var(--bg-2)"/>
        <g>
          {worldMap.map((c, i) => {
            const regionTotal = byRegion[c.region] ?? 0;
            const pct = total ? (regionTotal/total*100) : 0;
            // Natural Earth uses '-99' for disputed / unrecognised territories, so
            // ISO alone isn't unique. Compose with name + index for a stable key.
            return (
              <path key={`${c.iso || ''}-${c.name}-${i}`} d={c.d}
                fill={fillFor(regionTotal)}
                stroke="var(--rule-2)" strokeWidth={0.4}
                onMouseMove={e => show(e, <span><b>{c.name}</b> · {c.region}{c.region !== 'Other / Unclassified' ? <> · region total <span className="tnum">{fmtN(regionTotal)}</span> · {pct.toFixed(1)}%</> : null}</span>)}
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
// Sankey chart — two-column nationality → decision outcome flow
// nodes: [{id, label, col (0=left,1=right), value, color}]
// links: [{source, target, value}]  (source must be col-0 node)
// ─────────────────────────────────────────────────────────────
function SankeyChart({ nodes, links, width = 820, height = 500 }) {
  const { show, hide, node: ttNode } = useTooltip();

  const NODE_W = 20;
  const GAP    = 8;
  const PAD    = { l: 150, r: 185, t: 12, b: 12 };

  const leftNodes  = nodes.filter(n => n.col === 0);
  const rightNodes = nodes.filter(n => n.col === 1);
  const totalVal   = leftNodes.reduce((s, n) => s + n.value, 0);
  const innerH     = height - PAD.t - PAD.b;

  // Compute pixel y and h for every node
  const layout = {};
  for (const [colNodes, xBase] of [
    [leftNodes,  PAD.l],
    [rightNodes, width - PAD.r - NODE_W],
  ]) {
    const avail = innerH - GAP * (colNodes.length - 1);
    let y = PAD.t;
    for (const n of colNodes) {
      const h = Math.max(2, (n.value / totalVal) * avail);
      layout[n.id] = { x: xBase, y, h };
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

    const pct = ((lk.value / totalVal) * 100).toFixed(1);
    const tt  = <span><b>{sn.label}</b> → <b>{tn.label}</b>: <span className="tnum">{fmtN(lk.value)}</span> ({pct}%)</span>;
    return { d, color: sn.color, tt, key: `${lk.source}→${lk.target}` };
  }).filter(Boolean);

  return (
    <figure className="chart-wrap" style={{ position: 'relative', margin: 0 }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {renderedLinks.map(lk => (
          <path key={lk.key} d={lk.d}
            fill={lk.color} fillOpacity={0.35} stroke="none"
            onMouseMove={e => show(e, lk.tt)} onMouseLeave={hide}
            style={{ cursor: 'default' }}/>
        ))}
        {nodes.map(n => {
          const nl = layout[n.id];
          if (!nl) return null;
          const pct  = ((n.value / totalVal) * 100).toFixed(1);
          const tt   = <span><b>{n.label}</b>: <span className="tnum">{fmtN(n.value)}</span> ({pct}%)</span>;
          const isLeft = n.col === 0;
          return (
            <g key={n.id} onMouseMove={e => show(e, tt)} onMouseLeave={hide} style={{ cursor: 'default' }}>
              <rect x={nl.x} y={nl.y} width={NODE_W} height={nl.h} fill={n.color} rx={2}/>
              {isLeft ? (
                <text x={nl.x - 8} y={nl.y + nl.h / 2}
                  textAnchor="end" dominantBaseline="middle"
                  fontSize={11} fontFamily="var(--serif)" fill="var(--ink-2)">{n.label}</text>
              ) : (
                <text x={nl.x + NODE_W + 8} y={nl.y + nl.h / 2 - 7}
                  textAnchor="start" fontSize={11} fontFamily="var(--serif)" fill="var(--ink-2)">
                  <tspan>{n.label}</tspan>
                  <tspan x={nl.x + NODE_W + 8} dy={14} fontSize={10} fill="var(--muted)">{fmtN(n.value)} · {pct}%</tspan>
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

Object.assign(window, { LineChart, MultiLineChart, BarChart, StackedBar, StackedColumns, StackedColumnsMulti, RegionWorldMap, RegionTable, WorldMapChoropleth, Spark, Ring, RegionList, fmtK, fmtN, useMapZoom, ZoomControls, ATLAS_PALETTE, atlasPaletteColor, SankeyChart });
