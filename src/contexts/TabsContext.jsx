import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const TabsContext = createContext({});

export const TabsProvider = ({ children }) => {
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [saveHandlers, setSaveHandlers] = useState({}); // tabId -> saveFunction
    const [limitMessage, setLimitMessage] = useState(null); // Mensagem de limite de abas

    // Proteção: Alerta ao fechar aba do navegador se houver alterações não salvas
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            const hasDirtyTabs = tabs.some(t => t.isDirty);
            if (hasDirtyTabs) {
                e.preventDefault();
                e.returnValue = ''; // Necessário para Chrome/Edge
                return ''; // Necessário para alguns navegadores antigos
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [tabs]);

    // Abrir ou focar uma aba
    const openTab = useCallback((tab) => {
        setTabs(prev => {
            const exists = prev.find(t => t.id === tab.id);
            if (exists) {
                // Se já existe, atualiza os dados e foca nela
                setActiveTabId(tab.id);
                return prev.map(t =>
                    t.id === tab.id
                        ? { ...t, ...tab, data: { ...t.data, ...tab.data } }
                        : t
                );
            }
            // Limite de segurança: máx 8 abas
            if (prev.length >= 8) {
                setLimitMessage("Limite de 8 abas atingido. Feche algumas abas para abrir novas.");
                // Limpa a mensagem após 5 segundos
                setTimeout(() => setLimitMessage(null), 5000);
                return prev;
            }
            // Adiciona nova aba
            setActiveTabId(tab.id);
            return [...prev, {
                ...tab,
                isDirty: false,
                openedAt: new Date().toISOString()
            }];
        });
    }, []);

    // Fechar aba
    const closeTab = useCallback((tabId) => {
        setTabs(prev => {
            // Encontra o índice da aba sendo fechada
            const closingIndex = prev.findIndex(t => t.id === tabId);
            const newTabs = prev.filter(t => t.id !== tabId);

            // Se fechou a aba ativa, foca na aba anterior (à esquerda)
            if (activeTabId === tabId && newTabs.length > 0) {
                // Se era a primeira aba, foca na próxima (agora primeira)
                // Senão, foca na anterior
                const newIndex = closingIndex > 0 ? closingIndex - 1 : 0;
                setActiveTabId(newTabs[newIndex]?.id || null);
            } else if (newTabs.length === 0) {
                setActiveTabId(null);
            }
            return newTabs;
        });
    }, [activeTabId]);

    // Focar em uma aba
    const focusTab = useCallback((tabId) => {
        setActiveTabId(tabId);
    }, []);

    // Atualizar dados de uma aba (título, isDirty, etc)
    const updateTab = useCallback((tabId, data) => {
        setTabs(prev => prev.map(t =>
            t.id === tabId ? { ...t, ...data } : t
        ));
    }, []);

    // Verificar se aba tem alterações não salvas
    const isTabDirty = useCallback((tabId) => {
        const tab = tabs.find(t => t.id === tabId);
        return tab?.isDirty || false;
    }, [tabs]);

    // Obter aba ativa
    const getActiveTab = useCallback(() => {
        return tabs.find(t => t.id === activeTabId) || null;
    }, [tabs, activeTabId]);

    // Limpar aba ativa (para permitir navegação pelo menu)
    const clearActiveTab = useCallback(() => {
        setActiveTabId(null);
    }, []);

    // Registrar função de salvar de uma aba
    const registerSaveHandler = useCallback((tabId, saveFunction) => {
        setSaveHandlers(prev => ({ ...prev, [tabId]: saveFunction }));
    }, []);

    // Remover função de salvar ao fechar aba
    const unregisterSaveHandler = useCallback((tabId) => {
        setSaveHandlers(prev => {
            const { [tabId]: _, ...rest } = prev;
            return rest;
        });
    }, []);

    // Obter função de salvar de uma aba
    const getSaveHandler = useCallback((tabId) => {
        return saveHandlers[tabId] || null;
    }, [saveHandlers]);

    return (
        <TabsContext.Provider value={{
            tabs,
            activeTabId,
            openTab,
            closeTab,
            focusTab,
            updateTab,
            isTabDirty,
            getActiveTab,
            clearActiveTab,
            registerSaveHandler,
            unregisterSaveHandler,
            getSaveHandler,
            limitMessage
        }}>
            {children}

            {/* Toast de Limite de Abas */}
            {limitMessage && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slideDown">
                    <div className="bg-amber-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
                        <span className="material-symbols-outlined">warning</span>
                        <span className="font-medium">{limitMessage}</span>
                        <button
                            onClick={() => setLimitMessage(null)}
                            className="ml-2 hover:bg-white/20 rounded-full p-1"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                </div>
            )}
        </TabsContext.Provider>
    );
};

export const useTabs = () => useContext(TabsContext);
