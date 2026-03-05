import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../theme';
import { Brain, BarChart3, Target, CheckCircle, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import PageHeader, { PAGE_ACCENTS } from '../components/PageHeader';

const API = 'http://127.0.0.1:8000';

export default function MLInsightsPage() {
    const { T } = useTheme();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios.get(`${API}/api/kpi/model-report`)
            .then(r => { setReport(r.data); setLoading(false); })
            .catch(e => { setError('Could not load training report. Ensure the backend is running and the model has been trained.'); setLoading(false); });
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.accent}30`, borderTopColor: T.accent, animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: T.textMuted, fontSize: 13 }}>Loading model metrics…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (error) return (
        <div style={{ padding: '32px', maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: T.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertTriangle size={24} color={T.red} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>Model Report Unavailable</div>
            <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6 }}>{error}</div>
        </div>
    );

    const {
        cv_auc_mean = 0, cv_auc_std = 0, cv_fold_scores = [],
        holdout_auc = 0, holdout_precision = 0, holdout_recall = 0, holdout_f1 = 0,
        confusion_matrix = [[0, 0], [0, 0]], feature_importance = {},
        train_size = 0, test_size = 0, pos_weight = 0, trained_at = ''
    } = report;

    const tn = confusion_matrix[0]?.[0] ?? 0;
    const fp = confusion_matrix[0]?.[1] ?? 0;
    const fn = confusion_matrix[1]?.[0] ?? 0;
    const tp = confusion_matrix[1]?.[1] ?? 0;

    const feats = Object.entries(feature_importance)
        .sort((a, b) => b[1] - a[1]);
    const maxImp = feats[0]?.[1] || 1;

    const trainedDate = trained_at ? new Date(trained_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>

            {/* ── Page title row ── */}
            <PageHeader
                icon={Brain}
                title="Model Performance"
                subtitle={`XGBoost · Trained ${trainedDate} · ${(train_size + test_size).toLocaleString()} total samples`}
                accent={PAGE_ACCENTS['/ml']?.color}
                badge={`AUC ${Number(holdout_auc).toFixed(4)}`}
            />

            {/* ── KPI strip — horizontal flex with bottom accent ── */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
                {[
                    { label: 'Holdout AUC', value: Number(holdout_auc).toFixed(4), sub: 'Discrimination ability', color: T.green },
                    { label: 'CV AUC', value: `${Number(cv_auc_mean).toFixed(4)} ± ${Number(cv_auc_std).toFixed(4)}`, sub: '5-fold cross-validation', color: PAGE_ACCENTS['/ml']?.color },
                    { label: 'F1 Score', value: Number(holdout_f1).toFixed(4), sub: 'Precision–recall balance', color: PAGE_ACCENTS['/ml']?.color },
                    { label: 'Precision', value: Number(holdout_precision).toFixed(4), sub: 'True positive accuracy', color: T.yellow },
                    { label: 'Recall', value: Number(holdout_recall).toFixed(4), sub: 'At-risk order coverage', color: T.yellow },
                ].map((m, i) => (
                    <div key={i} style={{
                        flex: 1, minWidth: 160, padding: '20px 22px',
                        background: T.surface, borderRadius: 16,
                        border: `1px solid ${T.divider}`,
                        borderBottom: `3px solid ${m.color}`,
                        position: 'relative',
                    }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, background: `linear-gradient(0deg, ${m.color}06 0%, transparent 100%)`, pointerEvents: 'none', borderRadius: '0 0 16px 16px' }} />
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>{m.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: m.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>{m.value}</div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>{m.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── Main two-column ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 }}>

                {/* Feature importance */}
                <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}`, padding: '20px 24px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Feature Importance</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 18 }}>Top predictive signals used by the model</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                        {feats.slice(0, 10).map(([name, imp], i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 500 }}>{name}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{(imp * 100).toFixed(1)}%</span>
                                </div>
                                <div style={{ height: 6, background: T.divider, borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 3,
                                        width: `${(imp / maxImp) * 100}%`,
                                        background: i === 0 ? T.accent : i < 4 ? `${T.accent}AA` : T.textMuted,
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Confusion matrix */}
                    <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}`, padding: '20px 22px' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Confusion Matrix</div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 16 }}>Holdout set predictions</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                                { label: 'True Positive', value: tp, color: T.green, sub: 'Correctly flagged breach' },
                                { label: 'False Positive', value: fp, color: T.yellow, sub: 'Wrongly flagged as breach' },
                                { label: 'False Negative', value: fn, color: T.red, sub: 'Missed actual breach' },
                                { label: 'True Negative', value: tn, color: T.green, sub: 'Correctly cleared' },
                            ].map((c, i) => (
                                <div key={i} style={{ padding: '12px', borderRadius: 10, textAlign: 'center', background: `${c.color}0C`, border: `1px solid ${c.color}25` }}>
                                    <div style={{ fontSize: 26, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value.toLocaleString()}</div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: T.text, marginTop: 4 }}>{c.label}</div>
                                    <div style={{ fontSize: 9, color: T.textMuted, marginTop: 2 }}>{c.sub}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CV folds */}
                    <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}`, padding: '20px 22px' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Cross-Validation Folds</div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 14 }}>AUC per training fold</div>
                        {cv_fold_scores.map((score, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <span style={{ fontSize: 11, color: T.textMuted, minWidth: 44 }}>Fold {i + 1}</span>
                                <div style={{ flex: 1, height: 7, background: T.divider, borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${score * 100}%`, background: T.accent, borderRadius: 3 }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: T.text, minWidth: 48, fontVariantNumeric: 'tabular-nums' }}>{Number(score).toFixed(4)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Training metadata */}
                    <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}`, padding: '16px 22px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Training Metadata</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                                ['Algorithm', 'XGBoost'],
                                ['Objective', 'binary:logistic'],
                                ['Validation', '5-Fold Stratified CV'],
                                ['Pos Weight', String(pos_weight)],
                                ['Train Samples', train_size.toLocaleString()],
                                ['Test Samples', test_size.toLocaleString()],
                            ].map(([k, v]) => (
                                <div key={k} style={{ padding: '8px 10px', background: T.inputBg, borderRadius: 8 }}>
                                    <div style={{ fontSize: 9, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{k}</div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
