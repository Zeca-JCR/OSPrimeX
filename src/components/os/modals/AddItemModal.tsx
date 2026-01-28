import { useState, useRef, useEffect } from 'react';
import { normalizeString, toTitleCase, formatCurrency } from '../../../lib/utils';
import CurrencyInput from '../../common/CurrencyInput';
import { TimeConversionModal } from './TimeConversionModal';

interface AddItemModalProps {
    produtos: any[];
    onClose: () => void;
    onAdd: (item: any) => void;
    initialValues?: any;
    configuracoes?: any;
}

export const AddItemModal = ({ produtos, onClose, onAdd, initialValues, configuracoes }: AddItemModalProps) => {
    const [tipo, setTipo] = useState(initialValues?.tipo || 'produto');
    const [produtoId, setProdutoId] = useState('');
    const [quantidade, setQuantidade] = useState(initialValues?.quantidade || 1);
    const [unidade, setUnidade] = useState('');
    const [precoUnitario, setPrecoUnitario] = useState(0);
    const [showTemplates, setShowTemplates] = useState(true);
    const [busca, setBusca] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Novos estados para precificação avançada
    const [descontoTipo, setDescontoTipo] = useState('valor'); // 'valor' ou 'porcentagem'
    const [descontoValor, setDescontoValor] = useState('');

    const [acrescimoTipo, setAcrescimoTipo] = useState('valor'); // 'valor' ou 'porcentagem'
    const [acrescimoValor, setAcrescimoValor] = useState('');

    // Safe toggles with defaults
    const showDescontos = configuracoes?.descontoNosItens !== false && configuracoes?.descontoNosItens !== 'false'; // Default TRUE
    const showAcrescimos = configuracoes?.acrescimoNosItens === true || configuracoes?.acrescimoNosItens === 'true'; // Default FALSE

    const produtosFiltrados = produtos.filter((p) => {
        if (p.tipo !== tipo) return false;
        if (!busca) return true;

        const termos = normalizeString(busca).split(' ').filter(t => t.length > 0);
        return termos.every(termo =>
            normalizeString(p.nome).includes(termo) ||
            normalizeString(p.codigoBarras).includes(termo) ||
            normalizeString(p.marca).includes(termo) ||
            normalizeString(p.aplicacao).includes(termo)
        );
    });
    const servicosRapidos = produtos.filter((p) => p.tipo === 'servico' && p.servicoRapido);
    const [showTimeModal, setShowTimeModal] = useState(false);

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

    const handleProdutoChange = (id: string) => {
        setProdutoId(id);
        const prod = produtos.find((p) => p.id === id);
        if (prod) {
            setPrecoUnitario(prod.precoVenda);
            // Legado: Se for SV, força UN. Se não tiver, UN.
            const unit = (!prod.unidade || prod.unidade === 'SV') ? 'UN' : prod.unidade;
            setUnidade(unit);
            // Resetar descontos/acréscimos ao trocar produto
            setDescontoValor('');
            setAcrescimoValor('');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const prod = produtos.find((p) => p.id === produtoId);
        if (!prod) return;

        onAdd({
            produtoId,
            nome: prod.nome,
            tipo: prod.tipo,
            unidade: unidade || 'UN',
            quantidade: qtd,
            precoUnitario: preco,
            // Novos campos
            valorBruto: totalBruto,
            descontoTipo,
            descontoValor: parseFloat(descontoValor) || 0,
            valDesconto, // Valor calculado em R$
            acrescimoTipo,
            acrescimoValor: parseFloat(acrescimoValor) || 0,
            valAcrescimo, // Valor calculado em R$
            total: totalLiquido // Total líquido final
        });

        // Limpar campos e manter foco para próxima inserção
        setBusca('');
        setProdutoId('');
        setPrecoUnitario(0);
        setUnidade('');
        setQuantidade(1);
        setDescontoValor('');
        setAcrescimoValor('');
        searchInputRef.current?.focus();
    };

    // Auto-selecionar se encontrar código de barras exato
    useEffect(() => {
        if (!busca) return;
        const termo = busca.toLowerCase().trim();
        const matchExato = produtos.find(p =>
            p.tipo === tipo &&
            p.codigoBarras &&
            p.codigoBarras.toLowerCase().trim() === termo
        );

        if (matchExato) {
            handleProdutoChange(matchExato.id);
        }
    }, [busca, produtos, tipo]);

    // Adicionar serviço cadastrado rápido
    const adicionarServicoRapido = (servico: any) => {
        onAdd({
            produtoId: servico.id,
            nome: servico.nome,
            tipo: 'servico',
            // Legado: Se for SV, força UN
            unidade: (!servico.unidade || servico.unidade === 'SV') ? 'UN' : servico.unidade,
            quantidade: 1,
            precoUnitario: servico.precoVenda,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                        Adicionar Item
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Serviços Rápidos - apenas os marcados */}
                {showTemplates && servicosRapidos.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-text-light dark:text-text-dark flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg text-primary">bolt</span>
                                Serviços Rápidos
                            </p>
                            <button
                                onClick={() => setShowTemplates(false)}
                                className="text-xs text-text-secondary-light dark:text-text-secondary-dark hover:text-primary"
                            >
                                Ocultar
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {servicosRapidos.map((servico) => (
                                <button
                                    key={servico.id}
                                    type="button"
                                    onClick={() => adicionarServicoRapido(servico)}
                                    className="px-3 py-1.5 rounded-full bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[16px]">build</span>
                                    <span>{servico.nome}</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-3 pt-3 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                Ou selecione manualmente abaixo:
                            </p>
                        </div>
                    </div>
                )}

                {!showTemplates && (
                    <button
                        onClick={() => setShowTemplates(true)}
                        className="w-full mb-4 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">bolt</span>
                        Mostrar Serviços Rápidos
                    </button>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Segmented Control: Produto vs Serviço */}
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <button
                            type="button"
                            onClick={() => {
                                setTipo('produto');
                                setProdutoId('');
                                setBusca('');
                                setUnidade('UN');
                                setPrecoUnitario(0);
                                setQuantidade(1);
                                setDescontoValor('');
                                setAcrescimoValor('');
                            }}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${tipo === 'produto'
                                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">inventory_2</span>
                            Produto
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setTipo('servico');
                                setProdutoId('');
                                setBusca('');
                                setUnidade('UN');
                                setPrecoUnitario(0);
                                setQuantidade(1);
                                setDescontoValor('');
                                setAcrescimoValor('');
                            }}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${tipo === 'servico'
                                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">handyman</span>
                            Serviço
                        </button>
                    </div>

                    {/* Busca por Nome ou Código de Barras (Combobox) */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Buscar Item
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                <span className="material-symbols-outlined">search</span>
                            </span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={busca}
                                onChange={(e) => { setBusca(e.target.value); setShowDropdown(true); }}
                                onFocus={() => setShowDropdown(true)}
                                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                className="input pl-10"
                                placeholder="Nome, código, marca ou aplicação..."
                                autoFocus
                            />
                        </div>

                        {/* Dropdown de Resultados (Combobox) */}
                        {showDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {produtosFiltrados.length === 0 ? (
                                    <div className="p-4 text-center text-text-secondary-light dark:text-text-secondary-dark text-sm">
                                        Nenhum item encontrado.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {produtosFiltrados.map((p) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => { handleProdutoChange(p.id); setShowDropdown(false); setBusca(p.nome); }}
                                                className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between ${produtoId === p.id ? 'bg-primary/5 dark:bg-primary/20 border-l-4 border-l-primary' : ''
                                                    }`}
                                            >
                                                <div>
                                                    <p className="font-medium text-text-light dark:text-text-dark text-sm">
                                                        {toTitleCase(p.nome)}
                                                    </p>
                                                    {(p.marca || p.aplicacao) && (
                                                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
                                                            {[toTitleCase(p.marca), toTitleCase(p.aplicacao)].filter(Boolean).join(' • ')}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-primary">
                                                        {formatCurrency(p.precoVenda)}
                                                    </p>
                                                    {p.tipo === 'produto' && (
                                                        <p className={`text-[10px] font-medium mt-0.5 ${(p.quantidade || 0) > 0
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-red-500'
                                                            }`}>
                                                            Estoque: {p.quantidade || 0}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
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
                                    className="input pr-8" // Padding right for icon
                                    min="0.1"
                                    step="any"
                                    required
                                />
                                {tipo === 'servico' && (
                                    <button
                                        type="button"
                                        onClick={() => setShowTimeModal(true)}
                                        className="absolute right-1 top-1 p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                        title="Converter Horas em Decimal"
                                    >
                                        <span className="material-symbols-outlined text-sm">schedule</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Unidade */}
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">
                                Unidade
                            </label>
                            <input
                                type="text"
                                value={unidade}
                                readOnly
                                className="input bg-gray-50 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark cursor-not-allowed text-center px-1"
                                placeholder="UN"
                            />
                        </div>

                        {/* Preço Unitário */}
                        <div className="col-span-3">
                            <CurrencyInput
                                label="Preço R$"
                                value={precoUnitario}
                                onChange={setPrecoUnitario}
                                labelClassName="text-xs"
                                className="!p-3 !text-sm"
                                required
                            />
                        </div>

                        {/* Total Bruto (Read Only) */}
                        <div className="col-span-4">
                            <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                                Total Bruto
                            </label>
                            <div className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-text-secondary-light dark:text-text-secondary-dark font-medium text-sm cursor-not-allowed">
                                {formatCurrency(totalBruto)}
                            </div>
                        </div>

                        {/* Modificadores Financeiros */}
                        {(showDescontos || showAcrescimos) && (
                            <div className="col-span-12 grid grid-cols-2 gap-4 pt-2">
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
                        <button type="submit" className="btn-primary flex-1" disabled={!produtoId}>
                            <span className="material-symbols-outlined">add</span>
                            Adicionar
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
