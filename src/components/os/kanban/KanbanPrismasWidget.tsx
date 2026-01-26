import React from 'react';
import { getEmojiCor } from '../../../lib/utils';
import { Empresa, OrdemServico } from '../../../types';

interface KanbanPrismasWidgetProps {
    empresa: Empresa | null;
    showPrismas: boolean;
    setShowPrismas: (show: boolean) => void;
    ordens: OrdemServico[];
    openOS: (id: string) => void;
}

export const KanbanPrismasWidget: React.FC<KanbanPrismasWidgetProps> = ({
    empresa,
    showPrismas,
    setShowPrismas,
    ordens, // Necessário para calcular uso, ou podemos passar os dados processados
    openOS
}) => {
    if (!empresa?.usarPrismas) return null;

    const getCorPrisma = (status: string) => {
        switch (status) {
            case 'aberta': return 'bg-slate-500';
            case 'execucao': return 'bg-primary';
            case 'aguardando_peca': return 'bg-orange-500';
            default: return 'bg-green-500';
        }
    };

    return (
        <div className="shrink-0 bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] px-4">
            <button
                onClick={() => setShowPrismas(!showPrismas)}
                className="w-full py-2 flex items-center justify-between text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors"
                title={!showPrismas ? 'Clique para visualizar os detalhes dos prismas' : ''}
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">{getEmojiCor(empresa?.prismaCor)}</span>
                    <span className="font-medium text-text-light dark:text-text-dark">Prismas</span>
                    {(() => {
                        const statusPermitidos = ['aberta', 'execucao', 'aguardando_peca'];
                        const emUso = ordens.filter(o => statusPermitidos.includes(o.status) && o.prisma).length;
                        const total = empresa?.prismaQuantidade || 20;
                        return (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emUso === 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                emUso >= total ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>
                                {emUso}/{total} em uso
                            </span>
                        );
                    })()}
                </div>
                <span className={`material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark transition-transform ${showPrismas ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {showPrismas && (
                <div className="pb-3 animate-fadeIn">
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: empresa?.prismaQuantidade || 20 }, (_, i) => i + 1).map(num => {
                            const statusPermitidos = ['aberta', 'execucao', 'aguardando_peca'];
                            const os = ordens.find(o =>
                                statusPermitidos.includes(o.status) &&
                                Number(o.prisma) === num
                            );

                            const cor = os ? getCorPrisma(os.status) : 'bg-green-500';
                            const titulo = os
                                ? `#${num} → OS #${os.numero} (${os.status === 'aberta' ? 'Aprovada' : os.status === 'execucao' ? 'Em Execução' : 'Aguardando Peça'})`
                                : `#${num} - Disponível`;

                            return (
                                <button
                                    key={num}
                                    onClick={() => os && os.id && openOS(os.id)}
                                    disabled={!os}
                                    className={`w-10 h-10 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${os
                                        ? 'border-gray-300 dark:border-gray-600 hover:scale-110 hover:shadow-md cursor-pointer'
                                        : 'border-gray-200 dark:border-gray-700 cursor-default opacity-60'
                                        }`}
                                    title={titulo}
                                >
                                    <span className="text-xs font-bold text-text-light dark:text-text-dark">{num}</span>
                                    <div className={`w-2.5 h-2.5 rounded-full ${cor}`}></div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Legenda compacta */}
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Disponível</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                            <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Aprovada</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Em Execução</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Aguardando Peça</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
