/**
 * OSPrimeX - Sistema de Feature Flags
 * 
 * Permite habilitar/desabilitar funcionalidades por empresa (tenant)
 * Útil para lançamentos graduais e add-ons pagos
 */

import storage from './storage';

// Features disponíveis no sistema
export const FEATURES = {
    // Core (sempre habilitado)
    CORE_OS: 'core_os',
    CORE_CLIENTES: 'core_clientes',
    CORE_VEICULOS: 'core_veiculos',
    CORE_ESTOQUE: 'core_estoque',

    // Add-ons (podem ser habilitados/desabilitados)
    ADDON_AGENDA: 'addon_agenda',
    ADDON_CRM: 'addon_crm',
    ADDON_RASTREADOR_PUBLICO: 'addon_rastreador_publico',
    ADDON_RELATORIOS_AVANCADOS: 'addon_relatorios_avancados',
    ADDON_MULTI_USUARIOS: 'addon_multi_usuarios',
    ADDON_PDF: 'addon_pdf',
    ADDON_FINANCEIRO: 'addon_financeiro',
    ADDON_XML_IMPORTER: 'addon_xml_importer',

    // Funcionalidades experimentais
    BETA_NOTIFICACOES: 'beta_notificacoes',
    BETA_INTEGRACAO_WHATSAPP: 'beta_integracao_whatsapp',
};

// Features habilitadas por padrão para cada plano
const PLANO_FEATURES = {
    basico: [
        FEATURES.CORE_OS,
        FEATURES.CORE_CLIENTES,
        FEATURES.CORE_VEICULOS,
        FEATURES.CORE_ESTOQUE,
        FEATURES.ADDON_PDF,
    ],
    profissional: [
        FEATURES.CORE_OS,
        FEATURES.CORE_CLIENTES,
        FEATURES.CORE_VEICULOS,
        FEATURES.CORE_ESTOQUE,
        FEATURES.ADDON_AGENDA,
        FEATURES.ADDON_RASTREADOR_PUBLICO,
        FEATURES.ADDON_PDF,
        FEATURES.ADDON_FINANCEIRO,
        FEATURES.ADDON_MULTI_USUARIOS,
    ],
    empresarial: [
        // Todas as features
        ...Object.values(FEATURES),
    ],
};

// Cache local para evitar consultas repetidas
let featuresCache = {};

/**
 * Busca as features habilitadas para uma empresa
 */
export const getEnabledFeatures = async (empresaId) => {
    if (featuresCache[empresaId]) {
        return featuresCache[empresaId];
    }

    try {
        // Buscar empresa para saber o plano
        const empresas = await storage.getAll('empresas');
        const empresa = empresas.find(e => e.id === empresaId);

        if (!empresa) {
            return PLANO_FEATURES.basico;
        }

        // Buscar config de features customizadas
        const configs = await storage.getAll('feature_flags');
        const configEmpresa = configs.find(c => c.empresaId === empresaId);

        let features = PLANO_FEATURES[empresa.plano] || PLANO_FEATURES.basico;

        // Aplicar overrides customizados
        if (configEmpresa?.enabledFeatures) {
            features = [...new Set([...features, ...configEmpresa.enabledFeatures])];
        }
        if (configEmpresa?.disabledFeatures) {
            features = features.filter(f => !configEmpresa.disabledFeatures.includes(f));
        }

        featuresCache[empresaId] = features;
        return features;
    } catch (error) {
        console.error('Erro ao carregar features:', error);
        return PLANO_FEATURES.basico;
    }
};

/**
 * Verifica se uma feature está habilitada para a empresa
 */
export const isFeatureEnabled = async (empresaId, feature) => {
    const features = await getEnabledFeatures(empresaId);
    return features.includes(feature);
};

/**
 * Verifica se uma feature está habilitada (versão síncrona, usa cache)
 */
export const isFeatureEnabledSync = (empresaId, feature) => {
    const features = featuresCache[empresaId];
    if (!features) return true; // Por padrão, assume habilitado
    return features.includes(feature);
};

