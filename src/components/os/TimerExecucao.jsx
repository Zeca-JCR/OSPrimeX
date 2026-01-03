import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calculateWorkingTime } from '../../lib/utils';

// Helper para verificar se é horário comercial agora
const isHorarioComercial = (data, config) => {
    if (!config || !config.horarioTrabalhoInicio) return true; // Default to true if no config

    const now = new Date(data);
    const diaSemana = now.getDay();

    const parseTime = (timeStr) => {
        if (!timeStr) return { h: 0, m: 0 };
        const [h, m] = timeStr.split(':').map(Number);
        return { h, m };
    };

    // Domingo
    if (diaSemana === 0) return false;

    let start, end, lunchStart, lunchEnd;

    // Sábado
    if (diaSemana === 6) {
        if (config.trabalhaSabado !== true) return false;
        start = parseTime(config.horarioSabadoInicio || '08:00');
        end = parseTime(config.horarioSabadoFim || '12:00');
        // Sábado geralmente não tem almoço configurado separado, assume direto
        lunchStart = end;
        lunchEnd = end;
    } else {
        // Seg-Sex
        start = parseTime(config.horarioTrabalhoInicio || '08:00');
        end = parseTime(config.horarioTrabalhoFim || '18:00');
        lunchStart = parseTime(config.horarioAlmocoInicio || '12:00');
        lunchEnd = parseTime(config.horarioAlmocoFim || '13:00');
    }

    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const minutesStart = start.h * 60 + start.m;
    const minutesEnd = end.h * 60 + end.m;
    const minutesLunchStart = lunchStart.h * 60 + lunchStart.m;
    const minutesLunchEnd = lunchEnd.h * 60 + lunchEnd.m;

    // Fora do expediente
    if (minutesNow < minutesStart || minutesNow >= minutesEnd) return false;

    // Horário de almoço
    if (minutesNow >= minutesLunchStart && minutesNow < minutesLunchEnd) return false;

    return true;
};

export const TimerExecucao = ({ os }) => {
    const { empresa } = useAuth();
    const [tempoAtual, setTempoAtual] = useState(0);

    useEffect(() => {
        // Já finalizada
        if (os.tempoExecucaoMs) {
            setTempoAtual(os.tempoExecucaoMs);
            return;
        }

        // Em execução
        if (os.status === 'execucao' && os.execucaoIniciadaEm) {
            const calcularTempo = () => {
                const inicio = new Date(os.execucaoIniciadaEm);
                const agora = new Date();

                // Debug
                console.log('Timer Debug:', {
                    inicio: inicio.toLocaleString(),
                    agora: agora.toLocaleString(),
                    empresaConfig: empresa,
                    isHorarioComercial: isHorarioComercial(agora, empresa),
                });

                // Calcular tempo bruto dentro do horário comercial
                let tempoMs = calculateWorkingTime(inicio, agora, empresa);

                console.log('Tempo calculado:', tempoMs);

                // Descontar pausas (apenas o tempo de pausa que ocorreu dentro do horário comercial)
                const pausas = os.execucaoPausadasEm || [];
                const retomadas = os.execucaoRetomadasEm || [];
                for (let i = 0; i < pausas.length; i++) {
                    const pausaInicio = new Date(pausas[i]);
                    const pausaFim = retomadas[i + 1] ? new Date(retomadas[i + 1]) : agora;

                    const tempoPausaValido = calculateWorkingTime(pausaInicio, pausaFim, empresa);
                    tempoMs -= tempoPausaValido;
                }

                setTempoAtual(Math.max(0, tempoMs));
            };

            calcularTempo();
            const interval = setInterval(calcularTempo, 1000);
            return () => clearInterval(interval);
        }

        // Aguardando peça - calcular até a última pausa
        if (os.status === 'aguardando_peca' && os.execucaoIniciadaEm) {
            const inicio = new Date(os.execucaoIniciadaEm);
            const pausas = os.execucaoPausadasEm || [];
            // A última pausa é o momento que "parou" de executar
            const ultimaPausa = pausas.length > 0 ? new Date(pausas[pausas.length - 1]) : new Date();

            let tempoMs = calculateWorkingTime(inicio, ultimaPausa, empresa);

            const retomadas = os.execucaoRetomadasEm || [];
            // Iterar sobre as pausas anteriores (excluindo a atual que é open-ended mas já paramos em ultimaPausa)
            for (let i = 0; i < pausas.length - 1; i++) {
                const pausaInicio = new Date(pausas[i]);
                const pausaFim = retomadas[i + 1] ? new Date(retomadas[i + 1]) : ultimaPausa; // Should match next resume
                // Na verdade, retomadas[i+1] é quando voltou da pausa i.
                // Se i < pausas.length - 1, então essa pausa JÁ TEM retomada.
                // A ultima pausa (index = length-1) é a que estamos agora, que não tem retomada.

                const tempoPausaValido = calculateWorkingTime(pausaInicio, pausaFim, empresa);
                tempoMs -= tempoPausaValido;
            }

            setTempoAtual(Math.max(0, tempoMs));
        }
    }, [os, empresa]);

    const formatarTempo = (ms) => {
        const segundos = Math.floor(ms / 1000) % 60;
        const minutos = Math.floor(ms / 60000) % 60;
        const horas = Math.floor(ms / 3600000);

        if (horas > 0) {
            return `${horas}h ${minutos.toString().padStart(2, '0')}min`;
        }
        return `${minutos}min ${segundos.toString().padStart(2, '0')}s`;
    };

    const isEmExecucao = os.status === 'execucao';
    const isPausado = os.status === 'aguardando_peca';
    // isFinalizado não é usado diretamente no render, mas implícito

    return (
        <div className={`card p-4 ${isEmExecucao ? 'border-l-4 border-primary animate-pulse-soft' : isPausado ? 'border-l-4 border-orange-500' : ''}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isEmExecucao ? 'bg-primary/10 text-primary' :
                        isPausado ? 'bg-orange-500/10 text-orange-500' :
                            'bg-green-500/10 text-green-500'
                        }`}>
                        <span className="material-symbols-outlined">
                            {isEmExecucao ? 'timer' : isPausado ? 'pause_circle' : 'check_circle'}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                            {isEmExecucao ? 'Tempo de Execução' : isPausado ? 'Execução Pausada' : 'Tempo Total de Execução'}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <p className={`text-xl font-bold font-mono ${isEmExecucao ? 'text-primary' :
                                isPausado ? 'text-orange-500' :
                                    'text-green-600 dark:text-green-400'
                                }`}>
                                {formatarTempo(tempoAtual)}
                            </p>
                            <div className="group relative">
                                <span className="material-symbols-outlined text-lg text-primary cursor-help hover:scale-110 transition-transform">info</span>
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900/90 text-white text-xs rounded-lg shadow-xl backdrop-blur-sm z-10 text-center animate-fade-in">
                                    Contabilizando apenas horas úteis configuradas na empresa.
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900/90"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {isEmExecucao && (
                    <div className={`flex items-center gap-1 text-xs ${isHorarioComercial(new Date(), empresa) ? 'text-primary' : 'text-orange-500'}`}>
                        {isHorarioComercial(new Date(), empresa) ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                EM ANDAMENTO
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[14px]">bedtime</span>
                                FORA DO EXPEDIENTE
                            </>
                        )}
                    </div>
                )}
                {isPausado && (
                    <span className="text-xs text-orange-500 font-medium">PAUSADO</span>
                )}
            </div>
        </div>
    );
};
