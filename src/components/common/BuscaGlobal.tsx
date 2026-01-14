import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import storage from '../../lib/storage';
import { formatCurrency } from '../../lib/utils';
import type { Cliente, Veiculo, OrdemServico } from '../../types';

interface SearchResult {
    tipo: 'cliente' | 'veiculo' | 'os';
    icon: string;
    cor: string;
    titulo: string;
    subtitulo: string;
    link: string;
}

const BuscaGlobal = () => {
    const { empresa } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [resultados, setResultados] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Atalho de teclado Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: globalThis.KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
                setQuery('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focar no input quando abrir
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Buscar resultados
    useEffect(() => {
        const buscar = async () => {
            if (!query.trim() || query.length < 2) {
                setResultados([]);
                return;
            }

            setLoading(true);
            try {
                const [clientes, veiculos, ordens] = await Promise.all([
                    storage.getAll<Cliente>('clientes', empresa?.id ?? null),
                    storage.getAll<Veiculo>('veiculos', empresa?.id ?? null),
                    storage.getAll<OrdemServico>('ordens_servico', empresa?.id ?? null),
                ]);

                const termo = query.toLowerCase();
                const results: SearchResult[] = [];

                // Buscar clientes
                clientes
                    .filter(c => c.ativo && (
                        c.nome?.toLowerCase().includes(termo) ||
                        c.documento?.includes(termo) ||
                        c.telefone?.includes(termo)
                    ))
                    .slice(0, 5)
                    .forEach(c => {
                        results.push({
                            tipo: 'cliente',
                            icon: 'person',
                            cor: 'bg-blue-500',
                            titulo: c.nome,
                            subtitulo: c.telefone || c.documento || '',
                            link: `/clientes/${c.id}`,
                        });
                    });

                // Buscar veículos
                veiculos
                    .filter(v => v.ativo && (
                        v.placa?.toLowerCase().includes(termo) ||
                        v.marca?.toLowerCase().includes(termo) ||
                        v.modelo?.toLowerCase().includes(termo)
                    ))
                    .slice(0, 5)
                    .forEach(v => {
                        results.push({
                            tipo: 'veiculo',
                            icon: 'directions_car',
                            cor: 'bg-purple-500',
                            titulo: `${v.marca} ${v.modelo}`,
                            subtitulo: v.placa,
                            link: `/veiculos/${v.id}`,
                        });
                    });

                // Buscar OS
                ordens
                    .filter(o => o.ativo && (
                        String(o.numero).includes(termo) ||
                        clientes.find(c => c.id === o.clienteId)?.nome?.toLowerCase().includes(termo) ||
                        veiculos.find(v => v.id === o.veiculoId)?.placa?.toLowerCase().includes(termo)
                    ))
                    .slice(0, 5)
                    .forEach(o => {
                        const cliente = clientes.find(c => c.id === o.clienteId);
                        const veiculo = veiculos.find(v => v.id === o.veiculoId);
                        results.push({
                            tipo: 'os',
                            icon: 'assignment',
                            cor: o.status === 'finalizada' ? 'bg-green-500' :
                                o.status === 'execucao' ? 'bg-primary' :
                                    o.status === 'orcamento' ? 'bg-yellow-500' : 'bg-blue-500',
                            titulo: `OS #${o.numero}`,
                            subtitulo: `${cliente?.nome || 'Cliente'} • ${veiculo?.placa || ''} • ${formatCurrency(o.valorTotal || 0)}`,
                            link: `/os/${o.id}`,
                        });
                    });

                setResultados(results);
                setSelectedIndex(0);
            } catch (error) {
                console.error('Erro na busca:', error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(buscar, 200);
        return () => clearTimeout(debounce);
    }, [query, empresa?.id]);

    // Navegação por teclado
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, resultados.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && resultados[selectedIndex]) {
            navigate(resultados[selectedIndex].link);
            setIsOpen(false);
            setQuery('');
        }
    };

    const handleSelect = (resultado: SearchResult) => {
        navigate(resultado.link);
        setIsOpen(false);
        setQuery('');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
            >
                <span className="material-symbols-outlined text-lg">search</span>
                <span>Buscar...</span>
                <kbd className="px-1.5 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 font-mono">Ctrl+K</kbd>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => { setIsOpen(false); setQuery(''); }}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                    <span className="material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark">
                        search
                    </span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar clientes, veículos, OS..."
                        className="flex-1 bg-transparent outline-none text-text-light dark:text-text-dark placeholder-gray-400"
                        autoComplete="off"
                    />
                    {loading && (
                        <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                    )}
                    <kbd className="px-1.5 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark font-mono">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                    {resultados.length === 0 && query.length >= 2 && !loading && (
                        <div className="p-8 text-center text-text-secondary-light dark:text-text-secondary-dark">
                            <span className="material-symbols-outlined text-3xl mb-2">search_off</span>
                            <p>Nenhum resultado encontrado</p>
                        </div>
                    )}

                    {resultados.length === 0 && query.length < 2 && (
                        <div className="p-6 text-center text-text-secondary-light dark:text-text-secondary-dark">
                            <p className="text-sm">Digite pelo menos 2 caracteres para buscar</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                                <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">Clientes</span>
                                <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">Veículos</span>
                                <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">Placas</span>
                                <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">Número da OS</span>
                            </div>
                        </div>
                    )}

                    {resultados.map((resultado, index) => (
                        <button
                            key={`${resultado.tipo}-${index}`}
                            onClick={() => handleSelect(resultado)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${index === selectedIndex
                                ? 'bg-primary/10'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-lg ${resultado.cor} flex items-center justify-center text-white`}>
                                <span className="material-symbols-outlined">{resultado.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-text-light dark:text-text-dark truncate">
                                    {resultado.titulo}
                                </p>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark truncate">
                                    {resultado.subtitulo}
                                </p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark capitalize">
                                {resultado.tipo}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-gray-50 dark:bg-gray-800/50 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    <div className="flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700">↑↓</kbd>
                        <span>Navegar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700">Enter</kbd>
                        <span>Selecionar</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuscaGlobal;
