import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import storage from '../../lib/storage';
import { formatCurrency, formatDate, parseDateLocal } from '../../lib/utils';
import LancamentoModal from '../../components/financeiro/LancamentoModal';
import { LancamentoFinanceiro, CategoriaFinanceira, OrdemServico } from '../../types';

interface DashboardFinanceiroProps {
    isTabMode?: boolean;
    onClose?: () => void;
    autoOpenLancamento?: boolean;
    autoOpenTimestamp?: number;
}

interface CategoriaMap {
    [key: string]: CategoriaFinanceira;
}

const DashboardFinanceiro = ({ autoOpenLancamento, autoOpenTimestamp, isTabMode, onClose }: DashboardFinanceiroProps) => {
    const { empresa } = useAuth();
    const { openTab } = useTabs();
    const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [tipoLancamento, setTipoLancamento] = useState<'receita' | 'despesa'>('receita');
    const [periodo, setPeriodo] = useState<'mes' | 'semana' | 'hoje'>('mes'); // mes, semana, hoje

    const [categoriasMap, setCategoriasMap] = useState<CategoriaMap>({});

    useEffect(() => {
        carregarDados();
    }, [empresa]);

    // Efeito para abrir modal de lançamento automaticamente (via Ação Rápida)
    useEffect(() => {
        if (!loading && autoOpenLancamento && autoOpenTimestamp) {
            handleNovoLancamento('receita');
        }
    }, [loading, autoOpenTimestamp]);

    const carregarDados = async () => {
        if (!empresa) return;
        try {
            const [lancamentosData, categoriasData] = await Promise.all([
                storage.getAll<LancamentoFinanceiro>('lancamentos_financeiros', empresa.id),
                storage.getAll<CategoriaFinanceira>('categorias_financeiras', empresa.id)
            ]);

            // Filtrar apenas lançamentos ativos e realizados (não pendentes)
            setLancamentos(lancamentosData.filter((l) => l.ativo && l.status !== 'pendente'));

            // Criar mapa de categorias para acesso rápido ao ícone
            const map: CategoriaMap = {};
            categoriasData.forEach(c => {
                map[c.nome] = c;
            });
            setCategoriasMap(map);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtrar por período
    const getLancamentosFiltrados = () => {
        const agora = new Date();
        let dataInicio = new Date();

        switch (periodo) {
            case 'hoje':
                dataInicio.setHours(0, 0, 0, 0);
                break;
            case 'semana':
                dataInicio.setDate(agora.getDate() - 7);
                break;
            case 'mes':
            default:
                dataInicio.setMonth(agora.getMonth(), 1);
                dataInicio.setHours(0, 0, 0, 0);
                break;
        }

        return lancamentos.filter((l) => {
            const dataLancamento = parseDateLocal(l.data || l.criadoEm);
            if (!dataLancamento) return false;
            return dataLancamento.getTime() >= dataInicio.getTime();
        });
    };

    const lancamentosFiltrados = getLancamentosFiltrados();

    // Calcular totais
    const receitas = lancamentosFiltrados
        .filter((l) => l.tipo === 'receita')
        .reduce((sum, l) => sum + (l.valor || 0), 0);

    const despesas = lancamentosFiltrados
        .filter((l) => l.tipo === 'despesa')
        .reduce((sum, l) => sum + (l.valor || 0), 0);

    const saldo = receitas - despesas;

    const handleNovoLancamento = (tipo: 'receita' | 'despesa') => {
        setTipoLancamento(tipo);
        setShowModal(true);
    };

    const handleSave = () => {
        setShowModal(false);
        carregarDados();
    };

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
            {/* Header - estilo Stitch */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
                        Financeiro
                    </h1>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        Receitas e despesas
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => openTab({
                            id: 'financeiro_avancado',
                            type: 'financeiro_avancado',
                            title: 'Financeiro Avançado',
                            data: {}
                        })}
                        className="btn-secondary py-2 px-4 text-sm flex items-center gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
                    >
                        <span className="material-symbols-outlined text-lg">diamond</span>
                        Avançado
                    </button>
                    <button
                        onClick={() => handleNovoLancamento('receita')}
                        className="btn-primary py-2 px-4 text-sm"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Receita
                    </button>
                    <button
                        onClick={() => handleNovoLancamento('despesa')}
                        className="btn-secondary py-2 px-4 text-sm"
                    >
                        <span className="material-symbols-outlined text-lg">remove</span>
                        Despesa
                    </button>
                </div>
            </div>

            {/* Filtro de período - compacto */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="card p-2 inline-flex gap-1">
                    {(['hoje', 'semana', 'mes'] as const).map((periodoOption) => {
                        const label = periodoOption === 'hoje' ? 'Hoje' : periodoOption === 'semana' ? '7 dias' : 'Mês';
                        return (
                            <button
                                key={periodoOption}
                                onClick={() => setPeriodo(periodoOption)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${periodo === periodoOption
                                    ? 'bg-primary text-white'
                                    : 'text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                {label}
                            </button>
                        )
                    })}
                </div>

                <Link
                    to="/financeiro/comissoes"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                    <span className="material-symbols-outlined text-lg">payments</span>
                    Ver Comissões
                </Link>
            </div>

            {/* Cards de resumo - compactos estilo Stitch */}
            <div className="grid grid-cols-3 gap-3">
                <div className="card p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-lg text-green-500">trending_up</span>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Receitas</span>
                    </div>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(receitas)}
                    </p>
                </div>
                <div className="card p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-lg text-red-500">trending_down</span>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Despesas</span>
                    </div>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(despesas)}
                    </p>
                </div>
                <div className="card p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`material-symbols-outlined text-lg ${saldo >= 0 ? 'text-blue-500' : 'text-red-500'}`}>account_balance</span>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Saldo</span>
                    </div>
                    <p className={`text-lg font-bold ${saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>
                        {formatCurrency(saldo)}
                    </p>
                </div>
            </div>

            {/* Fluxo de Caixa Projetado */}
            <FluxoCaixaProjetado empresaId={empresa?.id} />

            {/* Lista de lançamentos */}
            <div>
                <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
                    Lançamentos Recentes
                </h2>

                {lancamentosFiltrados.length === 0 ? (
                    <div className="card p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-gray-400">payments</span>
                        </div>
                        <p className="text-text-light dark:text-text-dark font-medium mb-2">
                            Nenhum lançamento no período
                        </p>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                            Registre receitas e despesas para acompanhar seu fluxo de caixa.
                        </p>
                    </div>
                ) : (
                    <div className="card divide-y divide-[var(--color-border-light)] dark:divide-[var(--color-border-dark)]">
                        {lancamentosFiltrados
                            .sort((a, b) => new Date(b.data || b.criadoEm || 0).getTime() - new Date(a.data || a.criadoEm || 0).getTime())
                            .slice(0, 20)
                            .map((lancamento) => {
                                const isReceita = lancamento.tipo === 'receita';
                                const categoriaInfo = lancamento.categoria ? categoriasMap[lancamento.categoria] : undefined;
                                const icone = categoriaInfo?.icone || (isReceita ? 'add' : 'remove');
                                const corIcone = categoriaInfo?.cor; // Opcional: usar a cor da categoria se desejar

                                return (
                                    <div key={lancamento.id} className="p-4 flex items-center gap-4">
                                        <div
                                            className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${isReceita
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}
                      `}
                                            style={corIcone ? { backgroundColor: `${corIcone}20`, color: corIcone } : {}}
                                        >
                                            <span className="material-symbols-outlined">
                                                {icone}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-text-light dark:text-text-dark truncate">
                                                {lancamento.descricao}
                                            </p>
                                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                                {lancamento.categoria} • {formatDate(lancamento.data || lancamento.criadoEm)}
                                            </p>
                                        </div>
                                        <p className={`font-bold ${isReceita ? 'text-green-600' : 'text-red-600'}`}>
                                            {isReceita ? '+' : '-'}{formatCurrency(lancamento.valor)}
                                        </p>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {
                showModal && (
                    <LancamentoModal
                        tipo={tipoLancamento}
                        empresaId={empresa?.id}
                        onClose={() => setShowModal(false)}
                        onSave={handleSave}
                        defaultStatus="pago"
                    />
                )
            }
        </div >
    );
};

// Componente de Fluxo de Caixa Projetado
interface FluxoCaixaProjetadoProps {
    empresaId?: string;
}

const FluxoCaixaProjetado = ({ empresaId }: FluxoCaixaProjetadoProps) => {
    const [projecao, setProjecao] = useState({
        receitasProjetadas: 0,
        despesasProjetadas: 0,
        osAbertas: 0,
        contasPendentes: 0,
    });
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        calcularProjecao();
    }, [empresaId]);

    const calcularProjecao = async () => {
        if (!empresaId) return;

        try {
            // Buscar OS abertas/em execução (receitas previstas)
            const ordensServico = await storage.getAll<OrdemServico>('ordens_servico', empresaId);
            const osAtivas = ordensServico.filter(os =>
                os.ativo &&
                ['aberta', 'execucao', 'aguardando_peca', 'orcamento'].includes(os.status)
            );

            // Somar valor total das OS não finalizadas (receitas projetadas)
            const receitasProjetadas = osAtivas.reduce((sum, os) => {
                // Desconsiderar já pago
                const pago = (os.pagamentos || []).reduce((s, p) => s + (p.valor || 0), 0);
                return sum + Math.max(0, (os.valorTotal || 0) - pago);
            }, 0);

            // Buscar despesas pendentes (lançamentos futuros)
            const lancamentos = await storage.getAll<LancamentoFinanceiro>('lancamentos_financeiros', empresaId);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const despesasFuturas = lancamentos.filter(l =>
                l.ativo &&
                l.tipo === 'despesa' &&
                l.status === 'pendente' &&
                parseDateLocal(l.dataVencimento || l.data) >= hoje
            );

            const despesasProjetadas = despesasFuturas.reduce((sum, l) => sum + (l.valor || 0), 0);

            setProjecao({
                receitasProjetadas,
                despesasProjetadas,
                osAbertas: osAtivas.length,
                contasPendentes: despesasFuturas.length,
            });
        } catch (error) {
            console.error('Erro ao calcular projeção:', error);
        } finally {
            setLoading(false);
        }
    };

    const saldoProjetado = projecao.receitasProjetadas - projecao.despesasProjetadas;

    if (loading) return null;

    // Só mostrar se tiver algo projetado
    if (projecao.receitasProjetadas === 0 && projecao.despesasProjetadas === 0) return null;

    return (
        <div className="card p-4 border-l-4 border-purple-500">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <span className="material-symbols-outlined">trending_up</span>
                    </div>
                    <div>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                            Fluxo de Caixa Projetado
                        </p>
                        <p className={`text-lg font-bold ${saldoProjetado >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600'}`}>
                            {saldoProjetado >= 0 ? '+' : ''}{formatCurrency(saldoProjetado)}
                        </p>
                    </div>
                </div>
                <span className={`material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark transition-transform ${expanded ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </div>

            {expanded && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] space-y-3">
                    {/* Receitas Projetadas */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-sm text-text-light dark:text-text-dark">
                                Receitas Previstas
                            </span>
                            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                ({projecao.osAbertas} OS)
                            </span>
                        </div>
                        <span className="font-medium text-green-600 dark:text-green-400">
                            +{formatCurrency(projecao.receitasProjetadas)}
                        </span>
                    </div>

                    {/* Despesas Projetadas */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="text-sm text-text-light dark:text-text-dark">
                                Despesas Previstas
                            </span>
                            {projecao.contasPendentes > 0 && (
                                <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                    ({projecao.contasPendentes} contas)
                                </span>
                            )}
                        </div>
                        <span className="font-medium text-red-600 dark:text-red-400">
                            -{formatCurrency(projecao.despesasProjetadas)}
                        </span>
                    </div>

                    {/* Explicação */}
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark pt-2">
                        💡 Projeção baseada em OS aprovadas/em execução e contas a pagar.
                    </p>
                </div>
            )}
        </div>
    );
};

export default DashboardFinanceiro;

