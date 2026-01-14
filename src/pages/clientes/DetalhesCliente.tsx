// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import storage from '../../lib/storage';
import { formatTelefone, formatDocumento, getIniciais, formatDate, formatCurrency } from '../../lib/utils';
import WhatsAppIcon from '../../components/common/WhatsAppIcon';

const DetalhesCliente = () => {
    const { empresa } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();

    const [cliente, setCliente] = useState(null);
    const [veiculos, setVeiculos] = useState([]);
    const [ordens, setOrdens] = useState([]);
    const [loading, setLoading] = useState(true);



    const tagsConfig = {
        vip: { label: 'VIP', color: 'bg-amber-500', icon: 'star' },
        recorrente: { label: 'Recorrente', color: 'bg-green-500', icon: 'refresh' },
        novo: { label: 'Novo', color: 'bg-blue-500', icon: 'fiber_new' },
        indicacao: { label: 'Indicação', color: 'bg-purple-500', icon: 'share' },
        importado: { label: 'Importado', color: 'bg-gray-500', icon: 'upload_file' },
    };


    useEffect(() => {
        carregarDados();
    }, [id]);

    const carregarDados = async () => {
        try {
            const [clienteData, veiculosData, ordensData] = await Promise.all([
                storage.getById('clientes', id),
                storage.getAll('veiculos', empresa?.id),
                storage.getAll('ordens_servico', empresa?.id),
            ]);

            if (clienteData) {
                setCliente(clienteData);
                setVeiculos(veiculosData.filter((v) => v.clienteId === id && v.ativo));
                // Filtrar OS do cliente e ordenar por data (mais recentes primeiro)
                setOrdens(
                    ordensData
                        .filter(o => o.clienteId === id && o.ativo)
                        .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
                );
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
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

    if (!cliente) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4">
                <span className="material-symbols-outlined text-5xl text-gray-400 mb-4">person_off</span>
                <p className="text-lg font-medium text-text-light dark:text-text-dark mb-2">
                    Cliente não encontrado
                </p>
                <button onClick={() => navigate('/clientes')} className="btn-primary">
                    Voltar para lista
                </button>
            </div>
        );
    }

    const isPJ = cliente.tipo === 'pj';
    const iniciais = getIniciais(cliente.nome);

    return (
        <div className="min-h-full bg-background-light dark:bg-background-dark pb-20">
            {/* Header */}
            <header className="bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                <div className="relative flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => navigate('/clientes')}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark relative z-10"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                            Painel do Cliente
                        </span>
                    </div>


                </div>

                {/* Profile card */}
                <div className="px-4 pb-6 text-center">
                    <div
                        className={`
              w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold
              ${isPJ
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-primary'}
            `}
                    >
                        {isPJ ? (
                            <span className="material-symbols-outlined text-4xl">business</span>
                        ) : (
                            iniciais
                        )}
                    </div>
                    <h1 className="text-xl font-bold text-text-light dark:text-text-dark">
                        {cliente.nome}
                    </h1>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        {isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'}
                    </p>
                    {(cliente.tags || []).length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mt-3">
                            {(cliente.tags || []).map((tag) => (
                                <span
                                    key={tag}
                                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full text-white ${tagsConfig[tag]?.color || 'bg-gray-400'}`}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {tagsConfig[tag]?.icon || 'label'}
                                    </span>
                                    {tagsConfig[tag]?.label || tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* Content */}
            <div className="p-4 space-y-4 max-w-2xl mx-auto">
                {/* Quick actions */}
                <div className="flex gap-3">
                    <a
                        href={`tel:${cliente.telefone}`}
                        className="flex-1 card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all"
                    >
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                            <span className="material-symbols-outlined text-2xl">call</span>
                        </div>
                        <span className="text-sm font-medium text-text-light dark:text-text-dark">Ligar</span>
                    </a>
                    {cliente.whatsapp && (
                        <a
                            href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all"
                        >
                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <WhatsAppIcon size={28} />
                            </div>
                            <span className="text-sm font-medium text-text-light dark:text-text-dark">WhatsApp</span>
                        </a>
                    )}
                    <Link
                        to="/os"
                        className="flex-1 card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all"
                    >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">assignment_add</span>
                        </div>
                        <span className="text-sm font-medium text-text-light dark:text-text-dark">Nova OS</span>
                    </Link>
                </div>

                {/* Estatísticas do Cliente */}
                {ordens.length > 0 && (() => {
                    // Calcular total gasto (soma dos pagamentos de todas as OS)
                    const totalGasto = ordens.reduce((acc, os) => {
                        const pagamentos = os.pagamentos || [];
                        return acc + pagamentos.reduce((sum, pag) => sum + (pag.valor || 0), 0);
                    }, 0);

                    // Encontrar último atendimento (OS mais recente)
                    const ultimaOS = ordens[0]; // já ordenadas por data desc
                    const ultimaData = ultimaOS?.criadoEm ? new Date(ultimaOS.criadoEm) : null;
                    const diasDesdeUltimo = ultimaData
                        ? Math.floor((Date.now() - ultimaData.getTime()) / (1000 * 60 * 60 * 24))
                        : null;

                    return (
                        <div className="grid grid-cols-2 gap-3">
                            {/* Total Gasto */}
                            <div className="card p-4 bg-gradient-to-br from-emerald-500/10 to-transparent">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="material-symbols-outlined text-lg text-emerald-600 dark:text-emerald-400">payments</span>
                                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Total Gasto</span>
                                </div>
                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(totalGasto)}
                                </p>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                    em {ordens.length} OS
                                </p>
                            </div>

                            {/* Ãšltimo Atendimento */}
                            <div className={`card p-4 ${diasDesdeUltimo > 90 ? 'bg-gradient-to-br from-orange-500/10 to-transparent' : 'bg-gradient-to-br from-blue-500/10 to-transparent'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`material-symbols-outlined text-lg ${diasDesdeUltimo > 90 ? 'text-orange-500' : 'text-blue-500'}`}>
                                        {diasDesdeUltimo > 90 ? 'warning' : 'schedule'}
                                    </span>
                                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Ãšltimo Atendimento</span>
                                </div>
                                <p className={`text-lg font-bold ${diasDesdeUltimo > 90 ? 'text-orange-500' : 'text-blue-500'}`}>
                                    {diasDesdeUltimo === 0 ? 'Hoje' : diasDesdeUltimo === 1 ? 'Ontem' : `Há ${diasDesdeUltimo} dias`}
                                </p>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                    {formatDate(ultimaData)}
                                </p>
                            </div>
                        </div>
                    );
                })()}

                {/* Info cards */}
                <div className="card p-4 space-y-4">
                    <h2 className="font-semibold text-text-light dark:text-text-dark">Contato</h2>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark">call</span>
                            <div>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Telefone</p>
                                <p className="text-text-light dark:text-text-dark">{formatTelefone(cliente.telefone)}</p>
                            </div>
                        </div>

                        {cliente.whatsapp && (
                            <div className="flex items-center gap-3">
                                <WhatsAppIcon size={24} className="text-text-secondary-light dark:text-text-secondary-dark" />
                                <div>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">WhatsApp</p>
                                    <p className="text-text-light dark:text-text-dark">{formatTelefone(cliente.whatsapp)}</p>
                                </div>
                            </div>
                        )}

                        {cliente.email && (
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark">mail</span>
                                <div>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Email</p>
                                    <p className="text-text-light dark:text-text-dark">{cliente.email}</p>
                                </div>
                            </div>
                        )}

                        {cliente.documento && (
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark">badge</span>
                                <div>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                        {isPJ ? 'CNPJ' : 'CPF'}
                                    </p>
                                    <p className="text-text-light dark:text-text-dark">{formatDocumento(cliente.documento)}</p>
                                </div>
                            </div>
                        )}

                        {cliente.dataNascimento && (
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark">cake</span>
                                <div>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                        {isPJ ? 'Fundação' : 'Nascimento'}
                                    </p>
                                    <p className="text-text-light dark:text-text-dark">{formatDate(cliente.dataNascimento)}</p>
                                </div>
                            </div>
                        )}

                        {cliente.ultimoContato && (
                            <div className="flex items-center gap-3 pt-3 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] mt-2">
                                <span className="material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark">history</span>
                                <div>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Ãšltimo Contato</p>
                                    <p className="text-text-light dark:text-text-dark">
                                        {formatDate(cliente.ultimoContato)}
                                        {cliente.ultimoDesfecho && (
                                            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-1 capitalize">
                                                • {cliente.ultimoDesfecho.replace('_', ' ')}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Endereço */}
                {cliente.endereco?.logradouro && (
                    <div className="card p-4 space-y-3">
                        <h2 className="font-semibold text-text-light dark:text-text-dark">Endereço</h2>
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark">location_on</span>
                            <div>
                                <p className="text-text-light dark:text-text-dark">
                                    {cliente.endereco.logradouro}
                                    {cliente.endereco.numero && `, ${cliente.endereco.numero}`}
                                    {cliente.endereco.complemento && ` - ${cliente.endereco.complemento}`}
                                </p>
                                <p className="text-text-secondary-light dark:text-text-secondary-dark">
                                    {cliente.endereco.bairro && `${cliente.endereco.bairro}, `}
                                    {cliente.endereco.cidade} - {cliente.endereco.estado}
                                    {cliente.endereco.cep && `, ${cliente.endereco.cep}`}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Veículos */}
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-text-light dark:text-text-dark">
                            Veículos ({veiculos.length})
                        </h2>
                        <Link
                            to={`/veiculos/novo?cliente=${id}`}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Adicionar
                        </Link>
                    </div>

                    {veiculos.length === 0 ? (
                        <div className="text-center py-6">
                            <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">directions_car</span>
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                Nenhum veículo cadastrado
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {veiculos.map((veiculo) => (
                                <Link
                                    key={veiculo.id}
                                    to={`/veiculos/${veiculo.id}/editar`}
                                    className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    {veiculo.foto ? (
                                        <img
                                            src={veiculo.foto}
                                            alt={`${veiculo.marca} ${veiculo.modelo}`}
                                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <span className="material-symbols-outlined">directions_car</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-text-light dark:text-text-dark truncate">
                                            {veiculo.marca} {veiculo.modelo}
                                        </p>
                                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                            {veiculo.placa} • {veiculo.ano}
                                        </p>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Histórico de OS */}
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-text-light dark:text-text-dark">
                            Histórico de OS ({ordens.length})
                        </h2>
                        <Link
                            to="/os"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Nova OS
                        </Link>
                    </div>

                    {ordens.length === 0 ? (
                        <div className="text-center py-6">
                            <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">assignment</span>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark">
                                Nenhuma OS para este cliente
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {ordens.slice(0, 10).map((os) => (
                                <Link
                                    key={os.id}
                                    to={`/os/${os.id}`}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${os.status === 'finalizada' ? 'bg-green-500' :
                                        os.status === 'execucao' ? 'bg-primary' :
                                            os.status === 'orcamento' ? 'bg-yellow-500' :
                                                os.status === 'cancelada' ? 'bg-red-500' :
                                                    'bg-blue-500'
                                        }`}>
                                        #{os.numero || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-light dark:text-text-dark">
                                            {os.status === 'orcamento' ? 'Orçamento' : 'OS'} #{os.numero}
                                        </p>
                                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                            {formatDate(os.criadoEm)} • {formatCurrency(os.valorTotal || 0)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${os.status === 'finalizada' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            os.status === 'execucao' ? 'bg-primary/10 text-primary' :
                                                os.status === 'orcamento' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                    os.status === 'cancelada' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            }`}>
                                            {os.status === 'finalizada' ? 'Finalizada' :
                                                os.status === 'execucao' ? 'Em execução' :
                                                    os.status === 'orcamento' ? 'Orçamento' :
                                                        os.status === 'cancelada' ? 'Cancelada' :
                                                            'Aprovada (Não Iniciada)'}
                                        </span>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                                </Link>
                            ))}
                            {ordens.length > 10 && (
                                <p className="text-center text-xs text-text-secondary-light dark:text-text-secondary-dark pt-2">
                                    Mostrando 10 de {ordens.length} OS
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Observações */}
                {cliente.observacoes && (
                    <div className="card p-4">
                        <h2 className="font-semibold text-text-light dark:text-text-dark mb-2">Observações</h2>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark whitespace-pre-wrap">
                            {cliente.observacoes}
                        </p>
                    </div>
                )}

                {/* Meta info */}
                <div className="text-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    <p>Cliente desde {formatDate(cliente.criadoEm)}</p>
                </div>
            </div>

            {/* Delete Modal */}

        </div>
    );
};

export default DetalhesCliente;

