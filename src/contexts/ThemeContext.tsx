import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ============================================
// Tipos
// ============================================

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    isDark: boolean;
    theme: ThemeMode;
    toggleTheme: () => void;
    setTheme: (theme: ThemeMode) => void;
}

interface ThemeProviderProps {
    children: ReactNode;
}

// ============================================
// Context
// ============================================

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme deve ser usado dentro de ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [isDark, setIsDark] = useState(() => {
        // Verifica preferência salva ou do sistema
        const saved = localStorage.getItem('osprimex_theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('osprimex_theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const toggleTheme = useCallback(() => {
        setIsDark(prev => !prev);
    }, []);

    const setTheme = useCallback((theme: ThemeMode) => {
        setIsDark(theme === 'dark');
    }, []);

    const value: ThemeContextType = {
        isDark,
        theme: isDark ? 'dark' : 'light',
        toggleTheme,
        setTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;
