import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOS } from '../../contexts/OSContext';
import storage from '../../lib/storage';
import { formatCurrency, formatDateTime, toISODate, calculateWorkingTime, normalizeString, toTitleCase } from '../../lib/utils';
import { DownloadOSButton, DownloadThermalButton } from '../../components/pdf/OSDocument';
import { TimerExecucao } from '../../components/os/TimerExecucao';
import AssinaturaCanvas from '../../components/os/AssinaturaCanvas';
import { AtribuirTecnicoModal } from '../../components/os/AtribuirTecnicoModal';
import { EditVeiculoModal } from '../../components/os/EditVeiculoModal';

import { gerarPayloadPix } from '../../lib/pix';
import { useAutoSave } from '../../hooks/useAutoSave';

const DetalhesOS = ({ osId, isWindowMode, onClose, onMinimize }) => {
    const { empresa } = useAuth();
    const navigate = useNavigate();
    const params = useParams();
    const id = osId || params.id; // Prioriza prop (Window Mode) sobre URL (Route Mode)
    const { updateWindow } = useOS();

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

    // Auto-Save Hook
    const { draftFound, loadDraft, clearDraft, isSaving: isAutoSaving, lastSaved } = useAutoSave(
        id ? `draft_os_${id}` : null,
        form, // Salva o form inteiro
        2000,
        isDirty && ['orcamento', 'aberta', 'execucao', 'aguardando_peca'].includes(os?.status) // Salva se estiver sujo e em status editável
    );

    const [restoredDraft, setRestoredDraft] = useState(false);

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
    const [showAddItem, setShowAddItem] = useState(false);
    const [showImportarKit, setShowImportarKit] = useState(false);
    const [showChecklist, setShowChecklist] = useState(false);
    const [showAtribuirTecnico, setShowAtribuirTecnico] = useState(false);
    const [showFotoModal, setShowFotoModal] = useState(null); // foto selecionada para visualizar
    const [showPagamento, setShowPagamento] = useState(false);

    const [showAssinatura, setShowAssinatura] = useState(false);
    const [showEditVeiculo, setShowEditVeiculo] = useState(false);
    const [showPix, setShowPix] = useState(false);
    const [pixPayload, setPixPayload] = useState('');

    // Modais de transição de status
    const [showFinalizarModal, setShowFinalizarModal] = useState(false);
    const [showCancelarModal, setShowCancelarModal] = useState(false);
    const [kmAtualizado, setKmAtualizado] = useState('');
    const [motivoCancelamento, setMotivoCancelamento] = useState('');
    const [showFinalizadoSuccess, setShowFinalizadoSuccess] = useState(false);
    const [itemEditando, setItemEditando] = useState(null);
    const [showMenuAcoes, setShowMenuAcoes] = useState(false);

    // Toast notification
    const [toastAprovacao, setToastAprovacao] = useState(false);

    const [linkRastreavel, setLinkRastreavel] = useState(null);

    // Atualizar título e estado da janela no Dock
    useEffect(() => {
        if (isWindowMode && os?.numero && updateWindow) {
            updateWindow(id, {
                title: `OS #${os.numero}`,
                number: os.numero,
                isDirty: isDirty // Sync dirty state
            });
        }
    }, [isWindowMode, os?.numero, id, updateWindow, isDirty]);

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
                    const validadePadrao = new Date(hoje.getTime() - offset).toISOString().split('T')[0];

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

            await storage.update('ordens_servico', id, payload);
            clearDraft(); // Limpa o rascunho após salvar com sucesso
            await carregarDados(true); // Isso vai resetar o form e isDirty
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar alterações');
        } finally {
            setSalvando(false);
        }
    };

    // Handler para mudanças no formulário
    const handleFormChange = (field, value) => {
        setForm(prev => {
            const novo = { ...prev, [field]: value };
            // Verifica se mudou algo em relação ao original (os)
            // Comparação simples para strings/numbers. Para objetos mais complexos precisaria de deep equal
            // Mas aqui os campos editáveis são simples (defeito, observacoes)
            const mudou = JSON.stringify(novo) !== JSON.stringify(os);
            // Na verdade, comparison field by field is safer because 'os' might have other internal changes
            // Mas como 'os' é a referencia loaded do DB, e 'novo' é local...
            // Simplificando: sempre que digita, assume dirty para habilitar o salvar. 
            // O reset acontece no 'Cancelar' ou 'Salvar'
            setIsDirty(true);
            return novo;
        });
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

        // Alerta para reabertura de OS finalizada (estorno necessário)
        if (os.status === 'finalizada' && (novoStatus === 'aberta' || novoStatus === 'execucao')) {
            if (!confirm('ATENÇÃO: Ao reabrir uma OS finalizada, as peças baixadas serão estornadas ao estoque. Continuar?')) {
                return;
            }
            await estornarEstoque();
        }

        // Timer de execução: registrar início quando entra em execução
        const dadosTimer = {};
        if (novoStatus === 'execucao' && os.status !== 'execucao') {
            // Se não tinha começado ainda, ou está voltando de aguardando peça
            if (!os.execucaoIniciadaEm) {
                dadosTimer.execucaoIniciadaEm = new Date().toISOString();
            }
            // Registrar retomada (para pausas ao aguardar peça)
            dadosTimer.execucaoRetomadasEm = [...(os.execucaoRetomadasEm || []), new Date().toISOString()];
        }

        // Se está saindo de execução para qualquer status que não seja finalizada/cancelada, pausar timer
        // (ex: aguardando_peca, aberta, orcamento)
        const statusPausa = ['aguardando_peca', 'aberta', 'orcamento'];
        if (os.status === 'execucao' && statusPausa.includes(novoStatus)) {
            dadosTimer.execucaoPausadasEm = [...(os.execucaoPausadasEm || []), new Date().toISOString()];
        }

        await salvarOS({ status: novoStatus, ...dadosTimer });
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

            // Registrar tempo de finalização para o timer
            const dadosTimer = {
                status: 'finalizada',
                execucaoFinalizadaEm: new Date().toISOString(),
            };

            // Calcular tempo total de execução se tem hora de início
            if (os.execucaoIniciadaEm) {
                const inicio = new Date(os.execucaoIniciadaEm);
                const fim = new Date();

                // Calcular tempo bruto considerando apenas horário comercial
                let tempoTotalMs = calculateWorkingTime(inicio, fim, empresa);

                // Descontar pausas (aguardando peça) que ocorreram durante o horário comercial
                const pausas = os.execucaoPausadasEm || [];
                const retomadas = os.execucaoRetomadasEm || [];
                for (let i = 0; i < pausas.length; i++) {
                    const pausaInicio = new Date(pausas[i]);
                    const pausaFim = retomadas[i + 1] ? new Date(retomadas[i + 1]) : fim;

                    const tempoPausaValido = calculateWorkingTime(pausaInicio, pausaFim, empresa);
                    tempoTotalMs -= tempoPausaValido;
                }

                dadosTimer.tempoExecucaoMs = Math.max(0, tempoTotalMs);
            }

            await salvarOS(dadosTimer);
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
            total: item.quantidade * item.precoUnitario,
        };
        const novosItens = [...itensAtuais, novoItem];
        const novoTotal = novosItens.reduce((sum, i) => sum + (i.isento ? 0 : i.total), 0);

        // Atualizar estado local (Draft)
        setOs(prev => ({ ...prev, itens: novosItens, valorTotal: novoTotal }));
        setForm(prev => ({ ...prev, itens: novosItens, valorTotal: novoTotal }));
        setIsDirty(true);
        setShowAddItem(false);
    };

    // Adicionar múltiplos itens (para importação de Kits)
    const adicionarItensEmLote = (itensKit) => {
        const itensAtuais = os.itens || [];
        const timestamp = Date.now();

        const novosItensKit = itensKit.map((item, index) => ({
            ...item,
            id: `item_${timestamp}_${index}`,
            isento: ['garantia', 'cortesia', 'interna'].includes(os.tipo) ? true : false,
            total: item.quantidade * item.precoUnitario,
        }));

        const novosItens = [...itensAtuais, ...novosItensKit];
        const novoTotal = novosItens.reduce((sum, i) => sum + (i.isento ? 0 : i.total), 0);

        setOs(prev => ({ ...prev, itens: novosItens, valorTotal: novoTotal }));
        setForm(prev => ({ ...prev, itens: novosItens, valorTotal: novoTotal }));
        setIsDirty(true);
        setShowImportarKit(false);
    };

    // Remover item da OS (sem mexer no estoque, pois ainda não foi finalizada)
    const removerItem = async (itemId) => {
        const novosItens = (os.itens || []).filter((i) => i.id !== itemId);
        const novoTotal = novosItens.reduce((sum, i) => sum + (i.isento ? 0 : i.total), 0);

        // Atualizar estado local (Draft)
        setOs(prev => ({ ...prev, itens: novosItens, valorTotal: novoTotal }));
        setForm(prev => ({ ...prev, itens: novosItens, valorTotal: novoTotal }));
        setIsDirty(true);
    };

    // Salvar item editado
    const salvarEdicaoItem = async (itemEditado) => {
        const itensAtuais = os.itens || [];
        const novosItens = itensAtuais.map(i => i.id === itemEditado.id ? itemEditado : i);
        const novoTotal = novosItens.reduce((sum, i) => sum + i.total, 0);

        // Atualizar estado local (Draft)
        setOs(prev => ({ ...prev, itens: novosItens, valorTotal: novoTotal }));
        setForm(prev => ({ ...prev, itens: novosItens, valorTotal: novoTotal }));
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
            }

            let texto = '';

            if (tipo === 'conclusao') {
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
            <header className="flex-none z-30 bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-sm relative">
                <div className="flex items-center justify-between px-4 py-3">
                    {/* Lado Esquerdo (Botão Voltar) */}
                    {!isWindowMode && (
                        <button
                            onClick={() => navigate('/os')}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark mr-2"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                    )}

                    {/* Título Centralizado Absoluto */}
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                                {os.numero ? `OS #${os.numero}` : 'OS Sem Número'}
                                <div className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 border border-transparent ${statusAtual.color}`}>
                                    <span className="material-symbols-outlined text-sm">{statusAtual.icon}</span>
                                    {statusAtual.label}
                                </div>
                            </div>
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {cliente?.nome || 'Cliente não identificado'}
                        </p>
                    </div>

                    {/* Espaçador para Flex (empurra ações para direita) */}
                    <div className="flex-1"></div>

                    {/* Ações Direita (PDF, Mais Ações, Janela) */}
                    <div className="flex items-center gap-2">
                        {/* Botão PDF A4 */}
                        <DownloadOSButton
                            os={os}
                            cliente={cliente}
                            veiculo={veiculo}
                            empresa={empresa}
                            tecnico={tecnicoAtribuido}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-1 text-sm"
                        />

                        {/* Botão Térmico 80mm */}
                        <DownloadThermalButton
                            os={os}
                            cliente={cliente}
                            veiculo={veiculo}
                            empresa={empresa}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-1 text-sm"
                        />

                        {/* Menu Mais Ações (Dropdown) */}
                        <div className="relative group">
                            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-1 text-sm">
                                <span className="material-symbols-outlined text-lg">more_vert</span>
                            </button>

                            {/* Bridge container with padding-top to maintain hover state over the gap */}
                            <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50 animate-scaleIn origin-top-right">
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <button
                                        onClick={duplicarOS}
                                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark"
                                    >
                                        <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark">content_copy</span>
                                        Duplicar OS
                                    </button>

                                    <button
                                        onClick={() => handleEnviarWhatsApp('acompanhamento')}
                                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark"
                                    >
                                        <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark">share</span>
                                        Compartilhar Link de Rastreio
                                    </button>

                                    <button
                                        onClick={() => setShowAssinatura(true)}
                                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark"
                                    >
                                        <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark">draw</span>
                                        Coletar Assinatura
                                    </button>

                                    {os.status === 'finalizada' && (
                                        <>
                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                            <button
                                                onClick={handleExport}
                                                className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark"
                                            >
                                                <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark">data_object</span>
                                                Exportar JSON
                                            </button>
                                            <button
                                                onClick={handleGerarPix}
                                                className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark"
                                            >
                                                <span className="material-symbols-outlined text-lg text-blue-500">pix</span>
                                                Receber via PIX
                                            </button>
                                        </>
                                    )}

                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                                    {/* Ações Destrutivas / Secundárias de Status */}
                                    {os.status === 'orcamento' && (
                                        <button
                                            onClick={() => mudarStatus('cancelada')}
                                            className="w-full p-3 text-left hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 flex items-center gap-3 text-sm"
                                        >
                                            <span className="material-symbols-outlined text-lg">cancel</span>
                                            Cancelar Orçamento
                                        </button>
                                    )}

                                    {os.status === 'finalizada' && (
                                        <button
                                            onClick={() => mudarStatus('aberta')}
                                            className="w-full p-3 text-left hover:bg-orange-50 dark:hover:bg-orange-900/10 text-orange-600 flex items-center gap-3 text-sm"
                                        >
                                            <span className="material-symbols-outlined text-lg">lock_open</span>
                                            Reabrir OS
                                        </button>
                                    )}

                                </div>
                            </div>
                        </div>

                        {isWindowMode && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onMinimize}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark"
                                    title="Minimizar Janela"
                                >
                                    <span className="material-symbols-outlined">remove</span>
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-text-secondary-light dark:text-text-secondary-dark hover:text-red-500"
                                    title="Fechar Janela"
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

            <div className="flex-1 overflow-y-auto custom-scrollbar relative pb-4">


                {/* Workflow Bar - Barra de Ações de Fluxo */}
                {
                    os.status !== 'cancelada' && os.status !== 'finalizada' && (
                        <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-gray-50 dark:bg-gray-800/30 px-4 py-3 relative">


                            {/* Indicador de Auto-Save */}
                            {isAutoSaving && (
                                <div className="absolute top-[-30px] right-4 flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-white/90 dark:bg-gray-900/90 px-2 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-800">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    Salvando rascunho...
                                </div>
                            )}
                            {lastSaved && !isAutoSaving && isDirty && (
                                <div className="absolute top-[-30px] right-4 flex items-center gap-1.5 text-xs text-gray-400 bg-white/90 dark:bg-gray-900/90 px-2 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-800 transition-opacity duration-1000">
                                    <span className="material-symbols-outlined text-[10px]">cloud_done</span>
                                    Salvo {lastSaved.toLocaleTimeString()}
                                </div>
                            )}

                            {errorMsg && (
                                <div className="absolute top-[-50px] right-4 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg z-50 animate-bounce flex items-center gap-2">
                                    <span className="material-symbols-outlined">error</span>
                                    {errorMsg}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-3 items-center justify-between">
                                <div className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-2">
                                    <span className="material-symbols-outlined">alt_route</span>
                                    Próxima Etapa:
                                </div>

                                <div className="flex gap-3 flex-1 justify-end">
                                    {/* Workflow: ORÇAMENTO */}
                                    {os.status === 'orcamento' && (
                                        <>
                                            {(cliente?.whatsapp || cliente?.telefone) && (
                                                <button
                                                    onClick={() => {
                                                        console.log('Validando aprovação (Zap). Total:', os.valorTotal);
                                                        if (!os.valorTotal || Number(os.valorTotal) <= 0) {
                                                            console.log('Bloqueado: Valor zero ou inválido');
                                                            setErrorMsg('Adicione itens ou serviços para enviar a aprovação.');
                                                            return;
                                                        }
                                                        handleEnviarWhatsApp('acompanhamento');
                                                    }}
                                                    className="btn-secondary text-green-600 hover:bg-green-50 border-green-200"
                                                >
                                                    <span className="material-symbols-outlined">send</span>
                                                    Enviar p/ Aprovação (Zap)
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    console.log('Validando aprovação manual. Total:', os.valorTotal);
                                                    if (!os.valorTotal || Number(os.valorTotal) <= 0) {
                                                        console.log('Bloqueado: Valor zero ou inválido');
                                                        setErrorMsg('Adicione itens ou serviços para aprovar.');
                                                        return;
                                                    }
                                                    mudarStatus('aberta');
                                                }}
                                                className="btn-primary bg-blue-600 hover:bg-blue-700"
                                            >
                                                <span className="material-symbols-outlined">thumb_up</span>
                                                Aprovar Manualmente
                                            </button>
                                        </>
                                    )}

                                    {/* Workflow: ABERTA */}
                                    {os.status === 'aberta' && (
                                        <button
                                            onClick={() => mudarStatus('execucao')}
                                            className="btn-primary"
                                        >
                                            <span className="material-symbols-outlined">play_arrow</span>
                                            Iniciar Execução
                                        </button>
                                    )}

                                    {/* Workflow: EXECUÇÃO */}
                                    {os.status === 'execucao' && (
                                        <>
                                            <button
                                                onClick={() => mudarStatus('aguardando_peca')}
                                                className="btn-secondary text-orange-600 hover:bg-orange-50 border-orange-200"
                                            >
                                                <span className="material-symbols-outlined">inventory_2</span>
                                                Aguardando Peça
                                            </button>
                                            <button
                                                onClick={() => mudarStatus('finalizada')}
                                                className="btn-primary bg-green-600 hover:bg-green-700"
                                            >
                                                <span className="material-symbols-outlined">check_circle</span>
                                                Finalizar Serviço
                                            </button>
                                        </>
                                    )}

                                    {/* Workflow: AGUARDANDO PEÇA */}
                                    {os.status === 'aguardando_peca' && (
                                        <button
                                            onClick={() => mudarStatus('execucao')}
                                            className="btn-primary"
                                        >
                                            <span className="material-symbols-outlined">play_arrow</span>
                                            Retomar Execução
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }


                {/* Content */}
                <div className="p-4 space-y-4 max-w-3xl mx-auto">

                    {/* Datas e Prazos (Novo) */}
                    <div className="card p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Previsão de Entrega (Universal) */}
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                <span className="material-symbols-outlined text-sm align-middle mr-1 text-blue-500">event</span>
                                Previsão de Entrega {os.status === 'orcamento' && <span className="text-xs font-normal text-gray-400">(Opcional)</span>}
                            </label>
                            <input
                                type="datetime-local"
                                value={form?.previsaoEntrega || ''}
                                onChange={(e) => handleFormChange('previsaoEntrega', e.target.value)}
                                className="input w-full"
                            />
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                {os.status === 'orcamento'
                                    ? 'Estimativa caso o serviço seja aprovado.'
                                    : 'Data combinada com o cliente.'}
                            </p>
                        </div>

                        {/* Validade do Orçamento (Apenas Orçamento) */}
                        {(os.status === 'orcamento' || os.status === 'aguardando_aprovacao') && (
                            <div className="animate-slideDown">
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                    <span className="material-symbols-outlined text-sm align-middle mr-1 text-orange-500">history_toggle_off</span>
                                    Validade do Orçamento
                                </label>
                                <input
                                    type="date"
                                    value={form?.validadeOrcamento || ''}
                                    onChange={(e) => handleFormChange('validadeOrcamento', e.target.value)}
                                    className="input w-full"
                                />
                                {(() => {
                                    if (!form?.validadeOrcamento) return null;
                                    const hoje = new Date();
                                    hoje.setHours(0, 0, 0, 0);
                                    const validade = new Date(form.validadeOrcamento + 'T00:00:00'); // Fix timezone issue on date parsing
                                    const diffDias = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));

                                    return (
                                        <p className={`text-xs mt-1 ${diffDias < 0 ? 'text-red-500 font-bold' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
                                            {diffDias < 0 ? 'Vencido!' : diffDias === 0 ? 'Vence hoje!' : `Vence em ${diffDias} dias`}
                                        </p>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                    {/* Cliente e Veículo */}
                    < div className="card p-4" >
                        <div className="flex items-start gap-4">
                            {veiculo?.foto ? (
                                <img
                                    src={veiculo.foto}
                                    alt={`${veiculo?.marca} ${veiculo?.modelo}`}
                                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                    {cliente?.nome?.charAt(0) || 'C'}
                                </div>
                            )}
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-text-light dark:text-text-dark">
                                            {cliente?.nome || 'Cliente não encontrado'}
                                        </p>
                                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                            {veiculo?.marca} {veiculo?.modelo} • {veiculo?.placa}
                                            {os.kmAtual && (
                                                <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-text-secondary-light dark:text-text-secondary-dark border border-gray-200 dark:border-gray-700">
                                                    KM {os.kmAtual}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {os.status !== 'finalizada' && os.status !== 'cancelada' && (
                                        <button
                                            onClick={() => setShowEditVeiculo(true)}
                                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark"
                                            title="Editar Veículo"
                                        >
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div >

                    {/* Modal Editar Veículo */}
                    {
                        showEditVeiculo && veiculo && (
                            <EditVeiculoModal
                                veiculo={veiculo}
                                empresaId={empresa.id}
                                onClose={() => setShowEditVeiculo(false)}
                                onSave={(veiculoAtualizado) => {
                                    setVeiculo(veiculoAtualizado);
                                    setShowEditVeiculo(false);
                                }}
                            />
                        )
                    }

                    {/* Técnico */}
                    < div className="card p-4" >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Técnico Responsável</p>
                                <p className="font-medium text-text-light dark:text-text-dark">
                                    {tecnicoAtribuido?.nome || 'Não atribuído'}
                                </p>
                            </div>
                            {os.status !== 'finalizada' && os.status !== 'cancelada' && (
                                <button
                                    onClick={() => setShowAtribuirTecnico(true)}
                                    className="btn-secondary py-2 px-3 text-sm"
                                >
                                    <span className="material-symbols-outlined text-lg">person_add</span>
                                    {tecnicoAtribuido ? 'Alterar' : 'Atribuir'}
                                </button>
                            )}
                        </div>
                    </div >

                    {/* Timer de Execução */}
                    {
                        (os.status === 'execucao' || os.status === 'aguardando_peca' || os.tempoExecucaoMs) && (
                            <TimerExecucao os={os} />
                        )
                    }

                    {/* Defeito Relatado */}
                    <div className="card p-4">
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-1">Defeito Relatado</p>
                        <p className="text-text-light dark:text-text-dark">
                            {os.defeitoRelatado || 'Não informado'}
                        </p>
                    </div>

                    {/* Defeito Constatado */}
                    <div className="card p-4">
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2">Defeito Constatado</p>
                        {os.status === 'aberta' || os.status === 'execucao' ? (
                            <textarea
                                value={form?.defeitoConstatado || ''}
                                onChange={(e) => handleFormChange('defeitoConstatado', e.target.value)}
                                className="input min-h-[80px] resize-y"
                                placeholder="Descreva o defeito constatado após análise..."
                            />
                        ) : (
                            <p className="text-text-light dark:text-text-dark">
                                {os.defeitoConstatado || 'Não informado'}
                            </p>
                        )}
                    </div>

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

                    {/* Itens da OS */}
                    <div className="card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-text-light dark:text-text-dark">
                                Itens ({os.itens?.length || 0})
                            </p>
                            {os.status !== 'finalizada' && os.status !== 'cancelada' && (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={salvarModelo}
                                        className="text-sm text-secondary hover:text-primary hover:underline flex items-center gap-1"
                                        title="Salvar itens como modelo para futuras OS"
                                    >
                                        <span className="material-symbols-outlined text-lg">save_as</span>
                                        Salvar Kit
                                    </button>
                                    <button
                                        onClick={() => setShowImportarKit(true)}
                                        className="text-sm text-secondary hover:text-primary hover:underline flex items-center gap-1"
                                        title="Importar itens de um modelo/kit salvo"
                                    >
                                        <span className="material-symbols-outlined text-lg">download</span>
                                        Importar Kit
                                    </button>
                                    <button
                                        onClick={() => setShowAddItem(true)}
                                        className="text-sm text-primary hover:underline flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-lg">add</span>
                                        Adicionar
                                    </button>
                                </div>
                            )}
                        </div>

                        {(!os.itens || os.itens.length === 0) ? (
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                Nenhum item adicionado
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {os.itens.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-text-light dark:text-text-dark truncate">
                                                {item.nome}
                                            </p>
                                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                                {item.quantidade}x {formatCurrency(item.precoUnitario)}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <p className={`font-bold ${item.isento ? 'text-gray-400 line-through decoration-2' : 'text-text-light dark:text-text-dark'}`}>
                                                {formatCurrency(item.total)}
                                            </p>
                                            {item.isento && (
                                                <span className="text-[10px] font-bold uppercase text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded">
                                                    Isento
                                                </span>
                                            )}
                                        </div>
                                        {os.status !== 'finalizada' && os.status !== 'cancelada' && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => {
                                                        const novosItens = os.itens.map(i => i.id === item.id ? { ...i, isento: !i.isento } : i);
                                                        const novoTotal = novosItens.reduce((sum, i) => sum + (i.isento ? 0 : i.total), 0);
                                                        setOs(prev => ({ ...prev, itens: novosItens, valorTotal: novoTotal }));
                                                        setForm(prev => ({ ...prev, itens: novosItens, valorTotal: novoTotal }));
                                                        setIsDirty(true);
                                                    }}
                                                    className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${item.isento ? 'text-purple-600' : 'text-gray-400'}`}
                                                    title={item.isento ? "Cobrar este item" : "Marcar como isento/garantia"}
                                                >
                                                    <span className="material-symbols-outlined text-lg">
                                                        {item.isento ? 'money_off' : 'attach_money'}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => setItemEditando(item)}
                                                    className="p-1 rounded text-primary hover:bg-primary/10"
                                                    title="Editar item"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => removerItem(item.id)}
                                                    className="p-1 rounded text-error hover:bg-error/10"
                                                    title="Remover item"
                                                >
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Total */}
                                <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                                    <p className="font-semibold text-text-light dark:text-text-dark">Total</p>
                                    <p className="text-xl font-bold text-primary">
                                        {formatCurrency(os.valorTotal || 0)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Seção de Pagamentos */}
                    {
                        (os.status === 'execucao' || os.status === 'finalizada') && (os.valorTotal || 0) > 0 && (
                            <div className="card p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="font-semibold text-text-light dark:text-text-dark flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg">payments</span>
                                        Pagamentos
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

                    {/* Observações */}
                    <div className="card p-4">
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2">Observações</p>
                        {os.status === 'aberta' || os.status === 'execucao' ? (
                            <textarea
                                value={form?.observacoes || ''}
                                onChange={(e) => handleFormChange('observacoes', e.target.value)}
                                className="input min-h-[80px] resize-y"
                                placeholder="Observações internas..."
                            />
                        ) : (
                            <p className="text-text-light dark:text-text-dark">
                                {os.observacoes || 'Nenhuma observação'}
                            </p>
                        )}
                    </div>

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
                            <div className="grid grid-cols-3 gap-2">
                                {os.fotos.map((foto) => (
                                    <div
                                        key={foto.id}
                                        onClick={() => setShowFotoModal(foto)}
                                        className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        <img
                                            src={foto.data}
                                            alt={foto.nome}
                                            className="w-full h-full object-cover"
                                        />
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
                </div >

            </div> {/* Fim do Scrollable Content */}

            {/* Footer com ações de Edição */}
            {
                isDirty && (
                    <div className="p-4 bg-surface-light dark:bg-surface-dark border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] z-[5000] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] animate-slideUp flex-none">
                        <div className="max-w-3xl mx-auto flex gap-3">
                            <button
                                onClick={cancelarEdicao}
                                className="btn-secondary flex-1"
                                disabled={salvando}
                            >
                                <span className="material-symbols-outlined">undo</span>
                                Cancelar Alterações
                            </button>
                            <button
                                onClick={() => salvarOS()}
                                className="btn-primary flex-1 bg-green-600 hover:bg-green-700 sm:flex-none sm:w-1/2"
                                disabled={salvando}
                            >
                                {salvando ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">save</span>
                                        Salvar Alterações
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )
            }

            <div className="h-0"></div>

            {/* Modal Adicionar Item */}
            {
                showAddItem && (
                    <AddItemModal
                        produtos={produtos}
                        onClose={() => setShowAddItem(false)}
                        onAdd={adicionarItem}
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
                        onClose={() => setShowAtribuirTecnico(false)}
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
                                <div className="mb-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined">inventory</span>
                                    {(os.itens || []).filter(i => i.tipo === 'produto').length} peça(s) serão devolvidas ao estoque.
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

            {/* Modal Visualizar Foto */}
            {
                showFotoModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
                        <div className="relative max-w-4xl max-h-[90vh] w-full">
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
                            <img
                                src={showFotoModal.data}
                                alt={showFotoModal.nome}
                                className="w-full h-full object-contain rounded-xl"
                            />
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
        onSubmit({
            valor: parseFloat(valor),
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
                    <div>
                        <label className="text-sm font-medium text-text-light dark:text-text-dark mb-1 block">
                            Valor R$
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            className="input text-lg font-bold"
                            required
                            min="0.01"
                            max={valorRestante}
                        />
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                            Saldo restante: R$ {valorRestante.toFixed(2)}
                        </p>
                    </div>

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
                        <button type="submit" className="btn-primary flex-1">
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
const AddItemModal = ({ produtos, onClose, onAdd }) => {
    const [tipo, setTipo] = useState('produto');
    const [produtoId, setProdutoId] = useState('');
    const [quantidade, setQuantidade] = useState(1);
    const [precoUnitario, setPrecoUnitario] = useState('');
    const [showTemplates, setShowTemplates] = useState(true);
    const [busca, setBusca] = useState('');

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

    const handleProdutoChange = (id) => {
        setProdutoId(id);
        const prod = produtos.find((p) => p.id === id);
        if (prod) {
            setPrecoUnitario(prod.precoVenda);
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
            quantidade: parseInt(quantidade),
            precoUnitario: parseFloat(precoUnitario),
        });
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
                                    className="px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex flex-col items-start"
                                >
                                    <span>{servico.nome}</span>
                                    <span className="text-[10px] opacity-75">{formatCurrency(servico.precoVenda)}</span>
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
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                value="produto"
                                checked={tipo === 'produto'}
                                onChange={(e) => { setTipo(e.target.value); setProdutoId(''); }}
                                className="w-4 h-4 text-primary"
                            />
                            <span className="text-text-light dark:text-text-dark">Produto</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                value="servico"
                                checked={tipo === 'servico'}
                                onChange={(e) => { setTipo(e.target.value); setProdutoId(''); }}
                                className="w-4 h-4 text-primary"
                            />
                            <span className="text-text-light dark:text-text-dark">Serviço</span>
                        </label>
                    </div>

                    {/* Busca por Nome ou Código de Barras */}
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Buscar Item (Nome, Código, Marca ou Aplicação)
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                <span className="material-symbols-outlined">search</span>
                            </span>
                            <input
                                type="text"
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="input pl-10"
                                placeholder="Nome, código, marca ou aplicação..."
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Lista de Resultados */}
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Selecione o Item
                        </label>
                        <div className="border border-gray-300 dark:border-gray-700 rounded-lg max-h-60 overflow-y-auto bg-white dark:bg-gray-800">
                            {produtosFiltrados.length === 0 ? (
                                <div className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark">
                                    Nenhum item encontrado.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {produtosFiltrados.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleProdutoChange(p.id)}
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
                                                {p.codigoBarras && (
                                                    <p className="text-[10px] text-gray-400 font-mono">
                                                        {p.codigoBarras}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Quantidade
                            </label>
                            <input
                                type="number"
                                value={quantidade}
                                onChange={(e) => setQuantidade(e.target.value)}
                                className="input"
                                min="1"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Preço Unitário
                            </label>
                            <input
                                type="number"
                                value={precoUnitario}
                                onChange={(e) => setPrecoUnitario(e.target.value)}
                                className="input"
                                min="0"
                                step="0.01"
                                required
                            />
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


// Modal para editar item
const EditItemModal = ({ item, onClose, onSave }) => {
    const [nome, setNome] = useState(item.nome);
    const [quantidade, setQuantidade] = useState(item.quantidade);
    const [precoUnitario, setPrecoUnitario] = useState(item.precoUnitario);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...item,
            nome,
            quantidade: parseFloat(quantidade),
            precoUnitario: parseFloat(precoUnitario),
            total: parseFloat(quantidade) * parseFloat(precoUnitario)
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md animate-slideUp">
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Quantidade
                            </label>
                            <input
                                type="number"
                                value={quantidade}
                                onChange={(e) => setQuantidade(e.target.value)}
                                className="input"
                                min="1"
                                step="any"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Preço Unitário
                            </label>
                            <input
                                type="number"
                                value={precoUnitario}
                                onChange={(e) => setPrecoUnitario(e.target.value)}
                                className="input"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex justify-between items-center">
                        <span className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">Total</span>
                        <span className="text-lg font-bold text-primary">
                            {((parseFloat(quantidade) || 0) * (parseFloat(precoUnitario) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
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

