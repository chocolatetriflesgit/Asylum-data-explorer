/* =========================================================================
   views-story-build.jsx — /story, /datasets, /build routes.

   Story     narrative prose with inline sparks. Tone neutral per CLAUDE.md
             § Copy & framing.
   Datasets  table of available BOATS_* globals with schema snippets.
   Build     methodology, source links, notes lifted verbatim from
             BOATS_META.notes.
   ========================================================================= */

/* ---------- /story ---------- */

function StoryKpiLine({ label, value, suffix, sparkData, sparkColor }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        padding: "14px 0",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div>
        <div className="uc">{label}</div>
        <div className="t-sub tnum" style={{ marginTop: 2 }}>
          {value}
          {suffix && <span className="t-caption" style={{ marginLeft: 6 }}>{suffix}</span>}
        </div>
      </div>
      {sparkData && <Spark data={sparkData} color={sparkColor} />}
    </div>
  );
}

function StoryView() {
  const r = window.BOATS_RECORDS;
  const annual = window.BOATS_ANNUAL || [];
  const firstYearTotal = annual[0]?.m ?? null;
  const latestYearTotal = annual[annual.length - 1]?.m ?? null;

  const annualSpark = annual.map((a) => ({ x: a.y, y: a.m }));

  return (
    <div className="page-story">
      <header style={{ marginBottom: 28 }}>
        <div className="uc">Story</div>
        <div className="rule-terra kicker-rule" />
        <h1 className="t-hero">Eight years of a new series</h1>
        <p className="t-body" style={{ color: "var(--ink-2)", marginTop: 14 }}>
          The weekly small-boats series begins on 1 January 2018. The shape of it has
          changed more in eight years than most government data series do in a generation.
        </p>
      </header>

      <StoryKpiLine
        label="2018 total"
        value={fmtN(firstYearTotal)}
        suffix="migrants"
        sparkData={annualSpark}
        sparkColor="var(--accent)"
      />
      <StoryKpiLine
        label={`${annual[annual.length - 1]?.y ?? "Latest"} total`}
        value={fmtN(latestYearTotal)}
        suffix="migrants"
      />
      <StoryKpiLine
        label="Busiest single day"
        value={fmtN(r?.busiestDay?.migrants)}
        suffix={r?.busiestDay?.date}
      />

      {window.STORIES?.map((s, i) => (
        <article key={s.id} style={{ marginTop: 36 }}>
          <div className="uc">{s.kicker}</div>
          <div
            className={
              i === 0 ? "rule-terra kicker-rule"
              : i === 1 ? "rule-olive kicker-rule"
              : "rule-gold kicker-rule"
            }
          />
          <h2 className="t-section" style={{ marginBottom: 10 }}>{s.title}</h2>
          <p className="t-body">
            {s.body}
            <span
              className={
                i === 0 ? "end-dot"
                : i === 1 ? "end-dot end-dot-olive"
                : "end-dot end-dot-gold"
              }
            />
          </p>
        </article>
      ))}

      <div className="callout" style={{ marginTop: 44 }}>
        <div className="uc">A note on framing</div>
        <div className="rule-terra kicker-rule" />
        <p className="t-body" style={{ marginTop: 6 }}>
          This page presents figures. It does not argue about them. Source fields and
          methodology are in <span className="mono">/build</span>; the raw series is in{" "}
          <span className="mono">/datasets</span>.
        </p>
      </div>
    </div>
  );
}

/* ---------- /datasets ---------- */

