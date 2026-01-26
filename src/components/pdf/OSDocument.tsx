import React, { useState } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image, pdf } from '@react-pdf/renderer';
import { gerarPayloadPix } from '../../lib/pix';
import { calcularResumoFinanceiro, formatCurrency, formatDate } from '../../lib/utils';
import { OrdemServico, Cliente, Veiculo, Empresa, Usuario } from '../../types';

// =====================================================
// ESTILOS
// =====================================================

// Estilos do PDF A4
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: '#137fec',
    },
    logo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#137fec',
    },
    empresaInfo: {
        fontSize: 8,
        color: '#666',
        marginTop: 2,
    },
    docType: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    docNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#137fec',
    },
    docStatus: {
        fontSize: 10,
        color: '#666',
    },
    badge: {
        backgroundColor: '#137fec',
        color: 'white',
        padding: '4 8',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 'bold',
    },
    badgeOrcamento: {
        backgroundColor: '#f59e0b',
        color: 'white',
        padding: '4 8',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    label: {
        width: 100,
        color: '#666',
    },
    value: {
        flex: 1,
        fontWeight: 'bold',
    },
    table: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        padding: 8,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    colItem: { flex: 3 },
    colQtd: { width: 50, textAlign: 'center' },
    colUnit: { width: 80, textAlign: 'right' },
    colTotal: { width: 80, textAlign: 'right' },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 2,
        borderTopColor: '#137fec',
    },
    totalLabel: {
        fontSize: 12,
        marginRight: 20,
    },
    totalValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#137fec',
    },
    // Seção PIX
    pixSection: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#f0f9ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#137fec',
    },
    pixTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#137fec',
        marginBottom: 10,
        textAlign: 'center',
    },
    pixKey: {
        fontSize: 11,
        textAlign: 'center',
        fontWeight: 'bold',
        backgroundColor: 'white',
        padding: 8,
        borderRadius: 4,
        marginBottom: 5,
    },
    pixInfo: {
        fontSize: 8,
        color: '#666',
        textAlign: 'center',
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        color: '#999',
        fontSize: 8,
        borderTopWidth: 1,
        borderTopColor: '#e5e5e5',
        paddingTop: 10,
    },
    assinatura: {
        marginTop: 40,
        paddingTop: 20,
    },
    linhaAssinatura: {
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        width: 200,
        marginBottom: 5,
    },
    textoAssinatura: {
        fontSize: 8,
        color: '#666',
    },
    // Seção de Fotos
    fotosSection: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#e5e5e5',
    },
    fotosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
    },
    fotoItem: {
        width: '47%',
        marginRight: '3%',
        marginBottom: 10,
    },
    fotoItemLast: {
        width: '47%',
        marginRight: 0,
        marginBottom: 10,
    },
    fotoImage: {
        width: '100%',
        height: 150,
        objectFit: 'cover',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    fotoCaption: {
        fontSize: 7,
        color: '#666',
        marginTop: 3,
        textAlign: 'center',
    },
    // Aprovação de orçamento
    aprovacaoBox: {
        marginTop: 15,
        padding: 15,
        borderWidth: 2,
        borderColor: '#f59e0b',
        borderStyle: 'dashed',
        borderRadius: 8,
    },
    aprovacaoTitulo: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#f59e0b',
        marginBottom: 10,
    },
    aprovacaoOpcoes: {
        flexDirection: 'row',
        gap: 20,
    },
    checkbox: {
        width: 14,
        height: 14,
        borderWidth: 1,
        borderColor: '#333',
        marginRight: 5,
    },
});

