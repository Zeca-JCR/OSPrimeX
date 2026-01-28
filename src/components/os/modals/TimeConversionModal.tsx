import { useState, useEffect } from 'react';

interface TimeConversionModalProps {
    onClose: () => void;
    onApply: (decimalValue: string) => void;
    initialValue?: number | string;
}

export const TimeConversionModal = ({ onClose, onApply, initialValue }: TimeConversionModalProps) => {
    // Função auxiliar para inicializar horas (evita race condition)
    const getInitialHoras = () => {
        if (!initialValue) return '00:00';
        const valStr = String(initialValue).replace(',', '.');
        if (isNaN(Number(valStr))) return '00:00';

        const dec = parseFloat(valStr);
        const h = Math.floor(dec);
        const m = Math.round((dec - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const [horas, setHoras] = useState(getInitialHoras);
    const [decimal, setDecimal] = useState('');

    useEffect(() => {
        if (horas) {
            const [h, m] = horas.split(':').map(Number);
            const val = h + (m / 60);
            setDecimal(val.toFixed(3)); // 3 casas decimais
        }
    }, [horas]);

    const handleApply = () => {
        onApply(decimal);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-sm animate-scaleIn">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Conversão de Horário</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">
                                Tempo (HH:MM)
                            </label>
                            <input
                                type="time"
                                value={horas}
                                onChange={(e) => setHoras(e.target.value)}
                                className="input text-center font-mono text-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">
                                Qtde Decimal
                            </label>
                            <input
                                type="text"
                                value={decimal}
                                readOnly
                                className="input bg-gray-50 dark:bg-gray-800 text-right font-mono text-lg"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button onClick={handleApply} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">check</span>
                            Aplicar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
