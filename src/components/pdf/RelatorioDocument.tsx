import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Empresa } from '../../types';

// Estilos
const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 10 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#137fec' },
    subtitle: { fontSize: 10, color: '#666' },
    section: { marginBottom: 15 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 5, backgroundColor: '#f0f0f0', padding: 5 },

    // Tabela
    table: { display: 'flex', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#bfbfbf', borderRightWidth: 0, borderBottomWidth: 0 },
    tableRow: { margin: 'auto', flexDirection: 'row' },
    tableColHeader: { width: '25%', borderStyle: 'solid', borderWidth: 1, borderColor: '#bfbfbf', borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#f0f0f0', padding: 5 },
    tableCol: { width: '25%', borderStyle: 'solid', borderWidth: 1, borderColor: '#bfbfbf', borderLeftWidth: 0, borderTopWidth: 0, padding: 5 },
    tableCellHeader: { margin: 'auto', marginTop: 5, fontSize: 10, fontWeight: 'bold' },
    tableCell: { margin: 'auto', marginTop: 5, fontSize: 10 },

    // Resumo
    card: { padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 4, marginBottom: 10, width: '30%' },
    cardTitle: { fontSize: 8, color: '#666' },
    cardValue: { fontSize: 14, fontWeight: 'bold', color: '#333' }
});

const formatCurrency = (value?: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

interface TableHeader {
    label: string;
    width?: string;
    align?: 'left' | 'right' | 'center' | 'justify';
}

interface TableProps {
    headers: TableHeader[];
    data: any[];
    renderRow: (item: any) => React.ReactNode[];
}

// Componente para renderizar tabela dinâmica
const Table: React.FC<TableProps> = ({ headers, data, renderRow }) => (
    <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableRow}>
            {headers.map((h, i) => (
                <View key={i} style={{ ...styles.tableColHeader, width: h.width || `${100 / headers.length}%` }}>
                    <Text style={styles.tableCellHeader}>{h.label}</Text>
                </View>
            ))}
        </View>
        {/* Rows */}
        {data.map((item, index) => (
            <View key={index} style={styles.tableRow}>
                {renderRow(item).map((cell, i) => (
                    <View key={i} style={{ ...styles.tableCol, width: headers[i].width || `${100 / headers.length}%`, ...(index % 2 === 1 ? { backgroundColor: '#f9f9f9' } : {}) }}>
                        <Text style={{ ...styles.tableCell, textAlign: headers[i].align || 'left' }}>{cell}</Text>
                    </View>
                ))}
            </View>
        ))}
    </View>
);

interface RelatorioData {
    // Campos comuns
    totalFaturado?: number;
    ticketMedio?: number;
    qtdOS?: number;
    porDia?: Record<string, number>;

    // Financeiro
    receitas?: number;
    despesas?: number;
    saldo?: number;
    receitasPorCategoria?: Record<string, number>;
    despesasPorCategoria?: Record<string, number>;

    // OS Status
    porStatus?: Record<string, number>;
    total?: number;

    // Clientes
    totalClientes?: number;
    clientesAtendidos?: number;
    topClientes?: Array<{ nome: string; qtd: number; valor: number }>;
}

interface RelatorioDocumentProps {
    tipo: 'faturamento' | 'financeiro' | 'os_status' | 'clientes';
    dados: RelatorioData;
    periodo?: string; // Not used in render but present in props
    empresa: Empresa | null;
}

