import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from './theme';
import CommandPalette from './components/CommandPalette';
import ChatWidget from './components/ChatWidget';
import PageWrapper from './components/PageWrapper';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import PlantsPage from './pages/PlantsPage';
import ChatPage from './pages/ChatPage';
import MLInsightsPage from './pages/MLInsightsPage';
import SettingsPage from './pages/SettingsPage';
import ForecastPage from './pages/ForecastPage';
import RiskPipelinePage from './pages/RiskPipelinePage';
import ReportsPage from './pages/ReportsPage';
import {
  Activity, RefreshCw, Bot, LayoutDashboard, Package, Factory,
  TrendingUp, AlertTriangle, Brain, FileText, Settings, LogOut,
  Search, Zap, User, Shield, Wrench, Moon, Sun
} from 'lucide-react';
import { PAGE_ACCENTS } from './components/PageHeader';

const API_BASE = "http://127.0.0.1:8000";

/* ═══════════ GLOBAL STYLES ═══════════ */
function GlobalStyles() {
  const { T } = useTheme();
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Outfit', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; letter-spacing: -0.01em; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${T.textMuted}40; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: ${T.textMuted}80; }
      .card {
        background: ${T.surface}; border-radius: ${T.radius};
        border: 1px solid ${T.divider}; box-shadow: ${T.shadow};
        transition: ${T.transition};
      }
      .card:hover { border-color: ${T.accent}22; }
      .row-hover:hover { background: ${T.surfaceHover} !important; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .card { animation: fadeIn 0.35s ease both; }
      @keyframes pulseRing { 0% { transform: scale(0.95); opacity: 0.7; } 50% { transform: scale(1.15); opacity: 0; } 100% { transform: scale(0.95); opacity: 0; } }
      @keyframes dockIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      @keyframes headerIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

      /* Dock tooltip — !important overrides inline style specificity */
      .dock-item:hover .dock-tooltip {
        opacity: 1 !important;
        transform: translateX(-50%) translateY(-8px) !important;
      }
      .dock-item:hover .dock-icon {
        transform: scale(1.18) translateY(-4px) !important;
      }
    `}</style>
  );
}

/* ═══════════ ROLE HELPERS ═══════════ */
const ROLE_ICONS = { admin: Shield, dev: Wrench, user: User };
const ROLE_COLORS = { admin: '#F87171', dev: '#FBBF24', user: '#34D399' };
const ROLE_LEVELS = { user: 1, dev: 2, admin: 3 };

/* ═══════════ DOCK NAV ITEMS ═══════════ */
const DOCK_ITEMS = [
  { id: '/', label: 'TAI Agent', icon: Bot, isAI: true },
  null, // separator
  { id: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: '/orders', label: 'Orders', icon: Package },
  { id: '/plants', label: 'Plants', icon: Factory, minRole: 'dev' },
  null, // separator
  { id: '/forecast', label: 'Forward Risk', icon: TrendingUp, minRole: 'dev' },
  { id: '/pipeline', label: 'Pipeline Risk', icon: AlertTriangle, minRole: 'dev' },
  { id: '/ml', label: 'ML Insights', icon: Brain, minRole: 'dev' },
  null, // separator
  { id: '/reports', label: 'Reports', icon: FileText },
  { id: '/settings', label: 'Settings', icon: Settings, minRole: 'admin' },
];

/* ═══════════════════════════════════════════════════════════════
   FLOATING BOTTOM DOCK (macOS-style)
   ═══════════════════════════════════════════════════════════════ */
function FloatingDock({ onSearch }) {
  const { T, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = JSON.parse(localStorage.getItem('auth') || '{}');
  const role = auth.role || 'user';
  const userLevel = ROLE_LEVELS[role] || 1;

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 100,
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '6px 10px',
      background: isDark
        ? 'rgba(15, 15, 20, 0.85)'
        : 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 20,
      boxShadow: isDark
        ? '0 8px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)'
        : '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      animation: 'dockIn 0.3s ease both',
    }}>
      {DOCK_ITEMS.map((item, idx) => {
        if (item === null) {
          return (
            <div key={`sep-${idx}`} style={{
              width: 1, height: 24, margin: '0 4px',
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            }} />
          );
        }

        const accessible = userLevel >= (ROLE_LEVELS[item.minRole] || 1);
        if (!accessible) return null;

        const active = location.pathname === item.id;
        const Icon = item.icon;

        return (
          <div
            key={item.id}
            className="dock-item"
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            {/* Tooltip */}
            <div className="dock-tooltip" style={{
              position: 'absolute', bottom: '100%', left: '50%',
              transform: 'translateX(-50%) translateY(0px)',
              padding: '4px 10px', borderRadius: 6,
              background: isDark ? '#27272A' : '#18181B',
              color: '#FAFAFA', fontSize: 11, fontWeight: 600,
              whiteSpace: 'nowrap', pointerEvents: 'none',
              opacity: 0, transition: 'all 0.15s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
              {item.label}
            </div>

            <button
              onClick={() => navigate(item.id)}
              className="dock-icon"
              style={{
                width: 42, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: item.isAI
                  ? `linear-gradient(135deg, ${T.accent}, ${T.accentSecondary || T.accent})`
                  : active
                    ? T.accentSoft
                    : 'transparent',
                color: item.isAI ? '#FFFFFF' : active ? (PAGE_ACCENTS[item.id]?.color || T.accent) : T.textSecondary,
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative',
                boxShadow: item.isAI ? `0 4px 16px ${T.accent}40` : 'none',
              }}
              onMouseEnter={e => {
                if (!active && !item.isAI) e.currentTarget.style.background = T.surfaceHover;
              }}
              onMouseLeave={e => {
                if (!active && !item.isAI) e.currentTarget.style.background = 'transparent';
              }}
            >
              {item.isAI && (
                <span style={{
                  position: 'absolute', inset: -3, borderRadius: 14,
                  border: `2px solid ${T.accent}40`,
                  animation: 'pulseRing 2s ease infinite',
                }} />
              )}
              <Icon size={item.isAI ? 20 : 18} strokeWidth={active || item.isAI ? 2.2 : 1.8} />
            </button>

            {/* Active label below icon */}
            {active && (
              <span style={{
                fontSize: 9, fontWeight: 700, marginTop: 2,
                color: item.isAI ? T.accent : (PAGE_ACCENTS[item.id]?.color || T.accent),
                letterSpacing: '-0.2px', whiteSpace: 'nowrap',
              }}>
                {item.label}
              </span>
            )}

            {/* Active dot indicator */}
            {!active && !item.isAI && (
              <span style={{ width: 4, height: 4, borderRadius: '50%', marginTop: 3, background: 'transparent' }} />
            )}
            {active && !item.isAI && (
              <span style={{
                width: 4, height: 4, borderRadius: '50%',
                background: PAGE_ACCENTS[item.id]?.color || T.accent, marginTop: 1,
                boxShadow: `0 0 6px ${PAGE_ACCENTS[item.id]?.color || T.accent}`,
              }} />
            )}
            {item.isAI && !active && (
              <span style={{
                width: 4, height: 4, borderRadius: '50%',
                background: T.accent, marginTop: 3,
                boxShadow: `0 0 6px ${T.accent}`,
              }} />
            )}
          </div>
        );
      })}

      {/* Search button removed per user request */}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FLOATING TOP HEADER (minimal — status + actions only)
   ═══════════════════════════════════════════════════════════════ */
function FloatingHeader({ onRefresh, refreshing, lastUpdated }) {
  const { T, isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = JSON.parse(localStorage.getItem('auth') || '{}');
  const role = auth.role || 'user';
  const RoleIcon = ROLE_ICONS[role] || User;
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isChatPage = location.pathname === '/';

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { localStorage.removeItem('auth'); window.location.href = '/login'; };

  const PAGE_TITLES = {
    '/': 'Signal AI',
    '/dashboard': 'Dashboard',
    '/orders': 'Orders',
    '/plants': 'Plants',
    '/forecast': 'Forward Risk',
    '/pipeline': 'Pipeline Risk',
    '/ml': 'ML Insights',
    '/reports': 'Reports',
    '/settings': 'Settings',
  };

  const pageAccent = PAGE_ACCENTS[location.pathname]?.color || T.accent;

  return (
    <div style={{
      position: 'fixed', top: 12, left: 16, right: 16, zIndex: 90,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px',
      background: isDark
        ? 'rgba(15, 15, 20, 0.7)'
        : 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(16px) saturate(150%)',
      WebkitBackdropFilter: 'blur(16px) saturate(150%)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      borderRadius: 16,
      boxShadow: isDark
        ? '0 4px 20px rgba(0,0,0,0.4)'
        : '0 4px 20px rgba(0,0,0,0.06)',
      animation: 'headerIn 0.25s ease both',
    }}>
      {/* Left: Company logo + Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Company Logo — primary logo of the project */}
        <img
          src="/company-logo.png"
          alt="Signal AI"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          style={{
            height: 30, width: 'auto', objectFit: 'contain',
            borderRadius: 6,
          }}
        />

        <div style={{ borderLeft: `1px solid ${T.divider}`, paddingLeft: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: '-0.3px', lineHeight: 1 }}>
            {PAGE_TITLES[location.pathname] || 'Signal AI'}
          </div>
          {!isChatPage && lastUpdated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, boxShadow: `0 0 4px ${T.green}` }} />
              <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 500 }}>
                Live · {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {!isChatPage && (
          <button onClick={onRefresh} style={{
            width: 30, height: 30, background: 'transparent', border: 'none',
            borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.textMuted, transition: T.transition,
          }}
            onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.6s linear infinite' : 'none' }} />
          </button>
        )}

        <button onClick={toggleTheme} style={{
          width: 30, height: 30, background: 'transparent', border: 'none',
          borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.textMuted, transition: T.transition,
        }}
          onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* User avatar */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setUserMenuOpen(!userMenuOpen)} style={{
            width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: userMenuOpen ? `${ROLE_COLORS[role]}20` : 'transparent',
            transition: T.transition,
          }}
            onMouseEnter={e => { if (!userMenuOpen) e.currentTarget.style.background = T.surfaceHover; }}
            onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background = 'transparent'; }}
          >
            <RoleIcon size={14} color={ROLE_COLORS[role]} />
          </button>

          {userMenuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              width: 200, background: T.surface, border: `1px solid ${T.divider}`,
              borderRadius: 14, boxShadow: T.shadowLg, zIndex: 200, overflow: 'hidden',
              animation: 'fadeIn 0.15s ease',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.divider}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, textTransform: 'capitalize' }}>
                  {auth.username || 'User'}
                </div>
                <div style={{ fontSize: 10, color: ROLE_COLORS[role], fontWeight: 700, textTransform: 'uppercase' }}>{role}</div>
              </div>
              <div style={{ padding: '6px' }}>
                <button onClick={handleLogout} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: T.red, fontSize: 12, fontWeight: 600,
                  transition: T.transition,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = T.redBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LAYOUT SHELL (Floating Header + Full Canvas + Floating Dock)
   ═══════════════════════════════════════════════════════════════ */
function AppLayout() {
  const { T } = useTheme();
  const [otifSummary, setOtifSummary] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [riskBuckets, setRiskBuckets] = useState([]);
  const [plantHeatmap, setPlantHeatmap] = useState([]);
  const [priorityOrders, setPriorityOrders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const fetchingRef = useRef(false);
  const location = useLocation();

  const fetchData = async (manual) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (manual) setRefreshing(true);
    try {
      const [summaryRes, trendRes, bucketsRes, heatmapRes, priorityRes, ordersRes] = await Promise.all([
        axios.get(`${API_BASE}/api/kpi/otif-summary`, { timeout: 60000 }),
        axios.get(`${API_BASE}/api/kpi/otif-trend`, { timeout: 60000 }),
        axios.get(`${API_BASE}/api/kpi/risk-buckets`, { timeout: 60000 }),
        axios.get(`${API_BASE}/api/kpi/plant-heatmap`, { timeout: 60000 }),
        axios.get(`${API_BASE}/api/kpi/priority-orders`, { timeout: 60000 }),
        axios.get(`${API_BASE}/api/orders`, { timeout: 60000 }),
      ]);
      setOtifSummary(summaryRes.data);
      setMonthlyTrend(trendRes.data);
      setRiskBuckets(bucketsRes.data);
      setPlantHeatmap(heatmapRes.data);
      setPriorityOrders(priorityRes.data);
      setOrders(ordersRes.data.data || []);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error("API Error:", err);
      setLoading(false);
    } finally {
      fetchingRef.current = false;
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Global Ctrl+K listener (capture phase)
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        setCmdPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, []);

  const isChatPage = location.pathname === '/';

  if (loading && !isChatPage) {
    return (
      <div style={{ height: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ position: 'relative', width: 56, height: 56 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', border: `3px solid ${T.accent}22`,
            borderTopColor: T.accent, animation: 'spin 0.8s linear infinite'
          }} />
          <Activity size={20} color={T.accent} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>
        <div style={{ color: T.textSecondary, fontSize: 13, fontWeight: 500 }}>Loading Signal Intelligence…</div>
        <FloatingDock onSearch={() => setCmdPaletteOpen(true)} />
        <CommandPalette isOpen={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} orders={orders} />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Floating header */}
      <FloatingHeader
        onRefresh={() => fetchData(true)}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
      />

      {/* Full-canvas content area */}
      <main style={{ flex: 1, overflowY: 'auto', paddingTop: 64, paddingBottom: 80 }}>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/dashboard" element={
            <PageWrapper route="/dashboard">
              <DashboardPage otifSummary={otifSummary} monthlyTrend={monthlyTrend}
                riskBuckets={riskBuckets} plantHeatmap={plantHeatmap}
                priorityOrders={priorityOrders} orders={orders} />
            </PageWrapper>
          } />
          <Route path="/orders" element={
            <PageWrapper route="/orders"><OrdersPage orders={orders} /></PageWrapper>
          } />
          <Route path="/plants" element={
            <ProtectedRoute minRole="dev">
              <PageWrapper route="/plants"><PlantsPage plantHeatmap={plantHeatmap} /></PageWrapper>
            </ProtectedRoute>
          } />
          <Route path="/chat" element={<Navigate to="/" replace />} />
          <Route path="/ml" element={
            <ProtectedRoute minRole="dev">
              <PageWrapper route="/ml"><MLInsightsPage /></PageWrapper>
            </ProtectedRoute>
          } />
          <Route path="/forecast" element={
            <ProtectedRoute minRole="dev">
              <PageWrapper route="/forecast"><ForecastPage /></PageWrapper>
            </ProtectedRoute>
          } />
          <Route path="/pipeline" element={
            <ProtectedRoute minRole="dev">
              <PageWrapper route="/pipeline"><RiskPipelinePage /></PageWrapper>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <PageWrapper route="/reports"><ReportsPage orders={orders} /></PageWrapper>
          } />
          <Route path="/settings" element={
            <ProtectedRoute minRole="admin"><SettingsPage /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Floating bottom dock */}
      <FloatingDock onSearch={() => setCmdPaletteOpen(true)} />

      {/* Command Palette */}
      <CommandPalette isOpen={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} orders={orders} />

      {/* Global AI Chat Widget */}
      <ChatWidget />
    </div>
  );
}

/* ═══════════ ROOT APP ═══════════ */
export default function App() {
  const isLoggedIn = !!localStorage.getItem('auth');

  return (
    <>
      <GlobalStyles />
      <Routes>
        <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/*" element={isLoggedIn ? <AppLayout /> : <Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}