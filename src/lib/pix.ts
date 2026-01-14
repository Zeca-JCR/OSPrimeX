/**
 * OSPrimeX - Gerador de Payload PIX
 * 
 * Gera o código "Copia e Cola" e QR Code do PIX
 * Padrão EMV QRCPS MPM
 */

// ============================================
// Tipos
// ============================================

export interface DadosPix {
    /** Chave PIX (CPF, CNPJ, Email, Tel, Aleatória) */
    chave: string;
    /** Nome do beneficiário (max 25 chars) */
    nome: string;
    /** Cidade do beneficiário (max 15 chars) */
    cidade: string;
    /** Valor da transação (opcional) */
    valor?: number;
    /** Identificador da transação (opcional, default '***') */
    txid?: string;
}

// ============================================
// Funções Auxiliares
// ============================================

/**
 * Função auxiliar para calcular o CRC16 (Polynomial 0x1021)
 * Referência: EMV QRCPS MPM
 */
const crc16 = (payload: string): string => {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < payload.length; i++) {
        crc ^= (payload.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc = crc << 1;
            }
        }
    }

    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
};

/**
 * Formata campos TLV (Tag-Length-Value)
 */
const formatField = (id: string, value: string | number): string => {
    const val = value.toString();
    const len = val.length.toString().padStart(2, '0');
    return `${id}${len}${val}`;
};

// ============================================
// Função Principal
// ============================================

/**
 * Gera o payload (string) para o código "Copia e Cola" e QR Code do PIX
 */
export const gerarPayloadPix = ({ chave, nome, cidade, valor, txid = '***' }: DadosPix): string | null => {
    if (!chave || !nome || !cidade) return null;

    // Normalização
    const nomeTratado = nome.substring(0, 25).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cidadeTratada = cidade.substring(0, 15).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const valorTratado = valor ? valor.toFixed(2) : null;
    const chaveTratada = chave.trim();

    // Montagem do payload
    let payload = '';

    // 00 - Payload Format Indicator
    payload += formatField('00', '01');

    // 26 - Merchant Account Information
    // 00 - GUI (BR.GOV.BCB.PIX)
    // 01 - Chave
    const merchantAccount = formatField('00', 'BR.GOV.BCB.PIX') + formatField('01', chaveTratada);
    payload += formatField('26', merchantAccount);

    // 52 - Merchant Category Code (0000 - Geral)
    payload += formatField('52', '0000');

    // 53 - Transaction Currency (986 - BRL)
    payload += formatField('53', '986');

    // 54 - Transaction Amount (Opcional)
    if (valorTratado) {
        payload += formatField('54', valorTratado);
    }

    // 58 - Country Code
    payload += formatField('58', 'BR');

    // 59 - Merchant Name
    payload += formatField('59', nomeTratado);

    // 60 - Merchant City
    payload += formatField('60', cidadeTratada);

    // 62 - Additional Data Field Template
    // 05 - Reference Label (TxID)
    const additionalData = formatField('05', txid || '***');
    payload += formatField('62', additionalData);

    // 63 - CRC16 (Adiciona o ID e Length '04' para o cálculo)
    payload += '6304';

    // Calcula e anexa o CRC
    payload += crc16(payload);

    return payload;
};
