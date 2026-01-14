// @ts-nocheck
// Tipagem completa será adicionada em fase futura
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import storage from '../../lib/storage';
import { formatPlaca, validarPlaca, toISODate } from '../../lib/utils';

export const NovaOSModal = ({ clientes, veiculos, empresaId, onClose, onSave, initialClienteId = '', initialVeiculoId = '' }) => {
    const { empresa } = useAuth();
    const { podeCriarOS, getLimiteOS } = useTenant();
    const [form, setForm] = useState({
        tipo: 'os', // 'os' ou 'orcamento'
        clienteId: initialClienteId,
        veiculoId: initialVeiculoId,
        km: '',
        defeitoRelatado: '',
    });
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState('');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    useEffect(() => {
        const carregarTemplates = async () => {
            try {
                const data = await storage.getAll('osprimex_templates', empresaId) || [];
                setTemplates(data);
            } catch (err) {
                console.error('Erro ao carregar templates', err);
            }
        };
        carregarTemplates();
    }, [empresaId]);

    // Estados para Cadastro Rápido
    const [showAddCliente, setShowAddCliente] = useState(false);
    const [showAddVeiculo, setShowAddVeiculo] = useState(false);
    const [extraClientes, setExtraClientes] = useState([]);
    const [extraVeiculos, setExtraVeiculos] = useState([]);

    const [newCliente, setNewCliente] = useState({ nome: '', telefone: '', documento: '' });
    const [newVeiculo, setNewVeiculo] = useState({ placa: '', modelo: '', marca: '', ano: '' });

    // Handler Salvar Novo Cliente
    const handleSaveCliente = async () => {
        try {
            if (!newCliente.nome) return;
            const novoCliente = await storage.create('clientes', {
                ...newCliente,
                tipo: 'pessoa_fisica', // Default
                email: '',
                cep: '',
                endereco: '',
                cidade: '',
                estado: '',
                ativo: true
            }, empresaId);

            setExtraClientes(prev => [...prev, novoCliente]);
            setForm(prev => ({ ...prev, clienteId: novoCliente.id }));
            setShowAddCliente(false);
            setNewCliente({ nome: '', telefone: '', documento: '' });
        } catch (error) {
            console.error('Erro ao criar cliente rápido:', error);
            setError('Erro ao salvar cliente rápido.');
        }
    };

    // Handler Salvar Novo Veículo
    const handleSaveVeiculo = async () => {
        try {
            if (!newVeiculo.placa || !newVeiculo.modelo || !form.clienteId) return;
            const novoVeiculo = await storage.create('veiculos', {
                ...newVeiculo,
                clienteId: form.clienteId,
                ativo: true
            }, empresaId);

            setExtraVeiculos(prev => [...prev, novoVeiculo]);
            setForm(prev => ({ ...prev, veiculoId: novoVeiculo.id }));
            setShowAddVeiculo(false);
            setNewVeiculo({ placa: '', modelo: '', marca: '', ano: '' });
        } catch (error) {
            console.error('Erro ao criar veículo rápido:', error);
            setError('Erro ao salvar veículo rápido.');
        }
    };

    const veiculosDoCliente = form.clienteId
        ? veiculos.filter(v => v.clienteId === form.clienteId && v.ativo)
        : veiculos.filter(v => v.ativo);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const newForm = { ...prev, [name]: value };
            // Limpar veículo se mudar cliente manualmente
            if (name === 'clienteId') {
                newForm.veiculoId = '';
            }
            // Se selecionar veículo e não tiver cliente (ou for diferente), puxar o cliente
            if (name === 'veiculoId' && value) {
                const selectedVeiculo = [...veiculos, ...extraVeiculos].find(v => v.id === value);
                if (selectedVeiculo) {
                    newForm.clienteId = selectedVeiculo.clienteId;
                }
            }
            return newForm;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSalvando(true);

        try {
            // Verificar limite do plano
            const pode = await podeCriarOS();
            if (!pode && form.tipo === 'os') { // Bloqueia OS, mas talvez permita Orçamento? Vamos bloquear tudo por enquanto ou só OS.
                // Como Orçamento vira OS, melhor bloquear tudo.
                const limite = getLimiteOS();
                throw new Error(`Limite do plano atingido(${limite} OS).Faça upgrade.`);
            }

            if (!form.clienteId) throw new Error('Selecione um cliente');
            if (!form.veiculoId) throw new Error('Selecione um veículo');

            // Gerar número da OS
            const ordens = await storage.getAll('ordens_servico', empresaId);
            const ultimoNumero = ordens.reduce((max, o) => Math.max(max, o.numero || 0), 1000);

            // Atualizar KM do veículo se informado
            if (form.km) {
                await storage.update('veiculos', form.veiculoId, { km: Number(form.km) }, empresaId);
            }

            // Carregar itens do template se selecionado
            let novosItens = [];
            let novoValorTotal = 0;

            if (selectedTemplateId) {
                const template = templates.find(t => t.id === selectedTemplateId);
                if (template && template.itens) {
                    novosItens = template.itens.map(item => ({
                        ...item,
                        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)} `,
                        total: (Number(item.quantidade) || 1) * (Number(item.precoUnitario) || 0)
                    }));
                    novoValorTotal = novosItens.reduce((acc, item) => acc + item.total, 0);
                }
            }

            const novaOS = await storage.create(
                'ordens_servico',
                {
                    numero: ultimoNumero + 1,
                    clienteId: form.clienteId,
                    veiculoId: form.veiculoId,
                    tecnicoId: null,
                    status: form.tipo === 'orcamento' ? 'orcamento' : 'aberta',
                    tipo: form.tipo,
                    defeitoRelatado: form.defeitoRelatado,
                    defeitoConstatado: '',
                    dataAbertura: new Date().toISOString(), // Garante a data explícita
                    validadeOrcamento: form.tipo === 'orcamento' ? (() => {
                        const dias = Number(empresa?.diasValidadeOrcamento || 10);
                        const hoje = new Date();
                        hoje.setDate(hoje.getDate() + dias);
                        // Ajuste para pegar a data local correta (YYYY-MM-DD) sem converter para UTC
                        const offset = hoje.getTimezoneOffset() * 60000;
                        const dataLocal = new Date(hoje.getTime() - offset);
                        return toISODate(dataLocal);
                    })() : '',
                    kmAtual: form.km || '', // Salva o KM de abertura na OS
                    checklist: [],
                    itens: novosItens,
                    valorTotal: novoValorTotal,
                    statusFinanceiro: 'pendente',
                    fotos: [],
                    observacoes: '',
                },
                empresaId
            );

            onSave(novaOS);
        } catch (error) {
            setError(error.message || 'Erro ao criar OS');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                        Nova Ordem de Serviço
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    {/* Seletor de Tipo */}
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Tipo de Documento
                        </label>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <label
                                    className={`flex items - center justify - center gap - 2 p - 3 rounded - xl border - 2 cursor - pointer transition - all ${['os', 'garantia', 'cortesia', 'retorno', 'interna'].includes(form.tipo)
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        } `}
                                    onClick={() => setForm(prev => ({ ...prev, tipo: 'os' }))}
                                >
                                    <input
                                        type="radio"
                                        name="docType"
                                        checked={['os', 'garantia', 'cortesia', 'retorno', 'interna'].includes(form.tipo)}
                                        readOnly
                                        className="sr-only"
                                    />
                                    <span className="material-symbols-outlined">build</span>
                                    <span className="font-medium">Ordem de Serviço</span>
                                </label>
                                <label
                                    className={`flex items - center justify - center gap - 2 p - 3 rounded - xl border - 2 cursor - pointer transition - all ${form.tipo === 'orcamento'
                                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        } `}
                                    onClick={() => setForm(prev => ({ ...prev, tipo: 'orcamento' }))}
                                >
                                    <input
                                        type="radio"
                                        name="docType"
                                        checked={form.tipo === 'orcamento'}
                                        onChange={() => setForm(prev => ({ ...prev, tipo: 'orcamento' }))}
                                        className="sr-only"
                                    />
                                    <span className="material-symbols-outlined">receipt_long</span>
                                    <span className="font-medium">Orçamento</span>
                                </label>
                            </div>

                            {/* Sub-tipos de OS */}
                            {['os', 'garantia', 'cortesia', 'retorno', 'interna'].includes(form.tipo) && (
                                <div className="animate-slideDown">
                                    <label className="block text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1 ml-1">
                                        Natureza da OS
                                    </label>
                                    <select
                                        value={form.tipo}
                                        onChange={(e) => setForm(prev => ({ ...prev, tipo: e.target.value }))}
                                        className="input w-full text-sm"
                                    >
                                        <option value="os">🔧 Manutenção (Padrão)</option>
                                        <option value="garantia">🛡️ Garantia</option>
                                        <option value="retorno">↩️ Retorno</option>
                                        <option value="cortesia">🎁 Cortesia</option>
                                        <option value="interna">🏢 Interna</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Seção Veículo (Invertida ordem visual no código para facilitar leitura, mas no UI mantém ordem, apenas desbloqueia) */}

                    {/* Seção Cliente */}
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Cliente *
                        </label>
                        {!showAddCliente ? (
                            <div className="flex gap-2">
                                <select
                                    name="clienteId"
                                    value={form.clienteId}
                                    onChange={handleChange}
                                    className="input flex-1"
                                    required
                                >
                                    <option value="">Selecione um cliente (ou busque pelo veículo abaixo)</option>
                                    {[...clientes, ...extraClientes].filter(c => c.ativo !== false).map((cliente) => (
                                        <option key={cliente.id} value={cliente.id}>
                                            {cliente.nome}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowAddCliente(true)}
                                    className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-primary transition-colors"
                                    title="Novo Cliente Rápido"
                                >
                                    <span className="material-symbols-outlined">add</span>
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-scaleIn">
                                <h4 className="text-sm font-bold text-primary mb-3">Novo Cliente Rápido</h4>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Nome Completo *"
                                        value={newCliente.nome}
                                        onChange={e => setNewCliente(prev => ({ ...prev, nome: e.target.value }))}
                                        className="input w-full"
                                        autoFocus
                                    />
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            placeholder="Telefone/WhatsApp"
                                            value={newCliente.telefone}
                                            onChange={e => setNewCliente(prev => ({ ...prev, telefone: e.target.value }))}
                                            className="input flex-1"
                                        />
                                        <input
                                            type="text"
                                            placeholder="CPF/CNPJ (Opcional)"
                                            value={newCliente.documento}
                                            onChange={e => setNewCliente(prev => ({ ...prev, documento: e.target.value }))}
                                            className="input flex-1"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddCliente(false)}
                                            className="btn-secondary text-xs px-3 py-1.5"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveCliente}
                                            disabled={!newCliente.nome}
                                            className="btn-primary text-xs px-3 py-1.5"
                                        >
                                            Salvar Cliente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Seção Veículo */}
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Veículo {form.clienteId ? '*' : '(Pode selecionar para auto-preencher cliente)'}
                        </label>
                        {!showAddVeiculo ? (
                            <div className="flex gap-2">
                                <select
                                    name="veiculoId"
                                    value={form.veiculoId}
                                    onChange={handleChange}
                                    className="input flex-1"
                                    required
                                >
                                    <option value="">
                                        {form.clienteId ? 'Selecione um veículo' : 'Digite a placa para buscar...'}
                                    </option>
                                    {[...veiculosDoCliente, ...extraVeiculos.filter(v => form.clienteId ? v.clienteId === form.clienteId : true)].map((veiculo) => (
                                        <option key={veiculo.id} value={veiculo.id}>
                                            {formatPlaca(veiculo.placa)} - {veiculo.modelo} ({veiculo.marca})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowAddVeiculo(true)}
                                    disabled={!form.clienteId}
                                    className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-primary transition-colors disabled:opacity-50"
                                    title="Novo Veículo Rápido"
                                >
                                    <span className="material-symbols-outlined">directions_car</span>
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-scaleIn">
                                <h4 className="text-sm font-bold text-primary mb-3">Novo Veículo Rápido</h4>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Placa *"
                                                value={newVeiculo.placa}
                                                onChange={e => {
                                                    const val = formatPlaca(e.target.value);
                                                    setNewVeiculo(prev => ({ ...prev, placa: val }));
                                                }}
                                                className={`input w - full ${newVeiculo.placa && !/^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(newVeiculo.placa) ? 'border-red-500 bg-red-50' : ''} `}
                                                maxLength={8}
                                                autoFocus
                                            />
                                            {newVeiculo.placa && !/^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(newVeiculo.placa) && (
                                                <p className="text-[10px] text-red-500 mt-1">Formato inválido (AAA-0000 ou AAA0A00)</p>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Ano"
                                            value={newVeiculo.ano}
                                            onChange={e => setNewVeiculo(prev => ({ ...prev, ano: e.target.value }))}
                                            className="input w-24"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            placeholder="Marca (ex: VW)"
                                            value={newVeiculo.marca}
                                            onChange={e => setNewVeiculo(prev => ({ ...prev, marca: e.target.value }))}
                                            className="input flex-1"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Modelo (ex: Gol)"
                                            value={newVeiculo.modelo}
                                            onChange={e => setNewVeiculo(prev => ({ ...prev, modelo: e.target.value }))}
                                            className="input flex-1"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddVeiculo(false)}
                                            className="btn-secondary text-xs px-3 py-1.5"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveVeiculo}
                                            disabled={!newVeiculo.placa || !newVeiculo.modelo || !/^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(newVeiculo.placa)}
                                            className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Salvar Veículo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {form.clienteId && veiculosDoCliente.length === 0 && extraVeiculos.filter(v => v.clienteId === form.clienteId).length === 0 && !showAddVeiculo && (
                            <p className="mt-1 text-sm text-warning flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">warning</span>
                                Cliente sem veículos. Cadastre um agora!
                            </p>
                        )}
                    </div>

                    {form.veiculoId && (
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                KM Atual
                            </label>
                            <input
                                type="number"
                                name="km"
                                value={form.km}
                                onChange={handleChange}
                                className="input"
                                placeholder="Ex: 50000"
                                min="0"
                            />
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                Atualiza a quilometragem do veículo automaticamente.
                            </p>
                        </div>
                    )}

                    {/* Templates / Kits */}
                    {templates.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Carregar Modelo (Kit)
                            </label>
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                className="input"
                            >
                                <option value="">Nenhum (Começar vazia)</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.nome} ({t.itens?.length || 0} itens)
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                Preenche automaticamente os itens e serviços da OS.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            Defeito Relatado
                        </label>
                        <textarea
                            name="defeitoRelatado"
                            value={form.defeitoRelatado}
                            onChange={handleChange}
                            className="input min-h-[100px] resize-y"
                            placeholder="Descreva o problema relatado pelo cliente..."
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
                                    Criando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">add</span>
                                    Criar OS
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

