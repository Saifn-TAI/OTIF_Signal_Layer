import React, { useState, useMemo } from 'react';
import { useTheme } from '../theme';
import { Download, FileText, Filter, Search, Package, TrendingDown, AlertTriangle } from 'lucide-react';
import PageHeader, { PAGE_ACCENTS } from '../components/PageHeader';

export default function ReportsPage({ orders = [] }) {
    const { T } = useTheme();
    const [search, setSearch] = useState('');
    const [filterCls, setFilterCls] = useState('All');
    const [sortBy, setSortBy] = useState('Breach_Score');

    const filtered = useMemo(() => {
        let data = [...orders];
        if (filterCls !== 'All') data = data.filter(o => o.Classification === filterCls);
        if (search) data = data.filter(o =>
            String(o.Smart_ID || '').toLowerCase().includes(search.toLowerCase()) ||
            String(o.Customer || '').toLowerCase().includes(search.toLowerCase()) ||
            String(o.Plant || '').toLowerCase().includes(search.toLowerCase())
        );
        return data.sort((a, b) => {
            if (sortBy === 'Breach_Score') return (b.Breach_Score || 0) - (a.Breach_Score || 0);
            if (sortBy === 'Days_Remaining') return (a.Days_Remaining || 0) - (b.Days_Remaining || 0);
            if (sortBy === 'Quantity') return (b.Quantity || 0) - (a.Quantity || 0);
            return String(a[sortBy] || '').localeCompare(String(b[sortBy] || ''));
        });
    }, [orders, search, filterCls, sortBy]);

    const cc = (cls) => cls === 'RED' ? T.red : cls === 'YELLOW' ? T.yellow : T.green;

    const downloadCSV = () => {
        const headers = ['PO Number', 'Customer', 'Plant', 'Stage', 'Delivery Date', 'Days Remaining', 'Quantity', 'Breach Score', 'Classification'];
        const rows = filtered.map(o => [
            o.Smart_ID, o.Customer, o.Plant, o.Current_Status,
            o.Delivery_Date, o.Days_Remaining, o.Quantity, o.Breach_Score, o.Classification
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signal-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const summary = {
        total: orders.length,
        red: orders.filter(o => o.Classification === 'RED').length,
        yellow: orders.filter(o => o.Classification === 'YELLOW').length,
        green: orders.filter(o => o.Classification === 'GREEN').length,
    };

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>

            {/* Header */}
            <PageHeader
                icon={FileText}
                title="Order Reports"
                subtitle={`Export, filter, and analyze all active orders · ${orders.length.toLocaleString()} total records`}
                accent={PAGE_ACCENTS['/reports']?.color}
            >
                <button onClick={downloadCSV} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                    background: PAGE_ACCENTS['/reports']?.color || T.accent, color: '#fff', border: 'none', borderRadius: 10,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: T.transition,
                    boxShadow: `0 4px 14px ${PAGE_ACCENTS['/reports']?.color || T.accent}40`,
                }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    <Download size={15} />
                    Export CSV ({filtered.length} rows)
                </button>
            </PageHeader>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Orders', value: summary.total.toLocaleString(), color: T.accent },
                    { label: 'Critical (RED)', value: summary.red.toLocaleString(), color: T.red },
                    { label: 'Watch (YELLOW)', value: summary.yellow.toLocaleString(), color: T.yellow },
                    { label: 'On Track (GREEN)', value: summary.green.toLocaleString(), color: T.green },
                ].map((c, i) => (
                    <div key={i} style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.divider}`, padding: '16px 20px', borderTop: `3px solid ${c.color}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>{c.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.divider}`, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, background: T.inputBg, borderRadius: 9, border: `1px solid ${T.divider}`, padding: '8px 12px' }}>
                    <Search size={14} color={T.textMuted} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by PO, Customer, Plant…" style={{ border: 'none', background: 'none', color: T.text, fontSize: 13, outline: 'none', flex: 1 }} />
                </div>
                <div style={{ display: 'flex', gap: 4, background: T.inputBg, borderRadius: 9, border: `1px solid ${T.divider}`, padding: 4 }}>
                    {['All', 'RED', 'YELLOW', 'GREEN'].map(c => (
                        <button key={c} onClick={() => setFilterCls(c)} style={{
                            padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                            background: filterCls === c ? (c === 'RED' ? T.red : c === 'YELLOW' ? T.yellow : c === 'GREEN' ? T.green : T.accent) : 'none',
                            color: filterCls === c ? '#fff' : T.textMuted, transition: T.transition,
                        }}>{c}</button>
                    ))}
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '8px 12px', borderRadius: 9, border: `1px solid ${T.divider}`, background: T.inputBg, color: T.text, fontSize: 12, cursor: 'pointer' }}>
                    <option value="Breach_Score">Sort: Breach Score</option>
                    <option value="Days_Remaining">Sort: Days Remaining</option>
                    <option value="Quantity">Sort: Quantity</option>
                    <option value="Customer">Sort: Customer</option>
                    <option value="Plant">Sort: Plant</option>
                </select>
                <span style={{ fontSize: 12, color: T.textMuted }}>{filtered.length} results</span>
            </div>

            {/* Table */}
            <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}`, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: T.inputBg }}>
                                {['PO Number', 'Customer', 'Plant', 'Stage', 'Delivery Date', 'Days Left', 'Quantity', 'Score', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: T.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', borderBottom: `1px solid ${T.divider}` }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((o, i) => (
                                <tr key={i} style={{ borderTop: `1px solid ${T.divider}`, transition: T.transition }}
                                    onMouseEnter={e => e.currentTarget.style.background = T.inputBg}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                    <td style={{ padding: '9px 14px', fontWeight: 700, color: T.accent, whiteSpace: 'nowrap' }}>{o.Smart_ID}</td>
                                    <td style={{ padding: '9px 14px', color: T.textSecondary, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.Customer}</td>
                                    <td style={{ padding: '9px 14px', color: T.textSecondary, whiteSpace: 'nowrap' }}>{o.Plant}</td>
                                    <td style={{ padding: '9px 14px', color: T.textMuted, whiteSpace: 'nowrap' }}>{o.Current_Status}</td>
                                    <td style={{ padding: '9px 14px', color: T.textSecondary, whiteSpace: 'nowrap' }}>{o.Delivery_Date}</td>
                                    <td style={{ padding: '9px 14px', fontWeight: 700, color: o.Days_Remaining < 0 ? T.red : o.Days_Remaining <= 14 ? T.yellow : T.text, whiteSpace: 'nowrap' }}>{o.Days_Remaining}d</td>
                                    <td style={{ padding: '9px 14px', color: T.textSecondary, whiteSpace: 'nowrap' }}>{(o.Quantity || 0).toLocaleString()}</td>
                                    <td style={{ padding: '9px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 36, height: 4, background: T.divider, borderRadius: 2, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${o.Breach_Score || 0}%`, background: cc(o.Classification), borderRadius: 2 }} />
                                            </div>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: cc(o.Classification) }}>{o.Breach_Score || 0}%</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '9px 14px' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: `${cc(o.Classification)}15`, color: cc(o.Classification), whiteSpace: 'nowrap' }}>{o.Classification}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
