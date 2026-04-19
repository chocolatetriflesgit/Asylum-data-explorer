/* =========================================================================
   app.jsx — chrome components: header, footer, search, methodology drawer.
   Shared across every route.
   ========================================================================= */

/* Focus + Escape management for modal drawers. On open: remember the
   previously-focused element, move focus onto the dialog, listen for
   Escape. On close: return focus to the trigger. */
function useDrawerA11y(open, onClose) {
  const dialogRef = React.useRef(null);
  const lastFocusRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    lastFocusRef.current = document.activeElement;
    const focusTimer = setTimeout(() => dialogRef.current?.focus(), 0);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      const prev = lastFocusRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [open, onClose]);
  return dialogRef;
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "story",     label: "Story" },
  { id: "datasets",  label: "Datasets" },
  { id: "build",     label: "Build" },
];

function SiteHeader({ route, onNavigate, onOpenMethodology, onOpenTweaks }) {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--rule)",
        padding: "22px 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 28,
      }}
    >
      <div>
        <div className="uc">Home Office Data Explorer</div>
        <div
          className="t-sub"
          style={{ marginTop: 2 }}
        >
          Small boats<span className="end-dot" />
        </div>
      </div>

      <nav
        aria-label="Primary"
        style={{ display: "flex", gap: 6 }}
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className="pressable"
            aria-pressed={route === item.id}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ display: "flex", gap: 6 }}>
        <SearchStub />
        <button className="pressable" onClick={onOpenMethodology}>
          Methodology
        </button>
        <button
          className="pressable"
          onClick={onOpenTweaks}
          aria-label="Open theme tweak panel"
          title="Tweak accent colour"
        >
          Tweaks
        </button>
      </div>
    </header>
  );
}

function SearchStub() {
  const [value, setValue] = React.useState("");
  return (
    <input
      type="search"
      placeholder="Search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{
        font: "inherit",
        border: "1px solid var(--rule-2)",
        padding: "6px 10px",
        background: "var(--bg)",
        color: "var(--ink)",
        width: 160,
      }}
    />
  );
}

function SiteFooter() {
  const meta = (typeof window !== "undefined" && window.BOATS_META) || null;
  const sourceDated = meta?.sourceDated || "pending first fetch";
  const latest = meta?.latestDataPoint || "—";
  const generated = meta?.generatedAt ? meta.generatedAt.slice(0, 10) : "—";
  return (
    <footer className="site-footer">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 28 }}>
        <div>
          <div className="uc">Source</div>
          <div className="rule-terra kicker-rule" />
          <p className="t-body">
            UK Home Office —{" "}
            <a
              href="https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats"
              target="_blank"
              rel="noopener noreferrer"
            >
              Migrants detected crossing the English Channel in small boats
            </a>
            . Published under the Open Government Licence v3.0.
          </p>
        </div>
        <div>
          <div className="uc">Pipeline</div>
          <div className="rule-olive kicker-rule" />
          <p className="t-body">
            Source file dated <span className="tnum">{sourceDated}</span>.
            Latest data point <span className="tnum">{latest}</span>.
            Regenerated <span className="tnum">{generated}</span>.
          </p>
        </div>
        <div>
          <div className="uc">Notes</div>
          <div className="rule-gold kicker-rule" />
          <p className="t-body">
            No editorial framing. Numbers trace to specific{" "}
            <span className="mono">BOATS_*</span> fields.
          </p>
        </div>
      </div>
    </footer>
  );
}

