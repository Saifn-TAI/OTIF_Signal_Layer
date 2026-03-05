import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from '../theme';
import { X, AlertTriangle, CheckCircle, Brain, Package, Clock, Activity, ArrowUp, ArrowDown } from 'lucide-react';

function getRiskInsights(order, score, cls, days) {
    const items = [];
    if (score >= 80) items.push(`Critical breach probability (${score}%). Supply chain resilience is compromised requiring immediate executive override.`);
    else if (score >= 60) items.push(`Elevated breach risk (${score}%). Systemic delays detected; proactive logistics intervention is recommended.`);
    else if (score >= 40) items.push(`Moderate risk factor (${score}%). Minor production friction identified; continuous monitoring advised.`);
    else items.push(`Nominal risk parameters (${score}%). Order progressing within standard operational tolerances.`);

    if (days < 0) items.push(`Delivery timeline exceeded by ${Math.abs(days)} day(s). Contractual SLA breach is active.`);
    else if (days <= 7) items.push(`Delivery window critically constrained (${days} days remaining). Minimal tolerance for downstream disruption.`);
    else if (days <= 14) items.push(`Delivery margin tightening (${days} days remaining). Pre-booking carrier transit is advised.`);

    const stage = (order.Current_Status || '').toLowerCase();
    if (stage.includes('cut') || stage.includes('knit') || stage.includes('weav'))
        items.push(`Upstream production phase (${order.Current_Status}). Lead time vulnerability is statistically high at this stage.`);
    else if (stage.includes('sew') || stage.includes('stitch'))
        items.push(`Mid-cycle assembly (${order.Current_Status}). Throughput velocity must be maintained to ensure unhindered QA intake.`);
    else if (stage.includes('pack') || stage.includes('finish'))
        items.push(`Downstream fulfillment (${order.Current_Status}). Prioritize freight booking and customs documentation velocity.`);

    const qty = Number(order.Total_Qty) || 0;
    if (qty > 10000) items.push(`High-volume throughput requirement (${qty.toLocaleString()} pcs). Batch parallelization is necessary to prevent bottlenecking.`);
    else if (qty > 5000) items.push(`Substantial volume (${qty.toLocaleString()} pcs). Verify line-level capacity allocation.`);

    const p = order.Plant || order.plant;
    if (p) items.push(`Target Production Node: ${p}. Recommend cross-correlating with active capacity utilization metrics.`);

    return items.length > 0 ? items : ['Insufficient telemetry for granular ML analysis. Defer to baseline operational heuristics.'];
}

function getActions(cls, days) {
    const c = (cls || '').toUpperCase();
    const items = [];
    if (days < 0) items.push('Initiate immediate stakeholder communication protocol. Revise ETA and implement root cause analysis (RCA).');
    if (c === 'RED') {
        items.push('Escalate to operations leadership. Institute daily agile reviews until path-to-green is secured.');
        items.push('Conduct rapid bottleneck identification within 24h. Authorize expedited freight options if ROI warrants it.');
        if (days >= 0 && days <= 7) items.push('Model split-shipment feasibility. Secure client authorization for staggered delivery tranches.');
        items.push('Deploy dedicated field supervisor. Pre-allocate raw material supply chain buffers.');
    } else if (c === 'YELLOW') {
        items.push('Trigger 48h plant capacity review. Contrast current yield rates against predictive throughput models.');
        items.push('Flag on executive watchlist. Automate daily reassessment and trigger alerts on multi-day yield drops.');
    } else {
        items.push('Maintain baseline algorithmic monitoring. Default SLA routing applies.');
        items.push('Pre-allocate outbound logistics capacity 72h prior to modeled completion date.');
    }
    return items;
}

