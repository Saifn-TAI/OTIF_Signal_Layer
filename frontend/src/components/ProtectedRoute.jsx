import React from 'react';
import { Navigate } from 'react-router-dom';

const ROLE_LEVELS = { user: 1, dev: 2, admin: 3 };

export default function ProtectedRoute({ children, minRole = 'user' }) {
    const auth = JSON.parse(localStorage.getItem('auth') || 'null');
    if (!auth) return <Navigate to="/login" replace />;
    const userLevel = ROLE_LEVELS[auth.role] || 0;
    const requiredLevel = ROLE_LEVELS[minRole] || 0;
    if (userLevel < requiredLevel) return <Navigate to="/" replace />;
    return children;
}
