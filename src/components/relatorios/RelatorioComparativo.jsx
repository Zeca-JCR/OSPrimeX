import { useMemo } from 'react';
import { formatCurrency } from '../../lib/utils';

const RelatorioComparativo = ({ ordens, servicos = [], ano, mes }) => {

    // Função auxiliar para calcular métricas de um mês específico
    const calcularMetricas = (targetAno, targetMes) => {
        // Filtrar ordens finalizadas do mês alvo
        const osDoMes = ordens.filter(o => {
            if (o.status !== 'finalizada') return false;
            // Tenta usar a data de finalização, se não existir use atualizadoEm, se não criadoEm
            const dataRef = o.dataFinalizacao || o.execucaoFinalizadaEm || o.atualizadoEm || o.criadoEm;
            if (!dataRef) return false;

            const data = new Date(dataRef);
            return data.getFullYear() === targetAno && data.getMonth() === targetMes;
        });

        const faturamento = osDoMes.reduce((acc, o) => acc + (Number(o.valorTotal) || 0), 0);
        const qtdOS = osDoMes.length;
        const ticketMedio = qtdOS > 0 ? faturamento / qtdOS : 0;

        return { faturamento, qtdOS, ticketMedio };
    };

    const metrics = useMemo(() => {
        // Mês Atual (o selecionado nos filtros)
        const current = calcularMetricas(ano, mes);

        // Mês Anterior
        // Tratar virada de ano (Janeiro -> Dezembro do ano anterior)
        const prevDate = new Date(ano, mes - 1, 1);
        const prevAno = prevDate.getFullYear();
        const prevMes = prevDate.getMonth();

        const previous = calcularMetricas(prevAno, prevMes);

        // Calcular Crescimento (%)
        const calcGrowth = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        return {
            current,
            previous,
            growth: {
                faturamento: calcGrowth(current.faturamento, previous.faturamento),
                qtdOS: calcGrowth(current.qtdOS, previous.qtdOS),
                ticketMedio: calcGrowth(current.ticketMedio, previous.ticketMedio)
            },
            mesAnteriorNome: prevDate.toLocaleString('pt-BR', { month: 'long' })
        };
    }, [ordens, ano, mes]);

    // Componente de Card Individual
    const ComparisonCard = ({ title, value, prevValue, growth, isCurrency = false, icon }) => {
        const isPositive = growth >= 0;
        const arrowIcon = isPositive ? 'trending_up' : 'trending_down';
        const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
        const bgClass = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';

        return (
            <div className="card p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark font-medium mb-1">
                        {title}
                    </p>
                    <h3 className="text-2xl font-bold text-text-light dark:text-text-dark">
                        {isCurrency ? formatCurrency(value) : value}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${bgClass} ${colorClass}`}>
                            <span className="material-symbols-outlined text-[14px] mr-1">{arrowIcon}</span>
                            {Math.abs(growth).toFixed(1)}%
                        </span>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            vs {isCurrency ? formatCurrency(prevValue) : prevValue} (mês anterior)
                        </span>
                    </div>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPositive ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-slideUp">
            <ComparisonCard
                title="Faturamento"
                value={metrics.current.faturamento}
                prevValue={metrics.previous.faturamento}
                growth={metrics.growth.faturamento}
                isCurrency={true}
                icon="payments"
            />
            <ComparisonCard
                title="Ticket Médio"
                value={metrics.current.ticketMedio}
                prevValue={metrics.previous.ticketMedio}
                growth={metrics.growth.ticketMedio}
                isCurrency={true}
                icon="receipt_long"
            />
            <ComparisonCard
                title="OS Finalizadas"
                value={metrics.current.qtdOS}
                prevValue={metrics.previous.qtdOS}
                growth={metrics.growth.qtdOS}
                isCurrency={false}
                icon="task_alt"
            />
        </div>
    );
};

export default RelatorioComparativo;
