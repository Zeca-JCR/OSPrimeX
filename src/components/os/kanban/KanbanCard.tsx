import React from 'react';
import PlacaBadge from '../../common/PlacaBadge';
import { getEmojiCor, formatCurrency } from '../../../lib/utils';
import type { OrdemServico, ColunaKanban, Empresa } from '../../../types';

interface KanbanCardProps {
    os: OrdemServico;
    coluna: ColunaKanban;
    dragging: string | null;
    empresa: Empresa | null;
    handleDragStart: (e: React.DragEvent, os: OrdemServico) => void;
    openOS: (id: string) => void;
    hasLinkRastreavel: (id: string) => boolean;
    getClienteNome: (id: string) => string;
    getVeiculoPlaca: (id: string) => string | null;
    getVeiculoInfo: (id: string) => string;
    hasTecnicoValido: (os: OrdemServico) => boolean;
    setOsParaAtribuir: (value: { id: string, novoStatus: string } | null) => void;
    setShowAtribuirTecnico: (show: boolean) => void;
    setOsParaAtribuirPrisma: (os: OrdemServico | null) => void;
    setShowAtribuirPrisma: (show: boolean) => void;
}

export const KanbanCard = ({
    os,
    coluna,
    dragging,
    empresa,
    handleDragStart,
    openOS,
    hasLinkRastreavel,
    getClienteNome,
    getVeiculoPlaca,
    getVeiculoInfo,
    hasTecnicoValido,
    setOsParaAtribuir,
    setShowAtribuirTecnico,
    setOsParaAtribuirPrisma,
    setShowAtribuirPrisma
}: KanbanCardProps) => {
    return (
        <div
            draggable
            onDragStart={(e: React.DragEvent) => handleDragStart(e, os)}
            onClick={() => openOS(os.id)}
            className={`
                card p-0 cursor-pointer transition-all overflow-hidden
                ${dragging === os.id ? 'opacity-50 scale-95' : 'hover:shadow-md'}
            `}
            title="Clique para ver detalhes"
        >
            {/* Indicador lateral colorido - estilo Stitch */}
            <div className="flex">
                <div className={`w-1 shrink-0 ${coluna.color}`} />
                <div className="flex-1 p-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-black text-primary flex items-center gap-1 tracking-tight">
                                #{os.numero}
                                {hasLinkRastreavel(os.id) && (
                                    <span className="material-symbols-outlined text-blue-500 text-[14px]" title="Rastreio Ativo">
                                        share_location
                                    </span>
                                )}
                            </span>
                            {/* Tag de Tipo de OS */}
                            <div className="flex flex-wrap gap-1 mt-1">
                                {os.tipo && os.tipo !== 'os' && os.tipo !== 'orcamento' && (
                                    <span className={`
                                        text-[10px] uppercase font-bold px-1.5 py-0.5 rounded w-fit
                                        ${os.tipo === 'garantia' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : ''}
                                        ${os.tipo === 'cortesia' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' : ''}
                                        ${os.tipo === 'retorno' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : ''}
                                        ${os.tipo === 'interna' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                                    `}>
                                        {os.tipo}
                                    </span>
                                )}

                                {/* Badge de Prisma (Kanban) - Só exibe em OSs ativas */}
                                {empresa?.usarPrismas && !['finalizada', 'cancelada'].includes(os.status) && (
                                    os.prisma ? (
                                        <span className="text-[10px] bg-gray-50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 flex items-center gap-1 font-medium text-text-secondary-light dark:text-text-secondary-dark" title="Prisma">
                                            {getEmojiCor(empresa.prismaCor)} #{os.prisma}
                                        </span>
                                    ) : (
                                        ['aberta', 'execucao', 'aguardando_peca'].includes(os.status) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOsParaAtribuirPrisma(os);
                                                    setShowAtribuirPrisma(true);
                                                }}
                                                className="text-[10px] bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-800 font-bold flex items-center gap-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors"
                                                title="Clique para atribuir um prisma"
                                            >
                                                ⚠️ Sem Prisma
                                            </button>
                                        )
                                    )
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Indicador de dias em aberto */}
                            {['aberta', 'execucao', 'aguardando_peca'].includes(os.status) && (() => {
                                const dias = Math.floor((Date.now() - new Date(os.criadoEm).getTime()) / (1000 * 60 * 60 * 24));
                                if (dias >= 3) {
                                    return (
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${dias >= 5 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'} font-medium`}>
                                            {dias}d
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                {new Date(os.criadoEm).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                    </div>

                    {/* Cliente / Veículo */}
                    <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                        {getClienteNome(os.clienteId)}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                        <PlacaBadge placa={getVeiculoPlaca(os.veiculoId)} size="sm" />
                        <span className="text-[11px] text-text-secondary-light dark:text-text-secondary-dark truncate font-medium">
                            {getVeiculoInfo(os.veiculoId)}
                        </span>
                    </div>

                    {/* Footer compacto */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-sm font-bold text-text-light dark:text-text-dark">
                            {formatCurrency(os.valorTotal || 0)}
                        </span>
                        {os.statusFinanceiro === 'pago' ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 font-medium">Pago</span>
                        ) : ((os.valorPago || 0) > 0 && (os.valorPago || 0) < os.valorTotal) ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 font-medium">Parcial</span>
                        ) : os.valorTotal > 0 ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 font-medium">Pendente</span>
                        ) : (
                            // Se valor for 0, mas tiver tipo definido (Garantia/Cortesia), mostrar 'Sem Cobrança' padronizado
                            (os.tipo === 'garantia' || os.tipo === 'cortesia' || os.tipo === 'interna' || os.tipo === 'retorno') ? (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold">
                                    Sem Cobrança
                                </span>
                            ) : null
                        )}
                        {!hasTecnicoValido(os) && os.status === 'execucao' ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOsParaAtribuir({ id: os.id, novoStatus: 'execucao' });
                                    setShowAtribuirTecnico(true);
                                }}
                                className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 font-bold flex items-center gap-1 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors animate-pulse"
                                title="Erro: OS em execução sem técnico. Clique para corrigir."
                            >
                                <span className="material-symbols-outlined text-[14px]">person_add</span>
                                Atribuir Técnico
                            </button>
                        ) : !hasTecnicoValido(os) && os.status !== 'finalizada' && os.status !== 'cancelada' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-500 font-medium flex items-center gap-1" title="Sem técnico atribuído">
                                <span className="material-symbols-outlined text-[14px]">person_off</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
