import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import storage from '../lib/storage';
import { formatDate, toISODate } from '../lib/utils';
import type { OrdemServico, Cliente } from '../types';

// ============================================
// Tipos
// ============================================

interface NotificationMetadata {
    id?: string;
    agendamentoId?: string;
    [key: string]: unknown;
}

interface Notification {
    id: number;
    tipo: 'aprovacao' | 'agenda' | 'alerta' | 'sistema';
    titulo: string;
    mensagem: string;
    lida: boolean;
    criadoEm: string;
    osId?: string;
    link?: string;
    metadata?: NotificationMetadata;
}

interface NotificationContextType {
    notificacoes: Notification[];
    unreadCount: number;
    addNotification: (notif: Omit<Notification, 'id' | 'lida' | 'criadoEm'>) => void;
    markAsRead: (id: number) => void;
    clearAll: () => void;
}

interface NotificationProviderProps {
    children: ReactNode;
}

interface Agendamento {
    id: string;
    empresaId: string;
    data: string;
    hora: string;
    status: string;
    clienteId: string;
    ativo: boolean;
    criadoEm: string;
    atualizadoEm?: string;
    [key: string]: unknown;
}

interface EmpresaExtended {
    id: string;
    agendaDiasAntecedencia?: number | string;
    [key: string]: unknown;
}

// ============================================
// Context
// ============================================

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification deve ser usado dentro de NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
    const { empresa } = useAuth();
    const empresaExtended = empresa as EmpresaExtended | null;
    const [notificacoes, setNotificacoes] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Carregar notificações do localStorage
    useEffect(() => {
        if (empresa?.id) {
            const saved = localStorage.getItem(`osprimex_notificacoes_${empresa.id}`);
            if (saved) {
                const parsed = JSON.parse(saved) as Notification[];
                setNotificacoes(parsed);
                setUnreadCount(parsed.filter(n => !n.lida).length);
            }
        }
    }, [empresa?.id]);

    // Tocar som
    const playSound = useCallback(() => {
        try {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioContext = new AudioContextClass();
            const playNote = (frequency: number, startTime: number, duration: number) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.3, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };
            const now = audioContext.currentTime;
            playNote(523.25, now, 0.15); // C5
            playNote(659.25, now + 0.15, 0.15); // E5
            playNote(783.99, now + 0.30, 0.3); // G5
        } catch (error) {
            console.log('Áudio não suportado');
        }
    }, []);

    // Adicionar notificação
    const addNotification = useCallback((notif: Omit<Notification, 'id' | 'lida' | 'criadoEm'>) => {
        if (!empresa?.id) return;

        const nova: Notification = {
            id: Date.now(),
            ...notif,
            lida: false,
            criadoEm: new Date().toISOString(),
        };

        setNotificacoes(prev => {
            const novas = [nova, ...prev].slice(0, 50); // Manter últimas 50
            localStorage.setItem(`osprimex_notificacoes_${empresa.id}`, JSON.stringify(novas));
            setUnreadCount(novas.filter(n => !n.lida).length);
            return novas;
        });

        playSound();
    }, [empresa?.id, playSound]);

    // Marcar como lida
    const markAsRead = useCallback((id: number) => {
        if (!empresa?.id) return;

        setNotificacoes(prev => {
            const novas = prev.map(n => n.id === id ? { ...n, lida: true } : n);
            localStorage.setItem(`osprimex_notificacoes_${empresa.id}`, JSON.stringify(novas));
            setUnreadCount(novas.filter(n => !n.lida).length);
            return novas;
        });
    }, [empresa?.id]);

    // Limpar tudo
    const clearAll = useCallback(() => {
        if (!empresa?.id) return;
        setNotificacoes([]);
        setUnreadCount(0);
        localStorage.removeItem(`osprimex_notificacoes_${empresa.id}`);
    }, [empresa?.id]);

    // Monitoramento de eventos do sistema (Budgets, etc)
    useEffect(() => {
        const handleStorageChange = async (e: StorageEvent) => {
            if (e.key?.includes('ordens_servico') && empresa?.id) {
                const ordens = await storage.getAll<OrdemServico & { aprovadoEm?: string; aprovadoPor?: string }>('ordens_servico', empresa.id);

                const orcamentosAprovados = ordens.filter(o =>
                    o.aprovadoEm &&
                    new Date(o.aprovadoEm) > new Date(Date.now() - 60000)
                );

                for (const os of orcamentosAprovados) {
                    const currentStored = JSON.parse(localStorage.getItem(`osprimex_notificacoes_${empresa.id}`) || '[]') as Notification[];
                    const jaNotificado = currentStored.some(n => n.osId === os.id && n.tipo === 'aprovacao');

                    if (!jaNotificado) {
                        addNotification({
                            tipo: 'aprovacao',
                            titulo: '🎉 Orçamento Aprovado!',
                            mensagem: `OS #${os.numero} foi aprovada por ${os.aprovadoPor || 'cliente'}`,
                            osId: os.id,
                            link: `/os/${os.id}`
                        });
                    }
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [empresa?.id, addNotification]);

    // Verificar lembretes de agenda
    useEffect(() => {
        if (!empresa?.id) return;

        const checkReminders = async () => {
            const diasAntecedencia = parseInt(String(empresaExtended?.agendaDiasAntecedencia || 1));
            if (diasAntecedencia === 0) return;

            try {
                const [agendamentos, clientes] = await Promise.all([
                    storage.getAll<Agendamento>('agendamentos', empresa.id),
                    storage.getAll<Cliente>('clientes', empresa.id)
                ]);

                const hoje = new Date();
                const limite = new Date();
                limite.setDate(hoje.getDate() + diasAntecedencia);

                const hojeStr = toISODate(hoje);
                const limiteStr = toISODate(limite);

                const pendentes = agendamentos.filter(ag => {
                    if (ag.status !== 'agendado') return false;
                    return ag.data >= hojeStr && ag.data <= limiteStr;
                });

                const storedNotifs = JSON.parse(localStorage.getItem(`osprimex_notificacoes_${empresa.id}`) || '[]') as Notification[];

                pendentes.forEach(ag => {
                    const metaId = `agenda_reminder_${ag.id}`;

                    const jaNotificadoStorage = storedNotifs.some(n => n.metadata?.id === metaId);
                    const jaNotificadoState = notificacoes.some(n => n.metadata?.id === metaId);

                    if (!jaNotificadoStorage && !jaNotificadoState) {
                        const cliente = clientes.find(c => c.id === ag.clienteId);
                        const nomeCliente = cliente?.nome || 'Cliente';

                        addNotification({
                            tipo: 'agenda',
                            titulo: '📅 Confirmar Agendamento',
                            mensagem: `Agendamento de ${nomeCliente} para ${formatDate(ag.data)} às ${ag.hora} precisa de confirmação.`,
                            link: '/agenda',
                            metadata: { id: metaId, agendamentoId: ag.id }
                        });
                    }
                });

            } catch (error) {
                console.error("Erro ao verificar lembretes:", error);
            }
        };

        checkReminders();
        const interval = setInterval(checkReminders, 60 * 60 * 1000);
        return () => clearInterval(interval);

    }, [empresa?.id, empresaExtended?.agendaDiasAntecedencia, addNotification, notificacoes]);

    return (
        <NotificationContext.Provider value={{
            notificacoes,
            unreadCount,
            addNotification,
            markAsRead,
            clearAll
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
