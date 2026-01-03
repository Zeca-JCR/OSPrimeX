import React from 'react';

export const AtribuirTecnicoModal = ({ tecnicos, tecnicoAtualId, onClose, onSelect }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-sm animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Atribuir Técnico</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {tecnicos.length === 0 ? (
                    <p className="text-center text-text-secondary-light dark:text-text-secondary-dark py-4">
                        Nenhum técnico cadastrado
                    </p>
                ) : (
                    <div className="space-y-2">
                        {tecnicos.map((tecnico) => (
                            <button
                                key={tecnico.id}
                                onClick={() => onSelect(tecnico.id)}
                                className={`w-full p-3 rounded-xl text-left flex items-center gap-3 transition-colors ${tecnico.id === tecnicoAtualId
                                    ? 'bg-primary/10 border-2 border-primary'
                                    : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {tecnico.nome?.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-text-light dark:text-text-dark">{tecnico.nome}</p>
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase">
                                        {tecnico.cargo || 'Técnico'}
                                    </p>
                                    {tecnico.comissao && (
                                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                            Comissão: {tecnico.comissao}%
                                        </p>
                                    )}
                                </div>
                                {tecnico.id === tecnicoAtualId && (
                                    <span className="material-symbols-outlined text-primary">check_circle</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
