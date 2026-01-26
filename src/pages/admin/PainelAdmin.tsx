import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import storage from '../../lib/storage';
import { FEATURES, FEATURE_DESCRIPTIONS, updateFeatures, getEnabledFeatures, FeatureKey } from '../../lib/featureFlags';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { Empresa, OrdemServico, Usuario } from '../../types';

interface Stats {
    totalEmpresas: number;
    empresasAtivas: number;
    totalOS: number;
    totalUsuarios: number;
}

const PainelAdmin = () => {
    const { usuario } = useAuth();
    const { showToast } = useToast();
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa & { enabledFeatures?: string[] } | null>(null);
    const [showFeatureModal, setShowFeatureModal] = useState(false);
    const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
    const [stats, setStats] = useState<Stats>({ totalEmpresas: 0, empresasAtivas: 0, totalOS: 0, totalUsuarios: 0 });

    useEffect(() => {
        if (usuario?.perfil === 'superadmin') {
            carregarDados();
        }
    }, [usuario]);

    const carregarDados = async () => {
        try {
            const empresasData = await storage.getAll<Empresa>('empresas');
            setEmpresas(empresasData);

            // Calcular estatísticas
            const osTotais = await storage.getAll<OrdemServico>('ordens_servico');
            const usuariosTotais = await storage.getAll<Usuario>('usuarios');

            setStats({
                totalEmpresas: empresasData.length,
                empresasAtivas: empresasData.filter(e => e.ativo !== false).length,
                totalOS: osTotais.length,
                totalUsuarios: usuariosTotais.length,
            });
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const atualizarPlanoEmpresa = async (empresaId: string, novoPlano: string) => {
        try {
            await storage.update('empresas', empresaId, { plano: novoPlano });
            showToast('Plano atualizado com sucesso!', 'success');
            carregarDados();
        } catch (error) {
            console.error('Erro ao atualizar plano:', error);
            showToast('Erro ao atualizar plano.', 'error');
        }
    };

    const atualizarStatusEmpresa = async (empresaId: string, ativo: boolean) => {
        try {
            await storage.update('empresas', empresaId, { ativo });
            showToast(`Empresa ${ativo ? 'ativada' : 'desativada'} com sucesso!`, 'success');
            carregarDados();
        } catch (error) {
            console.error('Erro ao atualizar empresa:', error);
            showToast('Erro ao atualizar status da empresa.', 'error');
        }
    };

    const abrirGestaoFeatures = async (empresa: Empresa) => {
        const features = await getEnabledFeatures(empresa.id);
        setSelectedEmpresa({ ...empresa, enabledFeatures: features });
        setShowFeatureModal(true);
    };

    interface CreateCompanyData {
        nomeFantasia: string;
        razaoSocial: string;
        cnpj: string;
        emailEmpresa: string;
        plano: string;
        adminNome: string;
        adminEmail: string;
        adminSenha: string;
    }

    const handleCriarEmpresa = async (dados: CreateCompanyData) => {
        try {
            // 1. Criar Empresa
            const novaEmpresa = await storage.create<Omit<Empresa, 'id' | 'criadoEm' | 'atualizadoEm'>>('empresas', {
                nomeFantasia: dados.nomeFantasia,
                razaoSocial: dados.razaoSocial,
                cnpj: dados.cnpj,
                email: dados.emailEmpresa,
                plano: dados.plano,
                limiteUsuarios: dados.plano === 'essencial' ? 1 : dados.plano === 'profissional' ? 3 : 5,
                addons: [], // Add-ons começam vazios
                ativo: true,
                telefone: ''
            } as unknown as Empresa, null as any); // Empresa não tem empresaId pai

            // 2. Criar Usuário Admin
            await storage.create('usuarios', {
                nome: dados.adminNome,
                email: dados.adminEmail,
                senha: dados.adminSenha,
                perfil: 'admin',
                ativo: true
            }, novaEmpresa.id);

            // 3. Inicializar Feature Flags Padrão (Opcional, mas boa prática)
            // const featureFlags = [];
            // Poderíamos adicionar flags padrão aqui se necessário

            showToast('Empresa criada com sucesso!', 'success');
            setShowNewCompanyModal(false);
            carregarDados();
        } catch (error) {
            console.error('Erro ao criar empresa:', error);
            showToast('Erro ao criar empresa.', 'error');
        }
    };

    // Verificar permissão de superadmin
    if (usuario?.perfil !== 'superadmin') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8">
                <span className="material-symbols-outlined text-6xl text-red-500 mb-4">lock</span>
                <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
                    Acesso Restrito
                </h1>
                <p className="text-text-secondary-light dark:text-text-secondary-dark">
                    Esta área é restrita a administradores do sistema.
                </p>
            </div>
        );
    }

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
        <div className="p-4 lg:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
                        Painel Administrativo
                    </h1>
                    <p className="text-text-secondary-light dark:text-text-secondary-dark">
                        Gestão de empresas e recursos do SaaS
                    </p>
                </div>
                <button
                    onClick={() => setShowNewCompanyModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">add_business</span>
                    Nova Empresa
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Empresas"
                    value={stats.totalEmpresas}
                    icon="business"
                    color="bg-blue-500"
                />
                <StatCard
                    label="Empresas Ativas"
                    value={stats.empresasAtivas}
                    icon="check_circle"
                    color="bg-green-500"
                />
                <StatCard
                    label="Total de OS"
                    value={stats.totalOS}
                    icon="assignment"
                    color="bg-cyan-600"
                />
                <StatCard
                    label="Total de Usuários"
                    value={stats.totalUsuarios}
                    icon="people"
                    color="bg-orange-500"
                />
            </div>

            {/* Tabela de Empresas */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                    <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
                        Empresas Cadastradas
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                                <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">
                                    Empresa
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase hidden md:table-cell">
                                    Plano
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase hidden lg:table-cell">
                                    Cadastro
                                </th>
                                <th className="text-center py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">
                                    Status
                                </th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {empresas.map((empresa, index) => (
                                <tr
                                    key={empresa.id}
                                    className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${index !== empresas.length - 1 ? 'border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]' : ''
                                        }`}
                                >
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="font-medium text-text-light dark:text-text-dark">
                                                {empresa.nomeFantasia}
                                            </p>
                                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                                {empresa.email}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 hidden md:table-cell">
                                        <select
                                            value={empresa.plano || 'essencial'}
                                            onChange={(e) => atualizarPlanoEmpresa(empresa.id, e.target.value)}
                                            className="text-xs font-medium px-2 py-1 rounded-full border-none bg-transparent focus:ring-0 cursor-pointer"
                                            style={{
                                                backgroundColor: empresa.plano === 'plus' ? '#D1FAE5' :
                                                    empresa.plano === 'profissional' ? '#DBEAFE' : '#F3F4F6',
                                                color: empresa.plano === 'plus' ? '#059669' :
                                                    empresa.plano === 'profissional' ? '#1D4ED8' : '#374151'
                                            }}
                                        >
                                            <option value="essencial">Essencial</option>
                                            <option value="profissional">Profissional</option>
                                            <option value="plus">Plus</option>
                                            <option value="enterprise">Enterprise</option>
                                        </select>
                                    </td>
                                    <td className="py-3 px-4 hidden lg:table-cell text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                        {formatDate(empresa.criadoEm)}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`inline-flex w-3 h-3 rounded-full ${empresa.ativo !== false ? 'bg-green-500' : 'bg-red-500'
                                            }`} />
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => abrirGestaoFeatures(empresa)}
                                                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-primary"
                                                title="Gerenciar Features"
                                            >
                                                <span className="material-symbols-outlined text-lg">toggle_on</span>
                                            </button>
                                            <button
                                                onClick={() => atualizarStatusEmpresa(empresa.id, empresa.ativo === false)}
                                                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${empresa.ativo !== false ? 'text-red-500' : 'text-green-500'
                                                    }`}
                                                title={empresa.ativo !== false ? 'Desativar' : 'Ativar'}
                                            >
                                                <span className="material-symbols-outlined text-lg">
                                                    {empresa.ativo !== false ? 'block' : 'check_circle'}
                                                </span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Features */}
            {showFeatureModal && selectedEmpresa && (
                <FeatureModal
                    empresa={selectedEmpresa}
                    onClose={() => {
                        setShowFeatureModal(false);
                        setSelectedEmpresa(null);
                    }}
                    onSave={async (enabledFeatures) => {
                        await updateFeatures(selectedEmpresa.id, enabledFeatures);
                        setShowFeatureModal(false);
                        setSelectedEmpresa(null);
                    }}
                />
            )}

            {/* Modal de Nova Empresa */}
            {showNewCompanyModal && (
                <NewCompanyModal
                    onClose={() => setShowNewCompanyModal(false)}
                    onSave={handleCriarEmpresa}
                />
            )}
        </div>
    );
};

// Componente de card de estatística
const StatCard = ({ label, value, icon, color }: { label: string, value: number, icon: string, color: string }) => (
    <div className="card p-4">
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                <span className="material-symbols-outlined text-white">{icon}</span>
            </div>
            <div>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{label}</p>
                <p className="text-xl font-bold text-text-light dark:text-text-dark">{value}</p>
            </div>
        </div>
    </div>
);

// Modal de Nova Empresa
interface NewCompanyModalProps {
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

const NewCompanyModal: React.FC<NewCompanyModalProps> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        nomeFantasia: '',
        razaoSocial: '',
        cnpj: '',
        emailEmpresa: '',
        plano: 'essencial',
        adminNome: '',
        adminEmail: '',
        adminSenha: ''
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(formData);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card w-full max-w-lg p-6 animate-slideUp max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Nova Empresa</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Dados da Empresa */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Dados da Empresa</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Nome Fantasia *</label>
                                <input
                                    type="text"
                                    required
                                    className="input"
                                    value={formData.nomeFantasia}
                                    onChange={e => setFormData({ ...formData, nomeFantasia: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">CNPJ</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.cnpj}
                                    onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Email da Empresa</label>
                            <input
                                type="email"
                                className="input"
                                value={formData.emailEmpresa}
                                onChange={e => setFormData({ ...formData, emailEmpresa: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="label">Plano *</label>
                            <select
                                className="input"
                                value={formData.plano}
                                onChange={e => setFormData({ ...formData, plano: e.target.value })}
                            >
                                <option value="essencial">Essencial (1 Usuário)</option>
                                <option value="profissional">Profissional (3 Usuários)</option>
                                <option value="plus">Plus (5 Usuários)</option>
                            </select>
                        </div>
                    </div>

                    <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] my-4"></div>

                    {/* Dados do Admin */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Primeiro Administrador</h3>

                        <div>
                            <label className="label">Nome do Admin *</label>
                            <input
                                type="text"
                                required
                                className="input"
                                value={formData.adminNome}
                                onChange={e => setFormData({ ...formData, adminNome: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Email de Login *</label>
                                <input
                                    type="email"
                                    required
                                    className="input"
                                    value={formData.adminEmail}
                                    onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Senha Inicial *</label>
                                <input
                                    type="text" // Text para ver a senha ao criar
                                    required
                                    className="input"
                                    value={formData.adminSenha}
                                    onChange={e => setFormData({ ...formData, adminSenha: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving} className="btn-primary flex-1">
                            {saving ? 'Criando...' : 'Criar Empresa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Modal de gestão de features
interface FeatureModalProps {
    empresa: Empresa & { enabledFeatures?: string[] };
    onClose: () => void;
    onSave: (features: string[]) => Promise<void>;
}

const FeatureModal: React.FC<FeatureModalProps> = ({ empresa, onClose, onSave }) => {
    const [enabledFeatures, setEnabledFeatures] = useState<string[]>(empresa.enabledFeatures || []);
    const [salvando, setSalvando] = useState(false);

    const toggleFeature = (feature: string) => {
        setEnabledFeatures(prev => {
            if (prev.includes(feature)) {
                return prev.filter(f => f !== feature);
            }
            return [...prev, feature];
        });
    };

    const handleSave = async () => {
        setSalvando(true);
        try {
            await onSave(enabledFeatures);
        } finally {
            setSalvando(false);
        }
    };

    // Organizar features por categoria
    const coreFeatures = Object.entries(FEATURE_DESCRIPTIONS).filter(([key]) => key.startsWith('core_'));
    const addonFeatures = Object.entries(FEATURE_DESCRIPTIONS).filter(([key]) => key.startsWith('addon_'));
    const betaFeatures = Object.entries(FEATURE_DESCRIPTIONS).filter(([key]) => key.startsWith('beta_'));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                            Gerenciar Features
                        </h2>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                            {empresa.nomeFantasia}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Core Features */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark mb-3 uppercase tracking-wider">
                        Core (sempre habilitado)
                    </h3>
                    <div className="space-y-2">
                        {coreFeatures.map(([key, info]) => (
                            <FeatureItem
                                key={key}
                                feature={key}
                                info={info}
                                enabled={true}
                                disabled={true}
                                onToggle={() => { }}
                            />
                        ))}
                    </div>
                </div>

                {/* Add-ons */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark mb-3 uppercase tracking-wider">
                        Add-ons
                    </h3>
                    <div className="space-y-2">
                        {addonFeatures.map(([key, info]) => (
                            <FeatureItem
                                key={key}
                                feature={key}
                                info={info}
                                enabled={enabledFeatures.includes(key)}
                                onToggle={() => toggleFeature(key)}
                            />
                        ))}
                    </div>
                </div>

                {/* Beta Features */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark mb-3 uppercase tracking-wider">
                        Funcionalidades Beta
                    </h3>
                    <div className="space-y-2">
                        {betaFeatures.map(([key, info]) => (
                            <FeatureItem
                                key={key}
                                feature={key}
                                info={info}
                                enabled={enabledFeatures.includes(key)}
                                onToggle={() => toggleFeature(key)}
                                isBeta
                            />
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                    <button onClick={onClose} className="btn-secondary flex-1">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="btn-primary flex-1" disabled={salvando}>
                        {salvando ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Componente de item de feature
interface FeatureItemProps {
    feature: string;
    info: { nome: string; descricao: string; icone: string };
    enabled: boolean;
    disabled?: boolean;
    onToggle: () => void;
    isBeta?: boolean;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ feature, info, enabled, disabled, onToggle, isBeta }) => (
    <div
        className={`flex items-center justify-between p-3 rounded transition-colors ${disabled ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-surface-light dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center ${enabled ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}>
                <span className="material-symbols-outlined text-lg">{info.icone}</span>
            </div>
            <div>
                <p className="font-medium text-text-light dark:text-text-dark flex items-center gap-2">
                    {info.nome}
                    {isBeta && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                            BETA
                        </span>
                    )}
                </p>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    {info.descricao}
                </p>
            </div>
        </div>
        <button
            onClick={onToggle}
            disabled={disabled}
            className={`relative w-12 h-6 rounded-full transition-colors ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                } ${enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
        </button>
    </div>
);

export default PainelAdmin;
