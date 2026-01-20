import { createContext, useContext, useState, ReactNode } from 'react';


interface ModalContextData {
    novaOSOpen: boolean;
    novaOSData: {
        clienteId?: string;
        veiculoId?: string;
    };
    loadingNovaOS: boolean;
    openNovaOS: (data?: { clienteId?: string; veiculoId?: string }) => void;
    closeNovaOS: () => void;
    setLoadingNovaOS: (loading: boolean) => void;
}

const ModalContext = createContext<ModalContextData>({} as ModalContextData);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
    const [novaOSOpen, setNovaOSOpen] = useState(false);
    const [novaOSData, setNovaOSData] = useState({});
    const [loadingNovaOS, setLoadingNovaOS] = useState(false);

    const openNovaOS = (data = {}) => {
        setNovaOSData(data);
        setNovaOSOpen(true);
    };

    const closeNovaOS = () => {
        setNovaOSOpen(false);
        setNovaOSData({});
    };

    return (
        <ModalContext.Provider
            value={{
                novaOSOpen,
                novaOSData,
                loadingNovaOS,
                openNovaOS,
                closeNovaOS,
                setLoadingNovaOS
            }}
        >
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => useContext(ModalContext);
