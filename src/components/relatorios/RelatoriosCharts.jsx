import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush,
    BarChart, Bar,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { formatCurrency } from '../../lib/utils';

// Cores para gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// === GRÁFICO DE FATURAMENTO (ÁREA) ===
export const FaturamentoChart = ({ data }) => {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tickFormatter={(value) => `R$ ${value}`}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="valor"
                        stroke="#137fec"
                        fill="#137fec"
                        fillOpacity={0.1}
                        name="Faturamento"
                    />
                    <Brush dataKey="name" height={30} stroke="#137fec" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

// === GRÁFICO FINANCEIRO (BARRA) ===
export const FinanceiroChart = ({ data }) => {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `R$${val}`} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// === GRÁFICO DE PIZZA (GENÉRICO) ===
export const DistributionChart = ({ data, dataKey = "value", nameKey = "name" }) => {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey={dataKey}
                        nameKey={nameKey}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value) => dataKey === 'valor' ? formatCurrency(value) : value}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
