import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme';
import { Eye, EyeOff, LogIn, Zap } from 'lucide-react';

export default function LoginPage() {
    const { T, isDark } = useTheme();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        setTimeout(() => {
            let role = 'user';
            let label = 'Viewer';
            const lowerUser = username.toLowerCase();
            if (lowerUser.includes('admin')) { role = 'admin'; label = 'Administrator'; }
            else if (lowerUser.includes('dev')) { role = 'dev'; label = 'Developer'; }

            localStorage.setItem('auth', JSON.stringify({ user: username, role, label }));
            setLoading(false);
            window.location.href = '/';
        }, 600);
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark
                ? 'linear-gradient(135deg, #0A0A0A 0%, #161616 50%, #0A0A0A 100%)'
                : 'linear-gradient(135deg, #FAFAFA 0%, #EFEFEF 50%, #FAFAFA 100%)',
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute', width: 400, height: 400, borderRadius: '50%',
                background: `radial-gradient(circle, ${T.accent}15, transparent 70%)`,
                top: '-100px', right: '-100px', animation: 'float 8s ease-in-out infinite',
            }} />
            <div style={{
                position: 'absolute', width: 300, height: 300, borderRadius: '50%',
                background: `radial-gradient(circle, ${T.green}10, transparent 70%)`,
                bottom: '-50px', left: '-50px', animation: 'float 10s ease-in-out infinite reverse',
            }} />

            <style>{`
                @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-30px)} }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div style={{
                width: 400, padding: '40px 36px', borderRadius: 24,
                background: isDark ? 'rgba(18,18,18,0.7)' : 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                border: `1px solid ${T.glassBorder}`,
                boxShadow: T.shadowLg, position: 'relative', zIndex: 1,
            }}>
                {/* Logo / Header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
                        background: `linear-gradient(135deg, ${T.surface}, ${T.surfaceHover})`,
                        border: `1px solid ${T.divider}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: T.shadow,
                    }}>
                        <Zap size={26} color={T.text} />
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, margin: 0, letterSpacing: '-0.4px' }}>
                        Signal Intelligence
                    </h1>
                    <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>
                        Sign in to continue
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    {/* Username */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.textSecondary, marginBottom: 8, letterSpacing: '0.2px' }}>
                            Username
                        </label>
                        <input
                            type="text" value={username} onChange={e => setUsername(e.target.value)}
                            required autoFocus
                            style={{
                                width: '100%', padding: '12px 14px', borderRadius: T.radiusSm,
                                background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                                color: T.text, fontSize: 14, outline: 'none', transition: T.transition,
                                boxSizing: 'border-box',
                            }}
                            onFocus={e => e.target.style.borderColor = T.textSecondary}
                            onBlur={e => e.target.style.borderColor = T.inputBorder}
                        />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.textSecondary, marginBottom: 8, letterSpacing: '0.2px' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPw ? 'text' : 'password'} value={password}
                                onChange={e => setPassword(e.target.value)} required
                                style={{
                                    width: '100%', padding: '12px 42px 12px 14px', borderRadius: T.radiusSm,
                                    background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                                    color: T.text, fontSize: 14, outline: 'none', transition: T.transition,
                                    boxSizing: 'border-box',
                                }}
                                onFocus={e => e.target.style.borderColor = T.textSecondary}
                                onBlur={e => e.target.style.borderColor = T.inputBorder}
                            />
                            <button type="button" onClick={() => setShowPw(!showPw)} style={{
                                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                color: T.textMuted, display: 'flex',
                            }}>
                                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            padding: '10px 14px', borderRadius: T.radiusSm, marginBottom: 16,
                            background: T.redBg, color: T.red, fontSize: 13, fontWeight: 500,
                            border: `1px solid ${T.red}33`,
                        }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '12px', borderRadius: T.radiusSm, border: 'none',
                        background: T.text,
                        color: T.bg, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        opacity: loading ? 0.7 : 1, transition: T.transition,
                    }}>
                        {loading ? (
                            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${T.bg}`, borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                        ) : (
                            <><LogIn size={17} /> Sign In</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
