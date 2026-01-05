import { useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../contexts/ThemeContext';
import storage from '../../lib/storage';
import BuscaGlobal from '../common/BuscaGlobal';
import { useNotification } from '../../contexts/NotificationContext';
import { NovaOSModal } from '../../components/os/NovaOSModal';
import { RestartTourButton } from '../../components/onboarding/OnboardingTour';
import { OSProvider, useOS } from '../../contexts/OSContext';
import OSWindowManager from '../../components/layout/OSWindowManager';
import UserProfileModal from '../../components/users/UserProfileModal';

const MainLayoutContent = () => {
    const { usuario, empresa, logout, isAdmin } = useAuth();
    const { hasAddon } = useTenant();
    const { isDark, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const { openOS, windows } = useOS();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const lastKeyRef = useRef('');

    const { notificacoes, unreadCount, markAsRead, clearAll } = useNotification();

    const [showNotificacoes, setShowNotificacoes] = useState(false);

    // Estado para Nova OS Global
    const [showNovaOS, setShowNovaOS] = useState(false);
    const [novaOSData, setNovaOSData] = useState({ clientes: [], veiculos: [] });
    const [loadingNovaOS, setLoadingNovaOS] = useState(false);

    // Estado para Modal de Perfil
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Submenus expandidos
    // Submenus expandidos
    const [expandedMenus, setExpandedMenus] = useState({});

    // User Menu Dropdown
    const [showUserMenu, setShowUserMenu] = useState(false);

    const toggleSubmenu = (path) => {
        setExpandedMenus(prev => ({ ...prev, [path]: !prev[path] }));
    };

    // Atalhos de teclado para navegação (G + letra)
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignorar se estiver digitando em input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            // Sistema G + Letra para navegação
            if (lastKeyRef.current === 'g') {
                const routes = {
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





    const abrirNovaOS = async () => {
        if (!empresa) return;
        setShowNovaOS(true);
        setLoadingNovaOS(true);
        try {
            const [clientes, veiculos] = await Promise.all([
                storage.getAll('clientes', empresa.id),
                storage.getAll('veiculos', empresa.id)
            ]);
            setNovaOSData({ clientes, veiculos });
        } catch (error) {
            console.error("Erro ao carregar dados para Nova OS:", error);
        } finally {
            setLoadingNovaOS(false);
        }
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
                if (expandedMenus[item.path] !== shouldBeExpanded) {
                    newExpanded[item.path] = shouldBeExpanded;
                    changed = true;
                } else {
                    newExpanded[item.path] = expandedMenus[item.path];
                }
            }
        });

        if (changed) {
            setExpandedMenus(prev => ({ ...prev, ...newExpanded }));
        }
    }, [location.pathname, menuItems]);

    const isActive = (item) => {
        if (item.submenu) {
            return item.submenu.some(sub =>
                sub.exact
                    ? location.pathname === sub.path
                    : location.pathname.startsWith(sub.path)
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

            {/* Modal Global Nova OS */}
            {showNovaOS && (
                <NovaOSModal
                    clientes={novaOSData.clientes}
                    veiculos={novaOSData.veiculos}
                    empresaId={empresa?.id}
                    onClose={() => setShowNovaOS(false)}
                    onSave={() => {
                        setShowNovaOS(false);
                        // Idealmente, recarregar dados da página atual se for OS
                        if (location.pathname === '/os') {
                            window.location.reload();
                        } else {
                            navigate('/os');
                        }
                    }}
                />
            )}

            {/* Sidebar - Estilo Stitch */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0
                    ${windows?.some(w => !w.minimized) ? 'z-[2010] relative' : 'z-50'}
                    ${sidebarCollapsed ? 'w-[72px]' : 'w-56'}
                    bg-surface-light dark:bg-surface-dark
                    border-r border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]
                    transform transition-all duration-200 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    flex flex-col
                `}
            >
                {/* Logo */}
                <div className={`h-14 flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]`}>
                    <div className="flex items-center gap-2 overflow-hidden">
                        {empresa?.logoUrl ? (
                            <img
                                src={empresa.logoUrl}
                                alt="Logo"
                                className={`${sidebarCollapsed ? 'w-10 h-10' : 'h-8 w-auto max-w-[160px]'} object-contain transition-all`}
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


                    {/* Botão Recolher (Desktop) - Movido para o topo */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className={`hidden lg:flex p-1.5 rounded-lg text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${sidebarCollapsed ? 'mx-auto' : ''}`}
                        title={sidebarCollapsed ? 'Expandir' : 'Recolher'}
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
                        </span>
                    </button>

                    {!sidebarCollapsed && (
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    )}
                </div>

                {/* Empresa - compacto */}
                {
                    !sidebarCollapsed && (
                        <div className="px-3 py-2 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                            <p className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark truncate">
                                {empresa?.nomeFantasia || 'Carregando...'}
                            </p>
                        </div>
                    )
                }

                {/* Navigation - estilo Stitch */}
                <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
                    {menuItems.filter(item => !item.hidden).map((item, index) => {
                        // Renderização de Divisor
                        if (item.type === 'divider') {
                            return (
                                <div key={`divider-${index}`} className="py-2">
                                    <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] opacity-50" />
                                </div>
                            );
                        }

                        const active = isActive(item);

                        // Renderização para itens bloqueados/disabled (mantém lógica anterior, simplificada)
                        if (item.disabled || item.locked) {
                            // ... [Lógica existente para disabled/locked seria repetida aqui se necessária, mas para simplificar vou omitir pois o foco é submenu. 
                            // Mas como estou substituindo o bloco todo, preciso manter ou readaptar. Vou manter a lógica simple de antes para esses casos]
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
                                            toggleSubmenu(item.path);
                                        }}
                                        className={`
                                            w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors relative
                                            ${sidebarCollapsed ? 'justify-center' : ''}
                                            ${active
                                                ? 'text-primary bg-primary/5'
                                                : 'text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-800'
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
                                                <span className={`flex-1 text-left text-sm ${active ? 'font-medium' : ''}`}>
                                                    {item.label}
                                                </span>
                                                <span className="material-symbols-outlined text-lg opacity-70">
                                                    {isExpanded ? 'expand_less' : 'expand_more'}
                                                </span>
                                            </>
                                        )}
                                    </button>

                                    {/* Subitems */}
                                    {!sidebarCollapsed && isExpanded && (
                                        <div className="ml-9 mt-1 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-800 pl-2">
                                            {item.submenu.map(sub => {
                                                const subActive = sub.exact
                                                    ? location.pathname === sub.path
                                                    : location.pathname.startsWith(sub.path);

                                                return (
                                                    <NavLink
                                                        key={sub.path}
                                                        to={sub.path}
                                                        end={sub.exact}
                                                        className={`
                                                            block px-3 py-1.5 rounded-lg text-sm transition-colors
                                                            ${subActive
                                                                ? 'text-primary font-medium bg-primary/10'
                                                                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                                            }
                                                        `}
                                                        onClick={() => setSidebarOpen(false)}
                                                    >
                                                        {sub.label}
                                                    </NavLink>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Item normal (Link direto)
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.exact}
                                className={`
                                    flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors relative
                                    ${sidebarCollapsed ? 'justify-center' : ''}
                                    ${active
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }
                                `}
                                onClick={() => setSidebarOpen(false)}
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
                                    <span className={`text-sm ${active ? 'font-medium' : ''}`}>{item.label}</span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Footer removido - Sair e Recolher movidos */}
            </aside >

            {/* Main Content */}
            < div className="flex-1 flex flex-col min-h-screen overflow-hidden" >
                {/* Header - mais compacto */}
                < header className="h-14 bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between px-4 shrink-0" >
                    {/* Menu toggle (mobile) */}
                    < button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
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
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark"
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
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark relative"
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
                                                                navigate('/agenda', {
                                                                    state: {
                                                                        openAgendamentoId: notif.metadata?.agendamentoId
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
                                className="flex items-center gap-2 pl-3 ml-2 border-l border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-1 transition-colors"
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

                {/* Page Content */}
                < main className="flex-1 overflow-auto" >
                    <Outlet />
                </main >
            </div >
            {showNovaOS && (
                <NovaOSModal
                    onClose={() => setShowNovaOS(false)}
                    onSave={(novaOS) => {
                        setShowNovaOS(false);
                        if (novaOS?.id) openOS(novaOS.id);
                    }}
                    dados={novaOSData}
                    loading={loadingNovaOS}
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

            {/* Gerenciador de Janelas (OS) - Recebe estado da sidebar para posicionamento */}
            <OSWindowManager sidebarCollapsed={sidebarCollapsed} />
        </div >
    );
};

const MainLayout = () => {
    return (
        <OSProvider>
            <MainLayoutContent />
        </OSProvider>
    );
};

export default MainLayout;
