import { useState, useEffect } from 'react';
import storage from '../../lib/storage';
import { toISODate } from '../../lib/utils';
import CurrencyInput from '../common/CurrencyInput';

const LancamentoModal = ({ tipo, empresaId, onClose, onSave, defaultStatus = 'pago' }) => {
    const isReceita = tipo === 'receita';
    const [form, setForm] = useState({
        descricao: '',
        valor: 0,
        categoria: '',
        data: toISODate(new Date()),
        dataVencimento: toISODate(new Date()),
        status: defaultStatus,
        observacoes: '',
        osId: '',
    });
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState('');
    const [categorias, setCategorias] = useState([]);

    // Estado para Preview de Parcelamento
    const [showPreview, setShowPreview] = useState(false);
    const [previewParcelas, setPreviewParcelas] = useState([]);

    // Categorias padrão (fallback)
    const categoriasReceitaDefault = [
        { value: 'servico', label: 'Serviço' },
        { value: 'venda', label: 'Venda de Peça' },
        { value: 'outro', label: 'Outro' },
    ];

    const categoriasDespesaDefault = [
        { value: 'fornecedor', label: 'Fornecedor' },
        { value: 'aluguel', label: 'Aluguel' },
        { value: 'energia', label: 'Energia' },
        { value: 'agua', label: 'Água' },
        { value: 'internet', label: 'Internet/Telefone' },
        { value: 'salario', label: 'Salário/Comissão' },
        { value: 'manutencao', label: 'Manutenção' },
        { value: 'outro', label: 'Outro' },
    ];

    useEffect(() => {
        carregarCategorias();
    }, [empresaId, tipo]);

    const carregarCategorias = async () => {
        try {
            const cats = await storage.getAll('categorias_financeiras', empresaId);
            const catsFiltradas = cats.filter(c => c.tipo === tipo);

            if (catsFiltradas.length > 0) {
                setCategorias(catsFiltradas.map(c => ({ value: c.nome, label: c.nome })));
                setForm(prev => ({ ...prev, categoria: catsFiltradas[0].nome }));
            } else {
                const defaultCats = isReceita ? categoriasReceitaDefault : categoriasDespesaDefault;
                setCategorias(defaultCats);
                setForm(prev => ({ ...prev, categoria: defaultCats[0].value }));
            }
        } catch (error) {
            console.error("Erro ao carregar categorias", error);
            const defaultCats = isReceita ? categoriasReceitaDefault : categoriasDespesaDefault;
            setCategorias(defaultCats);
        }
    };

    const [repetir, setRepetir] = useState(false);
    const [numeroParcelas, setNumeroParcelas] = useState(2);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // --- NOVA LÓGICA DE PREVIEW ---

    // 1. Gera as parcelas sugeridas
    const gerarPreview = () => {
        const dataBaseStr = form.status === 'pendente' ? form.dataVencimento : form.data;
        // Criar data base corrigindo timezone (Date(string) usa UTC)
        const [ano, mes, dia] = dataBaseStr.split('-').map(Number);

        const parcelas = [];
        const valorParcela = parseFloat(form.valor); // Valor fixo repetido

        for (let i = 0; i < numeroParcelas; i++) {
            // Lógica inteligente de data: Tenta manter o dia fixo
            // new Date(ano, mesIndex, dia)
            // mes - 1 é o mês da data base (0-indexed)
            let novaData = new Date(ano, (mes - 1) + i, dia);

            // Verificação de overflow: Se o dia mudou, é porque o mês destino tem menos dias
            // Ex: 30 Fev não existe, vira 2 Março. Queremos 28/29 Fev.
            if (novaData.getDate() !== dia) {
                // Volta para o último dia do mês correto
                novaData = new Date(ano, mes + i, 0);
            }

            const dataFormatada = toISODate(novaData);

            parcelas.push({
                descricao: `${form.descricao} (${i + 1}/${numeroParcelas})`,
                valor: valorParcela,
                data: dataFormatada,
            });
        }

        setPreviewParcelas(parcelas);
        setShowPreview(true);
    };

    // 2. Atualiza item no preview
    const handlePreviewChange = (index, field, value) => {
        const newParcelas = [...previewParcelas];
        newParcelas[index] = { ...newParcelas[index], [field]: value };
        setPreviewParcelas(newParcelas);
    };

    // 3. Salva efetivamente
    const efetivarParcelamento = async () => {
        setSalvando(true);
        try {
            // Loop sequencial obrigatório
            for (const parcela of previewParcelas) {
                const payload = {
                    tipo,
                    descricao: parcela.descricao,
                    valor: parseFloat(parcela.valor),
                    categoria: form.categoria,
                    // Se pendente: data=hoje, vencimento=parcela.data
                    // Se pago: data=parcela.data (baixa na data futura)
                    data: form.status === 'pendente' ? form.data : parcela.data,
                    dataVencimento: form.status === 'pendente' ? parcela.data : null,
                    status: form.status,
                    observacoes: form.observacoes,
                    osId: form.osId || null,
                };

                await storage.create('lancamentos_financeiros', payload, empresaId);
            }
            onSave();
        } catch (error) {
            setError('Erro ao salvar: ' + error.message);
        } finally {
            setSalvando(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.descricao.trim()) {
            setError('Descrição é obrigatória');
            return;
        }
        if (!form.valor || parseFloat(form.valor) <= 0) {
            setError('Valor deve ser maior que zero');
            return;
        }

        // Se for parcelado, vai para o preview primeiro
        if (repetir) {
            gerarPreview();
            return;
        }

        // Salvar único (sem repetição)
        setSalvando(true);
        try {
            const dataBaseStr = form.status === 'pendente' ? form.dataVencimento : form.data;
            const payload = {
                tipo,
                descricao: form.descricao,
                valor: parseFloat(form.valor),
                categoria: form.categoria,
                data: form.status === 'pendente' ? form.data : dataBaseStr,
                dataVencimento: form.status === 'pendente' ? dataBaseStr : null,
                status: form.status,
                observacoes: form.observacoes,
                osId: form.osId || null,
            };

            await storage.create('lancamentos_financeiros', payload, empresaId);
            onSave();
        } catch (error) {
            setError(error.message || 'Erro ao salvar');
        } finally {
            setSalvando(false);
        }
    };

    // --- RENDERIZAR PREVIEW ---
    if (showPreview) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <div className="card p-6 w-full max-w-lg max-h-[90vh] flex flex-col animate-slideUp">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                            Confirmar Parcelas
                        </h2>
                        <button onClick={() => setShowPreview(false)} className="text-sm text-primary hover:underline">
                            Voltar
                        </button>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300 mb-4">
                        Verifique as datas. Você pode alterá-las manualmente.
                    </div>

                    <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
                        {previewParcelas.map((p, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                <div className="flex-1 w-full">
                                    <label className="text-xs text-text-secondary-light block mb-1">Descrição</label>
                                    <input
                                        value={p.descricao}
                                        onChange={(e) => handlePreviewChange(index, 'descricao', e.target.value)}
                                        className="input h-8 text-sm w-full"
                                    />
                                </div>
                                <div className="w-full sm:w-32">
                                    <label className="text-xs text-text-secondary-light block mb-1">Data</label>
                                    <input
                                        type="date"
                                        value={p.data}
                                        onChange={(e) => handlePreviewChange(index, 'data', e.target.value)}
                                        className="input h-8 text-sm w-full"
                                    />
                                </div>
                                <div className="w-full sm:w-24">
                                    <label className="text-xs text-text-secondary-light block mb-1">Valor</label>
                                    <input
                                        type="number"
                                        value={p.valor}
                                        onChange={(e) => handlePreviewChange(index, 'valor', e.target.value)}
                                        className="input h-8 text-sm w-full"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                        <button onClick={() => setShowPreview(false)} className="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button onClick={efetivarParcelamento} disabled={salvando} className="btn-primary flex-1">
                            {salvando ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                                    Salvando...
                                </span>
                            ) : 'Confirmar Lançamentos'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDERIZAR FORMULÁRIO PADRÃO ---
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md animate-slideUp max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                        {form.status === 'pendente' ? 'Agendar' : 'Nova'} {isReceita ? 'Receita' : 'Despesa'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Switch Pago/Pendente */}
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
                        <button
                            type="button"
                            className={`flex-1 py-1 text-sm font-medium rounded-md transition-all ${form.status === 'pago'
                                ? 'bg-white dark:bg-gray-700 shadow text-green-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setForm({ ...form, status: 'pago' })}
                        >
                            {isReceita ? 'Recebido' : 'Pago'}
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-1 text-sm font-medium rounded-md transition-all ${form.status === 'pendente'
                                ? 'bg-white dark:bg-gray-700 shadow text-orange-500'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setForm({ ...form, status: 'pendente' })}
                        >
                            Pendente
                        </button>
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Descrição *
                        </label>
                        <input
                            type="text"
                            name="descricao"
                            value={form.descricao}
                            onChange={handleChange}
                            className="input"
                            placeholder={isReceita ? 'Pagamento OS #1234' : 'Compra de peças'}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <CurrencyInput
                                label="Valor R$"
                                value={form.valor}
                                onChange={(val) => setForm(prev => ({ ...prev, valor: val }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                {form.status === 'pendente' ? 'Vencimento' : 'Data'}
                            </label>
                            <input
                                type="date"
                                name={form.status === 'pendente' ? 'dataVencimento' : 'data'}
                                value={form.status === 'pendente' ? form.dataVencimento : form.data}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Categoria
                        </label>
                        <select
                            name="categoria"
                            value={form.categoria}
                            onChange={handleChange}
                            className="input"
                        >
                            {categorias.map((cat) => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Opção de Parcelamento */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                                type="checkbox"
                                checked={repetir}
                                onChange={(e) => setRepetir(e.target.checked)}
                                className="rounded text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-text-light dark:text-text-dark">
                                Repetir lançamento (Parcelar)
                            </span>
                        </label>

                        {repetir && (
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg animate-fadeIn mt-2">
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                                        Nº de Vezes
                                    </label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="60"
                                        value={numeroParcelas}
                                        onChange={(e) => setNumeroParcelas(parseInt(e.target.value) || 2)}
                                        className="input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                                        Frequência
                                    </label>
                                    <select
                                        className="input w-full"
                                        disabled
                                    >
                                        <option>Mensal</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Observações
                        </label>
                        <textarea
                            name="observacoes"
                            value={form.observacoes}
                            onChange={handleChange}
                            className="input min-h-[80px] resize-y"
                            placeholder="Detalhes adicionais..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancelar
                        </button>
                        <button type="submit" disabled={salvando} className="btn-primary flex-1">
                            {salvando ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">save</span>
                                    {repetir ? 'Continuar...' : 'Salvar'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LancamentoModal;
