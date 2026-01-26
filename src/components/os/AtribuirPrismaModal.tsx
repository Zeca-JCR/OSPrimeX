import React from 'react';
import type { Empresa } from '../../types';

interface PrismaOcupado {
    prisma: number | string;
    osId: string;
    osNumero: string | number;
}

interface AtribuirPrismaModalProps {
    empresa: Empresa | null;
    prismaAtual?: number | string;
    prismasOcupados?: PrismaOcupado[];
    onClose: () => void;
    onSelect: (prisma: number | null) => Promise<void>;
}

// Helper para emoji de cor
const getEmojiCor = (cor?: string) => {
    switch (cor) {
        case 'Vermelho': return '🔴';
        case 'Azul': return '🔵';
        case 'Verde': return '🟢';
        case 'Amarelo': return '🟡';
        case 'Preto': return '⚫';
        case 'Laranja': return '🟠';
        default: return '⚪';
    }
};

export const AtribuirPrismaModal = ({
    empresa,
    prismaAtual,
    prismasOcupados = [],
    onClose,
    onSelect
}: AtribuirPrismaModalProps) => {
    const totalPrismas = empresa?.prismaQuantidade || 20;
    const prismas = Array.from({ length: totalPrismas }, (_, i) => i + 1);
    const emojiCor = getEmojiCor(empresa?.prismaCor);

    const isPrismaOcupado = (num) => {
        return prismasOcupados.some(p => Number(p.prisma) === num);
    };

    const getOcupanteInfo = (num) => {
        return prismasOcupados.find(p => Number(p.prisma) === num);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div className="card p-6 w-full max-w-md animate-slideUp" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        {emojiCor} Atribuir Prisma
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
                    Selecione um prisma disponível para vincular a esta OS:
                </p>

                <div className="grid grid-cols-5 gap-2 mb-4">
                    {prismas.map(num => {
                        const ocupado = isPrismaOcupado(num);
                        const ocupante = getOcupanteInfo(num);
                        const selecionado = prismaAtual === num;

                        return (
                            <button
                                key={num}
                                onClick={() => !ocupado && onSelect(num)}
                                disabled={ocupado}
                                className={`
                                    aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all
                                    ${selecionado
                                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                                        : ocupado
                                            ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 cursor-pointer'
                                    }
                                `}
                                title={ocupado ? `Ocupado pela OS #${ocupante?.osNumero}` : selecionado ? 'Prisma atual' : 'Disponível - Clique para selecionar'}
                            >
                                <span className={`text-sm font-bold ${selecionado ? 'text-primary' : 'text-text-light dark:text-text-dark'}`}>
                                    {num}
                                </span>
                                <div className={`w-2 h-2 rounded-full mt-0.5 ${ocupado ? 'bg-red-400' : selecionado ? 'bg-primary' : 'bg-green-500'}`}></div>
                            </button>
                        );
                    })}
                </div>

                {/* Legenda */}
                <div className="flex items-center justify-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Disponível</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Ocupado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Atual</span>
                    </div>
                </div>

                {/* Botão remover prisma */}
                {prismaAtual && (
                    <button
                        onClick={() => onSelect(null)}
                        className="w-full mt-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">remove_circle_outline</span>
                        Remover Prisma
                    </button>
                )}
            </div>
        </div>
    );
};

