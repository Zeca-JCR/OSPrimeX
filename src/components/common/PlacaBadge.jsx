import React from 'react';

/**
 * PlacaBadge - Componente estilizado para exibição de placas de veículos
 * Visual autêntico da placa Mercosul: faixa azul superior grossa, bordas finas laterais/inferior
 * 
 * @param {string} placa - Texto da placa (ex: "ABC1D23")
 * @param {string} size - Tamanho: 'sm' | 'md' | 'lg' (default: 'md')
 */
const PlacaBadge = ({ placa, size = 'md' }) => {
    if (!placa) return null;

    // Classes de tamanho para o texto e padding
    const sizeConfig = {
        sm: { text: 'text-xs', px: 'px-2', py: 'py-0.5', topBorder: 'border-t-[6px]' },
        md: { text: 'text-sm', px: 'px-3', py: 'py-1', topBorder: 'border-t-[6px]' },
        lg: { text: 'text-base', px: 'px-4', py: 'py-1.5', topBorder: 'border-t-[8px]' }
    };

    const config = sizeConfig[size] || sizeConfig.md;

    return (
        <span
            className={`
                inline-flex items-center justify-center
                font-mono font-bold tracking-wider uppercase
                bg-white text-gray-800
                border border-blue-600 ${config.topBorder} border-t-blue-600
                rounded
                ${config.text} ${config.px} ${config.py}
            `}
            title={`Placa: ${placa}`}
        >
            {placa}
        </span>
    );
};

export default PlacaBadge;

