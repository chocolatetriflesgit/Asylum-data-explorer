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
// Line chart — single series with optional annotations
// ─────────────────────────────────────────────────────────────
function LineChart({
  data, width=720, height=320, annotations=[],
  stroke='var(--accent)', area=true, title='', subtitle='', source='',
  yearRange=null,
  caption=null,
  showLabels=false,
  showLine=true,
  xLabelFmt=null,
}) {
  const { show, hide, node } = useTooltip();
  const pad = { t: 16, r: 24, b: 32, l: 48 };
  const W = width, H = height;
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

  // filter by yearRange
  const filtered = yearRange
    ? data.filter(d => d.y >= yearRange[0] && d.y <= yearRange[1])
    : data;
  const d = filtered.length ? filtered : data;

  const xs = d.map(p => p.y);
  const ys = d.map(p => p.v);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMax = Math.max(...ys) * 1.1;
  const x = v => pad.l + (xMax === xMin ? iw/2 : ((v - xMin) / (xMax - xMin)) * iw);
  const y = v => pad.t + (1 - v/yMax) * ih;
  const pts = d.map(p => `${x(p.y)},${y(p.v)}`).join(' ');
  const areaPath = d.length
    ? `M${x(d[0].y)},${y(0)} L${d.map(p=>`${x(p.y)},${y(p.v)}`).join(' L')} L${x(d[d.length-1].y)},${y(0)} Z`
    : '';

  const step = yMax / 4;
  const yTicks = Array.from({length:5}, (_,i) => Math.round(i*step/5000)*5000).filter((v,i,a)=>a.indexOf(v)===i);

  return (
    <figure className="chart-wrap" style={{ position:'relative', margin:0 }}>
      {title && (
        <figcaption style={{marginBottom:14}}>
          <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>{subtitle}</div>
          <div style={{fontSize:19,fontWeight:500,letterSpacing:-0.1,color:'var(--ink)'}}>{title}</div>
        </figcaption>
      )}
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block',overflow:'visible'}}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={stroke} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {yTicks.map(t=>(
          <g key={t}>
            <line x1={pad.l} x2={W-pad.r} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth="1"/>
            <text x={pad.l-10} y={y(t)+4} textAnchor="end" fontSize="11" fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{fmtK(t)}</text>
          </g>
        ))}
        {d.map((p,i)=>({p,i}))
           .filter(({i})=>i%Math.max(1,Math.ceil(d.length/8))===0 || i===d.length-1)
           .map(({p,i})=>(
          <text key={`xt-${i}`} x={x(p.y)} y={H-pad.b+18} textAnchor="middle" fontSize="11" fill="var(--muted)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>
            {xLabelFmt ? xLabelFmt(p.y, i, p) : (p.label ?? p.y)}
          </text>
        ))}
        <line x1={pad.l} x2={W-pad.r} y1={H-pad.b} y2={H-pad.b} stroke="var(--rule-2)"/>
        {area && <path d={areaPath} fill="url(#areaGrad)"/>}
        {showLine && <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>}
        {d.map((p,i)=>(
          <g key={`pt-${i}`}>
            <circle cx={x(p.y)} cy={y(p.v)} r={showLine ? 3 : 4} fill={stroke}/>
            <circle cx={x(p.y)} cy={y(p.v)} r="14" fill="transparent"
              onMouseMove={e=>show(e, <span><b>{p.label ?? p.y}</b> · <span className="tnum">{fmtN(p.v)}</span></span>)}
              onMouseLeave={hide}
              style={{cursor:'crosshair'}}
            />
            {showLabels && (
              <text x={x(p.y)} y={y(p.v)-10} textAnchor="middle" fontSize="10.5" fill="var(--ink-2)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>
                {fmtK(p.v)}
              </text>
            )}
          </g>
        ))}
        {annotations.map((a,i)=>{
          const pt = d.find(p=>p.y===a.y); if(!pt) return null;
          const px = x(pt.y), py = y(pt.v);
          const dx = a.dx||30, dy = a.dy||-26;
          return (
            <g key={i}>
              <circle cx={px} cy={py} r="5" fill="none" stroke={stroke} strokeWidth="1"/>
              <line x1={px} y1={py} x2={px+dx} y2={py+dy} stroke={stroke} strokeWidth="0.8"/>
              <text x={px+dx+4} y={py+dy+4} fontSize="11.5" fill="var(--ink-2)" style={{fontFamily:'var(--serif)',fontStyle:'italic'}}>{a.label}</text>
            </g>
          );
        })}
      </svg>
      {caption && <div style={{fontSize:12.5,color:'var(--muted)',marginTop:10,fontStyle:'italic',lineHeight:1.5,maxWidth:640}}>{caption}</div>}
      {source && <div className="uc" style={{marginTop:12,color:'var(--muted-2)'}}>Source: {source}</div>}
      {node}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Multi-line chart
