/**
 * OSPrimeX - Exportação Central de Tipos
 * 
 * Ponto de entrada único para todos os tipos do sistema.
 * Importe tipos diretamente daqui: import type { Usuario, AuthContextType } from '@/types';
 */

// Modelos de dados
export * from './models';

// Tipos de contextos React
export * from './contexts';

// Tipos de componentes
export * from './components';

// ============================================
// Tipos Utilitários
// ============================================

/** Torna todas as propriedades opcionais recursivamente */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Extrai o tipo de retorno de uma Promise */
export type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

/** Representação de ID de entidade */
export type EntityId = string;

/** Nomes das entidades do storage */
export type EntityName =
    | 'empresas'
    | 'usuarios'
    | 'clientes'
    | 'veiculos'
    | 'produtos'
    | 'fornecedores'
    | 'colaboradores'
    | 'ordens_servico'
    | 'lancamentos_financeiros'
    | 'propostas'
    | 'movimentacoes_estoque'
    | 'config_empresa'
    | 'feature_flags';

/** Filtros genéricos para query */
export type QueryFilters<T> = Partial<Record<keyof T, unknown>>;
