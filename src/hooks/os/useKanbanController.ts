// useKanbanController.ts
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import storage from '../../lib/storage';
import { toISODate, toTitleCase } from '../../lib/utils';
import type { OrdemServico, Cliente, Veiculo, Colaborador, BaseEntity } from '../../types';

interface LinkRastreavel extends BaseEntity {
    codigo: string;
    osId: string;
    urlDestino: string;
    cliques: number;
}

export const useKanbanController = (autoOpenNovaOS?: boolean, autoOpenTimestamp?: number) => {
    const { empresa } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { openTab } = useTabs();

    // Dados Principais
    const [ordens, setOrdens] = useState<OrdemServico[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
    const [tecnicos, setTecnicos] = useState<Colaborador[]>([]);
    const [linksRastreaveis, setLinksRastreaveis] = useState<LinkRastreavel[]>([]);
    const [loading, setLoading] = useState(true);

    // Modais
    const [showNovaOS, setShowNovaOS] = useState(false);
    const [showAtribuirTecnico, setShowAtribuirTecnico] = useState(false);
    const [showAtribuirPrisma, setShowAtribuirPrisma] = useState(false);
    const [osParaAtribuir, setOsParaAtribuir] = useState<{ id: string, novoStatus: string } | null>(null);
    const [osParaAtribuirPrisma, setOsParaAtribuirPrisma] = useState<OrdemServico | null>(null);
    const [showConfirmarCancelamento, setShowConfirmarCancelamento] = useState(false);
    const [osParaCancelar, setOsParaCancelar] = useState<OrdemServico | null>(null);
    const [motivoCancelamento, setMotivoCancelamento] = useState('');
    const [processandoCancelamento, setProcessandoCancelamento] = useState(false);

    // Drag & Drop
    const [dragging, setDragging] = useState<string | null>(null);

    // Visualização e Filtros
    const [visualizacao, setVisualizacao] = useState<'kanban' | 'lista'>('kanban');
    const [showPrismas, setShowPrismas] = useState(false);

    const [filtrosLista, setFiltrosLista] = useState({
        busca: '',
        status: 'todos',
        natureza: 'todos',
        ordenacao: 'recente',
        periodo: 'todos',
        dataInicio: '',
        dataFim: ''
    });

    const [filtrosKanban, setFiltrosKanban] = useState({
        busca: '',
        status: 'todos',
        natureza: 'todos',
        ordenacao: 'recente',
        periodo: 'todos',
        dataInicio: '',
        dataFim: ''
    });

    // Helper de Filtro Ativo
    const filtroAtivo = visualizacao === 'lista' ? filtrosLista : filtrosKanban;
    const setFiltroAtivo = visualizacao === 'lista' ? setFiltrosLista : setFiltrosKanban;

    const updateFiltro = (campo: string, valor: string) => {
        setFiltroAtivo(prev => ({ ...prev, [campo]: valor }));
    };

    // Definição das Colunas
    const colunas = [
        { id: 'orcamento', label: 'Orçamentos', icon: 'receipt_long', color: 'bg-yellow-500', badgeColor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
        { id: 'aberta', label: 'Aprovada (Não Iniciada)', icon: 'inbox', color: 'bg-slate-500', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
        { id: 'execucao', label: 'Em Execução', icon: 'engineering', color: 'bg-primary', badgeColor: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light' },
        { id: 'aguardando_peca', label: 'Aguardando Peça', icon: 'inventory_2', color: 'bg-orange-500', badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
        { id: 'finalizada', label: 'Finalizada', icon: 'check_circle', color: 'bg-green-500', badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        { id: 'cancelada', label: 'Cancelada', icon: 'cancel', color: 'bg-red-500', badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    ];

    // Carregar Dados
    const carregarDados = async () => {
        if (!empresa) return;
        try {
            const [ordensData, clientesData, veiculosData, colaboradoresData, linksData] = await Promise.all([
                storage.getAll<OrdemServico>('ordens_servico', empresa.id),
                storage.getAll<Cliente>('clientes', empresa.id),
                storage.getAll<Veiculo>('veiculos', empresa.id),
                storage.getAll<Colaborador>('colaboradores', empresa.id),
                storage.getAll<LinkRastreavel>('links_rastreaveis', empresa.id),
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

    // EFFECTS
    // 1. Ouvir abertura via location state
    useEffect(() => {
        if (!loading && location.state && (location.state as any).openOSId && ordens.length > 0) {
            const osId = (location.state as any).openOSId;
            openOS(osId);
            window.history.replaceState({}, document.title);
        }
    }, [loading, location.state, ordens]);

    // 2. Auto Open Nova OS
    useEffect(() => {
        if (!loading && autoOpenNovaOS && autoOpenTimestamp) {
            setShowNovaOS(true);
        }
    }, [loading, autoOpenTimestamp]);

    // 3. Inicialização e Listeners
    useEffect(() => {
        carregarDados();

        // Preferência Visualização
        const empresaData = JSON.parse(localStorage.getItem('osprimex_empresas') || '[]').find((e: any) => e.id === empresa?.id);
        if (empresaData?.preferenciaOS) {
            setVisualizacao(empresaData.preferenciaOS);
        }

        // Atalho Teclado
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                setVisualizacao(prev => prev === 'kanban' ? 'lista' : 'kanban');
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        // Storage Events
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key?.includes('ordens_servico')) carregarDados();
        };
        const handleCustomStorageChange = (e: CustomEvent) => {
            if (e.detail?.key?.includes('ordens_servico')) carregarDados();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('osprimex-storage', handleCustomStorageChange as EventListener);

        const interval = setInterval(carregarDados, 30000);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('osprimex-storage', handleCustomStorageChange as EventListener);
            clearInterval(interval);
        };
    }, [empresa]);

    // LOGIC FUNCTIONS

    const openOS = (osId: string) => {
        const os = ordens.find(o => o.id === osId);
        openTab({
            id: `os-${osId}`,
            type: 'os',
            title: `OS #${os?.numero || osId.slice(-4)}`,
            data: { osId }
        });
    };

    const handlePeriodoChange = (novoPeriodo: string) => {
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
        }

        setFiltroAtivo(prev => ({
            ...prev,
            periodo: novoPeriodo,
            dataInicio: novaDataInicio,
            dataFim: novaDataFim
        }));
    };

    const handleDragStart = (e: React.DragEvent, os: OrdemServico) => {
        setDragging(os.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, novoStatus: string) => {
        e.preventDefault();
        if (!dragging) return;

        const os = ordens.find((o) => o.id === dragging);
        if (!os || os.status === novoStatus) {
            setDragging(null);
            return;
        }

        // Regra Técnico
        if (novoStatus === 'execucao' && !os.tecnicoId) {
            setOsParaAtribuir({ id: os.id, novoStatus: novoStatus });
            setShowAtribuirTecnico(true);
            setDragging(null);
            return;
        }

        // Regra Cancelamento
        if (novoStatus === 'cancelada') {
            setOsParaCancelar(os);
            setMotivoCancelamento('');
            setShowConfirmarCancelamento(true);
            setDragging(null);
            return;
        }

        try {
            await storage.update<OrdemServico>('ordens_servico', os.id, { status: novoStatus } as any);
            carregarDados();
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        }
        setDragging(null);
    };

    const handleAtribuirTecnico = async (tecnicoId: string) => {
        if (!osParaAtribuir) return;
        const { id, novoStatus } = osParaAtribuir;
        try {
            await storage.update('ordens_servico', id, {
                status: novoStatus,
                tecnicoId: tecnicoId
            });
            carregarDados();
            setShowAtribuirTecnico(false);
            setOsParaAtribuir(null);
        } catch (error) {
            console.error('Erro atribuir tecnico:', error);
        }
    };

    const handleAtribuirPrisma = async (numeroPrisma: string | number | null) => {
        if (!osParaAtribuirPrisma) return;
        try {
            await storage.update('ordens_servico', osParaAtribuirPrisma.id, { prisma: numeroPrisma });
            carregarDados();
            setShowAtribuirPrisma(false);
            setOsParaAtribuirPrisma(null);
        } catch (error) {
            console.error('Erro atribuir prisma:', error);
        }
    };

    const confirmarCancelamento = async () => {
        if (!osParaCancelar || !empresa) return;
        setProcessandoCancelamento(true);
        try {
            // Estorno se finalizada
            if (osParaCancelar.status === 'finalizada') {
                const itens = osParaCancelar.itens || [];
                for (const item of itens) {
                    if (item.tipo === 'produto' && item.produtoId) {
                        const produtoId = item.produtoId;
                        if (!produtoId) continue;

                        try {
                            const produto = await storage.getById<any>('produtos', produtoId); // generic any because Produto type might need updates
                            if (produto) {
                                const estoqueAtual = Number(produto.quantidade) || 0;
                                const novoEstoque = estoqueAtual + item.quantidade;
                                await storage.update('produtos', produtoId, { quantidade: novoEstoque });
                                await storage.create('movimentacoes_estoque', {
                                    produtoId: produtoId,
                                    osId: osParaCancelar.id,
                                    tipo: 'entrada',
                                    quantidade: item.quantidade,
                                    motivo: `Estorno - OS #${osParaCancelar.numero} (Kanban)`,
                                    estoqueAnterior: estoqueAtual,
                                    estoqueAtual: novoEstoque,
                                }, empresa.id);
                            }
                        } catch (err) { console.error('Erro estorno', err); }
                    }
                }
            }

            const obs = osParaCancelar.observacoes || '';
            const newObs = motivoCancelamento ? `${obs}\n[CANCELADO] ${motivoCancelamento}`.trim() : obs;

            await storage.update<OrdemServico>('ordens_servico', osParaCancelar.id, {
                status: 'cancelada',
                observacoes: newObs
            });
            carregarDados();
            setShowConfirmarCancelamento(false);
            setOsParaCancelar(null);
            setMotivoCancelamento('');
        } catch (error) {
            console.error('Erro cancelamento:', error);
        } finally {
            setProcessandoCancelamento(false);
        }
    };

    // HELPERS
    const getClienteNome = (id: string) => toTitleCase(clientes.find(c => c.id === id)?.nome) || 'Cliente';
    const getVeiculoInfo = (id: string) => {
        const v = veiculos.find(x => x.id === id);
        return v ? `${v.marca} ${v.modelo}` : 'Veículo';
    };
    const getVeiculoPlaca = (id: string) => veiculos.find(v => v.id === id)?.placa || null;
    const hasLinkRastreavel = (id: string) => linksRastreaveis?.some(l => l.osId === id && l.ativo !== false);
    const hasTecnicoValido = (os: OrdemServico) => tecnicos.some(t => t.id === os.tecnicoId);
    const getTecnicoNome = (id?: string | null) => toTitleCase(tecnicos.find(t => t.id === id)?.nome) || 'Sem técnico';
    const getPrismasOcupados = () => {
        const statusPermitidos = ['aberta', 'execucao', 'aguardando_peca'];
        return ordens
            .filter(o => statusPermitidos.includes(o.status) && o.prisma && o.id !== osParaAtribuirPrisma?.id)
            .map(o => ({ prisma: o.prisma!, osId: o.id, osNumero: o.numero }));
    };

    // Filter Logic
    const ordensFiltradas = ordens.filter(o => {
        const { busca, status, natureza, dataInicio, dataFim } = filtroAtivo;

        if (busca) {
            const termo = busca.toLowerCase();
            const termoLimpo = termo.replace(/[^a-zA-Z0-9]/g, '');
            const c = clientes.find(x => x.id === o.clienteId);
            const v = veiculos.find(x => x.id === o.veiculoId);
            const placaNorm = v?.placa ? v.placa.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';

            const match = o.numero?.toString().includes(termo) ||
                c?.nome?.toLowerCase().includes(termo) ||
                v?.placa?.toLowerCase().includes(termo) ||
                (termoLimpo.length > 0 && placaNorm.includes(termoLimpo)) ||
                v?.modelo?.toLowerCase().includes(termo);
            if (!match) return false;
        }

        if (status !== 'todos' && o.status !== status) return false;
        if (natureza !== 'todos') {
            const tipo = o.tipo || 'os';
            if (natureza === 'os' && tipo !== 'os' && tipo !== 'orcamento') return false;
            if (natureza !== 'os' && tipo !== natureza) return false;
        }

        if (dataInicio || dataFim) {
            let ref = o.criadoEm;
            if (o.status === 'finalizada') ref = o.execucaoFinalizadaEm || o.atualizadoEm || o.criadoEm;
            const d = toISODate(new Date(ref));
            if (dataInicio && d < dataInicio) return false;
            if (dataFim && d > dataFim) return false;
        }
        return true;
    }).sort((a, b) => {
        switch (filtroAtivo.ordenacao) {
            case 'antigo': return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
            case 'numero': return (a.numero || 0) - (b.numero || 0);
            case 'cliente':
                const ca = clientes.find(c => c.id === a.clienteId)?.nome || '';
                const cb = clientes.find(c => c.id === b.clienteId)?.nome || '';
                return ca.localeCompare(cb);
            default: return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
        }
    });

    return {
        // Data
        empresa,
        ordens,
        clientes,
        veiculos,
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
        osParaAtribuir, setOsParaAtribuir, // Export this!
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
    };
};
