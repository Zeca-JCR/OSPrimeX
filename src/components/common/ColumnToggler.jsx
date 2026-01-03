import { useState, useRef, useEffect } from 'react';

const ColumnToggler = ({ columns, visibleColumns, onToggle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn-secondary p-2 text-text-secondary-light dark:text-text-secondary-dark hover:text-primary transition-colors"
                title="Personalizar Colunas"
            >
                <span className="material-symbols-outlined text-xl">view_column</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg border border-primary/20 z-50 animate-slideUp overflow-hidden">
                    <div className="p-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-gray-50 dark:bg-gray-800/50">
                        <span className="text-sm font-semibold text-text-light dark:text-text-dark">
                            Mostrar Colunas
                        </span>
                    </div>
                    <div className="p-2 max-h-64 overflow-y-auto">
                        {columns.map((col) => (
                            <label
                                key={col.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark cursor-pointer group"
                            >
                                <div className={`
                                    w-5 h-5 rounded border flex items-center justify-center transition-colors
                                    ${visibleColumns.includes(col.id)
                                        ? 'bg-primary border-primary text-white'
                                        : 'bg-transparent border-gray-400 group-hover:border-primary'
                                    }
                                `}>
                                    {visibleColumns.includes(col.id) && (
                                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                                    )}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={visibleColumns.includes(col.id)}
                                    onChange={() => onToggle(col.id)}
                                />
                                <span className={`text-sm ${visibleColumns.includes(col.id) ? 'text-text-light dark:text-text-dark font-medium' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                                    {col.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColumnToggler;
