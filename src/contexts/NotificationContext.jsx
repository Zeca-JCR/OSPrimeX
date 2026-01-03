import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import storage from '../lib/storage';
import { formatDate } from '../lib/utils';

const NotificationContext = createContext(null);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification deve ser usado dentro de NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { empresa } = useAuth();
    const [notificacoes, setNotificacoes] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Carregar notificações do localStorage
    useEffect(() => {
        if (empresa?.id) {
            const saved = localStorage.getItem(`osprimex_notificacoes_${empresa.id}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                setNotificacoes(parsed);
                setUnreadCount(parsed.filter(n => !n.lida).length);
            }
        }
    }, [empresa?.id]);

    // Tocar som
    const playSound = useCallback(() => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const playNote = (frequency, startTime, duration) => {
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
    const addNotification = useCallback((notif) => {
        if (!empresa?.id) return;

        const nova = {
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

        // Tocar som apenas para notificações importantes ou se configurado
        playSound();

    }, [empresa?.id, playSound]);

    // Marcar como lida
    const markAsRead = useCallback((id) => {
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
        const handleStorageChange = async (e) => {
            if (e.key?.includes('ordens_servico') && empresa?.id) {
                // Verificar orçamentos aprovados recentemente (último minuto)
                const ordens = await storage.getAll('ordens_servico', empresa.id);
                // Pegar notificações atuais para evitar duplicidade (estado dentro do effect pode estar stale, melhor ler do ref ou storage se crítico, mas aqui vamos tentar simplificado)
                // OBS: Como é um effect dependency [notificacoes], ele vai rodar sempre que mudar.
                // Mas aqui é event listener. Melhor não depender de [notificacoes] no array base.

                const orcamentosAprovados = ordens.filter(o =>
                    o.aprovadoEm &&
                    new Date(o.aprovadoEm) > new Date(Date.now() - 60000)
                );

                for (const os of orcamentosAprovados) {
                    // Verificar no localStorage para garantir leitura mais atualizada
                    const currentStored = JSON.parse(localStorage.getItem(`osprimex_notificacoes_${empresa.id}`) || '[]');
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
            const diasAntecedencia = parseInt(empresa.agendaDiasAntecedencia || 1);
            if (diasAntecedencia === 0) return; // 0 = desativado

            try {
                const [agendamentos, clientes] = await Promise.all([
                    storage.getAll('agendamentos', empresa.id),
                    storage.getAll('clientes', empresa.id)
                ]);

                const hoje = new Date();
                const limite = new Date();
                limite.setDate(hoje.getDate() + diasAntecedencia);
                // Zerar horas para comparar apenas datas se quiser, mas aqui vamos comparar timestamp simples
                // Melhor: para "Dias de antecedência", geralmente é data >= hoje e data <= hoje + dias

                // Formatar datas para comparação YYYY-MM-DD
                const hojeStr = hoje.toISOString().split('T')[0];
                const limiteStr = limite.toISOString().split('T')[0];

                const pendentes = agendamentos.filter(ag => {
                    if (ag.status !== 'agendado') return false;
                    return ag.data >= hojeStr && ag.data <= limiteStr;
                });

                // Ler notificações atuais para evitar duplicatas (usando ref ou lendo do state se atualizado, ou localStorage direto)
                const storedNotifs = JSON.parse(localStorage.getItem(`osprimex_notificacoes_${empresa.id}`) || '[]');

                pendentes.forEach(ag => {
                    // ID único para o lembrete deste agendamento
                    const metaId = `agenda_reminder_${ag.id}`;

                    // Verificar no storage E no estado atual para evitar duplicidade em tempo real
                    const jaNotificadoStorage = storedNotifs.some(n => n.metadata?.id === metaId);
                    const jaNotificadoState = notificacoes.some(n => n.metadata?.id === metaId);

                    if (!jaNotificadoStorage && !jaNotificadoState) {
                        const cliente = clientes.find(c => c.id === ag.clienteId);
                        const nomeCliente = cliente?.nome || 'Cliente';

                        addNotification({
                            tipo: 'agenda', // Ícone de calendário
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
        // Verificar a cada 1 hora
        const interval = setInterval(checkReminders, 60 * 60 * 1000);
        return () => clearInterval(interval);

    }, [empresa?.id, empresa?.agendaDiasAntecedencia, addNotification]);

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
