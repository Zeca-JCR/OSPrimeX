import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import storage from '../../lib/storage';
import { formatCurrency, formatDate, parseDateLocal } from '../../lib/utils';
import WhatsAppIcon from '../../components/common/WhatsAppIcon';

const CRMRetencao = () => {
    const { empresa } = useAuth();
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');

    const [clientes, setClientes] = useState([]);
    const [ordensServico, setOrdensServico] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState(tabParam === 'revisao' ? 'revisao' : 'inativos'); // inativos, revisao, aniversario, todos

    // Modal pós-contato WhatsApp
    const [showContatoModal, setShowContatoModal] = useState(false);
    const [clienteContato, setClienteContato] = useState(null);

    // Modal Campanha em Massa
    const [showCampanhaModal, setShowCampanhaModal] = useState(false);

    useEffect(() => {
        carregarDados();
    }, [empresa]);

    const carregarDados = async () => {
        if (!empresa) return;
        try {
            const [clientesData, osData, veiculosData] = await Promise.all([
                storage.getAll('clientes', empresa.id),
                storage.getAll('ordens_servico', empresa.id),
                storage.getAll('veiculos', empresa.id),
            ]);
            setClientes(clientesData.filter(c => c.ativo !== false));
            setOrdensServico(osData);
            setVeiculos(veiculosData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    // Abrir WhatsApp e mostrar modal pós-contato
    const abrirWhatsApp = (cliente) => {
        const telefone = cliente.telefone?.replace(/\D/g, '');
        if (telefone) {
            window.open(`https://wa.me/55${telefone}`, '_blank');
            setClienteContato(cliente);
            setShowContatoModal(true);
        }
    };

    // Registrar desfecho do contato
    const registrarDesfecho = async (desfecho, diasReagendar = 7, targetClientId = null) => {
        const idParaAtualizar = targetClientId || clienteContato?.id;
        if (!idParaAtualizar) return;

        try {
            const atualizacao = {
                ultimoContato: new Date().toISOString(),
                ultimoDesfecho: desfecho,
            };

            if (desfecho === 'reagendar' || desfecho === 'nao_respondeu') {
                // Reagendar alerta para daqui a X dias
                const novaData = new Date();
                novaData.setDate(novaData.getDate() + diasReagendar);
                atualizacao.proximoContato = novaData.toISOString();
            } else if (desfecho === 'agendou') {
                // Limpar alerta
                atualizacao.proximoContato = null;
            } else if (desfecho === 'vendeu') {
                // Inativar cliente (não gerar mais alertas)
                atualizacao.ativo = false;
            }

            await storage.update('clientes', idParaAtualizar, atualizacao);
            if (!targetClientId) {
                setShowContatoModal(false);
                setClienteContato(null);
            }
            carregarDados();
        } catch (error) {
            console.error('Erro ao registrar desfecho:', error);
        }
    };

    // Calcular métricas de cada cliente
    const clientesComMetricas = useMemo(() => {
        const hoje = new Date();
        const limiteInativo = empresa?.diasInatividade || 90;
        const limiteAlto = limiteInativo * 2;
        const limiteBaixo = Math.round(limiteInativo / 3);

        return clientes.map(cliente => {
            // Buscar OS do cliente
            const osCliente = ordensServico.filter(os => os.clienteId === cliente.id);
            const osFinalizadas = osCliente.filter(os => os.status === 'finalizada');

            // Última visita (data da última OS finalizada)
            const ultimaOS = osFinalizadas.sort((a, b) =>
                new Date(b.atualizadoEm || b.criadoEm) - new Date(a.atualizadoEm || a.criadoEm)
            )[0];
            const ultimaVisita = ultimaOS ? new Date(ultimaOS.atualizadoEm || ultimaOS.criadoEm) : null;

            // Dias desde última visita
            const diasInativos = ultimaVisita
                ? Math.floor((hoje - ultimaVisita) / (1000 * 60 * 60 * 24))
                : null;

            // Total gasto
            const totalGasto = osFinalizadas.reduce((sum, os) => sum + (os.valorTotal || 0), 0);

            // Veículos do cliente
            const veiculosCliente = veiculos.filter(v => v.clienteId === cliente.id);

            // Verificar se precisa de revisão (híbrido: manual + automático)
            const veiculoPrecisaRevisao = veiculosCliente.find(v => {
                // 1. Alerta manual: próxima revisão por data
                if (v.proximaRevisaoData) {
                    const dataRevisao = parseDateLocal(v.proximaRevisaoData);

                    // Normalizar "hoje" para manter consistência
                    const hojeMeiaNoite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

                    if (dataRevisao <= hojeMeiaNoite) return true; // Já passou ou é hoje

                    const diasParaRevisao = Math.ceil((dataRevisao - hojeMeiaNoite) / (1000 * 60 * 60 * 24));
                    if (diasParaRevisao <= 30) return true; // Próximos 30 dias
                }
                return false;
            });

            // Aniversário próximo (próximos 30 dias)
            const aniversarioProximo = cliente.dataNascimento ? (() => {
                // Parse usando helper que corrige timezone
                const nascimento = parseDateLocal(cliente.dataNascimento);

                // Normalizar "hoje" para meia-noite
                const hojeMeiaNoite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

                // Criar data de aniversário para este ano
                const aniversarioEsteAno = new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate());

                // Se já passou este ano (e não é hoje), projeta para o próximo
                if (aniversarioEsteAno < hojeMeiaNoite) {
                    aniversarioEsteAno.setFullYear(hoje.getFullYear() + 1);
                }

                // Diferença em dias
                const diffTempo = aniversarioEsteAno - hojeMeiaNoite;
                const diasParaAniversario = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

                return diasParaAniversario <= 30 ? diasParaAniversario : null;
            })() : null;

            // Classificação de risco
            const risco = diasInativos === null ? 'novo' :
                diasInativos > limiteAlto ? 'alto' :
                    diasInativos > limiteInativo ? 'medio' :
                        diasInativos > limiteBaixo ? 'baixo' : 'ativo';

            return {
                ...cliente,
                ultimaVisita,
                diasInativos,
                totalGasto,
                totalOS: osFinalizadas.length,
                veiculos: veiculosCliente,
                precisaRevisao: !!veiculoPrecisaRevisao,
                aniversarioProximo,
                risco,
            };
        });
    }, [clientes, ordensServico, veiculos, empresa]);

    // Filtrar clientes
    const clientesFiltrados = useMemo(() => {
        let lista = clientesComMetricas;

        if (filtro === 'inativos') {
            lista = lista.filter(c => c.risco === 'alto' || c.risco === 'medio');
        } else if (filtro === 'revisao') {
            lista = lista.filter(c => c.precisaRevisao);
        } else if (filtro === 'aniversario') {
            lista = lista.filter(c => c.aniversarioProximo !== null);
        }
        // Se filtro 'todos', mostra todos
        return lista;
    }, [clientesComMetricas, filtro]);

    // Estatísticas
    const stats = useMemo(() => {
        return {
            totalClientes: clientesComMetricas.length,
            inativos90dias: clientesComMetricas.filter(c => c.risco === 'alto' || c.risco === 'medio').length,
            precisamRevisao: clientesComMetricas.filter(c => c.precisaRevisao).length,
            aniversarios: clientesComMetricas.filter(c => c.aniversarioProximo !== null).length,
        };
    }, [clientesComMetricas]);

    const getRiscoConfig = (risco) => {
        switch (risco) {
            case 'alto': return { label: 'Risco Alto', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
            case 'medio': return { label: 'Risco Médio', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
            case 'baixo': return { label: 'Risco Baixo', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
            case 'novo': return { label: 'Novo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
            default: return { label: 'Ativo', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
        }
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
        <div className="animate-fadeIn">
            {/* Header section... */}
            <div className="mb-8">
                <Link to="/clientes" className="flex items-center gap-2 text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-primary mb-2">
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Voltar para Clientes
                </Link>
                <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
                    Retenção de Clientes & CRM
                </h1>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    Acompanhe clientes inativos e oportunidades de follow-up
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <button
                    onClick={() => setFiltro('todos')}
                    className={`card p-4 text-left transition-all ${filtro === 'todos' ? 'ring-2 ring-primary' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">people</span>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Total</p>
                            <p className="text-lg font-bold text-text-light dark:text-text-dark">{stats.totalClientes}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setFiltro('inativos')}
                    className={`card p-4 text-left transition-all ${filtro === 'inativos' ? 'ring-2 ring-primary' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Inativos +{empresa?.diasInatividade || 90}d</p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.inativos90dias}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setFiltro('revisao')}
                    className={`card p-4 text-left transition-all ${filtro === 'revisao' ? 'ring-2 ring-primary' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">build</span>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Revisão</p>
                            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.precisamRevisao}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setFiltro('aniversario')}
                    className={`card p-4 text-left transition-all ${filtro === 'aniversario' ? 'ring-2 ring-primary' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">cake</span>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Aniversários</p>
                            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats.aniversarios}</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Lista de Clientes */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="font-semibold text-text-light dark:text-text-dark">
                        {filtro === 'inativos' ? 'Clientes Inativos (últimos 90+ dias)' :
                            filtro === 'revisao' ? 'Clientes com Veículos para Revisão' :
                                filtro === 'aniversario' ? 'Aniversários nos Próximos 30 Dias' :
                                    'Todos os Clientes'}
                    </h2>
                    <button
                        onClick={() => setShowCampanhaModal(true)}
                        disabled={clientesFiltrados.length === 0}
                        className="btn-primary py-1.5 px-3 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={clientesFiltrados.length === 0 ? "Nenhum cliente na lista" : "Criar campanha para estes clientes"}
                    >
                        <span className="material-symbols-outlined text-lg">campaign</span>
                        Criar Campanha
                    </button>
                </div>

                {clientesFiltrados.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">sentiment_satisfied</span>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark">
                            {filtro === 'inativos' ? 'Nenhum cliente inativo. Ótimo!' :
                                filtro === 'revisao' ? 'Nenhum veículo precisando de revisão.' :
                                    filtro === 'aniversario' ? 'Nenhum aniversário nos próximos 30 dias.' :
                                        'Nenhum cliente encontrado.'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--color-border-light)] dark:divide-[var(--color-border-dark)]">
                        {clientesFiltrados.map((cliente) => {
                            const riscoConfig = getRiscoConfig(cliente.risco);

                            return (
                                <div key={cliente.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        {/* Avatar / Initials */}
                                        <div className="shrink-0 relative">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                                {cliente.nome?.charAt(0) || 'C'}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Link
                                                    to={`/clientes/${cliente.id}`}
                                                    className="font-semibold text-text-light dark:text-text-dark hover:text-primary truncate text-lg"
                                                >
                                                    {cliente.nome}
                                                </Link>

                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riscoConfig.color}`}>
                                                    {riscoConfig.label}
                                                </span>

                                                {cliente.aniversarioProximo !== null && (
                                                    <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">cake</span>
                                                        {cliente.aniversarioProximo === 0 ? 'Hoje!' : `${cliente.aniversarioProximo}d`}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                                <span className="flex items-center gap-1" title="Telefone">
                                                    <span className="material-symbols-outlined text-sm">phone</span>
                                                    {cliente.telefone || '-'}
                                                </span>
                                                <span className="flex items-center gap-1" title="Total de Ordens de Serviço">
                                                    <span className="material-symbols-outlined text-sm">assignment</span>
                                                    {cliente.totalOS} OS
                                                </span>
                                                <span className="flex items-center gap-1" title="Total Gasto em Serviços/Peças">
                                                    <span className="material-symbols-outlined text-sm">payments</span>
                                                    {formatCurrency(cliente.totalGasto)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                {cliente.ultimaVisita && (
                                                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                                        Última visita: {formatDate(cliente.ultimaVisita)}
                                                        {cliente.diasInativos > 0 && (
                                                            <span className="ml-1 text-red-500">({cliente.diasInativos} dias)</span>
                                                        )}
                                                    </span>
                                                )}
                                                {cliente.precisaRevisao && (
                                                    <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full">
                                                        Precisa revisão
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ações rápidas */}
                                        <div className="flex gap-1 shrink-0 self-center">
                                            {cliente.telefone && (
                                                <button
                                                    onClick={() => abrirWhatsApp(cliente)}
                                                    className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                                                    title="WhatsApp"
                                                >
                                                    <WhatsAppIcon size={24} />
                                                </button>
                                            )}
                                            <Link
                                                to={`/clientes/${cliente.id}`}
                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-primary"
                                                title="Ver detalhes"
                                            >
                                                <span className="material-symbols-outlined">visibility</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Pós-Contato WhatsApp */}
            {showContatoModal && clienteContato && (
                <ContatoModal
                    cliente={clienteContato}
                    onClose={() => {
                        setShowContatoModal(false);
                        setClienteContato(null);
                    }}
                    onDesfecho={registrarDesfecho}
                />
            )}
            {/* Modal Campanha em Massa */}
            {showCampanhaModal && (
                <CampanhaModal
                    clientes={clientesFiltrados}
                    tipo={filtro}
                    onClose={() => setShowCampanhaModal(false)}
                    onRegistrarContato={(clienteId, desfecho) => {
                        registrarDesfecho(desfecho, 7, clienteId);
                    }}
                />
            )}
        </div>
    );
};

// Modal Pós-Contato WhatsApp
const ContatoModal = ({ cliente, onClose, onDesfecho }) => {
    const [diasReagendar, setDiasReagendar] = useState(7);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md animate-slideUp">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-green-600 dark:text-green-400">chat</span>
                    </div>
                    <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                        Contato com {cliente.nome}
                    </h3>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
                        Como foi o resultado do contato via WhatsApp?
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => onDesfecho('agendou')}
                        className="w-full p-4 rounded-xl bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 flex items-center gap-3 text-left transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400">event_available</span>
                        </div>
                        <div>
                            <p className="font-medium text-green-700 dark:text-green-400">Agendou</p>
                            <p className="text-xs text-green-600 dark:text-green-500">Cliente agendou serviço</p>
                        </div>
                    </button>

                    <button
                        onClick={() => onDesfecho('nao_respondeu', 3)}
                        className="w-full p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 flex items-center gap-3 text-left transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">schedule</span>
                        </div>
                        <div>
                            <p className="font-medium text-yellow-700 dark:text-yellow-400">Não respondeu</p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-500">Reagendar para daqui 3 dias</p>
                        </div>
                    </button>

                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">event_repeat</span>
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-blue-700 dark:text-blue-400">Reagendar</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="number"
                                        value={diasReagendar}
                                        onChange={(e) => setDiasReagendar(Number(e.target.value))}
                                        className="w-16 px-2 py-1 rounded border border-blue-200 dark:border-blue-700 text-sm text-center"
                                        min={1}
                                        max={90}
                                    />
                                    <span className="text-xs text-blue-600 dark:text-blue-500">dias</span>
                                </div>
                            </div>
                            <button
                                onClick={() => onDesfecho('reagendar', diasReagendar)}
                                className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200"
                            >
                                <span className="material-symbols-outlined">check</span>
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => onDesfecho('vendeu')}
                        className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 text-left transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-500">do_not_disturb_on</span>
                        </div>
                        <div>
                            <p className="font-medium text-gray-700 dark:text-gray-400">Vendeu/Saiu</p>
                            <p className="text-xs text-gray-500">Inativar registro (não gerar alertas)</p>
                        </div>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-4 btn-secondary"
                >
                    Fechar
                </button>
            </div>
        </div>
    );
};

export default CRMRetencao;

// Modal de Campanha em Massa
const CampanhaModal = ({ clientes, tipo, onClose, onRegistrarContato }) => {
    const [mensagem, setMensagem] = useState('');
    const [progresso, setProgresso] = useState({}); // { id: 'pendente' | 'enviado' | 'registrado' }

    useEffect(() => {
        // Definir mensagem padrão baseada no tipo
        let msg = '';
        if (tipo === 'inativos') {
            msg = "Olá! Percebemos que faz um tempo que você não nos visita. Que tal agendar um check-up gratuito do seu veículo? 🚗✨";
        } else if (tipo === 'revisao') {
            msg = "Olá! Está chegando a hora da revisão do seu veículo. Vamos agendar para garantir sua segurança? 🔧📅";
        } else if (tipo === 'aniversario') {
            msg = "Parabéns! 🎂 Como presente de aniversário, temos um desconto especial de 10% na sua próxima troca de óleo. Venha aproveitar! 🎉";
        }
        setMensagem(msg);
    }, [tipo]);

    const enviarWhatsApp = (cliente) => {
        const telefone = cliente.telefone?.replace(/\D/g, '');
        if (!telefone) return;

        const textoEncoded = encodeURIComponent(mensagem);
        window.open(`https://wa.me/55${telefone}?text=${textoEncoded}`, '_blank');

        setProgresso(prev => ({ ...prev, [cliente.id]: 'enviado' }));
    };

    const registrarContato = (clienteId) => {
        onRegistrarContato(clienteId, 'campanha_massa'); // Registrar como 'campanha_massa' ou similar
        setProgresso(prev => ({ ...prev, [clienteId]: 'registrado' }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card w-full max-w-2xl animate-slideUp max-h-[90vh] flex flex-col bg-white dark:bg-gray-800">
                {/* Header */}
                <div className="p-6 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">campaign</span>
                            Nova Campanha
                        </h2>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                            {clientes.length} clientes selecionados • Filtro: {tipo.toUpperCase()}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Editor de Mensagem */}
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Mensagem da Campanha
                        </label>
                        <div className="relative">
                            <textarea
                                value={mensagem}
                                onChange={(e) => setMensagem(e.target.value)}
                                className="input min-h-[100px] pr-10 w-full"
                                placeholder="Digite a mensagem padrão..."
                            />
                            <div className="absolute bottom-3 right-3 text-gray-400 pointer-events-none">
                                <span className="material-symbols-outlined text-lg">edit</span>
                            </div>
                        </div>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">info</span>
                            A mensagem será pré-carregada no WhatsApp Web.
                        </p>
                    </div>

                    {/* Lista de Envio */}
                    <div>
                        <h3 className="font-semibold text-text-light dark:text-text-dark mb-3">
                            Fila de Envio
                        </h3>
                        <div className="border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl divide-y divide-[var(--color-border-light)] dark:divide-[var(--color-border-dark)]">
                            {clientes.map(cliente => {
                                const status = progresso[cliente.id] || 'pendente';
                                const telefoneValido = cliente.telefone && cliente.telefone.replace(/\D/g, '').length >= 10;

                                return (
                                    <div key={cliente.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                                ${status === 'registrado' ? 'bg-green-100 text-green-700' :
                                                    status === 'enviado' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-600'}`}>
                                                {status === 'registrado' ? <span className="material-symbols-outlined text-sm">check_circle</span> :
                                                    status === 'enviado' ? <span className="material-symbols-outlined text-sm">send</span> :
                                                        (cliente.nome?.charAt(0) || '?')}
                                            </div>
                                            <div>
                                                <p className="font-medium text-text-light dark:text-text-dark text-sm">
                                                    {cliente.nome}
                                                </p>
                                                {!telefoneValido && (
                                                    <span className="text-xs text-error">Sem telefone válido</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {status !== 'registrado' && telefoneValido && (
                                                <button
                                                    onClick={() => enviarWhatsApp(cliente)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors
                                                        ${status === 'enviado'
                                                            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                            : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                                >
                                                    <WhatsAppIcon size={16} />
                                                    {status === 'enviado' ? 'Reenviar' : 'Enviar'}
                                                </button>
                                            )}

                                            {status === 'enviado' && (
                                                <button
                                                    onClick={() => registrarContato(cliente.id)}
                                                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1"
                                                    title="Marcar como contatado"
                                                >
                                                    <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                                                    Registrar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-surface-light dark:bg-surface-dark flex justify-end">
                    <button onClick={onClose} className="btn-secondary">
                        Concluir Campanha
                    </button>
                </div>
            </div>
        </div>
    );
};
