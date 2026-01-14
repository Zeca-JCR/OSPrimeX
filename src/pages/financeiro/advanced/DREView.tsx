// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import storage from '../../../lib/storage';
import { formatCurrency } from '../../../lib/utils';

const DREView = () => {
    const { empresa } = useAuth();
    const [lancamentos, setLancamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [categoriasReceita, setCategoriasReceita] = useState(new Set());
    const [categoriasDespesa, setCategoriasDespesa] = useState(new Set());

    useEffect(() => {
        carregarDados();
    }, [empresa, ano]);

    const carregarDados = async () => {
        if (!empresa) return;
        setLoading(true);
        try {
            const data = await storage.getAll('lancamentos_financeiros', empresa.id);
            // Considerar apenas lançamentos EFETIVADOS (pago/recebido) e ativos
            // Se status for indefinido, consideramos como realizado (legado)
            const efetivados = data.filter(l =>
                l.ativo &&
                (l.status === 'pago' || !l.status) &&
                new Date(l.data || l.criadoEm).getFullYear() === ano
            );

            setLancamentos(efetivados);

            // Extrair categorias usadas
            const catReceita = new Set();
            const catDespesa = new Set();

            efetivados.forEach(l => {
                if (l.tipo === 'receita') catReceita.add(l.categoria);
                if (l.tipo === 'despesa') catDespesa.add(l.categoria);
            });

            setCategoriasReceita(Array.from(catReceita).sort());
            setCategoriasDespesa(Array.from(catDespesa).sort());

        } catch (error) {
            console.error('Erro ao carregar DRE:', error);
        } finally {
            setLoading(false);
        }
    };

    const getValor = (categoria, mes) => {
        return lancamentos
            .filter(l =>
                l.categoria === categoria &&
                new Date(l.data || l.criadoEm).getMonth() === mes
            )
            .reduce((sum, l) => sum + (l.valor || 0), 0);
    };

    const getTotalMes = (tipo, mes) => {
        return lancamentos
            .filter(l =>
                l.tipo === tipo &&
                new Date(l.data || l.criadoEm).getMonth() === mes
            )
            .reduce((sum, l) => sum + (l.valor || 0), 0);
    };

    const meses = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
            </div>
        );
    }

    // Calcula totais anuais para ordenação (opcional)
    const categoriasReceitaOrdenadas = [...categoriasReceita].sort();
    const categoriasDespesaOrdenadas = [...categoriasDespesa].sort();

    return (
        <div className="animate-fadeIn space-y-6">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                    Demonstrativo do Resultado (DRE)
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAno(ano - 1)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <span className="text-lg font-bold text-text-light dark:text-text-dark">{ano}</span>
                    <button
                        onClick={() => setAno(ano + 1)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="p-3 text-left min-w-[150px] font-bold text-text-light dark:text-text-dark sticky left-0 bg-gray-100 dark:bg-gray-800 z-10">Categoria</th>
                                {meses.map(mes => (
                                    <th key={mes} className="p-3 text-right min-w-[100px] text-text-secondary-light dark:text-text-secondary-dark">{mes}</th>
                                ))}
                                <th className="p-3 text-right min-w-[120px] font-bold text-text-light dark:text-text-dark bg-gray-100 dark:bg-gray-800">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {/* RECEITAS */}
                            <tr className="bg-green-50/50 dark:bg-green-900/10">
                                <td colSpan={14} className="p-2 font-bold text-green-700 dark:text-green-400 pl-4">RECEITAS</td>
                            </tr>
                            {categoriasReceitaOrdenadas.length === 0 && (
                                <tr><td colSpan={14} className="p-2 text-center text-gray-400 italic">Nenhuma receita lançada</td></tr>
                            )}
                            {categoriasReceitaOrdenadas.map(cat => (
                                <tr key={cat} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="p-2 pl-4 text-text-light dark:text-text-dark sticky left-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">{cat}</td>
                                    {meses.map((_, i) => (
                                        <td key={i} className="p-2 text-right text-gray-600 dark:text-gray-400">
                                            {formatCurrency(getValor(cat, i))}
                                        </td>
                                    ))}
                                    <td className="p-2 text-right font-medium text-text-light dark:text-text-dark bg-gray-50 dark:bg-gray-800/50">
                                        {formatCurrency(lancamentos.filter(l => l.categoria === cat).reduce((acc, curr) => acc + curr.valor, 0))}
                                    </td>
                                </tr>
                            ))}

                            {/* TOTAL RECEITAS */}
                            <tr className="bg-green-100 dark:bg-green-900/20 font-bold">
                                <td className="p-2 pl-4 text-green-800 dark:text-green-300 sticky left-0 bg-green-100 dark:bg-green-900/20 z-10">(=) RECEITA BRUTA</td>
                                {meses.map((_, i) => (
                                    <td key={i} className="p-2 text-right text-green-800 dark:text-green-300">
                                        {formatCurrency(getTotalMes('receita', i))}
                                    </td>
                                ))}
                                <td className="p-2 text-right text-green-800 dark:text-green-300">
                                    {formatCurrency(lancamentos.filter(l => l.tipo === 'receita').reduce((acc, curr) => acc + curr.valor, 0))}
                                </td>
                            </tr>

                            {/* DESPESAS */}
                            <tr className="bg-red-50/50 dark:bg-red-900/10">
                                <td colSpan={14} className="p-2 font-bold text-red-700 dark:text-red-400 pl-4 mt-4">DESPESAS</td>
                            </tr>
                            {categoriasDespesaOrdenadas.length === 0 && (
                                <tr><td colSpan={14} className="p-2 text-center text-gray-400 italic">Nenhuma despesa lançada</td></tr>
                            )}
                            {categoriasDespesaOrdenadas.map(cat => (
                                <tr key={cat} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="p-2 pl-4 text-text-light dark:text-text-dark sticky left-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">{cat}</td>
                                    {meses.map((_, i) => (
                                        <td key={i} className="p-2 text-right text-gray-600 dark:text-gray-400">
                                            {formatCurrency(getValor(cat, i))}
                                        </td>
                                    ))}
                                    <td className="p-2 text-right font-medium text-text-light dark:text-text-dark bg-gray-50 dark:bg-gray-800/50">
                                        {formatCurrency(lancamentos.filter(l => l.categoria === cat).reduce((acc, curr) => acc + curr.valor, 0))}
                                    </td>
                                </tr>
                            ))}

                            {/* TOTAL DESPESAS */}
                            <tr className="bg-red-100 dark:bg-red-900/20 font-bold">
                                <td className="p-2 pl-4 text-red-800 dark:text-red-300 sticky left-0 bg-red-100 dark:bg-red-900/20 z-10">(-) TOTAL DESPESAS</td>
                                {meses.map((_, i) => (
                                    <td key={i} className="p-2 text-right text-red-800 dark:text-red-300">
                                        {formatCurrency(getTotalMes('despesa', i))}
                                    </td>
                                ))}
                                <td className="p-2 text-right text-red-800 dark:text-red-300">
                                    {formatCurrency(lancamentos.filter(l => l.tipo === 'despesa').reduce((acc, curr) => acc + curr.valor, 0))}
                                </td>
                            </tr>

                            {/* RESULTADO OPERACIONAL */}
                            <tr className="bg-blue-600 text-white font-bold border-t-2 border-white dark:border-gray-700">
                                <td className="p-3 pl-4 sticky left-0 bg-blue-600 z-10">(=) RESULTADO OPERACIONAL</td>
                                {meses.map((_, i) => {
                                    const res = getTotalMes('receita', i) - getTotalMes('despesa', i);
                                    return (
                                        <td key={i} className={`p-3 text-right ${res < 0 ? 'text-red-200' : 'text-white'}`}>
                                            {formatCurrency(res)}
                                        </td>
                                    );
                                })}
                                <td className="p-3 text-right text-white">
                                    {formatCurrency(
                                        lancamentos.reduce((acc, curr) => acc + (curr.tipo === 'receita' ? curr.valor : -curr.valor), 0)
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DREView;

