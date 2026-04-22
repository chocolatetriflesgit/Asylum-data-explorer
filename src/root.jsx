// root.jsx — root component + tweak panel + routing

const { useState: uSR, useEffect: uER } = React;

function TweakPanel({ tweaks, setTweaks, open, onClose }) {
  const accents = [
    { key: '#1c3d2e', label: 'Forest' },
    { key: '#0f2a4a', label: 'Navy' },
    { key: '#2a4a3a', label: 'Sage' },
    { key: '#6b3d2e', label: 'Umber' },
    { key: '#5a3a6b', label: 'Plum' },
    { key: '#1a1a17', label: 'Ink' },
  ];
  const setAccent = k => {
    setTweaks({ ...tweaks, accent: k });
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { accent: k } }, '*');
  };
  const toggleMode = key => {
    const next = { ...tweaks, [key]: !tweaks[key] };
    setTweaks(next);
  };
  uER(()=>{
    document.documentElement.style.setProperty('--accent', tweaks.accent);
  }, [tweaks.accent]);
  uER(()=>{
    const body = document.body;
    body.classList.toggle('mode-high-contrast', !!tweaks.highContrast);
    body.classList.toggle('mode-print', !!tweaks.printFriendly);
  }, [tweaks.highContrast, tweaks.printFriendly]);
  if (!open) return null;
  return (
    <div className="tweak-panel open" style={{display:'block'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div className="uc" style={{color:'var(--muted)'}}>Display</div>
        <button onClick={onClose} className="pressable" style={{fontSize:18,color:'var(--muted)'}}>×</button>
      </div>
      <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>Accent colour</div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        {accents.map(a=>(
          <button key={a.key} title={a.label} onClick={()=>setAccent(a.key)}
            className={`swatch ${tweaks.accent===a.key?'active':''}`}
            style={{background:a.key}}/>
        ))}
      </div>
      <div style={{fontSize:12,color:'var(--muted)',margin:'16px 0 8px'}}>Reading mode</div>
      <div style={{display:'flex',flexDirection:'column',gap:6,fontSize:12.5}}>
        <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
          <input type="checkbox" checked={!!tweaks.highContrast} onChange={()=>toggleMode('highContrast')}/>
          <span>High contrast</span>
        </label>
        <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
          <input type="checkbox" checked={!!tweaks.printFriendly} onChange={()=>toggleMode('printFriendly')}/>
          <span>Print-friendly (no backgrounds)</span>
        </label>
      </div>
      <div style={{fontSize:11,color:'var(--muted-2)',marginTop:12,fontStyle:'italic',lineHeight:1.45}}>
        Display-only — no data changes.
      </div>
    </div>
  );
}

function App() {
  const [route, setRoute] = uSR({ name: 'index' });
  const [search, setSearch] = uSR(false);
  const [method, setMethod] = uSR(false);
  const [tweaks, setTweaks] = uSR(TWEAK_DEFAULTS);
  const [tweakOpen, setTweakOpen] = uSR(false);

  // persist route in localStorage
  uER(()=>{
    const r = localStorage.getItem('hoe_route');
    if (r) try { setRoute(JSON.parse(r)); } catch(e){}
  }, []);
  uER(()=>{ localStorage.setItem('hoe_route', JSON.stringify(route)); }, [route]);

  // tweak host protocol — register listener BEFORE announcing
  uER(()=>{
    const onMsg = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setTweakOpen(true);
      else if (e.data.type === '__deactivate_edit_mode') setTweakOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // keyboard shortcut for search
  uER(()=>{
    const k = e => { if ((e.metaKey||e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearch(true); } };
    window.addEventListener('keydown', k);
    return ()=>window.removeEventListener('keydown', k);
  }, []);

  return (
    <>
      <Header route={route} setRoute={setRoute} onSearch={()=>setSearch(true)} onMethod={()=>setMethod(true)}/>
      {route.name === 'index' && <IndexView setRoute={setRoute}/>}
      {route.name === 'dashboard' && <DashboardView setRoute={setRoute}/>}
      {route.name === 'atlas' && <AtlasView setRoute={setRoute}/>}
      {route.name === 'story' && <StoryView id={route.id} setRoute={setRoute} onMethod={()=>setMethod(true)}/>}
      {route.name === 'datasets' && <DatasetsView setRoute={setRoute}/>}
      {route.name === 'build' && <BuildView setRoute={setRoute}/>}
      {route.name === 'flow' && <FlowView setRoute={setRoute}/>}
      {route.name === 'updates' && <UpdatesView setRoute={setRoute}/>}

      {(route.name === 'dashboard' || route.name === 'atlas') && <BackToTop/>}

      <footer className="site-footer" style={{borderTop:'1px solid var(--rule)',padding:'36px 48px',maxWidth:1240,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'baseline',fontSize:12.5,color:'var(--muted)'}}>
        <div>
          <span style={{fontFamily:'var(--serif)',fontStyle:'italic',color:'var(--ink-2)'}}>Migration data explorer</span>
          <span style={{margin:'0 14px'}}>·</span>
          <span>Open data · Published under OGL v3.0</span>
        </div>
        <div className="footer-links" style={{display:'flex',gap:22}}>
          <span className="ulh" style={{cursor:'pointer'}} onClick={()=>setMethod(true)}>Methodology</span>
          <span className="ulh" style={{cursor:'pointer'}}>API</span>
          <span className="ulh" style={{cursor:'pointer'}}>Contact</span>
          <span className="ulh" style={{cursor:'pointer'}}>About</span>
        </div>
      </footer>

      <SearchModal open={search} onClose={()=>setSearch(false)} onPick={r=>setRoute(r)}/>
      <MethodologyDrawer open={method} onClose={()=>setMethod(false)}/>
      <TweakPanel tweaks={tweaks} setTweaks={setTweaks} open={tweakOpen} onClose={()=>setTweakOpen(false)}/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
