/**
 * OSPrimeX - Tipos para Contextos React
 * 
 * Definições de tipos para os contextos de estado global.
 */

import type { ReactNode } from 'react';
import type {
    Usuario,
    Empresa,
    OrdemServico,
    ConfigEmpresa
} from './models';

// ============================================
// Auth Context
// ============================================

export interface AuthContextType {
    usuario: Usuario | null;
    empresa: Empresa | null;
    loading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isTecnico: boolean;
    isFinanceiro: boolean;
    login: (email: string, senha: string) => Promise<{ usuario: Usuario; empresa: Empresa }>;
    logout: () => void;
    refreshEmpresa: () => Promise<void>;
}

export interface AuthProviderProps {
    children: ReactNode;
}

// ============================================
// Tenant Context
// ============================================

export interface TenantContextType {
    empresa: Empresa | null;
    config: ConfigEmpresa | null;
    loading: boolean;
    updateConfig: (config: Partial<ConfigEmpresa>) => Promise<void>;
    refreshTenant: () => Promise<void>;
}

export interface TenantProviderProps {
    children: ReactNode;
}

// ============================================
// OS Context
// ============================================

export interface OSContextType {
    activeOS: OrdemServico[];
    loading: boolean;
    refreshOS: () => Promise<void>;
    getOSById: (id: string) => OrdemServico | undefined;
}

export interface OSProviderProps {
    children: ReactNode;
}

// ============================================
// Tabs Context
// ============================================

export interface Tab {
    id: string;
    tipo: string;
    label: string;
    props?: Record<string, unknown>;
}

export interface TabsContextType {
    tabs: Tab[];
    activeTabId: string | null;
    abrirTab: (tipo: string, label: string, props?: Record<string, unknown>) => void;
    fecharTab: (id: string) => void;
    ativarTab: (id: string) => void;
    atualizarTab: (id: string, updates: Partial<Tab>) => void;
}

export interface TabsProviderProps {
    children: ReactNode;
}

// ============================================
// Theme Context
// ============================================

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextType {
    theme: ThemeMode;
    toggleTheme: () => void;
    setTheme: (theme: ThemeMode) => void;
}

export interface ThemeProviderProps {
    children: ReactNode;
}

// ============================================
// Toast Context
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

export interface ToastContextType {
    toasts: Toast[];
    showToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

export interface ToastProviderProps {
    children: ReactNode;
}

// ============================================
// Notification Context
// ============================================

export interface Notification {
    id: string;
    tipo: 'os' | 'estoque' | 'financeiro' | 'sistema';
    titulo: string;
    mensagem: string;
    lida: boolean;
    criadoEm: string;
    link?: string;
}

export interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'lida' | 'criadoEm'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

export interface NotificationProviderProps {
    children: ReactNode;
}
