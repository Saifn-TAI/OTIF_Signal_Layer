import React, { useState } from 'react';
import { useTheme } from '../theme';
import {
    TrendingUp, TrendingDown, ChevronDown, ChevronUp
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════════════════════════ */
export function StatusBadge({ status }) {
    const { T } = useTheme();
    const map = {
        RED: { bg: T.redBg, color: T.red, label: 'Critical' },
        YELLOW: { bg: T.yellowBg, color: T.yellow, label: 'Watch' },
        GREEN: { bg: T.greenBg, color: T.green, label: 'On Track' },
        DELAYED: { bg: T.redBg, color: T.red, label: 'Delayed' },
        WATCHLIST: { bg: T.yellowBg, color: T.yellow, label: 'Watchlist' },
        'On Track': { bg: T.greenBg, color: T.green, label: 'On Track' },
    };
    const c = map[status] || map.GREEN;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: c.bg, color: c.color, padding: '3px 10px',
            borderRadius: 20, fontSize: 11, fontWeight: 600
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
            {c.label}
        </span>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SCORE CARD
   ═══════════════════════════════════════════════════════════════ */
export function ScoreCard({ title, value, suffix, icon: Icon, trend, trendLabel, color, subtext, delay }) {
    const { T } = useTheme();
    const isPositive = trend > 0;
    return (
        <div className="card" style={{
            padding: '22px 24px', flex: 1, minWidth: 210,
            animationDelay: `${delay || 0}ms`, position: 'relative', overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute', top: -30, right: -30, width: 80, height: 80,
                borderRadius: '50%', background: `radial-gradient(circle, ${color || T.accent}15, transparent)`,
                pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div>
                    <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        {title}
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: color || T.text, marginTop: 6, lineHeight: 1 }}>
                        {value}<span style={{ fontSize: 16, fontWeight: 500, color: T.textMuted, marginLeft: 2 }}>{suffix}</span>
                    </div>
                    {subtext && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>{subtext}</div>}
                </div>
                {Icon && (
                    <div style={{ background: T.accentSoft, borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} color={T.accent} strokeWidth={2} />
                    </div>
                )}
            </div>
            {trend !== undefined && (
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10,
                    padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: isPositive ? T.greenBg : T.redBg, color: isPositive ? T.green : T.red
                }}>
                    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {isPositive ? '+' : ''}{trend}% {trendLabel}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   EXPANDABLE INSIGHT
   ═══════════════════════════════════════════════════════════════ */
export function ExpandableInsight({ text }) {
    const { T } = useTheme();
    const [open, setOpen] = useState(false);
    if (!text) return <span style={{ color: T.textMuted, fontSize: 11 }}>—</span>;

    const render = (str) => {
        const parts = str.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) =>
            i % 2 === 1
                ? <span key={i} style={{ color: T.text, fontWeight: 600 }}>{part}</span>
                : <span key={i}>{part}</span>
        );
    };
    const clean = text.replace(/\*\*/g, '');
    const preview = clean.substring(0, 65);

    return (
        <div onClick={() => setOpen(!open)} style={{
            cursor: 'pointer', fontSize: 11, color: T.textSecondary, lineHeight: 1.6,
            display: 'flex', alignItems: 'flex-start', gap: 4
        }}>
            <span>{open ? render(text) : <>{preview}{clean.length > 65 ? '…' : ''}</>}</span>
            {clean.length > 65 && (
                <span style={{ flexShrink: 0, marginTop: 2 }}>
                    {open ? <ChevronUp size={11} color={T.textMuted} /> : <ChevronDown size={11} color={T.textMuted} />}
                </span>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION HEADER
   ═══════════════════════════════════════════════════════════════ */
export function SectionHeader({ icon: Icon, title, subtitle, children }) {
    const { T } = useTheme();
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {Icon && (
                    <div style={{ background: T.accentSoft, borderRadius: 8, padding: 7, display: 'flex' }}>
                        <Icon size={15} color={T.accent} strokeWidth={2.2} />
                    </div>
                )}
                <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>{title}</h3>
                    {subtitle && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{subtitle}</div>}
                </div>
            </div>
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   BREACH SCORE BAR
   ═══════════════════════════════════════════════════════════════ */
export function BreachBar({ score }) {
    const { T } = useTheme();
    const color = score > 60 ? T.red : score > 40 ? T.yellow : T.green;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 48, height: 6, borderRadius: 3, background: T.divider, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: color, width: `${score}%`, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 22 }}>{score}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOM TOOLTIP
   ═══════════════════════════════════════════════════════════════ */
export function CustomTooltip({ active, payload, label }) {
    const { T } = useTheme();
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: T.elevated, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusSm,
            padding: '10px 14px', fontSize: 12, boxShadow: T.shadowLg,
        }}>
            <div style={{ fontWeight: 600, color: T.text, marginBottom: 6 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{ width: 8, height: 2, background: p.color, borderRadius: 1, display: 'inline-block' }} />
                    <span style={{ color: T.textSecondary }}>{p.name}:</span>
                    <span style={{ fontWeight: 600, color: T.text }}>{p.value}%</span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   TABLE HEADER CELL (sortable)
   ═══════════════════════════════════════════════════════════════ */
export function TH({ label, field, sortField, sortDir, onSort }) {
    const { T } = useTheme();
    const active = sortField === field;
    return (
        <th
            onClick={() => field && onSort(field)}
            style={{
                textAlign: 'left', padding: '0 16px 14px 16px', fontSize: 11, fontWeight: 700,
                color: active ? T.text : T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px',
                cursor: field ? 'pointer' : 'default', userSelect: 'none',
                borderBottom: 'none', whiteSpace: 'nowrap', transition: T.transition
            }}
        >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {label}
                {active && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
            </span>
        </th>
    );
}
