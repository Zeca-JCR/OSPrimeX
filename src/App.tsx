// @ts-nocheck
import { NotificationProvider } from './contexts/NotificationContext';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { OnboardingProvider } from './components/onboarding/OnboardingTour';
import { seedDatabase } from './lib/seed';

// Pages
import Login from './pages/auth/Login';
import MainLayout from './components/layout/MainLayout';
// import ReloadPrompt from './components/common/ReloadPrompt';
import NetworkStatusHandler from './components/common/NetworkStatusHandler';
import Dashboard from './pages/dashboard/Dashboard';
import ListaClientes from './pages/clientes/ListaClientes';
import CadastroCliente from './pages/clientes/CadastroCliente';
import DetalhesCliente from './pages/clientes/DetalhesCliente';
import ListaVeiculos from './pages/veiculos/ListaVeiculos';
import CadastroVeiculo from './pages/veiculos/CadastroVeiculo';
import KanbanOS from './pages/os/KanbanOS';
import DetalhesOS from './pages/os/DetalhesOS';
import ListaProdutos from './pages/estoque/ListaProdutos';
import CadastroProduto from './pages/estoque/CadastroProduto';
import HistoricoEstoque from './pages/estoque/HistoricoEstoque';
import Fornecedores from './pages/estoque/Fornecedores';
import CadastroFornecedor from './pages/estoque/CadastroFornecedor';
import PedidoReposicao from './pages/estoque/PedidoReposicao';
import ImportarNota from './pages/estoque/ImportarNota'; // Import novo
import DashboardFinanceiro from './pages/financeiro/DashboardFinanceiro';
import FinanceiroAdvanced from './pages/financeiro/advanced/FinanceiroAdvanced';
import RelatorioComissoes from './pages/financeiro/RelatorioComissoes';
import ListaUsuarios from './pages/usuarios/ListaUsuarios';
import CadastroUsuario from './pages/usuarios/CadastroUsuario';
import ListaColaboradores from './pages/colaboradores/ListaColaboradores';
import CadastroColaborador from './pages/colaboradores/CadastroColaborador';
import Agenda from './pages/agenda/Agenda';
import Relatorios from './pages/relatorios/Relatorios';
import RastreadorOS from './pages/public/RastreadorOS';
import RastreamentoPublico from './pages/os/RastreamentoPublico';
import LinkRedirect from './pages/public/LinkRedirect';
import LandingPage from './pages/public/LandingPage';
import PainelAdmin from './pages/admin/PainelAdmin';
import CRMRetencao from './pages/crm/CRMRetencao';
import ConfiguracoesEmpresa from './pages/configuracoes/ConfiguracoesEmpresa';
import Prismas from './pages/os/Prismas';

// Componente de rota protegida
const PrivateRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="animate-pulse-soft text-primary">
                    <span className="material-symbols-outlined text-5xl">sync</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Rota pública (redireciona se logado)
const PublicRoute = ({ children }) => {
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
                <Route path="financeiro" element={<DashboardFinanceiro />} />
                <Route path="financeiro/avancado" element={<FinanceiroAdvanced />} />
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