export default function OrderDetailModal({ order, onClose }) {
    const { T } = useTheme();

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    if (!order) return null;

    const score = Number(order.Breach_Score ?? order.breach_score ?? 0);
    const cls = (order.Classification || order.classification || 'GREEN').toUpperCase();
    const daysLeft = Number(order.Days_Remaining ?? order.buffer ?? 0);
    const buf = Number(order.buffer ?? order.Days_Remaining ?? daysLeft);

    const cc = cls === 'RED' ? T.red : cls === 'YELLOW' ? T.yellow : T.green;
    const cBg = cls === 'RED' ? T.redBg : cls === 'YELLOW' ? T.yellowBg : T.greenBg;
    const cLabel = cls === 'RED' ? 'Critical' : cls === 'YELLOW' ? 'Watch' : 'On Track';
    const dColor = daysLeft < 0 ? T.red : daysLeft <= 7 ? T.red : daysLeft <= 14 ? T.yellow : T.green;
    const bColor = buf < 0 ? T.red : buf <= 5 ? T.yellow : T.green;

    const po = order.Smart_ID || order.buyer_po || '—';
    const customer = order.Customer || order.buyer || '—';
    const plant = order.Plant || order.plant || '—';
    const dDate = order.Delivery_Date || order.delivery_date || '—';
    const stage = order.Current_Status || '—';
    const qty = order.Total_Qty ? `${Number(order.Total_Qty).toLocaleString()} pcs` : '—';
    const styleVal = order.Style || '—';

    const insights = getRiskInsights(order, score, cls, daysLeft);
    const actions = getActions(cls, daysLeft);

    const riskLabel = score >= 80 ? 'Very High' : score >= 60 ? 'High' : score >= 40 ? 'Moderate' : score >= 20 ? 'Low' : 'Minimal';

    /* tiny helpers using closure over T */
    const DetailRow = (label, value, color) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: `1px solid ${T.divider}` }}>
            <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, minWidth: 130 }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: color || T.text, textAlign: 'right', flex: 1, marginLeft: 12 }}>{value || '—'}</span>
        </div>
    );

    const Tile = (val, unit, label, color) => (
        <div style={{ flex: 1, padding: '14px 10px', borderRadius: 12, textAlign: 'center', background: `${color}10`, border: `1px solid ${color}30` }}>
            <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {val}<span style={{ fontSize: 14 }}>{unit}</span>
            </div>
            <div style={{ fontSize: 10, color: T.textMuted, marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        </div>
    );

    const content = (
        <>
            {/* overlay */}
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 9998 }} />

            {/* centered dialog */}
            <div style={{
                position: 'fixed',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(900px, 95vw)',
                maxHeight: '90vh',
                background: T.surface,
                borderRadius: 20,
                border: `1px solid ${T.divider}`,
                boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
                <style>{`
          @keyframes modalPop { from { transform: translate(-50%,-50%) scale(0.88); opacity: 0; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
          .od-body::-webkit-scrollbar { width: 4px; }
          .od-body::-webkit-scrollbar-thumb { background: rgba(155,155,155,0.25); border-radius: 4px; }
        `}</style>

                {/* ── TOP BAR ── */}
                <div style={{
                    padding: '20px 28px', borderBottom: `1px solid ${T.divider}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                    background: `linear-gradient(135deg, ${cc}12, transparent)`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: cBg, border: `2px solid ${cc}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={20} color={cc} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.5px' }}>{po}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 6, background: cBg, color: cc, border: `1px solid ${cc}44`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {cLabel}
                                </span>
                            </div>
                            <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 3 }}>
                                <strong style={{ fontWeight: 600 }}>{customer}</strong>
                                <span style={{ color: T.textMuted }}> · {plant}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.divider}`, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMuted, transition: T.transition }}
                        onMouseEnter={e => { e.currentTarget.style.background = T.redBg; e.currentTarget.style.color = T.red; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.textMuted; }}>
                        <X size={18} />
                    </button>
                </div>

                {/* ── BODY: scrollable 2-col ── */}
                <div className="od-body" style={{ flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', minHeight: 0 }}>

                        {/* ── LEFT COLUMN ── */}
                        <div style={{ borderRight: `1px solid ${T.divider}`, padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                            {/* Breach Score */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Breach Risk Score</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
                                    <span style={{ fontSize: 56, fontWeight: 900, color: cc, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{score}<span style={{ fontSize: 24 }}>%</span></span>
                                    <span style={{ fontSize: 12, color: cc, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: cBg, border: `1px solid ${cc}33`, marginBottom: 8 }}>{riskLabel}</span>
                                </div>
                                <div style={{ height: 8, borderRadius: 4, background: T.divider, overflow: 'hidden', marginBottom: 8 }}>
                                    <div style={{ height: '100%', width: `${Math.min(score, 100)}%`, background: cc, borderRadius: 4, transition: 'width 0.6s ease' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 3 }}>
                                    {[{ l: '0–20', c: T.green }, { l: '20–40', c: '#66BB6A' }, { l: '40–60', c: T.yellow }, { l: '60–75', c: '#FB923C' }, { l: '75+', c: T.red }].map(s => (
                                        <div key={s.l} style={{ flex: 1 }}>
                                            <div style={{ height: 4, background: s.c, borderRadius: 2, marginBottom: 3 }} />
                                            <div style={{ fontSize: 8, color: T.textMuted }}>{s.l}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Timeline Tiles */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Delivery Timeline</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {Tile(daysLeft, 'd', 'Days Left', dColor)}
                                    {Tile(buf, 'd', 'Buffer', bColor)}
                                </div>
                            </div>

                            {/* Order Info */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>Order Information</div>
                                {DetailRow('PO Number', po, T.accent)}
                                {DetailRow('Customer', customer)}
                                {DetailRow('Plant', plant)}
                                {DetailRow('Production Stage', stage)}
                                {DetailRow('Delivery Date', dDate)}
                                {DetailRow('Days Remaining', `${daysLeft} days`, dColor)}
                                {order.Total_Qty && DetailRow('Quantity', qty)}
                                {order.Style && DetailRow('Style', styleVal)}
                            </div>
                        </div>

                        {/* ── RIGHT COLUMN ── */}
                        <div style={{ padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                            {/* AI Risk Analysis */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Brain size={14} color={T.accent} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>AI Risk Analysis</div>
                                        <div style={{ fontSize: 10, color: T.textMuted }}>ML-identified breach signals</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {insights.map((txt, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: T.inputBg, borderRadius: 10, border: `1px solid ${T.yellow}22` }}>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${T.yellow}15`, border: `1px solid ${T.yellow}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                                <AlertTriangle size={11} color={T.yellow} />
                                            </div>
                                            <span style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>{txt}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommended Actions */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircle size={14} color={T.accent} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Recommended Actions</div>
                                        <div style={{ fontSize: 10, color: T.textMuted }}>AI-generated intervention steps</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {actions.map((txt, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: T.accentSoft, borderRadius: 10, border: `1px solid ${T.accent}18` }}>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                                <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{i + 1}</span>
                                            </div>
                                            <span style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{txt}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── FOOTER ── */}
                <div style={{ padding: '14px 28px', borderTop: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: T.textMuted }}>Press <kbd style={{ padding: '2px 6px', borderRadius: 4, border: `1px solid ${T.divider}`, fontSize: 10, color: T.textSecondary, background: T.inputBg }}>Esc</kbd> to close</span>
                    <button onClick={onClose} style={{ padding: '8px 24px', borderRadius: 8, border: `1px solid ${T.divider}`, background: T.inputBg, color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: T.transition }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.divider; e.currentTarget.style.color = T.textSecondary; }}>
                        Close
                    </button>
                </div>
            </div>
        </>
    );

    return ReactDOM.createPortal(content, document.body);
}
