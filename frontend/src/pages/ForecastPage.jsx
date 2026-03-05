import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../theme';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Line, Area, Legend
} from 'recharts';
import { TrendingUp, AlertTriangle, Clock, Package, Activity, ChevronDown } from 'lucide-react';
import PageHeader, { PAGE_ACCENTS } from '../components/PageHeader';

const API = 'http://127.0.0.1:8000';

export default function ForecastPage() {
    const { T } = useTheme();
    const [window, setWindow] = useState(90);
    const [data, setData] = useState(null);
    const [trend, setTrend] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            axios.get(`${API}/api/kpi/forecast?window=${window}`),
            axios.get(`${API}/api/kpi/projected-trend`),
        ]).then(([fRes, tRes]) => {
            setData(fRes.data);
            setTrend(tRes.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [window]);

    const cc = (cls) => cls === 'RED' ? T.red : cls === 'YELLOW' ? T.yellow : T.green;

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.accent}30`, borderTopColor: T.accent, animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: T.textMuted, fontSize: 13 }}>Loading forward risk analysis…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const trendCombined = [
        ...(trend?.historical || []).map(h => ({ name: h.month_str, otif: h.otif_rate, type: 'Historical' })),
        ...(trend?.projected || []).slice(0, 6).map(p => ({ name: p.month_str, projected: p.projected_otif, risk: p.avg_breach_score, orders: p.total_orders, red: p.red })),
    ];

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>

            {/* Header row */}
            <PageHeader
                icon={TrendingUp}
                title="Forward Delivery Risk"
                subtitle="OTIF breach forecast based on active orders in the selected window"
                accent={PAGE_ACCENTS['/forecast']?.color}
            >
                {/* Window selector */}
                <div style={{ display: 'flex', gap: 4, background: T.inputBg, padding: 4, borderRadius: 12, border: `1px solid ${T.divider}` }}>
                    {[30, 60, 90].map(w => (
                        <button key={w} onClick={() => setWindow(w)} style={{
                            padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                            background: window === w ? (PAGE_ACCENTS['/forecast']?.color || T.accent) : 'transparent',
                            color: window === w ? '#FFFFFF' : T.textMuted,
                            transition: T.transition,
                        }}>{w}d</button>
                    ))}
                </div>
            </PageHeader>

            {/* KPI cards — bold accent-tinted pill cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Orders in Window', value: data?.total_in_window?.toLocaleString(), color: '#3B82F6' },
                    { label: 'Critical (RED)', value: data?.red_count?.toLocaleString(), color: T.red },
                    { label: 'Watch (YELLOW)', value: data?.yellow_count?.toLocaleString(), color: T.yellow },
                    { label: 'On Track (GREEN)', value: data?.green_count?.toLocaleString(), color: T.green },
                    { label: 'At-Risk Rate', value: `${data?.at_risk_pct}%`, color: data?.at_risk_pct > 40 ? T.red : data?.at_risk_pct > 20 ? T.yellow : T.green },
                ].map((c, i) => (
                    <div key={i} style={{
                        background: T.surface, borderRadius: 18, padding: '18px 20px',
                        border: `1px dashed ${c.color}35`,
                        borderTop: `3px solid ${c.color}`,
                        position: 'relative', overflow: 'hidden',
                    }}>
                        {/* Subtle accent glow */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, background: `linear-gradient(180deg, ${c.color}08 0%, transparent 100%)`, pointerEvents: 'none' }} />
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>{c.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: c.color, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{c.value ?? '—'}</div>
                    </div>
                ))}
            </div>

            {/* Two columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>

                {/* Weekly breakdown chart */}
                <div style={{ background: T.surface, borderRadius: 18, border: `1px solid ${PAGE_ACCENTS['/forecast']?.color}15`, padding: '24px 26px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Week-by-Week Risk Distribution</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 18 }}>Orders at risk per delivery week in the next {window} days</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data?.weekly_breakdown || []} barCategoryGap="28%">
                            <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                            <XAxis dataKey="week_label" tick={{ fontSize: 10, fill: T.textMuted }} />
                            <YAxis tick={{ fontSize: 10, fill: T.textMuted }} />
                            <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.divider}`, borderRadius: 10, fontSize: 12 }} />
                            <Bar dataKey="red" name="Critical" stackId="s" fill={T.red} radius={[0, 0, 0, 0]} />
                            <Bar dataKey="yellow" name="Watch" stackId="s" fill={T.yellow} radius={[0, 0, 0, 0]} />
                            <Bar dataKey="green" name="On Track" stackId="s" fill={T.green} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top at-risk orders */}
                <div style={{ background: T.surface, borderRadius: 18, border: `1px solid ${PAGE_ACCENTS['/forecast']?.color}15`, padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Top At-Risk Orders</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 14 }}>Highest breach scores within window</div>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: 240 }}>
                        {(data?.top_at_risk || []).map((o, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${T.divider}` }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${cc(o.classification)}15`, border: `1px solid ${cc(o.classification)}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: cc(o.classification) }}>{o.breach_score}%</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.po}</div>
                                    <div style={{ fontSize: 10, color: T.textMuted }}>{o.buyer} · {o.plant}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: 11, color: T.textSecondary }}>{o.days_remaining}d left</div>
                                    <div style={{ fontSize: 9, color: cc(o.classification), fontWeight: 700 }}>{o.classification}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Projected OTIF trend */}
            <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}`, padding: '20px 24px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Projected OTIF vs Historical</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 18 }}>Grey = actual historical OTIF · Blue = projected based on active order breach scores</div>
                <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={trendCombined}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: T.textMuted }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: T.textMuted }} unit="%" />
                        <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.divider}`, borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="otif" name="Historical OTIF" fill={`${T.textMuted}15`} stroke={T.textMuted} strokeWidth={2} />
                        <Line type="monotone" dataKey="projected" name="Projected OTIF" stroke={T.accent} strokeWidth={2} strokeDasharray="6 4" dot={{ fill: T.accent, r: 4 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Plant risk table */}
            <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}`, padding: '20px 24px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Plant Risk in Window</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 16 }}>Production plants sorted by critical order count</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {(data?.plant_risk || []).map((p, i) => (
                        <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: T.inputBg, border: `1px solid ${T.divider}` }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', title: p.plant }}>{p.plant}</div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: T.red, lineHeight: 1 }}>{p.red}</div>
                                    <div style={{ fontSize: 9, color: T.textMuted, marginTop: 2 }}>Critical</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: T.textSecondary, lineHeight: 1 }}>{p.total}</div>
                                    <div style={{ fontSize: 9, color: T.textMuted, marginTop: 2 }}>Total</div>
                                </div>
                                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: p.avg_score > 60 ? T.red : p.avg_score > 40 ? T.yellow : T.green }}>{p.avg_score}%</div>
                                    <div style={{ fontSize: 9, color: T.textMuted }}>Avg Score</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
