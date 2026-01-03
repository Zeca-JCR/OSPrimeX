import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const OSContext = createContext({});

export const OSProvider = ({ children }) => {
    const [windows, setWindows] = useState([]);
    const [activeWindowId, setActiveWindowId] = useState(null);
    const navigate = useNavigate();

    // Abrir ou focar uma OS
    const openOS = useCallback((osId) => {
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
    const minimizeOS = useCallback((osId) => {
        setWindows(prev => prev.map(w =>
            w.id === osId ? { ...w, minimized: true } : w
        ));
        if (activeWindowId === osId) {
            setActiveWindowId(null);
        }
    }, [activeWindowId]);

    // Fechar OS
    const closeOS = useCallback((osId) => {
        setWindows(prev => prev.filter(w => w.id !== osId));
        if (activeWindowId === osId) {
            setActiveWindowId(null);
        }
    }, [activeWindowId]);

    // Focar Janela (trazer para frente)
    const focusOS = useCallback((osId) => {
        setActiveWindowId(osId);
        setWindows(prev => prev.map(w =>
            w.id === osId ? { ...w, minimized: false } : w
        ));
    }, []);

    // Atualizar dados da Janela (Título, Número, etc)
    const updateWindow = useCallback((osId, data) => {
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
