import React from 'react';
import { useTheme } from '../theme';
import { PAGE_ACCENTS } from './PageHeader';

/* ═══════════════════════════════════════════════════════════════
   PAGE WRAPPER — Gives each page a unique visual identity
   
   Each page group gets:
   - A distinct gradient hero banner at the top
   - Different card styles (rounded + shadow variations)
   - Background pattern/texture
   ═══════════════════════════════════════════════════════════════ */

export default function PageWrapper({ route, children }) {
    const { T, isDark } = useTheme();
    const accent = PAGE_ACCENTS[route]?.color || T.accent;

    // Per-group visual styles
    const VISUAL_CONFIG = {
        // Operations — clean, professional, light gradient
        '/dashboard': {
            heroBg: isDark
                ? `linear-gradient(135deg, ${accent}08 0%, transparent 50%)`
                : `linear-gradient(135deg, ${accent}06 0%, transparent 40%)`,
            heroPattern: 'radial-gradient(circle at 90% 10%, ' + accent + '08 0%, transparent 40%)',
            cardRadius: 16,
            cardBorderStyle: `1px solid ${T.divider}`,
        },
        '/orders': {
            heroBg: isDark
                ? `linear-gradient(160deg, ${accent}0A 0%, transparent 35%)`
                : `linear-gradient(160deg, ${accent}08 0%, transparent 30%)`,
            heroPattern: 'none',
            cardRadius: 14,
            cardBorderStyle: `1px solid ${T.divider}`,
        },
        '/plants': {
            heroBg: isDark
                ? `linear-gradient(180deg, ${accent}0A 0%, transparent 30%)`
                : `linear-gradient(180deg, ${accent}06 0%, transparent 25%)`,
            heroPattern: 'none',
            cardRadius: 16,
            cardBorderStyle: `1px solid ${accent}18`,
        },

        // Risk & Analytics — bold, darker, stronger presence
        '/forecast': {
            heroBg: isDark
                ? `linear-gradient(135deg, ${accent}12 0%, #18181B 60%)`
                : `linear-gradient(135deg, ${accent}0C 0%, transparent 50%)`,
            heroPattern: isDark
                ? `radial-gradient(circle at 100% 0%, ${accent}15 0%, transparent 50%)`
                : `radial-gradient(circle at 100% 0%, ${accent}08 0%, transparent 50%)`,
            cardRadius: 18,
            cardBorderStyle: isDark ? `1px solid ${accent}20` : `1px solid ${T.divider}`,
        },
        '/pipeline': {
            heroBg: isDark
                ? `linear-gradient(135deg, ${accent}10 0%, #18181B 60%)`
                : `linear-gradient(135deg, ${accent}0A 0%, transparent 45%)`,
            heroPattern: isDark
                ? `radial-gradient(circle at 10% 80%, ${accent}10 0%, transparent 40%)`
                : 'none',
            cardRadius: 18,
            cardBorderStyle: isDark ? `1px solid ${accent}20` : `1px solid ${T.divider}`,
        },
        '/ml': {
            heroBg: isDark
                ? `linear-gradient(135deg, ${accent}10 0%, #18181B 55%)`
                : `linear-gradient(135deg, ${accent}08 0%, transparent 45%)`,
            heroPattern: isDark
                ? `radial-gradient(circle at 80% 20%, ${accent}12 0%, transparent 45%)`
                : `radial-gradient(circle at 80% 20%, ${accent}06 0%, transparent 45%)`,
            cardRadius: 16,
            cardBorderStyle: isDark ? `1px solid ${accent}20` : `1px solid ${T.divider}`,
        },

        // System — minimal, utility-focused
        '/reports': {
            heroBg: 'none',
            heroPattern: 'none',
            cardRadius: 12,
            cardBorderStyle: `1px solid ${T.divider}`,
        },
        '/settings': {
            heroBg: 'none',
            heroPattern: 'none',
            cardRadius: 12,
            cardBorderStyle: `1px solid ${T.divider}`,
        },
    };

    const config = VISUAL_CONFIG[route] || VISUAL_CONFIG['/reports'];

    return (
        <div style={{
            position: 'relative',
            minHeight: '100%',
        }}>
            {/* Gradient hero background */}
            {config.heroBg !== 'none' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 300,
                    background: config.heroBg,
                    pointerEvents: 'none', zIndex: 0,
                }} />
            )}
            {config.heroPattern !== 'none' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 300,
                    background: config.heroPattern,
                    pointerEvents: 'none', zIndex: 0,
                }} />
            )}

            {/* Inject per-page card overrides */}
            <style>{`
                .page-${route.replace('/', '') || 'home'} .card,
                .page-${route.replace('/', '') || 'home'} .page-card {
                    border-radius: ${config.cardRadius}px !important;
                    border: ${config.cardBorderStyle} !important;
                }
            `}</style>

            <div
                className={`page-${route.replace('/', '') || 'home'}`}
                style={{ position: 'relative', zIndex: 1 }}
            >
                {children}
            </div>
        </div>
    );
}
