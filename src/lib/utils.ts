/**
 * OSPrimeX - Funções Utilitárias
 */

import type { ItemOS } from '../types';

// ============================================
// Formatação de Moeda
// ============================================

export const formatCurrency = (value: number | null | undefined): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value || 0);
};

export const parseCurrency = (value: string | number | null | undefined): number => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
};

export const formatCurrencyInput = (value: number | null | undefined): string => {
    if (!value) return '';
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

// ============================================
// Formatação de Datas
// ============================================

export const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    // Se for apenas data YYYY-MM-DD, ajusta fuso para não perder dia
    if (dateString.length === 10) {
        const [ano, mes, dia] = dateString.split('-');
        return `${dia}/${mes}/${ano}`;
    }
    return new Date(dateString).toLocaleDateString('pt-BR');
};

export const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
};

export const toISODate = (date: Date | null | undefined): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
};

export const parseDateLocal = (dateString: string | null | undefined): Date => {
    if (!dateString) return new Date();
    // Tenta lidar com YYYY-MM-DD ajustando fuso
    if (dateString.length === 10 && dateString.includes('-')) {
        const [ano, mes, dia] = dateString.split('-');
        return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    }
    return new Date(dateString);
};

// ============================================
// Strings
// ============================================

export const normalizeString = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

export const toTitleCase = (str: string | null | undefined): string => {
    if (!str) return '';
    return str.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};

// ============================================
// Placa de Veículo
// ============================================

export const formatPlaca = (placa: string | null | undefined): string => {
    if (!placa) return '';
    return placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export const validarPlaca = (placa: string | null | undefined): boolean => {
    if (!placa) return false;
    const limpa = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const regex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
    return regex.test(limpa);
};

// ============================================
// Validação de Documentos
// ============================================

export const validaCPF = (cpf: string | null | undefined): boolean => {
    if (!cpf) return false;
    const strCPF = cpf.replace(/[^\d]/g, '');
    if (strCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(strCPF)) return false;

    let soma = 0;
    let resto: number;

    for (let i = 1; i <= 9; i++) soma += parseInt(strCPF.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(strCPF.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(strCPF.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(strCPF.substring(10, 11))) return false;

    return true;
};

export const validaCNPJ = (cnpj: string | null | undefined): boolean => {
    if (!cnpj) return false;
    const strCNPJ = cnpj.replace(/[^\d]/g, '');
    if (strCNPJ.length !== 14) return false;
    if (/^(\d)\1+$/.test(strCNPJ)) return false;

    let tamanho = strCNPJ.length - 2;
    let numeros = strCNPJ.substring(0, tamanho);
    const digitos = strCNPJ.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = strCNPJ.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(1))) return false;

    return true;
};

// ============================================
// Formatação de Telefone e Documento
// ============================================

export const formatTelefone = (v: string | null | undefined): string => {
    if (!v) return '';
    v = v.replace(/\D/g, "");
    if (v.length > 10) {
        return v.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (v.length > 5) {
        return v.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (v.length > 2) {
        return v.replace(/^(\d\d)(\d{0,5}).*/, "($1) $2");
    } else {
        return v.replace(/^(\d*)/, "($1");
    }
};

export const formatDocumento = (v: string | null | undefined): string => {
    if (!v) return '';
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
        return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else {
        return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
};

// ============================================
// Outros
// ============================================

export const getIniciais = (nome: string | null | undefined): string => {
    if (!nome) return '';
    const partes = nome.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

// ============================================
// Cálculos Financeiros
// ============================================

export interface ResumoFinanceiro {
    somaItens: number;
    valDescontoGlobal: number;
    valAcrescimoGlobal: number;
    totalFinal: number;
}

type TipoDesconto = 'valor' | 'percentual';

export const calcularResumoFinanceiro = (
    itens: (ItemOS & { isento?: boolean })[] | null | undefined,
    dTipo: TipoDesconto | string | undefined,
    dValor: string | number | undefined,
    aTipo: TipoDesconto | string | undefined,
    aValor: string | number | undefined
): ResumoFinanceiro => {
    const somaItens = itens
        ? itens.reduce((acc, item) => acc + (item.isento ? 0 : (item.total || 0)), 0)
        : 0;

    let valDescontoGlobal = 0;
    if (dValor) {
        if (dTipo === 'valor') valDescontoGlobal = parseFloat(String(dValor)) || 0;
        else valDescontoGlobal = somaItens * ((parseFloat(String(dValor)) || 0) / 100);
    }

    let valAcrescimoGlobal = 0;
    if (aValor) {
        if (aTipo === 'valor') valAcrescimoGlobal = parseFloat(String(aValor)) || 0;
        else valAcrescimoGlobal = somaItens * ((parseFloat(String(aValor)) || 0) / 100);
    }

    const totalFinal = Math.max(0, somaItens - valDescontoGlobal + valAcrescimoGlobal);

    return {
        somaItens,
        valDescontoGlobal,
        valAcrescimoGlobal,
        totalFinal
    };
};