// Estilos para impressão térmica 80mm
const thermalStyles = StyleSheet.create({
    page: {
        padding: 10,
        fontSize: 9,
        fontFamily: 'Helvetica',
        width: 226, // 80mm em pontos
    },
    header: {
        textAlign: 'center',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        borderStyle: 'dashed',
    },
    logo: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    empresaInfo: {
        fontSize: 7,
        textAlign: 'center',
        color: '#333',
    },
    docInfo: {
        textAlign: 'center',
        marginVertical: 5,
    },
    docType: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    separator: {
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        borderStyle: 'dashed',
        marginVertical: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    label: {
        fontSize: 8,
        color: '#666',
    },
    value: {
        fontSize: 8,
        fontWeight: 'bold',
    },
    itemRow: {
        marginBottom: 3,
    },
    itemNome: {
        fontSize: 8,
    },
    itemDetalhe: {
        fontSize: 7,
        color: '#666',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    totalSection: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 2,
        borderTopColor: '#000',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    totalLabel: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    totalValue: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    footer: {
        marginTop: 10,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#000',
        borderStyle: 'dashed',
        textAlign: 'center',
    },
    footerText: {
        fontSize: 7,
        color: '#666',
        textAlign: 'center',
    },
});

// =====================================================
// UTILITÁRIOS
// =====================================================

const formatTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// Detectar se é orçamento ou OS
const isOrcamento = (os?: OrdemServico) => {
    if (!os) return false;

    // Status que indicam que NÃO é mais orçamento (já virou OS de verdade)
    const statusOS = ['aberta', 'execucao', 'aguardando_peca', 'finalizada', 'cancelada'];
    const statusAtual = os.status?.toLowerCase() || '';

    // Se tem status de OS, não é orçamento
    if (statusOS.includes(statusAtual)) {
        return false;
    }

    // Se tem status de orçamento ou flag explícita, é orçamento
    const statusOrcamento = ['orcamento', 'aguardando_aprovacao', 'pendente'];
    return statusOrcamento.includes(statusAtual) || os.tipo === 'orcamento';
};

interface OSDocumentProps {
    os: OrdemServico;
    cliente: Cliente | null;
    veiculo: Veiculo | null;
    empresa: Empresa | null;
    tecnico: Usuario | null;
    incluirFotos?: boolean;
}

// =====================================================
// DOCUMENTO PDF A4 (COMPLETO)
// =====================================================

export const OSDocument: React.FC<OSDocumentProps> = ({ os, cliente, veiculo, empresa, tecnico, incluirFotos = false }) => {
    const ehOrcamento = isOrcamento(os);
    const tipoDocumento = ehOrcamento ? 'ORÇAMENTO' : 'ORDEM DE SERVIÇO';
    // Use type assertion to handle potential missing properties safely or fix types if needed.
    // Assuming backend data might be loose, but strict typing helps frontend consistency.
    const chavePix = empresa?.chavePix || empresa?.cnpj || empresa?.telefone;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        {empresa?.logoUrl ? (
                            <Image style={{ width: 100, height: 50, objectFit: 'contain' }} src={empresa.logoUrl} />
                        ) : (
                            <Text style={styles.logo}>{empresa?.nomeFantasia || 'OSPrimeX'}</Text>
                        )}
                        <Text style={styles.empresaInfo}>
                            {[empresa?.telefone, empresa?.email].filter(Boolean).join(' | ') || '-'}
                        </Text>
                        {empresa?.endereco?.logradouro ? (
                            <Text style={styles.empresaInfo}>
                                {`${empresa.endereco.logradouro || ''}, ${empresa.endereco.numero || ''} - ${empresa.endereco.cidade || ''}/${empresa.endereco.estado || ''}`}
                            </Text>
                        ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={ehOrcamento ? styles.badgeOrcamento : styles.badge}>
                            {tipoDocumento}
                        </Text>
                        <Text style={styles.docNumber}>#{os?.numero}</Text>
                        <Text style={styles.docStatus}>
                            {formatDate(os?.criadoEm)}
                        </Text>
                        {ehOrcamento && os?.validadeOrcamento && (
                            <Text style={[styles.docStatus, { color: '#dc2626', marginTop: 2 }]}>
                                Validade: {formatDate(os.validadeOrcamento)}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Dados do Cliente */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CLIENTE</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nome:</Text>
                        <Text style={styles.value}>{cliente?.nome || '-'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Documento:</Text>
                        <Text style={styles.value}>{cliente?.documento || '-'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Telefone:</Text>
                        <Text style={styles.value}>{cliente?.telefone || '-'}</Text>
                    </View>
                </View>

                {/* Dados do Veículo */}
                {veiculo ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>VEÍCULO</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Modelo:</Text>
                            <Text style={styles.value}>
                                {`${veiculo.marca || ''} ${veiculo.modelo || ''}`}
                            </Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Placa:</Text>
                            <Text style={styles.value}>{String(veiculo.placa || '-')}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Ano:</Text>
                            <Text style={styles.value}>{String(veiculo.ano || '-')}</Text>
                        </View>
                        {os?.kmAtual ? (
                            <View style={styles.row}>
                                <Text style={styles.label}>KM:</Text>
                                <Text style={styles.value}>{String(Number(os.kmAtual).toLocaleString('pt-BR'))}</Text>
                            </View>
                        ) : null}
                    </View>
                ) : null}

                {/* Defeito Reclamado */}
                {os?.defeitoRelatado ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>DEFEITO RECLAMADO</Text>
                        <Text>{String(os.defeitoRelatado)}</Text>
                    </View>
                ) : null}

                {/* Itens/Serviços */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PRODUTOS E SERVIÇOS</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.colItem}>Item</Text>
                            <Text style={styles.colQtd}>Qtd</Text>
                            <Text style={styles.colUnit}>Unit.</Text>
                            <Text style={styles.colTotal}>Total</Text>
                        </View>
                        {(os?.itens || []).map((item, index) => (
                            <View key={index} style={styles.tableRow}>
                                <View style={styles.colItem}>
                                    <Text>{String(item.nome || '')}</Text>
                                    {(item.desconto || 0) > 0 || (item.acrescimo || 0) > 0 ? (
                                        <View style={{ flexDirection: 'row', gap: 5, marginTop: 2 }}>
                                            {(item.desconto || 0) > 0 && (
                                                <Text style={{ fontSize: 8, color: '#16a34a' }}>
                                                    Desc: -{formatCurrency(item.desconto)}
                                                </Text>
                                            )}
                                            {(item.acrescimo || 0) > 0 && (
                                                <Text style={{ fontSize: 8, color: '#ea580c' }}>
                                                    Acr: +{formatCurrency(item.acrescimo)}
                                                </Text>
                                            )}
                                        </View>
                                    ) : null}
                                </View>
                                <Text style={styles.colQtd}>{String(item.quantidade || 0)}</Text>
                                <Text style={styles.colUnit}>{formatCurrency(item.precoUnitario)}</Text>
                                <Text style={styles.colTotal}>{formatCurrency(item.total)}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Total */}
                    {(() => {
                        const resumo = calcularResumoFinanceiro(
                            os?.itens || [],
                            os?.descontoGlobalTipo, os?.descontoGlobalValor,
                            os?.acrescimoGlobalTipo, os?.acrescimoGlobalValor
                        );
                        return (
                            <View style={{ marginTop: 5 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 0 }}>
                                    <Text style={{ fontSize: 10, color: '#666', marginRight: 10 }}>Subtotal:</Text>
                                    <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{formatCurrency(resumo.somaItens)}</Text>
                                </View>
                                {resumo.valDescontoGlobal > 0 && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
                                        <Text style={{ fontSize: 10, color: '#16a34a', marginRight: 10 }}>Desconto Global:</Text>
                                        <Text style={{ fontSize: 10, color: '#16a34a' }}>- {formatCurrency(resumo.valDescontoGlobal)}</Text>
                                    </View>
                                )}
                                {resumo.valAcrescimoGlobal > 0 && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
                                        <Text style={{ fontSize: 10, color: '#ea580c', marginRight: 10 }}>Acréscimo Global:</Text>
                                        <Text style={{ fontSize: 10, color: '#ea580c' }}>+ {formatCurrency(resumo.valAcrescimoGlobal)}</Text>
                                    </View>
                                )}
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>TOTAL:</Text>
                                    <Text style={styles.totalValue}>{formatCurrency(resumo.totalFinal)}</Text>
                                </View>
                            </View>
                        );
                    })()}
                    {(os?.valorPago || 0) > 0 && (
                        <>
                            <View style={[styles.totalRow, { marginTop: 2, borderTopWidth: 0, paddingTop: 0 }]}>
                                <Text style={[styles.totalLabel, { color: '#16a34a', fontSize: 10 }]}>PAGO:</Text>
                                <Text style={[styles.totalValue, { color: '#16a34a', fontSize: 12 }]}>
                                    - {formatCurrency(os.valorPago)}
                                </Text>
                            </View>
                            <View style={[styles.totalRow, { marginTop: 2, borderTopWidth: 0, paddingTop: 0 }]}>
                                <Text style={[styles.totalLabel, { color: '#dc2626', fontSize: 10 }]}>A PAGAR:</Text>
                                <Text style={[styles.totalValue, { color: '#dc2626', fontSize: 12 }]}>
                                    {formatCurrency((os?.valorTotal || 0) - (os?.valorPago || 0))}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Apontamento de Horas - Configuração da Empresa */}
                {(empresa?.imprimirApontamentos !== false) && (os?.apontamentos || []).length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>APONTAMENTO DE HORAS</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={{ flex: 2 }}>Descrição</Text>
                                <Text style={{ width: 80, textAlign: 'center' }}>Data</Text>
                                <Text style={{ width: 80, textAlign: 'center' }}>Horário</Text>
                                <Text style={{ width: 60, textAlign: 'center', fontWeight: 'bold' }}>Duração</Text>
                            </View>
                            {os.apontamentos!.map((apt, index) => (
                                <View key={index} style={styles.tableRow}>
                                    <Text style={{ flex: 2 }}>{apt.descricao || '-'}</Text>
                                    <Text style={{ width: 80, textAlign: 'center' }}>{formatDate(apt.data)}</Text>
                                    <Text style={{ width: 80, textAlign: 'center' }}>{apt.inicio} - {apt.fim}</Text>
                                    <Text style={{ width: 60, textAlign: 'center', fontWeight: 'bold' }}>{apt.duracao}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}

                {/* Seção PIX (apenas se não for orçamento e tiver chave) */}
                {!ehOrcamento && chavePix ? (
                    <View style={styles.pixSection}>
                        <Text style={styles.pixTitle}>PAGAMENTO VIA PIX</Text>

                        {/* QR Code */}
                        <View style={{ alignItems: 'center', marginBottom: 10 }}>
                            <Image
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                                    gerarPayloadPix({
                                        chave: empresa.chavePix || '',
                                        nome: empresa.razaoSocial || empresa.nomeFantasia || '',
                                        cidade: empresa.endereco?.cidade || 'Cidade',
                                        valor: (os.valorTotal || 0) - (os.valorPago || 0),
                                        txid: `OS${os.numero}`
                                    })
                                )}`}
                                style={{ width: 100, height: 100 }}
                            />
                        </View>

                        <Text style={styles.pixKey}>{String(chavePix)}</Text>
                        <Text style={styles.pixInfo}>
                            {`Copie a chave acima ou escaneie o QR Code - Banco: ${empresa?.banco || 'A consultar'}`}
                        </Text>
                    </View>
                ) : null}

                {/* Aprovação de Orçamento */}
                {ehOrcamento ? (
                    <View style={styles.aprovacaoBox}>
                        <Text style={styles.aprovacaoTitulo}>APROVAÇÃO DO ORÇAMENTO</Text>
                        <View style={styles.aprovacaoOpcoes}>
                            <View style={styles.row}>
                                <View style={styles.checkbox} />
                                <Text>APROVO a execução dos serviços</Text>
                            </View>
                            <View style={styles.row}>
                                <View style={styles.checkbox} />
                                <Text>NÃO APROVO</Text>
                            </View>
                        </View>
                        <View style={[styles.assinatura, { marginTop: 20 }]}>
                            {os.assinaturaCliente && (
                                <Image
                                    src={os.assinaturaCliente}
                                    style={{ width: 150, height: 60, marginBottom: 5 }}
                                />
                            )}
                            <View style={styles.linhaAssinatura} />
                            <Text style={styles.textoAssinatura}>Assinatura do Cliente</Text>
                        </View>
                    </View>
                ) : null}

                {/* Técnico Responsável */}
                {tecnico && !ehOrcamento ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>TÉCNICO RESPONSÁVEL</Text>
                        <Text>{String(tecnico.nome || '')}</Text>
                    </View>
                ) : null}

                {/* Observações */}
                {os?.observacoes ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>OBSERVAÇÕES</Text>
                        <Text>{String(os.observacoes)}</Text>
                    </View>
                ) : null}

                {/* Fotos (se incluirFotos estiver habilitado) */}
                {incluirFotos && os?.fotos && os.fotos.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>FOTOS</Text>
                        <View style={styles.fotosGrid}>
                            {os.fotos.map((foto, index) => (
                                <View
                                    key={foto.id || index}
                                    style={index % 2 === 0 ? styles.fotoItem : styles.fotoItemLast}
                                >
                                    <Image
                                        src={foto.data}
                                        style={styles.fotoImage}
                                    />
                                    <Text style={styles.fotoCaption}>
                                        {foto.descricao
                                            ? `Foto ${index + 1} - ${foto.descricao}`
                                            : `Foto ${index + 1}${foto.criadoEm ? ` - ${formatDate(foto.criadoEm)}` : ''}`
                                        }
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}

                {/* Assinatura (apenas para OS, não orçamento) */}
                {!ehOrcamento ? (
                    <View style={styles.assinatura}>
                        {os.assinaturaCliente && (
                            <Image
                                src={os.assinaturaCliente}
                                style={{ width: 150, height: 60, marginBottom: 5 }}
                            />
                        )}
                        <View style={styles.linhaAssinatura} />
                        <Text style={styles.textoAssinatura}>Assinatura do Cliente</Text>
                    </View>
                ) : null}

                <View style={styles.footer}>
                    <Text>
                        {`Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} | OSPrimeX`}
                    </Text>
                    {empresa?.mensagemPadrao ? (
                        <Text style={{ marginTop: 5 }}>{String(empresa.mensagemPadrao)}</Text>
                    ) : null}
                </View>
            </Page>
        </Document>
    );
};

// =====================================================
// DOCUMENTO TÉRMICO 80MM (CUPOM)
// =====================================================

interface ThermalDocumentProps {
    os: OrdemServico;
    cliente: Cliente | null;
    veiculo: Veiculo | null;
    empresa: Empresa | null;
}

export const ThermalDocument: React.FC<ThermalDocumentProps> = ({ os, cliente, veiculo, empresa }) => {
    const ehOrcamento = isOrcamento(os);
    const tipoDocumento = ehOrcamento ? 'ORÇAMENTO' : 'OS';

    return (
        <Document>
            <Page size={[226, 800]} style={thermalStyles.page}>
                {/* Header */}
                <View style={thermalStyles.header}>
                    <Text style={thermalStyles.logo}>{empresa?.nomeFantasia || 'OSPrimeX'}</Text>
                    <Text style={thermalStyles.empresaInfo}>{empresa?.telefone || ''}</Text>
                    {empresa?.endereco?.cidade ? (
                        <Text style={thermalStyles.empresaInfo}>
                            {`${empresa.endereco.cidade || ''}/${empresa.endereco.estado || ''}`}
                        </Text>
                    ) : null}
                </View>

                {/* Tipo e Número */}
                <View style={thermalStyles.docInfo}>
                    <Text style={thermalStyles.docType}>{`${tipoDocumento} #${os?.numero || ''}`}</Text>
                    <Text style={thermalStyles.label}>{`${formatDate(os?.criadoEm)} ${formatTime(os?.criadoEm)}`}</Text>
                    {ehOrcamento && os?.validadeOrcamento && (
                        <Text style={[thermalStyles.label, { color: '#000', fontWeight: 'bold' }]}>
                            Validade: {formatDate(os.validadeOrcamento)}
                        </Text>
                    )}
                </View>

                <View style={thermalStyles.separator} />

                {/* Cliente */}
                <View style={thermalStyles.row}>
                    <Text style={thermalStyles.label}>Cliente:</Text>
                    <Text style={thermalStyles.value}>{cliente?.nome || '-'}</Text>
                </View>

                {/* Veículo */}
                {veiculo ? (
                    <View style={thermalStyles.row}>
                        <Text style={thermalStyles.label}>Veículo:</Text>
                        <Text style={thermalStyles.value}>{`${veiculo.placa || ''} - ${veiculo.modelo || ''}`}</Text>
                    </View>
                ) : null}

                <View style={thermalStyles.separator} />

                {/* Itens */}
                {(os?.itens || []).map((item, index) => (
                    <View key={index} style={thermalStyles.itemRow}>
                        <Text style={thermalStyles.itemNome}>{item.nome || ''}</Text>
                        {(item.desconto || 0) > 0 || (item.acrescimo || 0) > 0 ? (
                            <View style={{ marginBottom: 2 }}>
                                {(item.desconto || 0) > 0 && (
                                    <Text style={{ fontSize: 9 }}>Desc: -{formatCurrency(item.desconto)}</Text>
                                )}
                                {(item.acrescimo || 0) > 0 && (
                                    <Text style={{ fontSize: 9 }}>Acr: +{formatCurrency(item.acrescimo)}</Text>
                                )}
                            </View>
                        ) : null}
                        <View style={thermalStyles.itemDetalhe}>
                            <Text>{`${item.quantidade || 0}x ${formatCurrency(item.precoUnitario)}`}</Text>
                            <Text>{formatCurrency(item.total)}</Text>
                        </View>
                    </View>
                ))}

                {/* Total */}
                <View style={thermalStyles.totalSection}>
                    {(() => {
                        const resumo = calcularResumoFinanceiro(
                            os?.itens || [],
                            os?.descontoGlobalTipo, os?.descontoGlobalValor,
                            os?.acrescimoGlobalTipo, os?.acrescimoGlobalValor
                        );
                        return (
                            <>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <Text style={{ fontSize: 9 }}>Subtotal:</Text>
                                    <Text style={{ fontSize: 9 }}>{formatCurrency(resumo.somaItens)}</Text>
                                </View>
                                {resumo.valDescontoGlobal > 0 && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <Text style={{ fontSize: 9 }}>Desconto:</Text>
                                        <Text style={{ fontSize: 9 }}>-{formatCurrency(resumo.valDescontoGlobal)}</Text>
                                    </View>
                                )}
                                {resumo.valAcrescimoGlobal > 0 && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <Text style={{ fontSize: 9 }}>Acréscimo:</Text>
                                        <Text style={{ fontSize: 9 }}>+{formatCurrency(resumo.valAcrescimoGlobal)}</Text>
                                    </View>
                                )}
                                <View style={thermalStyles.totalRow}>
                                    <Text style={thermalStyles.totalLabel}>TOTAL:</Text>
                                    <Text style={thermalStyles.totalValue}>{formatCurrency(resumo.totalFinal)}</Text>
                                </View>
                            </>
                        );
                    })()}
                    {(os?.valorPago || 0) > 0 && (
                        <>
                            <View style={thermalStyles.totalRow}>
                                <Text style={[thermalStyles.totalLabel, { fontSize: 9 }]}>PAGO:</Text>
                                <Text style={[thermalStyles.totalValue, { fontSize: 10 }]}>
                                    - {formatCurrency(os.valorPago)}
                                </Text>
                            </View>
                            <View style={thermalStyles.totalRow}>
                                <Text style={[thermalStyles.totalLabel, { fontSize: 9 }]}>A PAGAR:</Text>
                                <Text style={[thermalStyles.totalValue, { fontSize: 10 }]}>
                                    {formatCurrency((os?.valorTotal || 0) - (os?.valorPago || 0))}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* PIX */}
                {empresa?.chavePix && !ehOrcamento ? (
                    <View style={{ marginTop: 8, alignItems: 'center' }}>
                        <Image
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                                gerarPayloadPix({
                                    chave: empresa.chavePix,
                                    nome: empresa.razaoSocial || empresa.nomeFantasia || '',
                                    cidade: empresa.endereco?.cidade || 'Cidade',
                                    valor: (os.valorTotal || 0) - (os.valorPago || 0),
                                    txid: `OS${os.numero}`
                                })
                            )}`}
                            style={{ width: 80, height: 80, marginBottom: 4 }}
                        />
                        <Text style={{ fontSize: 8, fontWeight: 'bold', textAlign: 'center' }}>{`PIX: ${empresa.chavePix}`}</Text>
                    </View>
                ) : null}

                {/* Footer */}
                <View style={thermalStyles.footer}>
                    <Text style={thermalStyles.footerText}>Obrigado pela preferência!</Text>
                    <Text style={thermalStyles.footerText}>OSPrimeX</Text>
                </View>
            </Page>
        </Document >
    );
};

// =====================================================
// BOTÕES DE DOWNLOAD
// =====================================================

interface DownloadButtonProps {
    os: OrdemServico;
    cliente: Cliente | null;
    veiculo: Veiculo | null;
    empresa: Empresa | null;
    tecnico: Usuario | null;
    className?: string;
}

export const DownloadOSButton: React.FC<DownloadButtonProps> = ({ os, cliente, veiculo, empresa, tecnico, className = '' }) => {
    const ehOrcamento = isOrcamento(os);
    const nomeArquivo = ehOrcamento ? `Orcamento_${os?.numero}` : `OS_${os?.numero}`;
    const [loading, setLoading] = useState(false);
    const [showPhotoConfirm, setShowPhotoConfirm] = useState(false);

    const handleClick = () => {
        if (loading) return;

        // Verifica se há fotos na OS
        const hasFotos = os?.fotos && os.fotos.length > 0;

        if (hasFotos) {
            // Mostra modal de confirmação
            setShowPhotoConfirm(true);
        } else {
            // Baixa direto sem fotos
            executarDownload(false);
        }
    };

    const executarDownload = async (incluirFotos: boolean) => {
        setLoading(true);
        setShowPhotoConfirm(false);

        try {
            const doc = (
                <OSDocument
                    os={os}
                    cliente={cliente}
                    veiculo={veiculo}
                    empresa={empresa}
                    tecnico={tecnico}
                    incluirFotos={incluirFotos}
                />
            );

            // Gera o blob do PDF
            const blob = await pdf(doc).toBlob();

            // Cria um link temporário para download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${nomeArquivo || 'documento'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Libera a URL
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao gerar download:', error);
            alert('Erro ao processar download do PDF.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                className={className}
                disabled={loading}
            >
                <div className="flex items-center gap-1">
                    {loading ? (
                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                    ) : (
                        <span className="material-symbols-outlined text-lg">download</span>
                    )}
                    <span>{ehOrcamento ? 'Baixar Orçamento' : 'Baixar OS'}</span>
                </div>
            </button>

            {/* Modal de Confirmação de Fotos */}
            {showPhotoConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">photo_library</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Incluir Fotos no Download?
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Esta OS possui {(os.fotos || []).length} foto(s)
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Deseja incluir as fotos da OS no PDF? Isso pode aumentar o tamanho do arquivo.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => executarDownload(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
                            >
                                Sem Fotos
                            </button>
                            <button
                                onClick={() => executarDownload(true)}
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">photo_camera</span>
                                Com Fotos
                            </button>
                        </div>

                        <button
                            onClick={() => setShowPhotoConfirm(false)}
                            className="w-full mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export const DownloadThermalButton: React.FC<DownloadButtonProps> = ({ os, cliente, veiculo, empresa, className = '' }) => {
    const ehOrcamento = isOrcamento(os);
    const nomeArquivo = ehOrcamento ? `Termica_Orc_${os?.numero}` : `Termica_OS_${os?.numero}`;

    return (
        <PDFDownloadLink
            document={
                <ThermalDocument
                    os={os}
                    cliente={cliente}
                    veiculo={veiculo}
                    empresa={empresa}
                />
            }
            fileName={`${nomeArquivo || 'termica'}.pdf`}
            className={className}
        >
            {({ loading }) => (
                <>
                    {loading ? (
                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                    ) : (
                        <span className="material-symbols-outlined text-lg">receipt_long</span>
                    )}
                    <span>Térmica 80mm</span>
                </>
            )}
        </PDFDownloadLink>
    );
};

export default OSDocument;
