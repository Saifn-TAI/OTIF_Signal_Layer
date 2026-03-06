import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../theme';
import { Bot, Send, X, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const API_URL = "http://127.0.0.1:8000/api/chat";

export default function ChatWidget() {
    const { T, isDark } = useTheme();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

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
        p: ({ children }) => <p style={{ margin: '0 0 6px', lineHeight: 1.6 }}>{children}</p>,
        strong: ({ children }) => <strong style={{ color: T.text, fontWeight: 600 }}>{children}</strong>,
        ul: ({ children }) => <ul style={{ margin: '4px 0 6px', paddingLeft: 16 }}>{children}</ul>,
        li: ({ children }) => <li style={{ marginBottom: 4, lineHeight: 1.5 }}>{children}</li>,
        code: ({ children }) => (
            <code style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                padding: '1px 6px', borderRadius: 4, fontSize: 11,
            }}>{children}</code>
        ),
        h1: ({ children }) => <h1 style={{ fontSize: 14, fontWeight: 700, margin: '10px 0 4px', color: T.text }}>{children}</h1>,
        h2: ({ children }) => <h2 style={{ fontSize: 13, fontWeight: 700, margin: '8px 0 4px', color: T.text }}>{children}</h2>,
        h3: ({ children }) => <h3 style={{ fontSize: 12, fontWeight: 600, margin: '6px 0 4px', color: T.text }}>{children}</h3>,
        table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '6px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>{children}</table>
            </div>
        ),
        th: ({ children }) => <th style={{ padding: '4px 8px', borderBottom: `1px solid ${T.divider}`, textAlign: 'left', fontWeight: 600, color: T.text }}>{children}</th>,
        td: ({ children }) => <td style={{ padding: '4px 8px', borderBottom: `1px solid ${T.divider}`, color: T.textSecondary }}>{children}</td>,
    };

    // Hide widget entirely if we are already on the dedicated ChatPage
    if (location.pathname === '/') {
        return null;
    }

    return (
        <div style={{ position: 'fixed', bottom: 20, right: 14, zIndex: 999 }}>
            <style>{`
                .chat-toggle-btn {
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
                }
                .chat-toggle-btn:hover {
                    transform: scale(1.08) translateY(-4px) !important;
                    box-shadow: 0 16px 40px ${T.accent}80 !important;
                    filter: brightness(1.1);
                }
                .chat-toggle-btn:active {
                    transform: scale(0.95) translateY(2px) !important;
                }
                @keyframes chatDrawIn { 
                    0% { opacity: 0; transform: translateX(30px) scale(0.95); transform-origin: bottom right; } 
                    100% { opacity: 1; transform: translateX(0) scale(1); } 
                }
                @keyframes bounceDot { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
                
                /* Custom Scrollbar for Chat */
                .chat-scroll::-webkit-scrollbar { width: 6px; }
                .chat-scroll::-webkit-scrollbar-track { background: transparent; }
                .chat-scroll::-webkit-scrollbar-thumb { background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; border-radius: 10px; }
                .chat-scroll::-webkit-scrollbar-thumb:hover { background: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; }
            `}</style>

            {/* Chat Drawer */}
            {isOpen && (
                <div style={{
                    position: 'absolute', bottom: 20, right: 84,
                    width: 440, height: 720, maxHeight: 'calc(100vh - 140px)',
                    background: isDark ? 'rgba(10, 10, 14, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 28,
                    boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1)' : '0 24px 80px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.8)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', animation: 'chatDrawIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                }}>

                    {/* Header */}
                    <div style={{
                        padding: '18px 24px', borderBottom: `1px solid ${T.divider}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: isDark ? `linear-gradient(135deg, ${T.accent}1A, transparent)` : `linear-gradient(135deg, ${T.accent}12, transparent)`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10,
                                background: `linear-gradient(135deg, ${T.accent}, #005570)`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 4px 12px ${T.accent}40`,
                            }}>
                                <Bot size={18} color="#FFF" />
                            </div>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>TAI Agent</div>
                                <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>Signal Intelligence</div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{
                            width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent',
                            color: T.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: T.transition,
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {messages.length === 0 && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: T.textMuted, fontSize: 14, animation: 'chatDrawIn 0.6s ease-out' }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: 20,
                                    background: `linear-gradient(135deg, ${T.accent}20, transparent)`,
                                    border: `1px solid ${T.accent}40`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                                    boxShadow: `0 8px 32px ${T.accent}20`
                                }}>
                                    <Bot size={32} color={T.accent} />
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8, letterSpacing: '-0.5px' }}>Hi there! 👋</div>
                                <div style={{ fontSize: 14, maxWidth: 280, lineHeight: 1.6, color: T.textSecondary }}>I'm the TAI Agent. Ask me about your orders, delays, or plant performance metrics.</div>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} style={{
                                display: 'flex', gap: 10,
                                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                alignItems: 'flex-start',
                            }}>
                                <div style={{
                                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                                    background: msg.role === 'user' ? T.accent : T.surface,
                                    border: msg.role === 'assistant' ? `1px solid ${T.divider}` : 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {msg.role === 'user' ? <User size={14} color="#FFF" strokeWidth={2} /> : <Bot size={14} color={T.accent} />}
                                </div>
                                <div style={{
                                    maxWidth: '85%', padding: '10px 14px', borderRadius: 14,
                                    background: msg.role === 'user' ? T.surface : 'transparent',
                                    border: msg.role === 'user' ? `1px solid ${T.divider}` : 'none',
                                    color: T.text, fontSize: 13, lineHeight: 1.6,
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
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <div style={{
                                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                                    background: T.surface, border: `1px solid ${T.divider}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Bot size={14} color={T.accent} />
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, opacity: 0.6, animation: `bounceDot 1.2s infinite ${i * 0.15}s` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.divider}`, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                        <form onSubmit={handleSubmit} style={{
                            display: 'flex', gap: 10, background: T.surface, border: `1px solid ${T.divider}`,
                            borderRadius: 16, padding: '6px 6px 6px 16px', alignItems: 'center',
                            boxShadow: `inset 0 2px 4px rgba(0,0,0,0.02)`,
                        }}>
                            <input
                                ref={inputRef} type="text" value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Message TAI Agent..." disabled={loading}
                                style={{
                                    flex: 1, border: 'none', background: 'transparent',
                                    color: T.text, fontSize: 14, outline: 'none', width: '100%',
                                }}
                            />
                            <button type="submit" disabled={loading || !input.trim()} style={{
                                width: 36, height: 36, borderRadius: 10, border: 'none', background: T.accent,
                                color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                opacity: loading || !input.trim() ? 0.3 : 1, transition: T.transition,
                                boxShadow: loading || !input.trim() ? 'none' : `0 4px 12px ${T.accent}40`
                            }}>
                                <Send size={16} strokeWidth={2} style={{ transform: 'translateX(-1px) translateY(1px)' }} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button
                className="chat-toggle-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Close AI Chat" : "Open AI Chat"}
                style={{
                    width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg, ${T.accent}, #004c63)`, color: '#FFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isOpen ? 'none' : `0 12px 32px ${T.accent}60`,
                    transform: isOpen ? 'scale(0.85) translateY(10px)' : 'scale(1) translateY(0)',
                    opacity: isOpen ? 0 : 1, pointerEvents: isOpen ? 'none' : 'auto',
                }}
            >
                <Bot size={30} strokeWidth={1.8} />
            </button>
        </div>
    );
}
