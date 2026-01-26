import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import storage from '../../lib/storage';
import { formatTelefone, formatDocumento, getIniciais, toTitleCase } from '../../lib/utils';
import ImportarClientesModal from '../../components/clientes/ImportarClientesModal';
import { useToast } from '../../contexts/ToastContext';
import useTableColumns from '../../hooks/useTableColumns';
import ColumnToggler from '../../components/common/ColumnToggler';
import { Cliente } from '../../types';

interface ListaClientesProps {
    isTabMode?: boolean;
    onClose?: () => void;
}

const ListaClientes = ({ isTabMode, onClose }: ListaClientesProps = {}) => {
    const { empresa } = useAuth();
    const { showSaveToast } = useToast();
    const navigate = useNavigate();
    const { openTab } = useTabs();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState('todos');
    const [filtroTag, setFiltroTag] = useState('');
    const [showImportar, setShowImportar] = useState(false);

    const tagsConfig: Record<string, { label: string; color: string }> = {
        vip: { label: 'VIP', color: 'bg-amber-500' },
        recorrente: { label: 'Recorrente', color: 'bg-green-500' },
        novo: { label: 'Novo', color: 'bg-blue-500' },
        indicacao: { label: 'Indicação', color: 'bg-purple-500' },
        importado: { label: 'Importado', color: 'bg-gray-500' },
    };

    const columnsConfig = [
        { id: 'cliente', label: 'Cliente' },
        { id: 'documento', label: 'Documento (CPF/CNPJ)' },
        { id: 'telefone', label: 'Telefone' },
        { id: 'email', label: 'Email' },
    ];

    const { visibleColumns, toggleColumn, isVisible } = useTableColumns(
        'clientes_list_v1',
        columnsConfig.map(c => c.id)
    );

    useEffect(() => {
        carregarClientes();
    }, [empresa]);

    const carregarClientes = async () => {
        if (!empresa) return;
        try {
            const data = await storage.getAll<Cliente>('clientes', empresa.id);
            setClientes(data.filter(c => c.ativo));
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleImportSuccess = (total: number, falhas: number, duplicados = 0) => {
        setShowImportar(false);
        carregarClientes();
        let msg = `Importação concluída! ${total} clientes importados.`;
        if (falhas > 0) msg += ` (${falhas} falhas)`;
        if (duplicados > 0) msg += ` (${duplicados} duplicados ignorados)`;

        if (showSaveToast) showSaveToast(msg);
        else alert(msg);
    };

    const handleOpenCliente = (cliente: Cliente) => {
        openTab({
            id: `cliente-${cliente.id}`,
            type: 'cliente',
            title: cliente.nome || 'Cliente',
            data: { clienteId: cliente.id }
        });
    };

    const handleNovoCliente = () => {
        openTab({
            id: 'cliente-novo',
            type: 'cliente',
            title: 'Novo Cliente',
            data: {}
        });
    };

    // Filtrar clientes
    const clientesFiltrados = clientes.filter((cliente) => {
        if (filtro !== 'todos' && cliente.tipo !== filtro) return false;

        // Filtro por tag
        if (filtroTag && !(cliente.tags || []).includes(filtroTag)) return false;

        if (busca) {
            const termo = busca.toLowerCase();
            return (
                cliente.nome?.toLowerCase().includes(termo) ||
                cliente.documento?.includes(termo) ||
                cliente.telefone?.includes(termo) ||
                cliente.email?.toLowerCase().includes(termo)
            );
        }

        return true;
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
            {/* Header - estilo Stitch */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
                        Clientes
                    </h1>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        Gerencie sua base de clientes
                    </p>
                </div>
                <div className="flex gap-2">
                    <ColumnToggler
                        columns={columnsConfig}
                        visibleColumns={visibleColumns}
                        onToggle={toggleColumn}
                    />
                    <button
                        onClick={() => setShowImportar(true)}
                        className="btn-secondary py-2 px-4 text-sm flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-lg">upload_file</span>
                        Importar
                    </button>
                    <button onClick={handleNovoCliente} className="btn-primary py-2 px-4 text-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">add</span>
                        Novo Cliente
                    </button>
                </div>
            </div>

            {/* Filtros - estilo Stitch */}
            <div className="card">
                <div className="flex flex-col sm:flex-row gap-3 p-3">
                    {/* Busca */}
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <span className="material-symbols-outlined text-lg">search</span>
                        </div>
                        <input
                            type="text"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border-none ring-1 ring-gray-200 dark:ring-gray-700 text-sm focus:ring-primary"
                            placeholder="Buscar por nome, telefone, CPF/CNPJ..."
                        />
                    </div>
                    {/* Filtro de tipo */}
                    <select
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border-none ring-1 ring-gray-200 dark:ring-gray-700 text-sm focus:ring-primary"
                    >
                        <option value="todos">Todos os tipos</option>
                        <option value="pf">Pessoa Física</option>
                        <option value="pj">Pessoa Jurídica</option>
                    </select>
                    {/* Filtro por tag */}
                    <select
                        value={filtroTag}
                        onChange={(e) => setFiltroTag(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border-none ring-1 ring-gray-200 dark:ring-gray-700 text-sm focus:ring-primary"
                    >
                        <option value="">Todas as tags</option>
                        {Object.entries(tagsConfig).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabela - estilo Stitch */}
            {clientesFiltrados.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-gray-400">person_off</span>
                    </div>
                    <p className="text-text-light dark:text-text-dark font-medium mb-1">
                        {busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                    </p>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
                        {busca ? 'Tente ajustar sua busca.' : 'Comece cadastrando seu primeiro cliente.'}
                    </p>
                    {!busca && (
                        <button onClick={handleNovoCliente} className="btn-primary py-2 px-4 text-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-lg">person_add</span>
                            Novo Cliente
                        </button>
                    )}
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                                    {isVisible('cliente') && (
                                        <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                            Cliente
                                        </th>
                                    )}
                                    {isVisible('documento') && (
                                        <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider hidden md:table-cell">
                                            Documento
                                        </th>
                                    )}
                                    {isVisible('telefone') && (
                                        <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider hidden sm:table-cell">
                                            Telefone
                                        </th>
                                    )}
                                    {isVisible('email') && (
                                        <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider hidden lg:table-cell">
                                            Email
                                        </th>
                                    )}
                                    <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider w-10">
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesFiltrados.map((cliente, index) => (
                                    <tr
                                        key={cliente.id}
                                        onClick={() => handleOpenCliente(cliente)}
                                        className={`
                                            cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50
                                            ${index !== clientesFiltrados.length - 1 ? 'border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]' : ''}
                                        `}
                                    >
                                        {isVisible('cliente') && (
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`
                                                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0
                                                        ${cliente.tipo === 'pj'
                                                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                                                            : 'bg-blue-100 dark:bg-blue-900/30 text-primary'
                                                        }
                                                    `}>
                                                        {cliente.tipo === 'pj' ? (
                                                            <span className="material-symbols-outlined text-sm">business</span>
                                                        ) : (
                                                            getIniciais(cliente.nome)
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                                                                {toTitleCase(cliente.nome)}
                                                            </p>
                                                            {(cliente.tags || []).length > 0 && (
                                                                <div className="hidden sm:flex gap-1">
                                                                    {(cliente.tags || []).slice(0, 2).map((tag) => (
                                                                        <span
                                                                            key={tag}
                                                                            className={`text-xs px-1.5 py-0.5 rounded-full text-white ${tagsConfig[tag]?.color || 'bg-gray-400'}`}
                                                                        >
                                                                            {tagsConfig[tag]?.label || tag}
                                                                        </span>
                                                                    ))}
                                                                    {(cliente.tags || []).length > 2 && (
                                                                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                                                            +{(cliente.tags || []).length - 2}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark sm:hidden">
                                                            {formatTelefone(cliente.telefone)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        {isVisible('documento') && (
                                            <td className="py-3 px-4 hidden md:table-cell">
                                                <span className="text-sm text-text-light dark:text-text-dark">
                                                    {formatDocumento(cliente.documento)}
                                                </span>
                                            </td>
                                        )}
                                        {isVisible('telefone') && (
                                            <td className="py-3 px-4 hidden sm:table-cell">
                                                <span className="text-sm text-text-light dark:text-text-dark">
                                                    {formatTelefone(cliente.telefone)}
                                                </span>
                                            </td>
                                        )}
                                        {isVisible('email') && (
                                            <td className="py-3 px-4 hidden lg:table-cell">
                                                <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark truncate">
                                                    {cliente.email || '-'}
                                                </span>
                                            </td>
                                        )}
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openTab({
                                                            id: `cliente-detalhes-${cliente.id}`,
                                                            type: 'cliente-detalhes',
                                                            title: cliente.nome || 'Cliente',
                                                            data: { clienteId: cliente.id }
                                                        });
                                                    }}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark"
                                                    title="Ver painel do cliente"
                                                >
                                                    <span className="material-symbols-outlined text-lg">visibility</span>
                                                </button>
                                                <span className="material-symbols-outlined text-gray-400 text-lg">
                                                    chevron_right
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Importação */}
            {showImportar && (
                <ImportarClientesModal
                    onClose={() => setShowImportar(false)}
                    onSuccess={handleImportSuccess}
                />
            )}
        </div>
    );
};

export default ListaClientes;
