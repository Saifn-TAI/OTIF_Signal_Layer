import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../theme';
import {
    Search, LayoutDashboard, Package, Factory, Sparkles, Brain,
    Settings, TrendingUp, AlertTriangle, FileText, Sun, Moon,
    ArrowRight, Command
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

const PAGES = [
    { id: '/', label: 'Signal Chat', icon: Sparkles, desc: 'AI assistant' },
    { id: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Production overview' },
    { id: '/orders', label: 'Orders', icon: Package, desc: 'Active orders' },
    { id: '/plants', label: 'Plants', icon: Factory, desc: 'Plant performance' },
    { id: '/forecast', label: 'Forward Risk', icon: TrendingUp, desc: '30/60/90-day outlook' },
    { id: '/pipeline', label: 'Pipeline Risk', icon: AlertTriangle, desc: 'Lead time pressure' },
    { id: '/ml', label: 'ML Insights', icon: Brain, desc: 'Model metrics' },
    { id: '/reports', label: 'Reports', icon: FileText, desc: 'Export data' },
    { id: '/settings', label: 'Settings', icon: Settings, desc: 'System config' },
];

const QUICK_ACTIONS = [
    { label: 'Toggle dark/light mode', icon: Sun, action: 'toggleTheme' },
    { label: 'Ask AI about critical orders', icon: Sparkles, action: 'aiQuery', query: 'Show critical orders at risk of delay' },
    { label: 'Ask AI for daily briefing', icon: Sparkles, action: 'aiQuery', query: "Give me today's executive briefing" },
];

export default function CommandPalette({ isOpen, onClose, orders = [] }) {
    const { T, isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const q = query.toLowerCase().trim();

    // Filter pages
    const filteredPages = q
        ? PAGES.filter(p => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))
        : PAGES;

    // Filter quick actions
    const filteredActions = q
        ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(q))
        : QUICK_ACTIONS;

    // Search orders by PO number
    const matchedOrders = q.length >= 2
        ? orders.filter(o => {
            const po = String(o.PO_Number || o.po_number || '').toLowerCase();
            return po.includes(q);
        }).slice(0, 5)
        : [];

    // Build flat result list for keyboard navigation
    const allResults = [];
    if (filteredPages.length) {
        filteredPages.forEach(p => allResults.push({ type: 'page', ...p }));
    }
    if (matchedOrders.length) {
        matchedOrders.forEach(o => allResults.push({
            type: 'order',
            label: `PO ${o.PO_Number || o.po_number}`,
            desc: `${o.Plant || ''} · ${o.Buyer_Name || o.buyer || ''}`,
            po: o.PO_Number || o.po_number,
        }));
    }
    if (filteredActions.length) {
        filteredActions.forEach(a => allResults.push({ type: 'action', ...a }));
    }

    const handleSelect = (item) => {
        onClose();
        if (item.type === 'page') {
            navigate(item.id);
        } else if (item.type === 'order') {
            navigate('/orders');
        } else if (item.type === 'action') {
            if (item.action === 'toggleTheme') {
                toggleTheme();
            } else if (item.action === 'aiQuery') {
                navigate('/');
                // Small delay so chat mounts first
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('signal-ai-query', { detail: item.query }));
                }, 200);
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => Math.min(prev + 1, allResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && allResults[activeIndex]) {
            e.preventDefault();
            handleSelect(allResults[activeIndex]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    // Scroll active item into view
    useEffect(() => {
        const el = listRef.current?.children[activeIndex];
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    let resultIdx = -1;

    const renderItem = (item, idx) => {
        resultIdx++;
        const isActive = resultIdx === activeIndex;
        const Icon = item.icon || Package;
        const currentIdx = resultIdx;
        return (
            <button
                key={`${item.type}-${idx}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(currentIdx)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', borderRadius: 10, border: 'none', width: '100%',
                    background: isActive ? T.accentSoft : 'transparent',
                    color: isActive ? T.accent : T.text,
                    cursor: 'pointer', transition: 'all 0.1s ease',
                    fontSize: 13, fontWeight: 500, textAlign: 'left',
                }}
            >
                <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: isActive ? `${T.accent}18` : T.surfaceHover,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon size={15} color={isActive ? T.accent : T.textSecondary} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                    {item.desc && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{item.desc}</div>}
                </div>
                {isActive && <ArrowRight size={14} color={T.accent} />}
            </button>
        );
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(8px)',
                    animation: 'cpFadeIn 0.15s ease',
                }}
            />

            {/* Palette */}
            <div style={{
                position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)',
                zIndex: 9999, width: '100%', maxWidth: 560,
                background: T.surface, border: `1px solid ${T.divider}`,
                borderRadius: 20, boxShadow: T.shadowLg,
                overflow: 'hidden',
                animation: 'cpSlideIn 0.2s ease',
            }}>
                {/* Search */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '16px 20px',
                    borderBottom: `1px solid ${T.divider}`,
                }}>
                    <Search size={18} color={T.textMuted} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
                        onKeyDown={handleKeyDown}
                        placeholder="Search pages, orders, or actions…"
                        style={{
                            flex: 1, border: 'none', background: 'transparent',
                            color: T.text, fontSize: 15, fontWeight: 500, outline: 'none',
                        }}
                    />
                    <span style={{
                        fontSize: 10, fontWeight: 700, color: T.textMuted, padding: '3px 8px',
                        borderRadius: 5, background: T.surfaceHover, border: `1px solid ${T.divider}`,
                    }}>ESC</span>
                </div>

                {/* Results */}
                <div ref={listRef} style={{ maxHeight: 380, overflowY: 'auto', padding: '8px' }}>
                    {allResults.length === 0 && (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
                            No results found for "{query}"
                        </div>
                    )}

                    {filteredPages.length > 0 && (
                        <>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', padding: '8px 16px 4px' }}>
                                Pages
                            </div>
                            {filteredPages.map((p, i) => renderItem({ ...p, type: 'page' }, i))}
                        </>
                    )}

                    {matchedOrders.length > 0 && (
                        <>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 16px 4px' }}>
                                Orders
                            </div>
                            {matchedOrders.map((o, i) => renderItem({
                                type: 'order', icon: Package,
                                label: `PO ${o.PO_Number || o.po_number}`,
                                desc: `${o.Plant || ''} · ${o.Buyer_Name || o.buyer || ''}`,
                                po: o.PO_Number || o.po_number,
                            }, i))}
                        </>
                    )}

                    {filteredActions.length > 0 && (
                        <>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 16px 4px' }}>
                                Quick Actions
                            </div>
                            {filteredActions.map((a, i) => renderItem({ ...a, type: 'action' }, i))}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px',
                    borderTop: `1px solid ${T.divider}`, fontSize: 11, color: T.textMuted,
                }}>
                    <span>↑↓ Navigate</span>
                    <span>↵ Select</span>
                    <span>esc Close</span>
                </div>
            </div>

            <style>{`
                @keyframes cpFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes cpSlideIn { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
            `}</style>
        </>
    );
}
