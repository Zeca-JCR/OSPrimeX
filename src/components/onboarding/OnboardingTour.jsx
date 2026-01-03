import { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// Context para gerenciar o estado do onboarding
const OnboardingContext = createContext();

export const useOnboarding = () => useContext(OnboardingContext);

// Passos do tour
const TOUR_STEPS = [
    {
        id: 'welcome',
        title: 'Bem-vindo ao OSPrimeX! 🚀',
        description: 'Vamos fazer um tour rápido pelo sistema para você começar a usar todas as funcionalidades.',
        position: 'center',
    },
    {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Aqui você tem uma visão geral da sua oficina: OS aprovadas, faturamento e atividades recentes.',
        target: '[data-tour="dashboard"]',
        position: 'bottom',
    },
    {
        id: 'clientes',
        title: 'Clientes',
        description: 'Cadastre e gerencie seus clientes. Cada cliente pode ter múltiplos veículos vinculados.',
        target: '[data-tour="clientes"]',
        position: 'right',
    },
    {
        id: 'os',
        title: 'Ordens de Serviço',
        description: 'Gerencie suas OS em um Kanban visual. Arraste entre colunas para mudar o status.',
        target: '[data-tour="os"]',
        position: 'right',
    },
    {
        id: 'estoque',
        title: 'Estoque',
        description: 'Controle produtos e serviços. O estoque é atualizado automaticamente ao finalizar OS.',
        target: '[data-tour="estoque"]',
        position: 'right',
    },
    {
        id: 'financeiro',
        title: 'Financeiro',
        description: 'Acompanhe receitas, despesas e comissões de técnicos em tempo real.',
        target: '[data-tour="financeiro"]',
        position: 'right',
    },
    {
        id: 'complete',
        title: 'Pronto para começar! 🎉',
        description: 'Você já conhece o básico. Explore o sistema e, se precisar de ajuda, clique no ícone de ajuda.',
        position: 'center',
    },
];

// Provider do Onboarding
export const OnboardingProvider = ({ children }) => {
    const { isAuthenticated, usuario } = useAuth();
    const [showTour, setShowTour] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [tourCompleted, setTourCompleted] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !usuario) return;

        // Verificar se é primeiro acesso (agora por usuário)
        const key = `osprimex_tour_completed_${usuario.id}`;
        const completed = localStorage.getItem(key);

        if (!completed) {
            // Delay para dar tempo da interface carregar
            setTimeout(() => setShowTour(true), 1000);
        } else {
            setTourCompleted(true);
        }
    }, [isAuthenticated, usuario]);

    const startTour = () => {
        setCurrentStep(0);
        setShowTour(true);
    };

    const nextStep = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            completeTour();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const skipTour = () => {
        completeTour();
    };

    const completeTour = () => {
        if (!usuario) return;
        setShowTour(false);
        setTourCompleted(true);
        localStorage.setItem(`osprimex_tour_completed_${usuario.id}`, 'true');
    };

    const resetTour = () => {
        if (!usuario) return;
        localStorage.removeItem(`osprimex_tour_completed_${usuario.id}`);
        setTourCompleted(false);
        setCurrentStep(0);
        setShowTour(true);
    };

    return (
        <OnboardingContext.Provider value={{
            showTour,
            currentStep,
            tourCompleted,
            steps: TOUR_STEPS,
            startTour,
            nextStep,
            prevStep,
            skipTour,
            completeTour,
            resetTour,
        }}>
            {children}
            {showTour && <TourOverlay />}
        </OnboardingContext.Provider>
    );
};

// Componente do overlay do tour
const TourOverlay = () => {
    const { currentStep, steps, nextStep, prevStep, skipTour } = useOnboarding();
    const step = steps[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === steps.length - 1;
    const isCentered = step.position === 'center';

    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const [tooltipStyle, setTooltipStyle] = useState({});

    useEffect(() => {
        const updatePosition = () => {
            if (isCentered) {
                setTooltipStyle({
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                });
                return;
            }

            const element = document.querySelector(step.target);
            if (element) {
                const rect = element.getBoundingClientRect();
                setCoords({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                });

                // Calcular posição do tooltip
                let style = {};
                if (step.position === 'right') {
                    style = {
                        top: rect.top + (rect.height / 2) - 100, // Centralizar verticalmente (estimativa) mais ou menos
                        left: rect.right + 20,
                    };
                } else if (step.position === 'bottom') {
                    style = {
                        top: rect.bottom + 20,
                        left: rect.left + (rect.width / 2) - 150, // Centralizar horizontalmente
                    };
                }
                setTooltipStyle(style);
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [currentStep, step, isCentered]);

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop - renderizar APENAS se estiver centralizado (sem alvo) */}
            {isCentered && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            )}

            {/* Elemento de destaque (se não for centro) 
                Usamos shadow ring gigante para escurecer o resto da tela
            */}
            {!isCentered && (
                <div
                    className="absolute bg-transparent border-2 border-primary rounded-lg transition-all duration-300 ease-in-out pointer-events-none"
                    style={{
                        top: coords.top - 4,
                        left: coords.left - 4,
                        width: coords.width + 8,
                        height: coords.height + 8,
                        zIndex: 10,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)' // O "buraco" do spotlight
                    }}
                />
            )}

            {/* Tooltip */}
            <div
                className={`
                    absolute z-50 w-full max-w-md p-6 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl
                    animate-slideUp transition-all duration-300 ease-in-out
                `}
                style={tooltipStyle}
            >
                {/* Progress */}
                <div className="flex gap-1 mb-4">
                    {steps.map((_, index) => (
                        <div
                            key={index}
                            className={`h-1 flex-1 rounded-full transition-colors ${index <= currentStep ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                        />
                    ))}
                </div>

                {/* Content */}
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
                        {step.title}
                    </h3>
                    <p className="text-text-secondary-light dark:text-text-secondary-dark">
                        {step.description}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={skipTour}
                        className="text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-primary transition-colors"
                    >
                        Pular tour
                    </button>
                    <div className="flex gap-2">
                        {!isFirst && (
                            <button
                                onClick={prevStep}
                                className="btn-secondary px-4 py-2"
                            >
                                Voltar
                            </button>
                        )}
                        <button
                            onClick={nextStep}
                            className="btn-primary px-6 py-2"
                        >
                            {isLast ? 'Começar!' : 'Próximo'}
                        </button>
                    </div>
                </div>

                {/* Decorative elements */}
                {isCentered && (
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-white text-4xl">
                                {isFirst ? 'waving_hand' : isLast ? 'celebration' : 'lightbulb'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Step indicator */}
            {!isCentered && (
                <div
                    className="absolute text-white text-sm font-medium px-3 py-1 bg-black/50 rounded-full backdrop-blur-md"
                    style={{
                        top: parseFloat(tooltipStyle.top) + (step.position.includes('bottom') ? -40 : 200), // Ajuste meio hacking, mas funcional
                        left: parseFloat(tooltipStyle.left) + 20
                    }}
                >
                    {currentStep + 1} de {steps.length}
                </div>
            )}
            {isCentered && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium">
                    {currentStep + 1} de {steps.length}
                </div>
            )}
        </div>
    );
};

// Componente de botão para reiniciar o tour
export const RestartTourButton = () => {
    const { resetTour } = useOnboarding();

    return (
        <button
            onClick={resetTour}
            className="flex items-center gap-2 text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-primary transition-colors"
        >
            <span className="material-symbols-outlined text-lg">help</span>
            Refazer tour
        </button>
    );
};

export default OnboardingProvider;
