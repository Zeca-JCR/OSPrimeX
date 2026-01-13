import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import storage from '../../lib/storage';
import { toISODate } from '../../lib/utils';
import AgendaCalendar from '../../components/agenda/AgendaCalendar';
import PatioSidebar from '../../components/agenda/PatioSidebar';
import { NovaOSModal } from '../../components/os/NovaOSModal';

const Agenda = ({ isTabMode, onClose, openAgendamentoId, timestamp }) => {
    const { empresa } = useAuth();
    const location = useLocation();
    const [agendamentos, setAgendamentos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);
    const [activeOS, setActiveOS] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [agendamentoEdit, setAgendamentoEdit] = useState(null);

    // Estado para Nova OS via Agenda
    const [showNovaOS, setShowNovaOS] = useState(false);
    const [novaOSData, setNovaOSData] = useState({ clienteId: '', veiculoId: '' });

    // Persistência da View (Semana, Mês, Dia)
    const [view, setView] = useState(() => localStorage.getItem('agenda_view') || 'week');

    const handleViewChange = (newView) => {
        setView(newView);
        localStorage.setItem('agenda_view', newView);
    };

    useEffect(() => {
        carregarDados();
    }, [empresa]);

    // Efeito para abrir agendamento vindo de notificação (via Prop ou Location State)
    useEffect(() => {
        const targetId = openAgendamentoId || location.state?.openAgendamentoId;

        console.log("Agenda Effect:", { loading, targetId, totalAgendamentos: agendamentos.length, timestamp });

        if (!loading && targetId && agendamentos.length > 0) {
            // Loose equality to handle string/number mismatch (e.g. "123" vs 123)
            const ag = agendamentos.find(a => String(a.id) === String(targetId));
            console.log("Encontrado agendamento:", ag);
            if (ag) {
                setAgendamentoEdit(ag);
                setShowModal(true);
                // Limpar state para não reabrir ao navegar (apenas se veio via state)
                if (location.state?.openAgendamentoId) {
                    window.history.replaceState({}, document.title);
                }
            }
        }
    }, [loading, location.state, agendamentos, openAgendamentoId, timestamp]);

    const carregarDados = async () => {
        if (!empresa) return;
        try {
            const [agendamentosData, clientesData, veiculosData, colaboradoresData, osData] = await Promise.all([
                storage.getAll('agendamentos', empresa.id),
                storage.getAll('clientes', empresa.id),
                storage.getAll('veiculos', empresa.id),
                storage.getAll('colaboradores', empresa.id),
                storage.getAll('ordens_servico', empresa.id),
            ]);

            setAgendamentos(agendamentosData.filter((a) => a.ativo));
            setAgendamentos(agendamentosData.filter((a) => a.ativo));
            setClientes(clientesData.filter((c) => c.ativo));
            setVeiculos(veiculosData.filter((v) => v.ativo));
            // Filtrar apenas técnicos da lista de colaboradores
            setTecnicos(colaboradoresData.filter(c => c.ativo !== false));

            // Enriquecer OS com dados de veiculo e cliente para o Sidebar
            const osEnriched = osData.filter(os => os.ativo !== false).map(os => ({
                ...os,
                veiculo: veiculosData.find(v => v.id === os.veiculoId),
                cliente: clientesData.find(c => c.id === os.clienteId)
            }));
            setActiveOS(osEnriched);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const events = useMemo(() => {
        const agendamentoEvents = agendamentos.map(ag => {
            // Força timezone ignorando deslocamento, assumindo que a string YYYY-MM-DD é local
            // Para hora, usa a string HH:MM
            const start = new Date(`${ag.data}T${ag.hora}:00`);
            const end = new Date(start.getTime() + 30 * 60000);

            const cliente = clientes.find(c => c.id === ag.clienteId);
            const veiculo = veiculos.find(v => v.id === ag.veiculoId);
            let title = `${cliente?.nome || 'Cliente'} - ${veiculo?.placa || ''}`;

            if (ag.status === 'bloqueio') {
                title = ag.observacoes || 'Indisponível';
            }

            // Adicionar nome do técnico ao título se houver
            const tecnico = tecnicos.find(t => t.id === ag.tecnicoId);
            if (tecnico) {
                title += ` (${tecnico.nome.split(' ')[0]})`;
            }

            // Warning de agendamento próximo
            const diasAntecedencia = empresa?.agendaDiasAntecedencia || 1;
            const hoje = new Date();
            const limite = new Date();
            limite.setDate(hoje.getDate() + diasAntecedencia);

            const startDay = new Date(start);
            startDay.setHours(0, 0, 0, 0);
            const hojeDay = new Date();
            hojeDay.setHours(0, 0, 0, 0);
            const limiteDay = new Date(limite);
            limiteDay.setHours(0, 0, 0, 0);

            if (ag.status === 'agendado' && startDay >= hojeDay && startDay <= limiteDay) {
                title = `🔔 ${title}`;
            }

            return {
                id: ag.id,
                title,
                start,
                end,
                resourceId: ag.tecnicoId,
                status: ag.status,
                original: ag,
                type: 'agendamento'
            };
        });

        const osEvents = activeOS.map(os => {
            // Filtrar OS's concluídas, canceladas ou orçamentos da Agenda
            if (['finalizada', 'cancelada', 'concluida', 'orcamento'].includes(os.status)) return null;

            // Data de Abertura define onde aparece no calendário
            const rawDate = os.dataAbertura || os.criadoEm;
            if (!rawDate) return null;

            // Converte para objeto Date para lidar com timezone corretamente
            const dateObj = new Date(rawDate);

            // Cria data de início e fim no dia local correspondente
            const start = new Date(dateObj);
            start.setHours(0, 0, 0, 0);

            const end = new Date(dateObj);
            end.setHours(23, 59, 59, 999);

            // Dados enriquecidos já vieram do carregarDados (veiculo, cliente)
            const placa = os.veiculo?.placa || 'Sem Placa';
            const modelo = os.veiculo?.modelo || '';
            const statusLabelMap = {
                aberta: 'APROVADA (NÃO INICIADA)',
                execucao: 'EM EXECUÇÃO',
                aguardando_peca: 'AGUARDANDO PEÇA',
                finalizada: 'FINALIZADA',
                cancelada: 'CANCELADA',
                orcamento: 'ORÇAMENTO'
            };
            const statusLabel = statusLabelMap[os.status] || os.status.replace('_', ' ').toUpperCase();

            return {
                id: `os-${os.id}`, // ID único para diferenciar de agendamentos
                title: `OS #${os.numero} | ${placa} ${modelo} [${statusLabel}]`,
                start,
                end,
                allDay: true, // Força exibição no topo (seção dia inteiro)
                status: os.status,
                type: 'os',
                original: os
            };
        }).filter(Boolean);

        return [...agendamentoEvents, ...osEvents];
    }, [agendamentos, activeOS, clientes, veiculos, tecnicos, empresa]);

    const handleNovoAgendamento = (slotInfo) => {
        const dataStr = toISODate(slotInfo.start);
        const horaStr = slotInfo.start.toTimeString().slice(0, 5);

        setAgendamentoEdit({
            data: dataStr,
            hora: horaStr,
            tecnicoId: ''
        });
        setShowModal(true);
    };

    const handleEditAgendamento = (evento) => {
        // Se for uma OS, por enquanto apenas ignoramos ou avisamos
        if (evento.type === 'os') {
            return;
        }

        setAgendamentoEdit(evento.original);
        setShowModal(true);
    };

    const handleEventDrop = async ({ event, start }) => {
        // Usa helper para obter string local segura (YYYY-MM-DD)
        const novaData = toISODate(start);

        const novaHora = start.toTimeString().slice(0, 5);

        // Validação de conflito no Drag & Drop
        const conflito = agendamentos.find(a =>
            a.id !== event.id &&
            a.tecnicoId === event.original.tecnicoId &&
            a.data === novaData &&
            a.hora === novaHora &&
            a.status !== 'cancelado'
        );

        if (conflito && event.original.tecnicoId) {
            alert(`Conflito! O técnico já tem agendamento em ${novaData} às ${novaHora}.`);
            return;
        }

        try {
            await storage.update('agendamentos', event.id, {
                ...event.original,
                data: novaData,
                hora: novaHora
            });
            await carregarDados();
        } catch (error) {
            console.error("Erro ao mover evento:", error);
            alert("Erro ao mover agendamento.");
        }
    };

    const handleSave = () => {
        setShowModal(false);
        setAgendamentoEdit(null);
        carregarDados();
    };

    const handleCriarOS = (agendamento) => {
        if (!agendamento.clienteId || !agendamento.veiculoId) {
            alert("Este agendamento precisa ter Cliente e Veículo definidos para gerar uma OS.");
            return;
        }
        setNovaOSData({
            clienteId: agendamento.clienteId,
            veiculoId: agendamento.veiculoId
        });
        setShowModal(false);
        setShowNovaOS(true);
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
        <div className="h-full flex bg-background-light dark:bg-background-dark overflow-hidden">
            {/* Main Calendar Area */}
            <div className="flex-1 flex flex-col p-4 h-full overflow-hidden">
                <header className="flex justify-between items-center mb-4 flex-shrink-0">

                    <h1 className="text-xl font-bold text-text-light dark:text-text-dark">
                        Agenda
                    </h1>
                    <button
                        onClick={() => handleNovoAgendamento({ start: new Date() })}
                        className="btn-primary"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Novo Agendamento
                    </button>
                </header>

                <AgendaCalendar
                    events={events}
                    view={view}
                    onView={handleViewChange}
                    onEventDrop={handleEventDrop}
                    onEventClick={handleEditAgendamento}
                    onSlotSelect={handleNovoAgendamento}
                />
            </div>

            {/* Sidebar Pátio */}
            <PatioSidebar activeOS={activeOS} loading={loading} />


            {showModal && (
                <AgendamentoModal
                    agendamento={agendamentoEdit}
                    clientes={clientes}
                    veiculos={veiculos}
                    tecnicos={tecnicos}
                    todosAgendamentos={agendamentos}
                    empresa={empresa}
                    onClose={() => {
                        setShowModal(false);
                        setAgendamentoEdit(null);
                    }}
                    onSave={handleSave}
                    onCriarOS={handleCriarOS}
                />
            )}

            {showNovaOS && (
                <NovaOSModal
                    clientes={clientes}
                    veiculos={veiculos}
                    empresaId={empresa?.id}
                    initialClienteId={novaOSData.clienteId}
                    initialVeiculoId={novaOSData.veiculoId}
                    onClose={() => setShowNovaOS(false)}
                    onSave={() => {
                        setShowNovaOS(false);
                        alert("OS Criada com sucesso!");
                    }}
                />
            )}
        </div>
    );
};

const AgendamentoModal = ({ agendamento, clientes, veiculos, tecnicos, todosAgendamentos, empresa, onClose, onSave, onCriarOS }) => {
    const empresaId = empresa?.id;
    const isEdicao = !!agendamento?.id;

    const [form, setForm] = useState({
        data: agendamento?.data || toISODate(new Date()),
        hora: agendamento?.hora || '08:00',
        clienteId: agendamento?.clienteId || '',
        veiculoId: agendamento?.veiculoId || '',
        tecnicoId: agendamento?.tecnicoId || '',
        servico: agendamento?.servico || '',
        observacoes: agendamento?.observacoes || '',
        status: agendamento?.status || 'agendado',
    });

    // Estado para repetição
    const [repetir, setRepetir] = useState(false);
    const [frequencia, setFrequencia] = useState('semanal');
    const [quantidade, setQuantidade] = useState(4);

    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState('');

    const veiculosDoCliente = veiculos.filter((v) => v.clienteId === form.clienteId);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const newForm = { ...prev, [name]: value };
            if (name === 'clienteId') {
                newForm.veiculoId = '';
            }
            return newForm;
        });
    };

    const checarConflito = (tecnicoId, data, hora) => {
        if (!tecnicoId) return false;

        return todosAgendamentos?.some(a =>
            a.id !== agendamento?.id &&
            a.tecnicoId === tecnicoId &&
            a.data === data &&
            a.hora === hora &&
            a.status !== 'cancelado'
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSalvando(true);

        try {
            if (form.status !== 'bloqueio' && !form.clienteId) throw new Error('Selecione um cliente');
            if (form.status === 'bloqueio' && !form.observacoes) throw new Error('Descreva o motivo do bloqueio');
            if (!form.data) throw new Error('Data é obrigatória');
            if (!form.hora) throw new Error('Hora é obrigatória');

            // Preparação para salvar (com ou sem repetição)
            const loops = (repetir && !isEdicao) ? quantidade : 1;

            // Loop sequencial
            for (let i = 0; i < loops; i++) {
                // Cálculo da data da repetição
                const dataOriginal = new Date(`${form.data}T12:00:00`);
                let novaData = new Date(dataOriginal);

                if (i > 0) {
                    if (frequencia === 'semanal') {
                        novaData.setDate(novaData.getDate() + (i * 7));
                    } else if (frequencia === 'quinzenal') {
                        novaData.setDate(novaData.getDate() + (i * 14));
                    } else if (frequencia === 'mensal') {
                        novaData.setMonth(novaData.getMonth() + i);
                    }
                }

                const dataFormatada = toISODate(novaData);

                // VERIFICAÇÃO DE CONFLITO
                if (checarConflito(form.tecnicoId, dataFormatada, form.hora)) {
                    if (loops > 1) {
                        throw new Error(`Conflito de horário para o técnico em ${dataFormatada} às ${form.hora}. Operação cancelada.`);
                    } else {
                        throw new Error(`O técnico já possui agendamento neste horário (${form.hora}).`);
                    }
                }

                const payload = {
                    data: dataFormatada,
                    hora: form.hora,
                    clienteId: form.clienteId,
                    veiculoId: form.veiculoId || null,
                    tecnicoId: form.tecnicoId || null,
                    servico: form.servico,
                    observacoes: form.observacoes,
                    status: form.status,
                };

                if (isEdicao) {
                    await storage.update('agendamentos', agendamento.id, payload);
                } else {
                    await storage.create('agendamentos', payload, empresaId);
                }
            }

            onSave();
        } catch (error) {
            setError(error.message || 'Erro ao salvar');
        } finally {
            setSalvando(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Deseja excluir este agendamento?')) return;
        try {
            await storage.softDelete('agendamentos', agendamento.id);
            onSave();
        } catch (error) {
            setError('Erro ao excluir');
        }
    };

    const handleWhatsApp = () => {
        if (!form.clienteId) return;
        const cliente = clientes.find(c => c.id === form.clienteId);
        if (!cliente) return;

        const contato = cliente.whatsapp || cliente.telefone || '';
        const phone = contato.replace(/\D/g, '');

        if (phone.length < 10) {
            alert('Telefone do cliente inválido ou não cadastrado.');
            return;
        }

        const veiculo = veiculos.find(v => v.id === form.veiculoId);
        const nomeVeiculo = veiculo ? `${veiculo.marca} ${veiculo.modelo}` : 'Veículo';

        // Formatar data PT-BR
        const [ano, mes, dia] = form.data.split('-');
        const dataFormatada = `${dia}/${mes}`;

        let msg = empresa?.agendaMensagemConfirmacao || 'Olá {nome}, confirmamos seu agendamento do veículo {veiculo} para {data} às {hora}? \uD83D\uDE97';

        msg = msg.replace(/{nome}/g, cliente.nome.split(' ')[0])
            .replace(/{veiculo}/g, nomeVeiculo)
            .replace(/{data}/g, dataFormatada)
            .replace(/{hora}/g, form.hora)
            .replace(/{servico}/g, form.servico || 'revisão');

        const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const horarios = [];
    for (let h = 7; h <= 19; h++) {
        horarios.push(`${String(h).padStart(2, '0')}:00`);
        horarios.push(`${String(h).padStart(2, '0')}:30`);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                        {isEdicao ? 'Editar Agendamento' : 'Novo Agendamento'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Data *
                            </label>
                            <input
                                type="date"
                                name="data"
                                value={form.data}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Horário *
                            </label>
                            <select
                                name="hora"
                                value={form.hora}
                                onChange={handleChange}
                                className="input"
                                required
                            >
                                {horarios.map((h) => (
                                    <option key={h} value={h}>{h}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Campo de Técnico */}
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Técnico Responsável
                        </label>
                        <select
                            name="tecnicoId"
                            value={form.tecnicoId}
                            onChange={handleChange}
                            className="input"
                        >
                            <option value="">Sem técnico preferencial</option>
                            {tecnicos.map((t) => (
                                <option key={t.id} value={t.id}>{t.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Checkbox de Recorrência (Apenas Criação) */}
                    {!isEdicao && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    checked={repetir}
                                    onChange={(e) => setRepetir(e.target.checked)}
                                    className="rounded text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-text-light dark:text-text-dark">
                                    Repetir Agendamento?
                                </span>
                            </label>

                            {repetir && (
                                <div className="grid grid-cols-2 gap-2 mt-2 animate-fadeIn">
                                    <div>
                                        <label className="text-xs text-text-secondary-light">Frequência</label>
                                        <select
                                            value={frequencia}
                                            onChange={(e) => setFrequencia(e.target.value)}
                                            className="input w-full"
                                        >
                                            <option value="semanal">Semanal</option>
                                            <option value="quinzenal">Quinzenal</option>
                                            <option value="mensal">Mensal</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-text-secondary-light">Repetições</label>
                                        <input
                                            type="number"
                                            min="2" max="52"
                                            value={quantidade}
                                            onChange={(e) => setQuantidade(parseInt(e.target.value) || 2)}
                                            className="input w-full"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Tipo / Status
                        </label>
                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            className="input"
                        >
                            <option value="agendado">Agendamento Normal</option>
                            <option value="confirmado">Confirmado</option>
                            <option value="bloqueio">🔴 Bloqueio / Indisponível</option>
                            {isEdicao && <option value="concluido">Concluído</option>}
                            {isEdicao && <option value="cancelado">Cancelado</option>}
                        </select>
                    </div>

                    {form.status !== 'bloqueio' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                    Cliente *
                                </label>
                                <select
                                    name="clienteId"
                                    value={form.clienteId}
                                    onChange={handleChange}
                                    className="input"
                                    required={form.status !== 'bloqueio'}
                                >
                                    <option value="">Selecione um cliente</option>
                                    {clientes.map((c) => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                </select>
                            </div>

                            {form.clienteId && veiculosDoCliente.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                        Veículo
                                    </label>
                                    <select
                                        name="veiculoId"
                                        value={form.veiculoId}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        <option value="">Selecione um veículo (opcional)</option>
                                        {veiculosDoCliente.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.marca} {v.modelo} - {v.placa}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                    Serviço
                                </label>
                                <input
                                    type="text"
                                    name="servico"
                                    value={form.servico}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Ex: Troca de óleo, Revisão..."
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            {form.status === 'bloqueio' ? 'Motivo do Bloqueio *' : 'Observações'}
                        </label>
                        <textarea
                            name="observacoes"
                            value={form.observacoes}
                            onChange={handleChange}
                            className="input min-h-[80px] resize-y"
                            placeholder={form.status === 'bloqueio' ? "Ex: Almoço, Feriado..." : "Observações..."}
                            required={form.status === 'bloqueio'}
                        />
                    </div>

                    {/* Ações Rápidas - Movido para baixo */}
                    {isEdicao && form.clienteId && form.veiculoId && form.status !== 'bloqueio' && (
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 mt-2">
                            <p className="text-sm font-medium text-primary mb-2">Ações Rápidas</p>
                            <button
                                type="button"
                                onClick={() => onCriarOS(form)}
                                className="w-full flex items-center justify-center gap-2 p-2 bg-white dark:bg-gray-800 border border-primary/20 hover:border-primary text-primary rounded-lg transition-all"
                            >
                                <span className="material-symbols-outlined">description</span>
                                Abrir OS / Orçamento
                            </button>
                        </div>
                    )}

                    {/* Botão de WhatsApp para Confirmação */}
                    {isEdicao && form.status === 'agendado' && (
                        <button
                            type="button"
                            onClick={handleWhatsApp}
                            className="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 text-green-700 dark:text-green-400 rounded-lg transition-all"
                        >
                            <span className="material-symbols-outlined">chat</span>
                            Enviar Confirmação (WhatsApp)
                        </button>
                    )}

                    <div className="flex gap-3 pt-4">
                        {isEdicao && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="p-2.5 rounded-xl text-error hover:bg-error/10 transition-colors"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button type="submit" disabled={salvando} className="btn-primary flex-1">
                            {salvando ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">save</span>
                                    Salvar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Agenda;
