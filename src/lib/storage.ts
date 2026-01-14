/**
 * OSPrimeX - Abstração de Storage
 * 
 * Esta camada abstrai o localStorage para facilitar migração futura para Supabase.
 * Todas as operações retornam Promises para manter compatibilidade com APIs assíncronas.
 * 
 * IMPORTANTE: Toda entidade tem empresaId para multi-tenancy
 */

import type { BaseEntity, ConfigEmpresa, Sessao, EntityName, QueryFilters } from '../types';

// ============================================
// Constantes
// ============================================

const STORAGE_PREFIX = 'osprimex_';

// ============================================
// Helpers
// ============================================

const getKey = (entity: string): string => `${STORAGE_PREFIX}${entity}`;

const generateId = (): string => {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

const getTimestamp = (): string => new Date().toISOString();

// ============================================
// CRUD Genérico
// ============================================

/**
 * Busca todos os registros de uma entidade
 * @param entity - Nome da entidade (ex: 'clientes', 'veiculos')
 * @param empresaId - ID da empresa para filtrar (multi-tenant)
 */
export const getAll = async <T extends BaseEntity>(
    entity: EntityName | string,
    empresaId: string | null = null
): Promise<T[]> => {
    try {
        const data = localStorage.getItem(getKey(entity));
        const items: T[] = data ? JSON.parse(data) : [];

        if (empresaId) {
            return items.filter(item => item.empresaId === empresaId);
        }
        return items;
    } catch (error) {
        console.error(`Erro ao buscar ${entity}:`, error);
        return [];
    }
};

export const list = getAll;

/**
 * Busca um registro por ID
 */
export const getById = async <T extends BaseEntity>(
    entity: EntityName | string,
    id: string
): Promise<T | null> => {
    try {
        const items = await getAll<T>(entity);
        return items.find(item => item.id === id) || null;
    } catch (error) {
        console.error(`Erro ao buscar ${entity} por ID:`, error);
        return null;
    }
};

const dispatchStorageEvent = (key: string): void => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('osprimex-storage', { detail: { key } }));
    }
};

/**
 * Cria um novo registro
 */
export const create = async <T extends BaseEntity>(
    entity: EntityName | string,
    data: Partial<T>,
    empresaId: string
): Promise<T> => {
    try {
        const items = await getAll<T>(entity);
        const newItem = {
            ...data,
            id: data.id || generateId(),
            empresaId,
            criadoEm: getTimestamp(),
            atualizadoEm: getTimestamp(),
            ativo: true,
        } as T;
        items.push(newItem);
        const key = getKey(entity);
        localStorage.setItem(key, JSON.stringify(items));
        dispatchStorageEvent(key);
        return newItem;
    } catch (error) {
        console.error(`Erro ao criar ${entity}:`, error);
        throw error;
    }
};

/**
 * Atualiza um registro existente
 */
export const update = async <T extends BaseEntity>(
    entity: EntityName | string,
    id: string,
    data: Partial<T>
): Promise<T> => {
    try {
        const items = await getAll<T>(entity);
        const index = items.findIndex(item => item.id === id);

        if (index === -1) {
            throw new Error(`${entity} não encontrado`);
        }

        items[index] = {
            ...items[index],
            ...data,
            atualizadoEm: getTimestamp(),
        };

        const key = getKey(entity);
        localStorage.setItem(key, JSON.stringify(items));
        dispatchStorageEvent(key);
        return items[index];
    } catch (error) {
        console.error(`Erro ao atualizar ${entity}:`, error);
        throw error;
    }
};

/**
 * Inativa um registro (soft delete)
 */
export const softDelete = async <T extends BaseEntity>(
    entity: EntityName | string,
    id: string
): Promise<T> => {
    return update<T>(entity, id, { ativo: false } as Partial<T>);
};

/**
 * Remove um registro permanentemente
 */
export const hardDelete = async (
    entity: EntityName | string,
    id: string
): Promise<boolean> => {
    try {
        const items = await getAll(entity);
        const filtered = items.filter(item => item.id !== id);
        const key = getKey(entity);
        localStorage.setItem(key, JSON.stringify(filtered));
        dispatchStorageEvent(key);
        return true;
    } catch (error) {
        console.error(`Erro ao remover ${entity}:`, error);
        throw error;
    }
};

/**
 * Busca registros com filtros
 */
export const query = async <T extends BaseEntity>(
    entity: EntityName | string,
    filters: QueryFilters<T> = {},
    empresaId: string | null = null
): Promise<T[]> => {
    try {
        let items = await getAll<T>(entity, empresaId);

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                items = items.filter(item => {
                    const itemValue = (item as Record<string, unknown>)[key];
                    if (typeof value === 'string') {
                        return String(itemValue).toLowerCase().includes(value.toLowerCase());
                    }
                    return itemValue === value;
                });
            }
        });

        return items;
    } catch (error) {
        console.error(`Erro ao filtrar ${entity}:`, error);
        return [];
    }
};

