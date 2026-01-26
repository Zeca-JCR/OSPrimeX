import { useState } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface HelpTooltipProps {
    text: string;
    position?: TooltipPosition;
}

/**
 * Componente de Tooltip de Ajuda
 */
export const HelpTooltip = ({ text, position = 'top' }: HelpTooltipProps) => {
    const [show, setShow] = useState(false);

    const positionClasses: Record<TooltipPosition, string> = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <span className="relative inline-flex">
            <button
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                onClick={() => setShow(!show)}
                className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                aria-label={`Ajuda: ${text}`}
            >
                <span className="material-symbols-outlined text-sm text-text-secondary-light dark:text-text-secondary-dark" aria-hidden="true">
                    help
                </span>
            </button>
            {show && (
                <div className={`
                    absolute z-50 px-3 py-2 text-xs
                    bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
                    rounded-lg shadow-lg whitespace-nowrap max-w-xs
                    animate-fadeIn
                    ${positionClasses[position]}
                `}>
                    {text}
                    <div className={`
                        absolute w-2 h-2 bg-gray-900 dark:bg-gray-100 transform rotate-45
                        ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' : ''}
                        ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' : ''}
                        ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' : ''}
                        ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 -mr-1' : ''}
                    `} />
                </div>
            )}
        </span>
    );
};

/**
 * Dicas contextuais para diferentes páginas/funcionalidades
 */
export const HELP_TIPS: Record<string, string> = {
    os_status: 'Arraste os cards entre as colunas para mudar o status da OS.',
    os_itens: 'Ao finalizar a OS, o estoque dos produtos será baixado automaticamente.',
    cliente_veiculo: 'Cada cliente pode ter múltiplos veículos vinculados.',
    estoque_minimo: 'Defina um estoque mínimo para receber alertas de reposição.',
    comissao: 'A comissão do técnico é calculada sobre o valor total da OS.',
    financeiro: 'Lançamentos são gerados automaticamente a partir dos pagamentos das OS.',
    pdf: 'Clique para baixar a OS em formato PDF.',
    agenda: 'Clique em um horário para criar um novo agendamento.',
};

interface TipCardProps {
    tip: string;
    onDismiss?: () => void;
}

/**
 * Componente de Card de Dica
 */
export const TipCard = ({ tip, onDismiss }: TipCardProps) => {
    return (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">lightbulb</span>
            </div>
            <div className="flex-1">
                <p className="text-sm text-text-light dark:text-text-dark">
                    {tip}
                </p>
            </div>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark"
                    aria-label="Fechar dica"
                >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
                </button>
            )}
        </div>
    );
};

interface HelpLink {
    icon: string;
    label: string;
    action?: () => void;
    href?: string;
}

interface HelpButtonProps {
    onStartTour?: () => void;
}

/**
 * Botão flutuante de ajuda
 */
export const HelpButton = ({ onStartTour }: HelpButtonProps) => {
    const [open, setOpen] = useState(false);

    const helpLinks: HelpLink[] = [
        { icon: 'play_circle', label: 'Refazer tour', action: onStartTour },
        { icon: 'book', label: 'Documentação', href: '#' },
        { icon: 'support_agent', label: 'Suporte', href: '#' },
        { icon: 'feedback', label: 'Feedback', href: '#' },
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Menu */}
            {open && (
                <div className="absolute bottom-14 right-0 w-48 bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] overflow-hidden animate-slideUp">
                    {helpLinks.map((item, index) => (
                        item.action ? (
                            <button
                                key={index}
                                onClick={() => {
                                    item.action?.();
                                    setOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                aria-label={item.label}
                            >
                                <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark" aria-hidden="true">
                                    {item.icon}
                                </span>
                                {item.label}
                            </button>
                        ) : (
                            <a
                                key={index}
                                href={item.href}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                aria-label={item.label}
                            >
                                <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark" aria-hidden="true">
                                    {item.icon}
                                </span>
                                {item.label}
                            </a>
                        )
                    ))}
                </div>
            )}

            {/* Botão principal */}
            <button
                onClick={() => setOpen(!open)}
                className={`
                    w-12 h-12 rounded-full shadow-lg flex items-center justify-center
                    transition-all duration-200
                    ${open
                        ? 'bg-gray-200 dark:bg-gray-700 rotate-45'
                        : 'bg-primary hover:bg-primary-dark text-white'
                    }
                `}
                aria-label={open ? 'Fechar menu de ajuda' : 'Abrir menu de ajuda'}
                aria-expanded={open}
            >
                <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                    {open ? 'close' : 'help'}
                </span>
            </button>
        </div>
    );
};

export default HelpTooltip;
