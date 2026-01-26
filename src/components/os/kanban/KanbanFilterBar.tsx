import React from 'react';
import { FiltroKanban } from '../../../pages/os/KanbanOS';

interface KanbanFilterBarProps {
    filtroAtivo: FiltroKanban;
    updateFiltro: (chave: keyof FiltroKanban, valor: any) => void;
    handlePeriodoChange: (periodo: string) => void;
    visualizacao: 'kanban' | 'lista';
    colunas: Array<{ id: string; label: string }>;
    ordensFiltradas: any[]; // Using any array to represent filtered items count doesn't strict type
}

export const KanbanFilterBar: React.FC<KanbanFilterBarProps> = ({
    filtroAtivo,
    updateFiltro,
    handlePeriodoChange,
    visualizacao,
    colunas,
    ordensFiltradas
}) => {
    return (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
            {/* Busca */}
            <div className="relative flex-1 max-w-xs">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark text-lg">search</span>
                <input
                    type="text"
                    value={filtroAtivo.busca}
                    onChange={(e) => updateFiltro('busca', e.target.value)}
                    placeholder="Buscar por número, cliente, placa..."
                    className="input pl-10 py-2 text-sm"
                />
            </div>

            {/* Filtro de Data Avançado */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto max-w-2xl no-scrollbar">
                {/* Botões de Período */}
                <div className="flex items-center gap-1 shrink-0">
                    {['hoje', '7dias', 'mes', 'trimestre', 'ano'].map((p) => (
                        <button
                            key={p}
                            onClick={() => handlePeriodoChange(p)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${filtroAtivo.periodo === p
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {p === 'hoje' && 'Hoje'}
                            {p === '7dias' && '7 dias'}
                            {p === 'mes' && 'Mês'}
                            {p === 'trimestre' && 'Trimestre'}
                            {p === 'ano' && 'Ano'}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0" />

                {/* Inputs de Data */}
                <div className="flex items-center gap-2 shrink-0">
                    <input
                        type="date"
                        value={filtroAtivo.dataInicio}
                        onChange={(e) => {
                            updateFiltro('dataInicio', e.target.value);
                            updateFiltro('periodo', 'custom');
                        }}
                        className="input py-2 px-2 text-sm w-32"
                        title="Data Início"
                        placeholder="Início"
                    />
                    <span className="text-text-secondary-light dark:text-text-secondary-dark text-xs">até</span>
                    <input
                        type="date"
                        value={filtroAtivo.dataFim}
                        onChange={(e) => {
                            updateFiltro('dataFim', e.target.value);
                            updateFiltro('periodo', 'custom');
                        }}
                        className="input py-2 px-2 text-sm w-32"
                        title="Data Fim"
                        placeholder="Fim"
                    />
                </div>

                {/* Botão Limpar */}
                {(filtroAtivo.dataInicio || filtroAtivo.dataFim) && (
                    <button
                        onClick={() => handlePeriodoChange('todos')}
                        className="ml-1 p-1 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                        title="Limpar filtro de data"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                )}
            </div>

            {/* Filtro Status (Visível apenas na Lista) */}
            {visualizacao === 'lista' && (
                <select
                    value={filtroAtivo.status}
                    onChange={(e) => updateFiltro('status', e.target.value)}
                    className="input py-2 text-sm w-40"
                >
                    <option value="todos">Todos os status</option>
                    {colunas.map(col => (
                        <option key={col.id} value={col.id}>{col.label}</option>
                    ))}
                </select>
            )}

            {/* Filtro de Natureza da OS */}
            <select
                value={filtroAtivo.natureza}
                onChange={(e) => updateFiltro('natureza', e.target.value)}
                className="input py-2 text-sm w-36"
                title="Filtrar por natureza da OS"
            >
                <option value="todos">Todas naturezas</option>
                <option value="os">🔧 Manutenção</option>
                <option value="garantia">🛡️ Garantia</option>
                <option value="retorno">🔄 Retorno</option>
                <option value="cortesia">🎁 Cortesia</option>
                <option value="interna">🏢 Interna</option>
            </select>

            {/* Ordenação */}
            <select
                value={filtroAtivo.ordenacao}
                onChange={(e) => updateFiltro('ordenacao', e.target.value)}
                className="input py-2 text-sm w-40"
            >
                <option value="recente">Mais recentes</option>
                <option value="antigo">Mais antigas</option>
                <option value="numero">Por número</option>
                <option value="cliente">Por cliente</option>
            </select>

            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-auto">
                {ordensFiltradas.length} resultados
            </span>
        </div>
    );
};
