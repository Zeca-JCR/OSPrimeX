import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import storage from '../lib/storage';
import { useAuth } from './AuthContext';
import { getEnabledFeatures, type FeatureName } from '../lib/featureFlags';
import type { ConfigEmpresa, Usuario, OrdemServico } from '../types';

// ============================================
// Tipos
// ============================================

interface PlanoInfo {
    nome: string;
    limiteUsuarios: number;
    limiteOS: number;
}

interface AddonInfo {
    nome: string;
    descricao: string;
}

interface TenantContextType {
    config: ConfigEmpresa | null;
    loading: boolean;
    plano: string | undefined;
    planoInfo: PlanoInfo | undefined;
    addons: Record<string, AddonInfo>;
    hasAddon: (addonKey: FeatureName) => boolean;
    getLimiteUsuarios: () => number;
    getLimiteOS: () => number;
    podecriarUsuario: () => Promise<boolean>;
    podeCriarOS: () => Promise<boolean>;
    atualizarConfig: (novaConfig: Partial<ConfigEmpresa>) => Promise<void>;
    empresaId: string | undefined;
}

interface TenantProviderProps {
    children: ReactNode;
}

// ============================================
// Constantes
// ============================================

// Definição dos planos
const PLANOS: Record<string, PlanoInfo> = {
    essencial: { nome: 'Essencial', limiteUsuarios: 1, limiteOS: 50 },
    profissional: { nome: 'Profissional', limiteUsuarios: 3, limiteOS: 200 },
    plus: { nome: 'Plus', limiteUsuarios: 5, limiteOS: 1000 },
    enterprise: { nome: 'Enterprise', limiteUsuarios: 999, limiteOS: 99999 },
};

// Definição dos add-ons (apenas para display/info se necessário)
const ADDONS: Record<string, AddonInfo> = {
    addon_crm: { nome: 'CRM e Retenção', descricao: 'Alertas automáticos e manuais para retenção de clientes' },
    addon_rastreador_publico: { nome: 'Rastreador Público', descricao: 'Link público para cliente acompanhar a OS' },
    addon_relatorios_avancados: { nome: 'Relatórios Avançados', descricao: 'Relatórios detalhados e exportação' },
    addon_xml_importer: { nome: 'Importador de XML (NFe)', descricao: 'Importação automática de estoque e financeiro via XML' },
};

// ============================================
// Context
// ============================================

const TenantContext = createContext<TenantContextType | null>(null);

export const useTenant = (): TenantContextType => {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenant deve ser usado dentro de TenantProvider');
    }
    return context;
};

export const TenantProvider = ({ children }: TenantProviderProps) => {
    const { empresa } = useAuth();
    const [config, setConfig] = useState<ConfigEmpresa | null>(null);
    const [featureFlags, setFeatureFlags] = useState<FeatureName[]>([]);
    const [loading, setLoading] = useState(true);

    // Carrega config e feature flags da empresa
    useEffect(() => {
        const carregar = async () => {
            if (!empresa) {
                setConfig(null);
                setFeatureFlags([]);
                setLoading(false);
                return;
            }

            try {
                const cfg = await storage.getConfigEmpresa(empresa.id);
                setConfig(cfg);

                // Usa o helper centralizado que entende o novo schema
                const features = await getEnabledFeatures(empresa.id);
                setFeatureFlags(features);
            } catch (error) {
                console.error('Erro ao carregar config do tenant:', error);
            } finally {
                setLoading(false);
            }
        };
        carregar();
    }, [empresa]);

    // Aplica cores white-label
    useEffect(() => {
        if (config?.corPrimaria) {
            document.documentElement.style.setProperty('--color-primary', config.corPrimaria);
            // Gerar cor hover mais escura
            const hover = adjustColor(config.corPrimaria, -20);
            document.documentElement.style.setProperty('--color-primary-hover', hover);
            // Cor shadow
            document.documentElement.style.setProperty('--color-primary-shadow', `${config.corPrimaria}66`);
        }
    }, [config]);

    // Verifica se um add-on está ativo
    const hasAddon = useCallback((addonKey: FeatureName): boolean => {
        return featureFlags.includes(addonKey);
    }, [featureFlags]);

    // Verifica limite de usuários do plano
    const getLimiteUsuarios = useCallback((): number => {
        if (!empresa) return 0;
        return PLANOS[empresa.plano]?.limiteUsuarios || 1;
    }, [empresa]);

    // Verifica limite de OS do plano
    const getLimiteOS = useCallback((): number => {
        if (!empresa) return 0;
        return PLANOS[empresa.plano]?.limiteOS || 50;
    }, [empresa]);

    // Verifica se pode criar mais usuários
    const podecriarUsuario = useCallback(async (): Promise<boolean> => {
        if (!empresa) return false;
        const usuarios = await storage.getAll<Usuario>('usuarios', empresa.id);
        const ativos = usuarios.filter(u => u.ativo);
        return ativos.length < getLimiteUsuarios();
    }, [empresa, getLimiteUsuarios]);

    // Verifica se pode criar mais OS
    const podeCriarOS = useCallback(async (): Promise<boolean> => {
        if (!empresa) return false;
        const os = await storage.getAll<OrdemServico>('ordens_servico', empresa.id);
        const limite = getLimiteOS();
        return os.length < limite;
    }, [empresa, getLimiteOS]);

    // Atualiza config da empresa
    const atualizarConfig = useCallback(async (novaConfig: Partial<ConfigEmpresa>): Promise<void> => {
        if (!empresa) return;
        const cfg = await storage.saveConfigEmpresa(empresa.id, novaConfig);
        setConfig(cfg);
    }, [empresa]);

    const value: TenantContextType = {
        config,
        loading,
        plano: empresa?.plano,
        planoInfo: empresa?.plano ? PLANOS[empresa.plano] : undefined,
        addons: ADDONS,
        hasAddon,
        getLimiteUsuarios,
        getLimiteOS,
        podecriarUsuario,
        podeCriarOS,
        atualizarConfig,
        empresaId: empresa?.id,
    };

    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    );
};

// Helper para ajustar cor (escurecer/clarear)
function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

export default TenantContext;
