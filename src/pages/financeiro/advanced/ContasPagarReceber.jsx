import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import storage from '../../../lib/storage';
import { formatCurrency, formatDate, toISODate } from '../../../lib/utils';
import LancamentoModal from '../../../components/financeiro/LancamentoModal';

const ContasPagarReceber = () => {
    const { empresa } = useAuth();
    const { showToast } = useToast();
    const [itens, setItens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [tipoLancamento, setTipoLancamento] = useState('despesa'); // despesa (pagar) ou receita (receber)
    const [filtroPeriodo, setFiltroPeriodo] = useState('mes'); // mes, semana, todos

    useEffect(() => {
        carregarDados();
    }, [empresa]);

    const carregarDados = async () => {
        if (!empresa) return;
        setLoading(true);
        try {
            const data = await storage.getAll('lancamentos_financeiros', empresa.id);
            // Filtrar apenas pendentes
            setItens(data.filter((l) => l.ativo && l.status === 'pendente'));
        } catch (error) {
            console.error('Erro ao carregar contas:', error);
            showToast('Erro ao carregar contas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBaixar = async (item) => {
        if (window.confirm(`Confirmar baixa de: ${item.descricao}?`)) {
            try {
                await storage.update('lancamentos_financeiros', item.id, {
                    status: 'pago',
                    data: toISODate(new Date()) // Data da baixa = hoje
                });
                showToast('Lançamento baixado com sucesso!', 'success');
                carregarDados();
            } catch (error) {
                console.error('Erro ao baixar lançamento:', error);
                showToast('Erro ao realizar baixa', 'error');
            }
        }
    };

    const handleExcluir = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
            try {
                await storage.softDelete('lancamentos_financeiros', id);
                showToast('Agendamento excluído com sucesso!', 'success');
                carregarDados();
            } catch (error) {
                console.error('Erro ao excluir:', error);
                showToast('Erro ao excluir', 'error');
            }
        }
    };

    const handleNovo = (tipo) => {
        setTipoLancamento(tipo);
        setShowModal(true);
    };

    const getItensFiltrados = () => {
        const agora = new Date();
        const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
        const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

        return itens.filter(item => {
            const dataVenc = new Date(item.dataVencimento || item.data);
            if (filtroPeriodo === 'mes') {
                return dataVenc >= inicioMes && dataVenc <= fimMes;
            }
            if (filtroPeriodo === 'todos') return true;
            return true;
        }).sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));
    };

    const itensFiltrados = getItensFiltrados();

    const totalPagar = itensFiltrados
        .filter(i => i.tipo === 'despesa')
        .reduce((sum, i) => sum + (i.valor || 0), 0);

    const totalReceber = itensFiltrados
        .filter(i => i.tipo === 'receita')
        .reduce((sum, i) => sum + (i.valor || 0), 0);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Resumo Rápido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-4 border-l-4 border-red-500">
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark font-medium">
                        A Pagar (Este mês)
                    </p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(totalPagar)}
                    </p>
                </div>
                <div className="card p-4 border-l-4 border-green-500">
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark font-medium">
                        A Receber (Este mês)
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(totalReceber)}
                    </p>
                </div>
            </div>

            {/* Ações e Filtros */}
            <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
                <div className="flex gap-2">
                    <button
                        onClick={() => handleNovo('despesa')}
                        className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 py-2 px-4 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">schedule</span>
                        Agendar Pagamento
                    </button>
                    <button
                        onClick={() => handleNovo('receita')}
                        className="btn-secondary text-green-600 border-green-200 hover:bg-green-50 dark:border-green-900/50 dark:text-green-400 dark:hover:bg-green-900/20 py-2 px-4 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">schedule</span>
                        Agendar Recebimento
                    </button>
                </div>

                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                        onClick={() => setFiltroPeriodo('mes')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filtroPeriodo === 'mes'
                            ? 'bg-white dark:bg-gray-700 shadow text-primary'
                            : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light'
                            }`}
                    >
                        Este Mês
                    </button>
                    <button
                        onClick={() => setFiltroPeriodo('todos')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filtroPeriodo === 'todos'
                            ? 'bg-white dark:bg-gray-700 shadow text-primary'
                            : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light'
                            }`}
                    >
                        Todos
                    </button>
                </div>
            </div>

            {/* Lista de Contas */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Vencimento</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Descrição</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Categoria</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Valor</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {itensFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-text-secondary-light dark:text-text-secondary-dark">
                                        Nenhuma conta pendente para este período.
                                    </td>
                                </tr>
                            ) : (
                                itensFiltrados.map((item) => {
                                    const vencimento = new Date(item.dataVencimento || item.data);
                                    const hoje = new Date();
                                    hoje.setHours(0, 0, 0, 0);
                                    vencimento.setHours(0, 0, 0, 0);
                                    const atrasado = vencimento < hoje;

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className={`flex items-center gap-1.5 ${atrasado ? 'text-red-600 font-bold' : 'text-text-light dark:text-text-dark'}`}>
                                                    {atrasado && <span className="material-symbols-outlined text-sm">warning</span>}
                                                    {formatDate(item.dataVencimento || item.data)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${item.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                    <span className="text-sm font-medium text-text-light dark:text-text-dark">{item.descricao}</span>
                                                </div>
                                                {item.observacoes && (
                                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate max-w-[200px]">{item.observacoes}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs">
                                                    {item.categoria}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right text-sm font-bold ${item.tipo === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {formatCurrency(item.valor)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleBaixar(item)}
                                                        className="p-1.5 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 tooltip-trigger relative group"
                                                        title="Dar Baixa (Confirmar Pagamento)"
                                                    >
                                                        <span className="material-symbols-outlined">check_circle</span>
                                                        <span className="tooltip hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                                                            Dar Baixa
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleExcluir(item.id)}
                                                        className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 tooltip-trigger relative group"
                                                        title="Excluir Agendamento"
                                                    >
                                                        <span className="material-symbols-outlined">delete</span>
                                                        <span className="tooltip hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                                                            Excluir
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <LancamentoModal
                    tipo={tipoLancamento}
                    empresaId={empresa?.id}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false);
                        carregarDados();
                        showToast('Agendamento salvo com sucesso!', 'success');
                    }}
                    defaultStatus="pendente"
                />
            )}
        </div>
    );
};

export default ContasPagarReceber;
