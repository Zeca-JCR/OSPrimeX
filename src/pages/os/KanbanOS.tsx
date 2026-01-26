// KanbanOS.tsx
import React, { ChangeEvent, useState } from 'react';
import { useKanbanController } from '../../hooks/os/useKanbanController';
import { NovaOSModal } from '../../components/os/NovaOSModal';
import { AtribuirTecnicoModal } from '../../components/os/AtribuirTecnicoModal';
import { AtribuirPrismaModal } from '../../components/os/AtribuirPrismaModal';
import { KanbanBoard } from '../../components/os/kanban/KanbanBoard';
import { KanbanFilterBar } from '../../components/os/kanban/KanbanFilterBar';
import { KanbanPrismasWidget } from '../../components/os/kanban/KanbanPrismasWidget';
import { KanbanListView } from '../../components/os/kanban/KanbanListView';
import { OrdemServico } from '../../types';

interface KanbanOSProps {
    isTabMode?: boolean;
    onClose?: () => void;
    autoOpenNovaOS?: boolean;
    autoOpenTimestamp?: number;
}

const KanbanOS: React.FC<KanbanOSProps> = ({ autoOpenNovaOS, autoOpenTimestamp }) => {
    const {
        // Data
        empresa,
        ordens,
        // clientes, // Unused
        // veiculos, // Unused
        tecnicos,
        loading,
        colunas,
        ordensFiltradas,

        // UI State
        visualizacao, setVisualizacao,
        showPrismas, setShowPrismas,
        filtroAtivo, updateFiltro, handlePeriodoChange,
        dragging,

        // Modal State
        showNovaOS, setShowNovaOS,
        showAtribuirTecnico, setShowAtribuirTecnico,
        showAtribuirPrisma, setShowAtribuirPrisma,
        osParaAtribuirPrisma, setOsParaAtribuirPrisma,
        osParaAtribuir, setOsParaAtribuir,
        showConfirmarCancelamento, setShowConfirmarCancelamento,
        osParaCancelar, setOsParaCancelar,
        motivoCancelamento, setMotivoCancelamento,
        processandoCancelamento,

        // Actions
        openOS,
        handleDragStart,
        handleDragOver,
        handleDrop,
        handleAtribuirTecnico,
        handleAtribuirPrisma,
        confirmarCancelamento,

        // Helpers
        getClienteNome,
        getVeiculoInfo,
        getVeiculoPlaca,
        getTecnicoNome,
        hasLinkRastreavel,
        hasTecnicoValido,
        getPrismasOcupados,
    } = useKanbanController(autoOpenNovaOS, autoOpenTimestamp);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-pulse-soft text-primary">
                    <span className="material-symbols-outlined text-5xl">sync</span>
                </div>
            </div>
        );
    }

    // Calculate modal props
    const osEmAtribuicao = osParaAtribuir ? ordens.find(o => o.id === osParaAtribuir.id) : null;

    return (
        <div className="h-full flex flex-col p-4 lg:p-6 overflow-hidden min-h-0">
            {/* Header - estilo Stitch */}
            <div className="shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
                            Ordens de Serviço
                        </h1>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                            Acompanhe e gerencie todas as ordens de serviço
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Toggle Kanban/Lista */}
                        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5" title="Ctrl+L para alternar">
                            <button
                                onClick={() => setVisualizacao('kanban')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-all ${visualizacao === 'kanban'
                                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-lg">view_kanban</span>
                                Kanban
                            </button>
                            <button
                                onClick={() => setVisualizacao('lista')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-all ${visualizacao === 'lista'
                                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                    : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-lg">list</span>
                                Lista
                            </button>
                        </div>

                        <button
                            onClick={() => setShowNovaOS(true)}
                            className="btn-primary py-2 px-4 text-sm flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Nova OS
                        </button>
                    </div>
                </div>

                <KanbanFilterBar
                    filtroAtivo={filtroAtivo}
                    updateFiltro={updateFiltro}
                    handlePeriodoChange={handlePeriodoChange}
                    visualizacao={visualizacao}
                    colunas={colunas}
                    ordensFiltradas={ordensFiltradas}
                />
            </div>

            <KanbanPrismasWidget
                empresa={empresa}
                showPrismas={showPrismas}
                setShowPrismas={setShowPrismas}
                ordens={ordens}
                openOS={openOS}
            />

            {/* Content Area */}
            {visualizacao === 'kanban' ? (
                <KanbanBoard
                    colunas={colunas}
                    ordensFiltradas={ordensFiltradas}
                    handleDragOver={handleDragOver}
                    handleDrop={handleDrop}
                    dragging={dragging}
                    empresa={empresa}
                    handleDragStart={handleDragStart}
                    openOS={openOS}
                    hasLinkRastreavel={hasLinkRastreavel}
                    getClienteNome={getClienteNome}
                    getVeiculoPlaca={getVeiculoPlaca}
                    getVeiculoInfo={getVeiculoInfo}
                    hasTecnicoValido={hasTecnicoValido}
                    setShowAtribuirTecnico={setShowAtribuirTecnico}
                    setOsParaAtribuirPrisma={setOsParaAtribuirPrisma}
                    setShowAtribuirPrisma={setShowAtribuirPrisma}
                    setOsParaAtribuir={setOsParaAtribuir}
                />
            ) : (
                <KanbanListView
                    ordensFiltradas={ordensFiltradas}
                    colunas={colunas}
                    openOS={openOS}
                    hasLinkRastreavel={hasLinkRastreavel}
                    empresa={empresa}
                    getClienteNome={getClienteNome}
                    getVeiculoPlaca={getVeiculoPlaca}
                    getVeiculoInfo={getVeiculoInfo}
                    hasTecnicoValido={hasTecnicoValido}
                    getTecnicoNome={getTecnicoNome}
                />
            )}

            {/* Modais */}
            {showNovaOS && (
                <NovaOSModal
                    empresaId={empresa?.id}
                    onClose={() => setShowNovaOS(false)}
                    onSave={(novaOS: OrdemServico) => {
                        setShowNovaOS(false);
                        // carregarDados() já é chamado pelos listeners, mas para garantir:
                        window.dispatchEvent(new CustomEvent('osprimex-storage', { detail: { key: 'ordens_servico' } }));

                        if (novaOS?.id) openOS(novaOS.id);
                    }}
                />
            )}

            {showAtribuirTecnico && (
                <AtribuirTecnicoModal
                    tecnicos={tecnicos}
                    tecnicoAtualId={osEmAtribuicao?.tecnicoId || ''}
                    onClose={() => setShowAtribuirTecnico(false)}
                    onSelect={handleAtribuirTecnico}
                />
            )}

            {showAtribuirPrisma && osParaAtribuirPrisma && (
                <AtribuirPrismaModal
                    empresa={empresa}
                    prismaAtual={osParaAtribuirPrisma.prisma}
                    prismasOcupados={getPrismasOcupados()}
                    onClose={() => {
                        setShowAtribuirPrisma(false);
                        setOsParaAtribuirPrisma(null);
                    }}
                    onSelect={handleAtribuirPrisma}
                />
            )}

            {/* Modal Confirmar Cancelamento */}
            {showConfirmarCancelamento && osParaCancelar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="card p-6 w-full max-w-md animate-scaleIn">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4 flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">cancel</span>
                            </div>
                            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                                Cancelar OS #{osParaCancelar.numero}
                            </h3>
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
                                {osParaCancelar.status === 'finalizada'
                                    ? 'Esta OS está finalizada. Ao cancelar, as peças serão estornadas ao estoque.'
                                    : 'Informe o motivo do cancelamento (opcional).'
                                }
                            </p>
                        </div>

                        {osParaCancelar.status === 'finalizada' && (
                            <div className="mb-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-xl shrink-0">warning</span>
                                    <div>
                                        <p className="font-bold text-orange-800 dark:text-orange-300 mb-1">ATENÇÃO: Estorno de Estoque</p>
                                        <p className="text-sm text-orange-700 dark:text-orange-400">
                                            {(osParaCancelar.itens || []).filter(i => i.tipo === 'produto').length} peça(s) serão devolvidas ao estoque automaticamente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(osParaCancelar.valorPago || 0) > 0 && (
                            <div className="mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl shrink-0">payments</span>
                                    <div>
                                        <p className="font-bold text-blue-800 dark:text-blue-300 mb-1">Impacto Financeiro</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-400">
                                            Esta OS possui R$ {(osParaCancelar.valorPago || 0).toFixed(2).replace('.', ',')} já pago.
                                            Os valores <strong>NÃO</strong> serão estornados automaticamente.
                                            Gerencie manualmente no módulo Financeiro se necessário.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                                Motivo do cancelamento
                            </label>
                            <textarea
                                value={motivoCancelamento}
                                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMotivoCancelamento(e.target.value)}
                                className="input w-full"
                                rows={3}
                                placeholder="Descreva o motivo..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowConfirmarCancelamento(false);
                                    setOsParaCancelar(null);
                                    setMotivoCancelamento('');
                                }}
                                className="btn-secondary flex-1"
                                disabled={processandoCancelamento}
                            >
                                Voltar
                            </button>
                            <button
                                onClick={confirmarCancelamento}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all"
                                disabled={processandoCancelamento}
                            >
                                {processandoCancelamento ? (
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                ) : (
                                    <span className="material-symbols-outlined">cancel</span>
                                )}
                                Cancelar OS
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanbanOS;
