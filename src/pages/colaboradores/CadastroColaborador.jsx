import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import storage from '../../lib/storage';

const CadastroColaborador = ({ colaboradorId, isTabMode, onClose, onDirtyChange, onTitleChange }) => {
    const { empresa } = useAuth();
    const { registerSaveHandler, unregisterSaveHandler } = useTabs();
    const navigate = useNavigate();
    const params = useParams();
    const id = colaboradorId || params.id; // Prioriza prop (TabMode) sobre URL
    const isEdicao = !!id;

    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    const [form, setForm] = useState({
        nome: '',
        cargo: 'tecnico',
        comissao: '',
        ativo: true,
        observacoes: ''
    });

    useEffect(() => {
        if (isEdicao) {
            carregarColaborador();
        }
    }, [id]);

    // Comunicar dirty state para aba
    useEffect(() => {
        if (isTabMode) onDirtyChange?.(isDirty);
    }, [isDirty, isTabMode, onDirtyChange]);

    // Comunicar título para aba
    useEffect(() => {
        if (isTabMode) {
            onTitleChange?.(form?.nome || 'Novo Colaborador');
        }
    }, [form?.nome, isTabMode, onTitleChange]);

    // Função de salvar para saveHandler
    const salvarColaborador = useCallback(async () => {
        if (!form.nome.trim()) throw new Error('Nome é obrigatório');
        const payload = {
            ...form,
            comissao: parseFloat(form.comissao) || 0,
            empresaId: empresa.id
        };
        if (isEdicao) {
            await storage.update('colaboradores', id, payload);
        } else {
            await storage.create('colaboradores', payload, empresa.id);
        }
        setIsDirty(false);
    }, [form, id, isEdicao, empresa?.id]);

    // Registrar saveHandler
    useEffect(() => {
        if (isTabMode && colaboradorId) {
            const tabId = `colaborador-${colaboradorId}`;
            registerSaveHandler(tabId, salvarColaborador);
            return () => unregisterSaveHandler(tabId);
        }
    }, [isTabMode, colaboradorId, salvarColaborador, registerSaveHandler, unregisterSaveHandler]);

    const carregarColaborador = async () => {
        setLoading(true);
        try {
            const colaborador = await storage.getById('colaboradores', id);
            if (colaborador) {
                setForm({
                    nome: colaborador.nome || '',
                    cargo: colaborador.cargo || 'tecnico',
                    comissao: colaborador.comissao || '',
                    ativo: colaborador.ativo !== false,
                    observacoes: colaborador.observacoes || ''
                });
            }
        } catch (error) {
            console.error('Erro ao carregar colaborador:', error);
            setError('Erro ao carregar dados do colaborador');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setIsDirty(true);
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSalvando(true);

        try {
            if (!form.nome.trim()) throw new Error('Nome é obrigatório');

            const payload = {
                ...form,
                comissao: parseFloat(form.comissao) || 0,
                empresaId: empresa.id
            };

            if (isEdicao) {
                await storage.update('colaboradores', id, payload);
            } else {
                await storage.create('colaboradores', payload, empresa.id);
            }

            setIsDirty(false);
            if (isTabMode) {
                onClose?.();
            } else {
                navigate('/colaboradores');
            }
        } catch (error) {
            setError(error.message || 'Erro ao salvar');
        } finally {
            setSalvando(false);
        }
    };

    const handleDelete = async () => {
        if (!isEdicao) return;

        if (window.confirm('Deseja realmente excluir este colaborador?')) {
            try {
                // Validação: Verificar vínculo com OS
                const ordens = await storage.getAll('ordens_servico', empresa?.id);
                const emUso = ordens.some(os => os.responsavelId === id || os.mecanicoId === id);

                if (emUso) {
                    alert('Não é possível excluir este colaborador pois ele está vinculado a Ordens de Serviço (Responsável ou Mecânico).');
                    return;
                }

                await storage.softDelete('colaboradores', id);
                if (isTabMode) {
                    onClose?.();
                } else {
                    navigate('/colaboradores');
                }
            } catch (error) {
                console.error('Erro ao excluir:', error);
                setError('Erro ao excluir colaborador');
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
                            onClick={() => isTabMode ? onClose?.() : navigate('/colaboradores')}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-text-light dark:text-text-dark">
                                {isEdicao ? 'Editar Colaborador' : 'Novo Colaborador'}
                            </h1>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                {isEdicao ? 'Atualize os dados do colaborador' : 'Adicione um novo membro à equipe'}
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
                        {/* Dados Principais */}
                        <div className="card p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">badge</span>
                                Dados Pessoais
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
                                        placeholder="Ex: Carlos Silva"
                                    />
                                </div>

                                <div>
                                    <label className="label">Cargo</label>
                                    <select
                                        name="cargo"
                                        value={form.cargo}
                                        onChange={handleChange}
                                        className="input w-full"
                                    >
                                        <option value="tecnico">Técnico / Mecânico</option>
                                        <option value="atendente">Atendente / Recepcionista</option>
                                        <option value="gerente">Gerente</option>
                                        <option value="auxiliar">Auxiliar</option>
                                    </select>
                                </div>

                                <div>
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
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Status Card */}
                        <div className="card p-4 space-y-4">
                            <h3 className="font-semibold text-text-light dark:text-text-dark">Status</h3>
                            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-text-light dark:text-text-dark">Ativo</span>
                                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                        Colaborador em atividade
                                    </span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={form.ativo}
                                        onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-success"></div>
                                </div>
                            </label>
                        </div>

                        {/* Observações */}
                        <div className="card p-4 space-y-2">
                            <h3 className="font-semibold text-text-light dark:text-text-dark">Observações</h3>
                            <textarea
                                className="input w-full resize-none h-32 text-sm"
                                placeholder="Anotações sobre o colaborador..."
                                value={form.observacoes}
                                onChange={e => setForm({ ...form, observacoes: e.target.value })}
                            />
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
                            className="p-2.5 rounded-xl text-error hover:bg-error/10 transition-colors"
                            title="Excluir Colaborador"
                        >
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => isTabMode ? onClose?.() : navigate('/colaboradores')}
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

export default CadastroColaborador;
