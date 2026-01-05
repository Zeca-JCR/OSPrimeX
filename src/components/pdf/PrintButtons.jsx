import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { OSDocument, ThermalDocument } from './OSDocument';

// Helper function to handle print
const handlePrint = async (docInstance, fileName) => {
    try {
        // 1. Generate blob
        const blob = await pdf(docInstance).toBlob();

        // 2. Create URL
        const url = URL.createObjectURL(blob);

        // 3. Open in new window (Print Preview)
        const printWindow = window.open(url);

        if (printWindow) {
            // Optional: Auto-trigger print dialog (might be blocked by some browsers)
            // printWindow.onload = () => printWindow.print();
        } else {
            alert('Por favor, permita popups para imprimir.');
        }

        // Cleanup after a delay (to ensure load)
        setTimeout(() => URL.revokeObjectURL(url), 60000);

    } catch (error) {
        console.error('Erro ao gerar impressão:', error);
        alert('Erro ao gerar documento para impressão.');
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

        await handlePrint(doc, `OS_${os?.numero}`);
        setLoading(false);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={className}
            disabled={loading}
            title="Imprimir OS (A4)"
        >
            {loading ? (
                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
            ) : (
                <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">print</span>
                    <span>Imprimir OS</span>
                </div>
            )}
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

        await handlePrint(doc, `Cupom_${os?.numero}`);
        setLoading(false);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={className}
            disabled={loading}
            title="Imprimir Cupom (80mm)"
        >
            {loading ? (
                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
            ) : (
                <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                    <span>Cupom 80mm</span>
                </div>
            )}
        </button>
    );
};
