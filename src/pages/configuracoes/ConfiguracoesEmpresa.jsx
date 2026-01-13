import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import storage from '../../lib/storage';

const ConfiguracoesEmpresa = ({ isTabMode, onClose, onDirtyChange }) => {
    const { empresa, refreshEmpresa } = useAuth();
    const { registerSaveHandler, unregisterSaveHandler } = useTabs();
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

    const [form, setForm] = useState({
        nomeFantasia: '',
        razaoSocial: '',
        cnpj: '',
        telefone: '',
        whatsapp: '',
        email: '',
        site: '',
        endereco: {
            logradouro: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            estado: '',
            cep: '',
        },
        // Configurações de OS
        prefixoOS: 'OS',
        proximaOS: 1,
        preferenciaOS: 'kanban', // 'kanban' ou 'lista'
        mensagemPadrao: '',
        metaMensalOS: 30, // Meta mensal de OS finalizadas
        diasValidadeOrcamento: 10, // Dias de validade padrão para orçamento
        diasInatividade: 90, // CRM: Dias para considerar inativo
        imprimirApontamentos: true, // Configuração de impressão
        // Configurações de impressão
        logoUrl: '',
        corPrimaria: '#137fec',
        // Configurações de pagamento
        chavePix: '',
        banco: '',
        // Templates de mensagem WhatsApp
        templateLembreteRevisao: 'Olá {nome}! Notamos que seu veículo {veiculo} está precisando de revisão. Agende já seu horário! \ud83d\ude97\u2728',
        templateFollowUp: 'Olá {nome}! Faz um tempo que não nos vemos. Tudo bem com seu {veiculo}? Estamos à disposição!',
        templateAgradecimento: 'Olá {nome}! Obrigado pela preferência! Esperamos que o serviço no seu {veiculo} tenha ficado excelente. Conte sempre conosco! \u2b50',
        markupPadrao: 50, // Default 50%
        // Agenda
        agendaDiasAntecedencia: 1,
        agendaMensagemConfirmacao: 'Olá {nome}, confirmamos seu agendamento do veículo {veiculo} para {data} às {hora}? 🚗',
        // Configurações de Preço
        descontoNosItens: true,
        acrescimoNosItens: false,
        descontoNoTotal: true,
        acrescimoNoTotal: false,
        // Configurações de Prismas
        usarPrismas: false,
        prismaCor: 'Vermelho',
        prismaQuantidade: 20,
    });

    useEffect(() => {
        if (empresa) {
            setForm({
                nomeFantasia: empresa.nomeFantasia || '',
                razaoSocial: empresa.razaoSocial || '',
                cnpj: empresa.cnpj || '',
                telefone: empresa.telefone || '',
                whatsapp: empresa.whatsapp || '',
                email: empresa.email || '',
                site: empresa.site || '',
                endereco: {
                    logradouro: empresa.endereco?.logradouro || '',
                    numero: empresa.endereco?.numero || '',
                    complemento: empresa.endereco?.complemento || '',
                    bairro: empresa.endereco?.bairro || '',
                    cidade: empresa.endereco?.cidade || '',
                    estado: empresa.endereco?.estado || '',
                    cep: empresa.endereco?.cep || '',
                },
                prefixoOS: empresa.prefixoOS || 'OS',
                proximaOS: empresa.proximaOS || 1,
                preferenciaOS: empresa.preferenciaOS || 'kanban',
                mensagemPadrao: empresa.mensagemPadrao || '',
                metaMensalOS: empresa.metaMensalOS || 30,
                perfil: empresa.perfil || 'adm',
                diasValidadeOrcamento: empresa.diasValidadeOrcamento || 10,
                diasInatividade: empresa.diasInatividade || 90,
                imprimirApontamentos: empresa.imprimirApontamentos ?? true,
                logoUrl: empresa.logoUrl || '',
                corPrimaria: empresa.corPrimaria || '#137fec',
                chavePix: empresa.chavePix || '',
                banco: empresa.banco || '',
                templateLembreteRevisao: empresa.templateLembreteRevisao || 'Olá {nome}! Notamos que seu veículo {veiculo} está precisando de revisão. Agende já seu horário! \ud83d\ude97\u2728',
                templateFollowUp: empresa.templateFollowUp || 'Olá {nome}! Faz um tempo que não nos vemos. Tudo bem com seu {veiculo}? Estamos à disposição!',
                templateAgradecimento: empresa.templateAgradecimento || 'Olá {nome}! Obrigado pela preferência! Esperamos que o serviço no seu {veiculo} tenha ficado excelente. Conte sempre conosco! \u2b50',
                markupPadrao: empresa.markupPadrao || 50,
                agendaDiasAntecedencia: empresa.agendaDiasAntecedencia || 1,
                agendaMensagemConfirmacao: empresa.agendaMensagemConfirmacao || 'Olá {nome}, confirmamos seu agendamento do veículo {veiculo} para {data} às {hora}? 🚗',
                // Pricing
                descontoNosItens: empresa.descontoNosItens ?? true,
                acrescimoNosItens: empresa.acrescimoNosItens ?? false,
                descontoNoTotal: empresa.descontoNoTotal ?? true,
                acrescimoNoTotal: empresa.acrescimoNoTotal ?? false,
                // Prismas
                usarPrismas: empresa.usarPrismas ?? false,
                prismaCor: empresa.prismaCor || 'Vermelho',
                prismaQuantidade: empresa.prismaQuantidade || 20,
            });
            setLoading(false);
        }
    }, [empresa]);

    // Estado isDirty para rastrear alterações
    const [isDirty, setIsDirty] = useState(false);
    const initialFormRef = useRef(null);

    // Ref para callback que pode mudar - evita loops infinitos
    const onDirtyChangeRef = useRef(onDirtyChange);

    // Manter ref atualizada
    useEffect(() => {
        onDirtyChangeRef.current = onDirtyChange;
    });

    // Salvar forma inicial para comparação
    useEffect(() => {
        if (!loading && !initialFormRef.current) {
            initialFormRef.current = JSON.stringify(form);
        }
    }, [loading, form]);

    // Comunicar dirty state para aba
    useEffect(() => {
        if (isTabMode) {
            onDirtyChangeRef.current?.(isDirty);
        }
    }, [isDirty, isTabMode]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith('endereco.')) {
            const field = name.replace('endereco.', '');
            setForm(prev => ({
                ...prev,
                endereco: { ...prev.endereco, [field]: value }
            }));
        } else {
            setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
        // Marcar como alterado
        if (!isDirty) setIsDirty(true);
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                alert('A imagem deve ter no máximo 5MB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setForm(prev => ({ ...prev, logoUrl: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoverLogo = () => {
        setForm(prev => ({ ...prev, logoUrl: '' }));
    };

    // Função de salvar (pode ser chamada pelo TabBar para "Salvar e sair")
    const saveConfiguracoes = useCallback(async () => {
        setSalvando(true);
        setMensagem({ tipo: '', texto: '' });

        try {
            await storage.update('empresas', empresa.id, form);

            // Atualizar contexto
            if (refreshEmpresa) {
                await refreshEmpresa();
            }

            setMensagem({ tipo: 'sucesso', texto: 'Configurações salvas com sucesso!' });
            setIsDirty(false);
            return true;
        } catch (error) {
            console.error('Erro ao salvar:', error);
            setMensagem({ tipo: 'erro', texto: 'Erro ao salvar configurações.' });
            throw error;
        } finally {
            setSalvando(false);
        }
    }, [empresa?.id, form, refreshEmpresa]);

    // Registrar função de salvar no TabsContext (para "Salvar e sair")
    useEffect(() => {
        if (isTabMode) {
            registerSaveHandler?.('configuracoes', saveConfiguracoes);
            return () => unregisterSaveHandler?.('configuracoes');
        }
    }, [isTabMode, saveConfiguracoes, registerSaveHandler, unregisterSaveHandler]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await saveConfiguracoes();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-pulse-soft text-primary">
                    <span className="material-symbols-outlined text-5xl">sync</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-lg font-bold text-text-light dark:text-text-dark">
                    Configurações da Empresa
                </h1>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    Gerencie os dados e preferências da sua empresa
                </p>
            </div>

            {/* Mensagem de feedback */}
            {mensagem.texto && (
                <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${mensagem.tipo === 'sucesso'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}>
                    <span className="material-symbols-outlined">
                        {mensagem.tipo === 'sucesso' ? 'check_circle' : 'error'}
                    </span>
                    {mensagem.texto}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados básicos */}
                <div className="card p-4 lg:p-6">

                    <h2 className="text-sm font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">business</span>
                        Dados da Empresa
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Nome Fantasia *
                            </label>
                            <input
                                type="text"
                                name="nomeFantasia"
                                value={form.nomeFantasia}
                                onChange={handleChange}
                                className="input w-full"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Razão Social
                            </label>
                            <input
                                type="text"
                                name="razaoSocial"
                                value={form.razaoSocial}
                                onChange={handleChange}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                CNPJ
                            </label>
                            <input
                                type="text"
                                name="cnpj"
                                value={form.cnpj}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="00.000.000/0000-00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Telefone
                            </label>
                            <input
                                type="text"
                                name="telefone"
                                value={form.telefone}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="(00) 0000-0000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                WhatsApp
                            </label>
                            <input
                                type="text"
                                name="whatsapp"
                                value={form.whatsapp}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Site
                            </label>
                            <input
                                type="url"
                                name="site"
                                value={form.site}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>

                {/* Endereço */}
                <div className="card p-4 lg:p-6">
                    <h2 className="text-sm font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">location_on</span>
                        Endereço
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Logradouro
                            </label>
                            <input
                                type="text"
                                name="endereco.logradouro"
                                value={form.endereco.logradouro}
                                onChange={handleChange}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Número
                            </label>
                            <input
                                type="text"
                                name="endereco.numero"
                                value={form.endereco.numero}
                                onChange={handleChange}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Complemento
                            </label>
                            <input
                                type="text"
                                name="endereco.complemento"
                                value={form.endereco.complemento}
                                onChange={handleChange}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Bairro
                            </label>
                            <input
                                type="text"
                                name="endereco.bairro"
                                value={form.endereco.bairro}
                                onChange={handleChange}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                CEP
                            </label>
                            <input
                                type="text"
                                name="endereco.cep"
                                value={form.endereco.cep}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="00000-000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Cidade
                            </label>
                            <input
                                type="text"
                                name="endereco.cidade"
                                value={form.endereco.cidade}
                                onChange={handleChange}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Estado
                            </label>
                            <select
                                name="endereco.estado"
                                value={form.endereco.estado}
                                onChange={handleChange}
                                className="input w-full"
                            >
                                <option value="">Selecione</option>
                                {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                    <option key={uf} value={uf}>{uf}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Configurações de Orçamento/Preço */}
                <div className="md:col-span-2 card p-6">
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">price_change</span>
                        Configurações de Orçamento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="font-medium text-text-light dark:text-text-dark">Itens e Serviços</h4>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.descontoNosItens}
                                    onChange={(e) => setForm({ ...form, descontoNosItens: e.target.checked })}
                                    className="toggle toggle-primary"
                                />
                                <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                    Permitir <strong>Descontos</strong> nos itens
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.acrescimoNosItens}
                                    onChange={(e) => setForm({ ...form, acrescimoNosItens: e.target.checked })}
                                    className="toggle toggle-primary"
                                />
                                <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                    Permitir <strong>Acréscimos</strong> nos itens
                                </span>
                            </label>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-medium text-text-light dark:text-text-dark">Total da OS</h4>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.descontoNoTotal}
                                    onChange={(e) => setForm({ ...form, descontoNoTotal: e.target.checked })}
                                    className="toggle toggle-primary"
                                />
                                <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                    Permitir <strong>Desconto Global</strong> no total
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.acrescimoNoTotal}
                                    onChange={(e) => setForm({ ...form, acrescimoNoTotal: e.target.checked })}
                                    className="toggle toggle-primary"
                                />
                                <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                    Permitir <strong>Acréscimo Global</strong> no total
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Configurações de OS */}
                <div className="card p-4 lg:p-6">
                    <h2 className="text-sm font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">assignment</span>
                        Configurações de OS e Estoque
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Markup Padrão (%)
                            </label>
                            <input
                                type="number"
                                name="markupPadrao"
                                value={form.markupPadrao}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="50"
                                min="0"
                            />
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                Margem de lucro sugerida na importação de notas (Ex: 50%)
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Prefixo da OS
                            </label>
                            <input
                                type="text"
                                name="prefixoOS"
                                value={form.prefixoOS}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="OS"
                            />
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                Ex: OS0001, AT0001
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Número da próxima OS
                            </label>
                            <input
                                type="number"
                                name="proximaOS"
                                value={form.proximaOS}
                                onChange={handleChange}
                                className="input w-full"
                                min="1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Visualização padrão das OS
                            </label>
                            <select
                                name="preferenciaOS"
                                value={form.preferenciaOS}
                                onChange={handleChange}
                                className="input w-full"
                            >
                                <option value="kanban">Kanban (colunas)</option>
                                <option value="lista">Lista (tabela)</option>
                            </select>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                Como as OS serão exibidas ao entrar na tela
                            </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 md:col-span-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <input
                                type="checkbox"
                                id="imprimirApontamentos"
                                name="imprimirApontamentos"
                                checked={form.imprimirApontamentos}
                                onChange={handleChange}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="imprimirApontamentos" className="text-sm font-medium text-text-light dark:text-text-dark select-none cursor-pointer">
                                Imprimir Apontamento de Horas na OS
                            </label>
                            <span className="material-symbols-outlined text-gray-400 text-sm" title="Se marcado, uma tabela com os apontamentos de horas será impressa no PDF da OS.">help</span>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Mensagem padrão (rodapé do PDF)
                            </label>
                            <textarea
                                name="mensagemPadrao"
                                value={form.mensagemPadrao}
                                onChange={handleChange}
                                className="input w-full"
                                rows={3}
                                placeholder="Ex: Garantia de 90 dias para serviços executados."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                <span className="material-symbols-outlined text-sm align-middle mr-1 text-primary">flag</span>
                                Meta mensal de OS
                            </label>
                            <input
                                type="number"
                                name="metaMensalOS"
                                value={form.metaMensalOS}
                                onChange={handleChange}
                                className="input w-full"
                                min="1"
                                max="999"
                            />
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                Quantidade de OS finalizadas por mês para atingir a meta
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                <span className="material-symbols-outlined text-sm align-middle mr-1 text-primary">timelapse</span>
                                Dias de Inatividade (CRM)
                            </label>
                            <input
                                type="number"
                                name="diasInatividade"
                                value={form.diasInatividade}
                                onChange={handleChange}
                                className="input w-full"
                                min="30"
                                max="365"
                            />
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                Dias sem serviços para considerar cliente inativo (Padrão: 90)
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                <span className="material-symbols-outlined text-sm align-middle mr-1 text-primary">event_busy</span>
                                Validade do Orçamento (Dias)
                            </label>
                            <input
                                type="number"
                                name="diasValidadeOrcamento"
                                value={form.diasValidadeOrcamento}
                                onChange={handleChange}
                                className="input w-full"
                                min="1"
                                max="90"
                            />
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                Validade padrão sugerida ao criar orçamento (Padrão: 10 dias)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Controle de Prismas */}
                <div className="card p-4 lg:p-6">
                    <h2 className="text-sm font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">filter_9_plus</span>
                        Controle de Prismas
                    </h2>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-4">
                        Prismas são acessórios de identificação visual colocados sobre veículos para vincular rapidamente o carro à sua OS
                    </p>

                    <div className="space-y-4">
                        {/* Toggle Usar Prismas */}
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <input
                                type="checkbox"
                                id="usarPrismas"
                                name="usarPrismas"
                                checked={form.usarPrismas}
                                onChange={handleChange}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="usarPrismas" className="text-sm font-medium text-text-light dark:text-text-dark select-none cursor-pointer">
                                Usar controle de prismas nas OS
                            </label>
                        </div>

                        {/* Configurações (só aparece se ativado) */}
                        {form.usarPrismas && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/30">
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                        Cor dos Prismas
                                    </label>
                                    <select
                                        name="prismaCor"
                                        value={form.prismaCor}
                                        onChange={handleChange}
                                        className="input w-full"
                                    >
                                        <option value="Vermelho">🔴 Vermelho</option>
                                        <option value="Azul">🔵 Azul</option>
                                        <option value="Verde">🟢 Verde</option>
                                        <option value="Amarelo">🟡 Amarelo</option>
                                        <option value="Preto">⚫ Preto</option>
                                        <option value="Laranja">🟠 Laranja</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                        Quantidade Total
                                    </label>
                                    <input
                                        type="number"
                                        name="prismaQuantidade"
                                        value={form.prismaQuantidade}
                                        onChange={handleChange}
                                        className="input w-full"
                                        min="1"
                                        max="999"
                                    />
                                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                        Números de 1 até {form.prismaQuantidade}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Personalização */}
                <div className="card p-4 lg:p-6">
                    <h2 className="text-sm font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">palette</span>
                        Personalização
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Logo da Oficina
                            </label>

                            <div className="flex flex-col gap-4">
                                {/* Preview e Actions */}
                                {form.logoUrl ? (
                                    <div className="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                        <div className="w-20 h-20 flex items-center justify-center bg-white rounded-lg border border-gray-200 overflow-hidden">
                                            <img
                                                src={form.logoUrl}
                                                alt="Logo Preview"
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="btn-secondary text-xs cursor-pointer inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">upload</span>
                                                Trocar
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleLogoUpload}
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleRemoverLogo}
                                                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                Remover
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <span className="material-symbols-outlined text-3xl text-gray-400 mb-2">cloud_upload</span>
                                            <p className="mb-1 text-sm text-text-secondary-light dark:text-text-secondary-dark font-medium">
                                                Clique para enviar o logo
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                PNG, JPG (Max. 5MB)
                                            </p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleLogoUpload}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Cor Primária
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    name="corPrimaria"
                                    value={form.corPrimaria}
                                    onChange={handleChange}
                                    className="w-12 h-10 rounded-lg cursor-pointer border-0"
                                />
                                <input
                                    type="text"
                                    value={form.corPrimaria}
                                    onChange={handleChange}
                                    name="corPrimaria"
                                    className="input flex-1"
                                    placeholder="#137fec"
                                />
                            </div>
                        </div>
                    </div>


                </div>

                {/* Pagamento PIX */}
                <div className="card p-4 lg:p-6 border-l-4 border-primary">
                    <h2 className="text-sm font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">pix</span>
                        Pagamento PIX
                    </h2>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-4">
                        Configure sua chave PIX para exibir no PDF e facilitar o recebimento.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Chave PIX
                            </label>
                            <input
                                type="text"
                                name="chavePix"
                                value={form.chavePix}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="CPF, CNPJ, Email ou Telefone"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Banco
                            </label>
                            <input
                                type="text"
                                name="banco"
                                value={form.banco}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="Ex: Banco do Brasil, Nubank..."
                            />
                        </div>
                    </div>
                </div>

                {/* Templates de Mensagem WhatsApp */}
                <div className="card p-4 lg:p-6 border-l-4 border-green-500">
                    <h2 className="text-sm font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-green-600">chat</span>
                        Templates de Mensagem WhatsApp
                    </h2>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-4">
                        Configure as mensagens padrão para enviar via WhatsApp. Use <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{'{nome}'}</code> e <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{'{veiculo}'}</code> para personalização automática.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                <span className="material-symbols-outlined text-sm align-middle mr-1 text-orange-500">event_upcoming</span>
                                Lembrete de Revisão
                            </label>
                            <textarea
                                name="templateLembreteRevisao"
                                value={form.templateLembreteRevisao}
                                onChange={handleChange}
                                className="input w-full"
                                rows={2}
                                placeholder="Olá {nome}! Seu veículo {veiculo} precisa de revisão..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                <span className="material-symbols-outlined text-sm align-middle mr-1 text-yellow-500">schedule</span>
                                Follow-up (Cliente Inativo)
                            </label>
                            <textarea
                                name="templateFollowUp"
                                value={form.templateFollowUp}
                                onChange={handleChange}
                                className="input w-full"
                                rows={2}
                                placeholder="Olá {nome}! Faz um tempo que não nos vemos..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                <span className="material-symbols-outlined text-sm align-middle mr-1 text-green-500">thumb_up</span>
                                Agradecimento (Pós-Serviço)
                            </label>
                            <textarea
                                name="templateAgradecimento"
                                value={form.templateAgradecimento}
                                onChange={handleChange}
                                className="input w-full"
                                rows={2}
                                placeholder="Olá {nome}! Obrigado pela preferência..."
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            <span className="material-symbols-outlined text-sm align-middle mr-1 text-blue-500">calendar_month</span>
                            Confirmação de Agendamento
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div>
                                <label className="text-xs text-text-secondary-light dark:text-text-secondary-dark block mb-1">
                                    Dias de Antecedência (Aviso)
                                </label>
                                <input
                                    type="number"
                                    name="agendaDiasAntecedencia"
                                    value={form.agendaDiasAntecedencia}
                                    onChange={handleChange}
                                    className="input w-full"
                                    min="0"
                                    max="7"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-text-secondary-light dark:text-text-secondary-dark block mb-1">
                                    Mensagem de Confirmação
                                </label>
                                <textarea
                                    name="agendaMensagemConfirmacao"
                                    value={form.agendaMensagemConfirmacao}
                                    onChange={handleChange}
                                    className="input w-full"
                                    rows={2}
                                    placeholder="Olá {nome}, confirmamos seu agendamento para {data}?"
                                />
                                <p className="text-[10px] text-text-secondary-light mt-1">
                                    Variáveis: {'{nome}'}, {'{veiculo}'}, {'{data}'}, {'{hora}'}, {'{servico}'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Informações do plano */}
                <div className="card p-4 lg:p-6 bg-gradient-to-br from-primary/5 to-transparent">
                    <h2 className="text-sm font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">workspace_premium</span>
                        Seu Plano
                    </h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-text-light dark:text-text-dark capitalize">
                                {empresa?.plano || 'Básico'}
                            </p>
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                {empresa?.limiteUsuarios || 1} usuário(s) incluído(s)
                            </p>
                        </div>
                        <button type="button" className="btn-secondary text-sm">
                            Fazer upgrade
                        </button>
                    </div>
                </div>



                {/* Sticky Footer Actions */}
                <div className="sticky bottom-0 p-4 bg-surface-light dark:bg-surface-dark border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] z-20 -mx-4 lg:-mx-6 mt-6">
                    <div className="max-w-4xl mx-auto flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                if (isTabMode) {
                                    onClose?.();
                                } else {
                                    window.history.back();
                                }
                            }}
                            className="btn-secondary flex-1"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={salvando}
                            className="btn-primary flex-1 shadow-lg shadow-primary/20"
                        >
                            {salvando ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">save</span>
                                    Salvar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form >
        </div >
    );
};

export default ConfiguracoesEmpresa;
