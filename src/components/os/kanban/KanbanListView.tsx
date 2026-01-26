import React from 'react';
import PlacaBadge from '../../common/PlacaBadge';
import { getEmojiCor, formatCurrency, formatDate } from '../../../lib/utils';
import { OrdemServico, Empresa } from '../../../types';

interface KanbanListViewProps {
    ordensFiltradas: OrdemServico[];
    colunas: Array<{ id: string; label: string; color: string }>;
    openOS: (id: string) => void;
    hasLinkRastreavel: (id: string) => boolean;
    empresa: Empresa | null;
    getClienteNome: (id?: string) => string;
    getVeiculoPlaca: (id?: string) => string;
    getVeiculoInfo: (id?: string) => string;
    hasTecnicoValido: (os: OrdemServico) => boolean;
    getTecnicoNome: (id?: string) => string;
}

export const KanbanListView: React.FC<KanbanListViewProps> = ({
    ordensFiltradas,
    colunas,
    openOS,
    hasLinkRastreavel,
    empresa,
    getClienteNome,
    getVeiculoPlaca,
    getVeiculoInfo,
    hasTecnicoValido,
    getTecnicoNome
}) => {
    if (ordensFiltradas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary-light dark:text-text-secondary-dark">
                <span className="material-symbols-outlined text-5xl mb-4">search_off</span>
                <p className="text-lg font-medium">Nenhuma OS encontrada</p>
                <p className="text-sm">Tente ajustar os filtros de busca</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto p-4">
            <div className="card overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr className="text-left text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                            <th className="px-4 py-3 font-medium">Nº</th>
                            <th className="px-4 py-3 font-medium">Cliente</th>
                            <th className="px-4 py-3 font-medium">Veículo</th>
                            <th className="px-4 py-3 font-medium">Técnico</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium text-right">Valor</th>
                            <th className="px-4 py-3 font-medium">Data</th>
                            <th className="px-4 py-3 font-medium w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-light)] dark:divide-[var(--color-border-dark)]">
                        {ordensFiltradas.map((os) => {
                            const statusInfo = colunas.find(c => c.id === os.status) || colunas[0];
                            return (
                                <tr
                                    key={os.id}
                                    onClick={() => openOS(os.id!)}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-primary">#{os.numero}</span>
                                            {hasLinkRastreavel(os.id!) && (
                                                <span className="material-symbols-outlined text-blue-500 text-sm" title="Rastreio Ativo">
                                                    share_location
                                                </span>
                                            )}
                                            {/* Prisma inline na mesma linha - Só exibe em OSs ativas */}
                                            {empresa?.usarPrismas && os.prisma && !['finalizada', 'cancelada'].includes(os.status) && (
                                                <span className="text-[10px] bg-gray-50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 inline-flex items-center gap-1 text-text-secondary-light dark:text-text-secondary-dark" title="Prisma">
                                                    {getEmojiCor(empresa.prismaCor)} #{os.prisma}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-text-light dark:text-text-dark">{getClienteNome(os.clienteId)}</p>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                        <div className="flex items-center gap-2">
                                            <PlacaBadge placa={getVeiculoPlaca(os.veiculoId)} size="sm" />
                                            <span>{getVeiculoInfo(os.veiculoId)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {hasTecnicoValido(os) ? (
                                            <span className="text-text-secondary-light dark:text-text-secondary-dark">
                                                {getTecnicoNome(os.tecnicoId)}
                                            </span>
                                        ) : (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-500 font-medium inline-flex items-center gap-1" title="Sem técnico atribuído">
                                                <span className="material-symbols-outlined text-[14px]">person_off</span>
                                                Sem técnico
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                                            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                                {statusInfo.label}
                                            </span>
                                            {/* Badge de Natureza da OS - ao lado do status */}
                                            {os.tipo && os.tipo !== 'os' && os.tipo !== 'orcamento' && (
                                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ml-1 ${os.tipo === 'garantia' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : ''} ${os.tipo === 'cortesia' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' : ''} ${os.tipo === 'retorno' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : ''} ${os.tipo === 'interna' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}`}>
                                                    {os.tipo}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-text-light dark:text-text-dark">
                                        {formatCurrency(os.valorTotal)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                        {os.status === 'finalizada'
                                            ? <span title="Data de Finalização">{formatDate(os.execucaoFinalizadaEm || os.atualizadoEm || os.criadoEm)}</span>
                                            : <span title="Data de Abertura">{formatDate(os.criadoEm)}</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark">chevron_right</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