// ============================================
// Sessão e Autenticação
// ============================================

export const setSessao = (sessao: Sessao): void => {
    localStorage.setItem(getKey('sessao_atual'), JSON.stringify(sessao));
};

export const getSessao = (): Sessao | null => {
    try {
        const data = localStorage.getItem(getKey('sessao_atual'));
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

export const clearSessao = (): void => {
    localStorage.removeItem(getKey('sessao_atual'));
};

// ============================================
// Configurações da Empresa (White Label)
// ============================================

interface ConfigEmpresaEntity extends ConfigEmpresa {
    id?: string;
    criadoEm?: string;
    atualizadoEm?: string;
}

export const getConfigEmpresa = async (empresaId: string): Promise<ConfigEmpresa> => {
    const configs = await getAll<ConfigEmpresaEntity & BaseEntity>('config_empresa');
    return configs.find(c => c.empresaId === empresaId) || getDefaultConfig();
};

export const saveConfigEmpresa = async (
    empresaId: string,
    config: Partial<ConfigEmpresa>
): Promise<ConfigEmpresa> => {
    const configs = await getAll<ConfigEmpresaEntity & BaseEntity>('config_empresa');
    const index = configs.findIndex(c => c.empresaId === empresaId);

    if (index >= 0) {
        configs[index] = { ...configs[index], ...config, atualizadoEm: getTimestamp() };
    } else {
        configs.push({
            ...config,
            empresaId,
            id: generateId(),
            criadoEm: getTimestamp()
        } as ConfigEmpresaEntity & BaseEntity);
    }

    localStorage.setItem(getKey('config_empresa'), JSON.stringify(configs));
    return configs.find(c => c.empresaId === empresaId) as ConfigEmpresa;
};

const getDefaultConfig = (): ConfigEmpresa => ({
    empresaId: '',
    nomeFantasia: 'Minha Oficina',
    logo: null,
    corPrimaria: '#137fec',
    corSecundaria: '#0d6ecc',
});

// ============================================
// Utilitários de Banco
// ============================================

export const clearAllData = (): void => {
    Object.keys(localStorage)
        .filter(key => key.startsWith(STORAGE_PREFIX))
        .forEach(key => localStorage.removeItem(key));
};

export const exportData = (): Record<string, unknown[]> => {
    const data: Record<string, unknown[]> = {};
    Object.keys(localStorage)
        .filter(key => key.startsWith(STORAGE_PREFIX))
        .forEach(key => {
            const stored = localStorage.getItem(key);
            if (stored) {
                data[key.replace(STORAGE_PREFIX, '')] = JSON.parse(stored);
            }
        });
    return data;
};

export const importData = (data: Record<string, unknown[]>): void => {
    Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(getKey(key), JSON.stringify(value));
    });
};

// ============================================
// Auto-migração
// ============================================

const runMigrations = (): void => {
    if (typeof window === 'undefined') return;
    try {
        const oldKey = `${STORAGE_PREFIX}lancamentos`;
        const newKey = `${STORAGE_PREFIX}lancamentos_financeiros`;
        const oldDataStr = localStorage.getItem(oldKey);

        if (oldDataStr) {
            const oldData = JSON.parse(oldDataStr) as BaseEntity[];
            const newData = JSON.parse(localStorage.getItem(newKey) || '[]') as BaseEntity[];

            // Mesclar dados sem duplicar por ID
            const merged = [...newData];
            let changed = false;
            oldData.forEach(item => {
                if (!merged.find(m => m.id === item.id)) {
                    merged.push(item);
                    changed = true;
                }
            });

            if (changed) {
                localStorage.setItem(newKey, JSON.stringify(merged));
                console.log('Migração: Dados de lancamentos movidos para lancamentos_financeiros');
            }

            // Backup e remoção da chave antiga
            localStorage.setItem(`${oldKey}_backup_${Date.now()}`, oldDataStr);
            localStorage.removeItem(oldKey);
        }
    } catch (e) {
        console.error('Erro na migração automática:', e);
    }
};

// Executar migrações ao carregar o módulo
runMigrations();

// ============================================
// Export Default
// ============================================

const storage = {
    getAll,
    list: getAll,
    getById,
    create,
    update,
    softDelete,
    hardDelete,
    query,
    setSessao,
    getSessao,
    clearSessao,
    getConfigEmpresa,
    saveConfigEmpresa,
    clearAllData,
    exportData,
    importData,
};

export default storage;
