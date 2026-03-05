import React from 'react';
import { useTheme } from '../theme';
import { Factory } from 'lucide-react';
import { SectionHeader, BreachBar } from '../components/SharedUI';
import PageHeader, { PAGE_ACCENTS } from '../components/PageHeader';

export default function PlantsPage({ plantHeatmap }) {
    const { T } = useTheme();

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1440, margin: '0 auto' }}>
            <PageHeader
                icon={Factory}
                title="Plant Performance"
                subtitle="Risk concentration and performance by manufacturing unit"
                accent={PAGE_ACCENTS['/plants']?.color}
            />
            <div className="card" style={{ padding: 20 }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Plant', 'Active', 'Red', 'Yellow', 'Green', 'Red%', 'Hist. OTIF', 'Avg Score', 'Qty'].map(h => (
                                    <th key={h} style={{
                                        textAlign: 'left', padding: 10, fontSize: 10, fontWeight: 600,
                                        color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px',
                                        borderBottom: `1px solid ${T.divider}`
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(plantHeatmap || []).map((p, i) => (
                                <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${T.divider}`, transition: T.transition }}>
                                    <td style={{ padding: 10, fontWeight: 600, fontSize: 12, color: T.text }}>{p.plant}</td>
                                    <td style={{ padding: 10, fontSize: 12, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{p.active_orders}</td>
                                    <td style={{ padding: 10, fontWeight: 700, color: T.red, fontSize: 12 }}>{p.red_count}</td>
                                    <td style={{ padding: 10, fontWeight: 700, color: T.yellow, fontSize: 12 }}>{p.yellow_count}</td>
                                    <td style={{ padding: 10, fontWeight: 700, color: T.green, fontSize: 12 }}>{p.green_count}</td>
                                    <td style={{ padding: 10 }}>
                                        <span style={{ fontWeight: 600, fontSize: 11, color: p.red_pct > 80 ? T.red : p.red_pct > 50 ? T.yellow : T.green }}>
                                            {p.red_pct}%
                                        </span>
                                    </td>
                                    <td style={{ padding: 10 }}>
                                        <span style={{ fontWeight: 600, fontSize: 11, color: p.historical_otif < 60 ? T.red : p.historical_otif < 75 ? T.yellow : T.green }}>
                                            {p.historical_otif}%
                                        </span>
                                    </td>
                                    <td style={{ padding: 10 }}><BreachBar score={p.avg_breach_score} /></td>
                                    <td style={{ padding: 10, fontSize: 11, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{p.total_qty.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
