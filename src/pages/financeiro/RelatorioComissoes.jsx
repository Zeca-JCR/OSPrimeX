import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import storage from '../../lib/storage';
import { formatCurrency, formatDate } from '../../lib/utils';

const RelatorioComissoes = () => {
    const { empresa } = useAuth();
    const [comissoes, setComissoes] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [filtroTecnico, setFiltroTecnico] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('');
    const [filtroPeriodo, setFiltroPeriodo] = useState('mes');

    useEffect(() => {
        carregarDados();
    }, [empresa]);

    const carregarDados = async () => {
        if (!empresa) return;
        try {
            const [comissoesData, colaboradoresData, clientesData] = await Promise.all([
                storage.getAll('comissoes', empresa.id),
                storage.getAll('colaboradores', empresa.id),
                storage.getAll('clientes', empresa.id),
            ]);

            setComissoes(comissoesData.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)));
            setTecnicos(colaboradoresData.filter(c => c.ativo !== false));
            setClientes(clientesData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const marcarComoPago = async (comissaoId) => {
        if (!confirm('Marcar esta comissão como paga?')) return;
        try {
            await storage.update('comissoes', comissaoId, {
                status: 'pago',
                dataPagamento: new Date().toISOString()
            });
            carregarDados();
        } catch (error) {
            console.error('Erro ao atualizar comissão:', error);
        }
    };

    // Filtrar comissões por período
    const getDataInicio = () => {
        const hoje = new Date();
        switch (filtroPeriodo) {
            case 'hoje':
                return new Date(hoje.setHours(0, 0, 0, 0));
            case 'semana':
                const inicioSemana = new Date(hoje);
                inicioSemana.setDate(hoje.getDate() - hoje.getDay());
                return inicioSemana;
            case 'mes':
                return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            case 'ano':
                return new Date(hoje.getFullYear(), 0, 1);
            default:
                return null;
        }
    };

    const comissoesFiltradas = comissoes.filter(c => {
        // Filtro por técnico
        if (filtroTecnico && c.tecnicoId !== filtroTecnico) return false;

        // Filtro por status
        if (filtroStatus && c.status !== filtroStatus) return false;

        // Filtro por período
        const dataInicio = getDataInicio();
        if (dataInicio && new Date(c.criadoEm) < dataInicio) return false;

        return true;
    });

    // Calcular totais
    const totalPendente = comissoesFiltradas
        .filter(c => c.status === 'pendente')
        .reduce((sum, c) => sum + c.valorComissao, 0);

    const totalPago = comissoesFiltradas
        .filter(c => c.status === 'pago')
        .reduce((sum, c) => sum + c.valorComissao, 0);

    const getTecnicoNome = (id) => tecnicos.find(t => t.id === id)?.nome || 'N/A';
    const getClienteNome = (id) => clientes.find(c => c.id === id)?.nome || 'N/A';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-pulse-soft text-primary">
                    <span className="material-symbols-outlined text-5xl">sync</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-text-light dark:text-text-dark">
                        Comissões de Técnicos
                    </h1>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        {comissoesFiltradas.length} registros
                    </p>
                </div>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-2 gap-3">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">schedule</span>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Pendente</p>
                            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalPendente)}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Pago</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPago)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="card p-3">
                <div className="flex flex-wrap gap-2">
                    {/* Período */}
                    <select
                        value={filtroPeriodo}
                        onChange={(e) => setFiltroPeriodo(e.target.value)}
                        className="input py-2 px-3 text-sm"
                    >
                        <option value="hoje">Hoje</option>
                        <option value="semana">Esta Semana</option>
                        <option value="mes">Este Mês</option>
                        <option value="ano">Este Ano</option>
                        <option value="">Todo Período</option>
                    </select>

                    {/* Técnico */}
                    <select
                        value={filtroTecnico}
                        onChange={(e) => setFiltroTecnico(e.target.value)}
                        className="input py-2 px-3 text-sm flex-1 min-w-[150px]"
                    >
                        <option value="">Todos os Técnicos</option>
                        {tecnicos.map(t => (
                            <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                    </select>

                    {/* Status */}
                    <select
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="input py-2 px-3 text-sm"
                    >
                        <option value="">Todos</option>
                        <option value="pendente">Pendentes</option>
                        <option value="pago">Pagos</option>
                    </select>
                </div>
            </div>

            {/* Tabela */}
            <div className="card overflow-hidden">
                {comissoesFiltradas.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">payments</span>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark">
                            Nenhuma comissão encontrada
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                        Técnico
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider hidden sm:table-cell">
                                        OS
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider hidden md:table-cell">
                                        Valor OS
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                        Comissão
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {comissoesFiltradas.map((comissao, index) => (
                                    <tr
                                        key={comissao.id}
                                        className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${index !== comissoesFiltradas.length - 1 ? 'border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]' : ''
                                            }`}
                                    >
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-text-light dark:text-text-dark text-sm">
                                                {getTecnicoNome(comissao.tecnicoId)}
                                            </p>
                                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                                {formatDate(comissao.criadoEm)}
                                            </p>
                                        </td>
                                        <td className="py-3 px-4 hidden sm:table-cell">
                                            <span className="text-sm text-text-light dark:text-text-dark">
                                                #{comissao.osNumero || comissao.osId?.slice(-6)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 hidden md:table-cell">
                                            <span className="text-sm text-text-light dark:text-text-dark">
                                                {formatCurrency(comissao.valorOs)}
                                            </span>
                                            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-1">
                                                ({comissao.percentual}%)
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-bold text-primary">
                                                {formatCurrency(comissao.valorComissao)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${comissao.status === 'pago'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                }`}>
                                                {comissao.status === 'pago' ? 'Pago' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {comissao.status === 'pendente' && (
                                                <button
                                                    onClick={() => marcarComoPago(comissao.id)}
                                                    className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                    title="Marcar como pago"
                                                >
                                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RelatorioComissoes;
