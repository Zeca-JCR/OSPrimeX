import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import storage from '../lib/storage';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [empresa, setEmpresa] = useState(null);
    const [loading, setLoading] = useState(true);

    // Carrega sessão do localStorage ao iniciar
    useEffect(() => {
        const carregarSessao = async () => {
            try {
                const sessao = storage.getSessao();
                if (sessao) {
                    const usr = await storage.getById('usuarios', sessao.usuarioId);
                    const emp = await storage.getById('empresas', sessao.empresaId);
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

    const login = useCallback(async (email, senha) => {
        try {
            const usuarios = await storage.getAll('usuarios');
            const usr = usuarios.find(
                u => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha && u.ativo
            );

            if (!usr) {
                throw new Error('Email ou senha inválidos');
            }

            const emp = await storage.getById('empresas', usr.empresaId);
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
        } catch (error) {
            throw error;
        }
    }, []);

    const logout = useCallback(() => {
        storage.clearSessao();
        setUsuario(null);
        setEmpresa(null);
    }, []);

    // Recarrega dados da empresa (usado após salvar configurações)
    const refreshEmpresa = useCallback(async () => {
        if (empresa?.id) {
            const emp = await storage.getById('empresas', empresa.id);
            if (emp) {
                setEmpresa(emp);
            }
        }
    }, [empresa?.id]);

    const isAdmin = usuario?.perfil === 'admin';
    const isTecnico = usuario?.perfil === 'tecnico';
    const isFinanceiro = usuario?.perfil === 'financeiro';

    const value = {
        usuario,
        empresa,
        loading,
        isAuthenticated: !!usuario,
        isAdmin,
        isTecnico,
        isFinanceiro,
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
