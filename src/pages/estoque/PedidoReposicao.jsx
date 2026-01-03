import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import storage from '../../lib/storage';
import { formatCurrency } from '../../lib/utils';
// import WhatsAppIcon from '../../components/common/WhatsAppIcon'; // Verificarei se existe, se não, uso ícone material

const PedidoReposicao = () => {
    const { empresa } = useAuth();
    const [produtos, setProdutos] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroFornecedor, setFiltroFornecedor] = useState('');
    const [itensSelecionados, setItensSelecionados] = useState([]);

    // Mapa de Quantidades a Pedir: { [produtoId]: number }
    const [quantidades, setQuantidades] = useState({});

    // Modal de Finalização
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        carregarDados();
    }, [empresa]);

    const carregarDados = async () => {
        if (!empresa) return;
        try {
            const [prods, forns] = await Promise.all([
                storage.getAll('produtos', empresa.id),
                storage.getAll('fornecedores', empresa.id)
            ]);

            // Filtrar apenas produtos com estoque baixo ou zerado
            const produtosBaixoEstoque = prods.filter(p => {
                if (p.tipo !== 'produto') return false;
                const qtdAtual = Number(p.quantidade || 0);
                const qtdMinima = Number(p.estoqueMinimo || 0);
                return p.ativo !== false && qtdAtual <= qtdMinima;
            });

            setProdutos(produtosBaixoEstoque);
            setFornecedores(forns.filter(f => f.ativo !== false));

            // Inicializar seleção e quantidades
            setItensSelecionados(produtosBaixoEstoque.map(p => p.id));

            const initialQuantidades = {};
            produtosBaixoEstoque.forEach(p => {
                const atual = Number(p.quantidade || 0);
                const minimo = Number(p.estoqueMinimo || 0);
                // Sugestão padrão: Delta até o mínimo + margem ou pelo menos 1
                let sugestao = Math.max(minimo - atual, 0);
                // Se o delta for pequeno, sugere pelo menos 5 ou 10% do minimo?
                // Usuário pediu sugestão editável, vou manter simples (delta) mas editável.
                if (sugestao <= 0) sugestao = 5;
                initialQuantidades[p.id] = sugestao;
            });
            setQuantidades(initialQuantidades);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuantidadeChange = (id, value) => {
        setQuantidades(prev => ({
            ...prev,
            [id]: Math.max(1, parseInt(value) || 0)
        }));
    };

    const getProdutosFiltrados = () => {
        if (!filtroFornecedor) return produtos;
        return produtos.filter(p => p.fornecedorId === filtroFornecedor);
    };

    const produtosListados = getProdutosFiltrados();

    const toggleSelecao = (id) => {
        setItensSelecionados(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleTodos = () => {
        if (itensSelecionados.length === produtosListados.length) {
            setItensSelecionados([]);
        } else {
            setItensSelecionados(produtosListados.map(p => p.id));
        }
    };

    const getNomeFornecedor = (id) => {
        return fornecedores.find(f => f.id === id)?.nome || '-';
    };

    // --- Lógica de Geração do Pedido ---

    const itensParaPedido = produtosListados
        .filter(p => itensSelecionados.includes(p.id))
        .map(p => ({
            ...p,
            qtdPedir: quantidades[p.id] || 1
        }));

    const gerarTextoPedido = () => {
        if (itensParaPedido.length === 0) return '';

        let fornecedor = fornecedores.find(f => f.id === filtroFornecedor);

        // Se não filtrou, tenta deduzir se todos os itens são do mesmo fornecedor
        if (!fornecedor && itensParaPedido.length > 0) {
            const firstId = itensParaPedido[0].fornecedorId;
            const allSame = itensParaPedido.every(p => p.fornecedorId === firstId);
            if (allSame && firstId) {
                fornecedor = fornecedores.find(f => f.id === firstId);
            }
        }

        const fornecedorNome = fornecedor?.nome || 'Fornecedor';

        const listaItens = itensParaPedido.map(p =>
            `- *${p.qtdPedir}x* ${p.nome}`
        ).join('\n');

        return `*Olá ${fornecedorNome}, tudo bem?*\n` +
            `Gostaria de fazer um pedido de reposição:\n\n` +
            listaItens +
            `\n\nFico no aguardo, obrigado!\n*${empresa.nomeFantasia}*`;
    };

    const abrirModal = () => {
        if (itensParaPedido.length === 0) return alert('Selecione pelo menos um item.');
        setShowModal(true);
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
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">shopping_cart_checkout</span>
                        Pedido de Reposição
                    </h1>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        Produtos com estoque baixo
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={abrirModal}
                        disabled={itensParaPedido.length === 0}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl transition-shadow"
                    >
                        <span className="material-symbols-outlined">send</span>
                        Gerar Pedido
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="card p-4 flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 w-full sm:w-auto">
                    <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                        Filtrar por Fornecedor
                    </label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <span className="material-symbols-outlined text-lg">filter_alt</span>
                        </span>
                        <select
                            className="input w-full pl-10"
                            value={filtroFornecedor}
                            onChange={(e) => setFiltroFornecedor(e.target.value)}
                        >
                            <option value="">Todos os Fornecedores</option>
                            {fornecedores.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 pt-4">
                    <span className="text-sm font-medium text-text-light dark:text-text-dark bg-primary/10 px-3 py-1 rounded-full text-primary">
                        {itensSelecionados.length} itens selecionados
                    </span>
                </div>
            </div>

            {/* Lista */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                            <tr>
                                <th className="px-6 py-3 text-left w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        checked={produtosListados.length > 0 && itensSelecionados.length === produtosListados.length}
                                        onChange={toggleTodos}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Produto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Fornecedor</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Estoque Atual</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Mínimo</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider w-32">Qtd. Pedir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border-light)] dark:divide-[var(--color-border-dark)]">
                            {produtosListados.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-text-secondary-light dark:text-text-secondary-dark">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-4xl text-green-500">check_circle</span>
                                            <p className="font-medium text-text-light dark:text-text-dark">Tudo certo por aqui!</p>
                                            <p className="text-sm">Nenhum produto com estoque crítico.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                produtosListados.map(produto => {
                                    return (
                                        <tr key={produto.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                    checked={itensSelecionados.includes(produto.id)}
                                                    onChange={() => toggleSelecao(produto.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-text-light dark:text-text-dark">{produto.nome}</div>
                                                <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Cod: {produto.codigo || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                                {produto.fornecedorId ? getNomeFornecedor(produto.fornecedorId) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm">
                                                <span className="text-error font-bold">{produto.quantidade} {produto.unidade}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                                {produto.estoqueMinimo} {produto.unidade}
                                            </td>
                                            <td className="px-6 py-4 flex justify-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-20 input p-1 text-center font-medium focus:ring-2 focus:ring-primary/50"
                                                    value={quantidades[produto.id] || ''}
                                                    onChange={(e) => handleQuantidadeChange(produto.id, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Finalização */}
            {showModal && (
                <PedidoModal
                    texto={gerarTextoPedido()}
                    fornecedor={(() => {
                        let f = fornecedores.find(x => x.id === filtroFornecedor);
                        if (!f && itensParaPedido.length > 0) {
                            const firstId = itensParaPedido[0].fornecedorId;
                            if (itensParaPedido.every(p => p.fornecedorId === firstId)) {
                                f = fornecedores.find(x => x.id === firstId);
                            }
                        }
                        return f;
                    })()}
                    avisoMisto={!filtroFornecedor && itensParaPedido.length > 0 && !itensParaPedido.every(p => p.fornecedorId === itensParaPedido[0].fornecedorId)}
                    itens={itensParaPedido}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
};

// Modal Component
const PedidoModal = ({ texto, fornecedor, itens, avisoMisto, onClose }) => {
    const [msgEditada, setMsgEditada] = useState(texto);

    // Identificar telefone do fornecedor para link do WhatsApp
    const getWhatsAppLink = () => {
        if (!fornecedor || !fornecedor.telefone) return null;
        // Limpar caracteres não numéricos
        const num = fornecedor.telefone.replace(/\D/g, '');
        // Adicionar 55 se não tiver (assumindo BR, simplificado)
        const phone = num.length <= 11 ? `55${num}` : num;
        return `https://wa.me/${phone}?text=${encodeURIComponent(msgEditada)}`;
    };

    const whatsappLink = getWhatsAppLink();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(msgEditada);
        alert('Copiado para a área de transferência!');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="card w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl animate-scaleUp flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between">
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-600">whatsapp</span>
                        Enviar Pedido
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {avisoMisto ? (
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg flex gap-3 text-orange-800 dark:text-orange-300">
                            <span className="material-symbols-outlined shrink-0">warning</span>
                            <div className="text-sm">
                                <p className="font-bold">Atenção: Múltiplos Fornecedores</p>
                                <p>Você selecionou itens de fornecedores diferentes. O link direto de WhatsApp não estará disponível. Recomendamos filtrar por fornecedor antes de gerar o pedido.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 text-blue-800 dark:text-blue-300">
                            <span className="material-symbols-outlined shrink-0">info</span>
                            <div className="text-sm">
                                <p className="font-medium">Confirme o fornecedor</p>
                                <p>O pedido será formatado para envio via WhatsApp ou E-mail. Você pode editar o texto abaixo antes de enviar.</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider mb-2">
                            Mensagem
                        </label>
                        <textarea
                            className="input w-full h-64 font-mono text-sm leading-relaxed p-4"
                            value={msgEditada}
                            onChange={(e) => setMsgEditada(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                    <button
                        onClick={copyToClipboard}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">content_copy</span>
                        Copiar Texto
                    </button>

                    {whatsappLink ? (
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary bg-[#25D366] hover:bg-[#128C7E] border-transparent text-white flex items-center gap-2 shadow-md"
                        >
                            <span className="material-symbols-outlined">send</span>
                            Enviar no WhatsApp
                        </a>
                    ) : (
                        <button
                            disabled
                            className="btn-primary opacity-50 cursor-not-allowed flex items-center gap-2"
                            title="Sem telefone cadastrado para o fornecedor"
                        >
                            <span className="material-symbols-outlined">send</span>
                            Sem Telefone
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PedidoReposicao;
