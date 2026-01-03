import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import storage from '../../lib/storage';
import { toTitleCase } from '../../lib/utils';
import useTableColumns from '../../hooks/useTableColumns';
import ColumnToggler from '../../components/common/ColumnToggler';

const ListaVeiculos = () => {
    const { empresa } = useAuth();
    const navigate = useNavigate();
    const [veiculos, setVeiculos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');

    const columnsConfig = [
        { id: 'veiculo', label: 'Veículo' },
        { id: 'placa', label: 'Placa' },
        { id: 'ano', label: 'Ano' },
        { id: 'proprietario', label: 'Proprietário' },
    ];

    const { visibleColumns, toggleColumn, isVisible } = useTableColumns(
        'veiculos_list_v1',
        columnsConfig.map(c => c.id)
    );

    useEffect(() => {
        carregarDados();
    }, [empresa]);

    const carregarDados = async () => {
        if (!empresa) return;
        try {
            const [veiculosData, clientesData] = await Promise.all([
                storage.getAll('veiculos', empresa.id),
                storage.getAll('clientes', empresa.id),
            ]);
            setVeiculos(veiculosData.filter((v) => v.ativo));
            setClientes(clientesData);
        } catch (error) {
            console.error('Erro ao carregar veículos:', error);
        } finally {
            setLoading(false);
        }
    };

    const getClienteNome = (clienteId) => {
        const cliente = clientes.find((c) => c.id === clienteId);
        return cliente?.nome || '-';
    };

    const veiculosFiltrados = veiculos.filter((veiculo) => {
        if (!busca) return true;
        const termo = busca.toLowerCase();
        return (
            veiculo.marca?.toLowerCase().includes(termo) ||
            veiculo.modelo?.toLowerCase().includes(termo) ||
            veiculo.placa?.toLowerCase().includes(termo) ||
            getClienteNome(veiculo.clienteId).toLowerCase().includes(termo)
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
        <div className="p-4 lg:p-6">
            {/* Header - estilo Stitch */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-lg font-bold text-text-light dark:text-text-dark">
                        Veículos
                    </h1>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        {veiculosFiltrados.length} veículo(s)
                    </p>
                </div>
                <div className="flex gap-2">
                    <ColumnToggler
                        columns={columnsConfig}
                        visibleColumns={visibleColumns}
                        onToggle={toggleColumn}
                    />
                    <Link to="/veiculos/novo" className="btn-primary py-2 px-4 text-sm">
                        <span className="material-symbols-outlined text-lg">add</span>
                        Novo Veículo
                    </Link>
                </div>
            </div>

            {/* Filtros */}
            <div className="card mb-4">
                <div className="p-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <span className="material-symbols-outlined text-lg">search</span>
                        </div>
                        <input
                            type="text"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border-none ring-1 ring-gray-200 dark:ring-gray-700 text-sm focus:ring-primary"
                            placeholder="Buscar por marca, modelo, placa ou cliente..."
                        />
                    </div>
                </div>
            </div>

            {/* Tabela - estilo Stitch */}
            {
                veiculosFiltrados.length === 0 ? (
                    <div className="card p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-gray-400">directions_car_off</span>
                        </div>
                        <p className="text-text-light dark:text-text-dark font-medium mb-1">
                            {busca ? 'Nenhum veículo encontrado' : 'Nenhum veículo cadastrado'}
                        </p>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
                            {busca ? 'Tente ajustar sua busca.' : 'Cadastre através do perfil do cliente.'}
                        </p>
                        {!busca && (
                            <Link to="/clientes" className="btn-secondary py-2 px-4 text-sm">
                                Ver Clientes
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                                        {isVisible('veiculo') && (
                                            <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                                Veículo
                                            </th>
                                        )}
                                        {isVisible('placa') && (
                                            <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                                Placa
                                            </th>
                                        )}
                                        {isVisible('ano') && (
                                            <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider hidden md:table-cell">
                                                Ano
                                            </th>
                                        )}
                                        {isVisible('proprietario') && (
                                            <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider hidden sm:table-cell">
                                                Proprietário
                                            </th>
                                        )}
                                        <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider w-10">
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {veiculosFiltrados.map((veiculo, index) => (
                                        <tr
                                            key={veiculo.id}
                                            onClick={() => navigate(`/veiculos/${veiculo.id}/editar`)}
                                            className={`
                                            cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50
                                            ${index !== veiculosFiltrados.length - 1 ? 'border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]' : ''}
                                        `}
                                        >
                                            {isVisible('veiculo') && (
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                            <span className="material-symbols-outlined text-sm">directions_car</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                                                                {toTitleCase(veiculo.marca)} {toTitleCase(veiculo.modelo)}
                                                            </p>
                                                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark sm:hidden">
                                                                {getClienteNome(veiculo.clienteId)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            {isVisible('placa') && (
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-xs text-text-light dark:text-text-dark">
                                                        {veiculo.placa}
                                                    </span>
                                                </td>
                                            )}
                                            {isVisible('ano') && (
                                                <td className="py-3 px-4 hidden md:table-cell">
                                                    <span className="text-sm text-text-light dark:text-text-dark">
                                                        {veiculo.ano || '-'}
                                                    </span>
                                                </td>
                                            )}
                                            {isVisible('proprietario') && (
                                                <td className="py-3 px-4 hidden sm:table-cell">
                                                    <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark truncate">
                                                        {getClienteNome(veiculo.clienteId)}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="py-3 px-4">
                                                <span className="material-symbols-outlined text-gray-400 text-lg">
                                                    chevron_right
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ListaVeiculos;
