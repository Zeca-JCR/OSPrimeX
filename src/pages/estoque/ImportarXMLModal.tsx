import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import storage from '../../lib/storage';
import { parseNFe, NFeParsed, ProdutoNFe } from '../../lib/nfeParser';
import { formatCurrency, toISODate } from '../../lib/utils';
import { Produto, Fornecedor, MovimentacaoEstoque, LancamentoFinanceiro } from '../../types';

interface ProdutoMatch {
    xml: ProdutoNFe;
    sistema: Produto | null;
    acao: string;
    novoNome: string;
    novoPrecoVenda: string;
}

interface ImportarXMLModalProps {
    onClose: () => void;
    onSave: () => void;
}

const ImportarXMLModal = ({ onClose, onSave }: ImportarXMLModalProps) => {
    const { empresa } = useAuth();
    const { showSaveToast } = useToast();
    const [step, setStep] = useState(1); // 1: Upload, 2: Revisão, 3: Conclusão
    const [xmlData, setXmlData] = useState<NFeParsed | null>(null);
    const [produtosSistema, setProdutosSistema] = useState<Produto[]>([]);
    const [produtosMatch, setProdutosMatch] = useState<ProdutoMatch[]>([]); // Produtos mapeados
    const [loading, setLoading] = useState(false);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        carregarProdutosSistema();
    }, []);

    const carregarProdutosSistema = async () => {
        if (!empresa?.id) return;
        const prods = await storage.getAll<Produto>('produtos', empresa.id);
        setProdutosSistema(prods.filter(p => p.ativo));
    };

    const handleFile = async (file: File) => {
        setLoading(true);
        try {
            const data = await parseNFe(file);
            setXmlData(data);
            fazerCorrespondencia(data.produtos, produtosSistema);
            setStep(2);
        } catch (error: any) {
            console.error(error);
            alert('Erro ao ler XML: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fazerCorrespondencia = (produtosXML: ProdutoNFe[], produtosSys: Produto[]) => {
        const matches: ProdutoMatch[] = produtosXML.map(prodXml => {
            // Tenta achar por código EAN ou nome similar
            // Normalização básica: remove espaços e lowercase
            const nomeXml = prodXml.nome.toLowerCase().trim();
            const eanXml = prodXml.ean !== 'SEM GTIN' ? prodXml.ean : null;

            let match = null;

            // 1. Match exato de EAN
            if (eanXml) {
                match = produtosSys.find(p => p.codigoBarras === eanXml);
            }

            // 2. Se não achou, tenta match de nome (fraco, mas ajuda)
            if (!match) {
                match = produtosSys.find(p => p.nome.toLowerCase().trim() === nomeXml);
            }

            return {
                xml: prodXml,
                sistema: match || null, // Se null, será criado novo
                acao: match ? 'atualizar' : 'novo', // atualizar, novo, ignorar
                novoNome: prodXml.nome, // Para edição
                novoPrecoVenda: (prodXml.valorUnitario * 1.5).toString(), // Sugestão simples de markup 50%
            };
        });
        setProdutosMatch(matches);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
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

    const handleMatchChange = (index: number, field: keyof ProdutoMatch, value: any) => {
        const newMatches = [...produtosMatch];
        (newMatches[index] as any)[field] = value;
        setProdutosMatch(newMatches);
    };

    const processarImportacao = async () => {
        setLoading(true);
        if (!xmlData || !empresa?.id) return;

        try {
            // 1. Cadastrar/Atualizar Fornecedor
            let fornecedorId = '';
            if (xmlData.fornecedor) {
                const fornecedores = await storage.getAll<Fornecedor>('fornecedores', empresa.id);
                // Busca por CNPJ (remove pontuação)
                const cnpjLimpo = xmlData.fornecedor.cnpj.replace(/\D/g, '');
                let fornecedorExistente = fornecedores.find(f => f.cnpj?.replace(/\D/g, '') === cnpjLimpo);

                if (fornecedorExistente) {
                    fornecedorId = fornecedorExistente.id!;
                } else {
                    const novoFornecedor = await storage.create<Fornecedor>('fornecedores', {
                        nome: xmlData.fornecedor.nome,
                        // nomeFantasia: xmlData.fornecedor.nomeFantasia || xmlData.fornecedor.nome, // Fornecedor Model doesn't have nomeFantasia
                        cnpj: xmlData.fornecedor.cnpj,
                        email: '', // XML nem sempre tem
                        telefone: '',
                        endereco: {
                            cep: xmlData.fornecedor.endereco.cep,
                            logradouro: xmlData.fornecedor.endereco.logradouro,
                            numero: xmlData.fornecedor.endereco.numero,
                            bairro: xmlData.fornecedor.endereco.bairro,
                            cidade: xmlData.fornecedor.endereco.cidade,
                            estado: xmlData.fornecedor.endereco.uf,
                            complemento: ''
                        },
                        tipo: 'pj' as const, // ou 'pj'
                        ativo: true
                    }, empresa.id);
                    fornecedorId = novoFornecedor.id!;
                }
            }

            // 2. Processar Produtos
            for (const item of produtosMatch) {
                if (item.acao === 'ignorar') continue;

                if (item.acao === 'novo') {
                    // Criar Produto
                    await storage.create<Produto>('produtos', {
                        nome: item.novoNome,
                        descricao: item.xml.nome, // Descrição original
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
                    // Atualizar Estoque e Custo Médio
                    const produtoAtual = item.sistema;
                    const estoqueAtual = Number(produtoAtual.quantidade) || 0;
                    const novoEstoque = estoqueAtual + item.xml.quantidade;

                    // Cálculo Custo Médio
                    const custoTotalAntigo = estoqueAtual * (produtoAtual.precoCusto || 0);
                    const custoTotalEntrada = item.xml.valorTotal;
                    const novoPrecoCusto = (custoTotalAntigo + custoTotalEntrada) / novoEstoque;

                    await storage.update<Produto>('produtos', produtoAtual.id!, {
                        quantidade: novoEstoque,
                        precoCusto: novoPrecoCusto
                    });

                    // Registrar movimentação
                    await storage.create<MovimentacaoEstoque>('movimentacoes_estoque', {
                        produtoId: produtoAtual.id!,
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

            // 3. Gerar Financeiro (Contas a Pagar)
            if (xmlData.parcelas && xmlData.parcelas.length > 0) {
                for (const parc of xmlData.parcelas) {
                    await storage.create<LancamentoFinanceiro>('lancamentos_financeiros', {
                        tipo: 'despesa',
                        descricao: `NFe ${xmlData.numero} - Parc ${parc.numero} - ${xmlData.fornecedor.nome}`,
                        valor: parc.valor,
                        categoria: 'fornecedor',
                        dataVencimento: parc.vencimento, // Data de vencimento
                        status: 'pendente', // A pagar
                        fornecedorId,
                    }, empresa.id);
                }
            } else {
                // Cria uma única á vista se não tiver parcelas
                await storage.create<LancamentoFinanceiro>('lancamentos_financeiros', {
                    tipo: 'despesa',
                    descricao: `NFe ${xmlData.numero} - IMPORTADO - ${xmlData.fornecedor.nome}`,
                    valor: xmlData.valorTotal,
                    categoria: 'fornecedor',
                    dataVencimento: toISODate(new Date()), // Hoje
                    status: 'pendente',
                    fornecedorId,
                }, empresa.id);
            }

            showSaveToast('Importação concluída com sucesso!');
            onSave(); // Recarrega tela pai
            onClose();

        } catch (error: any) {
            console.error('Erro na importação:', error);
            alert('Erro ao processar dados.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className={`card w-full max-h-[90vh] flex flex-col animate-slideUp ${step === 2 ? 'max-w-4xl' : 'max-w-md'}`}>

                {/* Header */}
                <div className="p-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between">
                    <h2 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">description</span>
                        Importar XML (NFe)
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <span className="material-symbols-outlined text-4xl animate-spin text-primary mb-4">progress_activity</span>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium">Processando...</p>
                        </div>
                    ) : (
                        <>
                            {step === 1 && (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`
                                        border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
                                        ${dragging ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600 hover:border-primary'}
                                    `}
                                >
                                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                                        <span className="material-symbols-outlined text-3xl">upload_file</span>
                                    </div>
                                    <p className="text-lg font-medium text-text-light dark:text-text-dark mb-1">
                                        Arraste o XML aqui
                                    </p>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
                                        ou clique para selecionar do computador
                                    </p>
                                    <input
                                        type="file"
                                        accept=".xml"
                                        className="hidden"
                                        id="xmlUpload"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                handleFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor="xmlUpload"
                                        className="btn-primary py-2 px-6 inline-flex cursor-pointer"
                                    >
                                        Selecionar Arquivo
                                    </label>
                                </div>
                            )}

                            {step === 2 && xmlData && (
                                <div className="space-y-6">
                                    {/* Resumo da Nota */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl flex justify-between items-center text-sm">
                                        <div>
                                            <p className="font-bold text-text-light dark:text-text-dark">{xmlData.fornecedor.nome}</p>
                                            <p className="text-text-secondary-light dark:text-text-secondary-dark">CNPJ: {xmlData.fornecedor.cnpj}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-text-secondary-light dark:text-text-secondary-dark">Nota NÂº {xmlData.numero}</p>
                                            <p className="font-bold text-lg text-primary">{formatCurrency(xmlData.valorTotal)}</p>
                                        </div>
                                    </div>

                                    {/* Mapeamento de Produtos */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Correspondência de Produtos</h3>
                                        <div className="overflow-x-auto border rounded-lg border-gray-200 dark:border-gray-700">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase font-semibold">
                                                    <tr>
                                                        <th className="p-3">Produto no XML</th>
                                                        <th className="p-3 w-48">Ação</th>
                                                        <th className="p-3">Correspondência no Sistema</th>
                                                        <th className="p-3 text-right">Qtd</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {produtosMatch.map((match, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                                            <td className="p-3">
                                                                <p className="font-medium text-text-light dark:text-text-dark">{match.xml.nome}</p>
                                                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                                                    Cod: {match.xml.codigoFornecedor} | {formatCurrency(match.xml.valorUnitario)}
                                                                </p>
                                                            </td>
                                                            <td className="p-3">
                                                                <select
                                                                    className="input py-1 px-2 text-xs"
                                                                    value={match.acao}
                                                                    onChange={(e) => handleMatchChange(idx, 'acao', e.target.value)}
                                                                >
                                                                    <option value="novo">Cadastrar Novo</option>
                                                                    <option value="atualizar">Atualizar Estoque</option>
                                                                    <option value="ignorar">Ignorar Item</option>
                                                                </select>
                                                            </td>
                                                            <td className="p-3">
                                                                {match.acao === 'novo' ? (
                                                                    <input
                                                                        type="text"
                                                                        className="input py-1 px-2"
                                                                        value={match.novoNome}
                                                                        onChange={(e) => handleMatchChange(idx, 'novoNome', e.target.value)}
                                                                        placeholder="Nome do produto a criar"
                                                                    />
                                                                ) : match.acao === 'atualizar' ? (
                                                                    <select
                                                                        className="input py-1 px-2"
                                                                        value={match.sistema?.id || ''}
                                                                        onChange={(e) => {
                                                                            const prod = produtosSistema.find(p => p.id === e.target.value);
                                                                            handleMatchChange(idx, 'sistema', prod);
                                                                        }}
                                                                    >
                                                                        <option value="">Selecione...</option>
                                                                        {produtosSistema.map(p => (
                                                                            <option key={p.id} value={p.id}>{p.nome}</option>
                                                                        ))}
                                                                    </select>
                                                                ) : (
                                                                    <span className="text-gray-400 italic">Item ignorado</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-right font-medium">
                                                                {match.xml.quantidade} {match.xml.unidade}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Alerta de Financeiro */}
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 text-sm text-blue-700 dark:text-blue-300">
                                        <span className="material-symbols-outlined">payments</span>
                                        <div>
                                            <p className="font-bold">Finanças</p>
                                            <p>Serão gerados <strong>{xmlData.parcelas.length || 1}</strong> lançamentos de conta a pagar no valor total de <strong>{formatCurrency(xmlData.valorTotal)}</strong>.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex justify-end gap-3">
                    <button onClick={onClose} className="btn-ghost">Cancelar</button>
                    {step === 2 && (
                        <button onClick={processarImportacao} className="btn-primary" disabled={loading}>
                            {loading ? 'Processando...' : 'Confirmar Importação'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportarXMLModal;

