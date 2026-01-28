import { useState } from 'react';
import CurrencyInput from '../../common/CurrencyInput';
import { formatCurrency } from '../../../lib/utils';

interface PagamentoModalProps {
    valorRestante: number;
    onClose: () => void;
    onSubmit: (pagamento: {
        valor: number;
        formaPagamento: string;
        observacao: string;
    }) => void;
}

export const PagamentoModal = ({ valorRestante, onClose, onSubmit }: PagamentoModalProps) => {
    const [valor, setValor] = useState(valorRestante);
    const [formaPagamento, setFormaPagamento] = useState('pix');
    const [observacao, setObservacao] = useState('');

    const formasPagamento = [
        { value: 'pix', label: 'PIX', icon: 'qr_code_2' },
        { value: 'dinheiro', label: 'Dinheiro', icon: 'payments' },
        { value: 'cartao_credito', label: 'Crédito', icon: 'credit_card' },
        { value: 'cartao_debito', label: 'Débito', icon: 'local_atm' },
        { value: 'transferencia', label: 'Transf.', icon: 'account_balance' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (valor <= 0 || valor > valorRestante) return;
        onSubmit({
            valor: Number(valor),
            formaPagamento,
            observacao,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                        Registrar Pagamento
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Valor */}
                    <CurrencyInput
                        label="Valor R$"
                        value={valor}
                        onChange={(val) => setValor(val)}
                        max={valorRestante}
                        hint={`Saldo restante: ${formatCurrency(valorRestante)}`}
                        size="lg"
                        required
                        autoFocus
                    />

                    {/* Forma de Pagamento */}
                    <div>
                        <label className="text-sm font-medium text-text-light dark:text-text-dark mb-2 block">
                            Forma de Pagamento
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {formasPagamento.map((fp) => (
                                <button
                                    key={fp.value}
                                    type="button"
                                    onClick={() => setFormaPagamento(fp.value)}
                                    className={`
                                            p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-200
                                            ${formaPagamento === fp.value
                                            ? 'border-primary bg-primary/10 text-primary shadow-sm scale-105'
                                            : 'border-transparent bg-gray-50 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }
                                        `}
                                >
                                    <span className="material-symbols-outlined text-2xl">{fp.icon}</span>
                                    <span className="font-medium text-xs">{fp.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Observação */}
                    <div>
                        <label className="text-sm font-medium text-text-light dark:text-text-dark mb-1 block">
                            Observação (opcional)
                        </label>
                        <input
                            type="text"
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            className="input"
                            placeholder="Ex: parcela 1/3"
                        />
                    </div>

                    {/* Botões */}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-primary flex-1"
                            disabled={valor <= 0 || valor > valorRestante}
                        >
                            <span className="material-symbols-outlined">check</span>
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
