import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import storage from '../../lib/storage';
import { formatCurrency, formatDateTime } from '../../lib/utils';

const HistoricoEstoque = () => {
    const { empresa } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams(); // Add this hook
    const filtroProdutoId = searchParams.get('produtoId');

    const [movimentacoes, setMovimentacoes] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [tipoMov, setTipoMov] = useState('entrada');

    useEffect(() => {
        carregarDados();
    }, [empresa]);

    const carregarDados = async () => {
        if (!empresa) return;
        try {
            const [movsData, prodsData] = await Promise.all([
                storage.getAll('movimentacoes_estoque', empresa.id),
                storage.getAll('produtos', empresa.id),
            ]);
            let movs = movsData.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
            if (filtroProdutoId) {
                movs = movs.filter(m => m.produtoId === filtroProdutoId);
            }
            setMovimentacoes(movs);
            setProdutos(prodsData.filter((p) => p.ativo && p.tipo === 'produto'));
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const getProdutoNome = (produtoId) => {
        const produto = produtos.find((p) => p.id === produtoId);
        return produto?.nome || 'Produto removido';
    };

    const handleNovaMovimentacao = (tipo) => {
        setTipoMov(tipo);
        setShowModal(true);
    };

    const handleSave = () => {
        setShowModal(false);
        carregarDados();
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
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                <div className="flex items-center justify-between px-4 py-3">
                    <h1 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        Movimentações
                        {filtroProdutoId && (
                            <span className="text-sm font-normal text-text-secondary-light dark:text-text-secondary-dark bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                                Filtrando por: {getProdutoNome(filtroProdutoId)}
                                <button
                                    onClick={() => setSearchParams({})}
                                    className="ml-2 hover:text-red-500"
                                    title="Limpar filtro"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleNovaMovimentacao('entrada')}
                            className="btn-primary py-2 px-3 text-sm"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Entrada
                        </button>
                        <button
                            onClick={() => handleNovaMovimentacao('saida')}
                            className="btn-secondary py-2 px-3 text-sm"
                        >
                            <span className="material-symbols-outlined text-lg">remove</span>
                            Saída
                        </button>
                    </div>
                </div>
            </header>

            {/* Lista */}
            <main className="flex-1 overflow-y-auto px-4 py-4">
                {movimentacoes.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-gray-400">swap_vert</span>
                        </div>
                        <p className="text-lg font-medium text-text-light dark:text-text-dark mb-2">
                            Nenhuma movimentação
                        </p>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                            As entradas e saídas de estoque aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {movimentacoes.map((mov) => {
                            const isEntrada = mov.tipo === 'entrada';
                            return (
                                <div key={mov.id} className="card p-4 flex items-center gap-4">
                                    <div
                                        className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isEntrada
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}
                    `}
                                    >
                                        <span className="material-symbols-outlined">
                                            {isEntrada ? 'add' : 'remove'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-text-light dark:text-text-dark truncate">
                                            {getProdutoNome(mov.produtoId)}
                                        </p>
                                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                            {mov.motivo || (isEntrada ? 'Entrada manual' : 'Saída manual')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${isEntrada ? 'text-green-600' : 'text-red-600'}`}>
                                            {isEntrada ? '+' : '-'}{mov.quantidade}
                                        </p>
                                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                            {formatDateTime(mov.criadoEm)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <MovimentacaoModal
                    tipo={tipoMov}
                    produtos={produtos}
                    empresaId={empresa?.id}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

// Modal de movimentação
const MovimentacaoModal = ({ tipo, produtos, empresaId, onClose, onSave }) => {
    const isEntrada = tipo === 'entrada';
    const [form, setForm] = useState({
        produtoId: '',
        quantidade: '',
        motivo: '',
    });
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSalvando(true);

        try {
            if (!form.produtoId) throw new Error('Selecione um produto');
            if (!form.quantidade || parseInt(form.quantidade) <= 0) {
                throw new Error('Quantidade deve ser maior que zero');
            }

            const quantidade = parseInt(form.quantidade);
            const produto = produtos.find((p) => p.id === form.produtoId);

            if (!produto) throw new Error('Produto não encontrado');

            // Verificar se há estoque suficiente para saída
            if (!isEntrada && produto.quantidade < quantidade) {
                throw new Error(`Estoque insuficiente. Disponível: ${produto.quantidade}`);
            }

            // Criar movimentação
            await storage.create(
                'movimentacoes_estoque',
                {
                    produtoId: form.produtoId,
                    tipo,
                    quantidade,
                    motivo: form.motivo || (isEntrada ? 'Entrada manual' : 'Saída manual'),
                },
                empresaId
            );

            // Atualizar estoque do produto
            const novaQuantidade = isEntrada
                ? produto.quantidade + quantidade
                : produto.quantidade - quantidade;

            await storage.update('produtos', form.produtoId, {
                quantidade: novaQuantidade,
            });

            onSave();
        } catch (error) {
            setError(error.message || 'Erro ao salvar');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                        {isEntrada ? 'Entrada de Estoque' : 'Saída de Estoque'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
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

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Produto *
                        </label>
                        <select
                            name="produtoId"
                            value={form.produtoId}
                            onChange={handleChange}
                            className="input"
                            required
                        >
                            <option value="">Selecione um produto</option>
                            {produtos.map((produto) => (
                                <option key={produto.id} value={produto.id}>
                                    {produto.nome} (Estoque: {produto.quantidade})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Quantidade *
                        </label>
                        <input
                            type="number"
                            name="quantidade"
                            value={form.quantidade}
                            onChange={handleChange}
                            className="input"
                            min="1"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Motivo
                        </label>
                        <input
                            type="text"
                            name="motivo"
                            value={form.motivo}
                            onChange={handleChange}
                            className="input"
                            placeholder={isEntrada ? 'Compra, devolução...' : 'Uso interno, perda...'}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
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
                                    <span className="material-symbols-outlined">{isEntrada ? 'add' : 'remove'}</span>
                                    Confirmar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HistoricoEstoque;
