import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const LandingPage = () => {
    const { isDark, toggleTheme } = useTheme();

    const features = [
        {
            icon: 'assignment',
            title: 'Ordens de Serviço',
            description: 'Kanban intuitivo para gerenciar todas as suas OS com drag-and-drop.',
        },
        {
            icon: 'group',
            title: 'Gestão de Clientes',
            description: 'Cadastro completo de clientes PF/PJ com histórico de atendimentos.',
        },
        {
            icon: 'directions_car',
            title: 'Controle de Veículos',
            description: 'Vincule veículos aos clientes e acompanhe todo o histórico.',
        },
        {
            icon: 'inventory_2',
            title: 'Estoque Integrado',
            description: 'Controle de produtos e serviços com movimentações automáticas.',
        },
        {
            icon: 'payments',
            title: 'Financeiro Completo',
            description: 'Dashboard com receitas, despesas e controle de pagamentos.',
        },
        {
            icon: 'bar_chart',
            title: 'Relatórios Detalhados',
            description: 'Análise de faturamento, clientes, serviços e muito mais.',
        },
    ];

    const plans = [
        {
            name: 'Starter',
            price: 'R$ 99',
            period: '/mês',
            features: ['Até 3 usuários', '100 OS/mês', 'Relatórios básicos', 'Suporte por email'],
            popular: false,
        },
        {
            name: 'Professional',
            price: 'R$ 199',
            period: '/mês',
            features: ['Até 10 usuários', 'OS ilimitadas', 'Relatórios avançados', 'Rastreador de OS', 'Suporte prioritário'],
            popular: true,
        },
        {
            name: 'Enterprise',
            price: 'R$ 399',
            period: '/mês',
            features: ['Usuários ilimitados', 'OS ilimitadas', 'Todos os add-ons', 'API de integração', 'Suporte 24/7'],
            popular: false,
        },
    ];

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">build</span>
                        </div>
                        <span className="text-xl font-bold text-text-light dark:text-text-dark">OSPrimeX</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <span className="material-symbols-outlined text-text-light dark:text-text-dark">
                                {isDark ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>
                        <Link to="/rastrear" className="text-sm text-text-light dark:text-text-dark hover:text-primary">
                            Rastrear OS
                        </Link>
                        <Link to="/login" className="btn-primary py-2 px-4">
                            Entrar
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-6xl font-bold text-text-light dark:text-text-dark mb-6">
                        Gestão de Oficina <br />
                        <span className="text-primary">Simples e Eficiente</span>
                    </h1>
                    <p className="text-lg md:text-xl text-text-secondary-light dark:text-text-secondary-dark mb-8 max-w-2xl mx-auto">
                        Sistema completo para gerenciar sua oficina mecânica. Controle de OS, clientes, estoque, financeiro e muito mais em um só lugar.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link to="/login" className="btn-primary py-3 px-8 text-lg">
                            <span className="material-symbols-outlined">rocket_launch</span>
                            Começar Agora
                        </Link>
                        <a href="#features" className="btn-secondary py-3 px-8 text-lg">
                            <span className="material-symbols-outlined">info</span>
                            Saiba Mais
                        </a>
                    </div>
                </div>

                {/* Hero Image Placeholder */}
                <div className="max-w-5xl mx-auto mt-16">
                    <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center overflow-hidden shadow-2xl">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-7xl text-primary/50 mb-4">dashboard</span>
                            <p className="text-primary/50 font-medium">Dashboard do Sistema</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="py-20 px-4 bg-gray-50 dark:bg-gray-900/50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-text-light dark:text-text-dark mb-4">
                            Tudo que você precisa
                        </h2>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark max-w-2xl mx-auto">
                            Funcionalidades completas para gerenciar sua oficina de forma profissional.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="card p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                                    <span className="material-symbols-outlined">{feature.icon}</span>
                                </div>
                                <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-text-light dark:text-text-dark mb-4">
                            Planos e Preços
                        </h2>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark max-w-2xl mx-auto">
                            Escolha o plano ideal para o tamanho da sua operação.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {plans.map((plan, index) => (
                            <div
                                key={index}
                                className={`card p-6 relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                                        Mais Popular
                                    </div>
                                )}
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
                                        {plan.name}
                                    </h3>
                                    <div className="flex items-end justify-center gap-1">
                                        <span className="text-4xl font-bold text-primary">{plan.price}</span>
                                        <span className="text-text-secondary-light dark:text-text-secondary-dark">{plan.period}</span>
                                    </div>
                                </div>
                                <ul className="space-y-3 mb-6">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-text-light dark:text-text-dark">
                                            <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    to="/login"
                                    className={`block text-center py-3 rounded-xl font-medium transition-colors ${plan.popular
                                            ? 'bg-primary text-white hover:bg-primary-hover'
                                            : 'bg-gray-100 dark:bg-gray-800 text-text-light dark:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    Começar Agora
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4 bg-primary">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Pronto para transformar sua oficina?
                    </h2>
                    <p className="text-white/80 mb-8 max-w-2xl mx-auto">
                        Junte-se a centenas de oficinas que já modernizaram sua gestão com o OSPrimeX.
                    </p>
                    <Link to="/login" className="inline-flex items-center gap-2 bg-white text-primary py-3 px-8 rounded-xl font-bold hover:bg-gray-100 transition-colors">
                        <span className="material-symbols-outlined">rocket_launch</span>
                        Teste Grátis por 14 Dias
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 bg-gray-900 text-white">
                <div className="max-w-6xl mx-auto">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-lg">build</span>
                                </div>
                                <span className="text-lg font-bold">OSPrimeX</span>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Sistema de gestão completo para oficinas mecânicas e autocenters.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Produto</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#features" className="hover:text-white">Funcionalidades</a></li>
                                <li><a href="#pricing" className="hover:text-white">Preços</a></li>
                                <li><Link to="/rastrear" className="hover:text-white">Rastrear OS</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Suporte</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#" className="hover:text-white">Central de Ajuda</a></li>
                                <li><a href="#" className="hover:text-white">Contato</a></li>
                                <li><a href="#" className="hover:text-white">Status do Sistema</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#" className="hover:text-white">Termos de Uso</a></li>
                                <li><a href="#" className="hover:text-white">Política de Privacidade</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
                        <p>© 2024 OSPrimeX. Todos os direitos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
