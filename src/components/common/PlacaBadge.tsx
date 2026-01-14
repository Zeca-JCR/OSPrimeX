/**
 * PlacaBadge - Componente estilizado para exibição de placas de veículos
 * Visual autêntico da placa Mercosul: faixa azul superior grossa, bordas finas laterais/inferior
 */

type PlacaSize = 'sm' | 'md' | 'lg';

interface PlacaBadgeProps {
    placa: string | null | undefined;
    size?: PlacaSize;
}

interface SizeConfig {
    text: string;
    px: string;
    py: string;
    topBorder: string;
}

const PlacaBadge = ({ placa, size = 'md' }: PlacaBadgeProps) => {
    if (!placa) return null;

    // Classes de tamanho para o texto e padding
    const sizeConfig: Record<PlacaSize, SizeConfig> = {
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
