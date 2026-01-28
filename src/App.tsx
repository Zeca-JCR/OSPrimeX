// App.tsx
import { NotificationProvider } from './contexts/NotificationContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, ReactNode, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { OnboardingProvider } from './components/onboarding/OnboardingTour';
import { seedDatabase } from './lib/seed';

// Initial Loading Component
const PageLoading = () => (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-pulse-soft text-primary">
            <span className="material-symbols-outlined text-5xl">sync</span>
        </div>
    </div>
);

// Lazy Load Pages
const Login = lazy(() => import('./pages/auth/Login'));
const MainLayout = lazy(() => import('./components/layout/MainLayout'));
const NetworkStatusHandler = lazy(() => import('./components/common/NetworkStatusHandler'));

// Dashboard & Core
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Agenda = lazy(() => import('./pages/agenda/Agenda'));
const Relatorios = lazy(() => import('./pages/relatorios/Relatorios'));

// Clientes
const ListaClientes = lazy(() => import('./pages/clientes/ListaClientes'));
const CadastroCliente = lazy(() => import('./pages/clientes/CadastroCliente'));
const DetalhesCliente = lazy(() => import('./pages/clientes/DetalhesCliente'));

// Veículos
const ListaVeiculos = lazy(() => import('./pages/veiculos/ListaVeiculos'));
const CadastroVeiculo = lazy(() => import('./pages/veiculos/CadastroVeiculo'));

// OS
const KanbanOS = lazy(() => import('./pages/os/KanbanOS'));
const DetalhesOS = lazy(() => import('./pages/os/DetalhesOS'));
const Prismas = lazy(() => import('./pages/os/Prismas'));

// Estoque
const ListaProdutos = lazy(() => import('./pages/estoque/ListaProdutos'));
const CadastroProduto = lazy(() => import('./pages/estoque/CadastroProduto'));
const HistoricoEstoque = lazy(() => import('./pages/estoque/HistoricoEstoque'));
const Fornecedores = lazy(() => import('./pages/estoque/Fornecedores'));
const CadastroFornecedor = lazy(() => import('./pages/estoque/CadastroFornecedor'));
const PedidoReposicao = lazy(() => import('./pages/estoque/PedidoReposicao'));
const ImportarNota = lazy(() => import('./pages/estoque/ImportarNota'));

// Financeiro
const DashboardFinanceiro = lazy(() => import('./pages/financeiro/DashboardFinanceiro'));
const FinanceiroAdvanced = lazy(() => import('./pages/financeiro/advanced/FinanceiroAdvanced'));
const RelatorioComissoes = lazy(() => import('./pages/financeiro/RelatorioComissoes'));

// Usuários & Colaboradores
const ListaUsuarios = lazy(() => import('./pages/usuarios/ListaUsuarios'));
const CadastroUsuario = lazy(() => import('./pages/usuarios/CadastroUsuario'));
const ListaColaboradores = lazy(() => import('./pages/colaboradores/ListaColaboradores'));
const CadastroColaborador = lazy(() => import('./pages/colaboradores/CadastroColaborador'));

// Admin & Configurações
const PainelAdmin = lazy(() => import('./pages/admin/PainelAdmin'));
const ConfiguracoesEmpresa = lazy(() => import('./pages/configuracoes/ConfiguracoesEmpresa'));
const CRMRetencao = lazy(() => import('./pages/crm/CRMRetencao'));

// Public Pages
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const RastreadorOS = lazy(() => import('./pages/public/RastreadorOS'));
const RastreamentoPublico = lazy(() => import('./pages/os/RastreamentoPublico'));
const LinkRedirect = lazy(() => import('./pages/public/LinkRedirect'));

// Componente de rota protegida
const PrivateRoute = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <PageLoading />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Rota pública (redireciona se logado)
const PublicRoute = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated, loading, usuario } = useAuth();

    if (loading) {
        return null;
    }

    if (isAuthenticated) {
        if (usuario?.perfil === 'superadmin') {
            return <Navigate to="/admin" replace />;
        }
        return <Navigate to="/" replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Suspense fallback={<PageLoading />}>
            <Routes>
                {/* Rotas públicas */}
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />

                {/* Landing Page e Rastreador Público (não requer login) */}
                <Route path="/home" element={<LandingPage />} />
                <Route path="/rastrear" element={<RastreadorOS />} />
                <Route path="/status/:codigo" element={<RastreamentoPublico />} />
                <Route path="/r/:codigo" element={<LinkRedirect />} />

                {/* Rotas protegidas */}
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <MainLayout />
                        </PrivateRoute>
                    }
                >
                    <Route index element={<Dashboard />} />
                    <Route path="clientes" element={<ListaClientes />} />
                    <Route path="clientes/novo" element={<CadastroCliente />} />
                    <Route path="clientes/:id" element={<DetalhesCliente />} />
                    <Route path="clientes/:id/editar" element={<CadastroCliente />} />
                    <Route path="veiculos" element={<ListaVeiculos />} />
                    <Route path="veiculos/novo" element={<CadastroVeiculo />} />
                    <Route path="veiculos/:id/editar" element={<CadastroVeiculo />} />
                    <Route path="os" element={<KanbanOS />} />
                    <Route path="os/:id" element={<DetalhesOS />} />
                    <Route path="estoque" element={<ListaProdutos />} />
                    <Route path="estoque/novo" element={<CadastroProduto />} />
                    <Route path="estoque/:id/editar" element={<CadastroProduto />} />
                    <Route path="estoque/movimentacoes" element={<HistoricoEstoque />} />
                    <Route path="fornecedores" element={<Fornecedores />} />
                    <Route path="fornecedores/novo" element={<CadastroFornecedor />} />
                    <Route path="fornecedores/:id/editar" element={<CadastroFornecedor />} />
                    <Route path="estoque/reposicao" element={<PedidoReposicao />} />
                    <Route path="estoque/importar" element={<ImportarNota />} />
                    <Route path="financeiro/avancado" element={<FinanceiroAdvanced />} />
                    <Route path="financeiro" element={<DashboardFinanceiro />} />
                    <Route path="financeiro/comissoes" element={<RelatorioComissoes />} />
                    <Route path="usuarios" element={<ListaUsuarios />} />
                    <Route path="usuarios/novo" element={<CadastroUsuario />} />
                    <Route path="usuarios/:id/editar" element={<CadastroUsuario />} />
                    <Route path="colaboradores" element={<ListaColaboradores />} />
                    <Route path="colaboradores/novo" element={<CadastroColaborador />} />
                    <Route path="colaboradores/:id/editar" element={<CadastroColaborador />} />
                    <Route path="agenda" element={<Agenda />} />
                    <Route path="relatorios" element={<Relatorios />} />
                    <Route path="admin" element={<PainelAdmin />} />
                    <Route path="crm" element={<CRMRetencao />} />
                    <Route path="prismas" element={<Prismas />} />
                    <Route path="configuracoes" element={<ConfiguracoesEmpresa />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}

function App() {
    // Carrega dados seed no primeiro acesso
    useEffect(() => {
        seedDatabase();
    }, []);

    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <TenantProvider>
                        <NotificationProvider>
                            <ToastProvider>
                                <OnboardingProvider>
                                    <AppRoutes />
                                    {/* <ReloadPrompt /> */}
                                    <NetworkStatusHandler />
                                </OnboardingProvider>
                            </ToastProvider>
                        </NotificationProvider>
                    </TenantProvider>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;
