import { useState, type MouseEvent } from 'react';
import { useTabs } from '../../contexts/TabsContext';
import { toTitleCase } from '../../lib/utils';
import UnsavedChangesModal from '../common/UnsavedChangesModal';

type TabType = 'os' | 'cliente' | 'veiculo' | 'produto' | 'fornecedor' | 'colaborador' | 'usuario' | 'configuracoes' | 'relatorios' | 'agenda' | string;

const TabBar = () => {
    const { tabs, activeTabId, focusTab, closeTab, isTabDirty, getSaveHandler } = useTabs();
    const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    if (tabs.length === 0) return null;

    const getTabIcon = (type: TabType): string => {
        switch (type) {
            case 'os': return 'assignment';
            case 'cliente': return 'person';
            case 'veiculo': return 'directions_car';
            case 'produto': return 'inventory_2';
            case 'fornecedor': return 'local_shipping';
            case 'colaborador': return 'badge';
            case 'usuario': return 'manage_accounts';
            case 'configuracoes': return 'settings';
            case 'relatorios': return 'assessment';
            case 'agenda': return 'calendar_month';
            default: return 'description';
        }
    };

    const formatTabTitle = (title: string = '') => {
        // Preserva siglas e formatos especÃ­ficos
        if (title.startsWith('OS #')) return title;
        if (['CRM', 'XML', 'CNPJ', 'CPF'].includes(title)) return title;

        return toTitleCase(title);
    };

    const handleCloseTab = (e: MouseEvent<HTMLSpanElement>, tabId: string) => {
        e.stopPropagation();
        if (isTabDirty(tabId)) {
            focusTab(tabId);
            setPendingCloseTabId(tabId);
        } else {
            closeTab(tabId);
        }
    };

    const handleDiscardAndClose = () => {
        if (pendingCloseTabId) {
            closeTab(pendingCloseTabId);
            setPendingCloseTabId(null);
        }
    };

    const handleSaveAndClose = async () => {
        if (!pendingCloseTabId) return;

        const saveHandler = getSaveHandler(pendingCloseTabId);
        if (saveHandler) {
            setIsSaving(true);
            try {
                await saveHandler();
                closeTab(pendingCloseTabId);
                setPendingCloseTabId(null);
            } catch (error) {
                console.error('Erro ao salvar:', error);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleCancelClose = () => {
        setPendingCloseTabId(null);
    };

    const hasSaveHandler = pendingCloseTabId ? !!getSaveHandler(pendingCloseTabId) : false;

    return (
        <>
            <div className="flex-none bg-primary/5 dark:bg-primary/10 border-b border-primary/20 dark:border-primary/30 px-2">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1.5">
                    {/* Contador de abas */}
                    <div className="flex items-center gap-1.5 px-2 py-1 mr-1 rounded bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold shrink-0">
                        <span className="material-symbols-outlined text-sm">tab</span>
                        <span>{tabs.length}</span>
                    </div>

                    {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        const isDirty = tab.isDirty;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => focusTab(tab.id)}
                                className={`
                                    group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                                    transition-all duration-200 whitespace-nowrap min-w-0 max-w-[200px]
                                    ${isActive
                                        ? 'bg-white dark:bg-gray-800 text-primary shadow-sm border border-primary/20'
                                        : 'bg-white/40 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60 text-text-secondary-light dark:text-text-secondary-dark hover:bg-white/70 dark:hover:bg-gray-800/70 hover:border-gray-300 dark:hover:border-gray-600'
                                    }
                                `}
                            >
                                {/* Ícone do tipo */}
                                <span className={`material-symbols-outlined text-lg ${isActive ? 'text-primary' : ''}`}>
                                    {getTabIcon(tab.type)}
                                </span>

                                {/* Título */}
                                <span className="truncate">
                                    {formatTabTitle(tab.title)}
                                </span>

                                {/* Indicador de alterações não salvas */}
                                {isDirty && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Alterações não salvas" />
                                )}

                                {/* Botão Fechar */}
                                <span
                                    onClick={(e) => handleCloseTab(e, tab.id)}
                                    className={`
                                        material-symbols-outlined text-base p-0.5 rounded
                                        opacity-0 group-hover:opacity-100 transition-opacity
                                        hover:bg-gray-200 dark:hover:bg-gray-700
                                        ${isActive ? 'opacity-100' : ''}
                                    `}
                                    title="Fechar aba"
                                >
                                    close
                                </span>

                                {/* Indicador de aba ativa */}
                                {isActive && (
                                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Modal de Alterações Não Salvas */}
            <UnsavedChangesModal
                isOpen={!!pendingCloseTabId}
                onSaveAndClose={hasSaveHandler ? handleSaveAndClose : undefined}
                onDiscardAndClose={handleDiscardAndClose}
                onCancel={handleCancelClose}
                isSaving={isSaving}
            />
        </>
    );
};

export default TabBar;
