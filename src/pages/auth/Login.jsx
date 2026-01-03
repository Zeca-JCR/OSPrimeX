import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import CadastroContaModal from '../../components/auth/CadastroContaModal';

const Login = () => {
    const { login } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [email, setEmail] = useState('admin@demo.com');
    const [senha, setSenha] = useState('demo123');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCadastro, setShowCadastro] = useState(false);

    const handleEsqueciSenha = () => {
        alert('Instruções de recuperação enviadas para o seu email!');
    };

    const handleCadastroSuccess = (creds) => {
        setShowCadastro(false);
        setEmail(creds.email);
        setSenha(creds.senha);
        alert('Conta criada com sucesso! Faça login para continuar.');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, senha);
        } catch (err) {
            setError(err.message || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
            {/* Header com toggle de tema */}
            <div className="absolute top-4 right-4">
                <button
                    onClick={toggleTheme}
                    className="p-3 rounded-xl bg-surface-light dark:bg-surface-dark shadow-sm hover:shadow-md transition-all text-text-secondary-light dark:text-text-secondary-dark"
                >
                    <span className="material-symbols-outlined">
                        {isDark ? 'light_mode' : 'dark_mode'}
                    </span>
                </button>
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <img
                            src="/logo-new.png"
                            alt="OSPrimeX Logo"
                            className="w-40 h-auto object-contain mb-4 animate-fadeIn mx-auto"
                        />
                        <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">
                            OSPrime
                        </h1>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">
                            Gestão Inteligente para Oficinas
                        </p>
                    </div>

                    {/* Card de login */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg p-8 animate-slideUp">
                        <h2 className="text-xl font-semibold text-text-light dark:text-text-dark mb-6">
                            Entrar na sua conta
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Error message */}
                            {error && (
                                <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">error</span>
                                    {error}
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
                                >
                                    Email
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary-light dark:text-text-secondary-dark">
                                        <span className="material-symbols-outlined text-xl">mail</span>
                                    </div>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input pl-12"
                                        placeholder="seu@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Senha */}
                            <div>
                                <label
                                    htmlFor="senha"
                                    className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
                                >
                                    Senha
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary-light dark:text-text-secondary-dark">
                                        <span className="material-symbols-outlined text-xl">lock</span>
                                    </div>
                                    <input
                                        type="password"
                                        id="senha"
                                        value={senha}
                                        onChange={(e) => setSenha(e.target.value)}
                                        className="input pl-12"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                        Entrando...
                                    </>
                                ) : (
                                    <>
                                        Entrar
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-4 text-center">
                            <button onClick={handleEsqueciSenha} className="text-sm text-primary hover:underline">
                                Esqueci minha senha
                            </button>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-2">
                                Ainda não tem uma conta?
                            </p>
                            <button
                                onClick={() => setShowCadastro(true)}
                                className="text-primary font-semibold hover:underline"
                            >
                                Experimente grátis
                            </button>
                        </div>

                        {/* Demo credentials */}
                        <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">info</span>
                                Credenciais de demonstração
                            </p>
                            <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark space-y-1">
                                <p><strong>Email:</strong> admin@demo.com</p>
                                <p><strong>Senha:</strong> demo123</p>
                            </div>
                        </div>
                    </div>

                    {/* Admin Shortcut (Testing only) */}
                    <div className="flex justify-center -mt-2 mb-2">
                        <button
                            type="button"
                            onClick={() => {
                                setEmail('master@osprimex.com');
                                setSenha('admin');
                            }}
                            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-colors flex items-center gap-2 px-4 text-xs font-medium"
                            title="Acesso Super Admin"
                        >
                            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                            Acesso Admin
                        </button>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-text-secondary-light dark:text-text-secondary-dark mt-6">
                        © 2024 OSPrimeX. Todos os direitos reservados.
                    </p>
                </div>
            </div>
            {showCadastro && (
                <CadastroContaModal
                    onClose={() => setShowCadastro(false)}
                    onSuccess={handleCadastroSuccess}
                />
            )}
        </div>
    );
};

export default Login;
