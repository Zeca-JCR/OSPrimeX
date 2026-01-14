import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para auto-save (rascunho) em LocalStorage
 * @param key - Chave única do rascunho (ex: 'draft_os_10')
 * @param data - Dados a serem salvos
 * @param delay - Delay em ms para o debounce (padrão 2000ms)
 * @param shouldSave - Condição para salvar (ex: isDirty)
 */

export interface AutoSaveData<T = unknown> extends Record<string, unknown> {
    _savedAt?: string;
    data?: T;
}

export interface UseAutoSaveReturn<T> {
    draftFound: boolean;
    lastSaved: Date | null;
    isSaving: boolean;
    loadDraft: () => (T & { _savedAt?: string }) | null;
    clearDraft: () => void;
}

export const useAutoSave = <T extends Record<string, unknown>>(
    key: string | null,
    data: T | null,
    delay: number = 2000,
    shouldSave: boolean = true
): UseAutoSaveReturn<T> => {
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
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
    const loadDraft = useCallback((): (T & { _savedAt?: string }) | null => {
        if (!key) return null;
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
    }, [key]);

    // Função de limpar rascunho
    const clearDraft = useCallback(() => {
        if (!key) return;
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
