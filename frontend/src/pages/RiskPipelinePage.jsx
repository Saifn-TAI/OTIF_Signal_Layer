import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../theme';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { AlertTriangle, Clock, Package, Activity, Layers } from 'lucide-react';
import PageHeader, { PAGE_ACCENTS } from '../components/PageHeader';

const API = 'http://127.0.0.1:8000';

const STAGE_COLORS = {
    'Material Inward': '#8B5CF6',
    'Cutting': '#F59E0B',
    'Sewing': '#3B82F6',
    'Washing': '#06B6D4',
    'Finishing': '#10B981',
    'Quality Check': '#F43F5E',
    'Packing': '#84CC16',
    'Shipped': '#6366F1',
    'Dispatched': '#6366F1',
};

export default function RiskPipelinePage() {
    const { T } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStage, setFilterStage] = useState('All');

    useEffect(() => {
        axios.get(`${API}/api/kpi/lead-time-risk`).then(r => {
            setData(r.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.accent}30`, borderTopColor: T.accent, animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: T.textMuted, fontSize: 13 }}>Loading production pipeline risk…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const cc = (cls) => cls === 'RED' ? T.red : cls === 'YELLOW' ? T.yellow : T.green;

    const stages = ['All', ...(data?.stage_distribution || []).map(s => s.stage)];
    const filteredOrders = filterStage === 'All'
        ? (data?.top_pressure_orders || [])
        : (data?.top_pressure_orders || []).filter(o => o.stage === filterStage);

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>

            {/* Header */}
            <PageHeader
                icon={AlertTriangle}
                title="Production Pipeline Risk"
                subtitle="Upstream lead time pressure — does each order have enough production time remaining?"
                accent={PAGE_ACCENTS['/pipeline']?.color}
            />

            {/* KPI strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Active Orders', value: data?.total?.toLocaleString(), color: T.accent },
                    { label: 'Critical Pressure', value: data?.red_count?.toLocaleString(), color: T.red },
                    { label: 'Moderate Pressure', value: data?.yellow_count?.toLocaleString(), color: T.yellow },
                    { label: 'Sufficient Lead Time', value: data?.green_count?.toLocaleString(), color: T.green },
                    { label: 'At-Risk Rate', value: `${data?.at_risk_pct}%`, color: data?.at_risk_pct > 50 ? T.red : data?.at_risk_pct > 30 ? T.yellow : T.green },
                ].map((c, i) => (
                    <div key={i} style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.divider}`, padding: '16px 18px', borderTop: `3px solid ${c.color}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>{c.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: c.color, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{c.value ?? '—'}</div>
                    </div>
                ))}
            </div>

            {/* Two column */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

                {/* Stage distribution bar */}
                <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}`, padding: '20px 24px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Risk by Production Stage</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 18 }}>Orders under pressure at each stage of production</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data?.stage_distribution || []} layout="vertical" barSize={14}>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.divider} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: T.textMuted }} />
                            <YAxis type="category" dataKey="stage" tick={{ fontSize: 10, fill: T.textMuted }} width={100} />
                            <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.divider}`, borderRadius: 8, fontSize: 12 }} />
                            <Bar dataKey="total" name="Total" fill={`${T.accent}40`} radius={[0, 4, 4, 0]} />
                            <Bar dataKey="red" name="Critical" radius={[0, 4, 4, 0]}>
                                {(data?.stage_distribution || []).map((s, i) => (
                                    <Cell key={i} fill={STAGE_COLORS[s.stage] || T.red} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Plant pressure */}
                <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}`, padding: '20px 22px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Plant Pressure Ranking</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 14 }}>Plants with most critical lead time pressure</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(data?.plant_pressure || []).slice(0, 8).map((p, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 11, color: T.textMuted, minWidth: 18, textAlign: 'right' }}>{i + 1}.</span>
                                <span style={{ fontSize: 12, color: T.textSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.plant}</span>
                                <div style={{ width: 80, height: 6, background: T.divider, borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(p.red / Math.max(...(data?.plant_pressure || []).map(x => x.red || 1))) * 100}%`, background: T.red, borderRadius: 3 }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: T.red, minWidth: 32, textAlign: 'right' }}>{p.red}</span>
                                <span style={{ fontSize: 10, color: T.textMuted }}>/{p.total}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stage commentary */}
            <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}`, padding: '20px 24px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Lead Time Requirements by Stage</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                    {(data?.stage_distribution || []).map((s, i) => {
                        const stageName = s.stage || '';
                        const color = STAGE_COLORS[stageName] || T.accent;
                        const riskPct = s.total > 0 ? Math.round((s.red / s.total) * 100) : 0;
                        return (
                            <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: T.inputBg, border: `1px solid ${T.divider}`, borderLeft: `4px solid ${color}` }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6 }}>{stageName}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 11, color: T.textMuted }}>Total</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{s.total}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 11, color: T.textMuted }}>Critical</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: T.red }}>{s.red}</span>
                                </div>
                                <div style={{ height: 4, borderRadius: 2, background: T.divider, overflow: 'hidden', marginTop: 8 }}>
                                    <div style={{ height: '100%', width: `${riskPct}%`, background: color }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Pressure order table */}
            <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}`, overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>High-Pressure Orders</div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Orders where available lead time is insufficient for current stage</div>
                    </div>
                    <select value={filterStage} onChange={e => setFilterStage(e.target.value)} style={{
                        padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.divider}`,
                        background: T.inputBg, color: T.text, fontSize: 12, cursor: 'pointer',
                    }}>
                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div style={{ overflow: 'auto', maxHeight: 360 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: T.inputBg }}>
                                {['PO Number', 'Buyer', 'Plant', 'Stage', 'Days Left', 'Required', 'Gap', 'Pressure', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: T.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((o, i) => (
                                <tr key={i} style={{ borderTop: `1px solid ${T.divider}` }}
                                    onMouseEnter={e => e.currentTarget.style.background = T.inputBg}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                    <td style={{ padding: '10px 16px', fontWeight: 600, color: T.accent }}>{o.po}</td>
                                    <td style={{ padding: '10px 16px', color: T.textSecondary }}>{o.buyer}</td>
                                    <td style={{ padding: '10px 16px', color: T.textSecondary }}>{o.plant}</td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: `${STAGE_COLORS[o.stage] || T.accent}18`, color: STAGE_COLORS[o.stage] || T.accent }}>{o.stage}</span>
                                    </td>
                                    <td style={{ padding: '10px 16px', fontWeight: 700, color: o.days_remaining < 0 ? T.red : T.text }}>{o.days_remaining}d</td>
                                    <td style={{ padding: '10px 16px', color: T.textMuted }}>{o.required_days}d</td>
                                    <td style={{ padding: '10px 16px', fontWeight: 700, color: o.lead_time_gap < 0 ? T.red : o.lead_time_gap < 10 ? T.yellow : T.green }}>
                                        {o.lead_time_gap >= 0 ? '+' : ''}{o.lead_time_gap}d
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 40, height: 5, background: T.divider, borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${o.pressure_score}%`, background: cc(o.classification) }} />
                                            </div>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: cc(o.classification) }}>{o.pressure_score}%</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: `${cc(o.classification)}15`, color: cc(o.classification) }}>{o.classification}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
