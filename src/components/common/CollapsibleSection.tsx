import { useState, useEffect, ReactNode } from 'react';

interface CollapsibleSectionProps {
    /** Título da seção */
    title: string;
    /** Ícone Material Symbols (ex: 'photo_library') */
    icon?: string;
    /** Badge/contador opcional ao lado do título */
    badge?: ReactNode;
    /** Estado inicial de expansão */
    defaultExpanded?: boolean;
    /** Força colapso automático quando true */
    autoCollapse?: boolean;
    /** Chave para persistir estado no localStorage */
    persistKey?: string;
    /** Indica visualmente se há algo a ser destacado */
    highlight?: boolean;
    /** Children do componente */
    children: ReactNode;
    /** Classe CSS adicional para o card */
    className?: string;
    /** Ações no header (botões, links) */
    headerActions?: ReactNode;
}

export const CollapsibleSection = ({
    title,
    icon,
    badge,
    defaultExpanded = true,
    autoCollapse = false,
    persistKey,
    highlight = false,
    children,
    className = '',
    headerActions,
}: CollapsibleSectionProps) => {
    // Carregar estado persistido ou usar default
    const getInitialState = (): boolean => {
        if (autoCollapse) return false;
        if (persistKey) {
            const saved = localStorage.getItem(`collapse_${persistKey}`);
            if (saved !== null) return saved === 'true';
        }
        return defaultExpanded;
    };

    const [expanded, setExpanded] = useState(getInitialState);

    // Efeito para auto-collapse quando a prop mudar
    useEffect(() => {
        if (autoCollapse && expanded) {
            setExpanded(false);
        }
    }, [autoCollapse]);

    // Persistir estado quando mudar manualmente
    const handleToggle = () => {
        const newState = !expanded;
        setExpanded(newState);
        if (persistKey) {
            localStorage.setItem(`collapse_${persistKey}`, String(newState));
        }
    };

    return (
        <div
            className={`card overflow-hidden transition-all duration-200 ${highlight ? 'ring-2 ring-primary/30' : ''
                } ${className}`}
        >
            {/* Header Clicável */}
            <button
                type="button"
                onClick={handleToggle}
                className="w-full p-4 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    {icon && (
                        <span className="material-symbols-outlined text-lg text-primary shrink-0">
                            {icon}
                        </span>
                    )}
                    <span className="font-semibold text-text-light dark:text-text-dark truncate">
                        {title}
                    </span>
                    {badge && (
                        <span className="shrink-0">{badge}</span>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Header Actions (ex: botão Adicionar) - só mostra quando expandido */}
                    {expanded && headerActions && (
                        <div onClick={(e) => e.stopPropagation()}>
                            {headerActions}
                        </div>
                    )}

                    {/* Ícone de Expand/Collapse */}
                    <span
                        className={`material-symbols-outlined text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''
                            }`}
                    >
                        expand_more
                    </span>
                </div>
            </button>

            {/* Conteúdo Colapsável */}
            <div
                className={`transition-all duration-200 ease-in-out ${expanded
                        ? 'max-h-[2000px] opacity-100'
                        : 'max-h-0 opacity-0 overflow-hidden'
                    }`}
            >
                <div className="px-4 pb-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default CollapsibleSection;
