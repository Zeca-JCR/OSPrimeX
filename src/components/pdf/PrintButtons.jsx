import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { OSDocument, ThermalDocument } from './OSDocument';

// Helper function to handle print using hidden iframe
const handlePrint = async (docInstance) => {
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
            // Pequeno delay para garantir renderização
            setTimeout(() => {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                } catch (e) {
                    console.error('Print error:', e);
                } finally {
                    // Cleanup
                    setTimeout(() => {
                        document.body.removeChild(iframe);
                        URL.revokeObjectURL(url);
                    }, 5000); // Dar tempo para o diálogo abrir
                }
            }, 500);
        };

        iframe.src = url;

    } catch (error) {
        console.error('Erro ao gerar impressão:', error);
        alert('Erro ao processar impressão. Verifique se os popups estão permitidos.');
    }
};

export const PrintOSButton = ({ os, cliente, veiculo, empresa, tecnico, className = '' }) => {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        if (loading) return;
        setLoading(true);

        const doc = (
            <OSDocument
                os={os}
                cliente={cliente}
                veiculo={veiculo}
                empresa={empresa}
                tecnico={tecnico}
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
    );
};

export const PrintThermalButton = ({ os, cliente, veiculo, empresa, className = '' }) => {
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
