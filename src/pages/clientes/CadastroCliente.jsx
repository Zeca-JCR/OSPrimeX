import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import storage from '../../lib/storage';
import { validaCPF, validaCNPJ } from '../../lib/utils';
import { consultarCNPJ, consultarCEP } from '../../services/api';

const CadastroCliente = ({ clienteId, isTabMode, onClose, onDirtyChange, onTitleChange }) => {
    const { empresa } = useAuth();
    const { registerSaveHandler, unregisterSaveHandler } = useTabs();
    const navigate = useNavigate();
    const params = useParams();
    const id = clienteId || params.id; // Prioriza prop (TabMode) sobre URL
    const isEdicao = !!id;

    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    const [form, setForm] = useState({
        tipo: 'pf',
        nome: '',
        documento: '',
        telefone: '',
        whatsapp: '',
        whatsapp: '',
        dataNascimento: '',
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
        ativo: true,
        observacoes: '',
        tags: ['novo'], // Tag 'Novo' pré-selecionada para novos clientes
    });

    const tagsDisponiveis = [
        { id: 'vip', label: 'VIP', color: 'bg-amber-500', icon: 'star' },
        { id: 'recorrente', label: 'Recorrente', color: 'bg-green-500', icon: 'refresh' },
        { id: 'novo', label: 'Novo', color: 'bg-blue-500', icon: 'fiber_new' },
        { id: 'indicacao', label: 'Indicação', color: 'bg-purple-500', icon: 'share' },
    ];

    const toggleTag = (tagId) => {
        setForm((prev) => ({
            ...prev,
            tags: prev.tags.includes(tagId)
                ? prev.tags.filter((t) => t !== tagId)
                : [...prev.tags, tagId],
        }));
    };

    // Carregar dados se for edição
    useEffect(() => {
        if (isEdicao) {
            carregarCliente();
        }
    }, [id]);

    // Comunicar dirty state para aba
    useEffect(() => {
        if (isTabMode) onDirtyChange?.(isDirty);
    }, [isDirty, isTabMode, onDirtyChange]);

    // Comunicar título para aba
    useEffect(() => {
        if (isTabMode && form?.nome) {
            onTitleChange?.(form.nome || 'Novo Cliente');
        }
    }, [form?.nome, isTabMode, onTitleChange]);

    // Função de salvar que pode ser chamada externamente (pelo TabBar)
    const salvarCliente = useCallback(async () => {
        // Validações básicas
        if (!form.nome.trim()) {
            throw new Error('Nome é obrigatório');
        }
        if (form.documento) {
            const valido = form.tipo === 'pf' ? validaCPF(form.documento) : validaCNPJ(form.documento);
            if (!valido) throw new Error(`${form.tipo === 'pf' ? 'CPF' : 'CNPJ'} inválido`);
        }
        if (!form.telefone.trim()) {
            throw new Error('Telefone é obrigatório');
        }

        if (isEdicao) {
            await storage.update('clientes', id, form);
        } else {
            await storage.create('clientes', form, empresa.id);
        }
        setIsDirty(false);
    }, [form, id, isEdicao, empresa?.id]);

    // Registrar saveHandler para o TabBar poder chamar "Salvar e sair"
    useEffect(() => {
        if (isTabMode && clienteId) {
            const tabId = `cliente-${clienteId}`;
            registerSaveHandler(tabId, salvarCliente);
            return () => unregisterSaveHandler(tabId);
        }
    }, [isTabMode, clienteId, salvarCliente, registerSaveHandler, unregisterSaveHandler]);

    const carregarCliente = async () => {
        setLoading(true);
        try {
            const cliente = await storage.getById('clientes', id);
            if (cliente) {
                setForm({
                    tipo: cliente.tipo || 'pf',
                    nome: cliente.nome || '',
                    documento: cliente.documento || '',
                    telefone: cliente.telefone || '',
                    whatsapp: cliente.whatsapp || '',
                    whatsapp: cliente.whatsapp || '',
                    dataNascimento: cliente.dataNascimento || '',
                    email: cliente.email || '',
                    endereco: cliente.endereco || {
                        cep: '',
                        logradouro: '',
                        numero: '',
                        complemento: '',
                        bairro: '',
                        cidade: '',
                        estado: '',
                    },
                    ativo: cliente.ativo !== false,
                    observacoes: cliente.observacoes || '',
                    tags: cliente.tags || [],
                });
            }
        } catch (error) {
            console.error('Erro ao carregar cliente:', error);
            setError('Erro ao carregar dados do cliente');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setIsDirty(true);

        if (name.startsWith('endereco.')) {
            const campo = name.split('.')[1];
            setForm((prev) => ({
                ...prev,
                endereco: { ...prev.endereco, [campo]: value },
            }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    // Buscar CEP
    const buscarCEP = async () => {
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
            setError('');
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            setError('Erro ao buscar CEP: ' + error.message);
        }
    };

    // Buscar CNPJ
    const handleBuscarCNPJ = async () => {
        if (form.tipo !== 'pj') return;

        setLoading(true);
        setError('');

        try {
            const dados = await consultarCNPJ(form.documento);

            setForm(prev => ({
                ...prev,
                nome: dados.nome,
                // Se tiver nome fantasia, pode concatenar ou usar em outro campo se existisse
                // Aqui vamos manter o Razão Social como principal
                email: prev.email || dados.email || '',
                telefone: prev.telefone || dados.telefone || '',
                endereco: {
                    ...prev.endereco,
                    cep: dados.endereco.cep || prev.endereco.cep,
                    logradouro: dados.endereco.logradouro || '',
                    numero: dados.endereco.numero || '',
                    complemento: dados.endereco.complemento || '',
                    bairro: dados.endereco.bairro || '',
                    cidade: dados.endereco.cidade || '',
                    estado: dados.endereco.estado || '',
                }
            }));
        } catch (error) {
            console.error('Erro ao buscar CNPJ:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Validar Documento ao sair do campo
    const handleBlurDocumento = () => {
        if (!form.documento) return;

        let valido = true;
        if (form.tipo === 'pf') {
            valido = validaCPF(form.documento);
            if (!valido) setError('CPF inválido');
        } else {
            valido = validaCNPJ(form.documento);
            if (!valido) setError('CNPJ inválido');
        }

        if (valido) setError('');
    };

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) return;

        setSalvando(true);
        try {
            // 1. Verificar vínculo com Veículos
            const veiculos = await storage.getAll('veiculos', empresa?.id);
            const temVeiculos = veiculos.some(v => v.clienteId === id);

            if (temVeiculos) {
                alert('Não é possível excluir este cliente pois ele possui Veículos cadastrados.');
                return;
            }

            // 2. Verificar vínculo com OS
            const ordens = await storage.getAll('ordens_servico', empresa?.id);
            const temOS = ordens.some(os => os.clienteId === id);

            if (temOS) {
                alert('Não é possível excluir este cliente pois ele possui Ordens de Serviço (histórico).');
                return;
            }

            // Se passou, exclui
            await storage.delete('clientes', id);

            if (isTabMode) {
                onClose?.();
            } else {
                navigate('/clientes');
            }
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
            setError('Erro ao excluir cliente: ' + error.message);
        } finally {
            setSalvando(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSalvando(true);

        try {
            // Validações básicas
            if (!form.nome.trim()) {
                throw new Error('Nome é obrigatório');
            }

            // Validar documento antes de salvar
            if (form.documento) {
                const valido = form.tipo === 'pf' ? validaCPF(form.documento) : validaCNPJ(form.documento);
                if (!valido) throw new Error(`${form.tipo === 'pf' ? 'CPF' : 'CNPJ'} inválido`);
            }

            if (!form.telefone.trim()) {
                throw new Error('Telefone é obrigatório');
            }

            if (isEdicao) {
                await storage.update('clientes', id, form);
            } else {
                await storage.create('clientes', form, empresa.id);
            }

            setIsDirty(false);
            if (isTabMode) {
                onClose?.();
            } else {
                navigate('/clientes');
            }
        } catch (error) {
            setError(error.message || 'Erro ao salvar cliente');
        } finally {
            setSalvando(false);
        }
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
        <div className="min-h-full bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => isTabMode ? onClose?.() : navigate(-1)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold text-text-light dark:text-text-dark">
                        {isEdicao ? 'Editar Cliente' : 'Novo Cliente'}
                    </h1>
                </div>
            </header>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-2xl mx-auto">
                {/* Error */}
                {error && (
                    <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error flex items-center gap-2">
                        <span className="material-symbols-outlined">error</span>
                        {error}
                    </div>
                )}

                {/* Tipo de cliente */}
                <div className="card p-4">
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-3">
                        Tipo de Cliente
                    </label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="tipo"
                                value="pf"
                                checked={form.tipo === 'pf'}
                                onChange={handleChange}
                                className="w-4 h-4 text-primary focus:ring-primary"
                            />
                            <span className="text-text-light dark:text-text-dark">Pessoa Física</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="tipo"
                                value="pj"
                                checked={form.tipo === 'pj'}
                                onChange={handleChange}
                                className="w-4 h-4 text-primary focus:ring-primary"
                            />
                            <span className="text-text-light dark:text-text-dark">Pessoa Jurídica</span>
                        </label>
                    </div>
                </div>

                {/* Tags do cliente */}
                <div className="card p-4">
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-3">
                        Classificação do Cliente
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {tagsDisponiveis.map((tag) => (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleTag(tag.id)}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                                    transition-all duration-200 border-2
                                    ${form.tags.includes(tag.id)
                                        ? `${tag.color} text-white border-transparent`
                                        : 'bg-gray-100 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }
                                `}
                            >
                                <span className="material-symbols-outlined text-base">
                                    {form.tags.includes(tag.id) ? 'check' : tag.icon}
                                </span>
                                {tag.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2">
                        Clique para selecionar ou remover classificações
                    </p>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-text-light dark:text-text-dark">Cadastro Ativo</span>
                                <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                    {form.ativo ? 'Cliente pode ser vinculado a novas OSs' : 'Cliente bloqueado para novas OSs'}
                                </span>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={form.ativo}
                                    onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Dados principais */}
                <div className="card p-4 space-y-4">
                    <h2 className="font-semibold text-text-light dark:text-text-dark">
                        Dados Principais
                    </h2>

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            {form.tipo === 'pf' ? 'Nome Completo' : 'Razão Social'} *
                        </label>
                        <input
                            type="text"
                            name="nome"
                            value={form.nome}
                            onChange={handleChange}
                            className="input"
                            placeholder={form.tipo === 'pf' ? 'João da Silva' : 'Empresa Ltda'}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            {form.tipo === 'pf' ? 'CPF' : 'CNPJ'}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                name="documento"
                                value={form.documento}
                                onChange={handleChange}
                                onBlur={handleBlurDocumento}
                                className={`input flex-1 ${error && (error.includes('CPF') || error.includes('CNPJ')) ? 'border-error' : ''}`}
                                placeholder={form.tipo === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
                            />
                            {form.tipo === 'pj' && (
                                <button
                                    type="button"
                                    onClick={handleBuscarCNPJ}
                                    className="btn-secondary px-3"
                                    title="Consultar na Receita (BrasilAPI)"
                                >
                                    <span className="material-symbols-outlined">search</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Telefone *
                            </label>
                            <input
                                type="tel"
                                name="telefone"
                                value={form.telefone}
                                onChange={handleChange}
                                className="input"
                                placeholder="(11) 99999-9999"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                WhatsApp
                            </label>
                            <input
                                type="tel"
                                name="whatsapp"
                                value={form.whatsapp}
                                onChange={handleChange}
                                className="input"
                                placeholder="(11) 99999-9999"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            {form.tipo === 'pj' ? 'Data de Fundação' : 'Data de Nascimento'}
                        </label>
                        <input
                            type="date"
                            name="dataNascimento"
                            value={form.dataNascimento}
                            onChange={handleChange}
                            className="input w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className="input"
                            placeholder="email@exemplo.com"
                        />
                    </div>
                </div>

                {/* Endereço */}
                <div className="card p-4 space-y-4">
                    <h2 className="font-semibold text-text-light dark:text-text-dark">
                        Endereço
                    </h2>

                    <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                CEP
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    name="endereco.cep"
                                    value={form.endereco.cep}
                                    onChange={handleChange}
                                    onBlur={buscarCEP}
                                    className="input"
                                    placeholder="00000-000"
                                />
                                <button
                                    type="button"
                                    onClick={buscarCEP}
                                    className="btn-secondary px-3"
                                    title="Buscar CEP"
                                >
                                    <span className="material-symbols-outlined">search</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-4 gap-4">
                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Logradouro
                            </label>
                            <input
                                type="text"
                                name="endereco.logradouro"
                                value={form.endereco.logradouro}
                                onChange={handleChange}
                                className="input"
                                placeholder="Rua, Avenida..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Número
                            </label>
                            <input
                                type="text"
                                name="endereco.numero"
                                value={form.endereco.numero}
                                onChange={handleChange}
                                className="input"
                                placeholder="123"
                            />
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Complemento
                            </label>
                            <input
                                type="text"
                                name="endereco.complemento"
                                value={form.endereco.complemento}
                                onChange={handleChange}
                                className="input"
                                placeholder="Apto, Sala..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Bairro
                            </label>
                            <input
                                type="text"
                                name="endereco.bairro"
                                value={form.endereco.bairro}
                                onChange={handleChange}
                                className="input"
                                placeholder="Bairro"
                            />
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Cidade
                            </label>
                            <input
                                type="text"
                                name="endereco.cidade"
                                value={form.endereco.cidade}
                                onChange={handleChange}
                                className="input"
                                placeholder="Cidade"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Estado
                            </label>
                            <input
                                type="text"
                                name="endereco.estado"
                                value={form.endereco.estado}
                                onChange={handleChange}
                                className="input"
                                placeholder="SP"
                                maxLength={2}
                            />
                        </div>
                    </div>
                </div>

                {/* Observações */}
                <div className="card p-4">
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                        Observações
                    </label>
                    <textarea
                        name="observacoes"
                        value={form.observacoes}
                        onChange={handleChange}
                        className="input min-h-[100px] resize-y"
                        placeholder="Observações sobre o cliente..."
                    />
                </div>

                {/* Actions */}
                {/* Espaçador para o footer */}
                <div className="h-20"></div>

                {/* Sticky Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-light dark:bg-surface-dark border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] z-20">
                    <div className="max-w-2xl mx-auto flex gap-3 items-center">
                        {isEdicao && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mr-auto"
                                title="Excluir Cliente"
                                disabled={salvando}
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => isTabMode ? onClose?.() : navigate(-1)}
                            className={`btn-secondary ${isEdicao ? '' : 'flex-1'}`}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={salvando}
                            className={`btn-primary shadow-lg shadow-primary/20 ${isEdicao ? '' : 'flex-1'}`}
                        >
                            {salvando ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">save</span>
                                    Salvar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form >
        </div >
    );
};

export default CadastroCliente;
