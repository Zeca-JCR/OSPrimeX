// @ts-nocheck
// Tipagem completa será adicionada em fase futura
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import storage from '../../lib/storage';
import { useToast } from '../../contexts/ToastContext';

const UserProfileModal = ({ onClose }) => {
    const { usuario, logout, refreshEmpresa } = useAuth(); // Assuming refreshEmpresa might be useful if we update company context, but here we update user.
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('perfil'); // 'perfil' or 'senha'
    const [loading, setLoading] = useState(false);

    // Profile State
    const [nome, setNome] = useState(usuario?.nome || '');

    // Password State
    const [senhaAtual, setSenhaAtual] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmaSenha, setConfirmaSenha] = useState('');

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Update user name
            await storage.update('usuarios', usuario.id, { nome });

            // We need to update the local session or force a reload to see the name change immediately
            // For now, simpler approach: notify user. 
            // Ideally methods like updateSessionUser() should exist in AuthContext.

            showToast('Perfil atualizado com sucesso! Recarregue a página para ver as alterações.', 'success');
            // Hacky reload to refresh context if context doesn't auto-update from storage
            setTimeout(() => window.location.reload(), 1500);

            onClose();
        } catch (error) {
            console.error(error);
            showToast('Erro ao atualizar perfil', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (novaSenha !== confirmaSenha) {
            showToast('As senhas não conferem', 'error');
            return;
        }

        if (novaSenha.length < 6) {
            showToast('A nova senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        setLoading(true);
        try {
            // Verify old password
            // In a real backend we would send old password to API.
            // With local storage/Supabase simulated: we assume we can read the user record.
            // SAFETY CHECK: Verify if currently logged user matches.
            const userRecord = await storage.getById('usuarios', usuario.id);

            if (userRecord.senha !== senhaAtual) {
                showToast('Senha atual incorreta', 'error');
                setLoading(false);
                return;
            }

            // Update password
            await storage.update('usuarios', usuario.id, { senha: novaSenha });
            showToast('Senha alterada com sucesso! Faça login novamente.', 'success');

            setTimeout(() => {
                logout();
            }, 2000);

            onClose();
        } catch (error) {
            console.error(error);
            showToast('Erro ao alterar senha', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="card w-full max-w-md animate-scaleIn overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between bg-surface-light dark:bg-surface-dark">
                    <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
                        Meu Perfil
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-text-secondary-light dark:text-text-secondary-dark transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                    <button
                        onClick={() => setActiveTab('perfil')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'perfil'
                                ? 'text-primary'
                                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark'
                            }`}
                    >
                        Dados Pessoais
                        {activeTab === 'perfil' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('senha')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'senha'
                                ? 'text-primary'
                                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark'
                            }`}
                    >
                        Alterar Senha
                        {activeTab === 'senha' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'perfil' ? (
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
                                    {usuario?.nome?.charAt(0) || 'U'}
                                </div>
                            </div>

                            <div>
                                <label className="label">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="input"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label">Email (Login)</label>
                                <input
                                    type="email"
                                    disabled
                                    className="input opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800"
                                    value={usuario?.email || ''}
                                />
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                    O email não pode ser alterado.
                                </p>
                            </div>

                            <div className="pt-4">
                                <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg flex gap-3 text-yellow-700 dark:text-yellow-400 text-sm mb-4">
                                <span className="material-symbols-outlined shrink-0">lock</span>
                                <p>Por segurança, você será desconectado após alterar a senha.</p>
                            </div>

                            <div>
                                <label className="label">Senha Atual</label>
                                <input
                                    type="password"
                                    required
                                    className="input"
                                    value={senhaAtual}
                                    onChange={(e) => setSenhaAtual(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label">Nova Senha</label>
                                <input
                                    type="password"
                                    required
                                    className="input"
                                    value={novaSenha}
                                    onChange={(e) => setNovaSenha(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>

                            <div>
                                <label className="label">Confirmar Nova Senha</label>
                                <input
                                    type="password"
                                    required
                                    className="input"
                                    value={confirmaSenha}
                                    onChange={(e) => setConfirmaSenha(e.target.value)}
                                />
                            </div>

                            <div className="pt-4">
                                <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                                    {loading ? 'Alterando...' : 'Alterar Senha'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;

