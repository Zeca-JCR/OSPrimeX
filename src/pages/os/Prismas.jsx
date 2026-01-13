import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import storage from '../../lib/storage';

const Prismas = () => {
    const { empresa } = useAuth();
    const navigate = useNavigate();
    const [osAtivas, setOsAtivas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarOSAtivas();

        const handleStorageChange = (e) => {
            if (e.detail?.key?.includes('ordens_servico')) {
                carregarOSAtivas();
            }
        };

        window.addEventListener('osprimex-storage', handleStorageChange);
        return () => window.removeEventListener('osprimex-storage', handleStorageChange);
    }, []);

    const carregarOSAtivas = async () => {
        try {
            const todas = await storage.getAll('ordens_servico');
            // Filtro generalizado: Pega qualquer OS que tenha prisma E não esteja finalizada/cancelada
            const ativas = todas.filter(os =>
                !['finalizada', 'cancelada'].includes(os.status) &&
                os.prisma !== null && os.prisma !== undefined
            );
            setOsAtivas(ativas);
        } catch (error) {
            console.error("Erro ao carregar prismas:", error);
            setOsAtivas([]);
        } finally {
            setLoading(false);
        }
    };

    // Mapear prismas às OSs
    const prismasMap = new Map();
    osAtivas.forEach(os => {
        if (os.prisma) {
            prismasMap.set(Number(os.prisma), os);
        }
    });

    // Criar array com todos os prismas numbers (1 até quantidade configurada)
    // GARANTIA ANTI-CRASH: Fallback seguro para 20 se undefined/null/0
    const qtdPrismas = empresa?.prismaQuantidade ? parseInt(empresa.prismaQuantidade) : 20;
    const totalPrismas = (!isNaN(qtdPrismas) && qtdPrismas > 0) ? qtdPrismas : 20;

    const prismas = Array.from({ length: totalPrismas }, (_, i) => i + 1);

    // Contar disponíveis
    const disponiveis = totalPrismas - prismasMap.size;

    // Função para determinar cor do status
    const getCorStatus = (status) => {
        switch (status) {
            case 'execucao':
                return 'bg-yellow-500';
            case 'aguardando_peca':
                return 'bg-red-500';
            case 'orcamento':
            case 'aberta':
                return 'bg-gray-400';
            default:
                return 'bg-gray-300';
        }
    };

    const getLabelStatus = (status) => {
        switch (status) {
            case 'execucao':
                return 'Em Execução';
            case 'aguardando_peca':
                return 'Aguardando Peça';
            case 'orcamento':
                return 'Orçamento';
            case 'aberta':
                return 'Aberta';
            default:
                return status;
        }
    };

    // Emoji da cor configurada
    const emojiCor = empresa?.prismaCor === 'Vermelho' ? '🔴' :
        empresa?.prismaCor === 'Azul' ? '🔵' :
            empresa?.prismaCor === 'Verde' ? '🟢' :
                empresa?.prismaCor === 'Amarelo' ? '🟡' :
                    empresa?.prismaCor === 'Preto' ? '⚫' :
                        empresa?.prismaCor === 'Laranja' ? '🟠' : '⚪';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-pulse-soft text-primary">
                    <span className="material-symbols-outlined text-5xl">sync</span>
                </div>
            </div>
        );
    }

    // Redirecionar se empresa não usa prismas
    if (!empresa || !empresa.usarPrismas) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                    <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">info</span>
                    <h2 className="text-xl font-bold mb-2">Recurso não disponível</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        O controle de prismas não está ativado nas configurações da empresa.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
                    {emojiCor} Painel de Prismas
                </h1>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    Visualização em tempo real dos prismas em uso
                </p>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">filter_9_plus</span>
                        </div>
                        <div>
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Total</p>
                            <p className="text-2xl font-bold text-text-light dark:text-text-dark">{totalPrismas}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                        </div>
                        <div>
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Disponíveis</p>
                            <p className="text-2xl font-bold text-text-light dark:text-text-dark">{disponiveis}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">construction</span>
                        </div>
                        <div>
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Em Uso</p>
                            <p className="text-2xl font-bold text-text-light dark:text-text-dark">{prismasMap.size}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legenda */}
            <div className="card p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">Legenda:</span>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm">Disponível</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-sm">Em Execução</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm">Aguardando Peça</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="text-sm">Aberta/Orçamento</span>
                    </div>
                </div>
            </div>

            {/* Grid de Prismas */}
            <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4">Prismas ({empresa?.prismaCor || 'Vermelho'})</h2>
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
                    {prismas.map(num => {
                        const os = prismasMap.get(num);
                        const corStatus = os ? getCorStatus(os.status) : 'bg-green-500';
                        const disponivel = !os;

                        return (
                            <button
                                key={num}
                                onClick={() => os && navigate(`/os/${os.id}`)}
                                className={`aspect-square rounded-lg border-2 p-2 transition-all ${os
                                    ? 'border-gray-400 hover:border-gray-600 hover:scale-105 cursor-pointer shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 cursor-default'
                                    }`}
                                title={os ? `OS #${os.numero} - ${getLabelStatus(os.status)}` : 'Disponível'}
                            >
                                <div className="flex flex-col items-center justify-center h-full gap-1">
                                    <span className="text-lg font-bold text-text-light dark:text-text-dark">{num}</span>
                                    <div className={`w-3 h-3 rounded-full ${corStatus}`}></div>
                                    {os && (
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">#{os.numero}</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {prismasMap.size === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2">sentiment_satisfied</span>
                        <p>Todos os prismas estão disponíveis!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Prismas;
