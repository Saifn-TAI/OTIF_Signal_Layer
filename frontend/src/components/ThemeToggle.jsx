import React, { useState } from 'react';
import { useTheme } from '../theme';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
    const { isDark, toggleTheme, T } = useTheme();
    const [hovered, setHovered] = useState(false);

    return (
        <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 32, height: 32, borderRadius: 8,
                border: `1px solid ${hovered ? T.accent : T.divider}`,
                background: hovered ? T.accentSoft : T.inputBg,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: hovered ? T.accent : T.textSecondary,
                transition: T.transition, flexShrink: 0,
            }}
        >
            {isDark ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
        </button>
    );
}
