import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ============================================
// Tipos
// ============================================

interface OSWindow {
    id: string;
    type: string;
    minimized: boolean;
    numero?: number;
    title?: string;
    [key: string]: unknown;
}

interface OSContextType {
    windows: OSWindow[];
    activeWindowId: string | null;
    openOS: (osId: string) => void;
    minimizeOS: (osId: string) => void;
    closeOS: (osId: string) => void;
    focusOS: (osId: string) => void;
    updateWindow: (osId: string, data: Partial<OSWindow>) => void;
}

interface OSProviderProps {
    children: ReactNode;
}

// ============================================
// Context
// ============================================

const OSContext = createContext<OSContextType>({
    windows: [],
    activeWindowId: null,
    openOS: () => { },
    minimizeOS: () => { },
    closeOS: () => { },
    focusOS: () => { },
    updateWindow: () => { },
});

export const OSProvider = ({ children }: OSProviderProps) => {
    const [windows, setWindows] = useState<OSWindow[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

    // Abrir ou focar uma OS
    const openOS = useCallback((osId: string) => {
        setWindows(prev => {
            const exists = prev.find(w => w.id === osId);
            if (exists) {
                // Se já existe, apenas atualiza para não minimizado e traz pro topo
                return prev.map(w =>
                    w.id === osId ? { ...w, minimized: false } : w
                );
            }
            // Se não existe, cria nova janela
            // Limite de segurança: máx 5 janelas para não travar
            if (prev.length >= 5) {
                alert("Muitas janelas abertas. Feche algumas antes de abrir mais.");
                return prev;
            }
            return [...prev, { id: osId, type: 'os', minimized: false }];
        });
        setActiveWindowId(osId);
    }, []);

    // Minimizar OS
    const minimizeOS = useCallback((osId: string) => {
        setWindows(prev => prev.map(w =>
            w.id === osId ? { ...w, minimized: true } : w
        ));
        if (activeWindowId === osId) {
            setActiveWindowId(null);
        }
    }, [activeWindowId]);

    // Fechar OS
    const closeOS = useCallback((osId: string) => {
        setWindows(prev => prev.filter(w => w.id !== osId));
        if (activeWindowId === osId) {
            setActiveWindowId(null);
        }
    }, [activeWindowId]);

    // Focar Janela (trazer para frente)
    const focusOS = useCallback((osId: string) => {
        setActiveWindowId(osId);
        setWindows(prev => prev.map(w =>
            w.id === osId ? { ...w, minimized: false } : w
        ));
    }, []);

    // Atualizar dados da Janela (Título, Número, etc)
    const updateWindow = useCallback((osId: string, data: Partial<OSWindow>) => {
        setWindows(prev => prev.map(w =>
            w.id === osId ? { ...w, ...data } : w
        ));
    }, []);

    return (
        <OSContext.Provider value={{
            windows,
            activeWindowId,
            openOS,
            minimizeOS,
            closeOS,
            focusOS,
            updateWindow
        }}>
            {children}
        </OSContext.Provider>
    );
};

export const useOS = () => useContext(OSContext);

export default OSContext;
