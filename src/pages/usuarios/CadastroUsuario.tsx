import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import storage from '../../lib/storage';
import { Usuario, PerfilUsuario } from '../../types';

interface CadastroUsuarioProps {
    usuarioId?: string;
    isTabMode?: boolean;
    onClose?: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    onTitleChange?: (title: string) => void;
}

interface UsuarioForm {
    nome: string;
    email: string;
    senha: string;
    perfil: PerfilUsuario;
    comissao: string | number;
    ativo: boolean;
}

const CadastroUsuario = ({ usuarioId, isTabMode, onClose, onDirtyChange, onTitleChange }: CadastroUsuarioProps) => {
    const { empresa, usuario: usuarioLogado } = useAuth();
    const { registerSaveHandler, unregisterSaveHandler } = useTabs();
    const navigate = useNavigate();
    const params = useParams();
    const id = usuarioId || params.id; // Prioriza prop (TabMode) sobre URL
    const isEdicao = !!id;
    const isProprioUsuario = !!id && !!usuarioLogado && id === usuarioLogado.id;

    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    // Refs para callbacks que podem mudar - evita loops infinitos
    const onDirtyChangeRef = useRef(onDirtyChange);
    const onTitleChangeRef = useRef(onTitleChange);

    // Manter refs atualizadas
    useEffect(() => {
        onDirtyChangeRef.current = onDirtyChange;
        onTitleChangeRef.current = onTitleChange;
    });

    const [form, setForm] = useState<UsuarioForm>({
        nome: '',
        email: '',
        senha: '',
        perfil: 'tecnico',
        comissao: '',
        ativo: true
    });

    const carregarUsuario = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const usuario = await storage.getById<Usuario>('usuarios', id);
            if (usuario) {
                setForm({
                    nome: usuario.nome || '',
                    email: usuario.email || '',
                    senha: '', // Senha é sempre vazia na edição
                    perfil: usuario.perfil || 'tecnico',
                    comissao: usuario.comissao !== undefined ? usuario.comissao : '',
                    ativo: usuario.ativo !== false
                });
            }
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            setError('Erro ao carregar dados do usuário');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (isEdicao) {
            carregarUsuario();
        }
    }, [id, isEdicao, carregarUsuario]);

    // Comunicar dirty state para aba
    useEffect(() => {
        if (isTabMode) onDirtyChangeRef.current?.(isDirty);
    }, [isDirty, isTabMode]);

    // Comunicar título para aba
    useEffect(() => {
        if (isTabMode) {
            onTitleChangeRef.current?.(form?.nome || 'Novo Usuário');
        }
    }, [form?.nome, isTabMode]);

    // Função de salvar para saveHandler
    const salvarUsuario = useCallback(async () => {
        if (!empresa?.id) return;
        if (!form.nome.trim()) throw new Error('Nome é obrigatório');
        if (!form.email.trim()) throw new Error('Email é obrigatório');
        if (!isEdicao && !form.senha) throw new Error('Senha é obrigatória');

        // Verificar email duplicado
        const usuarios = await storage.getAll<Usuario>('usuarios', empresa.id);
        const emailExiste = usuarios.some(
            (u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== id
        );
        if (emailExiste) throw new Error('Email já cadastrado');

        const payload: any = { // Using partial type or any for strict payload construction
            nome: form.nome,
            email: form.email.toLowerCase(),
            perfil: form.perfil,
            comissao: form.perfil === 'tecnico' ? (Number(form.comissao) || 0) : null,
            ativo: form.ativo,
            empresaId: empresa.id
        };
        if (form.senha) payload.senha = form.senha;

        if (isEdicao && id) {
            await storage.update('usuarios', id, payload);
        } else {
            await storage.create('usuarios', payload, empresa.id);
        }
        setIsDirty(false);
    }, [form, id, isEdicao, empresa?.id]);

    // Registrar saveHandler
    useEffect(() => {
        if (isTabMode) {
            // Funciona para edição (usuario-{id}) e para novo (usuario-novo)
            const tabId = usuarioId ? `usuario-${usuarioId}` : 'usuario-novo';
            registerSaveHandler(tabId, salvarUsuario);
            return () => unregisterSaveHandler(tabId);
        }
    }, [isTabMode, usuarioId, salvarUsuario, registerSaveHandler, unregisterSaveHandler]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setIsDirty(true);
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSalvando(true);

        try {
            await salvarUsuario();
            if (isTabMode) {
                onClose?.();
            } else {
                navigate('/usuarios');
            }
        } catch (error: any) {
            setError(error.message || 'Erro ao salvar');
        } finally {
            setSalvando(false);
        }
    };

    const handleDelete = async () => {
        if (!isEdicao || isProprioUsuario || !id) return;

        if (window.confirm('Deseja realmente excluir este usuário?')) {
            try {
                await storage.softDelete('usuarios', id);
                if (isTabMode) {
                    onClose?.();
                } else {
                    navigate('/usuarios');
                }
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
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
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
                        onClick={() => isTabMode ? onClose?.() : navigate('/usuarios')}
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
