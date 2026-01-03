import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // Navigation hooks
import { useAuth } from '../../contexts/AuthContext';
import storage from '../../lib/storage'; // Data access
import { formatCurrency } from '../../lib/utils';
import CreatableSelect from '../../components/common/CreatableSelect';
import { useTenant } from '../../contexts/TenantContext'; // Contexts

const CadastroProduto = () => {
    const { empresa } = useAuth(); // Get current company context
    const navigate = useNavigate();
    const { id } = useParams(); // Get ID from URL if editing
    const isEdicao = !!id;

    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState('');
    const [estoqueOriginal, setEstoqueOriginal] = useState(0); // To track stock changes

    // Initial Form State
    const [form, setForm] = useState({
        tipo: 'produto',
        nome: '',
        descricao: '',
        unidade: 'UN',
        precoCusto: '',
        precoVenda: '',
        quantidade: 0,
        estoqueMinimo: 0,
        servicoRapido: false,
        fornecedorId: '',
        codigoBarras: '',
        referencia: '',
        marca: '',
        classificacao: '',
        aplicacao: '',
    });

    const [fornecedores, setFornecedores] = useState([]);
    const unidades = ['UN', 'L', 'KG', 'M', 'JG', 'PC', 'CX', 'SV'];
    const isProduto = form.tipo === 'produto';

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Load Data (Suppliers + Product if editing)
    useEffect(() => {
        const loadDada = async () => {
            setLoading(true);
            try {
                if (!empresa?.id) return;

                // 1. Load Suppliers
                const suppliersData = await storage.list('fornecedores', empresa.id);
                setFornecedores(suppliersData);

                // 2. Load Product if Editing
                if (isEdicao) {
                    const produto = await storage.getById('produtos', id);
                    if (produto) {
                        setForm({
                            tipo: produto.tipo || 'produto',
                            nome: produto.nome || '',
                            descricao: produto.descricao || '',
                            unidade: produto.unidade || 'UN',
                            precoCusto: produto.precoCusto || '',
                            precoVenda: produto.precoVenda || '',
                            quantidade: produto.quantidade || 0,
                            estoqueMinimo: produto.estoqueMinimo || 0,
                            servicoRapido: produto.servicoRapido || false,
                            fornecedorId: produto.fornecedorId || '',
                            codigoBarras: produto.codigoBarras || '',
                            referencia: produto.referencia || '',
                            marca: produto.marca || '',
                            classificacao: produto.classificacao || '',
                            aplicacao: produto.aplicacao || '',
                        });
                        setEstoqueOriginal(parseInt(produto.quantidade) || 0);
                    } else {
                        setError('Produto não encontrado');
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar dados", err);
                setError('Erro ao carregar dados.');
            } finally {
                setLoading(false);
            }
        };
        loadDada();
    }, [id, empresa?.id, isEdicao]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSalvando(true);

        try {
            if (!form.nome.trim()) throw new Error('Nome é obrigatório');
            if (!form.precoVenda) throw new Error('Preço de venda é obrigatório');

            const payload = {
                ...form,
                precoCusto: form.precoCusto ? parseFloat(form.precoCusto) : 0,
                precoVenda: parseFloat(form.precoVenda),
                quantidade: isProduto ? parseInt(form.quantidade) || 0 : null,
                estoqueMinimo: isProduto ? parseInt(form.estoqueMinimo) || 0 : null,
            };

            let produtoId = id;

            if (isEdicao) {
                await storage.update('produtos', id, payload);
            } else {
                const novo = await storage.create('produtos', payload, empresa.id);
                produtoId = novo.id;

                // Saldo Inicial
                if (isProduto && payload.quantidade > 0) {
                    await storage.create('movimentacoes_estoque', {
                        produtoId: produtoId,
                        tipo: 'entrada',
                        quantidade: payload.quantidade,
                        motivo: 'Saldo Inicial',
                        estoqueAnterior: 0,
                        estoqueAtual: payload.quantidade,
                        valorCusto: (payload.precoCusto || 0) * payload.quantidade,
                        novoPrecoCusto: payload.precoCusto || 0,
                    }, empresa.id);
                }
            }

            // Registrar histórico se houve mudança manual de estoque na edição
            if (isEdicao && isProduto) {
                const estoqueNovo = parseInt(form.quantidade) || 0;
                const diferenca = estoqueNovo - estoqueOriginal;

                if (diferenca !== 0) {
                    await storage.create('movimentacoes_estoque', {
                        produtoId: produtoId,
                        tipo: diferenca > 0 ? 'entrada' : 'saida',
                        quantidade: Math.abs(diferenca),
                        motivo: 'Ajuste manual de cadastro',
                        estoqueAnterior: estoqueOriginal,
                        estoqueAtual: estoqueNovo,
                    }, empresa.id);
                }
            }

            navigate('/estoque'); // Voltar para a lista
        } catch (error) {
            setError(error.message || 'Erro ao salvar');
        } finally {
            setSalvando(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja excluir este item?')) return;
        try {
            await storage.softDelete('produtos', id);
            navigate('/estoque');
        } catch (err) {
            setError('Erro ao excluir item.');
        }
    }


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
                <div className="animate-pulse-soft text-primary">
                    <span className="material-symbols-outlined text-5xl">sync</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-background-light dark:bg-background-dark">
            {/* Header Sticky */}
            <header className="sticky top-0 z-10 bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                <div className="flex items-center gap-3 px-4 py-3 max-w-5xl mx-auto w-full">
                    <button
                        onClick={() => navigate('/estoque')}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold text-text-light dark:text-text-dark">
                        {isEdicao ? 'Editar Item' : 'Novo Item'}
                    </h1>
                </div>
            </header>

            {/* Form Container */}
            <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-5xl mx-auto w-full pb-24">
                {error && (
                    <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error flex items-center gap-2">
                        <span className="material-symbols-outlined">error</span>
                        {error}
                    </div>
                )}

                {/* Seção 1: Identificação */}
                <div className="card p-5 space-y-4">
                    <h3 className="section-header mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">dataset</span>
                        Identificação
                    </h3>

                    {/* Tipo */}
                    <div className="flex gap-4 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="tipo"
                                value="produto"
                                checked={form.tipo === 'produto'}
                                onChange={handleChange}
                                disabled={isEdicao}
                                className="w-4 h-4 text-primary focus:ring-primary"
                            />
                            <span className="text-text-light dark:text-text-dark font-medium">Produto</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="tipo"
                                value="servico"
                                checked={form.tipo === 'servico'}
                                onChange={handleChange}
                                disabled={isEdicao}
                                className="w-4 h-4 text-primary focus:ring-primary"
                            />
                            <span className="text-text-light dark:text-text-dark font-medium">Serviço</span>
                        </label>
                    </div>

                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Nome do Item *
                        </label>
                        <input
                            type="text"
                            name="nome"
                            value={form.nome}
                            onChange={handleChange}
                            className="input font-medium"
                            placeholder={isProduto ? 'Ex: Óleo 5W30 Sintético' : 'Ex: Troca de Óleo'}
                            required
                        />
                    </div>

                    {/* Identificadores */}
                    {isProduto && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                    Código de Barras
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        name="codigoBarras"
                                        value={form.codigoBarras}
                                        onChange={handleChange}
                                        className="input font-mono flex-1 min-w-0"
                                        placeholder="789..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.preventDefault();
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        title="Usar leitor"
                                        onClick={() => alert('Clique aqui e use o leitor.')}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">barcode_reader</span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                    Referência (Fab)
                                </label>
                                <input
                                    type="text"
                                    name="referencia"
                                    value={form.referencia}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Ex: 0243..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                    Marca
                                </label>
                                <CreatableSelect
                                    name="marca"
                                    value={form.marca}
                                    onChange={handleChange}
                                    options={[
                                        "Wurth", "Bosch", "Tecfil", "Mann", "Mahle", "Cofap", "Nakata", "Moura",
                                        "Castrol", "Mobil", "Shell", "Ipiranga", "Petronas", "Lubrax"
                                    ]}
                                    placeholder="Ex: Wurth..."
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Seção 2: Detalhes Técnicos */}
                <div className="card p-5 space-y-4">
                    <h3 className="section-header mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">tune</span>
                        Detalhes Técnicos
                    </h3>

                    {isProduto && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                    Classificação
                                </label>
                                <CreatableSelect
                                    name="classificacao"
                                    value={form.classificacao}
                                    onChange={handleChange}
                                    options={[
                                        "Lubrificantes", "Filtros", "Freios", "Suspensão", "Motor",
                                        "Elétrica", "Acessórios", "Ferragens", "Pneus", "Refrigeração", "Transmissão"
                                    ]}
                                    placeholder="Selecione..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                    Unidade
                                </label>
                                <select
                                    name="unidade"
                                    value={form.unidade}
                                    onChange={handleChange}
                                    className="input"
                                >
                                    {unidades.map((u) => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {isProduto && (
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Aplicação (Veículos Compatíveis)
                            </label>
                            <div className="relative">
                                <span className="absolute top-3 left-3 material-symbols-outlined text-gray-400 text-lg">directions_car</span>
                                <textarea
                                    name="aplicacao"
                                    value={form.aplicacao}
                                    onChange={handleChange}
                                    className="input pl-10 min-h-[60px] resize-y font-mono text-sm leading-relaxed"
                                    placeholder="Ex: Gol G5, Palio, Corsa, Honda Civic..."
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Descrição Detalhada
                        </label>
                        <textarea
                            name="descricao"
                            value={form.descricao}
                            onChange={handleChange}
                            className="input min-h-[80px] resize-y"
                            placeholder="Informações adicionais, especificações..."
                        />
                    </div>

                    {/* Serviço Rápido (apenas para serviços) */}
                    {!isProduto && (
                        <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 cursor-pointer border border-dashed border-gray-300 dark:border-gray-700">
                            <input
                                type="checkbox"
                                checked={form.servicoRapido}
                                onChange={(e) => setForm(prev => ({ ...prev, servicoRapido: e.target.checked }))}
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div>
                                <p className="font-medium text-text-light dark:text-text-dark text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg text-primary">bolt</span>
                                    Serviço Rápido (Atalho)
                                </p>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                    Exibe este serviço nos atalhos rápidos da OS.
                                </p>
                            </div>
                        </label>
                    )}
                </div>

                {/* Seção 3: Comercial & Estoque */}
                <div className="card p-5 space-y-4">
                    <h3 className="section-header mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">attach_money</span>
                        Comercial & Estoque
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        {isProduto && (
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                    Custo (R$)
                                </label>
                                <input
                                    type="number"
                                    name="precoCusto"
                                    value={form.precoCusto}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="0,00"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        )}
                        <div className={isProduto ? '' : 'col-span-2'}>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Preço Venda (R$) *
                            </label>
                            <input
                                type="number"
                                name="precoVenda"
                                value={form.precoVenda}
                                onChange={handleChange}
                                className="input font-bold text-primary text-lg"
                                placeholder="0,00"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    {isProduto && (
                        <>
                            <div className="grid grid-cols-3 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                        Qtd Atual
                                    </label>
                                    <input
                                        type="number"
                                        name="quantidade"
                                        value={form.quantidade}
                                        onChange={handleChange}
                                        className="input bg-gray-50 dark:bg-gray-800"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                        Est. Mínimo
                                    </label>
                                    <input
                                        type="number"
                                        name="estoqueMinimo"
                                        value={form.estoqueMinimo}
                                        onChange={handleChange}
                                        className="input"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                        Fornecedor
                                    </label>
                                    <select
                                        name="fornecedorId"
                                        value={form.fornecedorId}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        <option value="">Selecione...</option>
                                        {fornecedores.map(f => (
                                            <option key={f.id} value={f.id}>{f.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Fixo */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-light dark:bg-surface-dark border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] z-20">
                    <div className="max-w-5xl mx-auto flex gap-3">
                        {isEdicao && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="p-2.5 rounded-xl text-error hover:bg-error/10 transition-colors"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => navigate('/estoque')}
                            className="btn-secondary flex-1"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={salvando}
                            className="btn-primary flex-1 shadow-lg shadow-primary/20"
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
            </form>
        </div>
    );
};

export default CadastroProduto;
