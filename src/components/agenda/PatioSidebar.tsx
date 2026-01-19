// @ts-nocheck
// Tipagem completa será adicionada em fase futura
import React from 'react';
import { useNavigate } from 'react-router-dom';

const PatioSidebar = ({ activeOS, loading }) => {
    const navigate = useNavigate();

    // Filtra apenas OSs relevantes para o pátio
    // Filtra apenas OSs relevantes para o pátio: Aberta, Em Execução ou Aguardando Peça
    const patioOS = activeOS.filter(os =>
        ['aberta', 'execucao', 'aguardando_peca'].includes(os.status)
    );

    if (loading) {
        return (
            <div className="w-80 h-full border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark p-4 flex flex-col gap-4">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="hidden lg:flex w-80 h-full border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4 flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-text-light dark:text-text-dark flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">garage_home</span>
                    No Pátio Agora
                </h3>
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                    {patioOS.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {patioOS.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 dark:text-gray-600">
                        <span className="material-symbols-outlined text-4xl mb-2">no_crash</span>
                        <p className="text-sm">Nenhum veículo em serviço no momento.</p>
                    </div>
                ) : (
                    patioOS.map(os => (
                        <div
                            key={os.id}
                            onClick={() => navigate('/os', { state: { openOSId: os.id } })}
                            className="bg-white dark:bg-surface-dark p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-primary/50 relative overflow-hidden"
                        >
                            {/* Status Bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${os.status === 'execucao' ? 'bg-blue-500' : 'bg-green-500'
                                }`}></div>

                            <div className="pl-2">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-text-light dark:text-text-dark text-sm truncate pr-2">
                                        <span className="text-primary mr-1">#{os.numero}</span>
                                        {os.veiculo?.modelo || 'Veículo'}
                                    </h4>
                                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 uppercase">
                                        {os.veiculo?.placa}
                                    </span>
                                </div>

                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-2 truncate">
                                    {os.cliente?.nome?.split(' ')[0]}
                                </p>

                                <div className="flex items-center gap-2 mt-2">
                                    {(() => {
                                        const statusConfig = {
                                            'aberta': { label: 'Aprovada (Não Iniciada)', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
                                            'execucao': { label: 'Execução', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                                            'aguardando_peca': { label: 'Aguardando Peça', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
                                        };
                                        const config = statusConfig[os.status] || { label: os.status, color: 'bg-gray-100 text-gray-500' };

                                        return (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${config.color}`}>
                                                {config.label}
                                            </span>
                                        );
                                    })()}

                                    {os.previsaoEntrega && (
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 ml-auto">
                                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                                            {new Date(os.previsaoEntrega).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs text-center text-gray-400 dark:text-gray-600">
                    Use o pátio para visualizar a carga de trabalho atual.
                </p>
            </div>
        </div>
    );
};

export default PatioSidebar;