function DatasetsView() {
  const catalogue = window.DATASET_CATALOGUE || [];
  const meta = window.BOATS_META || {};
  return (
    <div className="page">
      <header style={{ marginBottom: 36 }}>
        <div className="uc">Datasets</div>
        <div className="rule-olive kicker-rule" />
        <h1 className="t-hero">What's loaded and where it lives</h1>
        <p className="t-body caption-col" style={{ marginTop: 14, color: "var(--ink-2)" }}>
          Every chart in this app reads from one of these globals. The canonical
          schema is the docstring of{" "}
          <span className="mono">scripts/build_boats_data.py</span> — update it there
          first if the shape changes.
        </p>
      </header>

      <div style={{ overflowX: "auto", marginBottom: 36 }}>
        <table>
          <thead>
            <tr>
              <th>Global</th>
              <th>Shape</th>
              <th>Size</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {catalogue.map((row) => (
              <tr key={row.global}>
                <td className="mono">{row.global}</td>
                <td className="mono" style={{ fontSize: 13 }}>{row.shape}</td>
                <td className="tnum">{row.size}</td>
                <td>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section>
        <div className="uc">Provenance</div>
        <div className="rule-gold kicker-rule" />
        <h2 className="t-section" style={{ marginBottom: 10 }}>Where it came from</h2>
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(160px, 220px) 1fr",
            rowGap: 10,
            columnGap: 22,
            margin: 0,
          }}
        >
          <dt className="uc">Source file</dt>
          <dd className="mono" style={{ margin: 0 }}>{meta.sourceFile || "—"}</dd>
          <dt className="uc">Source dated</dt>
          <dd className="tnum" style={{ margin: 0 }}>{meta.sourceDated || "—"}</dd>
          <dt className="uc">Latest data point</dt>
          <dd className="tnum" style={{ margin: 0 }}>{meta.latestDataPoint || "—"}</dd>
          <dt className="uc">Regenerated</dt>
          <dd className="tnum" style={{ margin: 0 }}>{meta.generatedAt || "—"}</dd>
          <dt className="uc">Licence</dt>
          <dd style={{ margin: 0 }}>{meta.licence || "—"}</dd>
          <dt className="uc">Provider</dt>
          <dd style={{ margin: 0 }}>{meta.provider || "—"}</dd>
        </dl>
      </section>
    </div>
  );
}

/* ---------- /build ---------- */

function BuildView() {
  const meta = window.BOATS_META || {};
  const notes = meta.notes || [];
  return (
    <div className="page-story">
      <header style={{ marginBottom: 28 }}>
        <div className="uc">Build</div>
        <div className="rule-gold kicker-rule" />
        <h1 className="t-hero">How the pipeline works</h1>
      </header>

      <section style={{ marginBottom: 36 }}>
        <h2 className="t-section">Daily flow</h2>
        <ol className="t-body" style={{ paddingLeft: 20 }}>
          <li style={{ margin: "8px 0" }}>
            <span className="mono">scripts/fetch_latest.py</span> scrapes the gov.uk
            publication page, resolves the current ODS URL (the filename changes each
            release), and downloads into <span className="mono">cache/</span> if it
            hasn't already.
          </li>
          <li style={{ margin: "8px 0" }}>
            <span className="mono">scripts/build_boats_data.py</span> reads the ODS and
            writes <span className="mono">data/boats-data.js</span> — seven{" "}
            <span className="mono">window.BOATS_*</span> globals.
          </li>
          <li style={{ margin: "8px 0" }}>
            <span className="mono">scripts/bundle.py</span> concatenates{" "}
            <span className="mono">src/*.jsx</span> + the data module into the{" "}
            <span className="mono">&lt;script type="text/babel"&gt;</span> block in{" "}
            <span className="mono">index.html</span>.
          </li>
          <li style={{ margin: "8px 0" }}>
            <span className="mono">pytest</span> gates the commit — annual totals,
            record sums, Saturday week-endings, no date gaps.
          </li>
          <li style={{ margin: "8px 0" }}>
            GitHub Actions commits{" "}
            <span className="mono">chore: data update &lt;YYYY-MM-DD&gt;</span> if
            anything changed.
          </li>
        </ol>
      </section>

      <section>
        <div className="uc">Notes from source</div>
        <div className="rule-terra kicker-rule" />
        <h2 className="t-section" style={{ marginBottom: 10 }}>Verbatim from the ODS</h2>
        {notes.length === 0 ? (
          <p className="t-caption">
            No notes extracted yet. (Run the pipeline once to populate.)
          </p>
        ) : (
          <ol className="t-body" style={{ paddingLeft: 20 }}>
            {notes.map((n, i) => (
              <li key={i} style={{ margin: "10px 0" }}>{n}</li>
            ))}
          </ol>
        )}
      </section>

      <div className="callout" style={{ marginTop: 36 }}>
        <div className="uc">Source</div>
        <p className="t-body" style={{ marginTop: 6 }}>
          <a href={meta.sourceUrl || "#"} target="_blank" rel="noopener noreferrer">
            {meta.sourceUrl || "gov.uk publication page"}
          </a>
        </p>
      </div>
    </div>
  );
}