export const RelatorioDocument: React.FC<RelatorioDocumentProps> = ({ tipo, dados, periodo, empresa }) => {
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    // Renderizadores específicos por tipo
    const renderContent = () => {
        switch (tipo) {
            case 'faturamento':
                return (
                    <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Total Faturado</Text>
                                <Text style={styles.cardValue}>{formatCurrency(dados.totalFaturado)}</Text>
                            </View>
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Ticket Médio</Text>
                                <Text style={styles.cardValue}>{formatCurrency(dados.ticketMedio)}</Text>
                            </View>
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Qtd. OS</Text>
                                <Text style={styles.cardValue}>{dados.qtdOS}</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Detalhamento por Dia</Text>
                        <Table
                            headers={[
                                { label: 'Data', width: '50%' },
                                { label: 'Faturamento', width: '50%', align: 'right' }
                            ]}
                            data={Object.entries(dados.porDia || {}).sort((a, b) => {
                                // Convert DD/MM/YYYY to Date object for comparison
                                const dateA = new Date(a[0].split('/').reverse().join('-'));
                                const dateB = new Date(b[0].split('/').reverse().join('-'));
                                return dateB.getTime() - dateA.getTime();
                            })}
                            renderRow={([dia, valor]) => [dia, formatCurrency(valor)]}
                        />
                    </>
                );

            case 'financeiro':
                return (
                    <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Receitas</Text>
                                <Text style={{ ...styles.cardValue, color: 'green' }}>{formatCurrency(dados.receitas)}</Text>
                            </View>
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Despesas</Text>
                                <Text style={{ ...styles.cardValue, color: 'red' }}>{formatCurrency(dados.despesas)}</Text>
                            </View>
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Saldo</Text>
                                <Text style={{ ...styles.cardValue, color: (dados.saldo || 0) >= 0 ? 'blue' : 'red' }}>{formatCurrency(dados.saldo)}</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Receitas por Categoria</Text>
                        <Table
                            headers={[{ label: 'Categoria', width: '60%' }, { label: 'Valor', width: '40%', align: 'right' }]}
                            data={Object.entries(dados.receitasPorCategoria || {}).sort((a, b) => b[1] - a[1])}
                            renderRow={([cat, val]) => [cat.toUpperCase(), formatCurrency(val)]}
                        />

                        <View style={{ marginTop: 15 }} />

                        <Text style={styles.sectionTitle}>Despesas por Categoria</Text>
                        <Table
                            headers={[{ label: 'Categoria', width: '60%' }, { label: 'Valor', width: '40%', align: 'right' }]}
                            data={Object.entries(dados.despesasPorCategoria || {}).sort((a, b) => b[1] - a[1])}
                            renderRow={([cat, val]) => [cat.toUpperCase(), formatCurrency(val)]}
                        />
                    </>
                );

            case 'os_status':
                return (
                    <>
                        <Text style={styles.sectionTitle}>Resumo de Status</Text>
                        <Table
                            headers={[
                                { label: 'Status', width: '60%' },
                                { label: 'Quantidade', width: '20%', align: 'center' },
                                { label: '%', width: '20%', align: 'right' },
                            ]}
                            data={Object.entries(dados.porStatus || {})}
                            renderRow={([status, qtd]) => {
                                const percent = (dados.total || 0) > 0 ? (qtd / (dados.total || 1) * 100).toFixed(1) : 0;
                                const statusLabels: Record<string, string> = {
                                    aberta: 'APROVADA (NÃO INICIADA)',
                                    execucao: 'EM EXECUÇÃO',
                                    finalizada: 'FINALIZADA',
                                    cancelada: 'CANCELADA',
                                    orcamento: 'ORÇAMENTO',
                                    aguardando_peca: 'AGUARDANDO PEÇA'
                                };
                                return [statusLabels[status] || status.toUpperCase(), qtd, `${percent}%`];
                            }}
                        />
                    </>
                );

            case 'clientes':
                return (
                    <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Total Clientes</Text>
                                <Text style={styles.cardValue}>{dados.totalClientes}</Text>
                            </View>
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Atendidos no Período</Text>
                                <Text style={styles.cardValue}>{dados.clientesAtendidos}</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Top 10 Clientes (Faturamento)</Text>
                        <Table
                            headers={[
                                { label: 'Cliente', width: '50%' },
                                { label: 'Atendimentos', width: '20%', align: 'center' },
                                { label: 'Total Gasto', width: '30%', align: 'right' },
                            ]}
                            data={dados.topClientes || []}
                            renderRow={(c: any) => [c.nome, c.qtd, formatCurrency(c.valor)]}
                        />
                    </>
                );

            default:
                return <Text>Relatório sem layout de impressão específico.</Text>;
        }
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>{empresa?.nomeFantasia || 'OSPrimeX'}</Text>
                        <Text style={styles.subtitle}>Relatório Gerencial</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{tipo.toUpperCase().replace('_', ' ')}</Text>
                        <Text style={styles.subtitle}>{dataAtual}</Text>
                    </View>
                </View>

                {renderContent()}

                <Text style={{ position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#999' }}>
                    Documento gerado automaticamente pelo sistema OSPrimeX
                </Text>
            </Page>
        </Document>
    );
};