/**
 * Atualiza as features de uma empresa (admin only)
 */
export const updateFeatures = async (empresaId, enabledFeatures, disabledFeatures = []) => {
    try {
        const configs = await storage.getAll('feature_flags');
        const existing = configs.find(c => c.empresaId === empresaId);

        if (existing) {
            await storage.update('feature_flags', existing.id, {
                enabledFeatures,
                disabledFeatures,
            });
        } else {
            await storage.create('feature_flags', {
                empresaId,
                enabledFeatures,
                disabledFeatures,
            }, empresaId);
        }

        // Limpar cache
        delete featuresCache[empresaId];
    } catch (error) {
        console.error('Erro ao atualizar features:', error);
        throw error;
    }
};

/**
 * Limpa o cache de features (chamar ao mudar de empresa/usuario)
 */
export const clearFeaturesCache = () => {
    featuresCache = {};
};

// Descrições das features para UI
export const FEATURE_DESCRIPTIONS = {
    [FEATURES.CORE_OS]: {
        nome: 'Ordens de Serviço',
        descricao: 'Gestão completa de OS com Kanban',
        icone: 'assignment',
    },
    [FEATURES.CORE_CLIENTES]: {
        nome: 'Clientes',
        descricao: 'Cadastro e gestão de clientes',
        icone: 'people',
    },
    [FEATURES.CORE_VEICULOS]: {
        nome: 'Veículos',
        descricao: 'Cadastro de veículos dos clientes',
        icone: 'directions_car',
    },
    [FEATURES.CORE_ESTOQUE]: {
        nome: 'Estoque',
        descricao: 'Gestão de produtos e serviços',
        icone: 'inventory_2',
    },
    [FEATURES.ADDON_AGENDA]: {
        nome: 'Agenda',
        descricao: 'Agendamento de atendimentos',
        icone: 'calendar_month',
        addon: true,
    },
    [FEATURES.ADDON_CRM]: {
        nome: 'CRM & Retenção',
        descricao: 'Alertas de retenção e follow-up',
        icone: 'loyalty',
        addon: true,
    },
    [FEATURES.ADDON_RASTREADOR_PUBLICO]: {
        nome: 'Rastreador Público',
        descricao: 'Link público para acompanhar OS',
        icone: 'track_changes',
        addon: true,
    },
    [FEATURES.ADDON_RELATORIOS_AVANCADOS]: {
        nome: 'Relatórios Avançados',
        descricao: 'Relatórios detalhados e exportação',
        icone: 'analytics',
        addon: true,
    },
    [FEATURES.ADDON_MULTI_USUARIOS]: {
        nome: 'Multi-Usuários',
        descricao: 'Mais de 1 usuário na conta',
        icone: 'group',
        addon: true,
    },
    [FEATURES.ADDON_PDF]: {
        nome: 'Geração de PDF',
        descricao: 'Gerar PDF de orçamentos e OS',
        icone: 'picture_as_pdf',
        addon: true,
    },
    [FEATURES.ADDON_FINANCEIRO]: {
        nome: 'Financeiro',
        descricao: 'Controle de receitas e despesas',
        icone: 'payments',
        addon: true,
    },
    [FEATURES.ADDON_XML_IMPORTER]: {
        nome: 'Importador XML (NFe)',
        descricao: 'Importar NFe para estoque e financeiro',
        icone: 'upload_file',
        addon: true,
    },
    [FEATURES.BETA_NOTIFICACOES]: {
        nome: 'Notificações (Beta)',
        descricao: 'Notificações push e email',
        icone: 'notifications',
        beta: true,
    },
    [FEATURES.BETA_INTEGRACAO_WHATSAPP]: {
        nome: 'WhatsApp (Beta)',
        descricao: 'Envio de mensagens via WhatsApp',
        icone: 'chat',
        beta: true,
    },
};

export default {
    FEATURES,
    getEnabledFeatures,
    isFeatureEnabled,
    isFeatureEnabledSync,
    updateFeatures,
    clearFeaturesCache,
    FEATURE_DESCRIPTIONS,
};
