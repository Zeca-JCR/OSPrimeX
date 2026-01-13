import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOS } from '../../contexts/OSContext';
import { useTabs } from '../../contexts/TabsContext';
import storage from '../../lib/storage';
import { formatCurrency, formatDate, formatDateTime, formatPlaca, toISODate, normalizeString, toTitleCase, parseCurrency, formatCurrencyInput } from '../../lib/utils';
import { DownloadOSButton, DownloadThermalButton } from '../../components/pdf/OSDocument';
import { PrintOSButton, PrintThermalButton } from '../../components/pdf/PrintButtons';
import AssinaturaCanvas from '../../components/os/AssinaturaCanvas';
import { AtribuirTecnicoModal } from '../../components/os/AtribuirTecnicoModal';
import { EditVeiculoModal } from '../../components/os/EditVeiculoModal';
import { TimeTrackingSection } from '../../components/os/TimeTrackingSection';
import CurrencyInput from '../../components/common/CurrencyInput';

import { gerarPayloadPix } from '../../lib/pix';
import { useAutoSave } from '../../hooks/useAutoSave';

// Função auxiliar para calcular totais (Global)
const calcularResumoFinanceiro = (itens, dTipo, dValor, aTipo, aValor) => {
    const somaItens = itens.reduce((acc, item) => acc + (item.isento ? 0 : (item.total || 0)), 0);

    let valDescontoGlobal = 0;
    if (dValor) {
        if (dTipo === 'valor') valDescontoGlobal = parseFloat(dValor) || 0;
        else valDescontoGlobal = somaItens * ((parseFloat(dValor) || 0) / 100);
    }

    let valAcrescimoGlobal = 0;
    if (aValor) {
        if (aTipo === 'valor') valAcrescimoGlobal = parseFloat(aValor) || 0;
        else valAcrescimoGlobal = somaItens * ((parseFloat(aValor) || 0) / 100);
    }

    const totalFinal = Math.max(0, somaItens - valDescontoGlobal + valAcrescimoGlobal);

    return {
        somaItens,
        valDescontoGlobal,
        valAcrescimoGlobal,
        totalFinal
    };
};

