import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast deve ser usado dentro de ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = Date.now();
        const now = new Date();
        const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        setToasts(prev => [...prev, { id, message, type, hora }]);

        // Auto remove após duration
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Toast de salvamento específico
    const showSaveToast = useCallback((message = 'Salvo com sucesso!') => {
        return showToast(message, 'save');
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, removeToast, showSaveToast }}>
            {children}

            {/* Toast Container */}
            {toasts.length > 0 && (
                <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`
                                flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
                                animate-slideUp backdrop-blur-sm
                                ${toast.type === 'success' ? 'bg-green-500 text-white' : ''}
                                ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
                                ${toast.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
                                ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}
                                ${toast.type === 'save' ? 'bg-surface-light dark:bg-surface-dark border border-green-500 text-text-light dark:text-text-dark' : ''}
                            `}
                            onClick={() => removeToast(toast.id)}
                        >
                            <span className={`material-symbols-outlined text-lg ${toast.type === 'save' ? 'text-green-500' : ''}`}>
                                {toast.type === 'success' || toast.type === 'save' ? 'check_circle' : ''}
                                {toast.type === 'error' ? 'error' : ''}
                                {toast.type === 'warning' ? 'warning' : ''}
                                {toast.type === 'info' ? 'info' : ''}
                            </span>
                            <div>
                                <p className="text-sm font-medium">{toast.message}</p>
                                {toast.type === 'save' && (
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                        às {toast.hora}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
};

export default ToastContext;
