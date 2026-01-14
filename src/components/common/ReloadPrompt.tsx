// @ts-nocheck
// PWA Registration - Types not available for virtual modules
import { useRegisterSW } from 'virtual:pwa-register/react';

function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: unknown) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error: unknown) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    return (
        <div className="ReloadPrompt-container">
            {(offlineReady || needRefresh) && (
                <div className="fixed bottom-4 right-4 z-[9999] p-4 rounded-xl shadow-lg bg-surface-light dark:bg-surface-dark border border-primary animate-slideUp flex flex-col gap-3 max-w-sm">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                            <span className="material-symbols-outlined">
                                {offlineReady ? 'wifi_off' : 'system_update'}
                            </span>
                        </div>
                        <div>
                            <h3 className="font-bold text-text-light dark:text-text-dark text-sm">
                                {offlineReady ? 'Pronto para uso offline' : 'Nova versão disponível'}
                            </h3>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                {offlineReady
                                    ? 'O aplicativo foi salvo para uso sem internet.'
                                    : 'Clique em atualizar para carregar as novidades.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                        {needRefresh && (
                            <button
                                className="btn-primary py-1.5 px-3 text-xs"
                                onClick={() => updateServiceWorker(true)}
                            >
                                Atualizar
                            </button>
                        )}
                        <button
                            className="btn-secondary py-1.5 px-3 text-xs"
                            onClick={close}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReloadPrompt;
