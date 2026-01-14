// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import storage from '../../lib/storage';
import { validaCPF, validaCNPJ } from '../../lib/utils';
import { consultarCNPJ, consultarCEP } from '../../services/api';

const CadastroFornecedor = ({ fornecedorId, isTabMode, onClose, onDirtyChange, onTitleChange }) => {
    const { empresa } = useAuth();
    const { registerSaveHandler, unregisterSaveHandler } = useTabs();
    const navigate = useNavigate();
    const params = useParams();
    const id = fornecedorId || params.id; // Prioriza prop (TabMode) sobre URL
    const isEdicao = !!id;

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

    const [form, setForm] = useState({
        tipo: 'pj',
        nome: '',
        documento: '',
        contato: '',
        telefone: '',
        email: '',
        endereco: {
            cep: '',
            logradouro: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            estado: '',
        },
        categoria: 'pecas',
        observacoes: '',
        ativo: true,
    });

    useEffect(() => {
        if (isEdicao) {
            carregarFornecedor();
        }
    }, [id]);

    // Comunicar dirty state para aba
    useEffect(() => {
        if (isTabMode) onDirtyChangeRef.current?.(isDirty);
    }, [isDirty, isTabMode]);

    // Comunicar título para aba
    useEffect(() => {
        if (isTabMode) {
            onTitleChangeRef.current?.(form?.nome || 'Novo Fornecedor');
        }
    }, [form?.nome, isTabMode]);

    // Função de salvar para saveHandler
    const salvarFornecedor = useCallback(async () => {
        if (!form.nome.trim()) throw new Error('Nome/Razão Social é obrigatório');
        const payload = { ...form, empresaId: empresa.id };
        if (isEdicao) {
            await storage.update('fornecedores', id, payload);
        } else {
            await storage.create('fornecedores', payload, empresa.id);
        }
        setIsDirty(false);
    }, [form, id, isEdicao, empresa?.id]);

    // Registrar saveHandler
    useEffect(() => {
        if (isTabMode) {
            // Funciona para edição (fornecedor-{id}) e para novo (fornecedor-novo)
            const tabId = fornecedorId ? `fornecedor-${fornecedorId}` : 'fornecedor-novo';
            registerSaveHandler(tabId, salvarFornecedor);
            return () => unregisterSaveHandler(tabId);
        }
    }, [isTabMode, fornecedorId, salvarFornecedor, registerSaveHandler, unregisterSaveHandler]);

    const carregarFornecedor = async () => {
        setLoading(true);
        try {
            const fornecedor = await storage.getById('fornecedores', id);
            if (fornecedor) {
                // Tratamento de legado para endereço
                let enderecoStruct = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' };
                if (typeof fornecedor.endereco === 'string') {
                    enderecoStruct.logradouro = fornecedor.endereco;
                } else if (fornecedor.endereco) {
                    enderecoStruct = { ...enderecoStruct, ...fornecedor.endereco };
                }

                setForm({
                    tipo: fornecedor.tipo || 'pj',
                    nome: fornecedor.nome || '',
                    documento: fornecedor.documento || '',
                    contato: fornecedor.contato || '',
                    telefone: fornecedor.telefone || '',
                    email: fornecedor.email || '',
                    endereco: enderecoStruct,
                    categoria: fornecedor.categoria || 'pecas',
                    observacoes: fornecedor.observacoes || '',
                    ativo: fornecedor.ativo !== false,
                });
            }
        } catch (error) {
            console.error('Erro ao carregar fornecedor:', error);
            setError('Erro ao carregar dados do fornecedor');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setIsDirty(true);
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleEnderecoChange = (e) => {
        const { name, value } = e.target;
        setIsDirty(true);
        setForm(prev => ({
            ...prev,
            endereco: { ...prev.endereco, [name]: value }
        }));
    };

    const handleBuscarCNPJ = async () => {
        const doc = form.documento.replace(/\D/g, '');
        if (doc.length !== 14) return;

        setLoading(true);
        try {
            const data = await consultarCNPJ(doc);
            setForm(prev => ({
                ...prev,
                nome: data.nome,
                telefone: prev.telefone || data.telefone || '',
                email: prev.email || data.email || '',
                endereco: {
                    cep: data.endereco.cep || '',
                    logradouro: data.endereco.logradouro || '',
                    numero: data.endereco.numero || '',
                    complemento: data.endereco.complemento || '',
                    bairro: data.endereco.bairro || '',
                    cidade: data.endereco.cidade || '',
                    estado: data.endereco.estado || '',
                }
            }));
        } catch (error) {
            console.error(error);
            alert('Erro ao buscar CNPJ: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBuscarCEP = async () => {
        const cep = form.endereco.cep.replace(/\D/g, '');
        if (cep.length !== 8) return;

        try {
            const data = await consultarCEP(cep);
            setForm((prev) => ({
                ...prev,
                endereco: {
                    ...prev.endereco,
                    logradouro: data.logradouro || '',
                    bairro: data.bairro || '',
                    cidade: data.cidade || '',
                    estado: data.estado || '',
                },
            }));
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSalvando(true);

        try {
            if (!form.nome.trim()) throw new Error('Nome é obrigatório');

            const payload = {
                ...form,
                documento: form.documento.replace(/\D/g, ''),
                empresaId: empresa.id
            };

            // Validação simples de documento
            if (payload.documento) {
                const isCpf = payload.documento.length <= 11;
                const valido = isCpf ? validaCPF(payload.documento) : validaCNPJ(payload.documento);
                if (!valido) throw new Error(`${isCpf ? 'CPF' : 'CNPJ'} inválido`);
            }

            if (isEdicao) {
                await storage.update('fornecedores', id, payload);
            } else {
                await storage.create('fornecedores', payload, empresa.id);
            }

            setIsDirty(false);
            if (isTabMode) {
                onClose?.();
            } else {
                navigate('/fornecedores');
            }
        } catch (error) {
            setError(error.message || 'Erro ao salvar');
        } finally {
            setSalvando(false);
        }
    };

    const handleDelete = async () => {
        if (!isEdicao) return;

        if (window.confirm('Deseja realmente excluir este fornecedor?')) {
            try {
                // Validação: Verificar vínculo com Produtos
                const produtos = await storage.getAll('produtos', empresa?.id);
                const temProdutos = produtos.some(p => p.fornecedorId === id);

                if (temProdutos) {
                    alert('Não é possível excluir este fornecedor pois existem Produtos vinculados a ele.');
                    return;
                }

                await storage.softDelete('fornecedores', id);
                if (isTabMode) {
                    onClose?.();
                } else {
                    navigate('/fornecedores');
                }
            } catch (error) {
                console.error('Erro ao excluir:', error);
                setError('Erro ao excluir fornecedor');
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
                        <div>
                            <h1 className="text-lg font-bold text-text-light dark:text-text-dark">
                                {isEdicao ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                            </h1>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                {isEdicao ? 'Atualize os dados do fornecedor' : 'Cadastre um novo parceiro comercial'}
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

                {/* Tipo e Status */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        {/* Card Principal */}
                        <div className="card p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">badge</span>
                                Dados Principais
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2 flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="tipo"
                                            value="pj"
                                            checked={form.tipo === 'pj'}
                                            onChange={handleChange}
                                            className="w-4 h-4 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium text-text-light dark:text-text-dark">Pessoa Jurídica</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="tipo"
                                            value="pf"
                                            checked={form.tipo === 'pf'}
                                            onChange={handleChange}
                                            className="w-4 h-4 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium text-text-light dark:text-text-dark">Pessoa Física</span>
                                    </label>
                                </div>

                                <div className="relative sm:col-span-1">
                                    <label className="label">
                                        {form.tipo === 'pf' ? 'CPF' : 'CNPJ'}
                                    </label>
                                    <input
                                        type="text"
                                        name="documento"
                                        className="input w-full pr-10"
                                        value={form.documento}
                                        onChange={handleChange}
                                        placeholder="Apenas números"
                                    />
                                    {form.tipo === 'pj' && (
                                        <button
                                            type="button"
                                            onClick={handleBuscarCNPJ}
                                            className="absolute right-2 top-8 text-primary hover:text-primary-dark transition-colors p-1"
                                            title="Buscar na Receita"
                                        >
                                            <span className="material-symbols-outlined text-xl">search</span>
                                        </button>
                                    )}
                                </div>

                                <div className="sm:col-span-1">
                                    <label className="label">Categoria</label>
                                    <select
                                        name="categoria"
                                        value={form.categoria}
                                        onChange={handleChange}
                                        className="input w-full"
                                    >
                                        <option value="pecas">Peças</option>
                                        <option value="servicos">Serviços</option>
                                        <option value="diversos">Diversos</option>
                                    </select>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="label">
                                        {form.tipo === 'pf' ? 'Nome Completo' : 'Razão Social'} <span className="text-error">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="nome"
                                        required
                                        className="input w-full font-medium"
                                        value={form.nome}
                                        onChange={handleChange}
                                        placeholder={form.tipo === 'pf' ? "Ex: João Silva" : "Ex: Auto Peças Distribuidora"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card Contato */}
                        <div className="card p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">contact_phone</span>
                                Contato
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Contato (Pessoa)</label>
                                    <input
                                        type="text"
                                        name="contato"
                                        className="input w-full"
                                        value={form.contato}
                                        onChange={handleChange}
                                        placeholder="Ex: Consultor João"
                                    />
                                </div>
                                <div>
                                    <label className="label">Telefone / WhatsApp</label>
                                    <input
                                        type="text"
                                        name="telefone"
                                        className="input w-full"
                                        value={form.telefone}
                                        onChange={handleChange}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="label">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="input w-full"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="email@fornecedor.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card Endereço */}
                        <div className="card p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary">location_on</span>
                                Endereço
                            </h2>
                            <div className="grid grid-cols-6 gap-4">
                                <div className="col-span-6 sm:col-span-2 relative">
                                    <label className="label">CEP</label>
                                    <input
                                        type="text"
                                        name="cep"
                                        className="input w-full pr-10"
                                        value={form.endereco.cep}
                                        onChange={handleEnderecoChange}
                                        onBlur={handleBuscarCEP}
                                        placeholder="00000-000"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleBuscarCEP}
                                        className="absolute right-2 top-8 text-primary hover:text-primary-dark transition-colors p-1"
                                    >
                                        <span className="material-symbols-outlined text-xl">search</span>
                                    </button>
                                </div>
                                <div className="col-span-6 sm:col-span-4">
                                    <label className="label">Logradouro</label>
                                    <input
                                        type="text"
                                        name="logradouro"
                                        className="input w-full"
                                        value={form.endereco.logradouro}
                                        onChange={handleEnderecoChange}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="label">Número</label>
                                    <input
                                        type="text"
                                        name="numero"
                                        className="input w-full"
                                        value={form.endereco.numero}
                                        onChange={handleEnderecoChange}
                                    />
                                </div>
                                <div className="col-span-4">
                                    <label className="label">Complemento</label>
                                    <input
                                        type="text"
                                        name="complemento"
                                        className="input w-full"
                                        value={form.endereco.complemento}
                                        onChange={handleEnderecoChange}
                                    />
                                </div>
                                <div className="col-span-3 sm:col-span-2">
                                    <label className="label">Bairro</label>
                                    <input
                                        type="text"
                                        name="bairro"
                                        className="input w-full"
                                        value={form.endereco.bairro}
                                        onChange={handleEnderecoChange}
                                    />
                                </div>
                                <div className="col-span-3 sm:col-span-3">
                                    <label className="label">Cidade</label>
                                    <input
                                        type="text"
                                        name="cidade"
                                        className="input w-full"
                                        value={form.endereco.cidade}
                                        onChange={handleEnderecoChange}
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="label">UF</label>
                                    <input
                                        type="text"
                                        name="estado"
                                        maxLength={2}
                                        className="input w-full uppercase"
                                        value={form.endereco.estado}
                                        onChange={handleEnderecoChange}
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
                                    <span className="text-sm font-medium text-text-light dark:text-text-dark">Cadastro Ativo</span>
                                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                        Disponível para uso
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

                        {/* Observações Card */}
                        <div className="card p-4 space-y-2">
                            <h3 className="font-semibold text-text-light dark:text-text-dark">Observações</h3>
                            <textarea
                                className="input w-full resize-none h-32 text-sm"
                                placeholder="Anotações internas sobre o fornecedor..."
                                value={form.observacoes}
                                onChange={e => setForm({ ...form, observacoes: e.target.value })}
                            />
                        </div>
                    </div>
                </section>
            </main>

            {/* Sticky Footer */}
            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-light dark:bg-surface-dark border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] z-30">
                <div className="max-w-5xl mx-auto flex gap-3">
                    {isEdicao && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="p-2.5 rounded-xl text-error hover:bg-error/10 transition-colors"
                            title="Excluir Fornecedor"
                        >
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => isTabMode ? onClose?.() : navigate('/fornecedores')}
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

export default CadastroFornecedor;

