/* =========================================================================
   charts.jsx — SVG chart primitives + shared utilities.
   Every visual rule comes from design/tokens.md. If this file and tokens.md
   disagree, tokens.md wins — update the code to match.

   Exports (as top-level consts/functions in the bundled scope):
     fmtK, fmtN                — number formatters
     useTooltip                — tooltip hook
     MULTI_COLORS              — series colour rotation
     Tooltip, Figure           — shared presentation
     LineChart                 — single- or multi-series line chart
     Spark                     — tiny inline spark line
     ChartGrid                 — horizontal grid + x/y axes helper
   ========================================================================= */

const MULTI_COLORS = [
  "var(--accent)",
  "var(--accent-warn)",
  "var(--accent-2)",
  "var(--accent-gold)",
  "var(--muted)",
];

/* ---------- Number formatting ---------- */

const fmtN = (v) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-GB").format(Math.round(v));
};

const fmtK = (v) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const n = Number(v);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  if (Math.abs(n) >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(n));
};

/* ---------- Tooltip ---------- */

function useTooltip() {
  const [tip, setTip] = React.useState(null);
  const show = React.useCallback((x, y, label) => {
    setTip({ x, y, label });
  }, []);
  const hide = React.useCallback(() => setTip(null), []);
  return { tip, show, hide };
}

function Tooltip({ tip }) {
  if (!tip) return null;
  return (
    <div
      className="tooltip"
      style={{
        left: tip.x,
        top: tip.y - 12,
        transform: "translate(-50%, -100%)",
      }}
    >
      {tip.label}
    </div>
  );
}

/* ---------- Figure wrapper (title / caption / source) ---------- */

function Figure({ subtitle, title, caption, source, width, children }) {
  return (
    <figure className="chart-wrap" style={{ margin: 0, width }}>
      {(subtitle || title) && (
        <figcaption style={{ marginBottom: 14 }}>
          {subtitle && <div className="uc">{subtitle}</div>}
          {subtitle && <div className="rule-terra kicker-rule" />}
          {title && <div className="t-sub">{title}</div>}
        </figcaption>
      )}
      {children}
      {caption && (
        <div className="t-caption caption-col" style={{ marginTop: 10 }}>
          {caption}
        </div>
      )}
      {source && (
        <div className="uc" style={{ marginTop: 12 }}>Source: {source}</div>
      )}
    </figure>
  );
}

/* ---------- Scale helpers ---------- */

function linearScale(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  const fn = (v) => r0 + ((v - d0) / span) * (r1 - r0);
  fn.invert = (px) => d0 + ((px - r0) / (r1 - r0)) * span;
  fn.domain = domain;
  fn.range = range;
  return fn;
}

/* ---------- "Nice" tick generator ---------- */

function niceTicks(min, max, target = 5) {
  if (min === max) {
    return [min];
  }
  const span = max - min;
  const step0 = span / target;
  const pow = Math.pow(10, Math.floor(Math.log10(step0)));
  const rel = step0 / pow;
  const step = (rel >= 5 ? 10 : rel >= 2 ? 5 : rel >= 1 ? 2 : 1) * pow;
  const start = Math.ceil(min / step) * step;
  const out = [];
  for (let v = start; v <= max + 1e-9; v += step) {
    out.push(Math.round(v / step) * step);
  }
  return out;
}

/* ---------- ChartGrid (axes + horizontal grid) ---------- */

function ChartGrid({
  xScale,
  yScale,
  plotTop,
  plotBottom,
  plotLeft,
  plotRight,
  xTicks,
  yTicks,
  formatX = String,
  formatY = fmtK,
}) {
  const ySafe = yTicks || niceTicks(yScale.domain[0], yScale.domain[1], 5);
  const xSafe = xTicks || [];
  return (
    <g aria-hidden="true">
      {ySafe.map((v, i) => (
        <g key={`y-${i}`}>
          <line
            x1={plotLeft}
            x2={plotRight}
            y1={yScale(v)}
            y2={yScale(v)}
            stroke="var(--rule)"
            strokeWidth="1"
          />
          <text
            x={plotLeft - 10}
            y={yScale(v) + 4}
            textAnchor="end"
            className="t-axis"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {formatY(v)}
          </text>
        </g>
      ))}
      <line
        x1={plotLeft}
        x2={plotRight}
        y1={plotBottom}
        y2={plotBottom}
        stroke="var(--rule-2)"
        strokeWidth="1"
      />
      {xSafe.map((t, i) => (
        <text
          key={`x-${i}`}
          x={xScale(t.value)}
          y={plotBottom + 18}
          textAnchor="middle"
          className="t-axis"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {t.label ?? formatX(t.value)}
        </text>
      ))}
    </g>
  );
}

/* ---------- LineChart ---------- */

/**
 * Render one or more line series.
 *
 * props:
 *   series:        [{ name, data: [{x, y}], color? }]   (null y values are skipped)
 *   xAccessor:     (x) => number   — default: identity
 *   yAccessor:     (y) => number   — default: identity
 *   xTickFormat:   (x) => string   — formats labels for x-axis + tooltip
 *   width/height:  SVG dims
 *   fill:          whether to render the 18%->0% area gradient (primary series only)
 *   annotations:   [{ seriesIndex, x, label }]
 *   xTicks:        [{ value, label? }] — explicit tick positions
 */
