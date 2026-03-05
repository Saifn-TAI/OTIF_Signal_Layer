import React from 'react';
import { useTheme } from '../theme';

/* ═══════════ PER-PAGE ACCENT COLORS ═══════════
   Each page gets its own distinct accent for visual identity.
   Used by PageHeader and can be imported by any page.
*/
export const PAGE_ACCENTS = {
    '/': { color: '#006B8C', gradient: 'linear-gradient(135deg, #006B8C, #005570)', label: 'AI Agent' },
    '/dashboard': { color: '#006B8C', gradient: 'linear-gradient(135deg, #006B8C, #005570)', label: 'Dashboard' },
    '/orders': { color: '#006B8C', gradient: 'linear-gradient(135deg, #006B8C, #005570)', label: 'Orders' },
    '/plants': { color: '#006B8C', gradient: 'linear-gradient(135deg, #006B8C, #005570)', label: 'Plants' },
    '/forecast': { color: '#006B8C', gradient: 'linear-gradient(135deg, #006B8C, #005570)', label: 'Forward Risk' },
    '/pipeline': { color: '#006B8C', gradient: 'linear-gradient(135deg, #006B8C, #005570)', label: 'Pipeline Risk' },
    '/ml': { color: '#006B8C', gradient: 'linear-gradient(135deg, #006B8C, #005570)', label: 'ML Insights' },
    '/reports': { color: '#006B8C', gradient: 'linear-gradient(135deg, #006B8C, #005570)', label: 'Reports' },
    '/settings': { color: '#006B8C', gradient: 'linear-gradient(135deg, #006B8C, #005570)', label: 'Settings' },
};

/* ═══════════ PAGE HEADER COMPONENT ═══════════
   A distinct header for each page with its own accent-colored strip,
   icon, title, and subtitle. Gives each page a unique visual identity.
*/
export default function PageHeader({ icon: Icon, title, subtitle, accent, badge, children }) {
    const { T, isDark } = useTheme();
    const accentColor = accent || T.accent;

    return (
        <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            marginBottom: 28, paddingBottom: 20,
            borderBottom: `1px solid ${T.divider}`,
            position: 'relative',
        }}>
            {/* Accent glow bar */}
            <div style={{
                position: 'absolute', bottom: -1, left: 0, width: 80, height: 3,
                background: accentColor, borderRadius: '3px 3px 0 0',
                boxShadow: `0 0 12px ${accentColor}40`,
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {Icon && (
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: `${accentColor}12`,
                        border: `1px solid ${accentColor}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Icon size={20} color={accentColor} strokeWidth={2} />
                    </div>
                )}
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0, letterSpacing: '-0.5px' }}>
                        {title}
                    </h1>
                    {subtitle && (
                        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>{subtitle}</p>
                    )}
                </div>
                {badge && (
                    <span style={{
                        padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: `${accentColor}15`, color: accentColor,
                        border: `1px solid ${accentColor}25`,
                    }}>
                        {badge}
                    </span>
                )}
            </div>
            {children && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>}
        </div>
    );
}
