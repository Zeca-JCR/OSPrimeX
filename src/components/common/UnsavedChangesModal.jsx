import React, { useState, useEffect } from 'react';
import { useTabs } from '../../contexts/TabsContext';

/**
 * Modal reutilizável para confirmação de fechamento de aba com alterações não salvas.
 * Oferece 3 opções: Salvar e sair, Descartar alterações, Cancelar.
 */
const UnsavedChangesModal = ({
    isOpen,
    onSaveAndClose,
    onDiscardAndClose,
    onCancel,
    isSaving = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md animate-slideUp">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl text-amber-600">warning</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
                            Alterações não salvas
                        </h2>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                            O que deseja fazer?
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Salvar e Sair */}
                    {onSaveAndClose && (
                        <button
                            onClick={onSaveAndClose}
                            className="w-full btn-primary bg-green-600 hover:bg-green-700 justify-start"
                            disabled={isSaving}
                        >
                            <span className="material-symbols-outlined">save</span>
                            Salvar e sair
                        </button>
                    )}

                    {/* Descartar */}
                    <button
                        onClick={onDiscardAndClose}
                        className="w-full btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 justify-start"
                    >
                        <span className="material-symbols-outlined">undo</span>
                        Descartar alterações
                    </button>

                    {/* Cancelar */}
                    <button
                        onClick={onCancel}
                        className="w-full text-center text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark py-2"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnsavedChangesModal;
