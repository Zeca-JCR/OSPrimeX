import { useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../contexts/ThemeContext';
// import storage from '../../lib/storage'; // Unused import
import BuscaGlobal from '../common/BuscaGlobal';
import { useNotification } from '../../contexts/NotificationContext';
import { NovaOSModal } from '../../components/os/NovaOSModal';
import { RestartTourButton } from '../../components/onboarding/OnboardingTour';
import { TabsProvider, useTabs } from '../../contexts/TabsContext';
import { ModalProvider, useModal } from '../../contexts/ModalContext';
import TabBar from '../../components/layout/TabBar';
import TabContent from '../../components/layout/TabContent';
import UserProfileModal from '../../components/users/UserProfileModal';

interface MenuItem {
    path?: string;
    icon?: string;
    label?: string;
    exact?: boolean;
    tour?: string;
    submenu?: MenuItem[];
    hidden?: boolean;
    addon?: string;
    locked?: boolean;
    disabled?: boolean;
    type?: string; // 'divider'
}

const MainLayoutContent = () => {
    const { usuario, empresa, logout } = useAuth(); // isAdmin unused
    const { hasAddon } = useTenant();
    const { isDark, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const { openTab, tabs, activeTabId, clearActiveTab, getActiveTab } = useTabs();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const lastKeyRef = useRef('');

    // Mapeamento de rotas que abrem abas (movido para topo para uso no isActive)
    const tabRoutes: Record<string, { type: string, title: string }> = useMemo(() => ({
        // Páginas que abrem como abas
        '/configuracoes': { type: 'configuracoes', title: 'Configurações' },
        '/relatorios': { type: 'relatorios', title: 'Relatórios' },
        '/agenda': { type: 'agenda', title: 'Agenda' },
        '/crm': { type: 'crm', title: 'CRM' },
        '/estoque/importar': { type: 'importar_xml', title: 'Importar XML' },
        '/estoque/movimentacoes': { type: 'estoque_movimentacoes', title: 'Movimentações' },
        '/estoque/reposicao': { type: 'estoque_reposicao', title: 'Reposição' },
        '/financeiro': { type: 'financeiro', title: 'Financeiro' },
        // Listas que abrem como abas
        '/os': { type: 'list-os', title: 'Ordens de Serviço' },
        '/clientes': { type: 'list-clientes', title: 'Clientes' },
        '/veiculos': { type: 'list-veiculos', title: 'Veículos' },
        '/estoque': { type: 'list-produtos', title: 'Produtos & Serviços' },
        '/colaboradores': { type: 'list-colaboradores', title: 'Colaboradores' },
        '/usuarios': { type: 'list-usuarios', title: 'Usuários' },
        '/fornecedores': { type: 'list-fornecedores', title: 'Fornecedores' },
    }), []);

    const { notificacoes, unreadCount, markAsRead, clearAll } = useNotification();

    const [showNotificacoes, setShowNotificacoes] = useState(false);

    // Contexto Global de Nova OS
    const { openNovaOS, closeNovaOS, novaOSOpen, novaOSData } = useModal(); // loadingNovaOS, setLoadingNovaOS unused


    // Estado para Modal de Perfil
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Submenus expandidos
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

    // User Menu Dropdown
    const [showUserMenu, setShowUserMenu] = useState(false);

    const toggleSubmenu = (path: string) => {
        setExpandedMenus(prev => ({ ...prev, [path]: !prev[path] }));
    };

    // Atalhos de teclado para navegação (G + letra)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignorar se estiver digitando em input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Sistema G + Letra para navegação
            if (lastKeyRef.current === 'g') {
                const routes: Record<string, string> = {
                    'd': '/dashboard',
                    'o': '/os',
                    'c': '/clientes',
                    'v': '/veiculos',
                    'e': '/estoque',
                    'f': '/financeiro',
                    'u': '/usuarios',
                };
                const route = routes[e.key.toLowerCase()];
                if (route) {
                    e.preventDefault();
                    navigate(route);
                }
                lastKeyRef.current = '';
            } else if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
                lastKeyRef.current = 'g';
                // Reset após 1 segundo
                setTimeout(() => { lastKeyRef.current = ''; }, 1000);
            }

            // Atalho Global Ctrl+N para Nova OS
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                abrirNovaOS();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);





    const abrirNovaOS = () => {
        if (!empresa) return;
        openNovaOS();
    };

    const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;

    const menuItems = useMemo(() => [
        { path: '/', icon: 'dashboard', label: 'Dashboard', exact: true, tour: 'dashboard' },
        { path: '/agenda', icon: 'calendar_month', label: 'Agenda' },
        { path: '/os', icon: 'assignment', label: 'Ordens de Serviço', tour: 'os' },
        { path: '/clientes', icon: 'people', label: 'Clientes', tour: 'clientes' },
        { path: '/veiculos', icon: 'directions_car', label: 'Veículos' },
        {
            path: '/estoque-group',
            icon: 'inventory_2',
            label: 'Estoque',
            tour: 'estoque',
            submenu: [
                { path: '/fornecedores', label: 'Fornecedores' },
                {
                    path: '/estoque/importar',
                    label: 'Importar XML',
                    icon: 'upload_file',
                    hidden: !hasAddon('addon_xml_importer')
                },
                { path: '/estoque/movimentacoes', label: 'Movimentações' },
                { path: '/estoque/reposicao', label: 'Pedido de Reposição' },
                { path: '/estoque', label: 'Produtos/Serviços', exact: true }
            ]
        },
        { path: '/financeiro', icon: 'payments', label: 'Financeiro', tour: 'financeiro' },
        {
            path: '/crm',
            icon: 'loyalty',
            label: 'CRM',
            addon: 'addon_crm',
            locked: !hasAddon('addon_crm')
        },
        { path: '/relatorios', icon: 'bar_chart', label: 'Relatórios' },

        { type: 'divider' },

        { path: '/colaboradores', icon: 'badge', label: 'Colaboradores' },
        { path: '/usuarios', icon: 'manage_accounts', label: 'Usuários' },
        { path: '/configuracoes', icon: 'settings', label: 'Configurações' },
        {
            path: '/admin',
            icon: 'admin_panel_settings',
            label: 'Admin SaaS',
            hidden: usuario?.perfil !== 'superadmin'
        },
    ], [hasAddon, usuario?.perfil]); // Dependências do useMemo

    // Efeito para comportamento "Smart Context" do menu (Opção 2)
    useEffect(() => {
        const newExpanded = {};
        let changed = false;

        menuItems.forEach(item => {
            if (item.submenu) {
                // Verifica se este grupo deve estar ativo baseado na URL atual
                const shouldBeExpanded = item.submenu.some(sub =>
                    sub.exact
                        ? location.pathname === sub.path
                        : location.pathname.startsWith(sub.path)
                );

                // Se o estado calculado for diferente do atual, marcamos para atualização
                // Nota: Verificamos se já existe valor definido para não sobrescrever toggle manual desnecessariamente
                // Mas para comportamento "automático" rigoroso, sempre sobrescrevemos.
                if (item.path) {
                    if (expandedMenus[item.path] !== shouldBeExpanded) {
                        newExpanded[item.path] = shouldBeExpanded;
                        changed = true;
                    } else {
                        newExpanded[item.path] = expandedMenus[item.path];
                    }
                }
            }
        });

        if (changed) {
            setExpandedMenus(prev => ({ ...prev, ...newExpanded }));
        }
    }, [location.pathname, menuItems]);

    const isActive = (item: MenuItem) => {
        const activeTab = getActiveTab();

        // Se houver uma aba ativa, apenas o item correspondente à aba (ou seu pai) pode estar ativo
        if (activeTab) {
            // Caso 1: Item de primeira linha é a aba
            if (item.path && tabRoutes[item.path]?.type === activeTab.type) return true;

            // Caso 2: Item tem submenu e a aba está dentro dele
            if (item.submenu) {
                return item.submenu.some(sub => sub.path && tabRoutes[sub.path]?.type === activeTab.type);
            }

            // Se tem aba ativa, nenhum outro item baseado em URL pode estar ativo simultaneamente
            return false;
        }

        // Sem abas ativas, caímos na navegação padrão por URL
        if (!item.path) return false;
        if (item.submenu) {
            return item.submenu.some(sub =>
                sub.exact
                    ? location.pathname === sub.path
                    : sub.path ? location.pathname.startsWith(sub.path) : false
            );
        }

        return item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex">
            {/* Overlay mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}


            {/* Sidebar - Estilo Técnico High Contrast */}
            <aside
                className={`
                    fixed inset-y-0 left-0 lg:relative
                    z-[60]
                    ${sidebarCollapsed ? 'w-[72px]' : 'w-56'}
                    bg-slate-100 dark:bg-gray-950
                    border-r border-gray-300 dark:border-gray-800
                    shadow-[5px_0_15px_rgba(0,0,0,0.08)]
                    transform transition-all duration-300 ease-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    flex flex-col
                `}
            >
                {/* Logo */}
                <div className={`h-14 flex items-center ${sidebarCollapsed ? 'flex-col justify-center gap-1 py-2' : 'justify-center px-3'} border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] relative`}>
                    <div className={`flex items-center gap-2 overflow-hidden ${sidebarCollapsed ? 'justify-center' : ''}`}>
                        {(empresa as any)?.logoUrl ? (
                            <img
                                src={(empresa as any).logoUrl}
                                alt="Logo"
                                className={`${sidebarCollapsed ? 'w-8 h-8' : 'h-8 w-auto max-w-[160px]'} object-contain transition-all`}
                            />
                        ) : (
                            <>
                                <img src="/logo-new.png" alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
                                {!sidebarCollapsed && (
                                    <span className="text-base font-bold text-text-light dark:text-text-dark truncate">
                                        {empresa?.nomeFantasia || 'OSPrimeX'}
                                    </span>
                                )}
                            </>
                        )}
                    </div>


                    {/* Botão Recolher (Desktop) - Posicionado à direita ou abaixo */}
                    {!sidebarCollapsed && (
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Recolher"
                        >
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>
                    )}

                    {!sidebarCollapsed && (
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    )}
                </div>

                {/* Botão Expandir (quando recolhido) - Separado do header */}
                {sidebarCollapsed && (
                    <button
                        onClick={() => setSidebarCollapsed(false)}
                        className="hidden lg:flex w-full justify-center py-2 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]"
                        title="Expandir"
                    >
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                )}

                {/* Empresa - compacto */}
                {
                    !sidebarCollapsed && (
                        <div className="px-3 py-2 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                            <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark truncate text-center">
                                {empresa?.nomeFantasia || 'Carregando...'}
                            </p>
                        </div>
                    )
                }

                {/* Navigation - estilo Stitch */}
                <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
                    {menuItems.filter(item => !item.hidden).map((item, index) => {
                        const active = isActive(item);
                        const isExpanded = expandedMenus[item.path || ''] || false;
                        const isTabRoute = item.path ? tabRoutes[item.path] : undefined;

                        // Renderização de Divisor
                        if (item.type === 'divider') {
                            return (
                                <div key={`divider-${index}`} className="py-2">
                                    <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] opacity-50" />
                                </div>
                            );
                        }

                        // Renderização para itens bloqueados/disabled
                        if (item.disabled || item.locked) {
                            return (
                                <div
                                    key={item.path}
                                    className={`
                                        flex items-center gap-2.5 px-3 py-2 rounded-lg opacity-60 cursor-not-allowed
                                        ${sidebarCollapsed ? 'justify-center' : ''}
                                        ${item.locked ? 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer' : ''}
                                    `}
                                    title={sidebarCollapsed ? item.label : (item.locked ? 'Add-on (Bloqueado)' : 'Em breve')}
                                >
                                    <span className="material-symbols-outlined text-[20px] text-text-secondary-light dark:text-text-secondary-dark">
                                        {item.icon}
                                    </span>
                                    {!sidebarCollapsed && (
                                        <div className="flex-1 flex justify-between items-center">
                                            <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{item.label}</span>
                                            {item.locked && <span className="material-symbols-outlined text-xs text-warning">lock</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Renderização para Submenu (Group)
                        if (item.submenu) {
                            const isExpanded = expandedMenus[item.path];

                            return (
                                <div key={item.path}>
                                    <button
                                        onClick={() => {
                                            if (sidebarCollapsed) setSidebarCollapsed(false);
                                            if (item.path) toggleSubmenu(item.path);
                                        }}
                                        className={`
                                            w-full flex items-center gap-2.5 px-3 py-2 rounded-[2px] transition-all duration-200 relative
                                            ${sidebarCollapsed ? 'justify-center' : ''}
                                            hover:translate-x-1 active:scale-[0.98]
                                            ${active
                                                ? 'text-primary bg-white dark:bg-gray-800 font-bold shadow-sm border border-gray-200 dark:border-gray-700'
                                                : 'text-text-light dark:text-text-dark hover:bg-gray-200/50 dark:hover:bg-gray-800'
                                            }
                                        `}
                                        title={sidebarCollapsed ? item.label : undefined}
                                        data-tour={item.tour}
                                    >
                                        <span className={`material-symbols-outlined text-[20px] ${active ? 'text-primary' : ''}`}>
                                            {item.icon}
                                        </span>
                                        {!sidebarCollapsed && (
                                            <>
                                                <span className={`flex-1 text-left text-sm ${active ? 'font-semibold text-primary' : 'text-text-light dark:text-text-dark'}`}>
                                                    {item.label}
                                                </span>
                                                <span className="material-symbols-outlined text-lg opacity-70">
                                                    {isExpanded ? 'expand_less' : 'expand_more'}
                                                </span>
                                            </>
                                        )}
                                    </button>

                                    {/* Subitems com Animação Accordion */}
                                    <div className={`animate-accordion ${!sidebarCollapsed && isExpanded ? 'open' : ''}`}>
                                        <div className="min-h-0 pl-11 mt-1 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-800 ml-3">
                                            {item.submenu.map(sub => {
                                                const subActive = sub.exact
                                                    ? location.pathname === sub.path
                                                    : location.pathname.startsWith(sub.path);

                                                const isSubTabRoute = sub.path ? tabRoutes[sub.path] : undefined;

                                                if (isSubTabRoute) {
                                                    return (
                                                        <button
                                                            key={sub.path}
                                                            onClick={() => {
                                                                setSidebarOpen(false);
                                                                openTab({
                                                                    id: isSubTabRoute.type,
                                                                    type: isSubTabRoute.type,
                                                                    title: isSubTabRoute.title,
                                                                    data: {}
                                                                });
                                                            }}
                                                            className={`
                                                                w-full text-left block px-3 py-1.5 rounded-[2px] text-sm transition-all duration-200
                                                                hover:translate-x-1 active:scale-[0.98]
                                                                ${subActive
                                                                    ? 'text-primary font-bold bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700'
                                                                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark hover:bg-gray-200/50'
                                                                }
                                                            `}
                                                        >
                                                            {sub.label}
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <NavLink
                                                        key={sub.path}
                                                        to={sub.path || '#'}
                                                        end={sub.exact}
                                                        className={`
                                                            block px-3 py-1.5 rounded-[2px] text-sm transition-all duration-200
                                                            hover:translate-x-1 active:scale-[0.98]
                                                            ${subActive
                                                                ? 'text-primary font-bold bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700'
                                                                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark hover:bg-gray-200/50'
                                                            }
                                                        `}
                                                        onClick={() => {
                                                            setSidebarOpen(false);
                                                            clearActiveTab(); // Permite ver rotas com abas abertas
                                                        }}
                                                    >
                                                        {sub.label}
                                                    </NavLink>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (isTabRoute) {
                            // Renderiza como botão que abre aba
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        setSidebarOpen(false);
                                        openTab({
                                            id: isTabRoute.type,
                                            type: isTabRoute.type,
                                            title: isTabRoute.title,
                                            data: {}
                                        });
                                    }}
                                    className={`
                                        w-full flex items-center gap-2.5 px-3 py-2 rounded-[2px] transition-all duration-200 relative
                                        ${sidebarCollapsed ? 'justify-center' : ''}
                                        hover:translate-x-1 active:scale-[0.98]
                                        ${active
                                            ? 'text-primary bg-white dark:bg-gray-800 font-bold shadow-sm border border-gray-200 dark:border-gray-700'
                                            : 'text-text-light dark:text-text-dark hover:bg-gray-200/50 dark:hover:bg-gray-800'
                                        }
                                    `}
                                    title={sidebarCollapsed ? item.label : undefined}
                                    data-tour={item.tour}
                                >
                                    {active && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                                    )}
                                    <span className={`material-symbols-outlined text-[20px] ${active ? 'text-primary' : ''}`}>
                                        {item.icon}
                                    </span>
                                    {!sidebarCollapsed && (
                                        <span className={`text-sm ${active ? 'font-bold' : ''}`}>{item.label}</span>
                                    )}
                                </button>
                            );
                        }

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path || '#'}
                                end={item.exact}
                                className={`
                                    flex items-center gap-2.5 px-3 py-2 rounded-[2px] transition-all duration-200 relative
                                    ${sidebarCollapsed ? 'justify-center' : ''}
                                    hover:translate-x-1 active:scale-[0.98]
                                    ${active
                                        ? 'text-primary bg-white dark:bg-gray-800 font-bold shadow-sm border border-gray-200 dark:border-gray-700'
                                        : 'text-text-light dark:text-text-dark hover:bg-gray-200/50 dark:hover:bg-gray-800'
                                    }
                                `}
                                onClick={() => {
                                    setSidebarOpen(false);
                                    clearActiveTab(); // Permite ver rotas com abas abertas
                                }}
                                title={sidebarCollapsed ? item.label : undefined}
                                data-tour={item.tour}
                            >
                                {active && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                                )}
                                <span className={`material-symbols-outlined text-[20px] ${active ? 'text-primary' : ''}`}>
                                    {item.icon}
                                </span>
                                {!sidebarCollapsed && (
                                    <span className={`text-sm ${active ? 'font-bold' : ''}`}>{item.label}</span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Footer removido - Sair e Recolher movidos */}
            </aside >

            {/* Main Content */}
            < div className="flex-1 flex flex-col h-screen overflow-hidden" >
                {/* Header - mais compacto */}
                < header className="h-14 bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between px-4 shrink-0" >
                    {/* Menu toggle (mobile) */}
                    < button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-[4px] hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </button >

                    {/* Spacer */}
                    < div className="flex-1" />

                    {/* Busca Global */}
                    < BuscaGlobal />

                    {/* Header actions */}
                    < div className="flex items-center gap-1" >
                        {/* Restart Tour */}
                        < div className="mr-2" >
                            <RestartTourButton />
                        </div >

                        {/* Theme toggle */}
                        < button
                            onClick={toggleTheme}
                            className="p-2 rounded-[4px] hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark active:scale-95 transition-transform"
                            title={isDark ? 'Modo claro' : 'Modo escuro'}
                        >
                            <span className="material-symbols-outlined text-xl">
                                {isDark ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button >

                        {/* Notifications */}
                        < div className="relative" >
                            <button
                                onClick={() => setShowNotificacoes(!showNotificacoes)}
                                className="p-2 rounded-[4px] hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark relative active:scale-95 transition-transform"
                            >
                                <span className="material-symbols-outlined text-xl">notifications</span>
                                {notificacoesNaoLidas > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 bg-error text-white text-xs rounded-full flex items-center justify-center font-medium">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown de notificações */}
                            {
                                showNotificacoes && (
                                    <div className="absolute right-0 top-12 w-80 card shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
                                        <div className="p-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between">
                                            <h3 className="font-semibold text-text-light dark:text-text-dark">Notificações</h3>
                                            {notificacoes.length > 0 && (
                                                <button
                                                    onClick={clearAll}
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    Limpar tudo
                                                </button>
                                            )}
                                        </div>
                                        <div className="overflow-y-auto flex-1">
                                            {notificacoes.length === 0 ? (
                                                <div className="p-6 text-center text-text-secondary-light dark:text-text-secondary-dark">
                                                    <span className="material-symbols-outlined text-3xl mb-2">notifications_off</span>
                                                    <p className="text-sm">Nenhuma notificação</p>
                                                </div>
                                            ) : (
                                                notificacoes.map(notif => (
                                                    <div
                                                        key={notif.id}
                                                        onClick={() => {
                                                            markAsRead(notif.id);
                                                            setShowNotificacoes(false);

                                                            if (notif.tipo === 'agenda') {
                                                                openTab({
                                                                    id: 'agenda',
                                                                    type: 'agenda',
                                                                    title: 'Agenda',
                                                                    data: {
                                                                        openAgendamentoId: notif.metadata?.agendamentoId,
                                                                        timestamp: Date.now()
                                                                    }
                                                                });
                                                            } else if (notif.link) {
                                                                navigate(notif.link);
                                                            } else if (notif.osId) {
                                                                navigate(`/os/${notif.osId}`);
                                                            }
                                                        }}
                                                        className={`p-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!notif.lida ? 'bg-primary/5' : ''
                                                            }`}
                                                    >
                                                        <div className="flex gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.tipo === 'aprovacao' ? 'bg-green-100 text-green-600' :
                                                                notif.tipo === 'agenda' ? 'bg-blue-100 text-blue-600' :
                                                                    'bg-primary/10 text-primary'
                                                                }`}>
                                                                <span className="material-symbols-outlined">
                                                                    {notif.tipo === 'aprovacao' ? 'check_circle' :
                                                                        notif.tipo === 'agenda' ? 'calendar_month' : 'info'}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm text-text-light dark:text-text-dark">{notif.titulo}</p>
                                                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">{notif.mensagem}</p>
                                                                {notif.tipo === 'agenda' && (
                                                                    <span className="text-[10px] text-primary font-medium mt-0.5 block">Clique para ver na agenda</span>
                                                                )}
                                                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                                                    {new Date(notif.criadoEm).toLocaleString('pt-BR')}
                                                                </p>
                                                            </div>
                                                            {!notif.lida && (
                                                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )
                            }
                        </div >

                        {/* User - compacto - agora clicável */}
                        < div className="relative" >
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 pl-3 ml-2 border-l border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:bg-gray-50 dark:hover:bg-gray-800 rounded-[4px] p-1 transition-all active:scale-[0.98]"
                                title="Menu do Usuário"
                            >
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                                    {usuario?.nome?.charAt(0) || 'U'}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-medium text-text-light dark:text-text-dark leading-tight flex items-center gap-1">
                                        {usuario?.nome?.split(' ')[0]}
                                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                                    </p>
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark capitalize leading-tight">
                                        {usuario?.perfil}
                                    </p>
                                </div>
                            </button>

                            {/* Dropdown User Menu */}
                            {
                                showUserMenu && (
                                    <div className="absolute right-0 top-12 w-56 card shadow-xl z-50 animate-scaleIn">
                                        <div className="p-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                                            <p className="font-semibold text-text-light dark:text-text-dark">{usuario?.nome}</p>
                                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{usuario?.email}</p>
                                        </div>
                                        <div className="p-1">
                                            <button
                                                onClick={() => { setShowProfileModal(true); setShowUserMenu(false); }}
                                                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                            >
                                                <span className="material-symbols-outlined text-lg">manage_accounts</span>
                                                Meus Dados
                                            </button>
                                            <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] my-1"></div>
                                            <button
                                                onClick={() => { logout(); setShowUserMenu(false); }}
                                                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-error hover:bg-red-50 dark:hover:bg-red-900/10"
                                            >
                                                <span className="material-symbols-outlined text-lg">logout</span>
                                                Sair
                                            </button>
                                        </div>
                                    </div>
                                )
                            }
                        </div >
                    </div >
                </header >

                {/* TabBar - Sistema de Abas (sempre visível se há abas) */}
                {tabs?.length > 0 && <TabBar />}

                {/*
                    Page Content - Renderiza AMBOS para manter estado:
                    - TabContent: sempre renderizado (hidden via CSS quando não ativo)
                    - Outlet: visível quando não há aba ativa
                */}
                <TabContent />
                {
                    !activeTabId && (
                        <main className="flex-1 overflow-auto">
                            <Outlet />
                        </main>
                    )
                }
            </div >
            {novaOSOpen && (
                <NovaOSModal
                    onClose={closeNovaOS}
                    onSave={(novaOS) => {
                        closeNovaOS();
                        if (novaOS?.id) {
                            openTab({
                                id: `os-${novaOS.id}`,
                                type: 'os',
                                title: `OS #${novaOS.numero || 'Nova'}`,
                                data: { osId: novaOS.id }
                            });
                        }
                    }}
                    empresaId={empresa?.id}
                    initialClienteId={novaOSData.clienteId}
                    initialVeiculoId={novaOSData.veiculoId}
                />
            )}

            {/* Modal de Perfil */}
            {
                showProfileModal && (
                    <UserProfileModal
                        onClose={() => setShowProfileModal(false)}
                    />
                )
            }
        </div >
    );
};

const MainLayout = () => {
    return (
        <TabsProvider>
            <ModalProvider>
                <MainLayoutContent />
            </ModalProvider>
        </TabsProvider>
    );
};

export default MainLayout;

