import React, { createContext, useContext, useState, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════════
   DARK TOKENS (Premium Obsidian)
   ═══════════════════════════════════════════════════════════════ */
const dark = {
    mode: 'dark',
    bg: '#09090B',
    surface: '#111113',
    surfaceHover: '#1C1C1F',
    elevated: '#18181B',
    glass: 'rgba(17, 17, 19, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.06)',
    sidebarBg: '#0C0E14',
    sidebarHover: '#161A24',
    sidebarActive: '#1A2030',
    accent: '#006B8C',
    accentSecondary: '#818CF8',
    accentSoft: 'rgba(0, 107, 140, 0.12)',
    accentGlow: '0 0 24px rgba(0, 107, 140, 0.15)',
    text: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    red: '#F87171', redBg: 'rgba(248, 113, 113, 0.12)',
    yellow: '#FBBF24', yellowBg: 'rgba(251, 191, 36, 0.12)',
    green: '#34D399', greenBg: 'rgba(52, 211, 153, 0.12)',
    radius: '14px', radiusSm: '8px',
    shadow: '0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25)',
    shadowLg: '0 8px 32px rgba(0,0,0,0.5)',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
    inputBg: '#18181B',
    inputBorder: 'rgba(255,255,255,0.08)',
    divider: 'rgba(255,255,255,0.07)',
    chatBubbleUser: 'rgba(0, 107, 140, 0.15)',
    chatBubbleAi: 'rgba(255,255,255,0.04)',
};

/* ═══════════════════════════════════════════════════════════════
   LIGHT TOKENS (Premium Frosted)
   ═══════════════════════════════════════════════════════════════ */
const light = {
    mode: 'light',
    bg: '#F8F9FB',
    surface: '#FFFFFF',
    surfaceHover: '#F1F2F6',
    elevated: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(0, 0, 0, 0.06)',
    sidebarBg: '#F0F4F8',
    sidebarHover: '#E2E8F0',
    sidebarActive: '#D6E4F0',
    accent: '#006B8C',
    accentSecondary: '#6366F1',
    accentSoft: 'rgba(0, 107, 140, 0.08)',
    accentGlow: '0 0 24px rgba(0, 107, 140, 0.12)',
    text: '#18181B',
    textSecondary: '#52525B',
    textMuted: '#A1A1AA',
    red: '#DC2626', redBg: 'rgba(220, 38, 38, 0.08)',
    yellow: '#D97706', yellowBg: 'rgba(217, 119, 6, 0.08)',
    green: '#059669', greenBg: 'rgba(5, 150, 105, 0.08)',
    radius: '14px', radiusSm: '8px',
    shadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
    shadowLg: '0 8px 32px rgba(0,0,0,0.06)',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
    inputBg: '#F1F2F6',
    inputBorder: 'rgba(0,0,0,0.08)',
    divider: 'rgba(0,0,0,0.06)',
    chatBubbleUser: 'rgba(0, 107, 140, 0.1)',
    chatBubbleAi: '#F1F2F6',
};

/* ═══════════════════════════════════════════════════════════════
   THEME CONTEXT
   ═══════════════════════════════════════════════════════════════ */
const ThemeContext = createContext({
    T: dark,
    isDark: true,
    toggleTheme: () => { },
});

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : true;
    });

    const toggleTheme = () => setIsDark(prev => !prev);
    const T = isDark ? dark : light;

    useEffect(() => {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        document.body.style.background = T.bg;
        document.body.style.color = T.text;
        document.body.style.transition = 'background 0.3s, color 0.3s';
    }, [isDark, T]);

    return (
        <ThemeContext.Provider value={{ T, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

export default ThemeContext;
