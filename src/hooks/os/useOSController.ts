import { useState, useEffect, useRef } from 'react';
import storage from '../../lib/storage';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import { toISODate, calcularResumoFinanceiro } from '../../lib/utils';
import { useNavigate, useParams } from 'react-router-dom';
import { OrdemServico, Cliente, Veiculo, Usuario, Produto, LinkRastreavel, ItemOS } from '../../types';

interface UseOSControllerProps {
    osId?: string;
    isTabMode?: boolean;
    onDirtyChange?: (isDirty: boolean) => void;
    onTitleChange?: (title: string) => void;
}

interface StatusChangeOptions {
    force?: boolean;
    onConfirmPrevisaoVencida?: (previsao: Date) => Promise<boolean>;
    extraData?: Partial<OrdemServico>;
}

export const useOSController = ({ osId, isTabMode, onDirtyChange, onTitleChange }: UseOSControllerProps) => {
    const { empresa } = useAuth();
    const { registerSaveHandler, unregisterSaveHandler } = useTabs();
    const navigate = useNavigate();
    const params = useParams<{ id: string }>();
    const id = osId || params.id;

    // Estado local
    const [os, setOs] = useState<OrdemServico | null>(null);
    const [form, setForm] = useState<OrdemServico | null>(null);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Dados Relacionados
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
    const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [linkRastreavel, setLinkRastreavel] = useState<LinkRastreavel | undefined>(undefined);

    const isDirtyRef = useRef(isDirty);
    const salvarOSRef = useRef<((dados?: Partial<OrdemServico>) => Promise<boolean>) | null>(null);

    // Manter ref sincronizada
    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    // Sincronizar isDirty com a aba
    useEffect(() => {
        if (isTabMode) {
            onDirtyChange?.(isDirty);
        }
    }, [isDirty, isTabMode, onDirtyChange]);

    // Atualizar título
    useEffect(() => {
        if (os?.numero && isTabMode) {
            onTitleChange?.(`OS #${os.numero}`);
        }
    }, [os?.numero, isTabMode, onTitleChange]);

    // Registrar Handler de Salvar da Aba
    useEffect(() => {
        if (isTabMode && id) {
            const tabId = `os-${id}`;
            registerSaveHandler(tabId, () => salvarOSRef.current ? salvarOSRef.current() : Promise.resolve(false));
            return () => unregisterSaveHandler(tabId);
        }
    }, [isTabMode, id, registerSaveHandler, unregisterSaveHandler]);

    const carregarDados = async (force = false) => {
        if (!empresa || !id) return;
        if (!force && isDirtyRef.current) return;

        try {
            const [osData, clientesData, veiculosData, colaboradoresData, produtosData] = await Promise.all([
                storage.getById<OrdemServico>('ordens_servico', id),
                storage.getAll<Cliente>('clientes', empresa.id),
                storage.getAll<Veiculo>('veiculos', empresa.id),
                storage.getAll<Usuario>('colaboradores', empresa.id),
                storage.getAll<Produto>('produtos', empresa.id),
            ]);

            if (osData) {
                setOs(osData);
                setForm(osData);
                setIsDirty(false);
                setCliente(clientesData.find((c) => c.id === osData.clienteId) || null);
                setVeiculo(veiculosData.find((v) => v.id === osData.veiculoId) || null);

                // Validade Default
                if (osData.status === 'orcamento' && !osData.validadeOrcamento && empresa.diasValidadeOrcamento) {
                    const dias = Number(empresa.diasValidadeOrcamento || 10);
                    const hoje = new Date();
                    hoje.setDate(hoje.getDate() + dias);
                    const offset = hoje.getTimezoneOffset() * 60000;
                    const validadePadrao = toISODate(new Date(hoje.getTime() - offset));
                    setForm(prev => prev ? ({ ...prev, validadeOrcamento: validadePadrao }) : null);
                }
            }

            setTecnicos(colaboradoresData.filter((c) => c.ativo !== false));
            setProdutos(produtosData.filter((p) => p.ativo));

            const links = await storage.getAll<LinkRastreavel>('links_rastreaveis', empresa.id);
            const linkAtivo = links.find(l => l.osId === id && l.ativo !== false);
            setLinkRastreavel(linkAtivo);

        } catch (error) {
            console.error('Erro ao carregar dados hook:', error);
        } finally {
            setLoading(false);
        }
    };

    const salvarOS = async (dados?: Partial<OrdemServico>) => {
        setSalvando(true);
        try {
            const payload = dados || form;

            if (!payload || !os) return false;

            // Validações básicas de status/técnico
            const nextStatus = payload.status !== undefined ? payload.status : os.status;
            const nextTecnicoId = payload.tecnicoId !== undefined ? payload.tecnicoId : os.tecnicoId;

            // Type assertion for status literal type safety
            if (nextStatus === 'execucao' && !nextTecnicoId) {
                throw new Error('TECNICO_REQUIRED');
            }

            const targetId = os?.id || id;
            if (!targetId) return false;

            // Ensure partial update is compatible with update method
            await storage.update('ordens_servico', targetId, payload as any);

            await carregarDados(true);
            return true; // Sucesso
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            if (error.message === 'TECNICO_REQUIRED') throw error;
            return false;
        } finally {
            setSalvando(false);
        }
    };

    // Atualiza a ref para o TabHandler
    salvarOSRef.current = salvarOS;

    // Listeners de Eventos
    useEffect(() => {
        carregarDados(true);

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key?.includes('ordens_servico') || e.key?.includes('links_rastreaveis')) {
                carregarDados(false);
            }
        };

        const handleCustomStorageChange = (e: any) => {
            if (e.detail?.key?.includes && (e.detail.key.includes('empresas') || e.detail.key.includes('ordens_servico'))) {
                carregarDados(false);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('osprimex-storage', handleCustomStorageChange as EventListener);

        const interval = setInterval(() => carregarDados(false), 30000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('osprimex-storage', handleCustomStorageChange as EventListener);
            clearInterval(interval);
        };
    }, [id, empresa?.id]);


    // Handlers de Modificação de Form
    const handleFormChange = (field: keyof OrdemServico, value: any) => {
        setForm(prev => {
            if (!prev) return null;
            const novo = { ...prev, [field]: value };
            setIsDirty(true);
            return novo;
        });
    };

    const handleUpdateApontamentos = (updates: Partial<OrdemServico>) => {
        setOs(prev => prev ? ({ ...prev, ...updates }) : null);
        setForm(prev => prev ? ({ ...prev, ...updates }) : null);
        setIsDirty(true);
    };

    // --- Ações de Itens ---
    const handleUpdateItens = (novosItens: ItemOS[]) => {
        if (!os) return;
        const { totalFinal } = calcularResumoFinanceiro(
            novosItens,
            os.descontoGlobalTipo, os.descontoGlobalValor,
            os.acrescimoGlobalTipo, os.acrescimoGlobalValor
        );
        setOs(prev => prev ? ({ ...prev, itens: novosItens, valorTotal: totalFinal }) : null);
        setForm(prev => prev ? ({ ...prev, itens: novosItens, valorTotal: totalFinal }) : null);
        setIsDirty(true);
    };

    const adicionarItem = async (item: Partial<ItemOS> & { quantidade: number; precoUnitario: number }) => {
        if (!os) return;
        const itensAtuais = os.itens || [];
        const novoItem: ItemOS = {
            id: `item_${Date.now()}`,
            nome: item.nome || 'Item sem nome',
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            tipo: item.tipo || 'produto',
            isento: ['garantia', 'cortesia', 'interna'].includes(os.tipo) ? true : false,
            total: item.total !== undefined ? item.total : (item.quantidade * item.precoUnitario),
            ...item
        };
        handleUpdateItens([...itensAtuais, novoItem]);
    };

    const removerItem = async (itemId: string) => {
        if (!os) return;
        const novosItens = (os.itens || []).filter((i) => i.id !== itemId);
        handleUpdateItens(novosItens);
    };

    const adicionarItensEmLote = (itensKit: any[]) => {
        if (!os) return;
        const itensAtuais = os.itens || [];
        const timestamp = Date.now();
        const novosItensKit = itensKit.map((item, index) => ({
            ...item,
            id: `item_${timestamp}_${index}`,
            isento: ['garantia', 'cortesia', 'interna'].includes(os.tipo) ? true : false,
            total: item.quantidade * item.precoUnitario,
        }));
        handleUpdateItens([...itensAtuais, ...novosItensKit]);
    };

    const salvarEdicaoItem = async (itemEditado: ItemOS) => {
        if (!os) return;
        const itensAtuais = os.itens || [];
        const novosItens = itensAtuais.map(i => i.id === itemEditado.id ? itemEditado : i);
        handleUpdateItens(novosItens);
    };

    // --- Ações de Status ---
    const mudarStatus = async (novoStatus: string, opcoes: StatusChangeOptions = {}) => {
        if (!os) return { error: 'OS_NOT_LOADED' };

        // Validações
        if (novoStatus === 'execucao' && !os.tecnicoId) {
            return { error: 'TECNICO_REQUIRED' };
        }

        // Verificação de previsão (regra de negócio)
        if (os.status === 'orcamento' && novoStatus === 'aberta' && os.previsaoEntrega) {
            const previsao = new Date(os.previsaoEntrega);
            const agora = new Date();
            if (previsao < agora) {
                if (!opcoes.force && opcoes.onConfirmPrevisaoVencida) {
                    const confirmado = await opcoes.onConfirmPrevisaoVencida(previsao);
                    if (!confirmado) return { error: 'CANCELLED_BY_USER' };
                }
            }
        }

        await salvarOS({ status: novoStatus, ...opcoes.extraData });
        return { success: true };
    };

    const finalizarOS = async () => {
        if (!os || !empresa) return;
        setSalvando(true);
        try {
            const itens = os.itens || [];

            // 1. Validação de Estoque (Se ativado)
            if (empresa.controlarEstoque) {
                for (const item of itens) {
                    if (item.tipo === 'produto' && item.produtoId) {
                        const produto = await storage.getById<Produto>('produtos', item.produtoId);
                        if (produto) {
                            const estoqueAtual = Number(produto.quantidade) || 0;
                            if (estoqueAtual < item.quantidade) {
                                throw new Error(`Estoque insuficiente para o produto: ${produto.nome}. Disponível: ${estoqueAtual}, Necessário: ${item.quantidade}`);
                            }
                        }
                    }
                }
            }

            // 2. Baixa de estoque
            for (const item of itens) {
                if (item.tipo === 'produto' && item.produtoId) {
                    try {
                        const produto = await storage.getById<Produto>('produtos', item.produtoId);
                        if (produto) {
                            const estoqueAtual = Number(produto.quantidade) || 0;
                            const novoEstoque = estoqueAtual - item.quantidade; // Pode ficar negativo se controle estiver off

                            await storage.update('produtos', item.produtoId, { quantidade: novoEstoque });

                            await storage.create('movimentacoes_estoque', {
                                produtoId: item.produtoId,
                                osId: os.id,
                                tipo: 'saida',
                                quantidade: item.quantidade,
                                motivo: `OS #${os.numero || (os.id ? os.id.slice(-6) : '')} finalizada`,
                                estoqueAnterior: estoqueAtual,
                                estoqueAtual: novoEstoque,
                            }, empresa.id);
                        }
                    } catch (err) {
                        console.error('Erro ao baixar estoque item:', item, err);
                        // Em um cenário ideal, faríamos rollback aqui se falhasse no meio
                        throw new Error(`Erro ao atualizar estoque do item ${item.nome}`);
                    }
                }
            }

            // 3. Comissão Técnico
            if (os.tecnicoId && (os.valorTotal || 0) > 0) {
                try {
                    const tecnico = await storage.getById<Usuario>('colaboradores', os.tecnicoId);
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
                } catch (err) {
                    console.error('Erro ao gerar comissão:', err);
                }
            }

            await salvarOS({ status: 'finalizada' });
            return { success: true };
        } catch (error: any) {
            console.error('Erro ao finalizar:', error);
            // Propagar erro com mensagem amigável se possível
            if (error.message && error.message.includes('Estoque insuficiente')) {
                return { error: error.message };
            }
            throw error;
        } finally {
            setSalvando(false);
        }
    };

    return {
        // Dados
        id,
        os,
        form,
        loading,
        salvando,
        isDirty,
        cliente,
        veiculo,
        tecnicos,
        produtos,
        linkRastreavel,

        // Ações
        carregarDados,
        salvarOS,
        handleFormChange,
        setForm,
        setOs,
        setIsDirty,
        handleUpdateApontamentos,

        // Itens
        adicionarItem,
        removerItem,
        adicionarItensEmLote,
        salvarEdicaoItem,

        // Status
        mudarStatus,
        finalizarOS
    };
};