function LineChart({
  series,
  width = 640,
  height = 320,
  fill = true,
  annotations = [],
  xTickFormat = String,
  xTicks,
  yTickFormat = fmtK,
  tooltipLabel,
}) {
  const padding = { top: 22, right: 24, bottom: 36, left: 48 };
  const plotLeft = padding.left;
  const plotRight = width - padding.right;
  const plotTop = padding.top;
  const plotBottom = height - padding.bottom;

  const { tip, show, hide } = useTooltip();
  const isMulti = series.length > 1;

  const allX = series.flatMap((s) => s.data.map((d) => d.x));
  const allY = series.flatMap((s) =>
    s.data.map((d) => d.y).filter((v) => v !== null && v !== undefined)
  );
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const yMaxRaw = Math.max(0, ...allY);
  const yMax = yMaxRaw === 0 ? 1 : yMaxRaw * 1.08;

  const x = linearScale([xMin, xMax], [plotLeft, plotRight]);
  const y = linearScale([0, yMax], [plotBottom, plotTop]);

  const wrapRef = React.useRef(null);
  const svgRef = React.useRef(null);

  const handleHover = (event, seriesName, xVal, yVal) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const label =
      tooltipLabel?.({ seriesName, x: xVal, y: yVal }) ??
      `${xTickFormat(xVal)} · ${isMulti ? `${seriesName}: ` : ""}${fmtN(yVal)}`;
    show(px, py, label);
  };

  const toPath = (data) => {
    let d = "";
    let pen = false;
    for (const pt of data) {
      if (pt.y === null || pt.y === undefined) {
        pen = false;
        continue;
      }
      const cmd = pen ? "L" : "M";
      d += `${cmd}${x(pt.x).toFixed(2)} ${y(pt.y).toFixed(2)} `;
      pen = true;
    }
    return d.trim();
  };

  const gradId = `grad-${React.useId().replace(/:/g, "")}`;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height={height}
        role="img"
      >
        <defs>
          {fill && series[0] && (
            <linearGradient
              id={gradId}
              x1="0"
              x2="0"
              y1={plotTop}
              y2={plotBottom}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={series[0].color || MULTI_COLORS[0]} stopOpacity="0.18" />
              <stop offset="100%" stopColor={series[0].color || MULTI_COLORS[0]} stopOpacity="0" />
            </linearGradient>
          )}
        </defs>

        <ChartGrid
          xScale={x}
          yScale={y}
          plotTop={plotTop}
          plotBottom={plotBottom}
          plotLeft={plotLeft}
          plotRight={plotRight}
          xTicks={xTicks}
          formatY={yTickFormat}
        />

        {fill && series[0] && (() => {
          const primary = series[0];
          const pts = primary.data.filter((d) => d.y !== null && d.y !== undefined);
          if (pts.length < 2) return null;
          const path =
            `M${x(pts[0].x).toFixed(2)} ${plotBottom} ` +
            pts.map((p) => `L${x(p.x).toFixed(2)} ${y(p.y).toFixed(2)}`).join(" ") +
            ` L${x(pts[pts.length - 1].x).toFixed(2)} ${plotBottom} Z`;
          return <path d={path} fill={`url(#${gradId})`} />;
        })()}

        {series.map((s, i) => {
          const color = s.color || (isMulti ? MULTI_COLORS[i % MULTI_COLORS.length] : MULTI_COLORS[0]);
          const strokeWidth = isMulti ? 1.4 : 1.8;
          return (
            <g key={s.name || i}>
              <path
                d={toPath(s.data)}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.data.map((pt, j) => {
                if (pt.y === null || pt.y === undefined) return null;
                return (
                  <g key={j}>
                    <circle
                      cx={x(pt.x)}
                      cy={y(pt.y)}
                      r={3}
                      fill={color}
                    />
                    <circle
                      cx={x(pt.x)}
                      cy={y(pt.y)}
                      r={14}
                      fill="transparent"
                      style={{ cursor: "crosshair" }}
                      onMouseEnter={(e) => handleHover(e, s.name, pt.x, pt.y)}
                      onMouseMove={(e) => handleHover(e, s.name, pt.x, pt.y)}
                      onMouseLeave={hide}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}

        {annotations.map((a, i) => {
          const s = series[a.seriesIndex ?? 0];
          if (!s) return null;
          const pt = s.data.find((d) => d.x === a.x);
          if (!pt || pt.y === null) return null;
          return (
            <g key={`ann-${i}`}>
              <circle
                cx={x(pt.x)}
                cy={y(pt.y)}
                r={5}
                fill="none"
                stroke="var(--ink)"
                strokeWidth="1"
              />
              <line
                x1={x(pt.x)}
                y1={y(pt.y) - 6}
                x2={x(pt.x) + 18}
                y2={y(pt.y) - 28}
                stroke="var(--ink-2)"
                strokeWidth="0.8"
              />
              <text
                x={x(pt.x) + 22}
                y={y(pt.y) - 28}
                className="t-caption"
                style={{ fontFamily: "var(--font-serif)" }}
                fill="var(--ink-2)"
              >
                {a.label}
              </text>
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

/* ---------- Spark (inline micro chart) ---------- */

function Spark({ data, width = 140, height = 36, color = "var(--accent)" }) {
  const pts = data.filter((d) => d.y !== null && d.y !== undefined);
  if (pts.length < 2) return <svg width={width} height={height} />;
  const xMin = Math.min(...pts.map((d) => d.x));
  const xMax = Math.max(...pts.map((d) => d.x));
  const yMax = Math.max(...pts.map((d) => d.y));
  const x = linearScale([xMin, xMax], [1, width - 1]);
  const y = linearScale([0, yMax === 0 ? 1 : yMax], [height - 2, 2]);
  const d =
    pts.map((p, i) => `${i ? "L" : "M"}${x(p.x).toFixed(1)} ${y(p.y).toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width={width}
      height={height}
      role="img"
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
