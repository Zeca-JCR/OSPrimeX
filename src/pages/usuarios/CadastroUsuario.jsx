import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import storage from '../../lib/storage';

const CadastroUsuario = () => {
    const { empresa, usuario: usuarioLogado } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdicao = !!id;
    const isProprioUsuario = id === usuarioLogado?.id;

    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        nome: '',
        email: '',
        senha: '',
        perfil: 'tecnico',
        comissao: '',
        ativo: true
    });

    useEffect(() => {
        if (isEdicao) {
            carregarUsuario();
        }
    }, [id]);

    const carregarUsuario = async () => {
        setLoading(true);
        try {
            const usuario = await storage.getById('usuarios', id);
            if (usuario) {
                setForm({
                    nome: usuario.nome || '',
                    email: usuario.email || '',
                    senha: '', // Senha é sempre vazia na edição
                    perfil: usuario.perfil || 'tecnico',
                    comissao: usuario.comissao || '',
                    ativo: usuario.ativo !== false
                });
            }
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            setError('Erro ao carregar dados do usuário');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSalvando(true);

        try {
            if (!form.nome.trim()) throw new Error('Nome é obrigatório');
            if (!form.email.trim()) throw new Error('Email é obrigatório');
            if (!isEdicao && !form.senha) throw new Error('Senha é obrigatória');

            // Verificar email duplicado
            const usuarios = await storage.getAll('usuarios', empresa.id);
            const emailExiste = usuarios.some(
                (u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== id
            );
            if (emailExiste) throw new Error('Email já cadastrado');

            const payload = {
                nome: form.nome,
                email: form.email.toLowerCase(),
                perfil: form.perfil,
                comissao: form.perfil === 'tecnico' ? (parseFloat(form.comissao) || 0) : null,
                ativo: form.ativo,
                empresaId: empresa.id
            };

            // Só atualiza senha se preenchida
            if (form.senha) {
                payload.senha = form.senha;
            }

            if (isEdicao) {
                await storage.update('usuarios', id, payload);
            } else {
                await storage.create('usuarios', payload, empresa.id);
            }

            navigate('/usuarios');
        } catch (error) {
            setError(error.message || 'Erro ao salvar');
        } finally {
            setSalvando(false);
        }
    };

    const handleDelete = async () => {
        if (!isEdicao || isProprioUsuario) return;

        if (window.confirm('Deseja realmente excluir este usuário?')) {
            try {
                await storage.softDelete('usuarios', id);
                navigate('/usuarios');
            } catch (error) {
                console.error('Erro ao excluir:', error);
                setError('Erro ao excluir usuário');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-pulse-soft text-primary">
                    <span className="material-symbols-outlined text-5xl">sync</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full pb-20 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] sticky top-0 z-20">
                <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto w-full">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/usuarios')}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-text-light dark:text-text-dark">
                                {isEdicao ? 'Editar Usuário' : 'Novo Usuário'}
                            </h1>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                {isEdicao ? 'Gerencie o acesso do usuário' : 'Adicione um novo usuário ao sistema'}
                            </p>
                        </div>
                    </div>
                </div>
            </header>


            <main className="max-w-5xl mx-auto p-4 space-y-6">
                {error && (
                    <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error flex items-center gap-3 animate-slideDown">
                        <span className="material-symbols-outlined text-xl">error</span>
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        {/* Dados de Acesso */}
                        <div className="card p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">badge</span>
                                Informações Pessoais
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="label">
                                        Nome Completo <span className="text-error">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="nome"
                                        required
                                        className="input w-full font-medium"
                                        value={form.nome}
                                        onChange={handleChange}
                                        placeholder="Ex: João da Silva"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="label">
                                        Email <span className="text-error">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        className="input w-full"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="email@empresa.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Segurança */}
                        <div className="card p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">lock</span>
                                Segurança
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="label">
                                        {isEdicao ? 'Nova Senha (opcional)' : 'Senha *'}
                                    </label>
                                    <input
                                        type="password"
                                        name="senha"
                                        required={!isEdicao}
                                        className="input w-full"
                                        value={form.senha}
                                        onChange={handleChange}
                                        placeholder={isEdicao ? "Deixe em branco para manter a atual" : "••••••••"}
                                    />
                                    {isEdicao && <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">Preencha apenas se desejar alterar a senha</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Permissões */}
                        <div className="card p-4 space-y-4">
                            <h3 className="font-semibold text-text-light dark:text-text-dark">Permissões</h3>

                            <div>
                                <label className="label">Perfil de Acesso</label>
                                <select
                                    name="perfil"
                                    value={form.perfil}
                                    onChange={handleChange}
                                    className="input w-full"
                                    disabled={isProprioUsuario}
                                >
                                    <option value="admin">Administrador</option>
                                    <option value="tecnico">Técnico</option>
                                    <option value="financeiro">Financeiro</option>
                                </select>
                                {isProprioUsuario && <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">Você não pode alterar seu próprio perfil</p>}
                            </div>

                            {form.perfil === 'tecnico' && (
                                <div className="animate-slideDown">
                                    <label className="label">Comissão (%)</label>
                                    <input
                                        type="number"
                                        name="comissao"
                                        className="input w-full"
                                        value={form.comissao}
                                        onChange={handleChange}
                                        placeholder="0"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div className="card p-4 space-y-4">
                            <h3 className="font-semibold text-text-light dark:text-text-dark">Status</h3>
                            <label className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${isProprioUsuario ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-text-light dark:text-text-dark">Ativo</span>
                                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                        Acesso ao sistema
                                    </span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={form.ativo}
                                        onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))}
                                        disabled={isProprioUsuario}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-success"></div>
                                </div>
                            </label>
                            {isProprioUsuario && (
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark text-center">
                                    Você não pode desativar seu próprio usuário
                                </p>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-light dark:bg-surface-dark border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] z-30">
                <div className="max-w-5xl mx-auto flex gap-3">
                    {isEdicao && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isProprioUsuario}
                            className={`p-2.5 rounded-xl transition-colors ${isProprioUsuario
                                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                    : 'text-error hover:bg-error/10'
                                }`}
                            title={isProprioUsuario ? "Você não pode se excluir" : "Excluir Usuário"}
                        >
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate('/usuarios')}
                        className="btn-secondary flex-1"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={salvando}
                        className="btn-primary flex-1 shadow-lg shadow-primary/25"
                    >
                        {salvando ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-xl">save</span>
                                Salvar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CadastroUsuario;
