import { useState, useRef, type MouseEvent } from 'react';
import { useTabs } from '../../contexts/TabsContext';
import { toTitleCase } from '../../lib/utils';
import UnsavedChangesModal from '../common/UnsavedChangesModal';

type TabType = 'os' | 'cliente' | 'veiculo' | 'produto' | 'fornecedor' | 'colaborador' | 'usuario' | 'configuracoes' | 'relatorios' | 'agenda' | string;

const TabBar = () => {
    const { tabs, activeTabId, focusTab, closeTab, isTabDirty, getSaveHandler } = useTabs();
    const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownButtonRef = useRef<HTMLButtonElement>(null);

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
            case 'crm': return 'loyalty';
            case 'financeiro': return 'payments';
            case 'importar_xml': return 'upload_file';
            case 'estoque_movimentacoes': return 'swap_horiz';
            case 'estoque_reposicao': return 'shopping_cart';
            // Tipos de lista
            case 'list-os': return 'view_kanban';
            case 'list-clientes': return 'people';
            case 'list-veiculos': return 'garage';
            case 'list-produtos': return 'inventory_2';
            case 'list-colaboradores': return 'groups';
            case 'list-usuarios': return 'manage_accounts';
            case 'list-fornecedores': return 'local_shipping';
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
            <div className="flex-none bg-primary/20 dark:bg-primary/25 border-t-2 border-t-primary border-b border-primary/30 dark:border-primary/40 shadow-md px-2">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1.5">
                    {/* Contador de abas */}
                    <div className="flex items-center gap-1.5 px-2 py-1 mr-1 rounded bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold shrink-0">
                        <span className="material-symbols-outlined text-sm">tab</span>
                        <span>{tabs.length}</span>
                    </div>

                    {/* Dropdown "Todas as abas" */}
                    <div className="relative shrink-0">
                        <button
                            ref={dropdownButtonRef}
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-1 px-2 py-1.5 mr-1 rounded bg-white/50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 text-text-secondary-light dark:text-text-secondary-dark hover:bg-white dark:hover:bg-gray-800 text-xs font-medium transition-colors"
                            title="Ver todas as abas"
                        >
                            <span className="material-symbols-outlined text-sm">menu</span>
                            <span className="hidden sm:inline">Abas</span>
                            <span className="material-symbols-outlined text-xs">{showDropdown ? 'expand_less' : 'expand_more'}</span>
                        </button>
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

            {/* Dropdown Menu - Renderizado fora do container com overflow */}
            {showDropdown && (
                <>
                    {/* Overlay para fechar */}
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setShowDropdown(false)}
                    />
                    {/* Dropdown Menu */}
                    <div
                        className="fixed w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[9999] py-1 max-h-80 overflow-y-auto"
                        style={{
                            top: dropdownButtonRef.current ? dropdownButtonRef.current.getBoundingClientRect().bottom + 4 : 0,
                            left: dropdownButtonRef.current ? dropdownButtonRef.current.getBoundingClientRect().left : 0,
                        }}
                    >
                        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <span className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                                {tabs.length} Aba{tabs.length !== 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={() => {
                                    const dirtyTabs = tabs.filter(t => t.isDirty);
                                    if (dirtyTabs.length > 0) {
                                        const confirmClose = window.confirm(
                                            `Você tem ${dirtyTabs.length} aba(s) com alterações não salvas. Deseja fechar todas mesmo assim?`
                                        );
                                        if (!confirmClose) return;
                                    }
                                    tabs.forEach(t => closeTab(t.id));
                                    setShowDropdown(false);
                                }}
                                className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                title="Fechar todas as abas"
                            >
                                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                                <span>Fechar Todas</span>
                                {tabs.some(t => t.isDirty) && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500" title="Há abas com alterações" />
                                )}
                            </button>
                        </div>
                        {tabs.map((tab) => (
                            <div
                                key={tab.id}
                                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer group ${tab.id === activeTabId ? 'bg-primary/5' : ''}`}
                            >
                                <button
                                    onClick={() => {
                                        focusTab(tab.id);
                                        setShowDropdown(false);
                                    }}
                                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                >
                                    <span className={`material-symbols-outlined text-base ${tab.id === activeTabId ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                                        {getTabIcon(tab.type)}
                                    </span>
                                    <span className={`text-sm truncate ${tab.id === activeTabId ? 'text-primary font-medium' : 'text-text-light dark:text-text-dark'}`}>
                                        {formatTabTitle(tab.title)}
                                    </span>
                                    {tab.isDirty && (
                                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                    )}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloseTab(e as unknown as MouseEvent<HTMLSpanElement>, tab.id);
                                        if (tabs.length === 1) setShowDropdown(false);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-text-secondary-light dark:text-text-secondary-dark"
                                    title="Fechar"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
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
