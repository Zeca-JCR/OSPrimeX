/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // White-label: Cores controladas por variáveis CSS
                primary: 'var(--color-primary)',
                'primary-hover': 'var(--color-primary-hover)',
                'primary-light': 'var(--color-primary-light)',
                background: {
                    light: 'var(--color-bg-light)',
                    dark: 'var(--color-bg-dark)',
                },
                surface: {
                    light: 'var(--color-surface-light)',
                    dark: 'var(--color-surface-dark)',
                },
                text: {
                    light: 'var(--color-text-light)',
                    dark: 'var(--color-text-dark)',
                },
                'text-secondary': {
                    light: 'var(--color-text-secondary-light)',
                    dark: 'var(--color-text-secondary-dark)',
                },
                // Status colors
                success: '#22c55e',
                warning: '#f59e0b',
                error: '#ef4444',
                info: '#3b82f6',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                heading: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                'DEFAULT': '0.25rem',
                'lg': '0.5rem',
                'xl': '0.75rem',
                '2xl': '1rem',
                'full': '9999px',
            },
            boxShadow: {
                'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                'primary': '0 4px 14px 0 var(--color-primary-shadow)',
            },
        },
    },
    plugins: [],
}