// ─────────────────────────────────────────────────────────────
const MULTI_COLORS = ['var(--accent)', 'var(--accent-warn)', 'var(--accent-2)', 'var(--accent-gold)', 'var(--muted)'];
function MultiLineChart({ years, series, width=720, height=300, showLabels=false }) {
  const { show, hide, node } = useTooltip();
  const pad = { t: 16, r: 120, b: 32, l: 48 };
  const W = width, H = height;
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const allV = series.flatMap(s=>s.data);
  const yMax = Math.max(...allV) * 1.12;
  const x = i => pad.l + (i/(years.length-1))*iw;
  const y = v => pad.t + (1 - v/yMax)*ih;
  const yTicks = [0, yMax*0.25, yMax*0.5, yMax*0.75, yMax].map(v=>Math.round(v/1000)*1000).filter((v,i,a)=>a.indexOf(v)===i);

  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
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
        {series.map((s,si)=>{
          const color = MULTI_COLORS[si % MULTI_COLORS.length];
          const pts = s.data.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
          const last = s.data.length-1;
          return (
            <g key={`${si}-${s.name}`}>
              <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
              {s.data.map((v,i)=>(
                <g key={i}>
                  <circle cx={x(i)} cy={y(v)} r="2.6" fill={color}/>
                  <circle cx={x(i)} cy={y(v)} r="12" fill="transparent"
                    onMouseMove={e=>show(e, <span><b>{s.name}</b> · {years[i]} · <span className="tnum">{fmtN(v)}</span></span>)}
                    onMouseLeave={hide}
                  />
                </g>
              ))}
              <text x={x(last)+10} y={y(s.data[last])+4} fontSize="12" fill={color} style={{fontFamily:'var(--serif)',fontStyle:'italic'}}>{s.name}</text>
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
            <g key={i} onMouseMove={e=>show(e, <span><b>{d.label ?? d.y}</b> · {series[0]} <span className="tnum">{fmtN(d.a||0)}</span> · {series[1]} <span className="tnum">{fmtN(d.b||0)}</span></span>)} onMouseLeave={hide} style={{cursor:'crosshair'}}>
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
// Horizontal bar chart
// ─────────────────────────────────────────────────────────────
function BarChart({ data, width=720, height=null, valueFmt=fmtN, color='var(--accent)', showGrant=false }) {
  const { show, hide, node } = useTooltip();
  const rowH = 30;
  const H = height || data.length * rowH + 16;
  const pad = { t: 8, r: 90, b: 8, l: 130 };
  const iw = width - pad.l - pad.r;
  const vMax = Math.max(...data.map(d=>d.v));
  return (
    <figure className="chart-wrap" style={{position:'relative',margin:0}}>
      <svg width="100%" height={H} viewBox={`0 0 ${width} ${H}`} style={{display:'block'}}>
        {data.map((d,i)=>{
          const y = pad.t + i*rowH;
          const w = (d.v/vMax)*iw;
          return (
            <g key={d.name}
              onMouseMove={e=>show(e, <span><b>{d.name}</b> · <span className="tnum">{valueFmt(d.v)}</span>{showGrant && d.grant !== undefined ? <> · grant rate <span className="tnum">{Math.round(d.grant*100)}%</span></> : null}</span>)}
              onMouseLeave={hide}
              style={{cursor:'crosshair'}}>
              <text x={pad.l-10} y={y+rowH/2+4} textAnchor="end" fontSize="13" fill="var(--ink-2)" style={{fontFamily:'var(--serif)'}}>{d.name}</text>
              <rect x={pad.l} y={y+6} width={iw} height={rowH-12} fill="var(--bg-2)"/>
              <rect x={pad.l} y={y+6} width={w} height={rowH-12} fill={color}/>
              <text x={pad.l+w+8} y={y+rowH/2+4} fontSize="12" fill="var(--ink-2)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>{valueFmt(d.v)}</text>
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
              <text x={x} y={15} fontSize="11" fill="var(--muted)" className="uc" style={{fontFamily:'var(--serif)'}}>
                {d.label}
              </text>
              <text x={x} y={72} fontSize="12" fill="var(--ink)" style={{fontVariantNumeric:'tabular-nums',fontFamily:'var(--serif)'}}>
                {fmtN(d.v)} <tspan fill="var(--muted)">· {Math.round(d.v/total*100)}%</tspan>
              </text>
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

Object.assign(window, { LineChart, MultiLineChart, BarChart, StackedBar, StackedColumns, Spark, Ring, RegionList, fmtK, fmtN });
