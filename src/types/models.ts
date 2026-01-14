/**
 * OSPrimeX - Tipos de Modelos de Dados
 * 
 * Definições de tipos para todas as entidades do sistema.
 * Baseado nas estruturas existentes em seed.js e storage.js.
 */

// ============================================
// Tipos Base
// ============================================

/** Campos comuns a todas as entidades */
export interface BaseEntity {
    id: string;
    empresaId: string;
    ativo: boolean;
    criadoEm: string;
    atualizadoEm?: string;
}

/** Estrutura de endereço */
export interface Endereco {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
}

// ============================================
// Empresa
// ============================================

export type PlanoEmpresa = 'essencial' | 'profissional' | 'plus';
export type AddonEmpresa = 'crm' | 'rastreador_publico' | 'relatorios_avancados';

export interface Empresa extends BaseEntity {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    telefone?: string;
    whatsapp?: string;
    email?: string;
    endereco?: Endereco;
    plano: PlanoEmpresa;
    limiteUsuarios: number;
    addons: AddonEmpresa[];
}

// ============================================
// Usuário
// ============================================

export type PerfilUsuario = 'admin' | 'tecnico' | 'financeiro' | 'superadmin';

export interface Usuario extends BaseEntity {
    nome: string;
    email: string;
    senha: string; // Em produção seria hash
    perfil: PerfilUsuario;
    comissao?: number; // Percentual de comissão (técnicos)
}

// ============================================
// Colaborador
// ============================================

export type CargoColaborador = 'tecnico' | 'atendente' | 'gerente';

export interface Colaborador extends BaseEntity {
    nome: string;
    cargo: CargoColaborador;
    comissao: number;
}

// ============================================
// Cliente
// ============================================

export type TipoCliente = 'pf' | 'pj';

export interface Cliente extends BaseEntity {
    tipo: TipoCliente;
    nome: string;
    documento: string; // CPF ou CNPJ
    telefone?: string;
    whatsapp?: string;
    email?: string;
    endereco?: Endereco;
    observacoes?: string;
}

// ============================================
// Veículo
// ============================================

export type TipoCombustivel = 'gasolina' | 'etanol' | 'flex' | 'diesel' | 'eletrico' | 'hibrido' | 'gnv';

export interface Veiculo extends BaseEntity {
    clienteId: string;
    marca: string;
    modelo: string;
    placa: string;
    ano: number | string;
    cor?: string;
    combustivel?: TipoCombustivel | string;
    km?: number;
    renavam?: string;
    observacoes?: string;
}

// ============================================
// Produto / Serviço
// ============================================

export type TipoProduto = 'produto' | 'servico';
export type UnidadeMedida = 'UN' | 'L' | 'KG' | 'M' | 'JG' | 'SV' | 'PC' | 'CJ';

export interface Produto extends BaseEntity {
    tipo: TipoProduto;
    nome: string;
    descricao?: string;
    unidade: UnidadeMedida | string;
    precoCusto?: number;
    precoVenda: number;
    quantidade?: number; // Estoque atual (apenas para produtos)
    estoqueMinimo?: number;
    fornecedorId?: string;
}

// ============================================
// Fornecedor
// ============================================

export interface Fornecedor extends BaseEntity {
    nome: string;
    cnpj?: string;
    telefone?: string;
    whatsapp?: string;
    email?: string;
    endereco?: Endereco;
    observacoes?: string;
}

// ============================================
// Ordem de Serviço
// ============================================

export type StatusOS =
    | 'orcamento'
    | 'aguardando_aprovacao'
    | 'aprovada'
    | 'aberta'
    | 'execucao'
    | 'aguardando_peca'
    | 'finalizada'
    | 'entregue'
    | 'cancelada';

export type TipoOS = 'os' | 'orcamento';

export type StatusFinanceiroOS = 'pendente' | 'parcial' | 'pago';

export interface ChecklistItem {
    item: string;
    ok: boolean;
}

export interface ItemOS {
    produtoId: string;
    nome: string;
    quantidade: number;
    precoUnitario: number;
    total: number;
    desconto?: number;
    tecnicoId?: string;
}

export interface OrdemServico extends BaseEntity {
    numero: number;
    clienteId: string;
    veiculoId: string;
    tecnicoId?: string | null;
    status: StatusOS;
    tipo?: TipoOS;
    defeitoRelatado: string;
    defeitoConstatado?: string;
    checklist?: ChecklistItem[];
    itens: ItemOS[];
    valorTotal: number;
    valorDesconto?: number;
    statusFinanceiro: StatusFinanceiroOS;
    fotos?: string[];
    observacoes?: string;
    kmAtual?: string | number;

    // Rastreamento
    linkRastreamento?: string;
    tokenRastreamento?: string;

    // Assinatura
    assinaturaCliente?: string;
    assinaturaEntrega?: string;

    // Timestamps adicionais
    dataAprovacao?: string;
    dataFinalizacao?: string;
    dataEntrega?: string;
}

// ============================================
// Financeiro
// ============================================

export type TipoLancamento = 'receita' | 'despesa';
export type StatusLancamento = 'pendente' | 'pago' | 'cancelado';
export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'transferencia';

export interface LancamentoFinanceiro extends BaseEntity {
    tipo: TipoLancamento;
    descricao: string;
    valor: number;
    dataVencimento: string;
    dataPagamento?: string;
    status: StatusLancamento;
    formaPagamento?: FormaPagamento;
    categoria?: string;
    osId?: string; // Referência à OS (se aplicável)
    clienteId?: string;
    fornecedorId?: string;
    observacoes?: string;
}

// ============================================
// Agenda
// ============================================

export interface EventoAgenda extends BaseEntity {
    titulo: string;
    descricao?: string;
    dataInicio: string;
    dataFim?: string;
    osId?: string;
    clienteId?: string;
    veiculoId?: string;
    cor?: string;
}

// ============================================
// Configuração da Empresa (White-label)
// ============================================

export interface ConfigEmpresa {
    empresaId: string;
    nomeFantasia: string;
    logo?: string | null;
    corPrimaria: string;
    corSecundaria?: string;
}

// ============================================
// Feature Flags
// ============================================

export type FeatureFlagName = 'crm' | 'rastreador_publico' | 'relatorios_avancados';

export interface FeatureFlag extends BaseEntity {
    feature: FeatureFlagName;
}

// ============================================
// Sessão
// ============================================

export interface Sessao {
    usuarioId: string;
    empresaId: string;
    loginEm: string;
}

// ============================================
// Propostas (CRM)
// ============================================

export type StatusProposta = 'pendente' | 'enviada' | 'visualizada' | 'aceita' | 'recusada' | 'expirada';

export interface Proposta extends BaseEntity {
    titulo: string;
    clienteId: string;
    veiculoId?: string;
    itens: ItemOS[];
    valorTotal: number;
    valorEntrada?: number;
    parcelas?: number;
    valorParcela?: number;
    status: StatusProposta;
    dataValidade?: string;
    dataEnvio?: string;
    dataVisualizacao?: string;
    dataResposta?: string;
    linkPublico?: string;
    observacoes?: string;
}

// ============================================
// Movimentação de Estoque
// ============================================

export type TipoMovimentacaoEstoque = 'entrada' | 'saida' | 'ajuste';

export interface MovimentacaoEstoque extends BaseEntity {
    produtoId: string;
    tipo: TipoMovimentacaoEstoque;
    quantidade: number;
    motivo: string;
    osId?: string;
    fornecedorId?: string;
    notaFiscal?: string;
}
