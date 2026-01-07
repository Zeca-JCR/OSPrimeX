import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import storage from '../../lib/storage';
import { gerarPayloadPix } from '../../lib/pix';
import { formatCurrency, formatDate } from '../../lib/utils';

const RastreamentoPublico = () => {
    const { codigo } = useParams();
    const [searchParams] = useSearchParams();
    const empresaId = searchParams.get('e');

    const [os, setOs] = useState(null);
    const [cliente, setCliente] = useState(null);
    const [veiculo, setVeiculo] = useState(null);
    const [empresa, setEmpresa] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    // Aprovação
    const [showAprovacao, setShowAprovacao] = useState(false);
    const [aprovando, setAprovando] = useState(false);
    const [nomeAprovador, setNomeAprovador] = useState('');
    const [aprovacaoSucesso, setAprovacaoSucesso] = useState(false);

    // Pagamento PIX
    const [showPix, setShowPix] = useState(false);
    const [pixPayload, setPixPayload] = useState('');


    // Toast notification
    const [toast, setToast] = useState(null);

    useEffect(() => {
        carregarDados();
    }, [codigo, empresaId]);

    const carregarDados = async () => {
        try {
            setLoading(true);
            setErro('');

            // Carregar todas as OS e encontrar pelo número/código
            const todasOS = await storage.getAll('ordens_servico', empresaId);
            const osEncontrada = todasOS.find(o =>
                o.numero?.toString() === codigo ||
                o.id === codigo ||
                o.codigoRastreamento === codigo
            );

            if (!osEncontrada) {
                setErro('Ordem de Serviço não encontrada. Verifique o código informado.');
                return;
            }

            setOs(osEncontrada);

            // Registrar visualização (Incrementar contador)
            try {
                await storage.update('ordens_servico', osEncontrada.id, {
                    visualizacoes: (osEncontrada.visualizacoes || 0) + 1
                });
            } catch (err) {
                console.error('Erro ao registrar visualização:', err);
            }

            // Carregar dados relacionados
            const [clienteData, veiculoData, empresaData] = await Promise.all([
                osEncontrada.clienteId ? storage.getById('clientes', osEncontrada.clienteId) : null,
                osEncontrada.veiculoId ? storage.getById('veiculos', osEncontrada.veiculoId) : null,
                empresaId ? storage.getById('empresas', empresaId) : null,
            ]);

            setCliente(clienteData);
            setVeiculo(veiculoData);
            setEmpresa(empresaData);

        } catch (error) {
            console.error('Erro ao carregar OS:', error);
            setErro('Erro ao carregar dados. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    const mostrarToast = (mensagem, tipo = 'success') => {
        setToast({ mensagem, tipo });
        setTimeout(() => setToast(null), 4000);
    };

    const handleGerarPix = () => {
        if (!empresa?.chavePix) {
            mostrarToast('Chave PIX da empresa não configurada.', 'error');
            return;
        }

        const payload = gerarPayloadPix({
            chave: empresa.chavePix,
            nome: empresa.razaoSocial || empresa.nomeFantasia,
            cidade: empresa.endereco?.cidade || 'Cidade',
            valor: os.valorTotal,
            txid: `OS${os.numero}`
        });

        if (payload) {
            setPixPayload(payload);
            setShowPix(true);
        } else {
            mostrarToast('Erro ao gerar PIX. Verifique os dados da empresa.', 'error');
        }
    };

    const copiarPix = () => {
        navigator.clipboard.writeText(pixPayload);
        mostrarToast('Código PIX copiado com sucesso!', 'success');
    };

    const aprovarOrcamento = async () => {
        if (!os.valorTotal || os.valorTotal <= 0) {
            mostrarToast('Não é possível aprovar um orçamento sem valor (R$ 0,00).', 'error');
            return;
        }

        if (!nomeAprovador.trim()) {
            mostrarToast('Por favor, informe seu nome para aprovar.', 'error');
            return;
        }

        setAprovando(true);
        try {
            // Atualizar OS com aprovação
            await storage.update('ordens_servico', os.id, {
                status: 'aberta', // Padronizado: Aprovação leva para "Aprovada (Não Iniciada)"
                aprovadoEm: new Date().toISOString(),
                aprovadoPor: nomeAprovador,
                observacoes: `${os.observacoes || ''}\n[APROVADO ONLINE por ${nomeAprovador} em ${new Date().toLocaleString('pt-BR')}]`.trim(),
            });

            setAprovacaoSucesso(true);
            setShowAprovacao(false);
            mostrarToast('✅ Orçamento aprovado com sucesso! A oficina foi notificada.', 'success');

            // Recarregar dados
            carregarDados();
        } catch (error) {
            console.error('Erro ao aprovar:', error);
            mostrarToast('Erro ao aprovar orçamento. Tente novamente.', 'error');
        } finally {
            setAprovando(false);
        }
    };

    const getStatusConfig = (status) => ({
        'orcamento': { label: 'Aguardando Aprovação', color: 'bg-yellow-100 text-yellow-700', icon: 'pending', progress: 15 },
        'aguardando_aprovacao': { label: 'Aguardando Aprovação', color: 'bg-yellow-100 text-yellow-700', icon: 'pending', progress: 15 },
        'aberta': { label: 'Aprovada (Não Iniciada)', color: 'bg-slate-100 text-slate-700', icon: 'schedule', progress: 25 },
        'execucao': { label: 'Em Execução', color: 'bg-primary/10 text-primary', icon: 'engineering', progress: 60 },
        'finalizada': { label: 'Finalizada', color: 'bg-green-100 text-green-700', icon: 'check_circle', progress: 100 },
        'cancelada': { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: 'cancel', progress: 0 },
    })[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: 'info', progress: 0 };

    const isOrcamento = ['orcamento', 'aguardando_aprovacao', 'pendente'].includes(os?.status?.toLowerCase());

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-secondary-light">Buscando sua Ordem de Serviço...</p>
                </div>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
                <div className="card p-8 max-w-md text-center">
                    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl text-red-500">search_off</span>
                    </div>
                    <h1 className="text-xl font-bold text-text-light mb-2">OS Não Encontrada</h1>
                    <p className="text-text-secondary-light mb-6">{erro}</p>
                    <a
                        href="/"
                        className="btn-primary inline-flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">home</span>
                        Voltar ao Início
                    </a>
                </div>
            </div>
        );
    }

    const statusConfig = getStatusConfig(os?.status);

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background-light to-primary/10">
            {/* Toast */}
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
            <header className="bg-white shadow-sm">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-primary">
                            {empresa?.nomeFantasia || 'OSPrimeX'}
                        </h1>
                        <p className="text-xs text-text-secondary-light">
                            Acompanhamento de Serviço
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {empresa?.whatsapp && (
                            <a
                                href={`https://wa.me/55${empresa.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                title="Falar no WhatsApp"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            </a>
                        )}
                        {empresa?.telefone && !empresa?.whatsapp && (
                            <a
                                href={`tel:${empresa.telefone}`}
                                className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                title="Ligar para a oficina"
                            >
                                <span className="material-symbols-outlined">call</span>
                            </a>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-4 pb-32 space-y-4">
                {/* Status Card */}
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-text-secondary-light">
                                {isOrcamento ? 'ORÇAMENTO' : 'ORDEM DE SERVIÇO'}
                            </p>
                            <h2 className="text-2xl font-bold text-text-light flex items-center gap-2">
                                #{os?.numero}
                                {os?.tipo && os.tipo !== 'os' && os.tipo !== 'orcamento' && (
                                    <span className={`
                                        text-xs uppercase font-bold px-2 py-1 rounded-lg align-middle
                                        ${os.tipo === 'garantia' ? 'bg-purple-100 text-purple-700' : ''}
                                        ${os.tipo === 'cortesia' ? 'bg-pink-100 text-pink-700' : ''}
                                        ${os.tipo === 'retorno' ? 'bg-orange-100 text-orange-700' : ''}
                                        ${os.tipo === 'interna' ? 'bg-blue-100 text-blue-700' : ''}
                                    `}>
                                        {os.tipo}
                                    </span>
                                )}
                            </h2>
                            {isOrcamento && os.validadeOrcamento && (() => {
                                const hoje = new Date();
                                hoje.setHours(0, 0, 0, 0);
                                // Fix timezone offset logic similar to DetalhesOS
                                const validade = new Date(os.validadeOrcamento + 'T00:00:00');
                                const diffDias = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));

                                return (
                                    <p className={`text-sm mt-1 font-medium ${diffDias < 0 ? 'text-red-500' : 'text-text-secondary-light'}`}>
                                        Validade: {formatDate(os.validadeOrcamento)}
                                        {diffDias >= 0 && <span className="ml-1 text-orange-600">({diffDias === 0 ? 'Vence hoje' : `Vence em ${diffDias} dias`})</span>}
                                        {diffDias < 0 && <span className="ml-1 font-bold">(Vencido)</span>}
                                    </p>
                                );
                            })()}
                        </div>
                        <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${statusConfig.color}`}>
                            <span className="material-symbols-outlined text-lg">{statusConfig.icon}</span>
                            <span className="font-medium">{statusConfig.label}</span>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${statusConfig.progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-text-secondary-light mt-2">
                        <span>Iniciado</span>
                        <span>Em Execução</span>
                        <span>Concluído</span>
                    </div>
                </div>

                {/* Dados do Veículo */}
                {veiculo && (
                    <div className="card p-4">
                        <h3 className="font-semibold text-text-light mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">directions_car</span>
                            Veículo
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-text-secondary-light">Modelo</span>
                                <p className="font-medium">{veiculo.marca} {veiculo.modelo}</p>
                            </div>
                            <div>
                                <span className="text-text-secondary-light">Placa</span>
                                <p className="font-medium">{veiculo.placa}</p>
                            </div>
                            {veiculo.ano && (
                                <div>
                                    <span className="text-text-secondary-light">Ano</span>
                                    <p className="font-medium">{veiculo.ano}</p>
                                </div>
                            )}
                            {veiculo.km && (
                                <div>
                                    <span className="text-text-secondary-light">KM</span>
                                    <p className="font-medium">{veiculo.km.toLocaleString('pt-BR')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Defeito Reclamado */}
                {os?.defeitoReclamado && (
                    <div className="card p-4">
                        <h3 className="font-semibold text-text-light mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">report_problem</span>
                            Defeito Relatado
                        </h3>
                        <p className="text-text-secondary-light">{os.defeitoReclamado}</p>
                    </div>
                )}

                {/* Itens/Serviços */}
                {os?.itens?.length > 0 && (
                    <div className="card p-4">
                        <h3 className="font-semibold text-text-light mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">handyman</span>
                            Produtos e Serviços
                        </h3>
                        <div className="space-y-3">
                            {os.itens.map((item, index) => (
                                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                    <div>
                                        <p className="font-medium text-text-light">{item.nome}</p>
                                        <p className="text-xs text-text-secondary-light">
                                            {item.quantidade}x {formatCurrency(item.precoUnitario)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <p className={`font-semibold ${item.isento ? 'text-gray-400 line-through decoration-2' : 'text-primary'}`}>
                                            {formatCurrency(item.total)}
                                        </p>
                                        {item.isento && (
                                            <span className="text-[10px] font-bold uppercase text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                                Garantia / Isento
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Resumo Financeiro */}
                        < div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 space-y-2" >
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-text-secondary-light">Valor Total</span>
                                <span className="font-medium text-text-light">{formatCurrency(os.valorTotal)}</span>
                            </div>

                            {(os.valorPago || 0) > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-green-600 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-base">check_circle</span>
                                        Valor Pago
                                    </span>
                                    <span className="font-medium text-green-600">- {formatCurrency(os.valorPago)}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-3 border-t-2 border-primary/10 mt-2">
                                <span className="text-lg font-bold text-text-light">A Pagar</span>
                                <span className="text-2xl font-bold text-primary">
                                    {formatCurrency((os.valorTotal || 0) - (os.valorPago || 0))}
                                </span>
                            </div>
                        </div>
                    </div>
                )
                }

                {/* Botão de Aprovação (apenas para orçamentos) */}
                {
                    isOrcamento && !aprovacaoSucesso && (
                        <div className="card p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                            <h3 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined">verified</span>
                                Aprovar Orçamento
                            </h3>
                            <p className="text-sm text-green-600 mb-4">
                                Confira os valores e clique em aprovar para iniciarmos o serviço.
                            </p>
                            <button
                                onClick={() => setShowAprovacao(true)}
                                className="w-full py-3 bg-white text-green-600 border border-green-200 hover:bg-green-50 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                <span className="material-symbols-outlined">thumb_up</span>
                                Aprovar
                            </button>
                        </div>
                    )
                }

                {/* Mensagem de Aprovação */}
                {
                    aprovacaoSucesso && (
                        <div className="card p-4 bg-green-50 border-2 border-green-200">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl text-green-600">check_circle</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-green-700">Orçamento Aprovado!</h3>
                                    <p className="text-sm text-green-600">A oficina foi notificada e iniciará os serviços em breve.</p>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Info da Empresa */}
                {
                    empresa && (
                        <div className="card p-4 bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary">business</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-text-light">{empresa.nomeFantasia}</h4>
                                    <p className="text-sm text-text-secondary-light">{empresa.telefone}</p>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Footer */}
                <div className="text-center text-xs text-text-secondary-light py-4">
                    <p>Acompanhamento em tempo real via OSPrimeX</p>
                    <p className="mt-1">Atualizado em {formatDate(os?.atualizadoEm || os?.criadoEm)}</p>
                    {/* Botão de Pagamento PIX (apenas finalizada) */}
                    {/* Botão de Pagamento PIX (apenas finalizada e não quitada) */}
                    {os?.status === 'finalizada' && (os.valorPago || 0) >= (os.valorTotal || 0) && (
                        <div className="card p-4 bg-green-50 border-2 border-green-200 mt-4 text-left">
                            <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined">check_circle</span>
                                Conta Quitada
                            </h3>
                            <p className="text-sm text-green-700">
                                O pagamento desta Ordem de Serviço já foi realizado integralmente. Obrigado!
                            </p>
                        </div>
                    )}
                </div >
            </main >

            {/* BARRA FIXA: Aprovação */}
            {
                isOrcamento && !aprovacaoSucesso && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40 animate-slideUp">
                        <div className="max-w-2xl mx-auto p-4 flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-xs text-text-secondary-light uppercase tracking-wider font-medium">Total a Aprovar</p>
                                <p className="text-2xl font-bold text-primary leading-tight">{formatCurrency(os?.valorTotal)}</p>
                            </div>
                            <button
                                onClick={() => setShowAprovacao(true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-600/30 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">thumb_up</span>
                                Aprovar
                            </button>
                        </div>
                    </div>
                )
            }

            {/* BARRA FIXA: Pagamento PIX */}
            {
                os?.status === 'finalizada' && (os.valorPago || 0) < (os.valorTotal || 0) && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40 animate-slideUp">
                        <div className="max-w-2xl mx-auto p-4 flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-xs text-text-secondary-light uppercase tracking-wider font-medium">Total a Pagar</p>
                                <p className="text-2xl font-bold text-blue-600 leading-tight">
                                    {formatCurrency((os.valorTotal || 0) - (os.valorPago || 0))}
                                </p>
                            </div>
                            <button
                                onClick={handleGerarPix}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">pix</span>
                                Pagar Agora
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Modal PIX */}
            {
                showPix && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="card p-6 w-full max-w-md animate-scaleIn relative">
                            <button
                                onClick={() => setShowPix(false)}
                                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-text-secondary-light"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            <div className="text-center mb-6">
                                <h3 className="text-lg font-bold text-text-light flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-2xl">pix</span>
                                    Pagar com PIX
                                </h3>
                                <p className="text-2xl font-bold text-primary mt-2">
                                    {formatCurrency(os?.valorTotal)}
                                </p>
                            </div>

                            <div className="flex justify-center mb-6">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`}
                                    alt="QR Code PIX"
                                    className="border-4 border-white shadow-lg rounded-xl"
                                />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary-light mb-1 uppercase tracking-wider text-center">
                                        Código Copia e Cola
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={pixPayload}
                                            className="input text-xs w-full bg-gray-50 text-text-secondary-light"
                                        />
                                        <button
                                            onClick={copiarPix}
                                            className="btn-secondary px-3"
                                            title="Copiar código"
                                        >
                                            <span className="material-symbols-outlined">content_copy</span>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        const texto = `Olá! Segue o comprovante de pagamento da OS #${os.numero}.`;
                                        window.open(`https://wa.me/55${empresa.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, '_blank');
                                    }}
                                    className="btn-primary w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 border-green-600"
                                >
                                    <span className="material-symbols-outlined">send</span>
                                    Enviar Comprovante no WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Aprovação */}
            {
                showAprovacao && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <div className="card p-6 w-full max-w-md animate-slideUp">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-3xl text-green-600">verified</span>
                                </div>
                                <h3 className="text-lg font-semibold text-text-light">Confirmar Aprovação</h3>
                                <p className="text-sm text-text-secondary-light mt-2">
                                    Você está aprovando serviços no valor de:
                                </p>
                                <p className="text-2xl font-bold text-primary mt-2">
                                    {formatCurrency(os?.valorTotal)}
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-text-light mb-2">
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
                )
            }
        </div >
    );
};

export default RastreamentoPublico;
