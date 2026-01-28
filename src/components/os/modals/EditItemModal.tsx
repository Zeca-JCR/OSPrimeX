import { useState } from 'react';
import CurrencyInput from '../../common/CurrencyInput';
import { TimeConversionModal } from './TimeConversionModal';
import { formatCurrency } from '../../../lib/utils';

interface EditItemModalProps {
    item: any;
    onClose: () => void;
    onSave: (item: any) => void;
    configuracoes?: any;
}

export const EditItemModal = ({ item, onClose, onSave, configuracoes }: EditItemModalProps) => {
    const [nome, setNome] = useState(item.nome);
    const [quantidade, setQuantidade] = useState(item.quantidade);
    const [unidade, setUnidade] = useState(item.unidade || 'UN'); // Nova state
    const [precoUnitario, setPrecoUnitario] = useState(item.precoUnitario);
    const [showTimeModal, setShowTimeModal] = useState(false);

    // Novos estados
    const [descontoTipo, setDescontoTipo] = useState(item.descontoTipo || 'valor');
    const [descontoValor, setDescontoValor] = useState(item.descontoValor || '');
    const [acrescimoTipo, setAcrescimoTipo] = useState(item.acrescimoTipo || 'valor');
    const [acrescimoValor, setAcrescimoValor] = useState(item.acrescimoValor || '');

    // Safe toggles with defaults
    const showDescontos = configuracoes?.descontoNosItens !== false && configuracoes?.descontoNosItens !== 'false'; // Default TRUE
    const showAcrescimos = configuracoes?.acrescimoNosItens === true || configuracoes?.acrescimoNosItens === 'true'; // Default FALSE

    // Cálculos em tempo real
    const qtd = parseFloat(String(quantidade)) || 0;
    const preco = precoUnitario || 0;
    const totalBruto = qtd * preco;

    let valDesconto = 0;
    if (descontoValor) {
        if (descontoTipo === 'valor') valDesconto = parseFloat(descontoValor) || 0;
        else valDesconto = totalBruto * ((parseFloat(descontoValor) || 0) / 100);
    }

    let valAcrescimo = 0;
    if (acrescimoValor) {
        if (acrescimoTipo === 'valor') valAcrescimo = parseFloat(acrescimoValor) || 0;
        else valAcrescimo = totalBruto * ((parseFloat(acrescimoValor) || 0) / 100);
    }

    const totalLiquido = Math.max(0, totalBruto - valDesconto + valAcrescimo);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...item,
            nome,
            quantidade: qtd,
            unidade: unidade || 'UN',
            precoUnitario: preco,
            // Detalhes de preço
            valorBruto: totalBruto,
            descontoTipo,
            descontoValor: parseFloat(descontoValor) || 0,
            valDesconto,
            acrescimoTipo,
            acrescimoValor: parseFloat(acrescimoValor) || 0,
            valAcrescimo,
            total: totalLiquido
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md animate-slideUp relative">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Editar Item</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                            Nome do Item
                        </label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="input"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                        {/* Quantidade */}
                        <div className="col-span-3">
                            <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">
                                Qtd
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={quantidade}
                                    onChange={(e) => setQuantidade(parseFloat(e.target.value))}
                                    className="input pr-8"
                                    step="any"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowTimeModal(true)}
                                    className="absolute right-1 top-1 p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                    title="Converter Horas em Decimal"
                                >
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                </button>
                            </div>
                        </div>

                        {/* Unidade */}
                        <div className="col-span-3">
                            <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1 uppercase">
                                Unidade
                            </label>
                            <input
                                type="text"
                                value={unidade}
                                onChange={(e) => setUnidade(e.target.value)}
                                className="input uppercase text-center"
                                placeholder="UN"
                                maxLength={3}
                            />
                        </div>

                        {/* Preço */}
                        <div className="col-span-6">
                            <CurrencyInput
                                label="Preço Unitário"
                                value={precoUnitario}
                                onChange={setPrecoUnitario}
                                labelClassName="text-xs"
                                className="!p-3 !text-sm"
                                required
                            />
                        </div>

                        {/* Modificadores Financeiros */}
                        {(showDescontos || showAcrescimos) && (
                            <div className="col-span-12 grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                                {showDescontos && (
                                    <div>
                                        <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                                            Desconto
                                        </label>
                                        <div className="flex rounded-lg shadow-sm">
                                            <input
                                                type="number"
                                                value={descontoValor}
                                                onChange={(e) => setDescontoValor(e.target.value)}
                                                className="input rounded-r-none w-full min-w-0 text-sm"
                                                placeholder="0,00"
                                                min="0"
                                                step="0.01"
                                            />
                                            <select
                                                value={descontoTipo}
                                                onChange={(e) => setDescontoTipo(e.target.value)}
                                                className="bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-l-none px-2 focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600 cursor-pointer w-14"
                                            >
                                                <option value="valor">R$</option>
                                                <option value="porcentagem">%</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                                {showAcrescimos && (
                                    <div>
                                        <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                                            Acréscimo
                                        </label>
                                        <div className="flex rounded-lg shadow-sm">
                                            <input
                                                type="number"
                                                value={acrescimoValor}
                                                onChange={(e) => setAcrescimoValor(e.target.value)}
                                                className="input rounded-r-none w-full min-w-0 text-sm"
                                                placeholder="0,00"
                                                min="0"
                                                step="0.01"
                                            />
                                            <select
                                                value={acrescimoTipo}
                                                onChange={(e) => setAcrescimoTipo(e.target.value)}
                                                className="bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-l-none px-2 focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600 cursor-pointer w-14"
                                            >
                                                <option value="valor">R$</option>
                                                <option value="porcentagem">%</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer: Total Liquido */}
                    <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            <p>Subtotal: {formatCurrency(totalBruto)}</p>
                            {valDesconto > 0 && <p className="text-green-600">Desconto: -{formatCurrency(valDesconto)}</p>}
                            {valAcrescimo > 0 && <p className="text-orange-600">Acréscimo: +{formatCurrency(valAcrescimo)}</p>}
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider font-bold">Total Líquido</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(totalLiquido)}</p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary flex-1">
                            <span className="material-symbols-outlined">save</span>
                            Salvar Alterações
                        </button>
                    </div>
                </form>

                {showTimeModal && (
                    <TimeConversionModal
                        onClose={() => setShowTimeModal(false)}
                        onApply={(val) => setQuantidade(Number(val))}
                        initialValue={quantidade}
                    />
                )}
            </div>
        </div>
    );
};
