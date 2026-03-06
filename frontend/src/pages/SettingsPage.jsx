import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../theme';
import {
    Settings, Database, Brain, Shield, Clock, ChevronRight,
    CheckCircle, AlertTriangle, RefreshCw, Users, Activity,
    Sliders, Info, Package
} from 'lucide-react';

const API = 'http://127.0.0.1:8000';

export default function SettingsPage() {
    const { T, isDark, toggleTheme } = useTheme();
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');

    const [sysInfo, setSysInfo] = useState(null);
    const [bizRules, setBizRules] = useState(null);
    const [modelReport, setModelReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('system');

    const [editMode, setEditMode] = useState(false);
    const [editedRules, setEditedRules] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.allSettled([
            axios.get(`${API}/api/system/info`),
            axios.get(`${API}/api/kpi/business-rules`),
            axios.get(`${API}/api/kpi/model-report`),
        ]).then(([sys, biz, mod]) => {
            if (sys.status === 'fulfilled') setSysInfo(sys.value.data);
            if (biz.status === 'fulfilled') {
                setBizRules(biz.value.data);
                setEditedRules(biz.value.data);
            }
            if (mod.status === 'fulfilled') setModelReport(mod.value.data);
            setLoading(false);
        });
    }, []);

    const handleSaveRules = async () => {
        setSaving(true);
        try {
            await axios.post(`${API}/api/kpi/business-rules`, editedRules);
            setBizRules(editedRules);
            setEditMode(false);
        } catch (error) {
            alert('Failed to save rules. Make sure the backend is running.');
        } finally {
            setSaving(false);
        }
    };

    const handleRetrainModel = async () => {
        if (!confirm('This will start retraining the ML model in the background. It may take a minute. Continue?')) return;
        try {
            await axios.post(`${API}/api/system/retrain`);
            alert('Model retraining started! Check the backend terminal for progress. The new model will be loaded automatically on next startup.');
        } catch (error) {
            alert('Failed to start training.');
        }
    };

    const updateRuleItem = (category, key, value) => {
        setEditedRules(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: typeof value === 'number' ? Number(value) : value
            }
        }));
    };

    const tabs = [
        { id: 'system', label: 'System', icon: Activity },
        { id: 'model', label: 'ML Model', icon: Brain },
        { id: 'rules', label: 'Business Rules', icon: Sliders },
        { id: 'access', label: 'Access Control', icon: Shield },
    ];

    const Card = ({ children, style }) => (
        <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}`, overflow: 'hidden', ...style }}>
            {children}
        </div>
    );

    const CardHeader = ({ title, sub }) => (
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.divider}`, background: T.inputBg }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>
            {sub && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{sub}</div>}
        </div>
    );

    const InfoRow = ({ label, value, badge, color }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 20px', borderBottom: `1px solid ${T.divider}` }}>
            <span style={{ fontSize: 13, color: T.textSecondary }}>{label}</span>
            {badge ? (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: `${color || T.accent}18`, color: color || T.accent, border: `1px solid ${color || T.accent}33` }}>
                    {value}
                </span>
            ) : (
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{value}</span>
            )}
        </div>
    );

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

            {/* Page header */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: 0, letterSpacing: '-0.4px' }}>Admin Settings</h1>
                <p style={{ fontSize: 13, color: T.textMuted, marginTop: 5 }}>
                    Logged in as <strong style={{ color: T.text }}>{auth.username || 'admin'}</strong> · {auth.role?.toUpperCase()} access
                </p>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${T.divider}`, paddingBottom: 1 }}>
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px',
                            borderRadius: '10px 10px 0 0', border: 'none', cursor: 'pointer',
                            background: active ? T.surface : 'none',
                            color: active ? T.accent : T.textMuted,
                            fontSize: 13, fontWeight: active ? 700 : 500,
                            borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
                            transition: T.transition,
                        }}>
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.textMuted, padding: 32 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: `3px solid ${T.accent}30`, borderTopColor: T.accent, animation: 'spin 0.8s linear infinite' }} />
                    Loading system data…
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* ── SYSTEM TAB ── */}
            {!loading && activeTab === 'system' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Card>
                        <CardHeader title="Data Source" sub="Production data loaded at startup" />
                        <InfoRow label="Source File" value="raw_data.xlsx" />
                        <InfoRow label="Active Orders" value={sysInfo?.active_orders?.toLocaleString() ?? '—'} />
                        <InfoRow label="Historical (Shipped)" value={sysInfo?.shipped_orders?.toLocaleString() ?? '—'} />
                        <InfoRow label="Backend API" value="Running" badge color={T.green} />
                        <InfoRow label="Base URL" value="http://127.0.0.1:8000" />
                    </Card>

                    <Card>
                        <CardHeader title="Application Info" sub="Tech stack and version details" />
                        <InfoRow label="Frontend" value="React 18 + Vite" />
                        <InfoRow label="Backend" value="FastAPI + Uvicorn" />
                        <InfoRow label="ML Framework" value={sysInfo?.ml_model ?? 'XGBoost'} />
                        <InfoRow label="AI Chat" value="Groq (LLaMA 3) via LangChain" />
                        <InfoRow label="Version" value={sysInfo?.backend_version ?? '1.0.0'} />
                    </Card>

                    <Card>
                        <CardHeader title="Theme & Appearance" sub="Live display settings" />
                        <div style={{ padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Color Mode</div>
                                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Currently: {isDark ? 'Dark' : 'Light'} mode</div>
                                </div>
                                <button onClick={toggleTheme} style={{
                                    padding: '8px 18px', borderRadius: 9, border: `1px solid ${T.accent}`,
                                    background: T.accentSoft, color: T.accent, fontSize: 12, fontWeight: 700,
                                    cursor: 'pointer', transition: T.transition,
                                }}>
                                    Switch to {isDark ? 'Light' : 'Dark'}
                                </button>
                            </div>
                            <div style={{ height: 1, background: T.divider, marginBottom: 16 }} />
                            <div style={{ display: 'flex', gap: 10 }}>
                                {[['Accent', T.accent], ['Text', T.text], ['Surface', T.surface], ['Divider', T.divider]].map(([name, col]) => (
                                    <div key={name} style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ height: 24, borderRadius: 6, background: col, border: `1px solid ${T.divider}`, marginBottom: 4 }} />
                                        <div style={{ fontSize: 9, color: T.textMuted }}>{name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title="API Endpoints" sub="All available backend routes" />
                        {[
                            ['/api/orders', 'Active orders with breach scores'],
                            ['/api/kpi/otif-summary', 'OTIF KPI scorecards'],
                            ['/api/kpi/otif-trend', 'Monthly trend data'],
                            ['/api/kpi/priority-orders', 'Top 20 at-risk orders'],
                            ['/api/kpi/model-report', 'ML training metrics'],
                            ['/api/chat', 'AI chat (POST)'],
                        ].map(([path, desc]) => (
                            <div key={path} style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', borderBottom: `1px solid ${T.divider}`, gap: 12 }}>
                                <code style={{ fontSize: 11, color: T.accent, background: T.accentSoft, padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace' }}>{path}</code>
                                <span style={{ fontSize: 11, color: T.textMuted }}>{desc}</span>
                            </div>
                        ))}
                    </Card>
                </div>
            )}

            {/* ── MODEL TAB ── */}
            {!loading && activeTab === 'model' && modelReport && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Card>
                        <CardHeader title="Performance Metrics" sub={`Trained: ${modelReport.trained_at ? new Date(modelReport.trained_at).toLocaleDateString() : '—'}`} />
                        <InfoRow label="Holdout AUC-ROC" value={Number(modelReport.holdout_auc).toFixed(4)} badge color={T.green} />
                        <InfoRow label="F1 Score" value={Number(modelReport.holdout_f1).toFixed(4)} badge color={T.accent} />
                        <InfoRow label="Precision" value={Number(modelReport.holdout_precision).toFixed(4)} />
                        <InfoRow label="Recall" value={Number(modelReport.holdout_recall).toFixed(4)} />
                        <InfoRow label="CV AUC Mean" value={`${Number(modelReport.cv_auc_mean).toFixed(4)} ± ${Number(modelReport.cv_auc_std).toFixed(4)}`} />
                        <InfoRow label="Classes" value={`Breach / No Breach`} />
                    </Card>

                    <Card>
                        <CardHeader title="Training Configuration" />
                        <InfoRow label="Algorithm" value="XGBoost (XGBClassifier)" />
                        <InfoRow label="Objective" value="binary:logistic" />
                        <InfoRow label="Cross-Validation" value="5-Fold Stratified" />
                        <InfoRow label="Training Samples" value={modelReport.train_size?.toLocaleString() ?? '—'} />
                        <InfoRow label="Test Samples" value={modelReport.test_size?.toLocaleString() ?? '—'} />
                        <InfoRow label="Pos Weight" value={String(modelReport.pos_weight)} />
                    </Card>

                    <Card style={{ gridColumn: 'span 2' }}>
                        <CardHeader title="Feature Importance Ranking" sub="Signals the model uses to predict breach probability" />
                        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {Object.entries(modelReport.feature_importance || {})
                                .sort((a, b) => b[1] - a[1])
                                .map(([name, imp], i) => (
                                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: 11, color: T.textMuted, minWidth: 18, textAlign: 'right' }}>{i + 1}.</span>
                                        <span style={{ fontSize: 12, color: T.textSecondary, minWidth: 140 }}>{name}</span>
                                        <div style={{ flex: 1, height: 6, background: T.divider, borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${imp * 100 / Object.values(modelReport.feature_importance)[0]}%`, background: T.accent, borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: T.text, minWidth: 44, fontVariantNumeric: 'tabular-nums' }}>{(imp * 100).toFixed(1)}%</span>
                                    </div>
                                ))}
                        </div>
                        <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.divider}`, background: T.inputBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 11, color: T.textMuted }}>Train on new production data to improve accuracy.</div>
                            <button onClick={handleRetrainModel} style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${T.accent}`, background: T.accentSoft, color: T.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                Retrain Model Now
                            </button>
                        </div>
                    </Card>
                </div>
            )}

            {!loading && activeTab === 'model' && !modelReport && (
                <div style={{ padding: 32, textAlign: 'center', color: T.textMuted, fontSize: 13, background: T.surface, borderRadius: 14, border: `1px solid ${T.divider}` }}>
                    Model report not found.
                    <div style={{ marginTop: 12 }}>
                        <button onClick={handleRetrainModel} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: T.accent, color: '#FFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Train Initial Model
                        </button>
                    </div>
                </div>
            )}

            {/* ── BUSINESS RULES TAB ── */}
            {!loading && activeTab === 'rules' && bizRules && editedRules && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px', color: T.text, fontSize: 16 }}>Business & Analytics Rules</h3>
                            <div style={{ fontSize: 13, color: T.textMuted }}>Modifying these rules instantly changes how active orders are scored and colored.</div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {editMode ? (
                                <>
                                    <button onClick={() => { setEditMode(false); setEditedRules(bizRules); }} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.divider}`, background: T.surface, color: T.text, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                    <button onClick={handleSaveRules} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: T.accent, color: '#FFF', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>{saving ? 'Saving...' : 'Save & Hot Reload'}</button>
                                </>
                            ) : (
                                <button onClick={() => setEditMode(true)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.accent}`, background: T.accentSoft, color: T.accent, cursor: 'pointer', fontWeight: 600 }}>Edit Rules</button>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Card>
                            <CardHeader title="Production Stage Lead Times" sub="Days required per stage" />
                            {Object.entries(editedRules.lead_times || {}).map(([stage, days]) => (
                                <div key={stage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: `1px solid ${T.divider}` }}>
                                    <span style={{ fontSize: 13, color: T.textSecondary }}>{stage}</span>
                                    {editMode && stage !== 'Shipped' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <input type="number" value={days} onChange={e => updateRuleItem('lead_times', stage, e.target.value)} style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: `1px solid ${T.divider}`, background: T.inputBg, color: T.text, outline: 'none' }} />
                                            <span style={{ fontSize: 12, color: T.textMuted }}>days</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 60, height: 5, background: T.divider, borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${(days / 40) * 100}%`, background: T.accent, borderRadius: 3 }} />
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: T.text, minWidth: 36 }}>{days}d</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </Card>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <Card>
                                <CardHeader title="Risk Thresholds" sub="Determines RED / YELLOW / GREEN classification score" />
                                {Object.entries(editedRules.breach_thresholds || {}).map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 20px', borderBottom: `1px solid ${T.divider}` }}>
                                        <span style={{ fontSize: 13, color: T.textSecondary }}>{k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                                        {editMode ? (
                                            <input type="number" value={v} onChange={e => updateRuleItem('breach_thresholds', k, e.target.value)} style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: `1px solid ${T.divider}`, background: T.inputBg, color: T.text, outline: 'none' }} />
                                        ) : (
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: `${k.includes('red') ? T.red : k.includes('yellow') ? T.yellow : T.accent}18`, color: k.includes('red') ? T.red : k.includes('yellow') ? T.yellow : T.accent }}>
                                                {v}{k.includes('threshold') ? '%' : ''}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </Card>

                            <Card>
                                <CardHeader title="System Limits" />
                                {Object.entries(editedRules.thresholds || {}).map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 20px', borderBottom: `1px solid ${T.divider}` }}>
                                        <span style={{ fontSize: 13, color: T.textSecondary }}>{k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                                        {editMode ? (
                                            <input type="number" value={v} onChange={e => updateRuleItem('thresholds', k, e.target.value)} style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: `1px solid ${T.divider}`, background: T.inputBg, color: T.text, outline: 'none' }} />
                                        ) : (
                                            <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{v}</span>
                                        )}
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 20px', borderBottom: `1px solid ${T.divider}` }}>
                                    <span style={{ fontSize: 13, color: T.textSecondary }}>Min Orders for Profile</span>
                                    {editMode ? (
                                        <input type="number" value={editedRules.profile_min_orders || ''} onChange={e => setEditedRules(prev => ({ ...prev, profile_min_orders: Number(e.target.value) }))} style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: `1px solid ${T.divider}`, background: T.inputBg, color: T.text, outline: 'none' }} />
                                    ) : (
                                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{editedRules.profile_min_orders || '—'}</span>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>

                    <Card style={{ gridColumn: 'span 2' }}>
                        <CardHeader title="Stage Commentary Templates" sub="AI-generated text per production stage (used in risk explanations)" />
                        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {Object.entries(bizRules.commentary_templates || {}).filter(([k]) => k !== 'default').map(([stage, text]) => (
                                <div key={stage} style={{ padding: '12px 14px', background: T.inputBg, borderRadius: 10, border: `1px solid ${T.divider}` }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{stage}</div>
                                    <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6 }}>{text}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.divider}`, background: T.inputBg }}>
                            <span style={{ fontSize: 11, color: T.textMuted }}>Edit these in: <code style={{ color: T.accent, background: T.accentSoft, padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>backend/business_rules.json</code></span>
                        </div>
                    </Card>
                </div>
            )}

            {/* ── ACCESS CONTROL TAB ── */}
            {!loading && activeTab === 'access' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Card>
                        <CardHeader title="Role Permissions" sub="What each role can access" />
                        {[
                            { role: 'Admin', color: T.red, pages: ['Dashboard', 'Orders', 'Plants', 'AI Chat', 'ML Insights', 'Settings'] },
                            { role: 'Developer', color: T.accent, pages: ['Dashboard', 'Orders', 'Plants', 'AI Chat', 'ML Insights'] },
                            { role: 'User', color: T.green, pages: ['Dashboard', 'Orders', 'AI Chat'] },
                        ].map(r => (
                            <div key={r.role} style={{ padding: '14px 20px', borderBottom: `1px solid ${T.divider}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}33` }}>{r.role}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {r.pages.map(p => (
                                        <span key={p} style={{ fontSize: 11, color: T.textSecondary, background: T.inputBg, padding: '2px 8px', borderRadius: 5, border: `1px solid ${T.divider}` }}>{p}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </Card>

                    <Card>
                        <CardHeader title="Demo Credentials" sub="Replace with real auth in production" />
                        {[
                            { username: 'admin', password: 'admin123', role: 'Admin', color: T.red },
                            { username: 'dev', password: 'dev123', role: 'Developer', color: T.accent },
                            { username: 'user', password: 'user123', role: 'User', color: T.green },
                        ].map(u => (
                            <div key={u.username} style={{ padding: '12px 20px', borderBottom: `1px solid ${T.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{u.username} / {u.password}</div>
                                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{u.role}</div>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 5, background: `${u.color}18`, color: u.color }}>{u.role}</span>
                            </div>
                        ))}
                        <div style={{ padding: '12px 20px', background: T.redBg }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <AlertTriangle size={14} color={T.red} style={{ marginTop: 1, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, color: T.red, lineHeight: 1.6 }}>
                                    Client-side only. For production, replace with JWT-based backend authentication.
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Card style={{ gridColumn: 'span 2' }}>
                        <CardHeader title="Current Session" />
                        <div style={{ padding: '16px 20px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            {[
                                ['Logged In As', auth.username || '—'],
                                ['Role', auth.role || '—'],
                                ['Auth Storage', 'localStorage (client-side)'],
                                ['Session Type', 'Persistent until logout'],
                            ].map(([label, val]) => (
                                <div key={label} style={{ flex: 1, minWidth: 160 }}>
                                    <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{val}</div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
