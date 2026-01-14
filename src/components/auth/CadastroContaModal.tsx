// @ts-nocheck
// Tipagem completa será adicionada em fase futura
import { useState } from 'react';
import storage from '../../lib/storage';

const CadastroContaModal = ({ onClose, onSuccess }) => {
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
    const [step, setStep] = useState(1); // 1: Empresa, 2: Admin

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // 1. Criar Empresa
            const novaEmpresa = await storage.create('empresas', {
                nomeFantasia: formData.nomeFantasia,
                razaoSocial: formData.nomeFantasia, // Simplificação
                cnpj: formData.cnpj,
                email: formData.emailEmpresa,
                plano: formData.plano,
                limiteUsuarios: formData.plano === 'essencial' ? 1 : formData.plano === 'profissional' ? 3 : 5,
                addons: [],
                ativo: true
            }, null);

            // 2. Criar Usuário Admin
            await storage.create('usuarios', {
                nome: formData.adminNome,
                email: formData.adminEmail,
                senha: formData.adminSenha,
                perfil: 'admin',
                ativo: true
            }, novaEmpresa.id);

            onSuccess({ email: formData.adminEmail, senha: formData.adminSenha });
        } catch (error) {
            console.error('Erro ao criar conta:', error);
            alert('Erro ao criar conta. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="card w-full max-w-lg p-0 animate-slideUp max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Criar nova conta</h2>
                        <div className="flex gap-2 mt-2">
                            <div className={`h-1 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            <div className={`h-1 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
                    {step === 1 && (
                        <div className="space-y-4 animate-fadeIn">
                            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Dados da Oficina</h3>

                            <div>
                                <label className="label">Nome da Oficina *</label>
                                <input
                                    type="text"
                                    required
                                    className="input"
                                    placeholder="Ex: Auto Center Silva"
                                    value={formData.nomeFantasia}
                                    onChange={e => setFormData({ ...formData, nomeFantasia: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="label">Email da Empresa</label>
                                <input
                                    type="email"
                                    className="input"
                                    placeholder="contato@oficina.com"
                                    value={formData.emailEmpresa}
                                    onChange={e => setFormData({ ...formData, emailEmpresa: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="label">CNPJ (Opcional)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="00.000.000/0000-00"
                                    value={formData.cnpj}
                                    onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    if (formData.nomeFantasia) setStep(2);
                                    else alert('Preencha o nome da oficina');
                                }}
                                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                            >
                                Continuar
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-fadeIn">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-sm text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-1 mb-2 hover:text-primary"
                            >
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                                Voltar
                            </button>

                            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Seus Dados de Acesso</h3>

                            <div>
                                <label className="label">Seu Nome *</label>
                                <input
                                    type="text"
                                    required
                                    className="input"
                                    placeholder="Seu nome completo"
                                    value={formData.adminNome}
                                    onChange={e => setFormData({ ...formData, adminNome: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="label">Email de Login *</label>
                                <input
                                    type="email"
                                    required
                                    className="input"
                                    placeholder="seu@email.com"
                                    value={formData.adminEmail}
                                    onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="label">Senha *</label>
                                <input
                                    type="password"
                                    required
                                    className="input"
                                    placeholder="••••••••"
                                    value={formData.adminSenha}
                                    onChange={e => setFormData({ ...formData, adminSenha: e.target.value })}
                                />
                            </div>

                            <button type="submit" disabled={saving} className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                                {saving ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                        Criando conta...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Finalizar Cadastro
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default CadastroContaModal;

