// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import storage from '../../lib/storage';
import { formatCurrency, formatDate, toISODate } from '../../lib/utils';
import { NovaOSModal } from '../../components/os/NovaOSModal';
import { AtribuirTecnicoModal } from '../../components/os/AtribuirTecnicoModal';
import { AtribuirPrismaModal } from '../../components/os/AtribuirPrismaModal';
import PlacaBadge from '../../components/common/PlacaBadge';

// Helper para emoji de cor
const getEmojiCor = (cor) => {
    switch (cor) {
        case 'Vermelho': return '🔴';
        case 'Azul': return '🔵';
        case 'Verde': return '🟢';
        case 'Amarelo': return '🟡';
        case 'Preto': return '⚫';
        case 'Laranja': return '🟠';
        default: return '⚪';
    }
}

const KanbanOS = ({ isTabMode, onClose, autoOpenNovaOS, autoOpenTimestamp }) => {
    const { empresa } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { openTab } = useTabs();

    // Função helper para abrir OS como aba
    const openOS = (osId) => {
        const os = ordens.find(o => o.id === osId);
        openTab({
            id: `os-${osId}`,
            type: 'os',
            title: `OS #${os?.numero || osId.slice(-4)}`,
            data: { osId }
        });
    };
    const [ordens, setOrdens] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);
    const [linksRastreaveis, setLinksRastreaveis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNovaOS, setShowNovaOS] = useState(false);
    const [showAtribuirTecnico, setShowAtribuirTecnico] = useState(false);
    const [showAtribuirPrisma, setShowAtribuirPrisma] = useState(false);
    const [osParaAtribuir, setOsParaAtribuir] = useState(null); // { id: string, novoStatus: string }
    const [osParaAtribuirPrisma, setOsParaAtribuirPrisma] = useState(null); // OS para atribuir prisma
    const [dragging, setDragging] = useState(null);

    // Estados para modal de cancelamento com estorno
    const [showConfirmarCancelamento, setShowConfirmarCancelamento] = useState(false);
    const [osParaCancelar, setOsParaCancelar] = useState(null); // OS que será cancelada
    const [motivoCancelamento, setMotivoCancelamento] = useState('');
    const [processandoCancelamento, setProcessandoCancelamento] = useState(false);

    // Visualização e filtros
    const [visualizacao, setVisualizacao] = useState('kanban'); // 'kanban' ou 'lista'
    const [showPrismas, setShowPrismas] = useState(false); // Widget de prismas no header (recolhido por padrão)
    // Estados de Filtros Separados
    const [filtrosLista, setFiltrosLista] = useState({
        busca: '',
        status: 'todos',
        ordenacao: 'recente',
        periodo: 'todos',
        dataInicio: '',
        dataFim: ''
    });

    const [filtrosKanban, setFiltrosKanban] = useState({
        busca: '',
        status: 'todos', // Não usado no dropdown do kanban, mas mantido na estrutura
        ordenacao: 'recente',
        periodo: 'todos',
        dataInicio: '',
        dataFim: ''
    });

    // Helper para acessar o filtro ativo
    const filtroAtivo = visualizacao === 'lista' ? filtrosLista : filtrosKanban;
    const setFiltroAtivo = visualizacao === 'lista' ? setFiltrosLista : setFiltrosKanban;

    const updateFiltro = (campo, valor) => {
        setFiltroAtivo(prev => ({ ...prev, [campo]: valor }));
    };

    // Helper para calcular datas baseado no período (refatorado para usar updateFiltro)
    const handlePeriodoChange = (novoPeriodo) => {
        const hoje = new Date();
        const inicio = new Date();
        let novaDataInicio = '';
        let novaDataFim = '';

        switch (novoPeriodo) {
            case 'hoje':
                novaDataInicio = toISODate(hoje);
                novaDataFim = toISODate(hoje);
                break;
            case '7dias':
                inicio.setDate(hoje.getDate() - 7);
                novaDataInicio = toISODate(inicio);
                novaDataFim = toISODate(hoje);
                break;
            case 'mes':
                inicio.setDate(1);
                novaDataInicio = toISODate(inicio);
                const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
                novaDataFim = toISODate(fimMes);
                break;
            case 'trimestre':
                inicio.setMonth(hoje.getMonth() - 3);
                novaDataInicio = toISODate(inicio);
                novaDataFim = toISODate(hoje);
                break;
            case 'ano':
                inicio.setMonth(0, 1);
                novaDataInicio = toISODate(inicio);
                novaDataFim = toISODate(hoje);
                break;
            case 'todos':
                novaDataInicio = '';
                novaDataFim = '';
                break;
            default:
                break;
        }

        setFiltroAtivo(prev => ({
            ...prev,
            periodo: novoPeriodo,
            dataInicio: novaDataInicio,
            dataFim: novaDataFim
        }));
    };

    const colunas = [
        { id: 'orcamento', label: 'Orçamentos', icon: 'receipt_long', color: 'bg-yellow-500', badgeColor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
        { id: 'aberta', label: 'Aprovada (Não Iniciada)', icon: 'inbox', color: 'bg-slate-500', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
        { id: 'execucao', label: 'Em Execução', icon: 'engineering', color: 'bg-primary', badgeColor: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light' },
        { id: 'aguardando_peca', label: 'Aguardando Peça', icon: 'inventory_2', color: 'bg-orange-500', badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
        { id: 'finalizada', label: 'Finalizada', icon: 'check_circle', color: 'bg-green-500', badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        { id: 'cancelada', label: 'Cancelada', icon: 'cancel', color: 'bg-red-500', badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    ];

    // Listener para abrir OS vinda de outros locais (Agenda, Sidebar)
    useEffect(() => {
        if (!loading && location.state?.openOSId && ordens.length > 0) {
            const osId = location.state.openOSId;
            openOS(osId);

            // Limpa o state para não reabrir ao navegar
            window.history.replaceState({}, document.title);
        }
    }, [loading, location.state, ordens, openOS]);

    // Efeito para abrir modal de Nova OS automaticamente (via Ação Rápida)
    useEffect(() => {
        if (!loading && autoOpenNovaOS && autoOpenTimestamp) {
            setShowNovaOS(true);
        }
    }, [loading, autoOpenTimestamp]);

    useEffect(() => {
        carregarDados();

        // Carregar preferência de visualização
        const empresaData = JSON.parse(localStorage.getItem('osprimex_empresas') || '[]')
            .find(e => e.id === empresa?.id);
        if (empresaData?.preferenciaOS) {
            setVisualizacao(empresaData.preferenciaOS);
        }

        // Atalho de teclado para alternar visualização (Ctrl+L)
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                setVisualizacao(prev => prev === 'kanban' ? 'lista' : 'kanban');
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        // Listener para sincronização em tempo real quando outra aba modifica os dados
        const handleStorageChange = (e) => {
            if (e.key?.includes('ordens_servico')) {
                carregarDados();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Listener para sincronização na MESMA aba (via CustomEvent do storage.js)
        const handleCustomStorageChange = (e) => {
            if (e.detail?.key?.includes('ordens_servico')) {
                carregarDados();
            }
        };
        window.addEventListener('osprimex-storage', handleCustomStorageChange);

        // Polling de backup a cada 30 segundos
        const interval = setInterval(() => {
            carregarDados();
        }, 30000);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('osprimex-storage', handleCustomStorageChange);
            clearInterval(interval);
        };
    }, [empresa]);

    const carregarDados = async () => {
        if (!empresa) return;
        try {
            const [ordensData, clientesData, veiculosData, colaboradoresData, linksData] = await Promise.all([
                storage.getAll('ordens_servico', empresa.id),
                storage.getAll('clientes', empresa.id),
                storage.getAll('veiculos', empresa.id),
                storage.getAll('colaboradores', empresa.id),
                storage.getAll('links_rastreaveis', empresa.id),
            ]);
            setOrdens(ordensData.filter((o) => o.ativo));
            setClientes(clientesData);
            setVeiculos(veiculosData);
            setTecnicos(colaboradoresData.filter(c => c.ativo !== false));
            setLinksRastreaveis(linksData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const getClienteNome = (clienteId) => {
        const cliente = clientes.find((c) => c.id === clienteId);
        return cliente?.nome || 'Cliente';
    };

    const getVeiculoInfo = (veiculoId) => {
        const veiculo = veiculos.find((v) => v.id === veiculoId);
        return veiculo ? `${veiculo.marca} ${veiculo.modelo}` : 'Veículo';
    };

    const getVeiculoPlaca = (veiculoId) => {
        const veiculo = veiculos.find((v) => v.id === veiculoId);
        return veiculo?.placa || null;
    };



    // Verificar se existe link de rastreio ativo
    const hasLinkRastreavel = (osId) => {
        return linksRastreaveis?.some(l => l.osId === osId && l.ativo !== false);
    };

    // Verificar se a OS tem um técnico válido (existe na lista de colaboradores)
    const hasTecnicoValido = (os) => {
        if (!os.tecnicoId) return false;
        return tecnicos.some(t => t.id === os.tecnicoId);
    };



    const handleDragStart = (e, os) => {
        setDragging(os.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, novoStatus) => {
        e.preventDefault();
        if (!dragging) return;

        const os = ordens.find((o) => o.id === dragging);
        if (!os || os.status === novoStatus) {
            setDragging(null);
            return;
        }

        // Validações de transição
        if (novoStatus === 'execucao' && !os.tecnicoId) {
            // Abrir modal de atribuição em vez de bloquear
            setOsParaAtribuir({ id: os.id, novoStatus: novoStatus });
            setShowAtribuirTecnico(true);
            setDragging(null);
            return;
        }

        // CANCELAMENTO: Requer confirmação especial se vem de finalizada (estorno)
        if (novoStatus === 'cancelada') {
            setOsParaCancelar(os);
            setMotivoCancelamento('');
            setShowConfirmarCancelamento(true);
            setDragging(null);
            return;
        }

        const dadosUpdate = { status: novoStatus };

        try {
            await storage.update('ordens_servico', os.id, dadosUpdate);
            carregarDados();
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        }

        setDragging(null);
    };

    // Função para estornar estoque (devolver peças)
    const estornarEstoque = async (os) => {
        const itens = os.itens || [];
        for (const item of itens) {
            if (item.tipo === 'produto' && item.produtoId) {
                try {
                    const produto = await storage.getById('produtos', item.produtoId);
                    if (produto) {
                        const estoqueAtual = Number(produto.quantidade) || 0;
                        const novoEstoque = estoqueAtual + item.quantidade;

                        await storage.update('produtos', item.produtoId, { quantidade: novoEstoque });

                        await storage.create('movimentacoes_estoque', {
                            produtoId: item.produtoId,
                            osId: os.id,
                            tipo: 'entrada',
                            quantidade: item.quantidade,
                            motivo: `Estorno - OS #${os.numero || os.id.slice(-6)} (Kanban)`,
                            estoqueAnterior: estoqueAtual,
                            estoqueAtual: novoEstoque,
                        }, empresa.id);
                    }
                } catch (error) {
                    console.error('Erro no estorno de estoque:', error);
                }
            }
        }
    };

    // Confirmar cancelamento (chamado pelo modal)
    const confirmarCancelamento = async () => {
        if (!osParaCancelar) return;

        setProcessandoCancelamento(true);
        try {
            // Se a OS estava finalizada, estornar estoque
            if (osParaCancelar.status === 'finalizada') {
                await estornarEstoque(osParaCancelar);
            }

            // Salvar motivo nas observações
            const observacaoAtual = osParaCancelar.observacoes || '';
            const novaObservacao = motivoCancelamento
                ? `${observacaoAtual}\n[CANCELADO] ${motivoCancelamento}`.trim()
                : observacaoAtual;

            await storage.update('ordens_servico', osParaCancelar.id, {
                status: 'cancelada',
                observacoes: novaObservacao
            });

            carregarDados();
            setShowConfirmarCancelamento(false);
            setOsParaCancelar(null);
            setMotivoCancelamento('');
        } catch (error) {
            console.error('Erro ao cancelar:', error);
            alert('Erro ao cancelar OS');
        } finally {
            setProcessandoCancelamento(false);
        }
    };

    const handleAtribuirTecnico = async (tecnicoId) => {
        if (!osParaAtribuir) return;

        const { id, novoStatus } = osParaAtribuir;
        const os = ordens.find(o => o.id === id);

        if (!os) return;

        // Mesma lógica de update do handleDrop
        const dadosUpdate = {
            status: novoStatus,
            tecnicoId: tecnicoId
        };

        try {
            await storage.update('ordens_servico', id, dadosUpdate);
            carregarDados();
            setShowAtribuirTecnico(false);
            setOsParaAtribuir(null);
        } catch (error) {
            console.error('Erro ao atribuir técnico:', error);
            alert('Erro ao atribuir técnico');
        }
    };

    // Handler para atribuir prisma
    const handleAtribuirPrisma = async (numeroPrisma) => {
        if (!osParaAtribuirPrisma) return;

        try {
            await storage.update('ordens_servico', osParaAtribuirPrisma.id, {
                prisma: numeroPrisma
            });
            carregarDados();
            setShowAtribuirPrisma(false);
            setOsParaAtribuirPrisma(null);
        } catch (error) {
            console.error('Erro ao atribuir prisma:', error);
            alert('Erro ao atribuir prisma');
        }
    };

    // Obter prismas ocupados para o modal
    const getPrismasOcupados = () => {
        const statusPermitidos = ['aberta', 'execucao', 'aguardando_peca'];
        return ordens
            .filter(o => statusPermitidos.includes(o.status) && o.prisma && o.id !== osParaAtribuirPrisma?.id)
            .map(o => ({ prisma: o.prisma, osId: o.id, osNumero: o.numero }));
    };

    const getOrdensPorStatus = (status) => {
        return ordens.filter((o) => o.status === status);
    };

    const getTecnicoNome = (tecnicoId) => {
        const tecnico = tecnicos.find((t) => t.id === tecnicoId);
        return tecnico?.nome || 'Sem técnico';
    };

    // Filtrar e ordenar ordens usando o filtroAtivo
    const ordensFiltradas = ordens.filter(o => {
        const { busca, status, dataInicio, dataFim } = filtroAtivo;

        // Filtro de busca
        if (busca) {
            const termo = busca.toLowerCase();
            const termoLimpo = termo.replace(/[^a-zA-Z0-9]/g, '');
            const cliente = clientes.find(c => c.id === o.clienteId);
            const veiculo = veiculos.find(v => v.id === o.veiculoId);
            const placaNormalizada = veiculo?.placa ? veiculo.placa.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';

            const match =
                o.numero?.toString().includes(termo) ||
                cliente?.nome?.toLowerCase().includes(termo) ||
                veiculo?.placa?.toLowerCase().includes(termo) ||
                (termoLimpo.length > 0 && placaNormalizada.includes(termoLimpo)) ||
                veiculo?.modelo?.toLowerCase().includes(termo);
            if (!match) return false;
        }

        // Filtro de status (apenas se não for kanban - ou se user de fato filtrar no modo lista)
        // No kanban, 'status' não é alterado pelo UI, então é 'todos', não afeta.
        if (status !== 'todos' && o.status !== status) return false;

        // Filtro de Data (Intervalo)
        if (dataInicio || dataFim) {
            let dataReferencia = o.criadoEm;
            if (o.status === 'finalizada') {
                dataReferencia = o.execucaoFinalizadaEm || o.atualizadoEm || o.criadoEm;
            }

            const dataOSObj = new Date(dataReferencia);
            const ano = dataOSObj.getFullYear();
            const mes = String(dataOSObj.getMonth() + 1).padStart(2, '0');
            const dia = String(dataOSObj.getDate()).padStart(2, '0');
            const dataOS = `${ano}-${mes}-${dia}`;

            if (dataInicio && dataOS < dataInicio) return false;
            if (dataFim && dataOS > dataFim) return false;
        }

        return true;
    }).sort((a, b) => {
        switch (filtroAtivo.ordenacao) {
            case 'antigo': return new Date(a.criadoEm) - new Date(b.criadoEm);
            case 'numero': return (a.numero || 0) - (b.numero || 0);
            case 'cliente':
                const ca = clientes.find(c => c.id === a.clienteId)?.nome || '';
                const cb = clientes.find(c => c.id === b.clienteId)?.nome || '';
                return ca.localeCompare(cb);
            default: return new Date(b.criadoEm) - new Date(a.criadoEm);
        }
    });

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
        <div className="h-full flex flex-col">
            {/* Header */}
            <header className="shrink-0 bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-xl font-bold text-text-light dark:text-text-dark">
                        Ordens de Serviço
                    </h1>

                    <div className="flex items-center gap-3 flex-1 justify-end">
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
                            className="btn-primary"
                        >
                            <span className="material-symbols-outlined">add</span>
                            Nova OS
                        </button>
                    </div>
                </div>

                {/* Filtros: Visível para Lista e Kanban */}
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
                                className="input py-1.5 px-2 text-xs w-32"
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
                                className="input py-1.5 px-2 text-xs w-32"
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
            </header>

            {/* Widget de Prismas (Integrado) */}
            {empresa?.usarPrismas && (
                <div className="shrink-0 bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] px-4">
                    <button
                        onClick={() => setShowPrismas(!showPrismas)}
                        className="w-full py-2 flex items-center justify-between text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors"
                        title={!showPrismas ? 'Clique para visualizar os detalhes dos prismas' : ''}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{getEmojiCor(empresa?.prismaCor)}</span>
                            <span className="font-medium text-text-light dark:text-text-dark">Prismas</span>
                            {(() => {
                                const statusPermitidos = ['aberta', 'execucao', 'aguardando_peca'];
                                const emUso = ordens.filter(o => statusPermitidos.includes(o.status) && o.prisma).length;
                                const total = empresa?.prismaQuantidade || 20;
                                return (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emUso === 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        emUso >= total ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                        }`}>
                                        {emUso}/{total} em uso
                                    </span>
                                );
                            })()}
                        </div>
                        <span className={`material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark transition-transform ${showPrismas ? 'rotate-180' : ''}`}>
                            expand_more
                        </span>
                    </button>

                    {showPrismas && (
                        <div className="pb-3 animate-fadeIn">
                            <div className="flex flex-wrap gap-2">
                                {Array.from({ length: empresa?.prismaQuantidade || 20 }, (_, i) => i + 1).map(num => {
                                    const statusPermitidos = ['aberta', 'execucao', 'aguardando_peca'];
                                    const os = ordens.find(o =>
                                        statusPermitidos.includes(o.status) &&
                                        Number(o.prisma) === num
                                    );

                                    // Cores alinhadas com o Kanban
                                    const getCorPrisma = (status) => {
                                        switch (status) {
                                            case 'aberta': return 'bg-slate-500';
                                            case 'execucao': return 'bg-primary';
                                            case 'aguardando_peca': return 'bg-orange-500';
                                            default: return 'bg-green-500';
                                        }
                                    };

                                    const cor = os ? getCorPrisma(os.status) : 'bg-green-500';
                                    const titulo = os
                                        ? `#${num} → OS #${os.numero} (${os.status === 'aberta' ? 'Aprovada' : os.status === 'execucao' ? 'Em Execução' : 'Aguardando Peça'})`
                                        : `#${num} - Disponível`;

                                    return (
                                        <button
                                            key={num}
                                            onClick={() => os && openOS(os.id)}
                                            disabled={!os}
                                            className={`w-10 h-10 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${os
                                                ? 'border-gray-300 dark:border-gray-600 hover:scale-110 hover:shadow-md cursor-pointer'
                                                : 'border-gray-200 dark:border-gray-700 cursor-default opacity-60'
                                                }`}
                                            title={titulo}
                                        >
                                            <span className="text-xs font-bold text-text-light dark:text-text-dark">{num}</span>
                                            <div className={`w-2.5 h-2.5 rounded-full ${cor}`}></div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Legenda compacta */}
                            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Disponível</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                                    <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Aprovada</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Em Execução</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                    <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Aguardando Peça</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Kanban Board */}
            {visualizacao === 'kanban' && (
                <div className="flex-1 overflow-x-auto p-4">
                    <div className="flex gap-3 min-w-fit h-full">
                        {colunas.map((coluna) => {
                            // Usar ordensFiltradas em vez de getOrdensPorStatus para aplicar os filtros
                            const ordensColuna = ordensFiltradas.filter(o => o.status === coluna.id);

                            return (
                                <div
                                    key={coluna.id}
                                    className="w-72 shrink-0 flex flex-col"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, coluna.id)}
                                >
                                    {/* Column Header - compacto estilo Stitch */}
                                    <div className="flex items-center gap-2 mb-2 py-2 px-1">
                                        <div className={`w-2 h-5 rounded-full ${coluna.color}`} />
                                        <h2 className="text-sm font-semibold text-text-light dark:text-text-dark">
                                            {coluna.label}
                                        </h2>
                                        <span className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark">
                                            {ordensColuna.length}
                                        </span>
                                    </div>

                                    {/* Column Content */}
                                    <div className="flex-1 space-y-2 overflow-y-auto pb-4">
                                        {ordensColuna.length === 0 ? (
                                            <div className="card p-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                                                <span className="material-symbols-outlined text-2xl text-gray-400 mb-1">
                                                    {coluna.icon}
                                                </span>
                                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                                    Nenhuma OS
                                                </p>
                                            </div>
                                        ) : (
                                            ordensColuna.map((os) => (
                                                <div
                                                    key={os.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, os)}
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
                                                                    <span className="text-xs font-bold text-primary flex items-center gap-1">
                                                                        #{os.numero}
                                                                        {hasLinkRastreavel(os.id) && (
                                                                            <span className="material-symbols-outlined text-blue-500 text-sm" title="Rastreio Ativo">
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

                                                                        {/* Badge de Prisma (Kanban) */}
                                                                        {empresa?.usarPrismas && (
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
                                                                        const dias = Math.floor((Date.now() - new Date(os.criadoEm)) / (1000 * 60 * 60 * 24));
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
                                                            <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                                                                {getClienteNome(os.clienteId)}
                                                            </p>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <PlacaBadge placa={getVeiculoPlaca(os.veiculoId)} size="sm" />
                                                                <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">
                                                                    {getVeiculoInfo(os.veiculoId)}
                                                                </span>
                                                            </div>



                                                            {/* Footer compacto */}
                                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                                                <span className="text-sm font-bold text-text-light dark:text-text-dark">
                                                                    {formatCurrency(os.valorTotal || 0)}
                                                                </span>
                                                                {os.statusPagamento === 'pago' ? (
                                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 font-medium">Pago</span>
                                                                ) : (os.valorPago > 0 && os.valorPago < os.valorTotal) ? (
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
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Vista Lista */}
            {visualizacao === 'lista' && (
                <div className="flex-1 overflow-auto p-4">
                    {ordensFiltradas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-text-secondary-light dark:text-text-secondary-dark">
                            <span className="material-symbols-outlined text-5xl mb-4">search_off</span>
                            <p className="text-lg font-medium">Nenhuma OS encontrada</p>
                            <p className="text-sm">Tente ajustar os filtros de busca</p>
                        </div>
                    ) : (
                        <div className="card overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                    <tr className="text-left text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                        <th className="px-4 py-3 font-medium">NÂº</th>
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
                                                onClick={() => openOS(os.id)}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-primary">#{os.numero}</span>
                                                        {hasLinkRastreavel(os.id) && (
                                                            <span className="material-symbols-outlined text-blue-500 text-sm" title="Rastreio Ativo">
                                                                share_location
                                                            </span>
                                                        )}
                                                        {/* Prisma inline na mesma linha */}
                                                        {empresa?.usarPrismas && os.prisma && (
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
                                                <td className="px-4 py-3 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                                    {getTecnicoNome(os.tecnicoId)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.badgeColor}`}>
                                                        <span className="material-symbols-outlined text-sm">{statusInfo.icon}</span>
                                                        {statusInfo.label}
                                                    </span>
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
                    )}
                </div>
            )}

            {/* Modal Nova OS */}
            {showNovaOS && (
                <NovaOSModal
                    clientes={clientes}
                    veiculos={veiculos}
                    empresaId={empresa?.id}
                    onClose={() => setShowNovaOS(false)}
                    onSave={(novaOS) => {
                        setShowNovaOS(false);
                        carregarDados();
                        // Abrir a aba de edição da OS recém-criada
                        if (novaOS?.id) {
                            openTab({
                                id: `os-${novaOS.id}`,
                                type: 'os',
                                title: `OS #${novaOS.numero}`,
                                data: { osId: novaOS.id }
                            });
                        }
                    }}
                />
            )}

            {/* Modal Atribuir Técnico (Kanban) */}
            {showAtribuirTecnico && (
                <AtribuirTecnicoModal
                    tecnicos={tecnicos}
                    onClose={() => {
                        setShowAtribuirTecnico(false);
                        setOsParaAtribuir(null);
                    }}
                    onSelect={handleAtribuirTecnico}
                />
            )}

            {/* Modal Atribuir Prisma (Kanban) */}
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

                        {/* Alerta de Estorno para OS Finalizada */}
                        {osParaCancelar.status === 'finalizada' && (
                            <div className="mb-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-xl shrink-0">warning</span>
                                    <div>
                                        <p className="font-bold text-orange-800 dark:text-orange-300 mb-1">ATENÇÃƒO: Estorno de Estoque</p>
                                        <p className="text-sm text-orange-700 dark:text-orange-400">
                                            {(osParaCancelar.itens || []).filter(i => i.tipo === 'produto').length} peça(s) serão devolvidas ao estoque automaticamente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Alerta Financeiro - Mostra para QUALQUER OS com valor pago (sinal ou pagamento total) */}
                        {(osParaCancelar.valorPago || 0) > 0 && (
                            <div className="mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl shrink-0">payments</span>
                                    <div>
                                        <p className="font-bold text-blue-800 dark:text-blue-300 mb-1">Impacto Financeiro</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-400">
                                            Esta OS possui R$ {(osParaCancelar.valorPago || 0).toFixed(2).replace('.', ',')} já pago.
                                            Os valores <strong>NÃƒO</strong> serão estornados automaticamente.
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
                                onChange={(e) => setMotivoCancelamento(e.target.value)}
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

// Modal para criar nova OS
// NovaOSModal foi movido para components/os/NovaOSModal.jsx
export default KanbanOS;

