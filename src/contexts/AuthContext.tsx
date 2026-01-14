import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import storage from '../lib/storage';
import type { Usuario, Empresa } from '../types';

// ============================================
// Tipos
// ============================================

interface AuthContextType {
    usuario: Usuario | null;
    empresa: Empresa | null;
    loading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isTecnico: boolean;
    isFinanceiro: boolean;
    isSuperAdmin: boolean;
    login: (email: string, senha: string) => Promise<{ usuario: Usuario; empresa: Empresa }>;
    logout: () => void;
    refreshEmpresa: () => Promise<void>;
}

interface AuthProviderProps {
    children: ReactNode;
}

// ============================================
// Context
// ============================================

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [loading, setLoading] = useState(true);

    // Carrega sessão do localStorage ao iniciar
    useEffect(() => {
        const carregarSessao = async () => {
            try {
                const sessao = storage.getSessao();
                if (sessao) {
                    const usr = await storage.getById<Usuario>('usuarios', sessao.usuarioId);
                    const emp = await storage.getById<Empresa>('empresas', sessao.empresaId);
                    if (usr && emp) {
                        setUsuario(usr);
                        setEmpresa(emp);
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar sessão:', error);
            } finally {
                setLoading(false);
            }
        };
        carregarSessao();
    }, []);

    const login = useCallback(async (email: string, senha: string) => {
        const usuarios = await storage.getAll<Usuario>('usuarios');
        const usr = usuarios.find(
            u => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha && u.ativo
        );

        if (!usr) {
            throw new Error('Email ou senha inválidos');
        }

        const emp = await storage.getById<Empresa>('empresas', usr.empresaId);
        if (!emp || !emp.ativo) {
            throw new Error('Empresa não encontrada ou inativa');
        }

        // Salva sessão
        storage.setSessao({
            usuarioId: usr.id,
            empresaId: emp.id,
            loginEm: new Date().toISOString(),
        });

        setUsuario(usr);
        setEmpresa(emp);

        return { usuario: usr, empresa: emp };
    }, []);

    const logout = useCallback(() => {
        storage.clearSessao();
        setUsuario(null);
        setEmpresa(null);
    }, []);

    // Recarrega dados da empresa (usado após salvar configurações)
    const refreshEmpresa = useCallback(async () => {
        if (empresa?.id) {
            const emp = await storage.getById<Empresa>('empresas', empresa.id);
            if (emp) {
                setEmpresa(emp);
            }
        }
    }, [empresa?.id]);

    const isAdmin = usuario?.perfil === 'admin';
    const isTecnico = usuario?.perfil === 'tecnico';
    const isFinanceiro = usuario?.perfil === 'financeiro';
    const isSuperAdmin = usuario?.perfil === 'superadmin';

    const value: AuthContextType = {
        usuario,
        empresa,
        loading,
        isAuthenticated: !!usuario,
        isAdmin,
        isTecnico,
        isFinanceiro,
        isSuperAdmin,
        login,
        logout,
        refreshEmpresa,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
