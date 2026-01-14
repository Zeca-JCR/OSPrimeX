/**
 * Utilitário para parsing de XML de Nota Fiscal Eletrônica (NFe)
 * Padrão brasileiro
 */

// ============================================
// Tipos
// ============================================

export interface EnderecoNFe {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
}

export interface FornecedorNFe {
    cnpj: string;
    nome: string;
    nomeFantasia: string;
    endereco: EnderecoNFe;
}

export interface ProdutoNFe {
    codigoFornecedor: string;
    ean: string;
    nome: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
}

export interface ParcelaNFe {
    numero: string;
    vencimento: string;
    valor: number;
}

export interface NFeParsed {
    numero: string;
    dataEmissao: string;
    valorTotal: number;
    fornecedor: FornecedorNFe;
    produtos: ProdutoNFe[];
    parcelas: ParcelaNFe[];
}

// ============================================
// Funções de Parse
// ============================================

export const parseNFe = async (file: File): Promise<NFeParsed> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const xmlText = e.target?.result as string;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

                // Verificar erros de parse
                const parseError = xmlDoc.getElementsByTagName('parsererror');
                if (parseError.length > 0) {
                    throw new Error('Arquivo XML inválido ou corrompido.');
                }

                // Extrair dados da NFe
                const nfe = extractNFeData(xmlDoc);
                resolve(nfe);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
        reader.readAsText(file);
    });
};

const extractNFeData = (xml: Document): NFeParsed => {
    const getValue = (tag: string, parent: Document | Element = xml): string => {
        const elements = parent.getElementsByTagName(tag);
        return elements.length > 0 ? elements[0].textContent || '' : '';
    };

    // Dados Gerais
    const nNF = getValue('nNF'); // Número da Nota
    const dhEmi = getValue('dhEmi'); // Data de Emissão
    const vNF = getValue('vNF'); // Valor Total da Nota

    // Emitente (Fornecedor)
    const emit = xml.getElementsByTagName('emit')[0];
    const fornecedor: FornecedorNFe = {
        cnpj: getValue('CNPJ', emit),
        nome: getValue('xNome', emit),
        nomeFantasia: getValue('xFant', emit),
        endereco: {
            logradouro: getValue('xLgr', emit),
            numero: getValue('nro', emit),
            bairro: getValue('xBairro', emit),
            cidade: getValue('xMun', emit),
            uf: getValue('UF', emit),
            cep: getValue('CEP', emit),
        }
    };

    // Produtos
    const dets = xml.getElementsByTagName('det');
    const produtos: ProdutoNFe[] = [];

    for (let i = 0; i < dets.length; i++) {
        const prod = dets[i].getElementsByTagName('prod')[0];
        // const imposto = dets[i].getElementsByTagName('imposto')[0];

        produtos.push({
            codigoFornecedor: getValue('cProd', prod),
            ean: getValue('cEAN', prod),
            nome: getValue('xProd', prod),
            ncm: getValue('NCM', prod),
            cfop: getValue('CFOP', prod),
            unidade: getValue('uCom', prod),
            quantidade: parseFloat(getValue('qCom', prod)) || 0,
            valorUnitario: parseFloat(getValue('vUnCom', prod)) || 0,
            valorTotal: parseFloat(getValue('vProd', prod)) || 0,
            // Poderíamos extrair impostos aqui se necessário
        });
    }

    // Financeiro (Duplicatas)
    const dups = xml.getElementsByTagName('dup');
    const parcelas: ParcelaNFe[] = [];

    if (dups.length > 0) {
        for (let i = 0; i < dups.length; i++) {
            parcelas.push({
                numero: getValue('nDup', dups[i]),
                vencimento: getValue('dVenc', dups[i]),
                valor: parseFloat(getValue('vDup', dups[i])) || 0,
            });
        }
    }
    // Se não tiver duplicata, assume pagamento à vista ou única parcela
    // Para MVP, deixaremos vazio para preencher manual se não achar dup

    return {
        numero: nNF,
        dataEmissao: dhEmi,
        valorTotal: parseFloat(vNF) || 0,
        fornecedor,
        produtos,
        parcelas
    };
};
