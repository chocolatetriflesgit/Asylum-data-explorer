/* =========================================================================
   root.jsx — App shell, routing, persistent UI state.
   This file is bundled LAST; it references every component defined earlier.
   ========================================================================= */

const { useState, useEffect, useMemo, useRef, useCallback } = React;

const LS_KEY = "hode:v1";
const DEFAULT_STATE = Object.freeze({
  route: "dashboard",
  accent: "forest",
});

function readPersisted() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writePersisted(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* storage disabled / quota exceeded — fail silently */
  }
}

function DataMissingBanner() {
  return (
    <div className="callout" style={{ marginTop: 22 }}>
      <div className="uc">Data module not generated</div>
      <div className="rule-terra kicker-rule" />
      <p className="t-body" style={{ marginTop: 6 }}>
        The <span className="mono">data/boats-data.js</span> file has not yet been
        built. Run the pipeline once to populate the views:
      </p>
      <pre
        className="mono"
        style={{
          background: "var(--bg-2)",
          padding: "12px 14px",
          margin: "14px 0 0",
          fontSize: 13,
          overflowX: "auto",
        }}
      >{`python -m venv .venv
.venv\\Scripts\\activate    # or: source .venv/bin/activate
pip install -r requirements.txt
python scripts/fetch_latest.py
python scripts/build_boats_data.py cache/latest.ods data/
python scripts/bundle.py`}</pre>
    </div>
  );
}

function App() {
  const [state, setState] = useState(readPersisted);

  useEffect(() => {
    writePersisted(state);
    document.documentElement.dataset.accent = state.accent;
  }, [state]);

  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  const navigate = useCallback((route) => {
    setState((s) => ({ ...s, route }));
  }, []);

  const setAccent = useCallback((accent) => {
    setState((s) => ({ ...s, accent }));
  }, []);

  const hasData = typeof window !== "undefined" && !!window.BOATS_DAILY;

  return (
    <>
      <SiteHeader
        route={state.route}
        onNavigate={navigate}
        onOpenMethodology={() => setMethodologyOpen(true)}
        onOpenTweaks={() => setTweaksOpen(true)}
      />

      <main className="fade-enter" key={state.route /* remount for fade on route change */}>
        {!hasData && (
          <div className="page">
            <DataMissingBanner />
          </div>
        )}

        {hasData && state.route === "dashboard"  && <DashboardView />}
        {hasData && state.route === "story"      && <StoryView />}
        {hasData && state.route === "datasets"   && <DatasetsView />}
        {hasData && state.route === "build"      && <BuildView />}
      </main>

      <SiteFooter />

      <MethodologyDrawer
        open={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
      />
      <TweakPanel
        open={tweaksOpen}
        onClose={() => setTweaksOpen(false)}
        accent={state.accent}
        onAccentChange={setAccent}
      />
    </>
  );
}

/* Mount */
const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}
