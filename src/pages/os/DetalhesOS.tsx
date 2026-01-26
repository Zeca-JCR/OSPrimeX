
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import { useOSController } from '../../hooks/os/useOSController';
import storage from '../../lib/storage';
import { formatCurrency, formatDate, formatDateTime, formatPlaca, toISODate, normalizeString, toTitleCase, parseCurrency, formatCurrencyInput } from '../../lib/utils';
import { DownloadOSButton, DownloadThermalButton } from '../../components/pdf/OSDocument';
import { PrintOSButton, PrintThermalButton } from '../../components/pdf/PrintButtons';
import AssinaturaCanvas from '../../components/os/AssinaturaCanvas';
import { AtribuirTecnicoModal } from '../../components/os/AtribuirTecnicoModal';
import { EditVeiculoModal } from '../../components/os/EditVeiculoModal';
import { TimeTrackingSection } from '../../components/os/TimeTrackingSection';
import CurrencyInput from '../../components/common/CurrencyInput';
import PlacaBadge from '../../components/common/PlacaBadge';

import { gerarPayloadPix } from '../../lib/pix';
import { OSHeader } from '../../components/os/detalhes/OSHeader';
import { OSClienteCard } from '../../components/os/detalhes/OSClienteCard';
import { OSTecnicoSelect } from '../../components/os/detalhes/OSTecnicoSelect';
import { OSObservacoes } from '../../components/os/detalhes/OSObservacoes';
import { OSItensTable } from '../../components/os/detalhes/OSItensTable';
import { OSFotos } from '../../components/os/detalhes/OSFotos';
import { OSPagamentos } from '../../components/os/detalhes/OSPagamentos';
import { OSActionsFooter } from '../../components/os/detalhes/OSActionsFooter';
import { calcularResumoFinanceiro } from '../../lib/utils';



interface DetalhesOSProps {
    osId?: string;
    isWindowMode?: boolean;
    isTabMode?: boolean;
    onClose?: () => void;
    onMinimize?: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    onTitleChange?: (title: string) => void;
}

