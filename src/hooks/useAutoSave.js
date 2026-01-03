import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para auto-save (rascunho) em LocalStorage
 * @param {string} key - Chave única do rascunho (ex: 'draft_os_10')
 * @param {any} data - Dados a serem salvos
 * @param {number} delay - Delay em ms para o debounce (padrão 2000ms)
 * @param {boolean} shouldSave - Condição para salvar (ex: isDirty)
 */
export const useAutoSave = (key, data, delay = 2000, shouldSave = true) => {
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [draftFound, setDraftFound] = useState(false);

    // Detectar rascunho existente ao montar
    useEffect(() => {
        if (!key) return;
        const saved = localStorage.getItem(key);
        if (saved) {
            setDraftFound(true);
        }
    }, [key]);

    // Função de carregar rascunho
    const loadDraft = useCallback(() => {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
    }, [key]);

    // Função de limpar rascunho
    const clearDraft = useCallback(() => {
        localStorage.removeItem(key);
        setDraftFound(false);
        setLastSaved(null);
    }, [key]);

    // Debounce Save
    useEffect(() => {
        if (!key || !shouldSave || !data) return;

        const handler = setTimeout(() => {
            setIsSaving(true);
            try {
                // Adiciona timestamp
                const dataToSave = {
                    ...data,
                    _savedAt: new Date().toISOString()
                };
                localStorage.setItem(key, JSON.stringify(dataToSave));
                setLastSaved(new Date());
                setIsSaving(false);
                setDraftFound(true);
            } catch (error) {
                console.error("Erro ao salvar rascunho:", error);
                setIsSaving(false);
            }
        }, delay);

        return () => clearTimeout(handler);
    }, [key, data, delay, shouldSave]);

    return {
        draftFound,
        lastSaved,
        isSaving,
        loadDraft,
        clearDraft
    };
};
