// src/App.jsx
import { useState, useEffect } from 'react';
import { ConfigProvider, Tabs, theme } from 'antd';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Ledger from './pages/Ledger';
import Settings from './pages/Settings';
// import './index.css';

const TABS = [
  { key: 'dashboard', label: 'Overview' },
  { key: 'upload', label: 'Distribute' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'settings', label: 'Config' },
];

export default function App() {
  const [active, setActive] = useState('dashboard');
  const [time, setTime] = useState(new Date());
  const [isDark, setIsDark] = useState(false)

  const toggle = () => {
    setIsDark(d => {
      const next = !d
      // Apply to <html> so body and all CSS vars pick it up
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }

  // On mount, restore saved preference
  useEffect(() => {
    const saved = localStorage.getItem('theme') ?? 'light'
    document.documentElement.setAttribute('data-theme', saved)
    setIsDark(saved === 'dark')
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const pad = n => String(n).padStart(2, '0');
  const clock = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;

  const PAGES = {
    dashboard: <Dashboard />,
    upload: <Upload />,
    ledger: <Ledger />,
    settings: <Settings />,
  };

  return (
    <div data-theme={isDark ? 'dark' : 'light'}> <ConfigProvider theme={{
      algorithm: theme.darkAlgorithm,

      token: { colorBgBase: '#080809', colorPrimary: '#f0f0ee', borderRadius: 0, fontFamily: "'DM Mono', monospace" },
    }}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--black)' }}>

        <header style={{
          borderBottom: '1px solid var(--dim)', padding: '0 40px',
          display: 'flex', alignItems: 'stretch', height: 52,
          position: 'sticky', top: 0, zIndex: 100, background: 'var(--black)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', borderRight: '1px solid var(--dim)', paddingRight: 32, marginRight: 40, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 900, letterSpacing: '0.08em' }}>ARCHIVOLT</span>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
            <Tabs activeKey={active} onChange={setActive}
              items={TABS.map(t => ({ key: t.key, label: t.label }))}
              tabBarStyle={{ height: 52, margin: 0, fontSize: 16 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--dim)', paddingLeft: 24, marginLeft: 24, flexShrink: 0 }}>
            <span style={{ fontSize: 16, color: 'var(--muted)', letterSpacing: '0.1em', fontStyle: 'italic' }}>
              {clock}
            </span>
            <button onClick={() => toggle()}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>

          </div>
        </header>

        <main style={{ flex: 1 }}>{PAGES[active]}</main>

        <footer style={{ borderTop: '1px solid var(--dim)', padding: '10px 40px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.15em' }}>3-SHARD · XOR PARITY · ZERO-KNOWLEDGE MESH</span>
          <span style={{ fontSize: 9, color: 'var(--sub)', letterSpacing: '0.1em' }}>v1.0.0</span>
        </footer>
      </div>
    </ConfigProvider></div>

  );
}