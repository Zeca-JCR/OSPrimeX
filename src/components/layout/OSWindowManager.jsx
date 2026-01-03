import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useOS } from '../../contexts/OSContext';
import DetalhesOS from '../../pages/os/DetalhesOS';

const OSWindowManager = ({ sidebarCollapsed }) => {
    const { windows, activeWindowId, minimizeOS, focusOS, closeOS } = useOS();
    const location = useLocation();

    // Auto-minimize windows when navigating to non-OS routes (e.g. menu clicks)
    useEffect(() => {
        if (!location.pathname.startsWith('/os-window-')) {
            if (activeWindowId) {
                minimizeOS(activeWindowId);
            }
        }
    }, [location.pathname]);

    // Lock Body Scroll when there are active/visible windows
    useEffect(() => {
        const hasVisibleWindows = windows.some(w => !w.minimized);

        if (hasVisibleWindows) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [windows]);

    if (windows.length === 0) return null;

    return (
        <>
            {/* Layer de Janelas (Modais / Overlays) */}
            {/* Z-Index 40 para ficar abaixo do Sidebar (Z-50) mas acima do conteúdo normal */}
            {/* Posicionamento Left ajustado conforme sidebar para não esconder conteúdo */}
            <div
                className={`fixed inset-y-0 right-0 z-[2000] pointer-events-none transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-56'} left-0`}
            >
                {windows.map((win) => {
                    const isActive = win.id === activeWindowId;
                    const isMinimized = win.minimized;

                    return (
                        <div
                            key={win.id}
                            className={`
                                absolute inset-0 bg-background-light dark:bg-background-dark pointer-events-auto flex flex-col
                                transition-all duration-300 ease-in-out transform
                                ${isMinimized ? 'translate-y-full opacity-0 scale-95' : 'translate-y-0 opacity-100 scale-100'}
                                ${isActive ? 'z-[1000] shadow-2xl' : 'z-[990]'}
                                overflow-hidden
                            `}
                            style={{
                                display: isMinimized ? 'none' : 'flex' // Performance: hide completely when minimized
                            }}
                        >
                            {/* Barra de Título Customizada da Janela é renderizada dentro do DetalhesOS em modo window */}
                            <DetalhesOS osId={win.id} isWindowMode={true} onClose={() => closeOS(win.id)} onMinimize={() => minimizeOS(win.id)} />
                        </div>
                    );
                })}
            </div>

            {/* Dock (Barra de Tarefas) */}
            <div className="fixed bottom-4 right-4 z-[1010] flex items-end gap-2 px-4 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300">
                {windows.map((win) => (
                    <button
                        key={win.id}
                        onClick={() => win.id === activeWindowId ? minimizeOS(win.id) : focusOS(win.id)}
                        className={`
                            group relative p-3 rounded-xl transition-all duration-200 flex flex-col items-center justify-center
                            ${win.id === activeWindowId && !win.minimized
                                ? 'bg-primary text-white scale-110 -translate-y-2 shadow-lg ring-2 ring-primary/30'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }
                        `}
                        title={win.title || `OS #${win.number || win.id}`}
                    >
                        <span className="material-symbols-outlined text-2xl">
                            assignment
                        </span>

                        {/* Indicador de OS ativa */}
                        {!win.minimized && (
                            <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
                        )}

                        {/* Indicador de Alteração Não Salva (Piscante) */}
                        {win.isDirty && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border-2 border-white dark:border-gray-900"></span>
                            </span>
                        )}

                        {/* Badge de ID (Tooltip simples) */}
                        <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-black text-white text-xs px-2 py-1 rounded shadow-md whitespace-nowrap">
                            {win.title || `OS #${win.number || win.id.toString().slice(-4)}`}
                            {win.isDirty && <span className="ml-1 text-amber-400">(Não salvo)</span>}
                        </div>
                    </button>
                ))}
            </div>
        </>
    );
};

export default OSWindowManager;
