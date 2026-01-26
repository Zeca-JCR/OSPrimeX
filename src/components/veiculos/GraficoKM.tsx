import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate } from '../../lib/utils';
import { HistoricoKM } from '../../types';

interface GraficoKMProps {
    dados: HistoricoKM[];
}

const GraficoKM: React.FC<GraficoKMProps> = ({ dados }) => {
    // Se não houver dados suficientes, não exibe o gráfico
    if (!dados || dados.length < 2) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">show_chart</span>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center">
                    Histórico insuficiente para gerar gráfico.<br />
                    Complete mais Ordens de Serviço para ver a evolução.
                </p>
            </div>
        );
    }

    // Formatar dados para o gráfico
    const data = dados.map(item => ({
        date: formatDate(item.data), // Formato legível para tooltip
        timestamp: new Date(item.data).getTime(), // Para ordenação se necessário
        km: Number(item.km),
        os: item.osNumero
    }));

    return (
        <div className="w-full h-[300px] bg-white dark:bg-gray-800 p-4 rounded-xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
            <h3 className="font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">ssid_chart</span>
                Evolução da Quilometragem
            </h3>

            <ResponsiveContainer width="100%" height="90%">
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis
                        dataKey="date"
                        stroke="#6B7280"
                        fontSize={12}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="#6B7280"
                        fontSize={12}
                        tickFormatter={(value) => `${value / 1000}k`}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value: number) => [`${value} km`, 'Quilometragem']}
                        labelStyle={{ color: '#374151', marginBottom: '0.25rem' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="km"
                        stroke="var(--color-primary)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GraficoKM;
