/**
 * Componente de Empty State reutilizável
 * Exibido quando não há dados para mostrar em uma lista
 */

// Configurações de ilustrações por tipo
const ILLUSTRATIONS = {
    clientes: {
        icon: 'group',
        title: 'Nenhum cliente cadastrado',
        description: 'Comece adicionando seu primeiro cliente para gerenciar ordens de serviço.',
        action: 'Adicionar Cliente',
        path: '/clientes/novo',
    },
    veiculos: {
        icon: 'directions_car',
        title: 'Nenhum veículo cadastrado',
        description: 'Cadastre veículos para vincular às ordens de serviço.',
        action: 'Cadastrar Veículo',
        path: '/veiculos/novo',
    },
    os: {
        icon: 'assignment',
        title: 'Nenhuma ordem de serviço',
        description: 'Crie sua primeira OS para começar a gerenciar os serviços da oficina.',
        action: 'Nova OS',
        path: '/os',
    },
    produtos: {
        icon: 'inventory_2',
        title: 'Estoque vazio',
        description: 'Cadastre produtos e serviços para usar nas ordens de serviço.',
        action: 'Adicionar Produto',
        path: '/estoque',
    },
    lancamentos: {
        icon: 'receipt_long',
        title: 'Nenhum lançamento',
        description: 'Lançamentos financeiros aparecerão aqui conforme você registrar receitas e despesas.',
        action: null,
    },
    usuarios: {
        icon: 'manage_accounts',
        title: 'Nenhum usuário adicional',
        description: 'Adicione técnicos e colaboradores para gerenciar a equipe.',
        action: 'Adicionar Usuário',
        path: '/usuarios',
    },
    agenda: {
        icon: 'event_busy',
        title: 'Agenda vazia',
        description: 'Nenhum agendamento para esta data. Adicione um novo atendimento.',
        action: 'Novo Agendamento',
        path: null,
    },
    busca: {
        icon: 'search_off',
        title: 'Nenhum resultado encontrado',
        description: 'Tente buscar com outros termos ou limpar os filtros.',
        action: null,
    },
    comissoes: {
        icon: 'payments',
        title: 'Nenhuma comissão registrada',
        description: 'As comissões serão geradas automaticamente ao finalizar ordens de serviço.',
        action: null,
    },
    default: {
        icon: 'inbox',
        title: 'Nada por aqui',
        description: 'Não há itens para exibir no momento.',
        action: null,
    },
};

const EmptyState = ({
    type = 'default',
    title,
    description,
    icon,
    action,
    onAction,
    compact = false,
}) => {
    const config = ILLUSTRATIONS[type] || ILLUSTRATIONS.default;

    const displayIcon = icon || config.icon;
    const displayTitle = title || config.title;
    const displayDescription = description || config.description;
    const displayAction = action !== undefined ? action : config.action;

    return (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'}`}>
            {/* Ilustração decorativa */}
            <div className={`relative ${compact ? 'mb-3' : 'mb-6'}`}>
                <div className={`
                    ${compact ? 'w-16 h-16' : 'w-24 h-24'}
                    rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5
                    flex items-center justify-center
                `}>
                    <span className={`material-symbols-outlined ${compact ? 'text-3xl' : 'text-5xl'} text-primary/40`}>
                        {displayIcon}
                    </span>
                </div>
                {/* Elementos decorativos */}
                {!compact && (
                    <>
                        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary/20 animate-pulse" />
                        <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-primary/15" />
                    </>
                )}
            </div>

            {/* Texto */}
            <h3 className={`
                font-semibold text-text-light dark:text-text-dark
                ${compact ? 'text-sm mb-1' : 'text-lg mb-2'}
            `}>
                {displayTitle}
            </h3>
            <p className={`
                text-text-secondary-light dark:text-text-secondary-dark max-w-sm
                ${compact ? 'text-xs' : 'text-sm'}
            `}>
                {displayDescription}
            </p>

            {/* Ação */}
            {displayAction && onAction && (
                <button
                    onClick={onAction}
                    className={`
                        btn-primary mt-4 flex items-center gap-2
                        ${compact ? 'px-4 py-2 text-sm' : 'px-6 py-2.5'}
                    `}
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    {displayAction}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
