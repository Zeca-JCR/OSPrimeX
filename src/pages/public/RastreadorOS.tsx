import { useState, FormEvent } from 'react';
import storage from '../../lib/storage';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import PlacaBadge from '../../components/common/PlacaBadge';
import { OrdemServico, Veiculo, Cliente, Empresa } from '../../types';

interface Toast {
    mensagem: string;
    tipo: 'success' | 'error';
}

const RastreadorOS = () => {
    const [busca, setBusca] = useState({ numero: '', placa: '' });
    const [os, setOs] = useState<OrdemServico | null>(null);
    const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
    const [buscando, setBuscando] = useState(false);
    const [erro, setErro] = useState('');
    const [buscaRealizada, setBuscaRealizada] = useState(false);

    // Estados para aprovação de orçamento
    const [showAprovacao, setShowAprovacao] = useState(false);
    const [aprovando, setAprovando] = useState(false);
    const [nomeAprovador, setNomeAprovador] = useState('');
    const [aprovacaoSucesso, setAprovacaoSucesso] = useState(false);

    // Toast notification
    const [toast, setToast] = useState<Toast | null>(null);

    const handleBuscar = async (e: FormEvent) => {
        e.preventDefault();
        setErro('');
        setOs(null);
        setBuscando(true);
        setBuscaRealizada(true);

        try {
            // Buscar em todas as empresas (público)
            const todasEmpresas: Empresa[] = JSON.parse(localStorage.getItem('osprimex_empresas') || '[]');
            let osEncontrada: OrdemServico | null = null;
            // Unused variables for public tracker unless we display company info
            // let empresaId: string | null = null;
            // let clienteEncontrado: Cliente | null = null;

            for (const empresa of todasEmpresas) {
                const ordens = await storage.getAll<OrdemServico>('ordens_servico', empresa.id);
                const veiculos = await storage.getAll<Veiculo>('veiculos', empresa.id);

                // Buscar OS pelo número
                const osMatch = ordens.find((o) => o?.numero?.toString() === busca.numero);
                if (osMatch) {
                    // Verificar se a placa bate
                    const veiculoOS = veiculos.find((v) => v.id === osMatch.veiculoId);
                    if (veiculoOS && veiculoOS.placa.toUpperCase().replace(/[^A-Z0-9]/g, '') ===
                        busca.placa.toUpperCase().replace(/[^A-Z0-9]/g, '')) {
                        osEncontrada = osMatch;
                        // empresaId = empresa.id;
                        setVeiculo(veiculoOS);

                        // Buscar cliente (opcional para exibir nome)
                        // const clientes = await storage.getAll<Cliente>('clientes', empresa.id);
                        // clienteEncontrado = clientes.find((c) => c.id === osMatch.clienteId) || null;
                        break;
                    }
                }
            }

            if (osEncontrada) {
                setOs(osEncontrada);
            } else {
                setErro('OS não encontrada. Verifique o número da OS e a placa do veículo.');
            }
        } catch (error) {
            console.error('Erro ao buscar:', error);
            setErro('Erro ao buscar. Tente novamente.');
        } finally {
            setBuscando(false);
        }
    };

    // Toast notification helper
    const mostrarToast = (mensagem: string, tipo: 'success' | 'error' = 'success') => {
        setToast({ mensagem, tipo });
        setTimeout(() => setToast(null), 4000);
    };

    // Aprovar orçamento online
    const aprovarOrcamento = async () => {
        if (!nomeAprovador.trim()) {
            mostrarToast('Por favor, informe seu nome para aprovar.', 'error');
            return;
        }

        if (!os) return;

        setAprovando(true);
        try {
            await storage.update('ordens_servico', os.id as string, {
                status: 'execucao', // Change status to 'execucao' (waiting to start/approved) - backend/hook logic might refine this
                // 'aprovadoEm' is not in standard type but valid for logic
                aprovadoEm: new Date().toISOString(),
                aprovadoPor: nomeAprovador,
                observacoes: `${os.observacoes || ''}\n[APROVADO ONLINE por ${nomeAprovador} em ${new Date().toLocaleString('pt-BR')}]`.trim(),
            } as any);

            // Recarregar OS atualizada do storage
            const osAtualizada = await storage.getById<OrdemServico>('ordens_servico', os.id as string);
            setOs(osAtualizada);

            setAprovacaoSucesso(true);
            setShowAprovacao(false);
            mostrarToast('✅ Orçamento aprovado com sucesso! A oficina foi notificada.', 'success');
        } catch (error) {
            console.error('Erro ao aprovar:', error);
            mostrarToast('Erro ao aprovar orçamento. Tente novamente.', 'error');
        } finally {
            setAprovando(false);
        }
    };

    // Verificar se é orçamento
    const isOrcamento = ['orcamento', 'aguardando_aprovacao', 'pendente'].includes(os?.status?.toLowerCase() || '');

    const statusConfig: Record<string, { label: string; color: string; icon: string; descricao: string }> = {
        orcamento: {
            label: 'Aguardando Aprovação',
            color: 'bg-yellow-500',
            icon: 'pending',
            descricao: 'Seu orçamento está pronto para aprovação. Clique em "Aprovar" abaixo.'
        },
        aguardando_aprovacao: {
            label: 'Aguardando Aprovação',
            color: 'bg-yellow-500',
            icon: 'pending',
            descricao: 'Seu orçamento está pronto para aprovação. Clique em "Aprovar" abaixo.'
        },
        aberta: {
            label: 'Aprovada (Não Iniciada)',
            color: 'bg-blue-500',
            icon: 'schedule',
            descricao: 'Sua OS foi aprovada e está aguardando o início do atendimento.'
        },
        execucao: {
            label: 'Em Execução',
            color: 'bg-primary',
            icon: 'engineering',
            descricao: 'Seu veículo está sendo atendido por nossos técnicos.'
        },
        finalizada: {
            label: 'Finalizada',
            color: 'bg-green-500',
            icon: 'check_circle',
            descricao: 'O serviço foi concluído! Seu veículo está pronto para retirada.'
        },
        cancelada: {
            label: 'Cancelada',
            color: 'bg-red-500',
            icon: 'cancel',
            descricao: 'Esta OS foi cancelada. Entre em contato para mais informações.'
        },
        aguardando_peca: {
            label: 'Aguardando Peça',
            color: 'bg-orange-500',
            icon: 'inventory_2',
            descricao: 'Estamos aguardando a chegada de peças para continuar o serviço.'
        }
    };

    const getEtapas = () => {
        const etapas = [
            { id: 'aberta', label: 'Aprovada (Não Iniciada)' },
            { id: 'execucao', label: 'Em Execução' },
            { id: 'finalizada', label: 'Finalizada' },
        ];

        const statusIndex: Record<string, number> = {
            orcamento: -1,
            aguardando_aprovacao: -1,
            aberta: 0,
            execucao: 1,
            aguardando_peca: 1, // Same stage as execution visually
            finalizada: 2,
            cancelada: -1,
        };

        const atual = statusIndex[os?.status || ''] ?? -1;

        return etapas.map((etapa, index) => ({
            ...etapa,
            concluida: index < atual,
            atual: index === atual,
            pendente: index > atual,
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center gap-3 animate-slideIn ${toast.tipo === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-green-500 text-white'
                    }`}>
                    <span className="material-symbols-outlined">
                        {toast.tipo === 'error' ? 'error' : 'check_circle'}
                    </span>
                    {toast.mensagem}
                </div>
            )}

            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-white">build</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-text-light dark:text-text-dark">
                            Acompanhe sua OS
                        </h1>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            Consulte o status do seu serviço em tempo real
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8">
                {/* Formulário de busca */}
                <div className="card p-6 mb-6">
                    <form onSubmit={handleBuscar} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                    Número da OS
                                </label>
                                <input
                                    type="text"
                                    value={busca.numero}
                                    onChange={(e) => setBusca({ ...busca, numero: e.target.value })}
                                    className="input"
                                    placeholder="Ex: 1001"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                    Placa do Veículo
                                </label>
                                <input
                                    type="text"
                                    value={busca.placa}
                                    onChange={(e) => setBusca({ ...busca, placa: e.target.value.toUpperCase() })}
                                    className="input"
                                    placeholder="Ex: ABC-1234"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={buscando}
                            className="btn-primary w-full"
                        >
                            {buscando ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                    Buscando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">search</span>
                                    Consultar Status
                                </>
                            )}
                        </button>
                    </form>

                    {erro && (
                        <div className="mt-4 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined">error</span>
                            {erro}
                        </div>
                    )}
                </div>

                {/* Resultado */}
                {os && (
                    <div className="space-y-4 animate-slideUp">
                        {/* Status principal */}
                        <div className="card p-6 text-center">
                            <div className={`w-20 h-20 rounded-full ${statusConfig[os.status]?.color || 'bg-gray-500'} mx-auto mb-4 flex items-center justify-center`}>
                                <span className="material-symbols-outlined text-white text-4xl">
                                    {statusConfig[os.status]?.icon || 'help'}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
                                {statusConfig[os.status]?.label || os.status}
                            </h2>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark">
                                {statusConfig[os.status]?.descricao || ''}
                            </p>
                        </div>

                        {/* Timeline de progresso */}
                        {os.status !== 'cancelada' && (
                            <div className="card p-6">
                                <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">
                                    Progresso do Serviço
                                </h3>
                                <div className="flex items-center justify-between">
                                    {getEtapas().map((etapa, index) => (
                                        <div key={etapa.id} className="flex-1 flex items-center">
                                            <div className="flex flex-col items-center">
                                                <div
                                                    className={`
                            w-10 h-10 rounded-full flex items-center justify-center transition-all
                            ${etapa.concluida ? 'bg-green-500 text-white' : ''}
                            ${etapa.atual ? 'bg-primary text-white ring-4 ring-primary/30' : ''}
                            ${etapa.pendente ? 'bg-gray-200 dark:bg-gray-700 text-gray-400' : ''}
                          `}
                                                >
                                                    {etapa.concluida ? (
                                                        <span className="material-symbols-outlined">check</span>
                                                    ) : (
                                                        <span className="text-sm font-bold">{index + 1}</span>
                                                    )}
                                                </div>
                                                <span className={`text-xs mt-2 text-center ${etapa.atual ? 'font-bold text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark'
                                                    }`}>
                                                    {etapa.label}
                                                </span>
                                            </div>
                                            {index < 2 && (
                                                <div className={`flex-1 h-1 mx-2 rounded ${etapa.concluida ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                                                    }`} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Informações da OS */}
                        <div className="card p-6">
                            <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">
                                Detalhes da OS
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Número da OS</p>
                                    <p className="font-bold text-text-light dark:text-text-dark">#{os.numero}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Veículo</p>
                                    <p className="font-bold text-text-light dark:text-text-dark">
                                        {veiculo?.marca} {veiculo?.modelo}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">Placa</p>
                                    <PlacaBadge placa={veiculo?.placa || ''} size="md" />
                                </div>
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Data de Entrada</p>
                                    <p className="font-bold text-text-light dark:text-text-dark">
                                        {formatDateTime(os.criadoEm)}
                                    </p>
                                </div>
                            </div>

                            {os.defeitoRelatado && (
                                <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">Serviço Solicitado</p>
                                    <p className="text-text-light dark:text-text-dark">{os.defeitoRelatado}</p>
                                </div>
                            )}
                        </div>

                        {/* Valor (se finalizada) */}
                        {(os.status === 'finalizada' || isOrcamento) && (os.valorTotal || 0) > 0 && (
                            <div className={`card p-6 border-2 ${isOrcamento ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`text-sm ${isOrcamento ? 'text-yellow-700 dark:text-yellow-400' : 'text-green-700 dark:text-green-400'}`}>
                                            {isOrcamento ? 'Valor do Orçamento' : 'Valor Total'}
                                        </p>
                                        <p className={`text-3xl font-bold ${isOrcamento ? 'text-yellow-700 dark:text-yellow-400' : 'text-green-700 dark:text-green-400'}`}>
                                            {formatCurrency(os.valorTotal)}
                                        </p>
                                    </div>
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isOrcamento ? 'bg-yellow-500' : 'bg-green-500'}`}>
                                        <span className="material-symbols-outlined text-white text-2xl">
                                            {isOrcamento ? 'receipt_long' : 'payments'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Botão de Aprovação (apenas para orçamentos) */}
                        {isOrcamento && !aprovacaoSucesso && (
                            <div className="card p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                                <h3 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined">verified</span>
                                    Aprovar Orçamento
                                </h3>
                                <p className="text-sm text-green-600 mb-4">
                                    Clique abaixo para aprovar os serviços e autorizar o início dos trabalhos.
                                </p>
                                <button
                                    onClick={() => setShowAprovacao(true)}
                                    className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                                >
                                    <span className="material-symbols-outlined">thumb_up</span>
                                    Aprovar Serviços
                                </button>
                            </div>
                        )}

                        {/* Mensagem de Aprovação Sucesso */}
                        {aprovacaoSucesso && (
                            <div className="card p-6 bg-green-50 border-2 border-green-200">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-green-700">Orçamento Aprovado!</h3>
                                        <p className="text-sm text-green-600">A oficina foi notificada e iniciará os serviços em breve.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Fotos (se houver) */}
                        {os.fotos && os.fotos.length > 0 && (
                            <div className="card p-6">
                                <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">
                                    Fotos do Serviço
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {os.fotos.map((foto) => (
                                        <div key={foto.id || (Math.random() + "")} className="aspect-square rounded-xl overflow-hidden">
                                            <img
                                                src={foto.data}
                                                alt={foto.descricao || 'Foto da OS'}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty state */}
                {!os && buscaRealizada && !erro && (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-5xl text-gray-400 mb-4">search_off</span>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark">
                            Nenhuma OS encontrada
                        </p>
                    </div>
                )}

                {/* Instruções */}
                {!buscaRealizada && (
                    <div className="card p-6 text-center">
                        <span className="material-symbols-outlined text-5xl text-primary mb-4">info</span>
                        <h3 className="font-semibold text-text-light dark:text-text-dark mb-2">
                            Como consultar?
                        </h3>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm max-w-md mx-auto">
                            Digite o número da OS (informado no orçamento) e a placa do seu veículo para acompanhar o status do serviço em tempo real.
                        </p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="text-center py-6 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                <p>Powered by <strong>OSPrimeX</strong></p>
            </footer>

            {/* Modal de Aprovação */}
            {showAprovacao && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="card p-6 w-full max-w-md animate-slideUp">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl text-green-600">verified</span>
                            </div>
                            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Confirmar Aprovação</h3>
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
                                Você está aprovando serviços no valor de:
                            </p>
                            <p className="text-2xl font-bold text-primary mt-2">
                                {formatCurrency(os?.valorTotal)}
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Seu Nome (obrigatório)
                            </label>
                            <input
                                type="text"
                                value={nomeAprovador}
                                onChange={(e) => setNomeAprovador(e.target.value)}
                                className="input w-full"
                                placeholder="Digite seu nome completo"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAprovacao(false)}
                                className="btn-secondary flex-1"
                                disabled={aprovando}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={aprovarOrcamento}
                                disabled={aprovando || !nomeAprovador.trim()}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                {aprovando ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                        Aprovando...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">check</span>
                                        Confirmar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RastreadorOS;
