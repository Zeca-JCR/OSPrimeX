/**
 * OSPrimeX - Sistema de Feature Flags
 * 
 * Permite habilitar/desabilitar funcionalidades por empresa (tenant)
 * Útil para lançamentos graduais e add-ons pagos
 */

import storage from './storage';
import type { Empresa, BaseEntity } from '../types';

// ============================================
// Tipos
// ============================================

export type FeatureName =
    | 'core_os'
    | 'core_clientes'
    | 'core_veiculos'
    | 'core_estoque'
    | 'addon_agenda'
    | 'addon_crm'
    | 'addon_rastreador_publico'
    | 'addon_relatorios_avancados'
    | 'addon_multi_usuarios'
    | 'addon_pdf'
    | 'addon_financeiro'
    | 'addon_xml_importer'
    | 'beta_notificacoes'
    | 'beta_integracao_whatsapp';

export interface FeatureDescription {
    nome: string;
    descricao: string;
    icone: string;
    addon?: boolean;
    beta?: boolean;
}

interface FeatureFlagConfig extends BaseEntity {
    enabledFeatures?: FeatureName[];
    disabledFeatures?: FeatureName[];
}

type PlanoName = 'basico' | 'profissional' | 'empresarial';

// ============================================
// Features disponíveis no sistema
// ============================================

export const FEATURES: Record<string, FeatureName> = {
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
} as const;

// Features habilitadas por padrão para cada plano
const PLANO_FEATURES: Record<PlanoName, FeatureName[]> = {
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
let featuresCache: Record<string, FeatureName[]> = {};

// ============================================
// Funções
// ============================================

/**
 * Busca as features habilitadas para uma empresa
 */
export const getEnabledFeatures = async (empresaId: string): Promise<FeatureName[]> => {
    if (featuresCache[empresaId]) {
        return featuresCache[empresaId];
    }

    try {
        // Buscar empresa para saber o plano
        const empresas = await storage.getAll<Empresa>('empresas');
        const empresa = empresas.find(e => e.id === empresaId);

        if (!empresa) {
            return PLANO_FEATURES.basico;
        }

        // Buscar config de features customizadas
        const configs = await storage.getAll<FeatureFlagConfig>('feature_flags');
        const configEmpresa = configs.find(c => c.empresaId === empresaId);

        const plano = (empresa.plano as PlanoName) || 'basico';
        let features = PLANO_FEATURES[plano] || PLANO_FEATURES.basico;

        // Aplicar overrides customizados
        if (configEmpresa?.enabledFeatures) {
            features = [...new Set([...features, ...configEmpresa.enabledFeatures])];
        }
        if (configEmpresa?.disabledFeatures) {
            features = features.filter(f => !configEmpresa.disabledFeatures!.includes(f));
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
export const isFeatureEnabled = async (empresaId: string, feature: FeatureName): Promise<boolean> => {
    const features = await getEnabledFeatures(empresaId);
    return features.includes(feature);
};

/**
 * Verifica se uma feature está habilitada (versão síncrona, usa cache)
 */
export const isFeatureEnabledSync = (empresaId: string, feature: FeatureName): boolean => {
    const features = featuresCache[empresaId];
    if (!features) return true; // Por padrão, assume habilitado
    return features.includes(feature);
};

/**
 * Atualiza as features de uma empresa (admin only)
 */
export const updateFeatures = async (
    empresaId: string,
    enabledFeatures: FeatureName[],
    disabledFeatures: FeatureName[] = []
): Promise<void> => {
    try {
        const configs = await storage.getAll<FeatureFlagConfig>('feature_flags');
        const existing = configs.find(c => c.empresaId === empresaId);

        if (existing) {
            await storage.update<FeatureFlagConfig>('feature_flags', existing.id, {
                enabledFeatures,
                disabledFeatures,
            } as Partial<FeatureFlagConfig>);
        } else {
            await storage.create<FeatureFlagConfig>('feature_flags', {
                enabledFeatures,
                disabledFeatures,
            } as Partial<FeatureFlagConfig>, empresaId);
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
export const clearFeaturesCache = (): void => {
    featuresCache = {};
};

// ============================================
// Descrições das features para UI
// ============================================

export const FEATURE_DESCRIPTIONS: Record<FeatureName, FeatureDescription> = {
    'core_os': {
        nome: 'Ordens de Serviço',
        descricao: 'Gestão completa de OS com Kanban',
        icone: 'assignment',
    },
    'core_clientes': {
        nome: 'Clientes',
        descricao: 'Cadastro e gestão de clientes',
        icone: 'people',
    },
    'core_veiculos': {
        nome: 'Veículos',
        descricao: 'Cadastro de veículos dos clientes',
        icone: 'directions_car',
    },
    'core_estoque': {
        nome: 'Estoque',
        descricao: 'Gestão de produtos e serviços',
        icone: 'inventory_2',
    },
    'addon_agenda': {
        nome: 'Agenda',
        descricao: 'Agendamento de atendimentos',
        icone: 'calendar_month',
        addon: true,
    },
    'addon_crm': {
        nome: 'CRM & Retenção',
        descricao: 'Alertas de retenção e follow-up',
        icone: 'loyalty',
        addon: true,
    },
    'addon_rastreador_publico': {
        nome: 'Rastreador Público',
        descricao: 'Link público para acompanhar OS',
        icone: 'track_changes',
        addon: true,
    },
    'addon_relatorios_avancados': {
        nome: 'Relatórios Avançados',
        descricao: 'Relatórios detalhados e exportação',
        icone: 'analytics',
        addon: true,
    },
    'addon_multi_usuarios': {
        nome: 'Multi-Usuários',
        descricao: 'Mais de 1 usuário na conta',
        icone: 'group',
        addon: true,
    },
    'addon_pdf': {
        nome: 'Geração de PDF',
        descricao: 'Gerar PDF de orçamentos e OS',
        icone: 'picture_as_pdf',
        addon: true,
    },
    'addon_financeiro': {
        nome: 'Financeiro',
        descricao: 'Controle de receitas e despesas',
        icone: 'payments',
        addon: true,
    },
    'addon_xml_importer': {
        nome: 'Importador XML (NFe)',
        descricao: 'Importar NFe para estoque e financeiro',
        icone: 'upload_file',
        addon: true,
    },
    'beta_notificacoes': {
        nome: 'Notificações (Beta)',
        descricao: 'Notificações push e email',
        icone: 'notifications',
        beta: true,
    },
    'beta_integracao_whatsapp': {
        nome: 'WhatsApp (Beta)',
        descricao: 'Envio de mensagens via WhatsApp',
        icone: 'chat',
        beta: true,
    },
};

// ============================================
// Export Default
// ============================================

export default {
    FEATURES,
    getEnabledFeatures,
    isFeatureEnabled,
    isFeatureEnabledSync,
    updateFeatures,
    clearFeaturesCache,
    FEATURE_DESCRIPTIONS,
};
