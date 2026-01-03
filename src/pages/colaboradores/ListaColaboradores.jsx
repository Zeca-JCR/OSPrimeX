import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import storage from '../../lib/storage';

const ListaColaboradores = () => {
    const { empresa } = useAuth();
    const navigate = useNavigate();
    const [colaboradores, setColaboradores] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarColaboradores();
    }, [empresa]);

    const carregarColaboradores = async () => {
        if (!empresa) return;
        try {
            const data = await storage.getAll('colaboradores', empresa.id);
            // Se não tiver colaboradores e tiver usuários técnicos, poderíamos sugerir migração aqui no futuro
            setColaboradores(data.filter((c) => c.ativo !== false));
        } catch (error) {
            console.error('Erro ao carregar colaboradores:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExcluir = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Deseja realmente excluir este colaborador?')) {
            try {
                await storage.softDelete('colaboradores', id);
                carregarColaboradores();
            } catch (error) {
                console.error('Erro ao excluir:', error);
            }
        }
    };

    const cargoLabels = {
        tecnico: 'Técnico / Mecânico',
        gerente: 'Gerente',
        atendente: 'Atendente / Recepcionista',
        auxiliar: 'Auxiliar',
    };

    const cargoColors = {
        tecnico: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        gerente: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        atendente: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        auxiliar: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',
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
        <div className="p-4 lg:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-text-light dark:text-text-dark">
                        Colaboradores
                    </h1>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        Gerencie sua equipe técnica e operacional
                    </p>
                </div>
                <button
                    onClick={() => navigate('/colaboradores/novo')}
                    className="btn-primary py-2 px-4 text-sm"
                >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Novo Colaborador
                </button>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                                <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                    Nome
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                    Cargo
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                    Comissão
                                </th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {colaboradores.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-text-secondary-light dark:text-text-secondary-dark">
                                        Nenhum colaborador cadastrado. Adicione sua equipe aqui.
                                    </td>
                                </tr>
                            ) : (
                                colaboradores.map((colaborador, index) => (
                                    <tr
                                        key={colaborador.id}
                                        onClick={() => navigate(`/colaboradores/${colaborador.id}/editar`)}
                                        className={`
                                            cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50
                                            ${index !== colaboradores.length - 1 ? 'border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]' : ''}
                                        `}
                                    >
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                                                    {colaborador.nome?.charAt(0) || 'C'}
                                                </div>
                                                <span className="font-medium text-text-light dark:text-text-dark">
                                                    {colaborador.nome}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${cargoColors[colaborador.cargo] || cargoColors.auxiliar}`}>
                                                {cargoLabels[colaborador.cargo] || colaborador.cargo}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                                {colaborador.comissao ? `${colaborador.comissao}%` : '-'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => handleExcluir(colaborador.id, e)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                                <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ListaColaboradores;
