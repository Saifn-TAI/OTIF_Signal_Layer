import React, { useState, useMemo } from 'react';
import { useTheme } from '../theme';
import { motion } from 'framer-motion';
import { Package, Layers, Search } from 'lucide-react';
import { ScoreCard, SectionHeader, BreachBar, StatusBadge, TH } from '../components/SharedUI';
import OrderDetailModal from '../components/OrderDetailModal';
import PageHeader, { PAGE_ACCENTS } from '../components/PageHeader';

export default function OrdersPage({ orders }) {
    const { T } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [plantFilter, setPlantFilter] = useState('ALL');
    const [sortField, setSortField] = useState('Breach_Score');
    const [sortDir, setSortDir] = useState('desc');
    const [selectedOrder, setSelectedOrder] = useState(null);

    const plants = useMemo(() => [...new Set((orders || []).map(o => o.Plant).filter(Boolean))].sort(), [orders]);

    const filteredOrders = useMemo(() => {
        let result = orders || [];
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter(o =>
                (o.Smart_ID || '').toLowerCase().includes(q) ||
                (o.Customer || '').toLowerCase().includes(q) ||
                (o.Plant || '').toLowerCase().includes(q) ||
                (o.Style || '').toLowerCase().includes(q)
            );
        }
        if (statusFilter !== 'ALL') result = result.filter(o => o.Classification === statusFilter || o.Risk_Status === statusFilter);
        if (plantFilter !== 'ALL') result = result.filter(o => o.Plant === plantFilter);
        return [...result].sort((a, b) => {
            const av = a[sortField] ?? 0, bv = b[sortField] ?? 0;
            if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            return sortDir === 'asc' ? av - bv : bv - av;
        });
    }, [orders, searchTerm, statusFilter, plantFilter, sortField, sortDir]);

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const red = (orders || []).filter(o => o.Classification === 'RED').length;
    const yellow = (orders || []).filter(o => o.Classification === 'YELLOW').length;
    const green = (orders || []).filter(o => o.Classification === 'GREEN').length;

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
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
                icon={Package}
                title="Active Orders"
                subtitle={`All orders currently in production pipeline · ${(orders || []).length} total`}
                accent={PAGE_ACCENTS['/orders']?.color}
            />

            <motion.div variants={itemVariants} style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <ScoreCard title="Total Active" value={(orders || []).length} icon={Package} color={T.accent} delay={0} />
                <ScoreCard title="Critical" value={red} icon={Package} color={T.red} delay={60} />
                <ScoreCard title="Watch" value={yellow} icon={Package} color={T.yellow} delay={120} />
                <ScoreCard title="On Track" value={green} icon={Package} color={T.green} delay={180} />
            </motion.div>

            <motion.div variants={itemVariants} style={{ background: T.surface, borderRadius: 24, boxShadow: T.shadow, border: `1px solid ${T.divider}`, padding: '24px 28px', overflow: 'hidden' }}>
                <SectionHeader icon={Layers} title="Active Orders" subtitle={`${filteredOrders.length.toLocaleString()} orders · Click any row to view AI analysis`}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
                            <input placeholder="Search PO, buyer, plant…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '9px 14px 9px 36px', borderRadius: 12, fontSize: 13,
                                    background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                                    color: T.text, outline: 'none', width: 220, transition: T.transition
                                }}
                                onFocus={e => e.target.style.borderColor = T.textSecondary}
                                onBlur={e => e.target.style.borderColor = T.inputBorder}
                            />
                        </div>
                        {[
                            { val: statusFilter, set: setStatusFilter, opts: [['ALL', 'All Status'], ['RED', 'Critical'], ['YELLOW', 'Watch'], ['GREEN', 'On Track']] },
                            { val: plantFilter, set: setPlantFilter, opts: [['ALL', 'All Plants'], ...plants.map(p => [p, p])] }
                        ].map((f, fi) => (
                            <select key={fi} value={f.val} onChange={e => f.set(e.target.value)} style={{
                                padding: '9px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                                background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                                color: T.text, outline: 'none', cursor: 'pointer', maxWidth: fi === 1 ? 200 : 'auto',
                                transition: T.transition
                            }}
                                onFocus={e => e.target.style.borderColor = T.textSecondary}
                                onBlur={e => e.target.style.borderColor = T.inputBorder}>
                                {f.opts.map(([v, l]) => <option key={v} value={v} style={{ background: T.surface }}>{l}</option>)}
                            </select>
                        ))}
                    </div>
                </SectionHeader>

                <div style={{ overflowX: 'auto', maxHeight: 650, overflowY: 'auto', marginTop: 12, paddingRight: 4, paddingBottom: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: T.surface, zIndex: 1 }}>
                            <tr>
                                {[
                                    { label: 'PO #', field: 'Smart_ID' }, { label: 'Customer', field: 'Customer' },
                                    { label: 'Plant', field: 'Plant' }, { label: 'Stage', field: 'Current_Status' },
                                    { label: 'Due Date', field: 'Delivery_Date' }, { label: 'Days Left', field: 'Days_Remaining' },
                                    { label: 'Score', field: 'Breach_Score' }, { label: 'Status', field: 'Classification' },
                                ].map(col => (
                                    <TH key={col.label} label={col.label} field={col.field} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.slice(0, 100).map((o, i) => (
                                <tr key={i}
                                    onClick={() => setSelectedOrder(o)}
                                    style={{
                                        background: T.inputBg, transition: T.transition,
                                        cursor: 'pointer', boxShadow: `0 1px 2px ${T.shadow}`
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.sidebarHover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = T.inputBg; e.currentTarget.style.transform = 'none'; }}
                                >
                                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 12, color: T.text, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}>{o.Smart_ID}</td>
                                    <td style={{ padding: '14px 16px', fontSize: 12, color: T.textSecondary, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.Customer}</td>
                                    <td style={{ padding: '14px 16px', fontSize: 12, color: T.textMuted }}>{o.Plant}</td>
                                    <td style={{ padding: '14px 16px', fontSize: 12, color: T.textSecondary }}>{o.Current_Status}</td>
                                    <td style={{ padding: '14px 16px', fontSize: 12, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{o.Delivery_Date}</td>
                                    <td style={{
                                        padding: '14px 16px', fontWeight: 700, fontSize: 12, fontVariantNumeric: 'tabular-nums',
                                        color: o.Days_Remaining < 0 ? T.red : o.Days_Remaining < 15 ? T.yellow : T.textMuted
                                    }}>{o.Days_Remaining}d</td>
                                    <td style={{ padding: '14px 16px' }}><BreachBar score={o.Breach_Score} /></td>
                                    <td style={{ padding: '14px 16px', borderTopRightRadius: 12, borderBottomRightRadius: 12 }}><StatusBadge status={o.Classification} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredOrders.length > 100 && (
                        <div style={{ textAlign: 'center', padding: 20, fontSize: 12, fontWeight: 500, color: T.textMuted }}>
                            Showing 100 of {filteredOrders.length.toLocaleString()} orders · Use filters to narrow results
                        </div>
                    )}
                </div>
            </motion.div>

            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </motion.div>
    );
}
