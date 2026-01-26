import { useState, useRef, type MouseEvent, type DragEvent } from 'react';
import { useTabs } from '../../contexts/TabsContext';
import { toTitleCase } from '../../lib/utils';
import UnsavedChangesModal from '../common/UnsavedChangesModal';

type TabType = 'os' | 'cliente' | 'veiculo' | 'produto' | 'fornecedor' | 'colaborador' | 'usuario' | 'configuracoes' | 'relatorios' | 'agenda' | string;

const TabBar = () => {
    const { tabs, activeTabId, focusTab, closeTab, isTabDirty, getSaveHandler, reorderTabs } = useTabs();
    const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownButtonRef = useRef<HTMLButtonElement>(null);

    // Estado para drag & drop de abas
    const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
    const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

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

    // Handlers de drag & drop para reordenação de abas
    const handleTabDragStart = (e: DragEvent<HTMLButtonElement>, tabId: string) => {
        setDraggingTabId(tabId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tabId);
        // Adiciona classe para feedback visual após um pequeno delay
        setTimeout(() => {
            (e.target as HTMLElement).classList.add('opacity-50');
        }, 0);
    };

    const handleTabDragOver = (e: DragEvent<HTMLButtonElement>, tabId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (tabId !== draggingTabId) {
            setDragOverTabId(tabId);
        }
    };

    const handleTabDragLeave = () => {
        setDragOverTabId(null);
    };

    const handleTabDrop = (e: DragEvent<HTMLButtonElement>, targetTabId: string) => {
        e.preventDefault();
        setDragOverTabId(null);

        // Pegar o ID da aba sendo arrastada do dataTransfer
        const draggedTabId = e.dataTransfer.getData('text/plain');

        if (!draggedTabId || draggedTabId === targetTabId) return;

        const fromIndex = tabs.findIndex(t => t.id === draggedTabId);
        const toIndex = tabs.findIndex(t => t.id === targetTabId);

        if (fromIndex !== -1 && toIndex !== -1) {
            reorderTabs(fromIndex, toIndex);
        }

        setDraggingTabId(null);
    };

    const handleTabDragEnd = (e: DragEvent<HTMLButtonElement>) => {
        (e.target as HTMLElement).classList.remove('opacity-50');
        setDraggingTabId(null);
        setDragOverTabId(null);
    };

    const hasSaveHandler = pendingCloseTabId ? !!getSaveHandler(pendingCloseTabId) : false;

    if (tabs.length === 0) return null;

    return (
        <>
            <div className="flex-none bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t-2 border-t-primary border-b border-gray-200/50 dark:border-gray-800/10 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)] px-2 z-10 relative">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1.5">
                    {/* Área de Abas (cresce para a direita) */}
                    {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        const isDirty = tab.isDirty;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => focusTab(tab.id)}
                                draggable
                                onDragStart={(e) => handleTabDragStart(e, tab.id)}
                                onDragOver={(e) => handleTabDragOver(e, tab.id)}
                                onDragLeave={handleTabDragLeave}
                                onDrop={(e) => handleTabDrop(e, tab.id)}
                                onDragEnd={handleTabDragEnd}
                                className={`
                                    group relative flex items-center gap-2 px-3 py-1.5 rounded-[2px] text-sm font-medium
                                    transition-all duration-200 whitespace-nowrap min-w-0 max-w-[200px] cursor-grab active:cursor-grabbing
                                    animate-slideUp
                                    ${isActive
                                        ? 'bg-white dark:bg-gray-800 text-primary shadow-sm border-t-2 border-t-primary border-x border-b-0 border-gray-200 dark:border-gray-700'
                                        : 'bg-white/40 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60 text-text-secondary-light dark:text-text-secondary-dark hover:bg-white/70 dark:hover:bg-gray-800/70'
                                    }
                                    ${dragOverTabId === tab.id ? 'ring-2 ring-primary ring-offset-1 scale-105' : ''}
                                    ${draggingTabId === tab.id ? 'opacity-50' : ''}
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
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Alterações não salvas" />
                                )}

                                {/* Botão Fechar - Estilo Técnico */}
                                <span
                                    onClick={(e) => handleCloseTab(e, tab.id)}
                                    className={`
                                        material-symbols-outlined text-[16px] p-0.5 rounded-[2px] cursor-default
                                        opacity-0 group-hover:opacity-100 transition-opacity
                                        hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30
                                        ${isActive ? 'opacity-100' : ''}
                                    `}
                                    title="Fechar aba"
                                >
                                    close
                                </span>

                                {/* O indicador inferior foi removido em favor da borda superior técnica */}
                            </button>
                        );
                    })}

                    {/* Espaçador flexível - zona de drop para mover aba para o final */}
                    <div
                        className="flex-1 min-w-12 py-2"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const draggedTabId = e.dataTransfer.getData('text/plain');
                            if (!draggedTabId) return;

                            const fromIndex = tabs.findIndex(t => t.id === draggedTabId);
                            const toIndex = tabs.length - 1;

                            if (fromIndex !== -1 && fromIndex !== toIndex) {
                                reorderTabs(fromIndex, toIndex);
                            }
                            setDraggingTabId(null);
                            setDragOverTabId(null);
                        }}
                    />

                    {/* Controle Fixo (Direita) - também aceita drop para mover aba para o final */}
                    <div
                        className="flex items-center gap-1 shrink-0 ml-auto pl-2 border-l border-primary/20 dark:border-primary/30"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const draggedTabId = e.dataTransfer.getData('text/plain');
                            if (!draggedTabId) return;

                            const fromIndex = tabs.findIndex(t => t.id === draggedTabId);
                            const toIndex = tabs.length - 1;

                            if (fromIndex !== -1 && fromIndex !== toIndex) {
                                reorderTabs(fromIndex, toIndex);
                            }
                            setDraggingTabId(null);
                            setDragOverTabId(null);
                        }}
                    >
                        {/* Contador de abas */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold">
                            <span className="material-symbols-outlined text-sm">tab</span>
                            <span>{tabs.length}</span>
                        </div>

                        {/* Dropdown "Todas as abas" */}
                        <button
                            ref={dropdownButtonRef}
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded bg-white/50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 text-text-secondary-light dark:text-text-secondary-dark hover:bg-white dark:hover:bg-gray-800 text-xs font-medium transition-colors"
                            title="Ver todas as abas"
                        >
                            <span className="material-symbols-outlined text-sm">menu</span>
                            <span className="hidden sm:inline">Abas</span>
                            <span className="material-symbols-outlined text-xs">{showDropdown ? 'expand_less' : 'expand_more'}</span>
                        </button>
                    </div>
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
                            right: dropdownButtonRef.current ? window.innerWidth - dropdownButtonRef.current.getBoundingClientRect().right : 0,
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
