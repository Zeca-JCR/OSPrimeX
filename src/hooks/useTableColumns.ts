import { useState, useEffect } from 'react';

/**
 * Hook para gerenciar estado de colunas visíveis em tabelas
 * @param key Chave única para persistência no localStorage (ex: 'clientes_list_v1')
 * @param defaultVisibleColumns IDs das colunas visíveis por padrão
 */

export interface UseTableColumnsReturn {
    visibleColumns: string[];
    toggleColumn: (columnId: string) => void;
    isVisible: (columnId: string) => boolean;
}

const useTableColumns = (
    key: string,
    defaultVisibleColumns: string[]
): UseTableColumnsReturn => {
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(`osprimex_cols_${key}`);
            return saved ? JSON.parse(saved) : defaultVisibleColumns;
        } catch (error) {
            console.error('Erro ao carregar colunas da tabela:', error);
            return defaultVisibleColumns;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(`osprimex_cols_${key}`, JSON.stringify(visibleColumns));
        } catch (error) {
            console.error('Erro ao salvar colunas da tabela:', error);
        }
    }, [key, visibleColumns]);

    const toggleColumn = (columnId: string): void => {
        setVisibleColumns(prev => {
            if (prev.includes(columnId)) {
                // Remove, mas impede que fique sem nenhuma coluna (opcional, mas boa prática)
                if (prev.length <= 1) return prev;
                return prev.filter(id => id !== columnId);
            } else {
                return [...prev, columnId];
            }
        });
    };

    const isVisible = (columnId: string): boolean => visibleColumns.includes(columnId);

    return { visibleColumns, toggleColumn, isVisible };
};

export default useTableColumns;
