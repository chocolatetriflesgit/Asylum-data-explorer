/* =========================================================================
   dashboard-view.jsx — /dashboard route.

   The visible core of the product. KPI strip, primary time series, year-on-
   year cumulative lines, annual totals table. Every number traces to a
   BOATS_* field. No hardcoded statistics in here.
   ========================================================================= */

function StaleBanner() {
  const meta = window.BOATS_META;
  if (!meta?.latestDataPoint) return null;
  const latest = new Date(meta.latestDataPoint + "T00:00:00Z");
  const now = new Date();
  const ageDays = Math.floor((now - latest) / 86400000);
  if (ageDays <= 14) return null;
  return (
    <div className="callout">
      <div className="uc">Stale source</div>
      <div className="rule-terra kicker-rule" />
      <p className="t-body" style={{ marginTop: 6 }}>
        Latest data point is{" "}
        <span className="tnum">{ageDays}</span> days old (
        <span className="tnum">{meta.latestDataPoint}</span>). The pipeline may
        not be running — check GitHub Actions.
      </p>
    </div>
  );
}

function KpiStrip() {
  const r = window.BOATS_RECORDS;
  if (!r) return null;
  return (
    <section className="kpi-grid" style={{ marginBottom: 36 }}>
      <div className="kpi accent">
        <div className="uc kpi-label">Total migrants</div>
        <div className="t-kpi">{fmtN(r.totalMigrants)}</div>
        <div className="t-caption">
          Since {r.firstDate} · {fmtN(r.daysCovered)} days
        </div>
      </div>
      <div className="kpi olive">
        <div className="uc kpi-label">Total boats</div>
        <div className="t-kpi">{fmtN(r.totalBoats)}</div>
        <div className="t-caption">Average ~{(r.totalMigrants / Math.max(1, r.totalBoats)).toFixed(1)} migrants per boat</div>
      </div>
      <div className="kpi">
        <div className="uc kpi-label">Busiest day</div>
        <div className="t-kpi">{fmtN(r.busiestDay?.migrants)}</div>
        <div className="t-caption tnum">{r.busiestDay?.date}</div>
      </div>
      <div className="kpi gold">
        <div className="uc kpi-label">Busiest month</div>
        <div className="t-kpi">{fmtN(r.busiestMonth?.migrants)}</div>
        <div className="t-caption tnum">{r.busiestMonth?.month}</div>
      </div>
    </section>
  );
}

function WeeklySeriesChart() {
  const weekly = window.BOATS_WEEKLY || [];
  if (!weekly.length) return null;

  const toX = (s) => +new Date(s + "T00:00:00Z");
  const migrants = weekly.map((w) => ({ x: toX(w.we), y: w.m }));
  const preventions = weekly
    .map((w) => ({ x: toX(w.we), y: w.p }));

  const years = Array.from(
    new Set(weekly.map((w) => w.we.slice(0, 4)))
  ).map((y) => ({ value: +new Date(`${y}-07-01T00:00:00Z`), label: y }));

  return (
    <Figure
      subtitle="Weekly totals"
      title="Migrants arriving by small boat, weekly"
      caption="Weekly ending Sunday. Preventions (where reported from 2023) overlaid in terracotta."
      source="UK Home Office — SB_02"
    >
      <LineChart
        series={[
          { name: "Arrivals",    data: migrants,    color: "var(--accent)" },
          { name: "Preventions", data: preventions, color: "var(--accent-warn)" },
        ]}
        width={820}
        height={320}
        xTicks={years}
        xTickFormat={(ms) => new Date(ms).toISOString().slice(0, 10)}
        tooltipLabel={({ seriesName, x, y }) =>
          `${new Date(x).toISOString().slice(0, 10)} · ${seriesName}: ${fmtN(y)}`
        }
      />
    </Figure>
  );
}

function YoYCumulativeChart() {
  const yoy = window.BOATS_YOY || {};
  const years = Object.keys(yoy).sort();
  if (!years.length) return null;

  const series = years.map((y) => ({
    name: y,
    data: yoy[y].map((v, i) => ({ x: i, y: v })),
  }));

  const monthTicks = [
    { value: 0,   label: "Jan" },
    { value: 31,  label: "Feb" },
    { value: 59,  label: "Mar" },
    { value: 90,  label: "Apr" },
    { value: 120, label: "May" },
    { value: 151, label: "Jun" },
    { value: 181, label: "Jul" },
    { value: 212, label: "Aug" },
    { value: 243, label: "Sep" },
    { value: 273, label: "Oct" },
    { value: 304, label: "Nov" },
    { value: 334, label: "Dec" },
  ];

  return (
    <Figure
      subtitle="Year-on-year"
      title="Cumulative arrivals by day of year"
      caption="Each line is one year, running from 1 January. The current year stops at the latest data point — no interpolation past it."
      source="UK Home Office — SB_01"
    >
      <LineChart
        series={series}
        width={820}
        height={360}
        fill={false}
        xTicks={monthTicks}
        xTickFormat={(doy) => `day ${doy + 1}`}
        tooltipLabel={({ seriesName, x, y }) =>
          `${seriesName} · day ${x + 1}: ${fmtN(y)}`
        }
      />
    </Figure>
  );
}

function AnnualTotalsTable() {
  const annual = window.BOATS_ANNUAL || [];
  if (!annual.length) return null;
  return (
    <section style={{ marginTop: 36 }}>
      <div className="uc">Annual totals</div>
      <div className="rule-gold kicker-rule" />
      <h2 className="t-section" style={{ marginBottom: 18 }}>
        Every year since 2018
      </h2>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th style={{ textAlign: "right" }}>Migrants</th>
              <th style={{ textAlign: "right" }}>Boats</th>
              <th style={{ textAlign: "right" }}>Per boat</th>
              <th style={{ width: 160 }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {annual.map((row) => {
              const monthly = (window.BOATS_MONTHLY || []).filter((m) =>
                m.month.startsWith(String(row.y))
              );
              const spark = monthly.map((m, i) => ({ x: i, y: m.m }));
              return (
                <tr key={row.y}>
                  <td className="tnum">{row.y}</td>
                  <td className="tnum" style={{ textAlign: "right" }}>{fmtN(row.m)}</td>
                  <td className="tnum" style={{ textAlign: "right" }}>{fmtN(row.b)}</td>
                  <td className="tnum" style={{ textAlign: "right" }}>{row.perBoat ?? "—"}</td>
                  <td>
                    <Spark data={spark} width={140} height={28} color="var(--accent)" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DashboardView() {
  return (
    <div className="page">
      <StaleBanner />
      <header style={{ marginBottom: 36 }}>
        <div className="uc">Dashboard</div>
        <div className="rule-terra kicker-rule" />
        <h1 className="t-hero">Small boats crossings at a glance</h1>
        <p className="t-body caption-col" style={{ marginTop: 14, color: "var(--ink-2)" }}>
          Headline numbers, weekly series, and year-on-year comparison. Every figure
          traces back to a <span className="mono">BOATS_*</span> global built from
          the gov.uk source ODS.
        </p>
      </header>

      <KpiStrip />

      <div className="chart-row">
        <WeeklySeriesChart />
        <YoYCumulativeChart />
      </div>

      <AnnualTotalsTable />
    </div>
  );
}