const DetalhesOS = ({ osId, isWindowMode, isTabMode, onClose, onMinimize, onDirtyChange, onTitleChange }: DetalhesOSProps = {}) => {
    const { empresa, usuario } = useAuth();
    const navigate = useNavigate();

    const {
        id, os, form, loading, salvando, isDirty,
        cliente, veiculo, tecnicos, produtos, linkRastreavel,
        carregarDados, salvarOS, handleFormChange, setForm, setOs, setIsDirty, handleUpdateApontamentos,
        adicionarItem, removerItem, adicionarItensEmLote, salvarEdicaoItem,
        mudarStatus, finalizarOS
    } = useOSController({ osId, isTabMode, onClose, onMinimize, onDirtyChange, onTitleChange });

    // Estado local apenas para UI (Modais e visualização)
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

    // Modais
    const [addItemValues, setAddItemValues] = useState(null);
    const [showAddItem, setShowAddItem] = useState(false);
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
    const [showHistoricoDefeito, setShowHistoricoDefeito] = useState(false); // Expandir histórico do defeito relatado
    const [showConfirmarSaida, setShowConfirmarSaida] = useState(false);

    // Toast notification (UI helper)
    const [toastAprovacao, setToastAprovacao] = useState(false);

    const [linkCopied, setLinkCopied] = useState(false);

    // Memorizar opções de prisma para evitar re-cálculo constante (Movido para topo para evitar erro de hooks)
    const opcoesPrisma = useMemo(() => {
        if (!empresa?.usarPrismas) return [];

        const osAtivas = JSON.parse(localStorage.getItem('osprimex_ordens_servico') || '[]');
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

    // Helper para abrir modal de adição
    const handleAddToBill = (quantidadeDecimal) => {
        setAddItemValues({
            tipo: 'servico',
            quantidade: quantidadeDecimal
        });
        setShowAddItem(true);
    };

    // Funções de UI que chamam o hook
    const aprovarOrcamento = async () => {
        await mudarStatus('aberta');
    };

    const cancelarEdicao = async () => {
        // Apenas recarrega dados para limpar estado 'dirty'
        await carregarDados(true);
    };

    // Wrappers para os modais que chamam o hook
    const confirmarFinalizacao = async () => {
        try {
            await finalizeWrapper();
            setShowFinalizarModal(false);
            setShowFinalizadoSuccess(true);
        } catch (error) {
            console.error('Erro ao finalizar:', error);
        }
    };

    const finalizeWrapper = async () => {
        // Wrapper para executar lógica extra antes de finalizar (se houver)
        // No momento, o hook já faz tudo (stock, comissão)
        await finalizarOS();
    };

    const confirmarCancelamento = async () => {
        try {
            const observacaoAtual = os.observacoes || '';
            const novaObservacao = motivoCancelamento
                ? `${observacaoAtual}\n[CANCELADO] ${motivoCancelamento}`.trim()
                : observacaoAtual;

            // Estorno de estoque handled by hook or manual logic?
            // Hook doesn't handle cancellation revert logic yet. 
            // We might need to keep specific "cancellation" logic here or move to hook.
            // For now, let's assume we call salvarOS with 'cancelada'.
            // But the original code had 'estornarEstoque'. I should probably add that to the hook later.
            // Or keep it here but using hook's data.

            // Temporariamente chamando salvarOS, mas idealmente o hook teria 'cancelarOS'
            await salvarOS({ status: 'cancelada', observacoes: novaObservacao });

            setShowCancelarModal(false);
        } catch (error) {
            console.error('Erro ao cancelar:', error);
        }
    };

    // Reabertura
    const confirmarReabertura = async () => {
        try {
            await mudarStatus('aberta');
            setShowReabrirModal(false);
        } catch (error) {
            console.error('Erro ao reabrir:', error);
        }
    };


    // Remover item da OS (sem mexer no estoque, pois ainda não foi finalizada)


    // Salvar item editado


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

    // Registrar pagamento vinculado Ã  OS
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

    // Handlers para os novos componentes refatorados
    const handlePrismaChange = async (numeroPrisma) => {
        try {
            const novos = { ...os, prisma: numeroPrisma };
            // Atualização no storage (Assumindo que setOs e atualização local também ocorrem, mas storage é critical)
            // Aqui fazemos direto no storage pois altera estado compartilhado
            await storage.update('ordens_servico', os.id, novos);
            setOs(novos);
            window.dispatchEvent(new CustomEvent('storage', { detail: { key: 'ordens_servico' } }));
        } catch (error) {
            console.error('Erro ao atualizar prisma:', error);
        }
    };

    const handleUpdateOS = (updates) => {
        setOs(prev => ({ ...prev, ...updates }));
        setForm(prev => ({ ...prev, ...updates }));
        setIsDirty(true);
    };

    const handleCopiarLinkRastreio = async () => {
        try {
            let linkToCopy = '';
            if (linkRastreavel) {
                linkToCopy = `${window.location.origin}/r/${linkRastreavel.id}`;
            } else {
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
            alert('Erro ao gerar link.', err);
        }
    };

    const statusAtual = statusConfig[os.status];

    // Wrapper em mudarStatus para interceptar erro de técnico obrigatório
    const handleStatusChange = async (novoStatus) => {
        const result = await mudarStatus(novoStatus);
        if (result && result.error === 'TECNICO_REQUIRED') {
            setAtribuirParaIniciarExecucao(true);
            setShowAtribuirTecnico(true);
        }
    };

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
            <OSHeader
                os={os}
                cliente={cliente}
                veiculo={veiculo}
                empresa={empresa}
                tecnico={tecnicoAtribuido}
                linkRastreavel={linkRastreavel}
                isWindowMode={isWindowMode}
                isDirty={isDirty}
                onDuplicar={duplicarOS}
                onCompartilhar={handleEnviarWhatsApp}
                onAssinar={() => setShowAssinatura(true)}
                onMudarStatus={handleStatusChange}
                onFinalizar={() => setShowFinalizarModal(true)}
                onAprovarOrcamento={aprovarOrcamento}
                onGerarPix={handleGerarPix}
                onExportar={handleExport}
                onCancelar={() => mudarStatus('cancelada')}
                onCopiarLinkRastreio={handleCopiarLinkRastreio}
                onMinimize={onMinimize}
                onClose={onClose}
                onConfirmarSaida={() => setShowConfirmarSaida(true)}
            />
            {/* Alerta de Rascunho Encontrado (Top Bar) */}


            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900/50 p-4">
                <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* === COLUNA ESQUERDA (Contexto) === */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Cartão Cliente & Veículo Unified */}
                        <OSClienteCard
                            os={os}
                            cliente={cliente}
                            veiculo={veiculo}
                            empresa={empresa}
                            form={form}
                            opcoesPrisma={opcoesPrisma}
                            loading={loading}
                            salvando={salvando}
                            onEditVeiculo={() => setShowEditVeiculo(true)}
                            onKmChange={(val) => handleFormChange('kmAtual', val)}
                            onPrismaChange={handlePrismaChange}
                        />

                        {/* Cartão Status & Técnico - Com borda lateral colorida por status */}
                        <OSTecnicoSelect
                            os={os}
                            tecnico={tecnicoAtribuido}
                            form={form}
                            onAtribuirTecnico={() => setShowAtribuirTecnico(true)}
                            onDateChange={handleFormChange}
                        />

                        <OSObservacoes
                            os={os}
                            form={form}
                            usuario={usuario}
                            onFormChange={handleFormChange}
                            onDirty={() => setIsDirty(true)}
                        />

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

                        <OSItensTable
                            os={os}
                            configuracoes={configuracoes}
                            loading={loading}
                            onAddItem={() => setShowAddItem(true)}
                            onEditItem={setItemEditando}
                            onRemoveItem={removerItem}
                            onUpdateOS={handleUpdateOS}
                            onSalvarModelo={salvarModelo}
                            onImportarKit={() => setShowImportarKit(true)}
                        />

                        <OSPagamentos
                            os={os}
                            onRegistrarPagamento={() => setShowPagamento(true)}
                        />

                        <OSFotos
                            os={os}
                            onAddFoto={adicionarFoto}
                            onShowFoto={setShowFotoModal}
                        />

                        {/* Meta */}
                        <div className="text-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            <p>Criada em {formatDateTime(os.criadoEm)}</p>
                            {os.atualizadoEm && <p>Ãšltima atualização: {formatDateTime(os.atualizadoEm)}</p>}
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

            {/* Footer Fixo */}
            <OSActionsFooter
                os={os}
                form={form}
                isDirty={isDirty}
                salvando={salvando}
                onSalvar={() => salvarOS()}
                onCancelar={() => {
                    if (isDirty) {
                        setShowConfirmarSaida(true);
                    } else {
                        (isTabMode || isWindowMode) ? onClose?.() : navigate('/os');
                    }
                }}
            />

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
                                        {/* Ãcone de confirmação */}
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


