import { useState, useRef } from 'react';
import storage from '../../lib/storage';
import { useAuth } from '../../contexts/AuthContext';

const ImportarClientesModal = ({ onClose, onSuccess }) => {
    const { empresa } = useAuth();
    const fileInputRef = useRef(null);
    const [arquivo, setArquivo] = useState(null);
    const [preview, setPreview] = useState([]);
    const [erro, setErro] = useState('');
    const [processando, setProcessando] = useState(false);
    const [progresso, setProgresso] = useState({ total: 0, atual: 0, erros: 0, duplicados: 0 });

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setErro('Por favor, selecione um arquivo CSV válido.');
            return;
        }

        setArquivo(file);
        setErro('');
        lerArquivo(file);
    };

    const lerConteudoArquivo = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const texto = e.target.result;
                // Verificar se há caractere de substituição (indicativo de encoding errado)
                if (texto.includes('\uFFFD')) {
                    // Tentar ler novamente como ISO-8859-1 (ANSI/Windows-1252)
                    const readerIso = new FileReader();
                    readerIso.onload = (evt) => resolve(evt.target.result);
                    readerIso.onerror = (err) => reject(err);
                    readerIso.readAsText(file, 'ISO-8859-1');
                } else {
                    resolve(texto);
                }
            };

            reader.onerror = (err) => reject(err);
            reader.readAsText(file); // Default UTF-8
        });
    };

    const lerArquivo = async (file) => {
        try {
            const texto = await lerConteudoArquivo(file);
            const linhas = texto.split('\n').map(l => l.trim()).filter(l => l);

            if (linhas.length < 2) {
                setErro('O arquivo parece estar vazio ou sem dados.');
                return;
            }

            // Parse simples do CSV
            const cabecalho = linhas[0].toLowerCase().split(/[;,]/).map(c => c.trim().replace(/"/g, ''));
            const dadosPreview = [];

            // Preview
            for (let i = 1; i < Math.min(linhas.length, 6); i++) {
                const valores = linhas[i].split(/[;,]/).map(v => v.trim().replace(/"/g, ''));
                const obj = {};
                cabecalho.forEach((col, idx) => {
                    obj[col] = valores[idx] || '';
                });
                dadosPreview.push(obj);
            }

            setPreview(dadosPreview);
        } catch (error) {
            console.error('Erro ao ler arquivo:', error);
            setErro('Erro ao ler o arquivo. Verifique se é um CSV válido.');
        }
    };

    const baixarModelo = () => {
        const cabecalho = 'nome;tipo;documento;telefone;whatsapp;email;cep;logradouro;numero;complemento;bairro;cidade;estado;observacoes;tags';
        const exemplo = 'João Silva;pf;123.456.789-00;(11) 99999-9999;(11) 99999-9999;joao@email.com;01001-000;Praça da Sé;10;;Sé;São Paulo;SP;Cliente VIP;vip,recorrente';
        const conteudo = `${cabecalho}\n${exemplo}`;

        const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'modelo_importacao_clientes.csv';
        link.click();
    };

    const processarImportacao = async () => {
        if (!arquivo || !empresa) return;

        setProcessando(true);

        try {
            // Buscar clientes existentes para validar duplicidade
            const clientesExistentes = await storage.getAll('clientes', empresa.id);
            const documentosExistentes = new Set(
                clientesExistentes
                    .map(c => c.documento?.replace(/\D/g, ''))
                    .filter(d => d) // Remove vazios
            );

            const texto = await lerConteudoArquivo(arquivo);
            const linhas = texto.split('\n').map(l => l.trim()).filter(l => l);
            const cabecalho = linhas[0].toLowerCase().split(/[;,]/).map(c => c.trim().replace(/"/g, ''));

            const total = linhas.length - 1;
            setProgresso({ total, atual: 0, erros: 0, duplicados: 0 });

            let importados = 0;
            let falhas = 0;
            let duplicados = 0;

            for (let i = 1; i < linhas.length; i++) {
                try {
                    const valores = linhas[i].split(/[;,]/).map(v => v.trim().replace(/"/g, ''));
                    const obj = {};
                    cabecalho.forEach((col, idx) => {
                        obj[col] = valores[idx] || '';
                    });

                    // Validar duplicidade de documento
                    const docLimpo = obj.documento?.replace(/\D/g, '');
                    if (docLimpo && documentosExistentes.has(docLimpo)) {
                        duplicados++;
                        setProgresso(prev => ({ ...prev, atual: i, duplicados }));
                        continue;
                    }

                    // Processar tags do CSV
                    let tagsIniciais = ['importado'];
                    if (obj.tags) {
                        const tagsCSV = obj.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
                        if (tagsCSV.length > 0) {
                            tagsIniciais = [...tagsIniciais, ...tagsCSV];
                        }
                    }

                    // Remover duplicados
                    tagsIniciais = [...new Set(tagsIniciais)];

                    const clienteNovo = {
                        nome: obj.nome,
                        tipo: ['pj', 'juridica'].includes(obj.tipo?.toLowerCase()) ? 'pj' : 'pf',
                        documento: obj.documento || '',
                        telefone: obj.telefone,
                        whatsapp: obj.whatsapp || '',
                        email: obj.email || '',
                        endereco: {
                            cep: obj.cep || '',
                            logradouro: obj.logradouro || '',
                            numero: obj.numero || '',
                            complemento: obj.complemento || '',
                            bairro: obj.bairro || '',
                            cidade: obj.cidade || '',
                            estado: obj.estado || '',
                        },
                        observacoes: obj.observacoes || '',
                        tags: tagsIniciais,
                        ativo: true
                    };

                    if (clienteNovo.nome && clienteNovo.telefone) {
                        await storage.create('clientes', clienteNovo, empresa.id);
                        importados++;
                        // Adicionar ao set temporário para evitar duplicidade dentro do próprio arquivo
                        if (docLimpo) documentosExistentes.add(docLimpo);
                    } else {
                        falhas++;
                    }
                } catch (err) {
                    console.error('Erro na linha ' + i, err);
                    falhas++;
                }

                setProgresso(prev => ({ ...prev, atual: i, erros: falhas, duplicados }));
            }

            setProcessando(false);
            onSuccess(importados, falhas, duplicados);
        } catch (error) {
            console.error('Erro grave na importação:', error);
            setErro('Erro ao processar o arquivo.');
            setProcessando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-lg animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">upload_file</span>
                        Importar Clientes
                    </h2>
                    {!processando && (
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>

                {!processando ? (
                    <div className="space-y-4">
                        {/* Área de Upload */}
                        <div
                            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800/50"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileChange}
                            />
                            <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">
                                folder_open
                            </span>
                            <p className="text-sm font-medium text-text-light dark:text-text-dark">
                                {arquivo ? arquivo.name : 'Clique para selecionar o arquivo CSV'}
                            </p>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                ou arraste e solte aqui
                            </p>
                        </div>

                        {erro && (
                            <div className="p-3 rounded-lg bg-error/10 text-error text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">error</span>
                                {erro}
                            </div>
                        )}

                        <div className="flex justify-between items-center text-sm">
                            <button
                                onClick={baixarModelo}
                                className="text-primary hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                Baixar modelo CSV
                            </button>
                            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                Suporta UTF-8 e ANSI (Excel)
                            </span>
                        </div>

                        {/* Preview */}
                        {preview.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-text-light dark:text-text-dark">
                                    Prévia dos dados:
                                </p>
                                <div className="max-h-40 overflow-auto border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-lg">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                                            <tr>
                                                <th className="px-2 py-1 text-left">Nome</th>
                                                <th className="px-2 py-1 text-left">Telefone</th>
                                                <th className="px-2 py-1 text-left">Tags</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-border-light)] dark:divide-[var(--color-border-dark)]">
                                            {preview.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-2 py-1 truncate max-w-[100px]">{row.nome}</td>
                                                    <td className="px-2 py-1 truncate max-w-[80px]">{row.telefone}</td>
                                                    <td className="px-2 py-1 truncate max-w-[80px]">
                                                        {row.tags || <span className="text-gray-400 font-normal">importado</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button onClick={onClose} className="btn-secondary flex-1">
                                Cancelar
                            </button>
                            <button
                                onClick={processarImportacao}
                                disabled={!arquivo}
                                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Importar {preview.length > 0 ? 'Agora' : ''}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="mb-4">
                            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                        <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">
                            Importando clientes...
                        </h3>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">
                            Processando {progresso.atual} de {progresso.total}
                        </p>

                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1 overflow-hidden">
                            <div
                                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${(progresso.atual / progresso.total) * 100}%` }}
                            ></div>
                        </div>
                        {progresso.erros > 0 && (
                            <p className="text-xs text-error mt-2">
                                {progresso.erros} erros encontrados
                            </p>
                        )}
                        {progresso.duplicados > 0 && (
                            <p className="text-xs text-orange-500 mt-1">
                                {progresso.duplicados} duplicados ignorados
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportarClientesModal;