const DetalhesOS = ({ osId, isWindowMode, isTabMode, onClose, onMinimize, onDirtyChange, onTitleChange }) => {
    const { empresa } = useAuth();
    const { registerSaveHandler, unregisterSaveHandler } = useTabs();
    const navigate = useNavigate();
    const params = useParams();
    const id = osId || params.id; // Prioriza prop (Tab/Window Mode) sobre URL (Route Mode)


    // Estado para garantir configurações atualizadas (hot-reload interno)
    const [configuracoesLocais, setConfiguracoesLocais] = useState(null);
    const configuracoes = configuracoesLocais || empresa || {};

    // Carregar configurações frescas ao montar e ouvir alterações
    useEffect(() => {
        const fetchConfig = async () => {
            if (empresa?.id) {
                try {
                    const empAtualizada = await storage.getById('empresas', empresa.id);
                    if (empAtualizada) {
                        setConfiguracoesLocais(empAtualizada);
                    }
                } catch (err) {
                    console.error('Erro ao recarregar configurações:', err);
                }
            }
        };

        fetchConfig();

        // Ouvir alterações no storage (para hot-reload de configurações)
        const handleStorageChange = (e) => {
            if (e.detail?.key?.includes && e.detail.key.includes('empresas')) {
                fetchConfig();
            }
        };

        window.addEventListener('osprimex-storage', handleStorageChange);
        return () => window.removeEventListener('osprimex-storage', handleStorageChange);
    }, [empresa?.id]);

    const [os, setOs] = useState(null);
    const [cliente, setCliente] = useState(null);
    const [veiculo, setVeiculo] = useState(null);
    const [tecnicos, setTecnicos] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);

    // Estado local para edição (biffer)
    const [form, setForm] = useState(null);
    const [isDirty, setIsDirty] = useState(false);
    const isDirtyRef = useRef(isDirty);
    const salvarOSRef = useRef(null);

    // Auto-Save desabilitado - alterações ficam em memória até salvar manualmente
    // const { draftFound, loadDraft, clearDraft, isSaving: isAutoSaving, lastSaved } = useAutoSave(
    //     id ? `draft_os_${id}` : null,
    //     form,
    //     2000,
    //     isDirty && ['orcamento', 'aberta', 'execucao', 'aguardando_peca'].includes(os?.status)
    // );
    const draftFound = false;
    const loadDraft = () => null;
    const clearDraft = () => { };

    // Modal de confirmação ao sair com alterações não salvas
    const [showConfirmarSaida, setShowConfirmarSaida] = useState(false);

    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (errorMsg) {
            const timer = setTimeout(() => setErrorMsg(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMsg]);

    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    // Modais
    const [addItemValues, setAddItemValues] = useState(null);
    const [showAddItem, setShowAddItem] = useState(false);

    const handleUpdateApontamentos = (updates) => {
        setOs(prev => ({ ...prev, ...updates }));
        setForm(prev => ({ ...prev, ...updates }));
        setIsDirty(true);
    };

    const handleAddToBill = (quantidadeDecimal) => {
        setAddItemValues({
            tipo: 'servico',
            quantidade: quantidadeDecimal
        });
        setShowAddItem(true);
    };
    const [showImportarKit, setShowImportarKit] = useState(false);
    const [showChecklist, setShowChecklist] = useState(false);
    const [showAtribuirTecnico, setShowAtribuirTecnico] = useState(false);
    const [atribuirParaIniciarExecucao, setAtribuirParaIniciarExecucao] = useState(false); // Flag: veio do "Iniciar Execução"
    const [showFotoModal, setShowFotoModal] = useState(null); // foto selecionada para visualizar
    const [descricaoSalva, setDescricaoSalva] = useState(false); // feedback de salvamento da descrição
    const [showPagamento, setShowPagamento] = useState(false);

    const [showAssinatura, setShowAssinatura] = useState(false);
    const [showEditVeiculo, setShowEditVeiculo] = useState(false);
    const [showPix, setShowPix] = useState(false);
    const [pixPayload, setPixPayload] = useState('');

    // Modais de transição de status
    const [showFinalizarModal, setShowFinalizarModal] = useState(false);
    const [showCancelarModal, setShowCancelarModal] = useState(false);
    const [showReabrirModal, setShowReabrirModal] = useState(false);
    const [kmAtualizado, setKmAtualizado] = useState('');
    const [motivoCancelamento, setMotivoCancelamento] = useState('');
    const [showFinalizadoSuccess, setShowFinalizadoSuccess] = useState(false);
    const [itemEditando, setItemEditando] = useState(null);
    const [showMenuAcoes, setShowMenuAcoes] = useState(false);

    // Toast notification
    const [toastAprovacao, setToastAprovacao] = useState(false);

    const [linkRastreavel, setLinkRastreavel] = useState(null);
    const [linkCopied, setLinkCopied] = useState(false);

    // Memorizar opções de prisma para evitar re-cálculo constante (Movido para topo para evitar erro de hooks)
    const opcoesPrisma = useMemo(() => {
        if (!empresa?.usarPrismas) return [];

        const osAtivas = JSON.parse(localStorage.getItem('ordens_servico') || '[]');
        return Array.from({ length: empresa.prismaQuantidade || 20 }, (_, i) => i + 1).map(num => {
            const osComPrisma = osAtivas.find(o =>
                Number(o.prisma) === num && // Garantir tipagem numérica
                String(o.id) !== String(os?.id) &&
                !['finalizada', 'cancelada'].includes(o.status)
            );

            const emUso = !!osComPrisma;
            const labelCor = empresa.prismaCor === 'Vermelho' ? '🔴' :
                empresa.prismaCor === 'Azul' ? '🔵' :
                    empresa.prismaCor === 'Verde' ? '🟢' :
                        empresa.prismaCor === 'Amarelo' ? '🟡' :
                            empresa.prismaCor === 'Preto' ? '⚫' :
                                empresa.prismaCor === 'Laranja' ? '🟠' : '⚪';

            return {
                value: num,
                label: `${labelCor} #${num}${emUso ? ` (Uso)` : ''}`,
                disabled: emUso
            };
        });
    }, [empresa?.usarPrismas, empresa?.prismaQuantidade, empresa?.prismaCor, os?.id, os?.prisma]);

    // Atualizar título e estado da aba/janela
    useEffect(() => {
        if (os?.numero) {
            const title = `OS #${os.numero}`;
            // Modo Aba: usar callbacks
            if (isTabMode) {
                onTitleChange?.(title);
            }
        }
    }, [os?.numero, isTabMode, onTitleChange]);

    // Sincronizar isDirty com a aba
    useEffect(() => {
        if (isTabMode) {
            onDirtyChange?.(isDirty);
        }
    }, [isDirty, isTabMode, onDirtyChange]);

    // Registrar saveHandler para o TabBar poder chamar "Salvar e sair"
    useEffect(() => {
        if (isTabMode && id) {
            const tabId = `os-${id}`;
            // Usa uma função wrapper que chama a ref para sempre ter a versão atualizada
            registerSaveHandler(tabId, () => salvarOSRef.current?.());
            return () => unregisterSaveHandler(tabId);
        }
    }, [isTabMode, id, registerSaveHandler, unregisterSaveHandler]);

    // Listener para quando usuário clica no X da aba para fechar
    useEffect(() => {
        if (!isTabMode) return;

        const handleTabCloseRequest = (event) => {
            const tabId = event.detail?.tabId;
            // Verifica se é esta aba (baseado no osId)
            if (tabId === `os-${id}` && isDirty) {
                setShowConfirmarSaida(true);
            }
        };

        window.addEventListener('tab-close-request', handleTabCloseRequest);
        return () => window.removeEventListener('tab-close-request', handleTabCloseRequest);
    }, [isTabMode, id, isDirty]);

    useEffect(() => {
        carregarDados(true);


        // Solicitar permissão para notificações do sistema
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Listener para sincronização em tempo real quando outra aba modifica os dados
        const handleStorageChange = async (e) => {
            if (e.key?.includes('ordens_servico') || e.key?.includes('links_rastreaveis')) {
                // Verificar se este orçamento foi aprovado
                const statusAnterior = os?.status;
                await carregarDados(false);

                // Se era orçamento e agora é execução, mostrar notificação
                if (statusAnterior === 'orcamento' && os?.status === 'execucao') {
                    // Toast visual
                    setToastAprovacao(true);
                    setTimeout(() => setToastAprovacao(false), 6000);

                    // Notificação do sistema (se permitido)
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('🎉 Orçamento Aprovado!', {
                            body: `OS #${os?.numero} foi aprovada pelo cliente. Iniciar execução!`,
                            icon: '/favicon.ico',
                            tag: `os-aprovada-${os?.id}`
                        });
                    }
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Polling de backup a cada 30 segundos
        const interval = setInterval(() => {
            carregarDados(false);
        }, 30000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [id, os?.status]);

    const carregarDados = async (force = false) => {
        if (!empresa || !id) return;

        // Se houver alterações não salvas e não for forçado, não recarregar para não perder dados
        if (!force && isDirtyRef.current) return;

        try {
            const [osData, clientesData, veiculosData, colaboradoresData, produtosData] = await Promise.all([
                storage.getById('ordens_servico', id),
                storage.getAll('clientes', empresa.id),
                storage.getAll('veiculos', empresa.id),
                storage.getAll('colaboradores', empresa.id),
                storage.getAll('produtos', empresa.id),
            ]);

            if (osData) {
                setOs(osData);
                setForm(osData); // Inicializa o form com dados do banco
                setIsDirty(false);
                setCliente(clientesData.find((c) => c.id === osData.clienteId));
                setVeiculo(veiculosData.find((v) => v.id === osData.veiculoId));

                // Logica de Validade Padrão para Orçamentos (Fix: aceitar default 10 se não tiver config salva)
                if (osData.status === 'orcamento' && !osData.validadeOrcamento) {
                    const dias = Number(empresa.diasValidadeOrcamento || 10);
                    const hoje = new Date();
                    hoje.setDate(hoje.getDate() + dias);

                    // Ajuste para pegar a data local correta
                    const offset = hoje.getTimezoneOffset() * 60000;
                    const validadePadrao = toISODate(new Date(hoje.getTime() - offset));

                    setForm(prev => ({ ...prev, validadeOrcamento: validadePadrao }));
                }
            }

            // Filtrar apenas técnicos (ou todos colaboradores, se preferir)
            setTecnicos(colaboradoresData.filter((c) => c.ativo !== false));
            setProdutos(produtosData.filter((p) => p.ativo));

            // Buscar link rastreável
            const links = await storage.getAll('links_rastreaveis', empresa.id);
            const linkAtivo = links.find(l => l.osId === id && l.ativo !== false);
            setLinkRastreavel(linkAtivo);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const salvarOS = async (dados) => {
        setSalvando(true);
        try {
            // Se 'dados' for passado, usa ele (ex: mudança de status), senão usa o 'form' (edição manual)
            const payload = dados || form;

            // VALIDAÇÃO CRÍTICA: Impedir OS em execução sem técnico
            // Verifica o estado final que resultaria deste salvamento
            const nextStatus = payload.status !== undefined ? payload.status : os.status;
            const nextTecnicoId = payload.tecnicoId !== undefined ? payload.tecnicoId : os.tecnicoId;

            if (nextStatus === 'execucao' && !nextTecnicoId) {
                alert('Atenção: Não é permitido salvar uma OS em execução sem definir um técnico responsável.');
                setShowAtribuirTecnico(true);
                return; // Bloqueia o salvamento
            }

            // CORREÇÃO CRÍTICA DE PERSISTÊNCIA:
            // Usar os.id se disponível para garantir o tipo correto (number/string) compatível com o banco
            // O id do useParams é sempre string e pode falhar na comparação estrita do storage
            const targetId = os?.id || id;

            await storage.update('ordens_servico', targetId, payload);

            // Se for form manual, limpa rascunho
            if (!dados) clearDraft();

            await carregarDados(true); // Isso vai resetar o form e isDirty
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar alterações');
        } finally {
            setSalvando(false);
        }
    };

    // Manter a ref atualizada com a versão mais recente de salvarOS
    salvarOSRef.current = salvarOS;
    // Handler para mudanças no formulário
    const handleFormChange = (field, value) => {
        setForm(prev => {
            const novo = { ...prev, [field]: value };
            setIsDirty(true);
            return novo;
        });
    };

    const aprovarOrcamento = async () => {
        // Aprovar orçamento muda o status para 'aberta' (Aprovada/Não Iniciada)
        await mudarStatus('aberta');
    };

    const cancelarEdicao = async () => {
        clearDraft(); // Remove o rascunho se o usuário cancelou explicitamente
        await carregarDados(true); // Recarrega do banco, descartando alterações locais
        setIsDirty(false);
    };

    // Transição de status
    const mudarStatus = async (novoStatus) => {
        // Validações
        if (novoStatus === 'execucao' && !os.tecnicoId) {
            alert('Atribua um técnico antes de iniciar a execução.');
            setAtribuirParaIniciarExecucao(true); // Flag para iniciar execução após atribuir
            setShowAtribuirTecnico(true);
            return;
        }

        // Modal de confirmação para finalizar
        if (novoStatus === 'finalizada') {
            setKmAtualizado(veiculo?.km || '');
            setShowFinalizarModal(true);
            return;
        }

        // Modal de confirmação para cancelar
        if (novoStatus === 'cancelada') {
            setMotivoCancelamento('');
            setShowCancelarModal(true);
            return;
        }

        // Modal para reabertura de OS finalizada (estorno necessário)
        if (os.status === 'finalizada' && (novoStatus === 'aberta' || novoStatus === 'execucao')) {
            setShowReabrirModal(true);
            return;
        }

        // Verificação de previsão de entrega vencida ao aprovar orçamento
        if (os.status === 'orcamento' && novoStatus === 'aberta' && os.previsaoEntrega) {
            const previsao = new Date(os.previsaoEntrega);
            const agora = new Date();
            if (previsao < agora) {
                const confirmar = confirm(
                    `⚠️ ATENÇÃO: A previsão de entrega informada no orçamento (${previsao.toLocaleDateString('pt-BR')} às ${previsao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}) já passou!\n\nDeseja continuar mesmo assim?\n\nVocê poderá atualizar a previsão após aprovar.`
                );
                if (!confirmar) {
                    return;
                }
            }
        }

        await salvarOS({ status: novoStatus });
    };

    // Confirmar finalização (chamado pelo modal)
    const confirmarFinalizacao = async () => {
        setSalvando(true);
        try {
            // Atualizar KM do veículo se informado
            if (veiculo && kmAtualizado && Number(kmAtualizado) > 0) {
                await storage.update('veiculos', veiculo.id, { km: Number(kmAtualizado) });
            }

            // Baixa automática de estoque para todos os produtos da OS
            const itens = os.itens || [];
            for (const item of itens) {
                if (item.tipo === 'produto' && item.produtoId) {
                    try {
                        const produto = await storage.getById('produtos', item.produtoId);
                        if (produto) {
                            const estoqueAtual = Number(produto.quantidade) || 0;
                            const novoEstoque = Math.max(0, estoqueAtual - item.quantidade);

                            await storage.update('produtos', item.produtoId, { quantidade: novoEstoque });

                            await storage.create('movimentacoes_estoque', {
                                produtoId: item.produtoId,
                                osId: os.id,
                                tipo: 'saida',
                                quantidade: item.quantidade,
                                motivo: `OS #${os.numero || os.id.slice(-6)} finalizada`,
                                estoqueAnterior: estoqueAtual,
                                estoqueAtual: novoEstoque,
                            }, empresa.id);
                        }
                    } catch (error) {
                        console.error('Erro na baixa de estoque:', error);
                    }
                }
            }

            // Calcular e registrar comissão do técnico
            if (os.tecnicoId && (os.valorTotal || 0) > 0) {
                try {
                    const tecnico = await storage.getById('colaboradores', os.tecnicoId);
                    if (tecnico && tecnico.comissao > 0) {
                        const valorComissao = (os.valorTotal * tecnico.comissao) / 100;
                        await storage.create('comissoes', {
                            tecnicoId: os.tecnicoId,
                            osId: os.id,
                            osNumero: os.numero,
                            valorOs: os.valorTotal,
                            percentual: tecnico.comissao,
                            valorComissao,
                            status: 'pendente',
                            clienteId: os.clienteId,
                        }, empresa.id);
                    }
                } catch (error) {
                    console.error('Erro ao calcular comissão:', error);
                }
            }

            await salvarOS({ status: 'finalizada' });
            setShowFinalizarModal(false);
            setShowFinalizadoSuccess(true);
        } catch (error) {
            console.error('Erro ao finalizar:', error);
        } finally {
            setSalvando(false);
        }
    };

    // Confirmar cancelamento (chamado pelo modal)
    const confirmarCancelamento = async () => {
        setSalvando(true);
        try {
            // Se a OS estava finalizada, estornar estoque
            if (os.status === 'finalizada') {
                await estornarEstoque();
            }

            // Salvar motivo nas observações
            const observacaoAtual = os.observacoes || '';
            const novaObservacao = motivoCancelamento
                ? `${observacaoAtual}\n[CANCELADO] ${motivoCancelamento}`.trim()
                : observacaoAtual;

            await salvarOS({ status: 'cancelada', observacoes: novaObservacao });
            setShowCancelarModal(false);
        } catch (error) {
            console.error('Erro ao cancelar:', error);
        } finally {
            setSalvando(false);
        }
    };

    // Confirmar reabertura de OS finalizada (chamado pelo modal)
    const confirmarReabertura = async () => {
        setSalvando(true);
        try {
            // Estornar estoque (devolver peças)
            await estornarEstoque();

            // Salvar novo status
            await salvarOS({ status: 'aberta' });
            setShowReabrirModal(false);
        } catch (error) {
            console.error('Erro ao reabrir:', error);
        } finally {
            setSalvando(false);
        }
    };

    // Estornar estoque (devolver peças)
    const estornarEstoque = async () => {
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
                            motivo: `Estorno - OS #${os.numero || os.id.slice(-6)}`,
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

    // Adicionar item à OS (baixa de estoque ocorre ao finalizar)
    const adicionarItem = async (item) => {
        const itensAtuais = os.itens || [];
        const novoItem = {
            ...item,
            id: `item_${Date.now()}`,
            isento: ['garantia', 'cortesia', 'interna'].includes(os.tipo) ? true : false,
            // item.total já vem calculado do modal (líquido do item)
            // Se o item não tiver campos novos (legado), calcula o básico
            total: item.total !== undefined ? item.total : (item.quantidade * item.precoUnitario),
        };
        const novosItens = [...itensAtuais, novoItem];

        const { totalFinal } = calcularResumoFinanceiro(
            novosItens,
            os.descontoGlobalTipo, os.descontoGlobalValor,
            os.acrescimoGlobalTipo, os.acrescimoGlobalValor
        );

        // Atualizar estado local (Draft)
        setOs(prev => ({ ...prev, itens: novosItens, valorTotal: totalFinal }));
        setForm(prev => ({ ...prev, itens: novosItens, valorTotal: totalFinal }));
        setIsDirty(true);
        // setShowAddItem(false); // Mantendo modal aberto para inserção contínua
    };

    // Adicionar múltiplos itens (para importação de Kits)
    const adicionarItensEmLote = (itensKit) => {
        const itensAtuais = os.itens || [];
        const timestamp = Date.now();

        const novosItensKit = itensKit.map((item, index) => ({
            ...item,
            id: `item_${timestamp}_${index}`,
            isento: ['garantia', 'cortesia', 'interna'].includes(os.tipo) ? true : false,
            // Recalcular total se necessário, ou usar o do kit se compatível
            total: item.quantidade * item.precoUnitario,
        }));

        const novosItens = [...itensAtuais, ...novosItensKit];

        const { totalFinal } = calcularResumoFinanceiro(
            novosItens,
            os.descontoGlobalTipo, os.descontoGlobalValor,
            os.acrescimoGlobalTipo, os.acrescimoGlobalValor
        );

        setOs(prev => ({ ...prev, itens: novosItens, valorTotal: totalFinal }));
        setForm(prev => ({ ...prev, itens: novosItens, valorTotal: totalFinal }));
        setIsDirty(true);
        setShowImportarKit(false);
    };

    // Remover item da OS (sem mexer no estoque, pois ainda não foi finalizada)
    const removerItem = async (itemId) => {
        const novosItens = (os.itens || []).filter((i) => i.id !== itemId);

        const { totalFinal } = calcularResumoFinanceiro(
            novosItens,
            os.descontoGlobalTipo, os.descontoGlobalValor,
            os.acrescimoGlobalTipo, os.acrescimoGlobalValor
        );

        // Atualizar estado local (Draft)
        setOs(prev => ({ ...prev, itens: novosItens, valorTotal: totalFinal }));
        setForm(prev => ({ ...prev, itens: novosItens, valorTotal: totalFinal }));
        setIsDirty(true);
    };

    // Salvar item editado
    const salvarEdicaoItem = async (itemEditado) => {
        const itensAtuais = os.itens || [];
        const novosItens = itensAtuais.map(i => i.id === itemEditado.id ? itemEditado : i);

        const { totalFinal } = calcularResumoFinanceiro(
            novosItens,
            os.descontoGlobalTipo, os.descontoGlobalValor,
            os.acrescimoGlobalTipo, os.acrescimoGlobalValor
        );

        // Atualizar estado local (Draft)
        setOs(prev => ({ ...prev, itens: novosItens, valorTotal: totalFinal }));
        setForm(prev => ({ ...prev, itens: novosItens, valorTotal: totalFinal }));
        setIsDirty(true);
        setItemEditando(null);
    };

    // Atribuir técnico
    const atribuirTecnico = async (tecnicoId) => {
        // Validação: Não permitir remover técnico se estiver em execução
        if (os.status === 'execucao' && !tecnicoId) {
            alert('Uma OS em execução precisa de um técnico responsável. Atribua um técnico ou mude o status primeiro.');
            return;
        }

        // Se veio do "Iniciar Execução", mudar status automaticamente
        if (atribuirParaIniciarExecucao && tecnicoId) {
            setAtribuirParaIniciarExecucao(false);
            setShowAtribuirTecnico(false);

            // Preparar dados para execução
            const dadosExecucao = {
                tecnicoId,
                status: 'execucao'
            };

            await salvarOS(dadosExecucao);
            return;
        }

        // Atribuição normal (sem iniciar execução)
        setOs(prev => ({ ...prev, tecnicoId }));
        setForm(prev => ({ ...prev, tecnicoId }));
        setIsDirty(true);
        setShowAtribuirTecnico(false);
    };

    // Salvar checklist
    const salvarChecklist = async (checklist) => {
        setOs(prev => ({ ...prev, checklist }));
        setForm(prev => ({ ...prev, checklist }));
        setIsDirty(true);
        setShowChecklist(false);
    };

    // Salvar defeito constatado (Draft)
    const salvarDefeitoConstatado = async (texto) => {
        setOs(prev => ({ ...prev, defeitoConstatado: texto }));
        setForm(prev => ({ ...prev, defeitoConstatado: texto }));
        setIsDirty(true);
    };

    // Salvar itens como modelo (Kit)
    const salvarModelo = async () => {
        const itens = os.itens || [];
        if (itens.length === 0) {
            alert('Adicione itens antes de salvar como modelo.');
            return;
        }

        const nomeModelo = prompt('Nome do Kit/Modelo (ex: Revisão 10k):');
        if (!nomeModelo) return;

        try {
            const novoTemplate = {
                nome: nomeModelo,
                itens: itens.map(i => ({
                    tipo: i.tipo,
                    nome: i.nome,
                    precoUnitario: i.precoUnitario,
                    quantidade: i.quantidade,
                    produtoId: i.produtoId || null,
                    unidade: i.unidade || 'UN'
                }))
            };

            await storage.create('osprimex_templates', novoTemplate, empresa.id);
            alert(`Modelo "${nomeModelo}" salvo com sucesso!`);
        } catch (error) {
            console.error('Erro ao salvar modelo:', error);
            alert('Erro ao salvar modelo.');
        }
    };

    // Adicionar foto
    const adicionarFoto = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fotosAtuais = os.fotos || [];
        if (fotosAtuais.length >= 5) {
            alert('Limite máximo de 5 fotos atingido.');
            return;
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            alert('Selecione apenas arquivos de imagem.');
            return;
        }

        // Validar tamanho (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }

        // Converter para base64
        const reader = new FileReader();
        reader.onload = async (event) => {
            const novaFoto = {
                id: `foto_${Date.now()}`,
                data: event.target.result,
                nome: file.name,
                criadoEm: new Date().toISOString(),
            };

            const novasFotos = [...fotosAtuais, novaFoto];
            setOs(prev => ({ ...prev, fotos: novasFotos }));
            setForm(prev => ({ ...prev, fotos: novasFotos }));
            setIsDirty(true);
        };
        reader.readAsDataURL(file);
    };

    // Remover foto
    const removerFoto = async (fotoId) => {
        if (!confirm('Remover esta foto?')) return;
        const novasFotos = (os.fotos || []).filter((f) => f.id !== fotoId);
        await salvarOS({ fotos: novasFotos });
        setShowFotoModal(null);
    };

    // Registrar pagamento vinculado à OS
    const registrarPagamento = async ({ valor, formaPagamento, observacao }) => {
        if (!valor || valor <= 0) {
            alert('Informe um valor válido.');
            return;
        }

        const pagamentosAtuais = os.pagamentos || [];
        const totalPago = pagamentosAtuais.reduce((sum, p) => sum + p.valor, 0);
        const restante = (os.valorTotal || 0) - totalPago;

        if (valor > restante + 0.01) {
            alert('O valor excede o saldo restante.');
            return;
        }

        const novoPagamento = {
            id: `pag_${Date.now()}`,
            valor,
            formaPagamento,
            observacao,
            criadoEm: new Date().toISOString(),
        };

        const novosPagamentos = [...pagamentosAtuais, novoPagamento];
        const novoTotalPago = novosPagamentos.reduce((sum, p) => sum + p.valor, 0);
        const statusPagamento = novoTotalPago >= (os.valorTotal || 0) ? 'pago' : 'parcial';

        try {
            // Atualizar OS
            await salvarOS({
                pagamentos: novosPagamentos,
                valorPago: novoTotalPago,
                statusPagamento
            });

            // Criar lançamento financeiro vinculado
            await storage.create('lancamentos_financeiros', {
                tipo: 'receita',
                categoria: 'Serviços/Produtos',
                descricao: `Pagamento OS #${os.numero || os.id.slice(-6)} - ${cliente?.nome || 'Cliente'}`,
                valor,
                formaPagamento,
                osId: os.id,
                clienteId: os.clienteId,
                data: toISODate(new Date()),
                status: 'confirmado',
            }, empresa.id);

            setShowPagamento(false);
        } catch (error) {
            console.error('Erro ao registrar pagamento:', error);
            alert('Erro ao registrar pagamento');
        }
    };

    // Calcular totais de pagamento
    const calcularPagamentos = () => {
        const pagamentos = os?.pagamentos || [];
        const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
        const restante = Math.max(0, (os?.valorTotal || 0) - totalPago);
        return { totalPago, restante, pagamentos };
    };

    // Duplicar OS
    const duplicarOS = async () => {
        if (!confirm('Criar uma nova OS baseada nesta? Os itens, cliente e veículo serão copiados.')) return;

        try {
            // Buscar próximo número
            const todasOS = await storage.getAll('ordens_servico', empresa.id);
            const maxNumero = todasOS.reduce((max, o) => Math.max(max, o.numero || 0), 0);

            const novaOS = {
                clienteId: os.clienteId,
                veiculoId: os.veiculoId,
                numero: maxNumero + 1,
                status: 'aberta',
                kmAtual: '',
                defeitoRelatado: os.defeitoRelatado || '',
                observacoes: `Duplicada da OS #${os.numero}`,
                itens: (os.itens || []).map(item => ({
                    ...item,
                    id: Date.now() + Math.random() // Novo ID
                })),
                valorTotal: os.valorTotal || 0,
                pagamentos: [],
            };

            const criada = await storage.create('ordens_servico', novaOS, empresa.id);
            navigate(`/os/${criada.id}`);
        } catch (error) {
            console.error('Erro ao duplicar OS:', error);
            alert('Erro ao duplicar OS');
        }
    };

    const handleSalvarAssinatura = async (base64Image) => {
        try {
            await storage.update('ordens_servico', os.id, {
                ...os,
                assinaturaCliente: base64Image
            });
            await carregarDados(); // Recarrega OS
            setShowAssinatura(false);
            alert('Assinatura salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar assinatura:', error);
            alert('Erro ao salvar assinatura.');
        }
    };

    const handleEnviarWhatsApp = async (tipo = 'acompanhamento') => {
        if (!cliente?.whatsapp && !cliente?.telefone) {
            alert('Cliente não possui telefone/WhatsApp cadastrado.');
            return;
        }

        const numRaw = cliente.whatsapp || cliente.telefone;
        const telefone = numRaw.replace(/\D/g, '');
        let linkCurto = '';

        try {
            // 1. Verificar se já existe link para esta OS
            const linksExistentes = await storage.getAll('links_rastreaveis', empresa.id);
            const linkEncontrado = linksExistentes.find(l => l.osId === os.id && l.ativo !== false);

            if (linkEncontrado) {
                linkCurto = `${window.location.origin}/r/${linkEncontrado.id}`;
            } else {
                // 2. Criar novo link
                const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
                const novoLink = {
                    id: codigo,
                    codigo: codigo,
                    osId: os.id,
                    urlDestino: `/status/${os.numero}?e=${empresa.id}`,
                    ativo: true,
                    cliques: 0,
                    criadoEm: new Date().toISOString()
                };

                await storage.create('links_rastreaveis', novoLink, empresa.id);
                linkCurto = `${window.location.origin}/r/${codigo}`;

                // Atualizar estado visual imediatamente
                setLinkRastreavel(novoLink);
            }

            // Se já existia, garantir que o estado esteja sincronizado (caso tenha carregado depois)
            if (linkEncontrado) {
                setLinkRastreavel(linkEncontrado);
            }

            let texto = '';

            if (tipo === 'agradecimento') {
                let msgTemplate = configuracoes?.templateAgradecimento || 'Olá {nome}, obrigado pela preferência! Se precisar de algo para seu {veiculo}, conte conosco.';

                // Sanitize function equivalent (inline to avoid scope issues or clutter)
                const sanitize = (str) => str.replace(/\uFFFD/g, '').replace(/\\u([a-fA-F0-9]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)));
                msgTemplate = sanitize(msgTemplate);

                const veiculoNome = veiculo ? (veiculo.modelo || 'veículo') : 'veículo';

                texto = msgTemplate
                    .replace(/{nome}/g, cliente.nome?.split(' ')[0] || 'Cliente')
                    .replace(/{veiculo}/g, veiculoNome);

            } else if (tipo === 'conclusao') {
                const quitado = (os.valorPago || 0) >= (os.valorTotal || 0);
                const termo = quitado ? 'seu comprovante' : 'os detalhes';

                texto =
                    `Olá ${cliente.nome?.split(' ')[0]}!\n\n` +
                    `✅ Sua OS #${os.numero} foi finalizada com sucesso!\n\n` +
                    `Valor Total: ${formatCurrency(os.valorTotal)}\n\n` +
                    `Acesse ${termo} no link abaixo:\n` +
                    `${linkCurto}\n\n` +
                    `Obrigado pela preferência!`;
            } else {
                // Texto padrão de acompanhamento
                const isOrcamento = ['orcamento', 'aguardando_aprovacao'].includes(os.status);
                const textoAcao = isOrcamento
                    ? "Acompanhe o status e aprove o orçamento clicando abaixo:"
                    : "Acompanhe o status clicando abaixo:";

                texto =
                    `Olá ${cliente.nome?.split(' ')[0]}!\n\n` +
                    `Sua OS #${os.numero} está em andamento.\n\n` +
                    `${textoAcao}\n` +
                    `${linkCurto}\n\n` +
                    `Placa: ${veiculo?.placa || ''}\n\n` +
                    `Dúvidas? Estamos à disposição!`;
            }

            const mensagem = encodeURIComponent(texto);
            window.open(`https://wa.me/55${telefone}?text=${mensagem}`, '_blank');
            if (showFinalizadoSuccess) setShowFinalizadoSuccess(false);

        } catch (error) {
            console.error('Erro ao gerar link rastreável:', error);
            alert('Erro ao gerar link. Tente novamente.');
        }
    };

    const handleGerarPix = () => {
        if (!empresa?.chavePix) {
            alert('Chave PIX da empresa não configurada. Configure em Configurações > Empresa.');
            return;
        }

        const payload = gerarPayloadPix({
            chave: empresa.chavePix,
            nome: empresa.razaoSocial || empresa.nomeFantasia,
            cidade: empresa.endereco?.cidade || 'Cidade',
            valor: os.valorTotal - (os.valorPago || 0), // Cobra o restante
            txid: `OS${os.numero}`
        });

        if (payload) {
            setPixPayload(payload);
            setShowPix(true);
        } else {
            alert('Erro ao gerar PIX. Verifique os dados da empresa.');
        }
    };

    const copiarPix = () => {
        navigator.clipboard.writeText(pixPayload);
        alert('Código PIX copiado com sucesso!');
    };

    const handleExport = () => {
        if (!os) return;

        const dataExport = {
            empresa: {
                nome: empresa.nome,
                cnpj: empresa.cnpj,
                email: empresa.email,
                telefone: empresa.telefone
            },
            cliente: cliente ? {
                nome: cliente.nome,
                cpfCnpj: cliente.cpf || cliente.cnpj,
                email: cliente.email,
                telefone: cliente.telefone,
                whatsapp: cliente.whatsapp,
                endereco: cliente.endereco
            } : null,
            veiculo: veiculo ? {
                marca: veiculo.marca,
                modelo: veiculo.modelo,
                placa: veiculo.placa,
                ano: veiculo.ano,
                cor: veiculo.cor,
                km: veiculo.km
            } : null,
            os: {
                numero: os.numero,
                status: os.status,
                dataCriacao: os.criadoEm,
                dataFinalizacao: os.execucaoFinalizadaEm,
                defeitoRelatado: os.defeitoRelatado,
                defeitoConstatado: os.defeitoConstatado,
                observacoes: os.observacoes,
                tecnico: tecnicoAtribuido?.nome,
                valorTotal: os.valorTotal,
                desconto: os.desconto
            },
            itens: os.itens || [],
            pagamentos: os.pagamentos || []
        };

        const jsonString = JSON.stringify(dataExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `os_${os.numero}_export.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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

    if (!os) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4">
                <span className="material-symbols-outlined text-5xl text-gray-400 mb-4">assignment_late</span>
                <p className="text-lg font-medium text-text-light dark:text-text-dark mb-2">
                    OS não encontrada
                </p>
                <button onClick={() => navigate('/os')} className="btn-primary">
                    Voltar para lista
                </button>
            </div>
        );
    }

    const tecnicoAtribuido = tecnicos.find((t) => t.id === os.tecnicoId);

    const statusConfig = {
        orcamento: { label: 'Orçamento', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: 'receipt_long' },
        aberta: { label: 'Aprovada (Não Iniciada)', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: 'inbox' },
        execucao: { label: 'Em Execução', color: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light', icon: 'engineering' },
        aguardando_peca: { label: 'Aguardando Peça', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: 'inventory_2' },
        finalizada: { label: 'Finalizada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: 'check_circle' },
        cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: 'cancel' },
    };

    const statusAtual = statusConfig[os.status];

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark">
            {/* Toast de Aprovação de Orçamento */}
            {toastAprovacao && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slideDown">
                    <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">celebration</span>
                        </div>
                        <div>
                            <p className="font-bold">🎉 Orçamento Aprovado!</p>
                            <p className="text-sm opacity-90">O cliente aprovou o orçamento. OS em execução!</p>
                        </div>
                        <button
                            onClick={() => setToastAprovacao(false)}
                            className="ml-3 p-1 rounded-lg hover:bg-white/20"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Header Sticky */}
            <header className="flex-none z-30 bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    {/* Título */}
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {os.numero ? `OS #${os.numero}` : 'OS Sem Número'}
                                <div className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 border border-transparent ${statusAtual.color}`}>
                                    <span className="material-symbols-outlined text-sm">{statusAtual.icon}</span>
                                    {statusAtual.label}
                                </div>
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {cliente?.nome || 'Cliente não identificado'} • {veiculo?.placa || 'Sem placa'}
                            </p>
                        </div>
                    </div>

                    {/* Direita: Ações Principais (Desktop) */}
                    <div className="flex items-center gap-2">
                        {/* Ações "Desenterradas" para Desktop */}
                        <div className="hidden lg:flex items-center gap-1 mr-2 border-r border-gray-200 dark:border-gray-700 pr-2">
                            <button
                                onClick={duplicarOS}
                                className="btn-ghost text-xs flex items-center gap-1 text-text-secondary-light dark:text-text-secondary-dark hover:text-primary hover:bg-primary/5 px-2 py-1.5 rounded-md transition-colors"
                                title="Duplicar OS"
                            >
                                <span className="material-symbols-outlined text-lg">content_copy</span>
                                Duplicar
                            </button>

                            <button
                                onClick={() => handleEnviarWhatsApp('acompanhamento')}
                                className="btn-ghost text-xs flex items-center gap-1 text-text-secondary-light dark:text-text-secondary-dark hover:text-primary hover:bg-primary/5 px-2 py-1.5 rounded-md transition-colors"
                                title="Enviar Link de Rastreio"
                            >
                                <span className="material-symbols-outlined text-lg">share</span>
                                Compartilhar
                            </button>

                            <button
                                onClick={() => setShowAssinatura(true)}
                                className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                            >
                                <span className="material-symbols-outlined text-lg">draw</span>
                                Assinar
                            </button>
                        </div>

                        {/* Status Actions (Workflow) - Restored */}
                        <div className="flex items-center gap-2">
                            {/* Tracking Info (Visible for all active OS) */}
                            {os.status !== 'cancelada' && (
                                <div className="hidden lg:flex items-center gap-2 mr-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-500">
                                    <span className="flex items-center gap-1" title="Visualizações pelo cliente">
                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                        {os.visualizacoes || 0}
                                    </span>

                                    {linkRastreavel && (
                                        <a
                                            href={`/r/${linkRastreavel.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-primary flex items-center ml-1"
                                            title="Abrir página de rastreio"
                                        >
                                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                                        </a>
                                    )}
                                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                                    <button
                                        onClick={async () => {
                                            try {
                                                let linkToCopy = '';
                                                if (linkRastreavel) {
                                                    linkToCopy = `${window.location.origin}/r/${linkRastreavel.id}`;
                                                } else {
                                                    // Tenta gerar na hora se não existir
                                                    const linksExistentes = await storage.getAll('links_rastreaveis', empresa.id);
                                                    const linkEncontrado = linksExistentes.find(l => l.osId === os.id && l.ativo !== false);

                                                    if (linkEncontrado) {
                                                        linkToCopy = `${window.location.origin}/r/${linkEncontrado.id}`;
                                                        setLinkRastreavel(linkEncontrado);
                                                    } else {
                                                        const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
                                                        const novoLink = {
                                                            id: codigo,
                                                            codigo: codigo,
                                                            osId: os.id,
                                                            urlDestino: `/status/${os.numero}?e=${empresa.id}`,
                                                            ativo: true,
                                                            cliques: 0,
                                                            criadoEm: new Date().toISOString()
                                                        };
                                                        await storage.create('links_rastreaveis', novoLink, empresa.id);
                                                        linkToCopy = `${window.location.origin}/r/${codigo}`;
                                                        setLinkRastreavel(novoLink);
                                                    }
                                                }
                                                navigator.clipboard.writeText(linkToCopy);
                                                alert('Link de rastreio copiado!');
                                            } catch (err) {
                                                console.error('Erro ao copiar link:', err);
                                                alert('Erro ao gerar link.');
                                            }
                                        }}
                                        className="hover:text-primary flex items-center gap-1"
                                        title="Copiar link de rastreio"
                                    >
                                        <span className="material-symbols-outlined text-sm">content_copy</span>
                                    </button>
                                </div>
                            )}

                            {os.status === 'orcamento' && (
                                <>
                                    <button
                                        onClick={() => handleEnviarWhatsApp('orcamento')}
                                        className="btn-ghost text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800"
                                        title="Enviar orçamento para aprovação via WhatsApp"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                        <span className="hidden sm:inline">Enviar p/Aprovação</span>
                                    </button>
                                    <button
                                        onClick={aprovarOrcamento}
                                        className="btn-ghost text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800"
                                        title="Cliente presente no balcão aprovando verbalmente"
                                    >
                                        <span className="material-symbols-outlined">how_to_reg</span>
                                        <span className="hidden sm:inline">Aprovar Manualmente</span>
                                    </button>
                                </>
                            )}

                            {os.status === 'aberta' && (
                                <button
                                    onClick={() => mudarStatus('execucao')}
                                    className="btn-primary animate-pulse"
                                >
                                    <span className="material-symbols-outlined">play_arrow</span>
                                    Iniciar Execução
                                </button>
                            )}

                            {os.status === 'execucao' && (
                                <>
                                    <button
                                        onClick={() => mudarStatus('aguardando_peca')}
                                        className="btn-secondary text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:border-orange-800"
                                    >
                                        <span className="material-symbols-outlined">pause</span>
                                        <span className="hidden sm:inline">Aguardar Peça</span>
                                    </button>
                                    <button
                                        onClick={() => setShowFinalizarModal(true)}
                                        className="btn-primary bg-green-600 hover:bg-green-700 border-green-600"
                                    >
                                        <span className="material-symbols-outlined">check</span>
                                        Finalizar
                                    </button>
                                </>
                            )}

                            {os.status === 'aguardando_peca' && (
                                <button
                                    onClick={() => mudarStatus('execucao')}
                                    className="btn-primary"
                                >
                                    <span className="material-symbols-outlined">play_arrow</span>
                                    Retomar Execução
                                </button>
                            )}

                            {os.status === 'finalizada' && (
                                <>
                                    <button
                                        onClick={() => handleEnviarWhatsApp('agradecimento')}
                                        className="btn-primary bg-indigo-600 hover:bg-indigo-700 border-indigo-600"
                                    >
                                        <span className="material-symbols-outlined">sentiment_satisfied</span>
                                        <span className="hidden sm:inline">Agradecer</span>
                                    </button>
                                    <button
                                        onClick={() => mudarStatus('aberta')}
                                        className="btn-secondary text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:border-orange-800"
                                    >
                                        <span className="material-symbols-outlined">lock_open</span>
                                        <span className="hidden sm:inline">Reabrir</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Separador visual entre ações de workflow e impressão */}
                        <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                        {/* Botões de Impressão */}
                        <PrintOSButton
                            os={os}
                            cliente={cliente}
                            veiculo={veiculo}
                            empresa={empresa}
                            tecnico={tecnicoAtribuido}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark"
                        />
                        <PrintThermalButton
                            os={os}
                            cliente={cliente}
                            veiculo={veiculo}
                            empresa={empresa}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark"
                        />

                        {/* Dropdown Menu (Mobile + Extras) */}
                        <div className="relative group">
                            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark">
                                <span className="material-symbols-outlined">more_vert</span>
                            </button>

                            <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50 animate-scaleIn origin-top-right">
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    {/* Mobile Only Actions */}
                                    {/* Note: In pure CSS, we can hide these on LG, but here we render them always in dropdown for fallback or just show on mobile */}
                                    <div className="lg:hidden">
                                        <button onClick={duplicarOS} className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark">
                                            <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark">content_copy</span> Duplicar
                                        </button>
                                        <button onClick={() => handleEnviarWhatsApp('acompanhamento')} className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark">
                                            <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark">share</span> Rastreio
                                        </button>
                                        <button onClick={() => setShowAssinatura(true)} className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark">
                                            <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark">draw</span> Assinar
                                        </button>
                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                    </div>

                                    {/* Downloads */}
                                    <div className="px-3 py-2">
                                        <p className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Downloads</p>
                                        <div className="flex flex-col gap-1">
                                            <DownloadOSButton
                                                os={os}
                                                cliente={cliente}
                                                veiculo={veiculo}
                                                empresa={empresa}
                                                tecnico={tecnicoAtribuido}
                                                className="w-full text-left flex items-center gap-2 text-sm text-text-light dark:text-text-dark hover:text-primary"
                                            />
                                            <DownloadThermalButton
                                                os={os}
                                                cliente={cliente}
                                                veiculo={veiculo}
                                                empresa={empresa}
                                                className="w-full text-left flex items-center gap-2 text-sm text-text-light dark:text-text-dark hover:text-primary"
                                            />
                                        </div>
                                    </div>

                                    {/* Export / Pix */}
                                    {os.status === 'finalizada' && (
                                        <>
                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                            <button onClick={handleExport} className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark">
                                                <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark">data_object</span> Exportar JSON
                                            </button>
                                            <button onClick={handleGerarPix} className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark">
                                                <span className="material-symbols-outlined text-lg text-blue-500">pix</span> Receber PIX
                                            </button>
                                        </>
                                    )}

                                    {/* Danger Zone - Cancelar (para todos os status exceto cancelada) */}
                                    {os.status !== 'cancelada' && <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />}

                                    {os.status !== 'cancelada' && (
                                        <button onClick={() => mudarStatus('cancelada')} className="w-full p-3 text-left hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 flex items-center gap-3 text-sm">
                                            <span className="material-symbols-outlined text-lg">cancel</span>
                                            Cancelar OS
                                            {os.status === 'finalizada' && (
                                                <span className="ml-auto text-[10px] bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded font-bold">ESTORNO</span>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Window Controls */}
                        {isWindowMode && (
                            <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-2 ml-1">
                                <button onClick={onMinimize} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark"><span className="material-symbols-outlined">remove</span></button>
                                <button
                                    onClick={() => isDirty ? setShowConfirmarSaida(true) : onClose()}
                                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-text-secondary-light dark:text-text-secondary-dark hover:text-red-500"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header >
            {/* Alerta de Rascunho Encontrado (Top Bar) */}
            {
                draftFound && !restoredDraft && !isDirty && (
                    <div className="flex-none bg-amber-100 dark:bg-amber-900/40 border-b border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-4 py-3 z-40 flex items-center justify-center gap-3 animate-slideDown">
                        <span className="material-symbols-outlined">history</span>
                        <div className="text-sm">
                            <span className="font-bold mr-1">Rascunho não salvo encontrado!</span>
                            <span className="opacity-80">Gostaria de restaurar o que você estava digitando?</span>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                            <button
                                onClick={() => {
                                    const draft = loadDraft();
                                    if (draft) {
                                        setOs(draft); // Atualiza visualização também
                                        setForm(draft);
                                        setIsDirty(true);
                                        setRestoredDraft(true);
                                    }
                                }}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                            >
                                Restaurar Rascunho
                            </button>
                            <button
                                onClick={clearDraft}
                                className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg text-amber-700 dark:text-amber-300"
                                title="Descartar"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900/50 p-4">
                <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* === COLUNA ESQUERDA (Contexto) === */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Cartão Cliente & Veículo Unified */}
                        <div className="card p-5">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">person</span>
                                    Cliente e Veículo
                                </h3>
                                {os.status !== 'finalizada' && os.status !== 'cancelada' && (
                                    <button onClick={() => setShowEditVeiculo(true)} className="text-xs text-primary hover:underline">Editar</button>
                                )}
                            </div>

                            <div className="flex gap-4 items-center mb-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                                    {cliente?.nome?.charAt(0) || 'C'}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-white truncate">{cliente?.nome}</p>
                                    <div className="flex flex-col gap-1 mt-1">
                                        {cliente?.telefone && (
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <span className="material-symbols-outlined text-[10px]">call</span>
                                                {cliente.telefone}
                                            </div>
                                        )}
                                        {cliente?.whatsapp && (
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <span className="material-symbols-outlined text-[10px]">smartphone</span>
                                                    {cliente.whatsapp}
                                                </div>
                                                <a
                                                    href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-1.5 py-0.5 rounded border border-green-200 transition-colors"
                                                    title="Conversar no WhatsApp"
                                                >
                                                    <svg className="w-3 h-3 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                    </svg>
                                                    Fale com o cliente...
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                                <div className="flex gap-3">
                                    {veiculo?.foto ? (
                                        <img src={veiculo.foto} alt="Veículo" className="w-16 h-16 rounded-md object-cover" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                            <span className="material-symbols-outlined">directions_car</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white">{veiculo?.modelo || 'Modelo não inf.'}</p>
                                        <p className="text-xs text-gray-500 mb-1">{veiculo?.marca} • {veiculo?.cor}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono font-bold tracking-wider">
                                                {veiculo?.placa || 'SEM PLACA'}
                                            </span>
                                            <span className="text-xs text-gray-500">{os.kmAtual ? `${os.kmAtual} km` : 'KM N/A'}</span>

                                            {/* Prisma inline - mesma linha */}
                                            {empresa.usarPrismas && (
                                                os.status !== 'finalizada' && os.status !== 'cancelada' ? (
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            className="h-6 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1 min-w-[90px] max-w-[120px] focus:outline-none focus:border-primary"
                                                            value={os.prisma || ''}
                                                            onChange={async (e) => {
                                                                const novoValor = e.target.value;
                                                                const numeroPrisma = novoValor ? parseInt(novoValor) : null;
                                                                const valorAnterior = os.prisma;

                                                                // 1. Validação de Unicidade (Síncrona - Leitura de Storage com PREFIXO CORRETO)
                                                                if (numeroPrisma) {
                                                                    const dadosStorage = localStorage.getItem('osprimex_ordens_servico');
                                                                    const todasOS = dadosStorage ? JSON.parse(dadosStorage) : [];

                                                                    const conflito = todasOS.find(o =>
                                                                        o.ativo !== false &&
                                                                        Number(o.prisma) === numeroPrisma &&
                                                                        String(o.id) !== String(os.id) &&
                                                                        !['finalizada', 'cancelada'].includes(o.status)
                                                                    );

                                                                    if (conflito) {
                                                                        alert(`🚫 AÇÃO BLOQUEADA\n\nO Prisma #${numeroPrisma} já está em uso na OS #${conflito.numero} (${conflito.clienteNome || 'Cliente'}).\nStatus: ${conflito.status}`);
                                                                        e.target.value = valorAnterior || "";
                                                                        return;
                                                                    }
                                                                }

                                                                // 2. Update Otimista (State Local)
                                                                setOs(prev => ({ ...prev, prisma: numeroPrisma }));

                                                                // 3. Persistência MANUAL DIRETA (Nuclear Option)
                                                                try {
                                                                    // Ler novamente para garantir dados frescos
                                                                    const dadosRaw = localStorage.getItem('osprimex_ordens_servico');
                                                                    const todasOS = dadosRaw ? JSON.parse(dadosRaw) : [];

                                                                    // Encontrar índice usando coerção
                                                                    const index = todasOS.findIndex(o => String(o.id) === String(os.id));

                                                                    if (index !== -1) {
                                                                        todasOS[index] = {
                                                                            ...todasOS[index],
                                                                            prisma: numeroPrisma,
                                                                            atualizadoEm: new Date().toISOString()
                                                                        };

                                                                        // Gravar com prefixo correto
                                                                        localStorage.setItem('osprimex_ordens_servico', JSON.stringify(todasOS));

                                                                        // Disparar evento
                                                                        window.dispatchEvent(new CustomEvent('osprimex-storage', { detail: { key: 'ordens_servico' } }));

                                                                        // Reload para garantir sincronia
                                                                        await carregarDados(true);

                                                                        // Feedback visual
                                                                        const el = document.getElementById('prisma-saved-feedback');
                                                                        if (el) {
                                                                            el.style.opacity = '1';
                                                                            setTimeout(() => el.style.opacity = '0', 2000);
                                                                        }
                                                                    } else {
                                                                        throw new Error(`ID ${os.id} não encontrado no storage.`);
                                                                    }
                                                                } catch (error) {
                                                                    console.error("Erro fatal ao salvar prisma:", error);
                                                                    setOs(prev => ({ ...prev, prisma: valorAnterior }));
                                                                    alert(`Erro ao persistir: ${error.message}`);
                                                                }
                                                            }}
                                                            disabled={loading || salvando}
                                                            title="Prisma do veículo"
                                                        >
                                                            <option value="">Prisma</option>
                                                            {opcoesPrisma.map(op => (
                                                                <option key={op.value} value={op.value}>
                                                                    {op.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <span id="prisma-saved-feedback" className="text-xs text-green-600 font-bold opacity-0 transition-opacity duration-300">
                                                            Salvo!
                                                        </span>
                                                    </div>
                                                ) : (
                                                    os.prisma && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs whitespace-nowrap">
                                                            {(() => {
                                                                const labelCor = empresa.prismaCor === 'Vermelho' ? '🔴' :
                                                                    empresa.prismaCor === 'Azul' ? '🔵' :
                                                                        empresa.prismaCor === 'Verde' ? '🟢' :
                                                                            empresa.prismaCor === 'Amarelo' ? '🟡' :
                                                                                empresa.prismaCor === 'Preto' ? '⚫' :
                                                                                    empresa.prismaCor === 'Laranja' ? '🟠' : '⚪';
                                                                return labelCor;
                                                            })()} #{os.prisma}
                                                        </span>
                                                    )
                                                )
                                            )}

                                            {/* Alerta inline */}
                                            {empresa.usarPrismas && !os.prisma && os.status === 'execucao' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs whitespace-nowrap">
                                                    ⚠️ Sem prisma
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cartão Status & Técnico - Com borda lateral colorida por status */}
                        <div className={`card p-5 border-l-4 transition-all ${os.status === 'execucao' ? 'border-l-primary bg-primary/5 dark:bg-primary/10' :
                            os.status === 'aguardando_peca' ? 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10' :
                                os.status === 'finalizada' ? 'border-l-green-500' :
                                    os.status === 'cancelada' ? 'border-l-red-500 opacity-60' :
                                        os.status === 'orcamento' ? 'border-l-yellow-500' :
                                            'border-l-gray-300 dark:border-l-gray-600'
                            }`}>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">engineering</span>
                                Execução
                                {os.status === 'execucao' && (
                                    <span className="ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary text-white animate-pulse">AO VIVO</span>
                                )}
                            </h3>

                            {/* Técnico */}
                            <div className="mb-4">
                                <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Técnico Responsável</label>
                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer border border-transparent hover:border-gray-200 transition-all" onClick={() => os.status !== 'finalizada' && setShowAtribuirTecnico(true)}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                                            {tecnicoAtribuido ? tecnicoAtribuido.nome.charAt(0) : '?'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-sm ${tecnicoAtribuido ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 italic'}`}>
                                                {tecnicoAtribuido?.nome || 'Atribuir Técnico'}
                                            </span>
                                        </div>
                                    </div>
                                    {os.status !== 'finalizada' && <span className="material-symbols-outlined text-gray-400">edit</span>}
                                </div>
                            </div>



                            {/* Datas */}
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Entrada</label>
                                    <p className="text-sm font-medium">{formatDateTime(os.criadoEm)}</p>
                                </div>
                                {os.status === 'orcamento' ? (
                                    <>
                                        <div>
                                            <label className="text-xs text-text-secondary-light dark:text-text-secondary-dark block mb-1">
                                                Validade do Orçamento
                                            </label>
                                            <input
                                                type="date"
                                                value={form?.validadeOrcamento ? form.validadeOrcamento.split('T')[0] : ''}
                                                onChange={(e) => handleFormChange('validadeOrcamento', e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="input text-xs py-1 px-2 h-8 w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">Previsão Entrega (Opcional)</label>
                                            <input
                                                type="datetime-local"
                                                value={form?.previsaoEntrega || ''}
                                                onChange={(e) => handleFormChange('previsaoEntrega', e.target.value)}
                                                className="input text-xs py-1 px-2 h-8 w-full"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Previsão de Entrega (Opcional)</label>
                                        <input
                                            type="datetime-local"
                                            value={form?.previsaoEntrega || ''}
                                            onChange={(e) => handleFormChange('previsaoEntrega', e.target.value)}
                                            className="input text-xs py-1 px-2 h-8 w-full"
                                            disabled={os.status === 'finalizada' || os.status === 'cancelada'}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Diagnóstico */}
                        <div className="card p-5 space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex gap-2 items-center mb-2">
                                    <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-red-500 text-sm">report_problem</span>
                                    </div>
                                    Defeito Relatado
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                    {os.defeitoRelatado || 'Não informado.'}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex gap-2 items-center mb-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-blue-500 text-sm">biotech</span>
                                    </div>
                                    Diagnóstico Técnico
                                </h3>
                                <textarea
                                    className="input text-sm w-full min-h-[100px] focus:ring-blue-200 dark:focus:ring-blue-800"
                                    placeholder="Descreva o que foi constatado..."
                                    value={form?.defeitoConstatado || ''}
                                    onChange={(e) => handleFormChange('defeitoConstatado', e.target.value)}
                                    disabled={os.status === 'finalizada'}
                                />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex gap-2 items-center mb-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-gray-500 text-sm">notes</span>
                                    </div>
                                    Observações
                                </h3>
                                <textarea
                                    className="input text-sm w-full min-h-[80px]"
                                    placeholder="Obs. internas..."
                                    value={form?.observacoes || ''}
                                    onChange={(e) => handleFormChange('observacoes', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Modal Editar Veículo (Mantido aqui para contexto) */}
                        {showEditVeiculo && veiculo && (
                            <EditVeiculoModal
                                veiculo={veiculo}
                                empresaId={empresa.id}
                                onClose={() => setShowEditVeiculo(false)}
                                onSave={(veiculoAtualizado) => {
                                    setVeiculo(veiculoAtualizado);
                                    setShowEditVeiculo(false);
                                }}
                            />
                        )}

                    </div>

                    {/* === COLUNA DIREITA (Conteúdo) === */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Banners Contextuais por Status */}
                        {os.status === 'aguardando_peca' && (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 animate-fadeIn">
                                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">inventory_2</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-orange-800 dark:text-orange-300">Aguardando Peça</p>
                                    <p className="text-sm text-orange-600 dark:text-orange-400">Esta OS está pausada. Retome a execução quando a peça chegar.</p>
                                </div>
                            </div>
                        )}

                        {os.status === 'orcamento' && (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 animate-fadeIn">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">receipt_long</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-yellow-800 dark:text-yellow-300">Orçamento Pendente</p>
                                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Aguardando aprovação do cliente para iniciar os serviços.</p>
                                </div>
                            </div>
                        )}

                        {os.status === 'cancelada' && (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-fadeIn">
                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">cancel</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-red-800 dark:text-red-300">OS Cancelada</p>
                                    <p className="text-sm text-red-600 dark:text-red-400">Esta ordem de serviço foi cancelada e não pode ser editada.</p>
                                </div>
                            </div>
                        )}

                        {/* Checklist */}
                        <div className="card p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="font-semibold text-text-light dark:text-text-dark">Checklist</p>
                                {os.status !== 'finalizada' && os.status !== 'cancelada' && (
                                    <button
                                        onClick={() => setShowChecklist(true)}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        Editar
                                    </button>
                                )}
                            </div>
                            {(!os.checklist || os.checklist.length === 0) ? (
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                    Nenhum item verificado
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {os.checklist.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <span className={`material-symbols-outlined text-lg ${item.ok ? 'text-green-500' : 'text-red-500'}`}>
                                                {item.ok ? 'check_circle' : 'cancel'}
                                            </span>
                                            <span className="text-text-light dark:text-text-dark">{item.item}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Apontamento de Horas */}
                        <TimeTrackingSection
                            os={os}
                            onUpdate={handleUpdateApontamentos}
                            onAddToBill={handleAddToBill}
                        />

                        {/* Itens da OS (Tabela) */}
                        <div className="card overflow-hidden">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">shopping_cart</span>
                                    Itens e Serviços
                                    <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                        {os.itens?.length || 0}
                                    </span>
                                </h3>

                                {os.status !== 'finalizada' && os.status !== 'cancelada' && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={salvarModelo} className="btn-ghost text-xs flex items-center gap-1" title="Salvar Kit">
                                            <span className="material-symbols-outlined text-sm">save_as</span> <span className="hidden sm:inline">Salvar Kit</span>
                                        </button>
                                        <button onClick={() => setShowImportarKit(true)} className="btn-ghost text-xs flex items-center gap-1" title="Importar Kit">
                                            <span className="material-symbols-outlined text-sm">download</span> <span className="hidden sm:inline">Importar</span>
                                        </button>
                                        <button onClick={() => setShowAddItem(true)} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">add</span> Adicionar
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium border-b border-gray-100 dark:border-gray-700">
                                        <tr>
                                            <th className="px-4 py-3">Descrição</th>
                                            <th className="px-4 py-3 text-center w-24">Qtd.</th>
                                            <th className="px-4 py-3 text-right w-32">Unitário</th>
                                            <th className="px-4 py-3 text-right w-32">Total</th>
                                            {os.status !== 'finalizada' && os.status !== 'cancelada' && <th className="px-4 py-3 w-16"></th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {(!os.itens || os.itens.length === 0) ? (
                                            <tr>
                                                <td colSpan="5" className="px-4 py-8 text-center text-gray-500 italic">
                                                    Nenhum item ou serviço adicionado.
                                                </td>
                                            </tr>
                                        ) : (
                                            os.itens.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900 dark:text-white">{item.nome}</div>
                                                        {(item.valDesconto > 0 || item.valAcrescimo > 0) && (
                                                            <div className="text-xs flex gap-2 mt-0.5">
                                                                {item.valDesconto > 0 && <span className="text-green-600">-{formatCurrency(item.valDesconto)} (Desc.)</span>}
                                                                {item.valAcrescimo > 0 && <span className="text-orange-600">+{formatCurrency(item.valAcrescimo)} (Acrés.)</span>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                                                        {item.quantidade} {(!item.unidade || item.unidade === 'SV') ? '' : item.unidade}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                                                        {formatCurrency(item.precoUnitario)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                                        <span className={item.isento ? 'line-through text-gray-400' : ''}>{formatCurrency(item.total)}</span>
                                                        {item.isento && <span className="ml-2 text-[10px] uppercase font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Isento</span>}
                                                    </td>
                                                    {os.status !== 'finalizada' && os.status !== 'cancelada' && (
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => {
                                                                        const novosItens = os.itens.map(i => i.id === item.id ? { ...i, isento: !i.isento } : i);
                                                                        const { totalFinal } = calcularResumoFinanceiro(novosItens, os.descontoGlobalTipo, os.descontoGlobalValor, os.acrescimoGlobalTipo, os.acrescimoGlobalValor);
                                                                        setOs(prev => ({ ...prev, itens: novosItens, valorTotal: totalFinal }));
                                                                        setForm(prev => ({ ...prev, itens: novosItens, valorTotal: totalFinal }));
                                                                        setIsDirty(true);
                                                                    }}
                                                                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${item.isento ? 'text-purple-600' : 'text-gray-400'}`}
                                                                    title={item.isento ? "Cobrar" : "Isentar"}
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">{item.isento ? 'money_off' : 'attach_money'}</span>
                                                                </button>
                                                                <button onClick={() => setItemEditando(item)} className="p-1.5 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Editar">
                                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                                </button>
                                                                <button onClick={() => removerItem(item.id)} className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remover">
                                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>

                                    {/* Footer da Tabela (Resumo) */}
                                    {(os.itens && os.itens.length > 0) && (
                                        <tfoot className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                                            {/* Desconto/Acréscimo Global Editável */}
                                            {os.status !== 'finalizada' && os.status !== 'cancelada' && ((configuracoes?.descontoNoTotal !== false && configuracoes?.descontoNoTotal !== 'false') || (configuracoes?.acrescimoNoTotal === true || configuracoes?.acrescimoNoTotal === 'true')) && (
                                                <tr>
                                                    <td colSpan="5" className="px-4 py-3">
                                                        <div className="flex justify-end gap-4 items-center">
                                                            {(configuracoes?.descontoNoTotal !== false && configuracoes?.descontoNoTotal !== 'false') && (
                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-xs font-semibold uppercase text-gray-500">Desconto Global</label>
                                                                    <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm h-8 w-32">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="flex-1 w-full px-2 text-sm bg-transparent outline-none text-right"
                                                                            placeholder="0.00"
                                                                            value={os.descontoGlobalValor || ''}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                const { totalFinal } = calcularResumoFinanceiro(os.itens || [], os.descontoGlobalTipo, val, os.acrescimoGlobalTipo, os.acrescimoGlobalValor);
                                                                                setOs(prev => ({ ...prev, descontoGlobalValor: val, valorTotal: totalFinal }));
                                                                                setForm(prev => ({ ...prev, descontoGlobalValor: val, valorTotal: totalFinal }));
                                                                                setIsDirty(true);
                                                                            }}
                                                                        />
                                                                        <select
                                                                            value={os.descontoGlobalTipo || 'valor'}
                                                                            onChange={(e) => {
                                                                                const tipo = e.target.value;
                                                                                const { totalFinal } = calcularResumoFinanceiro(
                                                                                    os.itens || [],
                                                                                    tipo, os.descontoGlobalValor,
                                                                                    os.acrescimoGlobalTipo, os.acrescimoGlobalValor
                                                                                );
                                                                                setOs(prev => ({ ...prev, descontoGlobalTipo: tipo, valorTotal: totalFinal }));
                                                                                setForm(prev => ({ ...prev, descontoGlobalTipo: tipo, valorTotal: totalFinal }));
                                                                                setIsDirty(true);
                                                                            }}
                                                                            className="bg-gray-100 dark:bg-gray-700 border-l border-gray-200 dark:border-gray-700 text-xs px-1 rounded-r-md focus:ring-0"
                                                                        >
                                                                            <option value="valor">R$</option>
                                                                            <option value="porcentagem">%</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {(configuracoes?.acrescimoNoTotal === true || configuracoes?.acrescimoNoTotal === 'true') && (
                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-xs font-semibold uppercase text-gray-500">Acréscimo Global</label>
                                                                    <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm h-8 w-32">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="flex-1 w-full px-2 text-sm bg-transparent outline-none text-right"
                                                                            placeholder="0.00"
                                                                            value={os.acrescimoGlobalValor || ''}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                const { totalFinal } = calcularResumoFinanceiro(os.itens || [], os.descontoGlobalTipo, os.descontoGlobalValor, os.acrescimoGlobalTipo, val);
                                                                                setOs(prev => ({ ...prev, acrescimoGlobalValor: val, valorTotal: totalFinal }));
                                                                                setForm(prev => ({ ...prev, acrescimoGlobalValor: val, valorTotal: totalFinal }));
                                                                                setIsDirty(true);
                                                                            }}
                                                                        />
                                                                        <select
                                                                            value={os.acrescimoGlobalTipo || 'valor'}
                                                                            onChange={(e) => {
                                                                                const tipo = e.target.value;
                                                                                const { totalFinal } = calcularResumoFinanceiro(
                                                                                    os.itens || [],
                                                                                    os.descontoGlobalTipo, os.descontoGlobalValor,
                                                                                    tipo, os.acrescimoGlobalValor
                                                                                );
                                                                                setOs(prev => ({ ...prev, acrescimoGlobalTipo: tipo, valorTotal: totalFinal }));
                                                                                setForm(prev => ({ ...prev, acrescimoGlobalTipo: tipo, valorTotal: totalFinal }));
                                                                                setIsDirty(true);
                                                                            }}
                                                                            className="bg-gray-100 dark:bg-gray-700 border-l border-gray-200 dark:border-gray-700 text-xs px-1 rounded-r-md focus:ring-0"
                                                                        >
                                                                            <option value="valor">R$</option>
                                                                            <option value="porcentagem">%</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            {/* Resumo Financeiro */}
                                            {(() => {
                                                const resumo = calcularResumoFinanceiro(
                                                    os.itens || [],
                                                    os.descontoGlobalTipo, os.descontoGlobalValor,
                                                    os.acrescimoGlobalTipo, os.acrescimoGlobalValor
                                                );
                                                return (
                                                    <>
                                                        <tr>
                                                            <td colSpan="3" className="px-4 py-2 text-right text-xs text-text-secondary-light dark:text-text-secondary-dark">Subtotal</td>
                                                            <td colSpan="2" className="px-4 py-2 text-right text-xs text-text-secondary-light dark:text-text-secondary-dark">{formatCurrency(resumo.somaItens)}</td>
                                                        </tr>
                                                        {resumo.valDescontoGlobal > 0 && (
                                                            <tr>
                                                                <td colSpan="3" className="px-4 py-2 text-right text-xs text-green-600 dark:text-green-400">Desconto Global</td>
                                                                <td colSpan="2" className="px-4 py-2 text-right text-xs text-green-600 dark:text-green-400">- {formatCurrency(resumo.valDescontoGlobal)}</td>
                                                            </tr>
                                                        )}
                                                        {resumo.valAcrescimoGlobal > 0 && (
                                                            <tr>
                                                                <td colSpan="3" className="px-4 py-2 text-right text-xs text-orange-600 dark:text-orange-400">Acréscimo Global</td>
                                                                <td colSpan="2" className="px-4 py-2 text-right text-xs text-orange-600 dark:text-orange-400">+ {formatCurrency(resumo.valAcrescimoGlobal)}</td>
                                                            </tr>
                                                        )}
                                                        <tr className="border-t border-gray-200 dark:border-gray-700">
                                                            <td colSpan="3" className="px-4 py-3 text-right font-semibold text-text-light dark:text-text-dark">Total</td>
                                                            <td colSpan="2" className="px-4 py-3 text-right text-xl font-bold text-primary">
                                                                {formatCurrency(resumo.totalFinal)}
                                                            </td>
                                                        </tr>
                                                    </>
                                                );
                                            })()}
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                        {/* Seção de Pagamentos */}
                        {
                            (os.status === 'execucao' || os.status === 'finalizada' || (os.status === 'cancelada' && ((os.valorPago || 0) > 0 || (os.valorTotal || 0) > 0))) && (os.valorTotal || 0) > 0 && (
                                <div className={`card p-4 transition-all ${calcularPagamentos().restante <= 0
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 ring-1 ring-green-200 dark:ring-green-800'
                                    : ''
                                    }`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="font-semibold text-text-light dark:text-text-dark flex items-center gap-2">
                                            <span className={`material-symbols-outlined text-lg ${calcularPagamentos().restante <= 0 ? 'text-green-600' : ''}`}>payments</span>
                                            Pagamentos
                                            {calcularPagamentos().restante <= 0 && (
                                                <span className="material-symbols-outlined text-green-600 text-sm">verified</span>
                                            )}
                                        </p>
                                        {(() => {
                                            const { restante } = calcularPagamentos();
                                            return restante > 0 ? (
                                                <button
                                                    onClick={() => setShowPagamento(true)}
                                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-lg">add_circle</span>
                                                    Registrar
                                                </button>
                                            ) : (
                                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                                    QUITADO
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    {/* Lista de pagamentos */}
                                    {(() => {
                                        if (!os) return null;
                                        const { pagamentos, totalPago, restante } = calcularPagamentos();
                                        return (
                                            <>
                                                {pagamentos.length === 0 ? (
                                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center py-4">
                                                        Nenhum pagamento registrado
                                                    </p>
                                                ) : (
                                                    <div className="space-y-2 mb-3">
                                                        {pagamentos.map((pag) => (
                                                            <div key={pag.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                                                                <div>
                                                                    <p className="font-medium text-text-light dark:text-text-dark">
                                                                        {formatCurrency(pag.valor)}
                                                                    </p>
                                                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                                                        {pag.formaPagamento === 'dinheiro' && '💵 Dinheiro'}
                                                                        {pag.formaPagamento === 'pix' && '📱 PIX'}
                                                                        {pag.formaPagamento === 'cartao_credito' && '💳 Cartão Crédito'}
                                                                        {pag.formaPagamento === 'cartao_debito' && '💳 Cartão Débito'}
                                                                        {pag.formaPagamento === 'transferencia' && '🏦 Transferência'}
                                                                    </p>
                                                                </div>
                                                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                                                    {formatDateTime(pag.criadoEm)}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Resumo */}
                                                <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pt-3 space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Total da OS</span>
                                                        <span className="text-text-light dark:text-text-dark">{formatCurrency(os.valorTotal || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Pago</span>
                                                        <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(totalPago)}</span>
                                                    </div>
                                                    {restante > 0 && (
                                                        <div className="flex justify-between text-sm font-semibold">
                                                            <span className="text-text-light dark:text-text-dark">Restante</span>
                                                            <span className="text-orange-600 dark:text-orange-400">{formatCurrency(restante)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )
                        }

                        {/* Fotos */}
                        <div className="card p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="font-semibold text-text-light dark:text-text-dark">
                                    Fotos ({(os.fotos || []).length}/5)
                                </p>
                                {os.status !== 'finalizada' && os.status !== 'cancelada' && (os.fotos || []).length < 5 && (
                                    <label className="text-sm text-primary hover:underline flex items-center gap-1 cursor-pointer">
                                        <span className="material-symbols-outlined text-lg">add_a_photo</span>
                                        Adicionar
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={adicionarFoto}
                                        />
                                    </label>
                                )}
                            </div>

                            {(!os.fotos || os.fotos.length === 0) ? (
                                <div className="text-center py-6">
                                    <span className="material-symbols-outlined text-3xl text-gray-400 mb-2">photo_library</span>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                        Nenhuma foto adicionada
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {os.fotos.map((foto, index) => (
                                        <div key={foto.id} className="flex flex-col gap-1">
                                            <div
                                                onClick={() => setShowFotoModal(foto)}
                                                className="group aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer shadow-sm hover:shadow-lg transition-all duration-200 relative"
                                            >
                                                <img
                                                    src={foto.data}
                                                    alt={foto.nome}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                />
                                                {/* Overlay com ícone de expandir */}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity text-2xl drop-shadow-lg">zoom_in</span>
                                                </div>
                                            </div>
                                            {/* Descrição da foto */}
                                            {foto.descricao ? (
                                                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate px-1" title={foto.descricao}>
                                                    {foto.descricao}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
                                                    Foto {index + 1}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Meta */}
                        <div className="text-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            <p>Criada em {formatDateTime(os.criadoEm)}</p>
                            {os.atualizadoEm && <p>Última atualização: {formatDateTime(os.atualizadoEm)}</p>}
                        </div>

                        {/* Assinatura do Cliente */}
                        {
                            os.assinaturaCliente && (
                                <div className="card p-4 mt-4">
                                    <h3 className="font-semibold text-text-light dark:text-text-dark mb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pb-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">draw</span>
                                        Assinatura do Cliente
                                    </h3>
                                    <div className="flex justify-center bg-white rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                        <img
                                            src={os.assinaturaCliente}
                                            alt="Assinatura do Cliente"
                                            className="max-h-32 object-contain"
                                        />
                                    </div>
                                </div>
                            )
                        }
                    </div>
                </div>
            </div> {/* Fim do Scrollable Content */}

            {/* Footer Fixo - Sempre Visível */}
            <div className="p-3 bg-surface-light dark:bg-surface-dark border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] z-[5000] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex-none">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    {/* Resumo Financeiro - Totais por Tipo */}
                    <div className="flex items-center gap-4">
                        {(() => {
                            // Calcular totais por tipo
                            const totalProdutos = (form.itens || [])
                                .filter(item => item.tipo === 'produto' && !item.isento)
                                .reduce((acc, item) => acc + (item.total || 0), 0);

                            const totalServicos = (form.itens || [])
                                .filter(item => item.tipo === 'servico' && !item.isento)
                                .reduce((acc, item) => acc + (item.total || 0), 0);

                            return (
                                <>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm text-text-secondary-light dark:text-text-secondary-dark">inventory_2</span>
                                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Produtos:</span>
                                        <span className="text-sm font-semibold text-text-light dark:text-text-dark">
                                            {formatCurrency(totalProdutos)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm text-text-secondary-light dark:text-text-secondary-dark">build</span>
                                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Serviços:</span>
                                        <span className="text-sm font-semibold text-text-light dark:text-text-dark">
                                            {formatCurrency(totalServicos)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                                        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Total:</span>
                                        <span className="text-lg font-bold text-primary">
                                            {formatCurrency(os.valorTotal || 0)}
                                        </span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (isDirty) {
                                    setShowConfirmarSaida(true);
                                } else {
                                    // Modo aba ou janela usa onClose, rota usa navigate
                                    (isTabMode || isWindowMode) ? onClose?.() : navigate('/os');
                                }
                            }}
                            className="btn-secondary px-4"
                        >
                            <span className="material-symbols-outlined">close</span>
                            Cancelar
                        </button>
                        <button
                            onClick={() => salvarOS()}
                            className={`btn-primary px-6 ${isDirty && os.status !== 'finalizada' && os.status !== 'cancelada' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                            disabled={!isDirty || salvando || os.status === 'finalizada' || os.status === 'cancelada'}
                        >
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
                </div>
            </div>

            <div className="h-0"></div>

            {/* Modal Confirmar Saída (quando há alterações não salvas) */}
            {
                showConfirmarSaida && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <div className="card p-6 w-full max-w-md animate-slideUp">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl text-amber-600">warning</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
                                        Alterações não salvas
                                    </h2>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                        O que deseja fazer?
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* Salvar e Sair */}
                                <button
                                    onClick={async () => {
                                        await salvarOS();
                                        setShowConfirmarSaida(false);
                                        (isTabMode || isWindowMode) ? onClose?.() : navigate('/os');
                                    }}
                                    className="w-full btn-primary bg-green-600 hover:bg-green-700 justify-start"
                                    disabled={salvando}
                                >
                                    <span className="material-symbols-outlined">save</span>
                                    Salvar e sair
                                </button>

                                {/* Minimizar (só em Window Mode) */}
                                {isWindowMode && onMinimize && (
                                    <button
                                        onClick={() => {
                                            setShowConfirmarSaida(false);
                                            onMinimize();
                                        }}
                                        className="w-full btn-secondary justify-start"
                                    >
                                        <span className="material-symbols-outlined">remove</span>
                                        Minimizar (manter no Dock)
                                    </button>
                                )}

                                {/* Descartar */}
                                <button
                                    onClick={async () => {
                                        await carregarDados(true); // Recarrega dados originais
                                        setIsDirty(false);
                                        setShowConfirmarSaida(false);
                                        (isTabMode || isWindowMode) ? onClose?.() : navigate('/os');
                                    }}
                                    className="w-full btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 justify-start"
                                >
                                    <span className="material-symbols-outlined">undo</span>
                                    Descartar alterações
                                </button>

                                {/* Cancelar */}
                                <button
                                    onClick={() => setShowConfirmarSaida(false)}
                                    className="w-full text-center text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark py-2"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Adicionar Item */}
            {
                showAddItem && (
                    <AddItemModal
                        produtos={produtos}
                        onClose={() => {
                            setShowAddItem(false);
                            setAddItemValues(null);
                        }}
                        onAdd={adicionarItem}
                        configuracoes={configuracoes}
                        initialValues={addItemValues}
                    />
                )
            }

            {/* Modal Importar Kit */}
            {
                showImportarKit && (
                    <ImportarKitModal
                        empresaId={empresa.id}
                        onClose={() => setShowImportarKit(false)}
                        onImport={adicionarItensEmLote}
                    />
                )
            }

            {/* Modal Editar Item */}
            {
                itemEditando && (
                    <EditItemModal
                        item={itemEditando}
                        onClose={() => setItemEditando(null)}
                        onSave={salvarEdicaoItem}
                        configuracoes={configuracoes}
                    />
                )
            }

            {/* Modal Checklist */}
            {
                showChecklist && (
                    <ChecklistModal
                        checklist={os.checklist || []}
                        onClose={() => setShowChecklist(false)}
                        onSave={salvarChecklist}
                    />
                )
            }

            {/* Modal Atribuir Técnico */}
            {
                showAtribuirTecnico && (
                    <AtribuirTecnicoModal
                        tecnicos={tecnicos}
                        tecnicoAtualId={os.tecnicoId}
                        onClose={() => {
                            setShowAtribuirTecnico(false);
                            setAtribuirParaIniciarExecucao(false); // Limpa flag se fechou sem selecionar
                        }}
                        onSelect={atribuirTecnico}
                    />
                )
            }

            {/* Modal Confirmar Finalização */}
            {
                showFinalizarModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <div className="card p-6 w-full max-w-md animate-slideUp">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-3xl text-green-600 dark:text-green-400">check_circle</span>
                                </div>
                                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                                    Finalizar Ordem de Serviço
                                </h3>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
                                    Confirme a finalização da OS. O estoque será baixado automaticamente.
                                </p>
                            </div>

                            {(!os.itens || os.itens.length === 0) && (
                                <div className="mb-4 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined">warning</span>
                                    Esta OS não possui itens.
                                </div>
                            )}

                            {veiculo && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                                        Atualizar KM do veículo (opcional)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={kmAtualizado}
                                            onChange={(e) => setKmAtualizado(e.target.value)}
                                            className="input-field flex-1"
                                            placeholder={`KM atual: ${veiculo.km || 'Não informado'}`}
                                        />
                                        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">km</span>
                                    </div>
                                </div>
                            )}

                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary-light dark:text-text-secondary-dark">Valor Total</span>
                                    <span className="font-bold text-text-light dark:text-text-dark">{formatCurrency(os.valorTotal || 0)}</span>
                                </div>
                                {(os.itens || []).filter(i => i.tipo === 'produto').length > 0 && (
                                    <div className="flex justify-between text-sm mt-2">
                                        <span className="text-text-secondary-light dark:text-text-secondary-dark">Peças a baixar</span>
                                        <span className="font-medium text-orange-600 dark:text-orange-400">
                                            {(os.itens || []).filter(i => i.tipo === 'produto').length} item(ns)
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowFinalizarModal(false)}
                                    className="btn-secondary flex-1"
                                    disabled={salvando}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmarFinalizacao}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-all"
                                    disabled={salvando}
                                >
                                    {salvando ? (
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                    ) : (
                                        <span className="material-symbols-outlined">check</span>
                                    )}
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Confirmar Cancelamento */}
            {
                showCancelarModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <div className="card p-6 w-full max-w-md animate-slideUp">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">cancel</span>
                                </div>
                                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                                    Cancelar Ordem de Serviço
                                </h3>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
                                    {os.status === 'finalizada'
                                        ? 'Esta OS está finalizada. Ao cancelar, as peças serão estornadas ao estoque.'
                                        : 'Informe o motivo do cancelamento (opcional).'
                                    }
                                </p>
                            </div>

                            {os.status === 'finalizada' && (os.itens || []).filter(i => i.tipo === 'produto').length > 0 && (
                                <div className="mb-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-xl shrink-0">inventory</span>
                                        <div>
                                            <p className="font-bold text-orange-800 dark:text-orange-300 mb-1">Estorno de Estoque</p>
                                            <p className="text-sm text-orange-700 dark:text-orange-400">
                                                {(os.itens || []).filter(i => i.tipo === 'produto').length} peça(s) serão devolvidas ao estoque automaticamente.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Alerta Financeiro - Mostra para QUALQUER OS com valor pago (sinal ou pagamento total) */}
                            {(os.valorPago || 0) > 0 && (
                                <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl shrink-0">payments</span>
                                        <div>
                                            <p className="font-bold text-blue-800 dark:text-blue-300 mb-1">Impacto Financeiro</p>
                                            <p className="text-sm text-blue-700 dark:text-blue-400">
                                                Esta OS possui R$ {(os.valorPago || 0).toFixed(2).replace('.', ',')} já pago.
                                                Os valores <strong>NÃO</strong> serão estornados automaticamente.
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
                                    className="input-field w-full"
                                    rows={3}
                                    placeholder="Descreva o motivo..."
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCancelarModal(false)}
                                    className="btn-secondary flex-1"
                                    disabled={salvando}
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={confirmarCancelamento}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-error text-white font-medium rounded-xl hover:bg-red-600 transition-all"
                                    disabled={salvando}
                                >
                                    {salvando ? (
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                    ) : (
                                        <span className="material-symbols-outlined">cancel</span>
                                    )}
                                    Cancelar OS
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Confirmar Reabertura */}
            {
                showReabrirModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <div className="card p-6 w-full max-w-md animate-slideUp">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 mx-auto mb-4 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-3xl text-orange-600 dark:text-orange-400">lock_open</span>
                                </div>
                                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                                    Reabrir Ordem de Serviço
                                </h3>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
                                    Ao reabrir esta OS, as peças utilizadas serão devolvidas ao estoque.
                                </p>
                            </div>

                            {/* Alerta de Estorno de Estoque */}
                            {(os.itens || []).filter(i => i.tipo === 'produto').length > 0 && (
                                <div className="mb-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-xl shrink-0">inventory</span>
                                        <div>
                                            <p className="font-bold text-orange-800 dark:text-orange-300 mb-1">Estorno de Estoque</p>
                                            <p className="text-sm text-orange-700 dark:text-orange-400">
                                                {(os.itens || []).filter(i => i.tipo === 'produto').length} peça(s) serão devolvidas ao estoque automaticamente.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Alerta Financeiro */}
                            {(os.valorPago || 0) > 0 && (
                                <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl shrink-0">payments</span>
                                        <div>
                                            <p className="font-bold text-blue-800 dark:text-blue-300 mb-1">Atenção: Pagamentos</p>
                                            <p className="text-sm text-blue-700 dark:text-blue-400">
                                                Esta OS possui R$ {(os.valorPago || 0).toFixed(2).replace('.', ',')} já pago.
                                                Os valores permanecem registrados.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowReabrirModal(false)}
                                    className="btn-secondary flex-1"
                                    disabled={salvando}
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={confirmarReabertura}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 transition-all"
                                    disabled={salvando}
                                >
                                    {salvando ? (
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                    ) : (
                                        <span className="material-symbols-outlined">lock_open</span>
                                    )}
                                    Reabrir OS
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Visualizar Foto */}
            {
                showFotoModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
                        <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col bg-gray-900 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setShowFotoModal(null)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 z-10"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                            {os.status !== 'finalizada' && os.status !== 'cancelada' && (
                                <button
                                    onClick={() => removerFoto(showFotoModal.id)}
                                    className="absolute top-4 left-4 p-2 rounded-full bg-error/80 text-white hover:bg-error z-10"
                                    title="Excluir foto"
                                >
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                            )}

                            {/* Container com Scroll */}
                            <div className="flex-1 overflow-y-auto flex flex-col">
                                {/* Imagem */}
                                <div className="flex-shrink-0 p-4">
                                    <img
                                        src={showFotoModal.data}
                                        alt={showFotoModal.nome}
                                        className="w-full max-h-[60vh] object-contain rounded-lg"
                                    />
                                </div>

                                {/* Campo de Descrição */}
                                <div className="flex-shrink-0 bg-white dark:bg-gray-800 p-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Descrição da Foto (opcional):
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Ex: porta dianteira, vazamento motor, painel..."
                                            value={showFotoModal.descricao || ''}
                                            onChange={async (e) => {
                                                const novaDescricao = e.target.value;

                                                // Atualiza o estado local do modal
                                                setShowFotoModal(prev => ({ ...prev, descricao: novaDescricao }));

                                                // Remove o ícone de confirmação anterior
                                                setDescricaoSalva(false);

                                                // Atualiza a foto na lista
                                                const novasFotos = (os.fotos || []).map(f =>
                                                    f.id === showFotoModal.id
                                                        ? { ...f, descricao: novaDescricao }
                                                        : f
                                                );

                                                // Salva automaticamente
                                                await salvarOS({ fotos: novasFotos });

                                                // Mostra feedback de salvamento
                                                setDescricaoSalva(true);

                                                // Remove feedback após 2 segundos
                                                setTimeout(() => setDescricaoSalva(false), 2000);
                                            }}
                                            className="input-field w-full pr-10"
                                            disabled={os.status === 'finalizada' || os.status === 'cancelada'}
                                        />
                                        {/* Ícone de confirmação */}
                                        {descricaoSalva && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-600 dark:text-green-400">
                                                <span className="material-symbols-outlined text-lg">check_circle</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Registrar Pagamento */}
            {
                showPagamento && (
                    <PagamentoModal
                        valorRestante={calcularPagamentos().restante}
                        onClose={() => setShowPagamento(false)}
                        onSubmit={registrarPagamento}
                    />
                )
            }

            {/* Modal de Assinatura */}
            {
                showAssinatura && (
                    <AssinaturaCanvas
                        onConfirm={handleSalvarAssinatura}
                        onClose={() => setShowAssinatura(false)}
                    />
                )
            }
            {/* Modal PIX */}
            {
                showPix && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="card p-6 w-full max-w-md animate-scaleIn relative">
                            <button
                                onClick={() => setShowPix(false)}
                                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-text-secondary-light dark:text-text-secondary-dark"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            <div className="text-center mb-6">
                                <h3 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-2xl">pix</span>
                                    Pagar com PIX
                                </h3>
                                <p className="text-2xl font-bold text-primary mt-2">
                                    {formatCurrency((os.valorTotal || 0) - (os.valorPago || 0))}
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
                                    <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1 uppercase tracking-wider text-center">
                                        Código Copia e Cola
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={pixPayload}
                                            className="input text-xs w-full bg-gray-50 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark"
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

                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Sucesso ao Finalizar */}
            {
                showFinalizadoSuccess && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="card p-8 w-full max-w-sm animate-scaleIn text-center relative">
                            <button
                                onClick={() => setShowFinalizadoSuccess(false)}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-6 flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400">check_circle</span>
                            </div>

                            <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
                                OS Finalizada!
                            </h3>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark mb-6">
                                O estoque foi atualizado e a comissão registrada. Deseja avisar o cliente?
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleEnviarWhatsApp('conclusao')}
                                    className="btn-primary w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] border-[#25D366] text-white"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    Enviar Aviso no WhatsApp
                                </button>
                                <button
                                    onClick={() => setShowFinalizadoSuccess(false)}
                                    className="btn-secondary w-full"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

// Modal para registrar pagamento
const PagamentoModal = ({ valorRestante, onClose, onSubmit }) => {
    const [valor, setValor] = useState(valorRestante);
    const [formaPagamento, setFormaPagamento] = useState('pix');
    const [observacao, setObservacao] = useState('');

    const formasPagamento = [
        { value: 'pix', label: 'PIX', icon: 'qr_code_2' },
        { value: 'dinheiro', label: 'Dinheiro', icon: 'payments' },
        { value: 'cartao_credito', label: 'Crédito', icon: 'credit_card' },
        { value: 'cartao_debito', label: 'Débito', icon: 'local_atm' },
        { value: 'transferencia', label: 'Transf.', icon: 'account_balance' },
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (valor <= 0 || valor > valorRestante) return;
        onSubmit({
            valor,
            formaPagamento,
            observacao,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                        Registrar Pagamento
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Valor */}
                    <CurrencyInput
                        label="Valor R$"
                        value={valor}
                        onChange={setValor}
                        max={valorRestante}
                        hint={`Saldo restante: ${formatCurrency(valorRestante)}`}
                        size="lg"
                        required
                        autoFocus
                    />

                    {/* Forma de Pagamento */}
                    <div>
                        <label className="text-sm font-medium text-text-light dark:text-text-dark mb-2 block">
                            Forma de Pagamento
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {formasPagamento.map((fp) => (
                                <button
                                    key={fp.value}
                                    type="button"
                                    onClick={() => setFormaPagamento(fp.value)}
                                    className={`
                                            p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-200
                                            ${formaPagamento === fp.value
                                            ? 'border-primary bg-primary/10 text-primary shadow-sm scale-105'
                                            : 'border-transparent bg-gray-50 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }
                                        `}
                                >
                                    <span className="material-symbols-outlined text-2xl">{fp.icon}</span>
                                    <span className="font-medium text-xs">{fp.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Observação */}
                    <div>
                        <label className="text-sm font-medium text-text-light dark:text-text-dark mb-1 block">
                            Observação (opcional)
                        </label>
                        <input
                            type="text"
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            className="input"
                            placeholder="Ex: parcela 1/3"
                        />
                    </div>

                    {/* Botões */}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-primary flex-1"
                            disabled={valor <= 0 || valor > valorRestante}
                        >
                            <span className="material-symbols-outlined">check</span>
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Modal para adicionar item
const AddItemModal = ({ produtos, onClose, onAdd, initialValues, configuracoes }) => {
    const [tipo, setTipo] = useState(initialValues?.tipo || 'produto');
    const [produtoId, setProdutoId] = useState('');
    const [quantidade, setQuantidade] = useState(initialValues?.quantidade || 1);
    const [unidade, setUnidade] = useState('');
    const [precoUnitario, setPrecoUnitario] = useState(0);
    const [showTemplates, setShowTemplates] = useState(true);
    const [busca, setBusca] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const searchInputRef = useRef(null);

    // Novos estados para precificação avançada
    const [descontoTipo, setDescontoTipo] = useState('valor'); // 'valor' ou 'porcentagem'
    const [descontoValor, setDescontoValor] = useState('');

    const [acrescimoTipo, setAcrescimoTipo] = useState('valor'); // 'valor' ou 'porcentagem'
    const [acrescimoValor, setAcrescimoValor] = useState('');

    // Safe toggles with defaults
    const showDescontos = configuracoes?.descontoNosItens !== false && configuracoes?.descontoNosItens !== 'false'; // Default TRUE
    const showAcrescimos = configuracoes?.acrescimoNosItens === true || configuracoes?.acrescimoNosItens === 'true'; // Default FALSE

    const produtosFiltrados = produtos.filter((p) => {
        if (p.tipo !== tipo) return false;
        if (!busca) return true;

        const termos = normalizeString(busca).split(' ').filter(t => t.length > 0);
        return termos.every(termo =>
            normalizeString(p.nome).includes(termo) ||
            normalizeString(p.codigoBarras).includes(termo) ||
            normalizeString(p.marca).includes(termo) ||
            normalizeString(p.aplicacao).includes(termo)
        );
    });
    const servicosRapidos = produtos.filter((p) => p.tipo === 'servico' && p.servicoRapido);
    const [showTimeModal, setShowTimeModal] = useState(false);

    // Cálculos em tempo real
    const qtd = parseFloat(quantidade) || 0;
    const preco = precoUnitario || 0;
    const totalBruto = qtd * preco;

    let valDesconto = 0;
    if (descontoValor) {
        if (descontoTipo === 'valor') valDesconto = parseFloat(descontoValor) || 0;
        else valDesconto = totalBruto * ((parseFloat(descontoValor) || 0) / 100);
    }

    let valAcrescimo = 0;
    if (acrescimoValor) {
        if (acrescimoTipo === 'valor') valAcrescimo = parseFloat(acrescimoValor) || 0;
        else valAcrescimo = totalBruto * ((parseFloat(acrescimoValor) || 0) / 100);
    }

    const totalLiquido = Math.max(0, totalBruto - valDesconto + valAcrescimo);

    const handleProdutoChange = (id) => {
        setProdutoId(id);
        const prod = produtos.find((p) => p.id === id);
        if (prod) {
            setPrecoUnitario(prod.precoVenda);
            // Legado: Se for SV, força UN. Se não tiver, UN.
            const unit = (!prod.unidade || prod.unidade === 'SV') ? 'UN' : prod.unidade;
            setUnidade(unit);
            // Resetar descontos/acréscimos ao trocar produto
            setDescontoValor('');
            setAcrescimoValor('');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const prod = produtos.find((p) => p.id === produtoId);
        if (!prod) return;

        onAdd({
            produtoId,
            nome: prod.nome,
            tipo: prod.tipo,
            unidade: unidade || 'UN',
            quantidade: qtd,
            precoUnitario: preco,
            // Novos campos
            valorBruto: totalBruto,
            descontoTipo,
            descontoValor: parseFloat(descontoValor) || 0,
            valDesconto, // Valor calculado em R$
            acrescimoTipo,
            acrescimoValor: parseFloat(acrescimoValor) || 0,
            valAcrescimo, // Valor calculado em R$
            total: totalLiquido // Total líquido final
        });

        // Limpar campos e manter foco para próxima inserção
        setBusca('');
        setProdutoId('');
        setPrecoUnitario(0);
        setUnidade('');
        setQuantidade(1);
        setDescontoValor('');
        setAcrescimoValor('');
        searchInputRef.current?.focus();
    };

    // Auto-selecionar se encontrar código de barras exato
    useEffect(() => {
        if (!busca) return;
        const termo = busca.toLowerCase().trim();
        const matchExato = produtos.find(p =>
            p.tipo === tipo &&
            p.codigoBarras &&
            p.codigoBarras.toLowerCase().trim() === termo
        );

        if (matchExato) {
            handleProdutoChange(matchExato.id);
        }
    }, [busca, produtos, tipo]);

    // Adicionar serviço cadastrado rápido
    const adicionarServicoRapido = (servico) => {
        onAdd({
            produtoId: servico.id,
            nome: servico.nome,
            tipo: 'servico',
            // Legado: Se for SV, força UN
            unidade: (!servico.unidade || servico.unidade === 'SV') ? 'UN' : servico.unidade,
            quantidade: 1,
            precoUnitario: servico.precoVenda,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                        Adicionar Item
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Serviços Rápidos - apenas os marcados */}
                {showTemplates && servicosRapidos.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-text-light dark:text-text-dark flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg text-primary">bolt</span>
                                Serviços Rápidos
                            </p>
                            <button
                                onClick={() => setShowTemplates(false)}
                                className="text-xs text-text-secondary-light dark:text-text-secondary-dark hover:text-primary"
                            >
                                Ocultar
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {servicosRapidos.map((servico) => (
                                <button
                                    key={servico.id}
                                    type="button"
                                    onClick={() => adicionarServicoRapido(servico)}
                                    className="px-3 py-1.5 rounded-full bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[16px]">build</span>
                                    <span>{servico.nome}</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-3 pt-3 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                Ou selecione manualmente abaixo:
                            </p>
                        </div>
                    </div>
                )}

                {!showTemplates && (
                    <button
                        onClick={() => setShowTemplates(true)}
                        className="w-full mb-4 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">bolt</span>
                        Mostrar Serviços Rápidos
                    </button>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Segmented Control: Produto vs Serviço */}
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <button
                            type="button"
                            onClick={() => {
                                setTipo('produto');
                                setProdutoId('');
                                setBusca('');
                                setUnidade('UN');
                                setPrecoUnitario(0);
                                setQuantidade(1);
                                setDescontoValor('');
                                setAcrescimoValor('');
                            }}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${tipo === 'produto'
                                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">inventory_2</span>
                            Produto
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setTipo('servico');
                                setProdutoId('');
                                setBusca('');
                                setUnidade('UN');
                                setPrecoUnitario(0);
                                setQuantidade(1);
                                setDescontoValor('');
                                setAcrescimoValor('');
                            }}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${tipo === 'servico'
                                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">handyman</span>
                            Serviço
                        </button>
                    </div>

                    {/* Busca por Nome ou Código de Barras (Combobox) */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Buscar Item
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                <span className="material-symbols-outlined">search</span>
                            </span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={busca}
                                onChange={(e) => { setBusca(e.target.value); setShowDropdown(true); }}
                                onFocus={() => setShowDropdown(true)}
                                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                className="input pl-10"
                                placeholder="Nome, código, marca ou aplicação..."
                                autoFocus
                            />
                        </div>

                        {/* Dropdown de Resultados (Combobox) */}
                        {showDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {produtosFiltrados.length === 0 ? (
                                    <div className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark text-sm">
                                        Nenhum item encontrado.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {produtosFiltrados.map((p) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => { handleProdutoChange(p.id); setShowDropdown(false); setBusca(p.nome); }}
                                                className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between ${produtoId === p.id ? 'bg-primary/5 dark:bg-primary/20 border-l-4 border-l-primary' : ''
                                                    }`}
                                            >
                                                <div>
                                                    <p className="font-medium text-text-light dark:text-text-dark text-sm">
                                                        {toTitleCase(p.nome)}
                                                    </p>
                                                    {(p.marca || p.aplicacao) && (
                                                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
                                                            {[toTitleCase(p.marca), toTitleCase(p.aplicacao)].filter(Boolean).join(' • ')}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-primary">
                                                        {formatCurrency(p.precoVenda)}
                                                    </p>
                                                    {p.tipo === 'produto' && (
                                                        <p className={`text-[10px] font-medium mt-0.5 ${(p.quantidade || 0) > 0
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-red-500'
                                                            }`}>
                                                            Estoque: {p.quantidade || 0}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>



                    <div className="grid grid-cols-12 gap-4">
                        {/* Quantidade */}
                        <div className="col-span-3">
                            <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">
                                Qtd
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={quantidade}
                                    onChange={(e) => setQuantidade(e.target.value)}
                                    className="input pr-8" // Padding right for icon
                                    min="0.1"
                                    step="any"
                                    required
                                />
                                {tipo === 'servico' && (
                                    <button
                                        type="button"
                                        onClick={() => setShowTimeModal(true)}
                                        className="absolute right-1 top-1 p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                        title="Converter Horas em Decimal"
                                    >
                                        <span className="material-symbols-outlined text-sm">schedule</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Unidade */}
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">
                                Unidade
                            </label>
                            <input
                                type="text"
                                value={unidade}
                                readOnly
                                className="input bg-gray-50 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark cursor-not-allowed text-center px-1"
                                placeholder="UN"
                            />
                        </div>

                        {/* Preço Unitário */}
                        <div className="col-span-3">
                            <CurrencyInput
                                label="Preço R$"
                                value={precoUnitario}
                                onChange={setPrecoUnitario}
                                labelClassName="text-xs"
                                className="!p-3 !text-sm"
                                required
                            />
                        </div>

                        {/* Total Bruto (Read Only) */}
                        <div className="col-span-4">
                            <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                                Total Bruto
                            </label>
                            <div className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-text-secondary-light dark:text-text-secondary-dark font-medium text-sm cursor-not-allowed">
                                {formatCurrency(totalBruto)}
                            </div>
                        </div>

                        {/* Modificadores Financeiros */}
                        {(showDescontos || showAcrescimos) && (
                            <div className="col-span-12 grid grid-cols-2 gap-4 pt-2">
                                {showDescontos && (
                                    <div>
                                        <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                                            Desconto
                                        </label>
                                        <div className="flex rounded-lg shadow-sm">
                                            <input
                                                type="number"
                                                value={descontoValor}
                                                onChange={(e) => setDescontoValor(e.target.value)}
                                                className="input rounded-r-none w-full min-w-0 text-sm"
                                                placeholder="0,00"
                                                min="0"
                                                step="0.01"
                                            />
                                            <select
                                                value={descontoTipo}
                                                onChange={(e) => setDescontoTipo(e.target.value)}
                                                className="bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-l-none px-2 focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600 cursor-pointer w-14"
                                            >
                                                <option value="valor">R$</option>
                                                <option value="porcentagem">%</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                                {showAcrescimos && (
                                    <div>
                                        <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                                            Acréscimo
                                        </label>
                                        <div className="flex rounded-lg shadow-sm">
                                            <input
                                                type="number"
                                                value={acrescimoValor}
                                                onChange={(e) => setAcrescimoValor(e.target.value)}
                                                className="input rounded-r-none w-full min-w-0 text-sm"
                                                placeholder="0,00"
                                                min="0"
                                                step="0.01"
                                            />
                                            <select
                                                value={acrescimoTipo}
                                                onChange={(e) => setAcrescimoTipo(e.target.value)}
                                                className="bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-l-none px-2 focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600 cursor-pointer w-14"
                                            >
                                                <option value="valor">R$</option>
                                                <option value="porcentagem">%</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer: Total Liquido */}
                    <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            <p>Subtotal: {formatCurrency(totalBruto)}</p>
                            {valDesconto > 0 && <p className="text-green-600">Desconto: -{formatCurrency(valDesconto)}</p>}
                            {valAcrescimo > 0 && <p className="text-orange-600">Acréscimo: +{formatCurrency(valAcrescimo)}</p>}
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider font-bold">Total Líquido</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(totalLiquido)}</p>
                        </div>
                    </div>



                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary flex-1" disabled={!produtoId}>
                            <span className="material-symbols-outlined">add</span>
                            Adicionar
                        </button>
                    </div>
                </form>
                {showTimeModal && (
                    <TimeConversionModal
                        onClose={() => setShowTimeModal(false)}
                        onApply={(val) => setQuantidade(val)}
                        initialValue={quantidade}
                    />
                )}
            </div>
        </div>
    );
};

// Modal de Checklist
const ChecklistModal = ({ checklist, onClose, onSave }) => {
    const [items, setItems] = useState(
        checklist.length > 0
            ? checklist
            : [
                { item: 'Nível de óleo', ok: null },
                { item: 'Nível de água', ok: null },
                { item: 'Pneus', ok: null },
                { item: 'Freios', ok: null },
                { item: 'Faróis', ok: null },
                { item: 'Limpador de para-brisa', ok: null },
            ]
    );

    const toggleItem = (index, value) => {
        const novos = [...items];
        novos[index].ok = value;
        setItems(novos);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Checklist</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-3 mb-6">
                    {items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                            <span className="text-text-light dark:text-text-dark">{item.item}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleItem(index, true)}
                                    className={`p-2 rounded-lg transition-colors ${item.ok === true
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-green-100'
                                        }`}
                                    title="OK"
                                >
                                    <span className="material-symbols-outlined text-lg">check</span>
                                </button>
                                <button
                                    onClick={() => toggleItem(index, false)}
                                    className={`p-2 rounded-lg transition-colors ${item.ok === false
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-red-100'
                                        }`}
                                    title="Problema"
                                >
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                    <button onClick={() => onSave(items)} className="btn-primary flex-1">
                        <span className="material-symbols-outlined">save</span>
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};


// Modal de Conversão de Horário (Novo)
const TimeConversionModal = ({ onClose, onApply, initialValue }) => {
    // Função auxiliar para inicializar horas (evita race condition)
    const getInitialHoras = () => {
        if (!initialValue) return '00:00';
        const valStr = String(initialValue).replace(',', '.');
        if (isNaN(valStr)) return '00:00';

        const dec = parseFloat(valStr);
        const h = Math.floor(dec);
        const m = Math.round((dec - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const [horas, setHoras] = useState(getInitialHoras);
    const [decimal, setDecimal] = useState('');

    useEffect(() => {
        if (horas) {
            const [h, m] = horas.split(':').map(Number);
            const val = h + (m / 60);
            setDecimal(val.toFixed(3)); // 3 casas decimais
        }
    }, [horas]);

    const handleApply = () => {
        onApply(decimal);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-sm animate-scaleIn">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Conversão de Horário</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">
                                Tempo (HH:MM)
                            </label>
                            <input
                                type="time"
                                value={horas}
                                onChange={(e) => setHoras(e.target.value)}
                                className="input text-center font-mono text-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">
                                Qtde Decimal
                            </label>
                            <input
                                type="text"
                                value={decimal}
                                readOnly
                                className="input bg-gray-50 dark:bg-gray-800 text-right font-mono text-lg"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button onClick={handleApply} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">check</span>
                            Aplicar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Modal para editar item (Editado para incluir conversão)
const EditItemModal = ({ item, onClose, onSave, configuracoes }) => {
    const [nome, setNome] = useState(item.nome);
    const [quantidade, setQuantidade] = useState(item.quantidade);
    const [unidade, setUnidade] = useState(item.unidade || 'UN'); // Nova state
    const [precoUnitario, setPrecoUnitario] = useState(item.precoUnitario);
    const [showTimeModal, setShowTimeModal] = useState(false);

    // Novos estados
    const [descontoTipo, setDescontoTipo] = useState(item.descontoTipo || 'valor');
    const [descontoValor, setDescontoValor] = useState(item.descontoValor || '');
    const [acrescimoTipo, setAcrescimoTipo] = useState(item.acrescimoTipo || 'valor');
    const [acrescimoValor, setAcrescimoValor] = useState(item.acrescimoValor || '');

    // Safe toggles with defaults
    const showDescontos = configuracoes?.descontoNosItens !== false && configuracoes?.descontoNosItens !== 'false'; // Default TRUE
    const showAcrescimos = configuracoes?.acrescimoNosItens === true || configuracoes?.acrescimoNosItens === 'true'; // Default FALSE

    // Cálculos em tempo real
    const qtd = parseFloat(quantidade) || 0;
    const preco = precoUnitario || 0;
    const totalBruto = qtd * preco;

    let valDesconto = 0;
    if (descontoValor) {
        if (descontoTipo === 'valor') valDesconto = parseFloat(descontoValor) || 0;
        else valDesconto = totalBruto * ((parseFloat(descontoValor) || 0) / 100);
    }

    let valAcrescimo = 0;
    if (acrescimoValor) {
        if (acrescimoTipo === 'valor') valAcrescimo = parseFloat(acrescimoValor) || 0;
        else valAcrescimo = totalBruto * ((parseFloat(acrescimoValor) || 0) / 100);
    }

    const totalLiquido = Math.max(0, totalBruto - valDesconto + valAcrescimo);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...item,
            nome,
            quantidade: qtd,
            unidade: unidade || 'UN',
            precoUnitario: preco,
            // Detalhes de preço
            valorBruto: totalBruto,
            descontoTipo,
            descontoValor: parseFloat(descontoValor) || 0,
            valDesconto,
            acrescimoTipo,
            acrescimoValor: parseFloat(acrescimoValor) || 0,
            valAcrescimo,
            total: totalLiquido
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md animate-slideUp relative">
                {showTimeModal && (
                    <TimeConversionModal
                        onClose={() => setShowTimeModal(false)}
                        onApply={(val) => setQuantidade(val)}
                        initialValue={quantidade}
                    />
                )}

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                        Editar Item
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Nome do Item
                        </label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="input"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-[1.5fr_1fr_1.5fr] gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Quantidade
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={quantidade}
                                    onChange={(e) => setQuantidade(e.target.value)}
                                    className="input"
                                    min="0.001"
                                    step="any"
                                    required
                                />
                                {item.tipo === 'servico' && (
                                    <button
                                        type="button"
                                        onClick={() => setShowTimeModal(true)}
                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                                        title="Converter Horas em Decimal"
                                    >
                                        <span className="material-symbols-outlined">schedule</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Unidade
                            </label>
                            <input
                                type="text"
                                value={unidade}
                                onChange={(e) => setUnidade(e.target.value.toUpperCase())}
                                className="input uppercase"
                                maxLength={3}
                                placeholder="UN"
                            />
                        </div>
                        <div>
                            <CurrencyInput
                                label="Preço R$"
                                value={precoUnitario}
                                onChange={setPrecoUnitario}
                                required
                            />
                        </div>
                    </div>

                    {/* Discount and Surcharge Section */}
                    {(showDescontos || showAcrescimos) && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                            {showDescontos && (
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                                        Desconto
                                    </label>
                                    <div className="flex rounded-lg shadow-sm">
                                        <input
                                            type="number"
                                            value={descontoValor}
                                            onChange={(e) => setDescontoValor(e.target.value)}
                                            className="input rounded-r-none w-full min-w-0"
                                            placeholder="0,00"
                                            min="0"
                                            step="0.01"
                                        />
                                        <select
                                            value={descontoTipo}
                                            onChange={(e) => setDescontoTipo(e.target.value)}
                                            className="bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-l-none px-2 focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600 cursor-pointer"
                                        >
                                            <option value="valor">R$</option>
                                            <option value="porcentagem">%</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                            {showAcrescimos && (
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                                        Acréscimo
                                    </label>
                                    <div className="flex rounded-lg shadow-sm">
                                        <input
                                            type="number"
                                            value={acrescimoValor}
                                            onChange={(e) => setAcrescimoValor(e.target.value)}
                                            className="input rounded-r-none w-full min-w-0"
                                            placeholder="0,00"
                                            min="0"
                                            step="0.01"
                                        />
                                        <select
                                            value={acrescimoTipo}
                                            onChange={(e) => setAcrescimoTipo(e.target.value)}
                                            className="bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-l-none px-2 focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600 cursor-pointer"
                                        >
                                            <option value="valor">R$</option>
                                            <option value="porcentagem">%</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            <span>Subtotal</span>
                            <span>{formatCurrency(totalBruto)}</span>
                        </div>
                        {valDesconto > 0 && (
                            <div className="flex justify-between items-center text-xs text-green-600 dark:text-green-400">
                                <span>Desconto</span>
                                <span>- {formatCurrency(valDesconto)}</span>
                            </div>
                        )}
                        {valAcrescimo > 0 && (
                            <div className="flex justify-between items-center text-xs text-orange-600 dark:text-orange-400">
                                <span>Acréscimo</span>
                                <span>+ {formatCurrency(valAcrescimo)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-text-light dark:text-text-dark">Total Líquido</span>
                            <span className="text-lg font-bold text-primary">
                                {formatCurrency(totalLiquido)}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary flex-1">
                            <span className="material-symbols-outlined">save</span>
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Modal Importar Kit
const ImportarKitModal = ({ empresaId, onClose, onImport }) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedKit, setExpandedKit] = useState(null); // ID do kit expandido

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const data = await storage.getAll('osprimex_templates', empresaId) || [];
                setTemplates(data);
            } catch (error) {
                console.error('Erro ao carregar templates:', error);
            } finally {
                setLoading(false);
            }
        };
        loadTemplates();
    }, [empresaId]);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Tem certeza que deseja excluir este kit?')) return;

        try {
            await storage.hardDelete('osprimex_templates', id);
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Erro ao excluir template:', error);
            alert('Erro ao excluir template');
        }
    };

    const calcularTotal = (itens) => {
        return itens.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                        Importar Kit / Modelo
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center p-8 text-text-secondary-light dark:text-text-secondary-dark">
                        <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                        <p>Nenhum kit salvo encontrado.</p>
                        <p className="text-xs mt-2">Salve itens de uma OS como kit para reutilizar.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {templates.map((template) => {
                            const total = calcularTotal(template.itens);
                            const isExpanded = expandedKit === template.id;

                            return (
                                <div
                                    key={template.id}
                                    className={`
                                        group rounded-xl border border-gray-200 dark:border-gray-700 
                                        hover:border-primary dark:hover:border-primary transition-all overflow-hidden
                                        ${isExpanded ? 'bg-primary/5 ring-1 ring-primary' : ''}
                                    `}
                                >
                                    {/* Header do Card - Clicável para expandir */}
                                    <div
                                        onClick={() => setExpandedKit(isExpanded ? null : template.id)}
                                        className="p-4 flex items-center justify-between cursor-pointer"
                                    >
                                        <div>
                                            <h3 className="font-bold text-text-light dark:text-text-dark group-hover:text-primary transition-colors">
                                                {template.nome}
                                            </h3>
                                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-2">
                                                <span>{template.itens?.length || 0} itens</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                                <span className="font-mono">{formatCurrency(total)}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handleDelete(template.id, e)}
                                                className="p-2 rounded-lg text-text-secondary-light dark:text-text-secondary-dark hover:bg-red-100 hover:text-red-500 transition-colors"
                                                title="Excluir Kit"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                            <span className={`material-symbols-outlined text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                expand_more
                                            </span>
                                        </div>
                                    </div>

                                    {/* Conteúdo Expandido - Lista de Itens e Botão Importar */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/20">
                                            <div className="mt-3 space-y-2 mb-4">
                                                <p className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                                    Itens do Kit
                                                </p>
                                                {template.itens.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                                        <span className="text-text-light dark:text-text-dark truncate mr-2 flex-1">
                                                            {item.quantidade}x {item.nome}
                                                        </span>
                                                        <span className="text-text-secondary-light dark:text-text-secondary-dark font-mono shrink-0">
                                                            {formatCurrency(item.quantidade * item.precoUnitario)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => onImport(template.itens)}
                                                className="w-full btn-primary py-2 flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined">download</span>
                                                Importar Kit ({formatCurrency(total)})
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetalhesOS;

