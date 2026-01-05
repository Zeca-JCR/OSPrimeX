import React, { useState, useEffect } from 'react';
import { toISODate } from '../../lib/utils';

export const TimeTrackingSection = ({ os, onUpdate, onAddToBill }) => {
    const [isExpanded, setIsExpanded] = useState(false); // Default collapsed as per user preference
    const [novoApontamento, setNovoApontamento] = useState({
        data: toISODate(new Date()),
        inicio: '',
        fim: '',
        descricao: '',
        cobravel: true
    });

    const [editingId, setEditingId] = useState(null);

    // Calcular duração em (HH:MM) e Decimal
    const calcularDuracao = (inicio, fim) => {
        if (!inicio || !fim) return { texto: '00:00', decimal: 0 };

        const [h1, m1] = inicio.split(':').map(Number);
        const [h2, m2] = fim.split(':').map(Number);

        let minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (minutos < 0) minutos += 24 * 60; // Assumindo virada de dia (opcional, mas bom ter)

        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;

        const texto = `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        const decimal = Number((horas + (mins / 60)).toFixed(2));

        return { texto, decimal };
    };

    const handleAdd = () => {
        if (!novoApontamento.inicio || !novoApontamento.fim) {
            alert('Informe o horário de início e fim.');
            return;
        }

        const { texto, decimal } = calcularDuracao(novoApontamento.inicio, novoApontamento.fim);
        const apontamentosList = os.apontamentos || [];

        if (editingId) {
            // Edição
            const novosApontamentos = apontamentosList.map(apt =>
                apt.id === editingId
                    ? { ...apt, ...novoApontamento, duracao: texto, duracaoDecimal: decimal }
                    : apt
            );
            onUpdate({ apontamentos: novosApontamentos });
            setEditingId(null);
        } else {
            // Adição
            const novo = {
                id: `apt_${Date.now()}`,
                criadoEm: new Date().toISOString(),
                ...novoApontamento,
                duracao: texto,
                duracaoDecimal: decimal
            };
            const novosApontamentos = [...apontamentosList, novo];
            onUpdate({ apontamentos: novosApontamentos });
        }

        // Resetar form mas manter data
        setNovoApontamento(prev => ({
            ...prev,
            inicio: '',
            fim: '',
            descricao: '',
            cobravel: true
        }));
    };

    const handleEdit = (apt) => {
        setNovoApontamento({
            data: apt.data,
            inicio: apt.inicio,
            fim: apt.fim,
            descricao: apt.descricao || '',
            cobravel: apt.cobravel
        });
        setEditingId(apt.id);
        // Expandir se estiver fechado para ver o form
        if (!isExpanded) setIsExpanded(true);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNovoApontamento(prev => ({
            ...prev,
            inicio: '',
            fim: '',
            descricao: '',
            cobravel: true
        }));
    };

    const handleRemove = (id) => {
        if (!confirm('Remover este apontamento?')) return;
        const novosApontamentos = (os.apontamentos || []).filter(a => a.id !== id);
        onUpdate({ apontamentos: novosApontamentos });

        // Se estiver editando o item removido, cancela edição
        if (editingId === id) handleCancelEdit();
    };

    // Cálculos de Totais
    const apontamentos = os.apontamentos || [];

    const totalMinutosApontados = apontamentos.reduce((acc, apt) => acc + (apt.duracaoDecimal * 60), 0);
    const totalMinutosCobravel = apontamentos
        .filter(apt => apt.cobravel)
        .reduce((acc, apt) => acc + (apt.duracaoDecimal * 60), 0);

    const formatarHoras = (mins) => {
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const totalApontadoTexto = formatarHoras(totalMinutosApontados);
    const totalCobravelTexto = formatarHoras(totalMinutosCobravel);

    const totalApontadoDecimal = (totalMinutosApontados / 60).toFixed(2);
    const totalCobravelDecimal = (totalMinutosCobravel / 60).toFixed(2);

    const handleGerarCobranca = () => {
        onAddToBill(Number(totalCobravelDecimal));
    };

    return (
        <div className="card p-0 overflow-hidden border border-gray-200 dark:border-gray-700 mb-6 relative">
            {/* Header Colapsável */}
            <div
                className="bg-gray-50 dark:bg-gray-800/50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">schedule</span>
                    <h3 className="font-bold text-text-light dark:text-text-dark">Apontamento de Horas</h3>
                    {apontamentos.length > 0 && (
                        <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-text-secondary-light dark:text-text-secondary-dark">
                            {totalApontadoTexto}h
                        </span>
                    )}
                </div>
                <span className={`material-symbols-outlined transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </div>

            {isExpanded && (
                <div className="p-4 grid md:grid-cols-3 gap-6">
                    {/* Lado Esquerdo: Formulário de Adição */}
                    <div className="md:col-span-1 border-r border-gray-100 dark:border-gray-700 pr-6 space-y-4">
                        <h4 className="text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-3 flex items-center justify-between">
                            <span>{editingId ? 'Editar Apontamento' : 'Novo Apontamento'}</span>
                            {editingId && (
                                <button onClick={handleCancelEdit} className="text-xs text-red-500 hover:underline">
                                    Cancelar
                                </button>
                            )}
                        </h4>

                        <div>
                            <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">Data</label>
                            <input
                                type="date"
                                value={novoApontamento.data}
                                onChange={e => setNovoApontamento({ ...novoApontamento, data: e.target.value })}
                                className="input"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">Início</label>
                                <input
                                    type="time"
                                    value={novoApontamento.inicio}
                                    onChange={e => setNovoApontamento({ ...novoApontamento, inicio: e.target.value })}
                                    className="input text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">Fim</label>
                                <input
                                    type="time"
                                    value={novoApontamento.fim}
                                    onChange={e => setNovoApontamento({ ...novoApontamento, fim: e.target.value })}
                                    className="input text-center"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">Descrição (Opcional)</label>
                            <input
                                type="text"
                                value={novoApontamento.descricao}
                                onChange={e => setNovoApontamento({ ...novoApontamento, descricao: e.target.value })}
                                className="input"
                                placeholder="Ex: Diagnóstico motor"
                            />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <input
                                type="checkbox"
                                checked={novoApontamento.cobravel}
                                onChange={e => setNovoApontamento({ ...novoApontamento, cobravel: e.target.checked })}
                                className="w-4 h-4 text-primary rounded"
                            />
                            <span className="text-sm text-text-light dark:text-text-dark select-none">Cobrável (Faturar)</span>
                        </label>

                        <div className="flex gap-2">
                            {editingId && (
                                <button
                                    onClick={handleCancelEdit}
                                    className="btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                onClick={handleAdd}
                                className={`btn-primary flex-1 flex items-center justify-center gap-2 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                            >
                                <span className="material-symbols-outlined">{editingId ? 'save' : 'add_circle'}</span>
                                {editingId ? 'Salvar' : 'Adicionar'}
                            </button>
                        </div>
                    </div>

                    {/* Lado Direito: Lista e Totais */}
                    <div className="md:col-span-2 flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto max-h-[300px] mb-4">
                            {apontamentos.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <span className="material-symbols-outlined text-4xl mb-2">history_toggle_off</span>
                                    <p className="text-sm">Nenhum apontamento registrado.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase bg-gray-50 dark:bg-gray-800/30 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Data</th>
                                            <th className="px-3 py-2 text-left">Horário</th>
                                            <th className="px-3 py-2 text-center">Duração</th>
                                            <th className="px-3 py-2 text-left">Descrição</th>
                                            <th className="px-3 py-2 text-center">Cobrável</th>
                                            <th className="px-3 py-2 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {apontamentos.map((apt) => (
                                            <tr key={apt.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group ${editingId === apt.id ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                                <td className="px-3 py-2 text-text-light dark:text-text-dark whitespace-nowrap">
                                                    {new Date(apt.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-3 py-2 text-text-light dark:text-text-dark font-mono whitespace-nowrap">
                                                    {apt.inicio} - {apt.fim}
                                                </td>
                                                <td className="px-3 py-2 text-center font-bold text-text-light dark:text-text-dark">
                                                    {apt.duracao}
                                                </td>
                                                <td className="px-3 py-2 text-text-secondary-light dark:text-text-secondary-dark truncate max-w-[150px]" title={apt.descricao}>
                                                    {apt.descricao || '-'}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {apt.cobravel ? (
                                                        <span className="material-symbols-outlined text-green-500 text-lg" title="Sim">check</span>
                                                    ) : (
                                                        <span className="material-symbols-outlined text-gray-300 text-lg" title="Não">close</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(apt)}
                                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-blue-500"
                                                            title="Editar"
                                                            disabled={editingId === apt.id}
                                                        >
                                                            <span className="material-symbols-outlined text-lg">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemove(apt.id)}
                                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-red-500"
                                                            title="Remover"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer de Totais */}
                        <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex gap-6">
                                <div>
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Total Apontado</p>
                                    <p className="text-lg font-bold text-text-light dark:text-text-dark">
                                        {totalApontadoTexto} <span className="text-xs font-normal text-gray-400">({totalApontadoDecimal}h)</span>
                                    </p>
                                </div>
                                <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Total Cobrável</p>
                                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                        {totalCobravelTexto} <span className="text-xs font-normal opacity-80">({totalCobravelDecimal}h)</span>
                                    </p>
                                </div>
                            </div>

                            {Number(totalCobravelDecimal) > 0 && (
                                <button
                                    onClick={handleGerarCobranca}
                                    className="btn-secondary text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800 flex items-center gap-2"
                                    title="Gera um item de serviço com o total de horas cobráveis"
                                >
                                    <span className="material-symbols-outlined">monetization_on</span>
                                    Adicionar à Cobrança
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
