import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import { useTenant } from '../../contexts/TenantContext';
import { useNavigate } from 'react-router-dom';
import storage from '../../lib/storage';
import { Usuario } from '../../types';

interface ListaUsuariosProps {
    isTabMode?: boolean;
    onClose?: () => void;
}

const ListaUsuarios = ({ isTabMode, onClose }: ListaUsuariosProps = {}) => {
    const { empresa, usuario: usuarioLogado, isAdmin } = useAuth();
    const { getLimiteUsuarios } = useTenant();
    const navigate = useNavigate();
    const { openTab } = useTabs();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarUsuarios();
    }, [empresa]);

    const carregarUsuarios = async () => {
        if (!empresa) return;
        try {
            const data = await storage.getAll<Usuario>('usuarios', empresa.id);
            setUsuarios(data.filter((u) => u.ativo));
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        } finally {
            setLoading(false);
        }
    };

    const limite = getLimiteUsuarios();
    const podeAdicionar = usuarios.length < limite;

    const handleNew = () => {
        if (!podeAdicionar) {
            alert(`Limite de ${limite} usuários atingido. Faça upgrade do plano.`);
            return;
        }
        openTab({
            id: 'usuario-novo',
            type: 'usuario',
            title: 'Novo Usuário',
            data: {}
        });
    };

    const handleExcluir = async (usuarioExcluir: Usuario, e: React.MouseEvent) => {
        e.stopPropagation();
        if (usuarioExcluir.id === usuarioLogado.id) {
            alert('Você não pode excluir seu próprio usuário.');
            return;
        }
        if (confirm('Deseja realmente excluir este usuário?')) {
            try {
                await storage.softDelete('usuarios', usuarioExcluir.id);
                carregarUsuarios();
            } catch (error) {
                console.error('Erro ao excluir:', error);
            }
        }
    };

    const perfilLabels: Record<string, string> = {
        admin: 'Administrador',
        tecnico: 'Técnico',
        financeiro: 'Financeiro',
    };

    const perfilColors = {
        admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        tecnico: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        financeiro: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };

    const handleOpenUsuario = (usuario: Usuario) => {
        openTab({
            id: `usuario-${usuario.id}`,
            type: 'usuario',
            title: usuario.nome || 'Usuário',
            data: { usuarioId: usuario.id }
        });
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
            {/* Header - estilo Stitch */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
                        Usuários
                    </h1>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        Gerencie os usuários do sistema
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleNew}
                        className={`btn-primary py-2 px-4 text-sm ${!podeAdicionar ? 'opacity-50' : ''}`}
                    >
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        Novo Usuário
                    </button>
                )}
            </div>

            {/* Barra de progresso compacta */}
            <div className="card p-3">
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${usuarios.length >= limite ? 'bg-error' : 'bg-primary'}`}
                                style={{ width: `${Math.min((usuarios.length / limite) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                    <span className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
                        {usuarios.length}/{limite}
                    </span>
                </div>
                {!podeAdicionar && (
                    <p className="text-xs text-warning mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        Limite atingido
                    </p>
                )}
            </div>

            {/* Tabela de usuários - estilo Stitch */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                                <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                    Usuário
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider hidden sm:table-cell">
                                    Email
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                                    Perfil
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider hidden md:table-cell">
                                    Comissão
                                </th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map((usuario, index) => (
                                <tr
                                    key={usuario.id}
                                    onClick={() => isAdmin && handleOpenUsuario(usuario)}
                                    className={`
                                        ${isAdmin ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''} transition-colors
                                        ${index !== usuarios.length - 1 ? 'border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]' : ''}
                                    `}
                                >
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                                                {usuario.nome?.charAt(0) || 'U'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                                                        {usuario.nome}
                                                    </p>
                                                    {usuario.id === usuarioLogado?.id && (
                                                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">(você)</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark sm:hidden truncate">
                                                    {usuario.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 hidden sm:table-cell">
                                        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark truncate">
                                            {usuario.email}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${perfilColors[usuario.perfil]}`}>
                                            {perfilLabels[usuario.perfil]}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 hidden md:table-cell">
                                        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                            {usuario.perfil === 'tecnico' && usuario.comissao ? `${usuario.comissao}%` : '-'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        {isAdmin && (
                                            <div className="flex items-center justify-end gap-2">
                                                {usuario.id !== usuarioLogado?.id && (
                                                    <button
                                                        onClick={(e) => handleExcluir(usuario, e)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                )}
                                                <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ListaUsuarios;

