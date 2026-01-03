/**
 * OSPrimeX - Abstração de Storage
 * 
 * Esta camada abstrai o localStorage para facilitar migração futura para Supabase.
 * Todas as operações retornam Promises para manter compatibilidade com APIs assíncronas.
 * 
 * IMPORTANTE: Toda entidade tem empresaId para multi-tenancy
 */

const STORAGE_PREFIX = 'osprimex_';

// ============================================
// Helpers
// ============================================

const getKey = (entity) => `${STORAGE_PREFIX}${entity}`;

const generateId = () => {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

const getTimestamp = () => new Date().toISOString();

// ============================================
// CRUD Genérico
// ============================================

/**
 * Busca todos os registros de uma entidade
 * @param {string} entity - Nome da entidade (ex: 'clientes', 'veiculos')
 * @param {string} empresaId - ID da empresa para filtrar (multi-tenant)
 */
export const getAll = async (entity, empresaId = null) => {
    try {
        const data = localStorage.getItem(getKey(entity));
        const items = data ? JSON.parse(data) : [];

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
export const getById = async (entity, id) => {
    try {
        const items = await getAll(entity);
        return items.find(item => item.id === id) || null;
    } catch (error) {
        console.error(`Erro ao buscar ${entity} por ID:`, error);
        return null;
    }
};

const dispatchStorageEvent = (key) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('osprimex-storage', { detail: { key } }));
    }
};

/**
 * Cria um novo registro
 */
export const create = async (entity, data, empresaId) => {
    try {
        const items = await getAll(entity);
        const newItem = {
            ...data,
            id: data.id || generateId(),
            empresaId,
            criadoEm: getTimestamp(),
            atualizadoEm: getTimestamp(),
            ativo: true,
        };
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
export const update = async (entity, id, data) => {
    try {
        const items = await getAll(entity);
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
export const softDelete = async (entity, id) => {
    return update(entity, id, { ativo: false });
};

/**
 * Remove um registro permanentemente
 */
export const hardDelete = async (entity, id) => {
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
export const query = async (entity, filters = {}, empresaId = null) => {
    try {
        let items = await getAll(entity, empresaId);

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                items = items.filter(item => {
                    if (typeof value === 'string') {
                        return String(item[key]).toLowerCase().includes(value.toLowerCase());
                    }
                    return item[key] === value;
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

export const setSessao = (sessao) => {
    localStorage.setItem(getKey('sessao_atual'), JSON.stringify(sessao));
};

export const getSessao = () => {
    try {
        const data = localStorage.getItem(getKey('sessao_atual'));
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

export const clearSessao = () => {
    localStorage.removeItem(getKey('sessao_atual'));
};

// ============================================
// Configurações da Empresa (White Label)
// ============================================

export const getConfigEmpresa = async (empresaId) => {
    const configs = await getAll('config_empresa');
    return configs.find(c => c.empresaId === empresaId) || getDefaultConfig();
};

export const saveConfigEmpresa = async (empresaId, config) => {
    const configs = await getAll('config_empresa');
    const index = configs.findIndex(c => c.empresaId === empresaId);

    if (index >= 0) {
        configs[index] = { ...configs[index], ...config, atualizadoEm: getTimestamp() };
    } else {
        configs.push({ ...config, empresaId, id: generateId(), criadoEm: getTimestamp() });
    }

    localStorage.setItem(getKey('config_empresa'), JSON.stringify(configs));
    return configs.find(c => c.empresaId === empresaId);
};

const getDefaultConfig = () => ({
    nomeFantasia: 'Minha Oficina',
    logo: null,
    corPrimaria: '#137fec',
    corSecundaria: '#0d6ecc',
});

// ============================================
// Utilitários de Banco
// ============================================

export const clearAllData = () => {
    Object.keys(localStorage)
        .filter(key => key.startsWith(STORAGE_PREFIX))
        .forEach(key => localStorage.removeItem(key));
};

export const exportData = () => {
    const data = {};
    Object.keys(localStorage)
        .filter(key => key.startsWith(STORAGE_PREFIX))
        .forEach(key => {
            data[key.replace(STORAGE_PREFIX, '')] = JSON.parse(localStorage.getItem(key));
        });
    return data;
};

export const importData = (data) => {
    Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(getKey(key), JSON.stringify(value));
    });
};

// ============================================
// Auto-migração
// ============================================

const runMigrations = () => {
    if (typeof window === 'undefined') return;
    try {
        const oldKey = `${STORAGE_PREFIX}lancamentos`;
        const newKey = `${STORAGE_PREFIX}lancamentos_financeiros`;
        const oldDataStr = localStorage.getItem(oldKey);

        if (oldDataStr) {
            const oldData = JSON.parse(oldDataStr);
            const newData = JSON.parse(localStorage.getItem(newKey) || '[]');

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

export default {
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
