import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import storage from '../lib/storage';
import { useAuth } from './AuthContext';
import { getEnabledFeatures } from '../lib/featureFlags';

const TenantContext = createContext(null);

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenant deve ser usado dentro de TenantProvider');
    }
    return context;
};

// Definição dos planos
const PLANOS = {
    essencial: { nome: 'Essencial', limiteUsuarios: 1, limiteOS: 50 },
    profissional: { nome: 'Profissional', limiteUsuarios: 3, limiteOS: 200 },
    plus: { nome: 'Plus', limiteUsuarios: 5, limiteOS: 1000 },
    enterprise: { nome: 'Enterprise', limiteUsuarios: 999, limiteOS: 99999 },
};

// Definição dos add-ons (apenas para display/info se necessário)
const ADDONS = {
    addon_crm: { nome: 'CRM e Retenção', descricao: 'Alertas automáticos e manuais para retenção de clientes' },
    addon_rastreador_publico: { nome: 'Rastreador Público', descricao: 'Link público para cliente acompanhar a OS' },
    addon_relatorios_avancados: { nome: 'Relatórios Avançados', descricao: 'Relatórios detalhados e exportação' },
    addon_xml_importer: { nome: 'Importador de XML (NFe)', descricao: 'Importação automática de estoque e financeiro via XML' },
};

export const TenantProvider = ({ children }) => {
    const { empresa } = useAuth();
    const [config, setConfig] = useState(null);
    const [featureFlags, setFeatureFlags] = useState([]); // Agora será array de strings
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
    const hasAddon = useCallback((addonKey) => {
        return featureFlags.includes(addonKey);
    }, [featureFlags]);

    // Verifica limite de usuários do plano
    const getLimiteUsuarios = useCallback(() => {
        if (!empresa) return 0;
        return PLANOS[empresa.plano]?.limiteUsuarios || 1;
    }, [empresa]);

    // Verifica limite de OS do plano
    const getLimiteOS = useCallback(() => {
        if (!empresa) return 0;
        return PLANOS[empresa.plano]?.limiteOS || 50;
    }, [empresa]);

    // Verifica se pode criar mais usuários
    const podecriarUsuario = useCallback(async () => {
        if (!empresa) return false;
        const usuarios = await storage.getAll('usuarios', empresa.id);
        const ativos = usuarios.filter(u => u.ativo);
        return ativos.length < getLimiteUsuarios();
    }, [empresa, getLimiteUsuarios]);

    // Verifica se pode criar mais OS
    const podeCriarOS = useCallback(async () => {
        if (!empresa) return false;
        // Check simplificado: conta total de OS (idealmente seria por mês ou ativas)
        // Para MVP/Demo assumimos volume total do banco
        const os = await storage.getAll('ordens_servico', empresa.id);
        const limite = getLimiteOS();
        return os.length < limite;
    }, [empresa, getLimiteOS]);

    // Atualiza config da empresa
    const atualizarConfig = useCallback(async (novaConfig) => {
        if (!empresa) return;
        const cfg = await storage.saveConfigEmpresa(empresa.id, novaConfig);
        setConfig(cfg);
    }, [empresa]);

    const value = {
        config,
        loading,
        plano: empresa?.plano,
        planoInfo: PLANOS[empresa?.plano],
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
function adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

export default TenantContext;
