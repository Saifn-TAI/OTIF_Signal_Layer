import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, X, Send, Bot, User, Loader2, Zap, Activity } from 'lucide-react';

const API_URL = "http://127.0.0.1:8000/api/chat";

/* ─── Design tokens (matching App.jsx) ─── */
const T = {
    bg: '#0B0F1A',
    surface: '#111827',
    elevated: '#1A2234',
    glassBorder: 'rgba(255,255,255,0.06)',
    accent: '#818CF8',
    accentSoft: 'rgba(129, 140, 248, 0.12)',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    green: '#34D399',
    red: '#F87171',
    radius: '14px',
};

export default function AiWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(() => { scrollToBottom(); }, [messages]);
    useEffect(() => { if (!hasInitialized) { setHasInitialized(true); triggerAutoInsight(); } }, [hasInitialized]);

    const triggerAutoInsight = async () => {
        setLoading(true);
        setMessages([{ role: 'assistant', text: "Checking latest production data…" }]);
        try {
            const res = await axios.post(API_URL, { question: "Provide a daily executive briefing summary." });
            const text = typeof res.data.answer === 'string' ? res.data.answer : JSON.stringify(res.data.answer);
            setMessages([{ role: 'assistant', text }]);
        } catch {
            setMessages([{ role: 'assistant', text: "⚠️ Backend is offline. Start the server and retry." }]);
        } finally { setLoading(false); }
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const q = input;
        setMessages(prev => [...prev, { role: 'user', text: q }]);
        setInput(""); setLoading(true);
        try {
            const res = await axios.post(API_URL, { question: q });
            const text = typeof res.data.answer === 'string' ? res.data.answer : JSON.stringify(res.data.answer);
            setMessages(prev => [...prev, { role: 'assistant', text }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', text: "Analysis failed. Please retry." }]);
        } finally { setLoading(false); }
    };

    /* ─── Markdown component overrides (dark theme) ─── */
    const mdComponents = {
        p: ({ children }) => <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>{children}</p>,
        strong: ({ children }) => <strong style={{ color: T.text, fontWeight: 700 }}>{children}</strong>,
        ul: ({ children }) => <ul style={{ paddingLeft: '16px', margin: '6px 0', listStyleType: 'disc' }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ paddingLeft: '16px', margin: '6px 0' }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: '3px', lineHeight: 1.5 }}>{children}</li>,
        h1: ({ children }) => <div style={{ fontSize: '15px', fontWeight: 700, color: T.text, margin: '8px 0 4px' }}>{children}</div>,
        h2: ({ children }) => <div style={{ fontSize: '14px', fontWeight: 700, color: T.text, margin: '8px 0 4px' }}>{children}</div>,
        h3: ({ children }) => <div style={{ fontSize: '13px', fontWeight: 700, color: T.text, margin: '6px 0 3px' }}>{children}</div>,
        table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>{children}</table>
            </div>
        ),
        th: ({ children }) => <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: `1px solid ${T.glassBorder}`, color: T.textMuted, fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>{children}</th>,
        td: ({ children }) => <td style={{ padding: '5px 8px', borderBottom: `1px solid ${T.glassBorder}`, color: T.textSecondary }}>{children}</td>,
        code: ({ children }) => <code style={{ background: 'rgba(129,140,248,0.1)', color: T.accent, padding: '1px 5px', borderRadius: '4px', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>{children}</code>,
        a: ({ href, children }) => <a href={href} style={{ color: T.accent, textDecoration: 'underline' }} target="_blank" rel="noreferrer">{children}</a>,
    };

    return (
        <>
            <style>{`
        @keyframes chatFadeIn { from { opacity:0; transform: translateY(16px) scale(0.97); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes dotPulse { 0%,80%,100% { transform: scale(0.6); opacity:0.4; } 40% { transform: scale(1); opacity:1; } }
        @keyframes fabPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.4); } 70% { box-shadow: 0 0 0 12px rgba(129,140,248,0); } }
      `}</style>

            <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontFamily: "'Inter', -apple-system, sans-serif" }}>

                {/* ═══ CHAT PANEL ═══ */}
                {isOpen && (
                    <div style={{
                        width: 410, height: 580, marginBottom: 14,
                        background: T.bg, borderRadius: '18px',
                        border: `1px solid ${T.glassBorder}`,
                        boxShadow: '0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        animation: 'chatFadeIn 0.25s ease-out'
                    }}>

                        {/* ─── Header ─── */}
                        <div style={{
                            padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: T.surface, borderBottom: `1px solid ${T.glassBorder}`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    background: `linear-gradient(135deg, ${T.accent}, #6366F1)`,
                                    borderRadius: '10px', padding: 7, display: 'flex'
                                }}>
                                    <Activity size={16} color="white" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.text }}>Signal AI</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, display: 'inline-block' }} />
                                        <span style={{ fontSize: '10px', color: T.textMuted, fontWeight: 500 }}>Live Consultant</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={triggerAutoInsight} title="Refresh insight" style={{
                                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.glassBorder}`,
                                    borderRadius: '8px', padding: 6, cursor: 'pointer', display: 'flex', transition: 'all 0.15s'
                                }}>
                                    <Zap size={14} color={T.accent} />
                                </button>
                                <button onClick={() => setIsOpen(false)} style={{
                                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.glassBorder}`,
                                    borderRadius: '8px', padding: 6, cursor: 'pointer', display: 'flex', transition: 'all 0.15s'
                                }}>
                                    <X size={14} color={T.textMuted} />
                                </button>
                            </div>
                        </div>

                        {/* ─── Messages ─── */}
                        <div style={{
                            flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
                            display: 'flex', flexDirection: 'column', gap: 14
                        }}>
                            {messages.map((msg, idx) => {
                                const isUser = msg.role === 'user';
                                return (
                                    <div key={idx} style={{ display: 'flex', gap: 10, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                                        {/* Avatar */}
                                        <div style={{
                                            width: 30, height: 30, borderRadius: '10px', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            background: isUser ? T.accentSoft : T.elevated,
                                            border: `1px solid ${isUser ? 'rgba(129,140,248,0.2)' : T.glassBorder}`
                                        }}>
                                            {isUser ? <User size={14} color={T.accent} /> : <Bot size={14} color={T.accent} />}
                                        </div>
                                        {/* Bubble */}
                                        <div style={{
                                            maxWidth: '82%', padding: '10px 14px', borderRadius: '14px',
                                            borderTopLeftRadius: isUser ? '14px' : '4px',
                                            borderTopRightRadius: isUser ? '4px' : '14px',
                                            background: isUser ? T.accentSoft : T.elevated,
                                            border: `1px solid ${isUser ? 'rgba(129,140,248,0.15)' : T.glassBorder}`,
                                            fontSize: '13px', color: T.textSecondary, lineHeight: 1.55
                                        }}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Loading dots */}
                            {loading && (
                                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: 30, height: 30, borderRadius: '10px', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        background: T.elevated, border: `1px solid ${T.glassBorder}`
                                    }}>
                                        <Bot size={14} color={T.accent} />
                                    </div>
                                    <div style={{
                                        padding: '12px 18px', background: T.elevated, borderRadius: '14px',
                                        borderTopLeftRadius: '4px', border: `1px solid ${T.glassBorder}`,
                                        display: 'flex', gap: 5, alignItems: 'center'
                                    }}>
                                        {[0, 1, 2].map(i => (
                                            <span key={i} style={{
                                                width: 6, height: 6, borderRadius: '50%', background: T.accent,
                                                animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite`
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* ─── Input ─── */}
                        <div style={{
                            padding: '12px 14px', borderTop: `1px solid ${T.glassBorder}`,
                            background: T.surface, display: 'flex', gap: 10, alignItems: 'center'
                        }}>
                            <input
                                type="text"
                                placeholder="Ask about delays, OTIF, plants…"
                                value={input} onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                style={{
                                    flex: 1, padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
                                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.glassBorder}`,
                                    color: T.text, outline: 'none', transition: 'all 0.15s',
                                    fontFamily: "'Inter', sans-serif"
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(129,140,248,0.3)'}
                                onBlur={e => e.target.style.borderColor = T.glassBorder}
                            />
                            <button onClick={handleSend} disabled={loading || !input.trim()} style={{
                                background: `linear-gradient(135deg, ${T.accent}, #6366F1)`,
                                border: 'none', borderRadius: '10px', padding: '10px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: loading || !input.trim() ? 0.4 : 1,
                                transition: 'all 0.15s', transform: 'scale(1)'
                            }}
                                onMouseDown={e => { if (!loading && input.trim()) e.currentTarget.style.transform = 'scale(0.92)'; }}
                                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <Send size={16} color="white" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══ FAB BUTTON ═══ */}
                {!isOpen && (
                    <button onClick={() => setIsOpen(true)} style={{
                        width: 54, height: 54, borderRadius: '16px', border: 'none', cursor: 'pointer',
                        background: `linear-gradient(135deg, ${T.accent}, #6366F1)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 4px 24px rgba(129,140,248,0.3)`,
                        animation: 'fabPulse 2.5s ease-out infinite',
                        transition: 'all 0.2s', position: 'relative'
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {/* Notification dot */}
                        <span style={{
                            position: 'absolute', top: -2, right: -2, width: 10, height: 10,
                            borderRadius: '50%', background: T.green, border: `2px solid ${T.bg}`
                        }} />
                        <MessageSquare size={22} color="white" />
                    </button>
                )}
            </div>
        </>
    );
}