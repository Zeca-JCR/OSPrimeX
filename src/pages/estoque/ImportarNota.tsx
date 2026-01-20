// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import storage from '../../lib/storage';
import { parseNFe } from '../../lib/nfeParser';
import { formatCurrency, formatDate, toISODate } from '../../lib/utils';
import { useTenant } from '../../contexts/TenantContext';

const ImportarNota = ({ isTabMode, onClose }) => {
    const { empresa } = useAuth();
    const { hasAddon } = useTenant();
    const { showSaveToast } = useToast();
    const navigate = useNavigate();

    const [step, setStep] = useState(1); // 1: Upload, 2: Revisão
    const [xmlData, setXmlData] = useState(null);
    const [produtosSistema, setProdutosSistema] = useState([]);
    const [produtosMatch, setProdutosMatch] = useState([]); // Produtos mapeados
    const [loading, setLoading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [markup, setMarkup] = useState(50); // Markup atual da tela

    // Proteção de rota
    useEffect(() => {
        if (!hasAddon('addon_xml_importer')) {
            if (isTabMode && onClose) {
                onClose();
            } else {
                navigate('/estoque');
            }
        }
    }, [hasAddon, navigate, isTabMode, onClose]);

    useEffect(() => {
        if (empresa?.id) {
            carregarProdutosSistema();
            if (empresa.markupPadrao) {
                setMarkup(Number(empresa.markupPadrao));
            }
        }
    }, [empresa]);

    const carregarProdutosSistema = async () => {
        if (!empresa?.id) return;
        const prods = await storage.getAll('produtos', empresa.id);
        setProdutosSistema(prods.filter(p => p.ativo));
    };

    const handleFile = async (file) => {
        setLoading(true);
        try {
            const data = await parseNFe(file);
            setXmlData(data);
            fazerCorrespondencia(data.produtos, produtosSistema);
            setStep(2);
        } catch (error) {
            console.error(error);
            alert('Erro ao ler XML: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fazerCorrespondencia = (produtosXML, produtosSys) => {
        const matches = produtosXML.map(prodXml => {
            const nomeXml = prodXml.nome.toLowerCase().trim();
            const eanXml = prodXml.ean !== 'SEM GTIN' ? prodXml.ean : null;

            let match = null;

            // 1. Match exato de EAN
            if (eanXml) {
                match = produtosSys.find(p => p.codigoBarras === eanXml);
            }

            // 2. Se não achou, tenta match de nome
            if (!match) {
                match = produtosSys.find(p => p.nome.toLowerCase().trim() === nomeXml);
            }

            const currentMarkup = empresa.markupPadrao ? Number(empresa.markupPadrao) : 50;
            const multiplier = 1 + (currentMarkup / 100);

            return {
                xml: prodXml,
                sistema: match || null,
                acao: match ? 'atualizar' : 'novo',
                novoNome: prodXml.nome,
                novoPrecoVenda: (prodXml.valorUnitario * multiplier).toFixed(2),
            };
        });
        setProdutosMatch(matches);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            if (files[0].type !== 'text/xml' && !files[0].name.endsWith('.xml')) {
                alert('Por favor, envie um arquivo XML.');
                return;
            }
            handleFile(files[0]);
        }
    };

    const handleMatchChange = (index, field, value) => {
        const newMatches = [...produtosMatch];
        newMatches[index][field] = value;
        setProdutosMatch(newMatches);
    };

    const handleMarkupChange = (novoMarkup) => {
        setMarkup(novoMarkup);
        const multiplier = 1 + (Number(novoMarkup) / 100);

        const newMatches = produtosMatch.map(match => {
            if (match.acao === 'novo') {
                return {
                    ...match,
                    novoPrecoVenda: (match.xml.valorUnitario * multiplier).toFixed(2)
                };
            }
            return match;
        });
        setProdutosMatch(newMatches);
    };

    const processarImportacao = async () => {
        setLoading(true);
        try {
            // 1. Cadastrar/Atualizar Fornecedor
            let fornecedorId = null;
            if (xmlData.fornecedor) {
                const fornecedores = await storage.getAll('fornecedores', empresa.id);
                const cnpjLimpo = xmlData.fornecedor.cnpj.replace(/\D/g, '');
                let fornecedorExistente = fornecedores.find(f => f.cnpj?.replace(/\D/g, '') === cnpjLimpo);

                if (fornecedorExistente) {
                    fornecedorId = fornecedorExistente.id;
                } else {
                    const novoFornecedor = await storage.create('fornecedores', {
                        nome: xmlData.fornecedor.nome,
                        nomeFantasia: xmlData.fornecedor.nomeFantasia || xmlData.fornecedor.nome,
                        cnpj: xmlData.fornecedor.cnpj,
                        email: '',
                        telefone: '',
                        endereco: xmlData.fornecedor.endereco,
                        tipo: 'fornecedor',
                        ativo: true
                    }, empresa.id);
                    fornecedorId = novoFornecedor.id;
                }
            }

            // 2. Processar Produtos
            for (const item of produtosMatch) {
                if (item.acao === 'ignorar') continue;

                if (item.acao === 'novo') {
                    await storage.create('produtos', {
                        nome: item.novoNome,
                        descricao: item.xml.nome,
                        tipo: 'produto',
                        unidade: item.xml.unidade,
                        precoCusto: item.xml.valorUnitario,
                        precoVenda: parseFloat(item.novoPrecoVenda),
                        quantidade: item.xml.quantidade,
                        estoqueMinimo: 0,
                        codigoBarras: item.xml.ean !== 'SEM GTIN' ? item.xml.ean : '',
                        fornecedorId,
                        ativo: true
                    }, empresa.id);
                } else if (item.acao === 'atualizar' && item.sistema) {
                    const produtoAtual = item.sistema;
                    const estoqueAtual = Number(produtoAtual.quantidade) || 0;
                    const novoEstoque = estoqueAtual + item.xml.quantidade;

                    const custoTotalAntigo = estoqueAtual * (produtoAtual.precoCusto || 0);
                    const custoTotalEntrada = item.xml.valorTotal;
                    const novoPrecoCusto = (custoTotalAntigo + custoTotalEntrada) / novoEstoque;

                    await storage.update('produtos', produtoAtual.id, {
                        quantidade: novoEstoque,
                        precoCusto: novoPrecoCusto
                    });

                    await storage.create('movimentacoes_estoque', {
                        produtoId: produtoAtual.id,
                        tipo: 'entrada',
                        quantidade: item.xml.quantidade,
                        motivo: `Importação XML NFe ${xmlData.numero}`,
                        estoqueAnterior: estoqueAtual,
                        estoqueAtual: novoEstoque,
                        valorCusto: item.xml.valorTotal,
                        novoPrecoCusto: novoPrecoCusto,
                    }, empresa.id);
                }
            }

            // 3. Gerar Financeiro
            if (xmlData.parcelas && xmlData.parcelas.length > 0) {
                for (const parc of xmlData.parcelas) {
                    await storage.create('lancamentos_financeiros', {
                        tipo: 'despesa',
                        descricao: `NFe ${xmlData.numero} - Parc ${parc.numero} - ${xmlData.fornecedor.nome}`,
                        valor: parc.valor,
                        categoria: 'fornecedor',
                        data: parc.vencimento,
                        status: 'pendente',
                        fornecedorId,
                    }, empresa.id);
                }
            } else {
                await storage.create('lancamentos_financeiros', {
                    tipo: 'despesa',
                    descricao: `NFe ${xmlData.numero} - IMPORTADO - ${xmlData.fornecedor.nome}`,
                    valor: xmlData.valorTotal,
                    categoria: 'fornecedor',
                    data: toISODate(new Date()),
                    status: 'pendente',
                    fornecedorId,
                }, empresa.id);
            }

            showSaveToast('Importação concluída com sucesso!');
            navigate('/estoque');

        } catch (error) {
            console.error('Erro na importação:', error);
            alert('Erro ao processar dados.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 lg:p-6 space-y-6 animate-slideUp">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-text-light dark:text-text-dark">
                        Importar XML (NFe)
                    </h1>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        Importe notas fiscais eletrônicas para atualizar estoque e financeiro
                    </p>
                </div>
                {!isTabMode && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate('/estoque')}
                            className="btn-secondary"
                        >
                            Voltar
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="card p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <span className="material-symbols-outlined text-4xl animate-spin text-primary mb-4">progress_activity</span>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium">Processando XML...</p>
                    </div>
                ) : (
                    <>
                        {step === 1 && (
                            <div className="max-w-2xl mx-auto py-10">
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`
                                        border-3 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer bg-gray-50 dark:bg-gray-800/30
                                        ${dragging ? 'border-primary bg-primary/5 scale-102' : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-gray-100 dark:hover:bg-gray-800'}
                                    `}
                                >
                                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                                        <span className="material-symbols-outlined text-4xl">upload_file</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
                                        Arraste o XML da Nota Fiscal
                                    </h3>
                                    <p className="text-text-secondary-light dark:text-text-secondary-dark mb-8">
                                        ou clique para selecionar do seu computador
                                    </p>
                                    <input
                                        type="file"
                                        accept=".xml"
                                        className="hidden"
                                        id="xmlUpload"
                                        onChange={(e) => e.target.files.length > 0 && handleFile(e.target.files[0])}
                                    />
                                    <label
                                        htmlFor="xmlUpload"
                                        className="btn-primary py-3 px-8 text-base shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all inline-flex cursor-pointer"
                                    >
                                        Selecionar Arquivo
                                    </label>
                                </div>
                            </div>
                        )}

                        {step === 2 && xmlData && (
                            <div className="space-y-8 animate-fadeIn">
                                {/* Resumo da Nota */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="card bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-100 dark:border-gray-700">
                                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider mb-1">Fornecedor</p>
                                        <p className="font-bold text-text-light dark:text-text-dark truncate">{xmlData.fornecedor.nome}</p>
                                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{xmlData.fornecedor.cnpj}</p>
                                    </div>
                                    <div className="card bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-100 dark:border-gray-700">
                                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider mb-1">Nota Fiscal</p>
                                        <p className="font-bold text-text-light dark:text-text-dark">NÂº {xmlData.numero}</p>
                                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{formatDate(new Date())}</p>
                                    </div>
                                    <div className="card bg-green-50 dark:bg-green-900/20 p-4 border border-green-100 dark:border-green-800/30">
                                        <p className="text-xs text-green-700 dark:text-green-300 uppercase tracking-wider mb-1">Valor Total</p>
                                        <p className="font-bold text-2xl text-green-700 dark:text-green-400">{formatCurrency(xmlData.valorTotal)}</p>
                                    </div>
                                </div>

                                {/* Correspondência de Produtos */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Produtos Identificados</h3>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800">
                                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Markup (%):</span>
                                                <input
                                                    type="number"
                                                    value={markup}
                                                    onChange={(e) => handleMarkupChange(e.target.value)}
                                                    className="w-16 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded px-2 py-0.5 text-sm text-center font-bold text-blue-800 dark:text-blue-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                                    min="0"
                                                />
                                            </div>
                                            <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                                                {produtosMatch.length} itens encontrados
                                            </span>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto border rounded-xl border-gray-200 dark:border-gray-700 shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs uppercase font-bold text-text-secondary-light dark:text-text-secondary-dark">
                                                <tr>
                                                    <th className="p-4">Produto (XML)</th>
                                                    <th className="p-4 w-56">Ação a Tomar</th>
                                                    <th className="p-4">Correspondência (Sistema)</th>
                                                    <th className="p-4 text-right">Qtd</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900/50">
                                                {produtosMatch.map((match, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                        <td className="p-4">
                                                            <p className="font-medium text-text-light dark:text-text-dark text-base">{match.xml.nome}</p>
                                                            <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                                                <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Ref: {match.xml.codigoFornecedor}</span>
                                                                <span>Unit: {formatCurrency(match.xml.valorUnitario)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <select
                                                                className={`input py-2 px-3 text-sm font-medium border-2 
                                                                    ${match.acao === 'novo' ? 'border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' :
                                                                        match.acao === 'atualizar' ? 'border-green-200 text-green-700 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' :
                                                                            'border-gray-200 text-gray-500 bg-gray-100 dark:bg-gray-800 dark:border-gray-700'}
                                                                `}
                                                                value={match.acao}
                                                                onChange={(e) => handleMatchChange(idx, 'acao', e.target.value)}
                                                            >
                                                                <option value="novo">Cadastrar Novo Produto</option>
                                                                <option value="atualizar">Atualizar Estoque</option>
                                                                <option value="ignorar">Ignorar Item</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-4">
                                                            {match.acao === 'novo' ? (
                                                                <div>
                                                                    <input
                                                                        type="text"
                                                                        className="input py-2 px-3 w-full"
                                                                        value={match.novoNome}
                                                                        onChange={(e) => handleMatchChange(idx, 'novoNome', e.target.value)}
                                                                        placeholder="Nome do produto a criar"
                                                                    />
                                                                    <div className="mt-2 flex items-center gap-2">
                                                                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Preço Venda:</span>
                                                                        <input
                                                                            type="number"
                                                                            className="input py-1 px-2 w-24 text-sm"
                                                                            value={match.novoPrecoVenda}
                                                                            onChange={(e) => handleMatchChange(idx, 'novoPrecoVenda', e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : match.acao === 'atualizar' ? (
                                                                <select
                                                                    className="input py-2 px-3 w-full"
                                                                    value={match.sistema?.id || ''}
                                                                    onChange={(e) => {
                                                                        const prod = produtosSistema.find(p => p.id === e.target.value);
                                                                        handleMatchChange(idx, 'sistema', prod);
                                                                    }}
                                                                >
                                                                    <option value="">Selecione o produto...</option>
                                                                    {produtosSistema.map(p => (
                                                                        <option key={p.id} value={p.id}>{p.nome}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <span className="text-gray-400 italic flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-lg">block</span>
                                                                    Item será ignorado
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="font-bold text-lg text-text-light dark:text-text-dark">
                                                                {match.xml.quantidade}
                                                            </div>
                                                            <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase">
                                                                {match.xml.unidade}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Alerta de Financeiro */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-6 rounded-xl flex gap-4 text-blue-900 dark:text-blue-100">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-2xl">payments</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">Lançamento Financeiro Automático</h4>
                                        <p className="text-blue-700 dark:text-blue-300 leading-relaxed">
                                            Serão gerados automaticamente <strong>{xmlData.parcelas.length || 1} lançamentos de contas a pagar</strong> no valor total de <strong>{formatCurrency(xmlData.valorTotal)}</strong> vinculados ao fornecedor <strong>{xmlData.fornecedor.nome}</strong>.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-6 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                                    <button
                                        onClick={processarImportacao}
                                        className="btn-primary btn-lg flex items-center gap-3 px-8"
                                        disabled={loading}
                                    >
                                        <span className="material-symbols-outlined">check_circle</span>
                                        {loading ? 'Processando...' : 'Confirmar e Importar Produtos'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ImportarNota;

