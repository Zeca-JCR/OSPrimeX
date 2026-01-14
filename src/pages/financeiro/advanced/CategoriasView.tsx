// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import storage from '../../../lib/storage';

const CategoriasView = () => {
    const { empresa } = useAuth();
    const { showToast } = useToast();
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategoria, setEditingCategoria] = useState(null);

    // Estado do formulário
    const [form, setForm] = useState({
        nome: '',
        tipo: 'despesa', // despesa, receita
        cor: '#ef4444',
        icone: 'label'
    });

    useEffect(() => {
        carregarCategorias();
    }, [empresa]);

    const carregarCategorias = async () => {
        if (!empresa) return;
        setLoading(true);
        try {
            const data = await storage.getAll('categorias_financeiras', empresa.id);
            setCategorias(data.sort((a, b) => a.nome.localeCompare(b.nome)));
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            showToast('Erro ao carregar categorias', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCategoria) {
                await storage.update('categorias_financeiras', editingCategoria.id, form);
                showToast('Categoria atualizada com sucesso!', 'success');
            } else {
                await storage.create('categorias_financeiras', form, empresa.id);
                showToast('Categoria criada com sucesso!', 'success');
            }
            setShowModal(false);
            setEditingCategoria(null);
            resetForm();
            carregarCategorias();
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
            showToast('Erro ao salvar categoria', 'error');
        }
    };

    const handleEdit = (categoria) => {
        setEditingCategoria(categoria);
        setForm({
            nome: categoria.nome,
            tipo: categoria.tipo,
            cor: categoria.cor,
            icone: categoria.icone || 'label'
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
            try {
                await storage.hardDelete('categorias_financeiras', id);
                showToast('Categoria excluída com sucesso!', 'success');
                carregarCategorias();
            } catch (error) {
                console.error('Erro ao excluir categoria:', error);
                showToast('Erro ao excluir categoria', 'error');
            }
        }
    };

    const resetForm = () => {
        setForm({
            nome: '',
            tipo: 'despesa',
            cor: '#ef4444',
            icone: 'label'
        });
    };

    const openNewModal = () => {
        setEditingCategoria(null);
        resetForm();
        setShowModal(true);
    };

    const iconesDisponiveis = [
        // Finanças
        'attach_money', 'savings', 'trending_up', 'trending_down', 'account_balance', 'credit_card', 'receipt', 'payments', 'wallet',
        // Compras e Vendas
        'shopping_cart', 'store', 'sell', 'shopping_bag', 'local_offer', 'redeem',
        // Transporte
        'directions_car', 'local_shipping', 'two_wheeler', 'flight', 'commute', 'local_gas_station', 'parking', 'car_repair',
        // Alimentação
        'restaurant', 'lunch_dining', 'local_cafe', 'local_bar', 'fastfood', 'kitchen',
        // Casa e Escritório
        'home', 'apartment', 'build', 'business_center', 'monitor', 'smartphone', 'print', 'chair', 'lightbulb',
        // Serviços e Contas
        'water_drop', 'bolt', 'wifi', 'cleaning_services', 'security', 'medical_services', 'school',
        // Pessoal e Lazer
        'person', 'groups', 'fitness_center', 'sports_soccer', 'movie', 'pets', 'celebration', 'style', 'travel_explore',
        // Outros
        'work', 'visibility', 'star', 'favorite', 'label', 'description'
    ];

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                    Gerenciar Categorias
                </h3>
                <button
                    onClick={openNewModal}
                    className="btn-primary flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">add</span>
                    Nova Categoria
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lista de Receitas */}
                <div className="space-y-3">
                    <h4 className="font-medium text-green-600 dark:text-green-400 flex items-center gap-2 mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                        <span className="material-symbols-outlined">trending_up</span>
                        Receitas
                    </h4>
                    {categorias.filter(c => c.tipo === 'receita').length === 0 && (
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark italic">
                            Nenhuma categoria de receita cadastrada.
                        </p>
                    )}
                    {categorias.filter(c => c.tipo === 'receita').map(categoria => (
                        <div key={categoria.id} className="card p-3 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                                    style={{ backgroundColor: categoria.cor || '#22c55e' }}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {categoria.icone || 'label'}
                                    </span>
                                </div>
                                <span className="font-medium text-text-light dark:text-text-dark">
                                    {categoria.nome}
                                </span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(categoria)}
                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500"
                                >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(categoria.id)}
                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Lista de Despesas */}
                <div className="space-y-3">
                    <h4 className="font-medium text-red-600 dark:text-red-400 flex items-center gap-2 mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                        <span className="material-symbols-outlined">trending_down</span>
                        Despesas
                    </h4>
                    {categorias.filter(c => c.tipo === 'despesa').length === 0 && (
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark italic">
                            Nenhuma categoria de despesa cadastrada.
                        </p>
                    )}
                    {categorias.filter(c => c.tipo === 'despesa').map(categoria => (
                        <div key={categoria.id} className="card p-3 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                                    style={{ backgroundColor: categoria.cor || '#ef4444' }}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {categoria.icone || 'label'}
                                    </span>
                                </div>
                                <span className="font-medium text-text-light dark:text-text-dark">
                                    {categoria.nome}
                                </span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(categoria)}
                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500"
                                >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(categoria.id)}
                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de Criação/Edição */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="card w-full max-w-md animate-slideUp p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-text-light dark:text-text-dark">
                                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                    Tipo
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="tipo"
                                            value="despesa"
                                            checked={form.tipo === 'despesa'}
                                            onChange={(e) => setForm({ ...form, tipo: e.target.value, cor: '#ef4444' })}
                                            className="text-red-600 focus:ring-red-500"
                                        />
                                        <span className="text-text-light dark:text-text-dark">Despesa</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="tipo"
                                            value="receita"
                                            checked={form.tipo === 'receita'}
                                            onChange={(e) => setForm({ ...form, tipo: e.target.value, cor: '#22c55e' })}
                                            className="text-green-600 focus:ring-green-500"
                                        />
                                        <span className="text-text-light dark:text-text-dark">Receita</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                    Nome da Categoria
                                </label>
                                <input
                                    type="text"
                                    value={form.nome}
                                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                    placeholder="Ex: Aluguel, Vendas, Salários..."
                                    className="input w-full"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                        Cor
                                    </label>
                                    <input
                                        type="color"
                                        value={form.cor}
                                        onChange={(e) => setForm({ ...form, cor: e.target.value })}
                                        className="h-10 w-full rounded cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                        Ãcone
                                    </label>
                                    <div className="relative">
                                        <div className="flex flex-wrap gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-2 max-h-48 overflow-y-auto">
                                            {iconesDisponiveis.map(icone => (
                                                <button
                                                    key={icone}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, icone })}
                                                    className={`p-2 rounded-lg flex items-center justify-center transition-colors ${form.icone === icone ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                    title={icone}
                                                >
                                                    <span className="material-symbols-outlined text-2xl">{icone}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary w-full mt-2">
                                Salvar
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoriasView;

