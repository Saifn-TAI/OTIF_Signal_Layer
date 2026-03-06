import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../theme';
import { Send, Bot, User, TrendingUp, AlertTriangle, Factory, BarChart3 } from 'lucide-react';

const API_URL = "http://127.0.0.1:8000/api/chat";

const RECOMMENDATIONS = [
    {
        icon: BarChart3,
        label: "Give me today's executive briefing on production status",
        query: "Provide a daily executive briefing summary of production status.",
    },
    {
        icon: AlertTriangle,
        label: "Show critical orders that are at risk of delay",
        query: "List all RED classified orders with breach scores above 60%.",
    },
    {
        icon: Factory,
        label: "Which plants are currently underperforming?",
        query: "Analyze plant performance and identify the worst performing plants.",
    },
    {
        icon: TrendingUp,
        label: "Forecast OTIF trends for the next quarter",
        query: "Show the OTIF trend over the last 6 months and predict the next quarter.",
    },
];

export default function ChatPage() {
    const { T, isDark } = useTheme();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollToBottom(); }, [messages]);
    useEffect(() => { inputRef.current?.focus(); }, []);

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        // Capture context before adding user message
        const currentHistory = [...messages];

        setMessages(prev => [...prev, { role: 'user', text: text.trim() }]);
        setInput('');
        setLoading(true);
        try {
            const res = await axios.post(API_URL, {
                question: text.trim(),
                history: currentHistory.map(m => ({ role: m.role, text: m.text }))
            });
            const answer = typeof res.data.answer === 'string' ? res.data.answer : JSON.stringify(res.data.answer);
            setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Unable to connect to the backend. Please ensure the server is running.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(input);
    };

    const mdComponents = {
        p: ({ children }) => <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>{children}</p>,
        strong: ({ children }) => <strong style={{ color: T.text, fontWeight: 600 }}>{children}</strong>,
        ul: ({ children }) => <ul style={{ margin: '4px 0 8px', paddingLeft: 20 }}>{children}</ul>,
        li: ({ children }) => <li style={{ marginBottom: 4, lineHeight: 1.6 }}>{children}</li>,
        code: ({ children }) => (
            <code style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                padding: '1px 6px', borderRadius: 4, fontSize: 12,
            }}>{children}</code>
        ),
        h1: ({ children }) => <h1 style={{ fontSize: 16, fontWeight: 700, margin: '12px 0 6px', color: T.text }}>{children}</h1>,
        h2: ({ children }) => <h2 style={{ fontSize: 14, fontWeight: 700, margin: '10px 0 5px', color: T.text }}>{children}</h2>,
        h3: ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 600, margin: '8px 0 4px', color: T.text }}>{children}</h3>,
        table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>{children}</table>
            </div>
        ),
        th: ({ children }) => <th style={{ padding: '6px 10px', borderBottom: `1px solid ${T.divider}`, textAlign: 'left', fontWeight: 600, color: T.text }}>{children}</th>,
        td: ({ children }) => <td style={{ padding: '5px 10px', borderBottom: `1px solid ${T.divider}`, color: T.textSecondary }}>{children}</td>,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {messages.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
                        <div style={{ position: 'relative', marginBottom: 24 }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: 24,
                                background: `linear-gradient(135deg, ${T.accent}, ${T.accentSecondary || T.accent})`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 8px 32px ${T.accent}40`,
                            }}>
                                <Bot size={36} color="#FFFFFF" strokeWidth={1.5} />
                            </div>
                            <span style={{
                                position: 'absolute', inset: -4, borderRadius: 28,
                                border: `2px solid ${T.accent}30`,
                                animation: 'pulseRing 2.5s ease infinite',
                            }} />
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 8, letterSpacing: '-0.5px' }}>
                            Signal Intelligence
                        </div>
                        <div style={{ fontSize: 14, color: T.textMuted, maxWidth: 460, textAlign: 'center', lineHeight: 1.7, marginBottom: 40 }}>
                            Your AI-powered co-pilot for production analytics. Ask about orders, plant performance, OTIF trends, and delivery risks.
                        </div>

                        {/* 2×2 recommendation grid */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
                            maxWidth: 560, width: '100%',
                        }}>
                            {RECOMMENDATIONS.map((rec, i) => {
                                const Icon = rec.icon;
                                return (
                                    <button key={i} onClick={() => sendMessage(rec.query)} disabled={loading} style={{
                                        padding: '16px 18px', borderRadius: 14, textAlign: 'left',
                                        background: T.surface, border: `1px solid ${T.divider}`,
                                        color: T.textSecondary, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                                        lineHeight: 1.5, transition: T.transition,
                                        display: 'flex', alignItems: 'flex-start', gap: 12,
                                        opacity: loading ? 0.5 : 1,
                                    }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = T.accent + '50';
                                            e.currentTarget.style.background = T.surfaceHover;
                                            e.currentTarget.style.color = T.text;
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = T.divider;
                                            e.currentTarget.style.background = T.surface;
                                            e.currentTarget.style.color = T.textSecondary;
                                        }}
                                    >
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                            background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Icon size={16} color={T.accent} strokeWidth={2} />
                                        </div>
                                        <span style={{ paddingTop: 4 }}>{rec.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{
                            display: 'flex', gap: 16,
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                            alignItems: 'flex-start',
                        }}>
                            <div style={{
                                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                                background: msg.role === 'user' ? T.accent : T.surface,
                                border: msg.role === 'assistant' ? `1px solid ${T.divider}` : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: msg.role === 'user' ? T.shadow : 'none',
                            }}>
                                {msg.role === 'user' ? <User size={16} color="#FFFFFF" strokeWidth={2.5} /> : <Bot size={17} color={T.accent} />}
                            </div>
                            <div style={{
                                maxWidth: '80%', padding: '14px 20px', borderRadius: 18,
                                background: msg.role === 'user' ? T.surface : 'transparent',
                                border: msg.role === 'user' ? `1px solid ${T.divider}` : 'none',
                                color: T.text, fontSize: 14, lineHeight: 1.8,
                            }}>
                                {msg.role === 'assistant' ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                        {msg.text}
                                    </ReactMarkdown>
                                ) : msg.text}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            <div style={{
                                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                                background: T.surface, border: `1px solid ${T.divider}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Bot size={17} color={T.accent} />
                            </div>
                            <div style={{
                                padding: '16px 4px',
                                display: 'flex', gap: 6, alignItems: 'center',
                            }}>
                                {[0, 1, 2].map(i => (
                                    <div key={i} style={{
                                        width: 8, height: 8, borderRadius: '50%', background: T.accent,
                                        opacity: 0.6, animation: `bounce 1.2s infinite ${i * 0.15}s`,
                                    }} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div style={{
                background: T.bg, flexShrink: 0,
                padding: '0 24px 24px',
            }}>
                <form onSubmit={handleSubmit} style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    maxWidth: 900, margin: '0 auto', width: '100%',
                    background: T.surface, border: `1px solid ${T.divider}`,
                    borderRadius: 24, padding: '8px 8px 8px 24px',
                    boxShadow: T.shadow, transition: T.transition,
                }}>
                    <input
                        ref={inputRef} type="text" value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Message Signal Intelligence..."
                        disabled={loading}
                        style={{
                            flex: 1, border: 'none', background: 'transparent',
                            color: T.text, fontSize: 14, outline: 'none',
                        }}
                    />
                    <button type="submit" disabled={loading || !input.trim()} style={{
                        width: 40, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
                        background: T.accent, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: (loading || !input.trim()) ? 0.3 : 1, transition: T.transition,
                    }}>
                        <Send size={16} strokeWidth={2.5} style={{ transform: 'translateX(-1px) translateY(1px)' }} />
                    </button>
                </form>
            </div>

            <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
      `}</style>
        </div>
    );
}
