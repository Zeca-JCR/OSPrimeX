// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import { useNavigate, Link } from 'react-router-dom';
import storage from '../../lib/storage';
import { toTitleCase } from '../../lib/utils';

const Fornecedores = () => {
    const { empresa } = useAuth();
    const navigate = useNavigate();
    const { openTab } = useTabs();
    const [fornecedores, setFornecedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');

    useEffect(() => {
        carregarFornecedores();
    }, [empresa]);

    const carregarFornecedores = async () => {
        if (!empresa) return;
        try {
            const data = await storage.getAll('fornecedores', empresa.id);
            setFornecedores(data.filter((f) => f.ativo !== false));
        } catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExcluir = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Deseja realmente excluir este fornecedor?')) {
            try {
                await storage.softDelete('fornecedores', id);
                carregarFornecedores();
            } catch (error) {
                console.error('Erro ao excluir:', error);
            }
        }
    };

    const handleOpenFornecedor = (fornecedor) => {
        openTab({
            id: `fornecedor-${fornecedor.id}`,
            type: 'fornecedor',
            title: fornecedor.nome || 'Fornecedor',
            data: { fornecedorId: fornecedor.id }
        });
    };

    const handleNovoFornecedor = () => {
        openTab({
            id: 'fornecedor-novo',
            type: 'fornecedor',
            title: 'Novo Fornecedor',
            data: {}
        });
    };

    const fornecedoresFiltrados = fornecedores.filter((f) => {
        const termo = busca.toLowerCase();
        return (
            f.nome?.toLowerCase().includes(termo) ||
            f.documento?.includes(termo) ||
            f.contato?.toLowerCase().includes(termo) ||
            f.categoria?.toLowerCase().includes(termo)
        );
    });

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
        <div className="p-4 lg:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-text-light dark:text-text-dark">
                        Fornecedores
                    </h1>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        Gerencie seus parceiros de negócio
                    </p>
                </div>
                <button
                    onClick={handleNovoFornecedor}
                    className="btn-primary py-2 px-4 text-sm flex items-center gap-1"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Novo Fornecedor
                </button>
            </div>

            {/* Barra de Busca */}
            <div className="card p-4">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por nome, contato ou categoria..."
                        className="input pl-10 w-full"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabela - estilo Stitch (Igual Clientes) */}
            {fornecedoresFiltrados.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-gray-400">local_shipping</span>
                    </div>
                    <p className="text-text-light dark:text-text-dark font-medium mb-1">
                        {busca ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
                    </p>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
                        {busca ? 'Tente ajustar sua busca.' : 'Comece cadastrando seu primeiro fornecedor.'}
                    </p>
                    {!busca && (
                        <button onClick={handleNovoFornecedor} className="btn-primary py-2 px-4 text-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-lg">add</span>
                            Novo Fornecedor
                        </button>
                    )}
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                        Fornecedor
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider hidden sm:table-cell">
                                        Contato
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider hidden md:table-cell">
                                        Categoria
                                    </th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {fornecedoresFiltrados.map((fornecedor, index) => (
                                    <tr
                                        key={fornecedor.id}
                                        onClick={() => handleOpenFornecedor(fornecedor)}
                                        className={`
                                            cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50
                                            ${index !== fornecedoresFiltrados.length - 1 ? 'border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]' : ''}
                                        `}
                                    >
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                                                    {fornecedor.nome?.charAt(0) || 'F'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                                                        {toTitleCase(fornecedor.nome)}
                                                    </p>
                                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">
                                                        {fornecedor.documento || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 hidden sm:table-cell">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-text-light dark:text-text-dark truncate">
                                                    {fornecedor.contato}
                                                </span>
                                                <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">
                                                    {fornecedor.telefone}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 hidden md:table-cell">
                                            {fornecedor.categoria && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                                    {toTitleCase(fornecedor.categoria)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => handleExcluir(fornecedor.id, e)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                                <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Fornecedores;

