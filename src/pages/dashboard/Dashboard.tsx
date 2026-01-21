// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useTabs } from '../../contexts/TabsContext';
import storage from '../../lib/storage';
import { formatCurrency, parseDateLocal } from '../../lib/utils';

const Dashboard = () => {
    const { empresa, usuario } = useAuth();
    const { openTab } = useTabs();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        clientes: 0,
        veiculos: 0,
        osAbertas: 0,
        osExecucao: 0,
        osFinalizadas: 0,
        osFinalizadasMes: 0,
        receitaMes: 0,
        receitaSemana: 0,
        patio: { total: 0, execucao: 0, aguardando: 0, aberta: 0, proximasEntregas: [] }
    });
    const [loading, setLoading] = useState(true);
    const { notificacoes, unreadCount, markAsRead, clearAll } = useNotification();
    const { openNovaOS } = useModal();
    const [osRecentes, setOsRecentes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [alertas, setAlertas] = useState([]);
    const [receitaSemanal, setReceitaSemanal] = useState([]);

    // Meta mensal de OS finalizadas (lida das configurações da empresa)
    const META_OS_MES = empresa?.metaMensalOS || 30;

    // Saudação contextual baseada na hora
    const getSaudacao = () => {
        const hora = new Date().getHours();
        if (hora < 12) return 'Bom dia';
        if (hora < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    // Data atual formatada
    const getDataAtual = () => {
        const data = new Date();
        const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        return `${dias[data.getDay()]}, ${data.getDate()} de ${meses[data.getMonth()]} `;
    };

    useEffect(() => {
        const carregarDados = async () => {
            if (!empresa) return;

            try {
                const [clientesData, veiculos, ordens, produtos, lancamentos, agendamentos] = await Promise.all([
                    storage.getAll('clientes', empresa.id),
                    storage.getAll('veiculos', empresa.id),
                    storage.getAll('ordens_servico', empresa.id),
                    storage.getAll('produtos', empresa.id),
                    storage.getAll('lancamentos_financeiros', empresa.id),
                    storage.getAll('agendamentos', empresa.id),
                ]);

                const ativos = clientesData.filter(c => c.ativo);
                const veiculosAtivos = veiculos.filter(v => v.ativo);
                const ordensAtivas = ordens.filter(o => o.ativo);
                const produtosAtivos = produtos.filter(p => p.ativo && (!p.tipo || p.tipo === 'produto'));

                // Filtrar lançamentos efetivados (receitas)
                const receitasEfetivadas = lancamentos.filter(l =>
                    l.ativo &&
                    l.tipo === 'receita' &&
                    l.status !== 'pendente'
                );

                setClientes(ativos);

                // Calcular métricas
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const inicioSemana = new Date(hoje);
                inicioSemana.setDate(hoje.getDate() - hoje.getDay());
                const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

                const osHoje = ordensAtivas.filter(o => new Date(o.criadoEm) >= hoje);
                const osFinalizadasHoje = ordensAtivas.filter(o => o.status === 'finalizada' && new Date(o.atualizadoEm || o.criadoEm) >= hoje);

                // Métricas de OS (Meta)
                // Fix: Usar data de finalização real (execucaoFinalizadaEm) se disponível, senão fallback para atualização
                const osFinalizadasMes = ordensAtivas.filter(o => {
                    if (o.status !== 'finalizada') return false;
                    const dataFim = o.execucaoFinalizadaEm || o.atualizadoEm || o.criadoEm;
                    return new Date(dataFim) >= inicioMes;
                });

                // Métricas Financeiras
                const receitaMes = receitasEfetivadas
                    .filter(l => parseDateLocal(l.data || l.criadoEm) >= inicioMes)
                    .reduce((acc, l) => acc + (l.valor || 0), 0);

                const receitaSemana = receitasEfetivadas
                    .filter(l => parseDateLocal(l.data || l.criadoEm) >= inicioSemana)
                    .reduce((acc, l) => acc + (l.valor || 0), 0);

                setStats({
                    clientes: ativos.length,
                    veiculos: veiculosAtivos.length,
                    osAbertas: ordensAtivas.filter(o => o.status === 'aberta').length,
                    osExecucao: ordensAtivas.filter(o => o.status === 'execucao').length,
                    osFinalizadas: ordensAtivas.filter(o => o.status === 'finalizada').length,
                    osFinalizadasMes: osFinalizadasMes.length,
                    orcamentosPendentes: ordensAtivas.filter(o => o.status === 'orcamento').length,
                    osHoje: osHoje.length,
                    finalizadasHoje: osFinalizadasHoje.length,
                    receitaMes,
                    receitaSemana,
                    // Stats do Pátio
                    patio: {
                        total: ordensAtivas.filter(o => ['aberta', 'execucao', 'aguardando_peca', 'aguardando_aprovacao'].includes(o.status)).length,
                        execucao: ordensAtivas.filter(o => o.status === 'execucao').length,
                        aguardando: ordensAtivas.filter(o => ['aguardando_peca', 'aguardando_aprovacao'].includes(o.status)).length,
                        aberta: ordensAtivas.filter(o => o.status === 'aberta').length,
                        proximasEntregas: ordensAtivas
                            .filter(o => ['aberta', 'execucao'].includes(o.status) && o.previsaoEntrega)
                            .sort((a, b) => new Date(a.previsaoEntrega) - new Date(b.previsaoEntrega))
                            .slice(0, 3)
                    }
                });

                // Calcular receita dos últimos 7 dias para o gráfico
                const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                const receitaPorDia = [];
                for (let i = 6; i >= 0; i--) {
                    const dia = new Date(hoje);
                    dia.setDate(hoje.getDate() - i);
                    const inicioDia = new Date(dia);
                    inicioDia.setHours(0, 0, 0, 0);
                    const fimDia = new Date(dia);
                    fimDia.setHours(23, 59, 59, 999);

                    // Somar lançamentos do dia
                    const receitaDia = receitasEfetivadas
                        .filter(l => {
                            const dataL = parseDateLocal(l.data || l.criadoEm);
                            return dataL >= inicioDia && dataL <= fimDia;
                        })
                        .reduce((acc, l) => acc + (l.valor || 0), 0);

                    receitaPorDia.push({
                        dia: diasSemana[dia.getDay()],
                        data: dia.getDate(),
                        valor: receitaDia,
                    });
                }
                setReceitaSemanal(receitaPorDia);

                setOsRecentes(
                    ordensAtivas
                        .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
                        .slice(0, 5)
                );

                // Gerar alertas inteligentes
                const novosAlertas = [];

                // Agendamentos para Amanhã (NOVO)
                const amanha = new Date(hoje);
                amanha.setDate(hoje.getDate() + 1);

                const agendamentosAmanha = (agendamentos || []).filter(a => {
                    if (!a.data || !a.ativo) return false;
                    const d = parseDateLocal(a.data);
                    return d.getDate() === amanha.getDate() &&
                        d.getMonth() === amanha.getMonth() &&
                        d.getFullYear() === amanha.getFullYear();
                });

                if (agendamentosAmanha.length > 0) {
                    novosAlertas.push({
                        tipo: 'info',
                        icon: 'event',
                        titulo: `${agendamentosAmanha.length} agendamentos amanhã`,
                        descricao: 'Prepare-se para o dia seguinte',
                        link: '/agenda',
                        cor: 'bg-indigo-500',
                    });
                }

                // Orçamentos aguardando aprovação
                const orcamentos = ordensAtivas.filter(o => o.status === 'orcamento');
                if (orcamentos.length > 0) {
                    novosAlertas.push({
                        tipo: 'warning',
                        icon: 'receipt_long',
                        titulo: `${orcamentos.length} orçamento${orcamentos.length > 1 ? 's' : ''} pendente${orcamentos.length > 1 ? 's' : ''} `,
                        descricao: 'Aguardando aprovação do cliente',
                        link: '/os',
                        cor: 'bg-yellow-500',
                    });
                }

                // OS sem técnico atribuído
                const osSemTecnico = ordensAtivas.filter(o => ['aberta', 'execucao'].includes(o.status) && !o.tecnicoId);
                if (osSemTecnico.length > 0) {
                    novosAlertas.push({
                        tipo: 'info',
                        icon: 'person_off',
                        titulo: `${osSemTecnico.length} OS sem técnico`,
                        descricao: 'Atribua um técnico para prosseguir',
                        link: '/os',
                        cor: 'bg-blue-500',
                    });
                }

                // Estoque baixo - usa 'quantidade' e verifica se estoqueMinimo é um número válido
                const estoqueBaixo = produtosAtivos.filter(p => {
                    const estoqueMin = Number(p.estoqueMinimo) || 0;
                    const estoqueAtual = Number(p.quantidade) || 0;
                    return estoqueMin > 0 && estoqueAtual <= estoqueMin;
                });
                if (estoqueBaixo.length > 0) {
                    novosAlertas.push({
                        tipo: 'error',
                        icon: 'inventory_2',
                        titulo: `${estoqueBaixo.length} produto${estoqueBaixo.length > 1 ? 's' : ''} com estoque baixo`,
                        descricao: estoqueBaixo.slice(0, 2).map(p => p.nome).join(', ') + (estoqueBaixo.length > 2 ? '...' : ''),
                        link: '/estoque',
                        cor: 'bg-red-500',
                    });
                }

                // OS em execução há muito tempo (mais de 3 dias)
                const osAtrasadas = ordensAtivas.filter(o => {
                    if (o.status !== 'execucao') return false;
                    const diasEmExecucao = Math.floor((Date.now() - new Date(o.criadoEm)) / (1000 * 60 * 60 * 24));
                    return diasEmExecucao > 3;
                });
                if (osAtrasadas.length > 0) {
                    novosAlertas.push({
                        tipo: 'warning',
                        icon: 'schedule',
                        titulo: `${osAtrasadas.length} OS em Execução há mais de 3 dias`,
                        descricao: 'Verifique se há pendências',
                        link: '/os',
                        cor: 'bg-orange-500',
                    });
                }

                // Revisões de Veículos
                const veiculosRevisao = veiculosAtivos.filter(v => {
                    let precisaRevisao = false;

                    // Verificar por Data
                    if (v.proximaRevisaoData) {
                        const dataRevisao = new Date(v.proximaRevisaoData + 'T23:59:59'); // Fim do dia
                        const diffDias = Math.floor((dataRevisao - hoje) / (1000 * 60 * 60 * 24));
                        if (diffDias <= 7) precisaRevisao = true; // Vencida ou próxima (7 dias)
                    }

                    return precisaRevisao;
                });

                if (veiculosRevisao.length > 0) {
                    novosAlertas.push({
                        tipo: 'warning',
                        icon: 'car_crash',
                        titulo: `${veiculosRevisao.length} revisões pendentes`,
                        descricao: 'Veículos próximos ou com revisão vencida',
                        link: '/crm?tab=revisao',
                        cor: 'bg-orange-500',
                    });
                }

                setAlertas(novosAlertas);
            } catch (error) {
                console.error('Erro ao carregar dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        carregarDados();

        // Listener para sincronização em tempo real (Outras abas)
        const handleStorageChange = (e) => {
            if (e.key?.includes('ordens_servico') || e.key?.includes('lancamentos_financeiros')) {
                carregarDados();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Listener para sincronização na MESMA aba (via CustomEvent do storage.js)
        const handleCustomStorageChange = (e) => {
            if (e.detail?.key?.includes('ordens_servico') || e.detail?.key?.includes('lancamentos_financeiros')) {
                carregarDados();
            }
        };
        window.addEventListener('osprimex-storage', handleCustomStorageChange);

        // Atualizar a cada 5 minutos (fallback)
        const interval = setInterval(carregarDados, 5 * 60 * 1000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('osprimex-storage', handleCustomStorageChange);
            clearInterval(interval);
        };
    }, [empresa]);

    const getClienteNome = (id) => clientes.find(c => c.id === id)?.nome || 'Cliente';

    const statusConfig = {
        orcamento: { label: 'Orçamento', color: 'bg-yellow-500' },
        aberta: { label: 'Aprovada (Não Iniciada)', color: 'bg-slate-500' },
        execucao: { label: 'Execução', color: 'bg-primary' },
        aguardando_peca: { label: 'Aguardando Peça', color: 'bg-orange-500' },
        aguardando_aprovacao: { label: 'Aguardando Aprovação', color: 'bg-yellow-600' },
        finalizada: { label: 'Finalizada', color: 'bg-green-500' },
        cancelada: { label: 'Cancelada', color: 'bg-red-500' },
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
        <div className="p-4 lg:p-6 space-y-5">
            {/* Header com saudação contextual */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        {getSaudacao()}, {usuario?.nome?.split(' ')[0]}!
                        <span className="text-2xl">{new Date().getHours() < 12 ? '☀️' : new Date().getHours() < 18 ? '🌤️' : '🌙'}</span>
                    </h1>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        {getDataAtual()}
                    </p>
                </div>
                <button onClick={() => openNovaOS()} className="btn-primary py-2 px-4 text-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nova OS
                </button>
            </div>

            {/* Alertas Inteligentes */}
            {alertas.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {alertas.map((alerta, index) => {
                        const handleAlertClick = () => {
                            if (alerta.link === '/os') {
                                openTab({ id: 'os', type: 'list-os', title: 'Ordens de Serviço' });
                            } else if (alerta.link === '/estoque') {
                                openTab({ id: 'estoque', type: 'list-produtos', title: 'Estoque' });
                            } else if (alerta.link?.includes('/crm')) {
                                openTab({ id: 'crm', type: 'crm', title: 'CRM' });
                            }
                        };
                        return (
                            <div
                                key={index}
                                onClick={handleAlertClick}
                                className="card p-3 flex items-center gap-3 hover:shadow-md transition-all group border-l-4 cursor-pointer"
                                style={{ borderLeftColor: alerta.cor?.replace('bg-', '').includes('yellow') ? '#eab308' : alerta.cor?.replace('bg-', '').includes('blue') ? '#3b82f6' : alerta.cor?.replace('bg-', '').includes('red') ? '#ef4444' : alerta.cor?.replace('bg-', '').includes('orange') ? '#f97316' : '#6b7280' }}
                            >
                                <div className={`w-10 h-10 rounded-full ${alerta.cor} flex items-center justify-center text-white shrink-0`}>
                                    <span className="material-symbols-outlined">{alerta.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
                                        {alerta.titulo}
                                    </p>
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">
                                        {alerta.descricao}
                                    </p>
                                </div>
                                <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors">
                                    chevron_right
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Status do Pátio (Workshop Pulse) */}
            <div className="card p-0 overflow-hidden border-l-4 border-l-primary relative mb-6">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-9xl">garage_home</span>
                </div>

                <div className="p-5 flex flex-col lg:flex-row gap-6 lg:gap-10 relative z-10">
                    {/* Indicador Principal */}
                    <div className="flex-shrink-0 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-4xl">directions_car</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                Veículos no Pátio
                            </h2>
                            <p className="text-4xl font-extrabold text-text-light dark:text-text-dark leading-tight">
                                {stats.patio.total}
                            </p>
                            <button onClick={() => openTab({ id: 'agenda', type: 'agenda', title: 'Agenda' })} className="text-xs text-primary font-medium hover:underline flex items-center gap-1 mt-1">
                                Ver na Agenda <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>

                    {/* Barra de Distribuição */}
                    <div className="flex-1 flex flex-col justify-center min-w-[200px]">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs mb-2 font-medium">
                            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Em Execução ({stats.patio.execucao})
                            </span>
                            <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Aguardando ({stats.patio.aguardando})
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-500"></span> Aprovada (Não Iniciada) ({stats.patio.aberta})
                            </span>
                        </div>

                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                            {stats.patio.total > 0 ? (
                                <>
                                    <div style={{ width: `${(stats.patio.execucao / stats.patio.total) * 100}% ` }} className="h-full bg-blue-500 hover:bg-blue-600 transition-colors" title="Em Execução" />
                                    <div style={{ width: `${(stats.patio.aguardando / stats.patio.total) * 100}% ` }} className="h-full bg-orange-500 hover:bg-orange-600 transition-colors" title="Aguardando" />
                                    <div style={{ width: `${(stats.patio.aberta / stats.patio.total) * 100}% ` }} className="h-full bg-slate-500 hover:bg-slate-600 transition-colors" title="Aprovada (Não Iniciada)" />
                                </>
                            ) : (
                                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] text-gray-400">
                                    Pátio Vazio
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Próximas Entregas */}
                    {stats.patio.proximasEntregas.length > 0 && (
                        <div className="lg:w-72 lg:border-l border-gray-100 dark:border-gray-700 lg:pl-6">
                            <h3 className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">schedule_send</span>
                                Próximas Entregas
                            </h3>
                            <div className="space-y-2">
                                {stats.patio.proximasEntregas.map(os => (
                                    <div
                                        key={os.id}
                                        onClick={() => openTab({ id: `os-${os.id}`, type: 'os', title: `OS #${os.numero}`, data: { osId: os.id } })}
                                        className="flex items-center justify-between group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-xs font-bold text-text-light dark:text-text-dark bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded group-hover:bg-primary group-hover:text-white transition-colors">
                                                #{os.numero}
                                            </span>
                                            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">
                                                {os.veiculo?.modelo}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                                            {new Date(os.previsaoEntrega).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Resumo do Dia */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card p-4 bg-gradient-to-br from-blue-400/90 to-blue-500/90 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-2xl opacity-80">assignment</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">Hoje</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.osHoje || 0}</p>
                    <p className="text-sm opacity-80">Não Iniciadas</p>
                </div>
                <div className="card p-4 bg-gradient-to-br from-green-400/90 to-green-500/90 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-2xl opacity-80">check_circle</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">Hoje</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.finalizadasHoje || 0}</p>
                    <p className="text-sm opacity-80">Finalizadas</p>
                </div>
                <div className="card p-4 bg-gradient-to-br from-emerald-400/90 to-teal-500/90 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-2xl opacity-80">payments</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">Semana</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(stats.receitaSemana || 0)}</p>
                    <p className="text-sm opacity-80">Receita</p>
                </div>
                <div className="card p-4 bg-gradient-to-br from-purple-400/90 to-violet-500/90 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-2xl opacity-80">trending_up</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">Mês</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(stats.receitaMes || 0)}</p>
                    <p className="text-sm opacity-80">Receita total</p>
                </div>
            </div>

            {/* Stats Grid - compacto */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                    { label: 'Clientes', value: stats.clientes, icon: 'group', color: 'text-blue-500', link: '/clientes' },
                    { label: 'Veículos', value: stats.veiculos, icon: 'directions_car', color: 'text-purple-500', link: '/veiculos' },
                    { label: 'Orçamentos', value: stats.orcamentosPendentes || 0, icon: 'receipt_long', color: 'text-yellow-600', link: '/os' },
                    { label: 'Não Iniciadas', value: stats.osAbertas, icon: 'inbox', color: 'text-slate-500', link: '/os' },
                    { label: 'Execução', value: stats.osExecucao, icon: 'engineering', color: 'text-orange-500', link: '/os' },
                    { label: 'Finalizadas', value: stats.osFinalizadas, icon: 'check_circle', color: 'text-green-500', link: '/os' },
                ].map((card, index) => {
                    const handleClick = () => {
                        if (card.link === '/clientes') {
                            openTab({ id: 'clientes', type: 'list-clientes', title: 'Clientes' });
                        } else if (card.link === '/veiculos') {
                            openTab({ id: 'veiculos', type: 'list-veiculos', title: 'Veículos' });
                        } else if (card.link === '/os') {
                            openTab({ id: 'os', type: 'list-os', title: 'Ordens de Serviço' });
                        }
                    };
                    return (
                        <div
                            key={index}
                            onClick={handleClick}
                            className="card p-3 hover:shadow-sm transition-all text-center group cursor-pointer"
                        >
                            <span className={`material-symbols-outlined text-xl ${card.color} mb-1`}>{card.icon}</span>
                            <p className="text-xl font-bold text-text-light dark:text-text-dark">
                                {card.value}
                            </p>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{card.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Gráfico de Receita Semanal + Meta Mensal */}
            <div className="grid lg:grid-cols-2 gap-4">
                {/* Gráfico de Receita - Últimos 7 dias */}
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-text-light dark:text-text-dark flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">bar_chart</span>
                            Receita - Últimos 7 dias
                        </h2>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            Total: {formatCurrency(receitaSemanal.reduce((acc, d) => acc + d.valor, 0))}
                        </span>
                    </div>
                    <div className="flex items-end justify-between gap-2" style={{ height: '120px' }}>
                        {receitaSemanal.map((dia, index) => {
                            const maxValor = Math.max(...receitaSemanal.map(d => d.valor), 1);
                            const alturaPercent = dia.valor > 0 ? (dia.valor / maxValor) * 100 : 0;
                            const alturaPx = dia.valor > 0 ? Math.max((alturaPercent / 100) * 100, 8) : 4; // min 8px se tem valor
                            const isHoje = index === receitaSemanal.length - 1;
                            return (
                                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-xs font-medium text-text-light dark:text-text-dark">
                                        {dia.valor > 0 ? formatCurrency(dia.valor).replace('R$', '').trim() : '-'}
                                    </span>
                                    <div
                                        className={`w - full rounded - t - lg transition - all ${isHoje
                                            ? 'bg-gradient-to-t from-primary to-blue-400'
                                            : dia.valor > 0
                                                ? 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                                                : 'bg-gray-200 dark:bg-gray-700'
                                            } `}
                                        style={{ height: `${alturaPx} px`, minHeight: dia.valor > 0 ? '8px' : '4px' }}
                                        title={`${dia.dia} ${dia.data}: ${formatCurrency(dia.valor)} `}
                                    />
                                    <span className={`text - xs ${isHoje ? 'font-bold text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'} `}>
                                        {dia.dia}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Rodapé com contexto adicional */}
                    {(() => {
                        const totalSemana = receitaSemanal.reduce((acc, d) => acc + d.valor, 0);
                        const mediaDia = totalSemana / 7;
                        return (
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                    <span className="font-medium">Média/dia:</span> {formatCurrency(mediaDia)}
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">trending_up</span>
                                    vs semana passada
                                </div>
                            </div>
                        );
                    })()}

                </div>

                {/* Meta Mensal - Expandido */}
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-text-light dark:text-text-dark flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">flag</span>
                            Meta do Mês
                        </h2>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                            {stats.osFinalizadasMes || 0} / {META_OS_MES} OS
                        </span>
                    </div>

                    {/* Barra de progresso com percentual */}
                    <div className="mb-4">
                        <div className="flex justify-between mb-1">
                            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">OS Finalizadas</span>
                            <span className="text-xs font-bold text-text-light dark:text-text-dark">
                                {Math.min(Math.round(((stats.osFinalizadasMes || 0) / META_OS_MES) * 100), 100)}%
                            </span>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${(stats.osFinalizadasMes || 0) >= META_OS_MES
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                    : 'bg-gradient-to-r from-primary to-blue-400'
                                    }`}
                                style={{ width: `${Math.min(((stats.osFinalizadasMes || 0) / META_OS_MES) * 100, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Métricas detalhadas */}
                    {(() => {
                        const faltam = Math.max(0, META_OS_MES - (stats.osFinalizadasMes || 0));
                        const hoje = new Date();
                        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
                        const diasRestantes = ultimoDiaMes - hoje.getDate() + 1;
                        const diasPassados = hoje.getDate();
                        const necessarioPorDia = faltam > 0 ? faltam / diasRestantes : 0;
                        const ritmoAtual = diasPassados > 0 ? (stats.osFinalizadasMes || 0) / diasPassados : 0;
                        const metaAtingida = (stats.osFinalizadasMes || 0) >= META_OS_MES;
                        const noRitmo = ritmoAtual >= (META_OS_MES / ultimoDiaMes);

                        return (
                            <>
                                {/* Grid de métricas */}
                                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg py-2">
                                        <p className="text-lg font-bold text-text-light dark:text-text-dark">{faltam}</p>
                                        <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Faltam</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg py-2">
                                        <p className="text-lg font-bold text-text-light dark:text-text-dark">{diasRestantes}</p>
                                        <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">Dias restantes</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg py-2">
                                        <p className="text-lg font-bold text-text-light dark:text-text-dark">{necessarioPorDia.toFixed(1)}</p>
                                        <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">OSs/dia</p>
                                    </div>
                                </div>

                                {/* Status de ritmo */}
                                <div className={`p-2.5 rounded-lg flex items-center gap-2 ${metaAtingida
                                    ? 'bg-green-50 dark:bg-green-900/20'
                                    : noRitmo
                                        ? 'bg-blue-50 dark:bg-blue-900/20'
                                        : 'bg-orange-50 dark:bg-orange-900/20'
                                    }`}>
                                    <span className={`material-symbols-outlined text-lg ${metaAtingida
                                        ? 'text-green-500'
                                        : noRitmo
                                            ? 'text-primary'
                                            : 'text-orange-500'
                                        }`}>
                                        {metaAtingida ? 'celebration' : noRitmo ? 'check_circle' : 'warning'}
                                    </span>
                                    <div className="flex-1">
                                        <p className={`text-xs font-semibold ${metaAtingida
                                            ? 'text-green-700 dark:text-green-400'
                                            : noRitmo
                                                ? 'text-primary'
                                                : 'text-orange-700 dark:text-orange-400'
                                            }`}>
                                            {metaAtingida
                                                ? '🎉 Meta atingida!'
                                                : `Ritmo atual: ${ritmoAtual.toFixed(1)} OS/dia`
                                            }
                                        </p>
                                        <p className={`text-[10px] ${metaAtingida
                                            ? 'text-green-600 dark:text-green-500'
                                            : noRitmo
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-orange-600 dark:text-orange-400'
                                            }`}>
                                            {metaAtingida
                                                ? 'Parabéns! Você superou a meta do mês.'
                                                : noRitmo
                                                    ? 'Você está no ritmo para atingir a meta!'
                                                    : 'Abaixo do ritmo necessário'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid lg:grid-cols-3 gap-4">
                {/* Ações Rápidas */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-text-light dark:text-text-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">bolt</span>
                        Ações Rápidas
                    </h2>
                    <div className="space-y-2">
                        {/* Novo Cliente - Abre cadastro direto */}
                        <button
                            onClick={() => openTab({ id: 'cliente-novo', type: 'cliente', title: 'Novo Cliente', data: {} })}
                            className="w-full card p-3 flex items-center gap-3 hover:shadow-sm hover:translate-x-1 transition-all text-left"
                        >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-blue-500 bg-blue-50 dark:bg-blue-900/20">
                                <span className="material-symbols-outlined text-lg">person_add</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-light dark:text-text-dark">Novo Cliente</p>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Cadastrar cliente</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                        </button>

                        {/* Abrir OS - Abre Modal de Nova OS diretamente */}
                        <button
                            onClick={() => openNovaOS()}
                            className="w-full card p-3 flex items-center gap-3 hover:shadow-sm hover:translate-x-1 transition-all text-left"
                        >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-green-500 bg-green-50 dark:bg-green-900/20">
                                <span className="material-symbols-outlined text-lg">assignment_add</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-light dark:text-text-dark">Abrir OS</p>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Nova ordem de serviço</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                        </button>

                        {/* Agendar - Abre Agenda com modal de agendamento automaticamente */}
                        <button
                            onClick={() => openTab({ id: 'agenda', type: 'agenda', title: 'Agenda', data: { autoOpenAgendamento: true, autoOpenTimestamp: Date.now() } })}
                            className="w-full card p-3 flex items-center gap-3 hover:shadow-sm hover:translate-x-1 transition-all text-left"
                        >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-purple-500 bg-purple-50 dark:bg-purple-900/20">
                                <span className="material-symbols-outlined text-lg">calendar_add_on</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-light dark:text-text-dark">Agendar</p>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Novo agendamento</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                        </button>

                        {/* Financeiro - Abre Financeiro com modal de lançamento automaticamente */}
                        <button
                            onClick={() => openTab({ id: 'financeiro', type: 'financeiro', title: 'Financeiro', data: { autoOpenLancamento: true, autoOpenTimestamp: Date.now() } })}
                            className="w-full card p-3 flex items-center gap-3 hover:shadow-sm hover:translate-x-1 transition-all text-left"
                        >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20">
                                <span className="material-symbols-outlined text-lg">payments</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-light dark:text-text-dark">Financeiro</p>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Lançar receita/despesa</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                        </button>
                    </div>
                </div>

                {/* OS Recentes */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-text-light dark:text-text-dark flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">history</span>
                            OS Recentes
                        </h2>
                        <button
                            onClick={() => openTab({ id: 'os', type: 'list-os', title: 'Ordens de Serviço' })}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                            Ver todas
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>

                    {osRecentes.length === 0 ? (
                        <div className="card p-8 text-center">
                            <span className="material-symbols-outlined text-4xl text-gray-300 mb-3">assignment</span>
                            <p className="text-sm text-text-light dark:text-text-dark font-medium mb-1">
                                Nenhuma OS ainda
                            </p>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-4">
                                Abra sua primeira ordem de serviço para começar.
                            </p>
                            <button onClick={() => openNovaOS()} className="btn-primary py-2 px-4 text-sm inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-lg">add</span>
                                Nova OS
                            </button>
                        </div>
                    ) : (
                        <div className="card overflow-hidden overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="text-left py-2.5 px-3 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">#</th>
                                        <th className="text-left py-2.5 px-3 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">Cliente</th>
                                        <th className="text-left py-2.5 px-3 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase hidden sm:table-cell">Status</th>
                                        <th className="text-right py-2.5 px-3 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {osRecentes.map((os, index) => (
                                        <tr
                                            key={os.id}
                                            onClick={() => openTab({ id: `os-${os.id}`, type: 'os', title: `OS #${os.numero}`, data: { osId: os.id } })}
                                            className={`
cursor - pointer hover: bg - gray - 50 dark: hover: bg - gray - 800 / 50 transition - colors
                                                ${index !== osRecentes.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}
`}
                                        >
                                            <td className="py-2.5 px-3">
                                                <span className="text-xs font-bold text-primary">#{os.numero}</span>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <p className="text-sm text-text-light dark:text-text-dark truncate max-w-[150px]">
                                                    {getClienteNome(os.clienteId)}
                                                </p>
                                            </td>
                                            <td className="py-2.5 px-3 hidden sm:table-cell">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${statusConfig[os.status]?.color}`} />
                                                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                                        {statusConfig[os.status]?.label}
                                                    </span>
                                                    {os.tipo && os.tipo !== 'os' && os.tipo !== 'orcamento' && (
                                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ml-1 ${os.tipo === 'garantia' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : ''} ${os.tipo === 'cortesia' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' : ''} ${os.tipo === 'retorno' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : ''} ${os.tipo === 'interna' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}`}>
                                                            {os.tipo}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <span className="text-sm font-medium text-text-light dark:text-text-dark">
                                                    {formatCurrency(os.valorTotal || 0)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default Dashboard;

