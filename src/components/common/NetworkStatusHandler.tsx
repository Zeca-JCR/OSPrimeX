import { useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';

const NetworkStatusHandler = () => {
    const { showToast } = useToast();

    useEffect(() => {
        console.log('NetworkStatusHandler: Montado e ouvindo eventos de rede.');

        const handleOnline = () => {
            console.log('Evento Online detectado!');
            showToast('Conexão restabelecida! Você está online novamente.', 'success');
        };

        const handleOffline = () => {
            console.log('Evento Offline detectado!');
            showToast('Você está offline. As alterações serão salvas localmente.', 'warning');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [showToast]);

    return null;
};

export default NetworkStatusHandler;
