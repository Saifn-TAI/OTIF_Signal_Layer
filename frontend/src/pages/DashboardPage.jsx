import React, { useMemo, useState } from 'react';
import { useTheme } from '../theme';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Line
} from 'recharts';
import { Activity, Clock, Package, Shield, TrendingUp, AlertTriangle, ChevronRight, LayoutDashboard } from 'lucide-react';
import OrderDetailModal from '../components/OrderDetailModal';
import PageHeader, { PAGE_ACCENTS } from '../components/PageHeader';

/* ─── Tooltip ─── */
function ChartTooltip({ active, payload, label }) {
    const { T } = useTheme();
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: T.surface,
            border: `1px solid ${T.glassBorder}`,
            borderRadius: 12,
            padding: '12px 16px',
            boxShadow: T.shadowLg,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
        }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: T.textSecondary, marginBottom: 8 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ fontSize: 13, fontWeight: 600, color: p.color || p.stroke, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.stroke }} />
                    {p.name}: {p.value?.toFixed(1)}%
                </div>
            ))}
        </div>
    );
}

export default function DashboardPage({ otifSummary, monthlyTrend, riskBuckets, plantHeatmap, priorityOrders, orders }) {
    const { T } = useTheme();
    const [selectedOrder, setSelectedOrder] = useState(null);

    const red = useMemo(() => (orders || []).filter(o => o.Classification === 'RED').length, [orders]);
    const yellow = useMemo(() => (orders || []).filter(o => o.Classification === 'YELLOW').length, [orders]);
    const green = useMemo(() => (orders || []).filter(o => o.Classification === 'GREEN').length, [orders]);
    const total = red + yellow + green;

    const pieData = [
        { name: 'Critical', value: red, color: T.red },
        { name: 'Watch', value: yellow, color: T.yellow },
        { name: 'On Track', value: green, color: T.green },
    ];

    const otif = otifSummary?.current_otif ?? 0;
    const otifColor = otif >= 80 ? T.green : otif >= 60 ? T.yellow : T.red;

    const cc = cls => cls === 'RED' ? T.red : cls === 'YELLOW' ? T.yellow : T.green;

    const openModal = (o) => setSelectedOrder({
        Smart_ID: o.buyer_po, Customer: o.buyer, Plant: o.plant,
        Delivery_Date: o.delivery_date, buffer: o.buffer,
        Breach_Score: o.breach_score, Classification: o.classification,
        Days_Remaining: o.buffer, Risk_Reason: o.risk_reason,
        Recommended_Actions: o.recommended_actions,
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <motion.div
            variants={containerVariants} initial="hidden" animate="show"
            style={{ padding: '24px 32px 32px', maxWidth: 1440, margin: '0 auto' }}>

            <PageHeader
                icon={LayoutDashboard}
                title="Production Overview"
                subtitle="Live OTIF signal intelligence across all active orders"
                accent={PAGE_ACCENTS['/dashboard']?.color}
            />

            {/* ══ KPI CARDS — Individual glassmorphic cards ══ */}
            {otifSummary && (
                <motion.div variants={itemVariants} style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24,
                }}>
                    {[
                        { label: 'OTIF Rate', value: otifSummary.current_otif, suffix: '%', color: otifColor, foot: `${otifSummary.total_shipped?.toLocaleString()} shipped` },
                        { label: 'On-Time Rate', value: otifSummary.on_time_rate, suffix: '%', color: otifSummary.on_time_rate >= 80 ? T.green : T.yellow, foot: 'Of shipped orders' },
                        { label: 'In-Full Rate', value: otifSummary.in_full_rate, suffix: '%', color: otifSummary.in_full_rate >= 95 ? T.green : T.yellow, foot: 'Quantity compliance' },
                        { label: '90-Day Forecast', value: otifSummary.projected_90d, suffix: '%', color: '#3B82F6', foot: `${otifSummary.total_active?.toLocaleString()} monitored` },
                    ].map((m, i) => (
                        <div key={i} style={{
                            background: T.surface,
                            borderRadius: 18, padding: '22px 24px', position: 'relative', overflow: 'hidden',
                            border: `1px solid ${T.divider}`,
                            boxShadow: T.shadow,
                        }}>
                            {/* Accent left strip */}
                            <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 4, borderRadius: 4, background: m.color }} />
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 10 }}>{m.label}</div>
                            <div style={{ fontSize: 36, fontWeight: 800, color: m.color, lineHeight: 1, letterSpacing: '-1.5px', fontVariantNumeric: 'tabular-nums', paddingLeft: 10 }}>
                                {m.value}<span style={{ fontSize: 16, fontWeight: 600, color: T.textMuted, marginLeft: 2 }}>{m.suffix}</span>
                            </div>
                            <div style={{
                                fontSize: 11, color: T.textMuted, marginTop: 12, fontWeight: 500, paddingLeft: 10,
                                padding: '3px 10px 3px 10px', background: `${m.color}08`, borderRadius: 6, display: 'inline-block',
                            }}>{m.foot}</div>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* ══ MAIN ROW — big trend chart left, risk right ══ */}
            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20 }}>
                {/* OTIF Trend chart */}
                <div style={{ background: T.surface, borderRadius: 24, border: `1px solid ${T.divider}`, padding: '24px 28px', display: 'flex', flexDirection: 'column', boxShadow: T.shadow }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.2px' }}>OTIF Monthly Performance</div>
                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Historical delivery compliance — last 12 months</div>
                        </div>
                        <div style={{ display: 'flex', gap: 16 }}>
                            {[['OTIF', T.accent], ['On-Time', T.textMuted], ['In-Full', T.textMuted]].map(([l, c]) => (
                                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: 3, background: c === T.textMuted ? 'transparent' : c, border: `2px solid ${c}`, opacity: c === T.textMuted ? 0.5 : 1 }} />
                                    <span style={{ fontSize: 11, color: T.textSecondary, fontWeight: 600 }}>{l}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={monthlyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="otifG" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={T.accent} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="month_str" tick={{ fontSize: 11, fill: T.textMuted, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: T.textMuted, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} dx={-10} />
                            <Tooltip content={<ChartTooltip />} cursor={{ stroke: T.divider, strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area type="monotone" dataKey="otif_rate" name="OTIF" stroke={T.accent} strokeWidth={3} fill="url(#otifG)" dot={{ r: 4, fill: T.surface, stroke: T.accent, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0, fill: T.accent }} />
                            <Line type="monotone" dataKey="ot_rate" name="On-Time" stroke={T.textMuted} strokeWidth={2} dot={false} strokeDasharray="4 4" opacity={0.4} />
                            <Line type="monotone" dataKey="if_rate" name="In-Full" stroke={T.textMuted} strokeWidth={2} dot={false} strokeDasharray="4 4" opacity={0.4} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Risk distribution — right panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Donut */}
                    <div style={{ background: T.surface, borderRadius: 24, border: `1px solid ${T.divider}`, padding: '24px 26px', flex: 1, boxShadow: T.shadow }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 2 }}>Active Risk Split</div>
                        <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>{total.toLocaleString()} active orders</div>
                        <div style={{ position: 'relative', height: 160 }}>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={6}>
                                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip formatter={v => v.toLocaleString()} contentStyle={{ background: T.surface, border: `1px solid ${T.glassBorder}`, borderRadius: 8, fontSize: 12, boxShadow: T.shadow, backdropFilter: 'blur(8px)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                                <div style={{ fontSize: 26, fontWeight: 800, color: T.red, lineHeight: 1 }}>{red}</div>
                                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, marginTop: 2, letterSpacing: '0.5px' }}>CRITICAL</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                            {pieData.map((r, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: r.color }} />
                                        <span style={{ fontSize: 13, color: T.textSecondary, fontWeight: 500 }}>{r.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 60, height: 4, background: T.divider, borderRadius: 2, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${total > 0 ? (r.value / total) * 100 : 0}%`, background: r.color, borderRadius: 2 }} />
                                        </div>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: T.text, minWidth: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.value.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ══ DELIVERY BUCKETS — horizontal strip ══ */}
            {riskBuckets.length > 0 && (
                <motion.div variants={itemVariants} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Delivery Window Breakdown</div>
                    <div style={{ display: 'flex', gap: 14 }}>
                        {riskBuckets.map((b, i) => {
                            const isOverdue = b.window === 'Overdue';
                            const dominantColor = b.red > b.yellow && b.red > b.green ? T.red : b.yellow > b.green ? T.yellow : T.green;
                            return (
                                <div key={i} style={{
                                    flex: 1, padding: '16px 20px', borderRadius: 16,
                                    background: T.surface, border: `1px solid ${T.divider}`,
                                    borderTop: `4px solid ${isOverdue ? T.red : dominantColor}`,
                                    boxShadow: T.shadow
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: isOverdue ? T.red : T.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{b.window}</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: T.text, marginBottom: 10, fontVariantNumeric: 'tabular-nums' }}>{b.total.toLocaleString()}</div>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <span style={{ fontSize: 12, color: T.red, fontWeight: 700 }}>{b.red}<span style={{ color: T.textMuted, fontWeight: 500, marginLeft: 2 }}>R</span></span>
                                        <span style={{ fontSize: 12, color: T.yellow, fontWeight: 700 }}>{b.yellow}<span style={{ color: T.textMuted, fontWeight: 500, marginLeft: 2 }}>Y</span></span>
                                        <span style={{ fontSize: 12, color: T.green, fontWeight: 700 }}>{b.green}<span style={{ color: T.textMuted, fontWeight: 500, marginLeft: 2 }}>G</span></span>
                                    </div>
                                    {b.qty_at_risk > 0 && (
                                        <div style={{ fontSize: 11, color: T.red, marginTop: 8, fontWeight: 600 }}>{b.qty_at_risk.toLocaleString()} pcs at risk</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* ══ PRIORITY ORDERS ══ */}
            {priorityOrders.length > 0 && (
                <motion.div variants={itemVariants} style={{ background: T.surface, borderRadius: 24, border: `1px solid ${T.divider}`, overflow: 'hidden', boxShadow: T.shadow }}>
                    <div style={{ padding: '20px 28px', borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.2px' }}>Priority Orders</div>
                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Top 20 highest breach risk — click any row to view details</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            View Full Analysis <ChevronRight size={14} />
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: T.inputBg }}>
                                    {['#', 'PO Number', 'Buyer', 'Plant', 'Due Date', 'Buffer', 'Score', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: T.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {priorityOrders.map((o, i) => (
                                    <tr key={i}
                                        onClick={() => openModal(o)}
                                        style={{ borderTop: `1px solid ${T.divider}`, cursor: 'pointer', transition: T.transition }}
                                        onMouseEnter={e => e.currentTarget.style.background = T.sidebarHover}
                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                        <td style={{ padding: '12px 16px', color: T.textMuted, fontSize: 12, fontWeight: 600, minWidth: 32 }}>{i + 1}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: T.text, whiteSpace: 'nowrap' }}>{o.buyer_po}</td>
                                        <td style={{ padding: '12px 16px', color: T.textSecondary, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.buyer}</td>
                                        <td style={{ padding: '12px 16px', color: T.textMuted, whiteSpace: 'nowrap' }}>{o.plant}</td>
                                        <td style={{ padding: '12px 16px', color: T.textSecondary, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{o.delivery_date}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: o.buffer < 0 ? T.red : o.buffer <= 7 ? T.yellow : T.text, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{o.buffer}d</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 60, height: 6, background: T.divider, borderRadius: 3, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${o.breach_score}%`, background: cc(o.classification), borderRadius: 3 }} />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: cc(o.classification), minWidth: 36, fontVariantNumeric: 'tabular-nums' }}>{o.breach_score}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: `${cc(o.classification)}15`, color: cc(o.classification), whiteSpace: 'nowrap', letterSpacing: '0.4px' }}>
                                                {o.classification}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </motion.div>
    );
}
