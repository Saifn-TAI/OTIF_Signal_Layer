import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../theme';

import {
    LayoutDashboard, Package, Factory, Sparkles, Brain,
    Settings, LogOut, ChevronLeft, ChevronRight, User, Shield,
    Wrench, Zap, TrendingUp, AlertTriangle, FileText, Command
} from 'lucide-react';

const ROLE_ICONS = { admin: Shield, dev: Wrench, user: User };
const ROLE_COLORS = { admin: '#F87171', dev: '#FBBF24', user: '#34D399' };
const ROLE_LEVELS = { user: 1, dev: 2, admin: 3 };

const NAV_GROUPS = [
    {
        label: 'AI Assistant',
        items: [
            { id: '/', label: 'Signal Chat', icon: Sparkles, minRole: 'user' },
        ],
    },
    {
        label: 'Operations',
        items: [
            { id: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minRole: 'user' },
            { id: '/orders', label: 'Orders', icon: Package, minRole: 'user' },
            { id: '/plants', label: 'Plants', icon: Factory, minRole: 'dev' },
        ],
    },
    {
        label: 'Risk & Analytics',
        items: [
            { id: '/forecast', label: 'Forward Risk', icon: TrendingUp, minRole: 'dev' },
            { id: '/pipeline', label: 'Pipeline Risk', icon: AlertTriangle, minRole: 'dev' },
            { id: '/ml', label: 'ML Insights', icon: Brain, minRole: 'dev' },
        ],
    },
    {
        label: 'System',
        items: [
            { id: '/reports', label: 'Reports', icon: FileText, minRole: 'user' },
            { id: '/settings', label: 'Settings', icon: Settings, minRole: 'admin' },
        ],
    },
];

export default function Sidebar({ onCommandPalette }) {
    const { T, isDark } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const role = auth.role || 'user';
    const RoleIcon = ROLE_ICONS[role] || User;
    const userLevel = ROLE_LEVELS[role] || 1;
    const w = collapsed ? 68 : 240;

    const handleLogout = () => {
        localStorage.removeItem('auth');
        navigate('/login');
    };

    const NavBtn = ({ item }) => {
        const active = location.pathname === item.id;
        const Icon = item.icon;
        const accessible = userLevel >= (ROLE_LEVELS[item.minRole] || 1);
        if (!accessible) return null;
        const isChat = item.id === '/';
        return (
            <button
                onClick={() => navigate(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: collapsed ? '10px 0' : '10px 14px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: active
                        ? (isChat ? `linear-gradient(135deg, ${T.accent}22, ${T.accentSecondary || T.accent}18)` : T.accentSoft)
                        : 'transparent',
                    color: active ? T.accent : T.textSecondary,
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    transition: T.transition, whiteSpace: 'nowrap', width: '100%',
                    position: 'relative',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.sidebarHover; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
                {active && (
                    <span style={{
                        position: 'absolute', left: 0, top: '20%', width: 3, height: '60%',
                        background: isChat ? `linear-gradient(180deg, ${T.accent}, ${T.accentSecondary || T.accent})` : T.accent,
                        borderRadius: '0 3px 3px 0',
                    }} />
                )}
                <Icon size={16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                {!collapsed && (
                    <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                )}
            </button>
        );
    };

    return (
        <aside style={{
            width: w, minWidth: w, height: 'calc(100vh - 32px)', margin: '16px 0 16px 16px', display: 'flex', flexDirection: 'column',
            background: isDark
                ? 'linear-gradient(180deg, #0C1220 0%, #0A0E18 50%, #09090B 100%)'
                : T.sidebarBg,
            border: `1px solid ${T.divider}`, borderRadius: 24,
            transition: 'width 0.22s ease, min-width 0.22s ease',
            position: 'sticky', top: 16, zIndex: 50, overflow: 'hidden', boxShadow: T.shadow,
        }}>
            {/* Logo */}
            <div style={{
                height: 60, display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                padding: collapsed ? '0' : '0 16px 0 20px',
                borderBottom: `1px solid ${T.divider}`, flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentSecondary || T.accent} 100%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 4px 12px ${T.accent}40`,
                    }}>
                        <Zap size={14} color="white" strokeWidth={2.5} />
                    </div>
                    {!collapsed && (
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: '-0.3px', lineHeight: 1 }}>Signal AI</div>
                            <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>OTIF Intelligence</div>
                        </div>
                    )}
                </div>
                {!collapsed && (
                    <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, padding: 4, borderRadius: 6, display: 'flex' }}>
                        <ChevronLeft size={14} />
                    </button>
                )}
            </div>

            {/* Quick search hint */}
            {!collapsed && (
                <button
                    onClick={() => onCommandPalette && onCommandPalette()}
                    style={{
                        margin: '12px 10px 4px', padding: '8px 12px', borderRadius: 10,
                        background: T.inputBg, border: `1px solid ${T.divider}`,
                        display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer', transition: T.transition,
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = T.accent + '60'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = T.divider}
                >
                    <Command size={12} color={T.textMuted} />
                    <span style={{ flex: 1, fontSize: 12, color: T.textMuted, fontWeight: 500, textAlign: 'left' }}>Quick search…</span>
                    <span style={{
                        fontSize: 10, fontWeight: 700, color: T.textMuted, padding: '2px 6px',
                        borderRadius: 4, background: T.surfaceHover, border: `1px solid ${T.divider}`,
                    }}>⌘K</span>
                </button>
            )}

            {/* Navigation groups */}
            <nav style={{ flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                {NAV_GROUPS.map((group, gi) => {
                    const visibleItems = group.items.filter(item => userLevel >= (ROLE_LEVELS[item.minRole] || 1));
                    if (visibleItems.length === 0) return null;
                    return (
                        <div key={gi} style={{ marginBottom: 8 }}>
                            {!collapsed && (
                                <div style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', padding: '8px 14px 4px' }}>{group.label}</div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {visibleItems.map(item => <NavBtn key={item.id} item={item} />)}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div style={{ padding: '8px 8px 12px', borderTop: `1px solid ${T.divider}`, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                {/* User info */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: collapsed ? '8px 0' : '8px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: 9, background: `${ROLE_COLORS[role]}0D`,
                }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: `${ROLE_COLORS[role]}20`, border: `1.5px solid ${ROLE_COLORS[role]}50`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <RoleIcon size={13} color={ROLE_COLORS[role]} />
                    </div>
                    {!collapsed && (
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{auth.username || auth.user || 'User'}</div>
                            <div style={{ fontSize: 9, color: ROLE_COLORS[role], textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{role}</div>
                        </div>
                    )}
                </div>

                {/* Logout & Collapse row */}
                <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={handleLogout} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: 8, padding: collapsed ? '9px 0' : '9px 12px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        borderRadius: 9, color: T.red, fontSize: 12, fontWeight: 600,
                        transition: T.transition,
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = T.redBg}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <LogOut size={15} /> {!collapsed && 'Logout'}
                    </button>
                    {collapsed && (
                        <button onClick={() => setCollapsed(false)} style={{
                            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'none', border: `1px solid ${T.divider}`, borderRadius: 9,
                            cursor: 'pointer', color: T.textMuted, transition: T.transition,
                        }}>
                            <ChevronRight size={13} />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}
