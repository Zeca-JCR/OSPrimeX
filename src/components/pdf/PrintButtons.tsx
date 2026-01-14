// @ts-nocheck
// Componentes PDF usam @react-pdf/renderer com tipagem específica
import { useState, type ReactElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import { OSDocument, ThermalDocument } from './OSDocument';
import type { OrdemServico, Cliente, Veiculo, Empresa, Colaborador } from '../../types';

// Helper function to handle print using hidden iframe
const handlePrint = async (docInstance: ReactElement): Promise<void> => {
    try {
        // 1. Generate blob
        const blob = await pdf(docInstance).toBlob();
        const url = URL.createObjectURL(blob);

        // 2. Create hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        iframe.style.visibility = 'hidden';

        // 3. Append to body
        document.body.appendChild(iframe);

        // 4. Print when loaded
        iframe.onload = () => {
            setTimeout(() => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error('Print error:', e);
                } finally {
                    setTimeout(() => {
                        document.body.removeChild(iframe);
                        URL.revokeObjectURL(url);
                    }, 5000);
                }
            }, 500);
        };

        iframe.src = url;

    } catch (error) {
        console.error('Erro ao gerar impressão:', error);
        alert('Erro ao processar impressão. Verifique se os popups estão permitidos.');
    }
};

interface PrintOSButtonProps {
    os: OrdemServico & { fotos?: Array<{ url: string; descricao?: string }> };
    cliente: Cliente;
    veiculo: Veiculo;
    empresa: Empresa;
    tecnico?: Colaborador;
    className?: string;
}

export const PrintOSButton = ({ os, cliente, veiculo, empresa, tecnico, className = '' }: PrintOSButtonProps) => {
    const [loading, setLoading] = useState(false);
    const [showPhotoConfirm, setShowPhotoConfirm] = useState(false);

    const handleClick = async () => {
        if (loading) return;

        const hasFotos = os?.fotos && os.fotos.length > 0;

        if (hasFotos) {
            setShowPhotoConfirm(true);
        } else {
            await executarImpressao(false);
        }
    };

    const executarImpressao = async (incluirFotos: boolean) => {
        setLoading(true);
        setShowPhotoConfirm(false);

        const doc = (
            <OSDocument
                os={os}
                cliente={cliente}
                veiculo={veiculo}
                empresa={empresa}
                tecnico={tecnico}
                incluirFotos={incluirFotos}
            />
        );

        await handlePrint(doc);
        setLoading(false);
    };

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                className={className}
                disabled={loading}
                title="Imprimir OS Direto"
            >
                <div className="flex items-center gap-1">
                    {loading ? (
                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                    ) : (
                        <span className="material-symbols-outlined text-lg">print</span>
                    )}
                    <span>Imprimir OS</span>
                </div>
            </button>

            {/* Modal de Confirmação de Fotos */}
            {showPhotoConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">photo_library</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Incluir Fotos na Impressão?
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Esta OS possui {os.fotos?.length || 0} foto(s)
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Deseja incluir as fotos da OS na impressão? Isso pode aumentar o tamanho do documento.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => executarImpressao(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
                            >
                                Sem Fotos
                            </button>
                            <button
                                onClick={() => executarImpressao(true)}
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">photo_camera</span>
                                Com Fotos
                            </button>
                        </div>

                        <button
                            onClick={() => setShowPhotoConfirm(false)}
                            className="w-full mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

interface PrintThermalButtonProps {
    os: OrdemServico;
    cliente: Cliente;
    veiculo: Veiculo;
    empresa: Empresa;
    className?: string;
}

export const PrintThermalButton = ({ os, cliente, veiculo, empresa, className = '' }: PrintThermalButtonProps) => {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        if (loading) return;
        setLoading(true);

        const doc = (
            <ThermalDocument
                os={os}
                cliente={cliente}
                veiculo={veiculo}
                empresa={empresa}
            />
        );

        await handlePrint(doc);
        setLoading(false);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={className}
            disabled={loading}
            title="Imprimir Térmica Direto"
        >
            <div className="flex items-center gap-1">
                {loading ? (
                    <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                ) : (
                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                )}
                <span>Impressão Térmica</span>
            </div>
        </button>
    );
};
