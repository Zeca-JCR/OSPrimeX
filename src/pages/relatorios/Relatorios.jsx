import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import storage from '../../lib/storage';
import { formatCurrency, formatDate, parseDateLocal, toISODate } from '../../lib/utils';
// import { PDFDownloadLink } from '@react-pdf/renderer'; // Substituído por wrapper dinâmico
import PDFLinkWrapper from '../../components/pdf/PDFLinkWrapper';
// import { RelatorioDocument } from '../../components/pdf/RelatorioDocument'; // Importado dinamicamente no wrapper
import { FaturamentoChart, FinanceiroChart, DistributionChart } from '../../components/relatorios/RelatoriosCharts';
import RelatorioComparativo from '../../components/relatorios/RelatorioComparativo';

const Relatorios = ({ isTabMode, onClose }) => {
    const { empresa } = useAuth();
    const [loading, setLoading] = useState(true);
    const [tipoRelatorio, setTipoRelatorio] = useState('faturamento');
    const [periodo, setPeriodo] = useState('mes');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');

    const [ordens, setOrdens] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [lancamentos, setLancamentos] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [usuarios, setUsuarios] = useState([]); // This allows us to keep 'usuarios' state variable name but fill it with collaborators to minimize refactor
    const [filtroTecnico, setFiltroTecnico] = useState('');

    useEffect(() => {
        carregarDados();
        configurarPeriodoPadrao();
    }, [empresa]);

    const configurarPeriodoPadrao = () => {
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        setDataFim(toISODate(hoje));
        setDataInicio(toISODate(inicioMes));
    };

    const carregarDados = async () => {
        if (!empresa) return;
        try {
            const [ordensData, clientesData, lancamentosData, produtosData, colaboradoresData] = await Promise.all([
                storage.getAll('ordens_servico', empresa.id),
                storage.getAll('clientes', empresa.id),
                storage.getAll('lancamentos_financeiros', empresa.id),
                storage.getAll('produtos', empresa.id),
                storage.getAll('colaboradores', empresa.id),
            ]);
            setOrdens(ordensData);
            setClientes(clientesData);
            setLancamentos(lancamentosData.filter((l) => l.ativo));
            setProdutos(produtosData.filter((p) => p.ativo));
            setUsuarios(colaboradoresData.filter(c => c.ativo !== false));
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtrar por período
    const filtrarPorPeriodo = (items, campoData = 'criadoEm') => {
        if (!dataInicio || !dataFim) return items;

        const inicio = parseDateLocal(dataInicio);
        const fim = parseDateLocal(dataFim);

        // Ajustar hora do fim para 23:59:59
        fim.setHours(23, 59, 59, 999);

        return items.filter((item) => {
            let val;
            if (typeof campoData === 'function') {
                val = campoData(item);
            } else {
                val = item[campoData] || item.data;
            }

            if (!val) return false;
            const data = parseDateLocal(val);
            return data >= inicio && data <= fim;
        });
    };

    // Filtrar por técnico (apenas para itens que possuem tecnicoId, como OS)
    const filtrarPorTecnico = (items) => {
        if (!filtroTecnico) return items;
        return items.filter(item => item.tecnicoId === filtroTecnico);
    };

    // Aplicar período preset
    const aplicarPeriodo = (preset) => {
        setPeriodo(preset);
        const hoje = new Date();
        let inicio = new Date();

        switch (preset) {
            case 'hoje':
                inicio = new Date(hoje);
                break;
            case 'semana':
                inicio.setDate(hoje.getDate() - 7);
                break;
            case 'mes':
                inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                break;
            case 'trimestre':
                inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
                break;
            case 'ano':
                inicio = new Date(hoje.getFullYear(), 0, 1);
                break;
            default:
                return;
        }

        setDataInicio(toISODate(inicio));
        setDataFim(toISODate(hoje));
    };

    // === RELATÓRIOS ===

    const getRelatorioFaturamento = () => {
        // Para faturamento, consideramos a data de finalização real se disponível
        let ordensFiltradas = filtrarPorPeriodo(ordens, (o) => o.execucaoFinalizadaEm || o.atualizadoEm || o.criadoEm);
        ordensFiltradas = filtrarPorTecnico(ordensFiltradas);
        const finalizadas = ordensFiltradas.filter((o) => o.status === 'finalizada');

        const totalFaturado = finalizadas.reduce((sum, o) => sum + (o.valorTotal || 0), 0);
        const ticketMedio = finalizadas.length > 0 ? totalFaturado / finalizadas.length : 0;

        // Agrupar por dia
        const porDia = {};
        finalizadas.forEach((o) => {
            const dataRef = o.execucaoFinalizadaEm || o.atualizadoEm || o.criadoEm;
            const dia = formatDate(dataRef);
            if (!porDia[dia]) porDia[dia] = 0;
            porDia[dia] += o.valorTotal || 0;
        });

        // Formatar para gráfico
        const dataChart = Object.entries(porDia)
            .sort((a, b) => new Date(a[0].split('/').reverse().join('-')) - new Date(b[0].split('/').reverse().join('-')))
            .map(([dia, valor]) => ({ name: dia, valor }));

        return { totalFaturado, ticketMedio, qtdOS: finalizadas.length, porDia, dataChart };
    };

    // OS por Status
    const getRelatorioOSStatus = () => {
        let ordensFiltradas = filtrarPorPeriodo(ordens, (o) => {
            if (o.status === 'finalizada') {
                return o.execucaoFinalizadaEm || o.atualizadoEm || o.criadoEm;
            }
            return o.criadoEm;
        });
        ordensFiltradas = filtrarPorTecnico(ordensFiltradas);

        const porStatus = {
            aberta: ordensFiltradas.filter((o) => o.status === 'aberta').length,
            execucao: ordensFiltradas.filter((o) => o.status === 'execucao').length,
            finalizada: ordensFiltradas.filter((o) => o.status === 'finalizada').length,
            cancelada: ordensFiltradas.filter((o) => o.status === 'cancelada').length,
        };

        const total = ordensFiltradas.length;

        const dataChart = Object.entries(porStatus).map(([status, value]) => {
            const labelMap = {
                aberta: 'Aprovada (Não Iniciada)',
                execucao: 'Em Execução',
                finalizada: 'Finalizada',
                cancelada: 'Cancelada'
            };
            return {
                name: labelMap[status] || status.toUpperCase(),
                value,
                color: status === 'finalizada' ? '#22c55e' : status === 'aberta' ? '#3b82f6' : status === 'execucao' ? '#eab308' : '#ef4444'
            };
        });

        return { porStatus, total, dataChart };
    };

    // Clientes
    const getRelatorioClientes = () => {
        // Clientes atendidos no período (considerando data da OS finalizada/atualizada)
        let ordensFiltradas = filtrarPorPeriodo(ordens, (o) => o.execucaoFinalizadaEm || o.atualizadoEm || o.criadoEm);
        ordensFiltradas = filtrarPorTecnico(ordensFiltradas);

        // Top clientes por valor
        const porCliente = {};
        ordensFiltradas.filter((o) => o.status === 'finalizada').forEach((o) => {
            if (!porCliente[o.clienteId]) {
                porCliente[o.clienteId] = { qtd: 0, valor: 0 };
            }
            porCliente[o.clienteId].qtd++;
            porCliente[o.clienteId].valor += o.valorTotal || 0;
        });

        const topClientes = Object.entries(porCliente)
            .map(([id, dados]) => {
                const cliente = clientes.find((c) => c.id === id);
                return { id, nome: cliente?.nome || 'Cliente', ...dados };
            })
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 10);

        const totalClientes = clientes.filter((c) => c.ativo).length;
        const clientesAtendidos = Object.keys(porCliente).length;

        return { topClientes, totalClientes, clientesAtendidos };
    };

    // Financeiro
    const getRelatorioFinanceiro = () => {
        const lancamentosFiltrados = filtrarPorPeriodo(lancamentos, 'data');
        // NOTA: Lançamentos financeiros geralmente não têm técnico vinculado diretamente,
        // então não aplicamos filtrarPorTecnico aqui a menos que o schema mude.

        const receitas = lancamentosFiltrados
            .filter((l) => l.tipo === 'receita')
            .reduce((sum, l) => sum + (l.valor || 0), 0);

        const despesas = lancamentosFiltrados
            .filter((l) => l.tipo === 'despesa')
            .reduce((sum, l) => sum + (l.valor || 0), 0);

        const saldo = receitas - despesas;

        // Por categoria
        const receitasPorCategoria = {};
        const despesasPorCategoria = {};

        lancamentosFiltrados.forEach((l) => {
            const cat = l.categoria || 'outro';
            if (l.tipo === 'receita') {
                receitasPorCategoria[cat] = (receitasPorCategoria[cat] || 0) + l.valor;
            } else {
                despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + l.valor;
            }
        });

        // Chart Data
        const chartReceitas = Object.entries(receitasPorCategoria).map(([name, value]) => ({ name, value }));
        const chartDespesas = Object.entries(despesasPorCategoria).map(([name, value]) => ({ name, value }));
        const chartComparativo = [{ name: 'Total', Receitas: receitas, Despesas: despesas }];

        return {
            receitas, despesas, saldo, receitasPorCategoria, despesasPorCategoria,
            chartReceitas, chartDespesas, chartComparativo
        };
    };

    // Serviços mais vendidos
    const getRelatorioServicos = () => {
        // Serviços vendidos no período
        let ordensFiltradas = filtrarPorPeriodo(ordens, (o) => o.execucaoFinalizadaEm || o.atualizadoEm || o.criadoEm);
        ordensFiltradas = filtrarPorTecnico(ordensFiltradas);
        const finalizadas = ordensFiltradas.filter((o) => o.status === 'finalizada');

        const porProduto = {};
        finalizadas.forEach((o) => {
            (o.itens || []).forEach((item) => {
                if (!porProduto[item.produtoId]) {
                    porProduto[item.produtoId] = { nome: item.nome, tipo: item.tipo, qtd: 0, valor: 0 };
                }
                porProduto[item.produtoId].qtd += item.quantidade;
                porProduto[item.produtoId].valor += item.total;
            });
        });

        const topServicos = Object.values(porProduto)
            .filter((p) => p.tipo === 'servico')
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 10);

        const topProdutos = Object.values(porProduto)
            .filter((p) => p.tipo === 'produto')
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 10);

        return { topServicos, topProdutos };
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

    // Memoizar dados do relatório atual para passar para o PDF e evitar recálculos
    const dadosRelatorio = (() => {
        switch (tipoRelatorio) {
            case 'faturamento': return getRelatorioFaturamento();
            case 'os_status': return getRelatorioOSStatus();
            case 'clientes': return getRelatorioClientes();
            case 'financeiro': return getRelatorioFinanceiro();
            case 'servicos': return getRelatorioServicos();
            default: return {};
        }
    })();

    const relatorios = [
        { id: 'faturamento', label: 'Faturamento', icon: 'attach_money' },
        { id: 'os_status', label: 'OS por Status', icon: 'assignment' },
        { id: 'clientes', label: 'Clientes', icon: 'group' },
        { id: 'financeiro', label: 'Financeiro', icon: 'account_balance' },
        { id: 'servicos', label: 'Serviços/Produtos', icon: 'inventory_2' },
    ];

    return (
        <div className="p-4 lg:p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
                    Relatórios
                </h1>
                <p className="text-text-secondary-light dark:text-text-secondary-dark">
                    Análise de dados e indicadores
                </p>
            </div>

            {/* Filtros */}
            <div className="card p-4">
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Tipo de relatório */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Relatório
                        </label>
                        <select
                            value={tipoRelatorio}
                            onChange={(e) => setTipoRelatorio(e.target.value)}
                            className="input"
                        >
                            {relatorios.map((r) => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro Técnico */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Técnico Responsável
                        </label>
                        <select
                            value={filtroTecnico}
                            onChange={(e) => setFiltroTecnico(e.target.value)}
                            className="input"
                        >
                            <option value="">Todos</option>
                            {usuarios
                                .sort((a, b) => a.nome.localeCompare(b.nome))
                                .map((u) => (
                                    <option key={u.id} value={u.id}>{u.nome}</option>
                                ))}
                        </select>
                    </div>

                    {/* Período preset */}
                    <div className="flex gap-2">
                        {[
                            { value: 'hoje', label: 'Hoje' },
                            { value: 'semana', label: '7 dias' },
                            { value: 'mes', label: 'Mês' },
                            { value: 'trimestre', label: 'Trimestre' },
                            { value: 'ano', label: 'Ano' },
                        ].map((p) => (
                            <button
                                key={p.value}
                                onClick={() => aplicarPeriodo(p.value)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${periodo === p.value
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-text-light dark:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Datas customizadas */}
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={dataInicio}
                            onChange={(e) => { setDataInicio(e.target.value); setPeriodo('custom'); }}
                            className="input py-2"
                        />
                        <input
                            type="date"
                            value={dataFim}
                            onChange={(e) => { setDataFim(e.target.value); setPeriodo('custom'); }}
                            className="input py-2"
                        />
                    </div>

                    {/* Botões de Exportação */}
                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={() => {
                                const csvContent = "data:text/csv;charset=utf-8," + "Em breve CSV..."; // Simplificação
                                const encodedUri = encodeURI(csvContent);
                                window.open(encodedUri);
                            }}
                            className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                            title="Exportar CSV (Em breve)"
                        >
                            <span className="material-symbols-outlined text-lg">csv</span>
                            CSV
                        </button>

                        <PDFLinkWrapper
                            tipo={tipoRelatorio}
                            dados={dadosRelatorio}
                            empresa={empresa}
                            periodo={periodo}
                            fileName={`Relatorio_${tipoRelatorio}_${toISODate(new Date())}.pdf`}
                            className="btn-primary py-2 px-3 text-sm flex items-center gap-1"
                        >
                            {({ loading }) => (
                                <>
                                    <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                    {loading ? '...' : 'PDF'}
                                </>
                            )}
                        </PDFLinkWrapper>
                    </div>
                </div>
            </div>

            {/* Conteúdo do Relatório */}
            <div className="space-y-6">
                {/* Componente Comparativo (Novo) */}
                <RelatorioComparativo
                    ordens={ordens}
                    servicos={produtos}
                    ano={parseDateLocal(periodo === 'mes' || periodo === 'custom' ? dataInicio : new Date()).getFullYear()}
                    mes={parseDateLocal(periodo === 'mes' || periodo === 'custom' ? dataInicio : new Date()).getMonth()}
                    dataInicio={dataInicio}
                    dataFim={dataFim}
                />

                {tipoRelatorio === 'faturamento' && <RelatorioFaturamento dados={dadosRelatorio} />}
                {tipoRelatorio === 'os_status' && <RelatorioOSStatus dados={dadosRelatorio} />}
                {tipoRelatorio === 'clientes' && <RelatorioClientes dados={dadosRelatorio} />}
                {tipoRelatorio === 'financeiro' && <RelatorioFinanceiro dados={dadosRelatorio} />}
                {tipoRelatorio === 'servicos' && <RelatorioServicos dados={dadosRelatorio} />}
            </div>
        </div>
    );
};

// === COMPONENTES DE RELATÓRIO ===

const RelatorioFaturamento = ({ dados }) => {
    const { totalFaturado, ticketMedio, qtdOS, porDia, dataChart } = dados;

    return (
        <>
            {/* Cards resumo */}
            <div className="grid sm:grid-cols-3 gap-4">
                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                            <span className="material-symbols-outlined">attach_money</span>
                        </div>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Faturamento</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalFaturado)}</p>
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                            <span className="material-symbols-outlined">receipt</span>
                        </div>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Ticket Médio</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(ticketMedio)}</p>
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                            <span className="material-symbols-outlined">assignment_turned_in</span>
                        </div>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">OS Finalizadas</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{qtdOS}</p>
                </div>
            </div>

            {/* Histórico por dia */}
            {Object.keys(porDia).length > 0 && (
                <>
                    <div className="card p-5">
                        <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">Evolução de Faturamento</h3>
                        <FaturamentoChart data={dataChart} />
                    </div>

                    <div className="card p-5">
                        <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">Detalhamento</h3>
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                            {Object.entries(porDia)
                                .sort((a, b) => new Date(b[0].split('/').reverse().join('-')) - new Date(a[0].split('/').reverse().join('-')))
                                .map(([dia, valor]) => (
                                    <div key={dia} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                        <span className="text-text-light dark:text-text-dark">{dia}</span>
                                        <span className="font-bold text-green-600">{formatCurrency(valor)}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

const RelatorioOSStatus = ({ dados }) => {
    const { porStatus, total, dataChart } = dados;

    const statusConfig = [
        { key: 'aberta', label: 'Aprovadas (Não Iniciadas)', color: 'bg-blue-500' },
        { key: 'execucao', label: 'Em Execução', color: 'bg-yellow-500' },
        { key: 'finalizada', label: 'Finalizadas', color: 'bg-green-500' },
        { key: 'cancelada', label: 'Canceladas', color: 'bg-red-500' },
    ];

    return (
        <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-5 flex flex-col items-center justify-center">
                <h3 className="font-semibold text-text-light dark:text-text-dark mb-4 text-center w-full">Distribuição Visual</h3>
                <DistributionChart data={dataChart} />
            </div>

            <div className="card p-5">
                <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">
                    Total de OS: {total}
                </h3>

                <div className="space-y-4">
                    {statusConfig.map((status) => {
                        const qtd = porStatus[status.key] || 0;
                        const percent = total > 0 ? (qtd / total) * 100 : 0;

                        return (
                            <div key={status.key}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-text-light dark:text-text-dark">{status.label}</span>
                                    <span className="font-medium text-text-light dark:text-text-dark">
                                        {qtd} ({percent.toFixed(1)}%)
                                    </span>
                                </div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${status.color}`}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const RelatorioClientes = ({ dados }) => {
    const { topClientes, totalClientes, clientesAtendidos } = dados;

    return (
        <>
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                            <span className="material-symbols-outlined">group</span>
                        </div>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Total de Clientes</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{totalClientes}</p>
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                            <span className="material-symbols-outlined">person_check</span>
                        </div>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Atendidos no Período</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{clientesAtendidos}</p>
                </div>
            </div>

            {topClientes.length > 0 && (
                <div className="card p-5">
                    <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">Top 10 Clientes por Faturamento</h3>
                    <div className="space-y-3">
                        {topClientes.map((cliente, index) => (
                            <div key={cliente.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                    {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-text-light dark:text-text-dark truncate">{cliente.nome}</p>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{cliente.qtd} atendimentos</p>
                                </div>
                                <span className="font-bold text-green-600">{formatCurrency(cliente.valor)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

const RelatorioFinanceiro = ({ dados }) => {
    const { receitas, despesas, saldo, receitasPorCategoria, despesasPorCategoria, chartComparativo, chartReceitas, chartDespesas } = dados;

    const categoriasLabels = {
        servico: 'Serviços',
        venda: 'Vendas',
        outro: 'Outros',
        fornecedor: 'Fornecedores',
        aluguel: 'Aluguel',
        energia: 'Energia',
        agua: 'Água',
        internet: 'Internet/Telefone',
        salario: 'Salários',
        manutencao: 'Manutenção',
    };

    return (
        <>
            <div className="grid sm:grid-cols-3 gap-4">
                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                            <span className="material-symbols-outlined">trending_up</span>
                        </div>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Receitas</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(receitas)}</p>
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                            <span className="material-symbols-outlined">trending_down</span>
                        </div>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Despesas</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(despesas)}</p>
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${saldo >= 0 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                            <span className="material-symbols-outlined">account_balance</span>
                        </div>
                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Saldo</span>
                    </div>
                    <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatCurrency(saldo)}
                    </p>
                </div>
            </div>

            <div className="card p-5 mb-4">
                <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">Comparativo Receitas x Despesas</h3>
                <FinanceiroChart data={chartComparativo} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                {Object.keys(receitasPorCategoria).length > 0 && (
                    <div className="card p-5">
                        <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">Receitas por Categoria</h3>
                        <div className="h-[200px] mb-4">
                            <DistributionChart data={chartReceitas} />
                        </div>
                        <div className="space-y-2">
                            {Object.entries(receitasPorCategoria)
                                .sort((a, b) => b[1] - a[1])
                                .map(([cat, valor]) => (
                                    <div key={cat} className="flex justify-between p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                                        <span className="text-text-light dark:text-text-dark">{categoriasLabels[cat] || cat}</span>
                                        <span className="font-bold text-green-600">{formatCurrency(valor)}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {Object.keys(despesasPorCategoria).length > 0 && (
                    <div className="card p-5">
                        <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">Despesas por Categoria</h3>
                        <div className="h-[200px] mb-4">
                            <DistributionChart data={chartDespesas} />
                        </div>
                        <div className="space-y-2">
                            {Object.entries(despesasPorCategoria)
                                .sort((a, b) => b[1] - a[1])
                                .map(([cat, valor]) => (
                                    <div key={cat} className="flex justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                                        <span className="text-text-light dark:text-text-dark">{categoriasLabels[cat] || cat}</span>
                                        <span className="font-bold text-red-600">{formatCurrency(valor)}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

const RelatorioServicos = ({ dados }) => {
    const { topServicos, topProdutos } = dados;

    return (
        <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5">
                <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">Top Serviços</h3>
                {topServicos.length === 0 ? (
                    <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm">Nenhum serviço no período</p>
                ) : (
                    <div className="space-y-2">
                        {topServicos.map((item, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 text-xs font-bold">
                                    {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-text-light dark:text-text-dark truncate">{item.nome}</p>
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{item.qtd}x vendido</p>
                                </div>
                                <span className="font-bold text-green-600">{formatCurrency(item.valor)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="card p-5">
                <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">Top Produtos</h3>
                {topProdutos.length === 0 ? (
                    <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm">Nenhum produto no período</p>
                ) : (
                    <div className="space-y-2">
                        {topProdutos.map((item, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xs font-bold">
                                    {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-text-light dark:text-text-dark truncate">{item.nome}</p>
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{item.qtd}x vendido</p>
                                </div>
                                <span className="font-bold text-blue-600">{formatCurrency(item.valor)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Relatorios;