function MethodologyDrawer({ open, onClose }) {
  const meta = (typeof window !== "undefined" && window.BOATS_META) || null;
  const notes = meta?.notes || [];
  const dialogRef = useDrawerA11y(open, onClose);
  return (
    <>
      <div
        className={"drawer-scrim" + (open ? " is-open" : "")}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={dialogRef}
        tabIndex={-1}
        className={"drawer" + (open ? " is-open" : "")}
        role="dialog"
        aria-modal="true"
        aria-label="Methodology"
        aria-hidden={!open}
      >
        <div className="page-drawer">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div className="uc">Methodology</div>
              <div className="rule-terra kicker-rule" />
              <h2 className="t-section">How the numbers are built</h2>
            </div>
            <button className="pressable" onClick={onClose} aria-label="Close drawer">
              Close
            </button>
          </div>

          <p className="t-body" style={{ marginTop: 22 }}>
            Every chart and KPI reads from a <span className="mono">BOATS_*</span>{" "}
            global produced by <span className="mono">scripts/build_boats_data.py</span>.
            The source is a weekly ODS from gov.uk; the build pipeline is the schema
            source of truth.
          </p>

          <div className="callout">
            <div className="uc">Provenance</div>
            <p className="t-body" style={{ marginTop: 6 }}>
              Source file:{" "}
              <span className="mono">{meta?.sourceFile || "—"}</span>.
              Regenerated{" "}
              <span className="tnum">
                {meta?.generatedAt ? meta.generatedAt.slice(0, 10) : "—"}
              </span>
              .
            </p>
          </div>

          <div className="uc" style={{ marginTop: 28 }}>Notes from source</div>
          <div className="rule-olive kicker-rule" />
          {notes.length === 0 ? (
            <p className="t-caption">
              No notes extracted. (The ODS has not yet been built — run{" "}
              <span className="mono">scripts/build_boats_data.py</span>.)
            </p>
          ) : (
            <ol style={{ paddingLeft: 18, margin: 0 }}>
              {notes.map((n, i) => (
                <li key={i} className="t-body" style={{ margin: "10px 0" }}>
                  {n}
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </>
  );
}

const ACCENT_OPTIONS = [
  { id: "forest", hex: "#1c3d2e" },
  { id: "navy",   hex: "#1c2d4a" },
  { id: "sage",   hex: "#4a6a4a" },
  { id: "umber",  hex: "#6a4a2a" },
  { id: "plum",   hex: "#4a2a3a" },
  { id: "ink",    hex: "#1a1a17" },
];

function TweakPanel({ open, onClose, accent, onAccentChange }) {
  const dialogRef = useDrawerA11y(open, onClose);
  return (
    <>
      <div
        className={"drawer-scrim" + (open ? " is-open" : "")}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={dialogRef}
        tabIndex={-1}
        className={"drawer" + (open ? " is-open" : "")}
        role="dialog"
        aria-modal="true"
        aria-label="Theme tweaks"
        aria-hidden={!open}
      >
        <div className="page-drawer">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div className="uc">Tweaks</div>
              <div className="rule-accent kicker-rule" />
              <h2 className="t-section">Accent</h2>
            </div>
            <button className="pressable" onClick={onClose}>Close</button>
          </div>

          <p className="t-caption" style={{ marginTop: 18 }}>
            The only user-tweakable token. Everything that reads{" "}
            <span className="mono">var(--accent)</span> updates live.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
            {ACCENT_OPTIONS.map((opt) => {
              const isActive = accent === opt.id;
              return (
                <button
                  key={opt.id}
                  className="pressable"
                  onClick={() => onAccentChange(opt.id)}
                  aria-pressed={isActive}
                  title={opt.id}
                  style={{
                    width: 44,
                    height: 44,
                    background: opt.hex,
                    border: 0,
                    padding: 0,
                    outline: isActive ? "2px solid var(--ink)" : "none",
                    outlineOffset: 2,
                  }}
                />
              );
            })}
          </div>

          <div className="uc" style={{ marginTop: 36 }}>Sample</div>
          <div className="rule-terra kicker-rule" />
          <div style={{ marginTop: 10 }}>
            <span className="tick tick-accent" />
            <span className="t-body">Primary series (forest by default)</span>
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="tick" />
            <span className="t-body">Attention / refusals (terracotta, fixed)</span>
          </div>
        </div>
      </aside>
    </>
  );
}
