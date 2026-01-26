// CadastroVeiculo.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import storage from '../../lib/storage';
import { formatDate, formatCurrency, formatPlaca } from '../../lib/utils';
import GraficoKM from '../../components/veiculos/GraficoKM';
import type { Veiculo, Cliente, OrdemServico } from '../../types';

interface CadastroVeiculoProps {
    veiculoId?: string;
    isTabMode?: boolean;
    onClose?: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    onTitleChange?: (title: string) => void;
}

interface VeiculoForm extends Partial<Veiculo> {
    proximaRevisaoData?: string;
    proximaRevisaoKm?: string;
}

const CadastroVeiculo = ({ veiculoId, isTabMode, onClose, onDirtyChange, onTitleChange }: CadastroVeiculoProps) => {
    const { empresa } = useAuth();
    const { registerSaveHandler, unregisterSaveHandler } = useTabs();
    const navigate = useNavigate();
    const params = useParams();
    const [searchParams] = useSearchParams();
    const id = veiculoId || params.id; // Prioriza prop (TabMode) sobre URL
    const clienteIdFromUrl = searchParams.get('cliente');
    const isEdicao = !!id;

    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [ordensVeiculo, setOrdensVeiculo] = useState<OrdemServico[]>([]);

    // Refs para callbacks que podem mudar - evita loops infinitos
    const onDirtyChangeRef = useRef(onDirtyChange);
    const onTitleChangeRef = useRef(onTitleChange);

    // Manter refs atualizadas
    useEffect(() => {
        onDirtyChangeRef.current = onDirtyChange;
        onTitleChangeRef.current = onTitleChange;
    });

    const [form, setForm] = useState<VeiculoForm>({
        clienteId: clienteIdFromUrl || '',
        marca: '',
        modelo: '',
        placa: '',
        ano: '',
        cor: '',
        combustivel: 'flex',
        renavam: '',
        observacoes: '',
        proximaRevisaoData: '',
        proximaRevisaoKm: '',
        foto: '',
    });

    useEffect(() => {
        carregarClientes();
        if (isEdicao) {
            carregarVeiculo();
        }
    }, [id]);

    // Comunicar dirty state para aba
    useEffect(() => {
        if (isTabMode) onDirtyChangeRef.current?.(isDirty);
    }, [isDirty, isTabMode]);

    // Comunicar título para aba (placa + modelo)
    useEffect(() => {
        if (isTabMode) {
            const titulo = form?.placa ? `${form.placa}` : 'Novo Veículo';
            onTitleChangeRef.current?.(titulo);
        }
    }, [form?.placa, isTabMode]);

    // Função de salvar para saveHandler
    const salvarVeiculo = useCallback(async () => {
        if (!form.clienteId) throw new Error('Selecione um cliente');
        if (!form.marca || !form.marca.trim()) throw new Error('Marca é obrigatória');
        if (!form.modelo || !form.modelo.trim()) throw new Error('Modelo é obrigatório');
        if (!form.placa || !form.placa.trim()) throw new Error('Placa é obrigatória');

        if (!empresa?.id) throw new Error('Empresa não identificada');

        const payload = {
            ...form,
            placa: form.placa,
            ano: form.ano ? Number(form.ano) : undefined,
            proximaRevisaoKm: form.proximaRevisaoKm ? Number(form.proximaRevisaoKm) : undefined,
            // Garantir campos obrigatórios para satisfazer o tipo se necessário, ou confiar no Partial
            // Mas o storage espera Partial<T>
        };

        if (isEdicao && id) {
            await storage.update('veiculos', id, payload);
        } else {
            await storage.create('veiculos', payload, empresa.id);
        }
        setIsDirty(false);
    }, [form, id, isEdicao, empresa?.id]);

    // Registrar saveHandler
    useEffect(() => {
        if (isTabMode) {
            // Funciona para edição (veiculo-{id}) e para novo (veiculo-novo)
            const tabId = veiculoId ? `veiculo-${veiculoId}` : 'veiculo-novo';
            registerSaveHandler(tabId, salvarVeiculo);
            return () => unregisterSaveHandler(tabId);
        }
    }, [isTabMode, veiculoId, salvarVeiculo, registerSaveHandler, unregisterSaveHandler]);

    const carregarClientes = async () => {
        if (!empresa?.id) return;
        try {
            const data = await storage.getAll<Cliente>('clientes', empresa.id);
            setClientes(data.filter((c) => c.ativo));
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    };

    const carregarVeiculo = async () => {
        if (!id || !empresa?.id) return;
        setLoading(true);
        try {
            const [veiculo, ordensData] = await Promise.all([
                storage.getById<Veiculo>('veiculos', id),
                storage.getAll<OrdemServico>('ordens_servico', empresa.id),
            ]);

            if (veiculo) {
                setForm({
                    clienteId: veiculo.clienteId || '',
                    marca: veiculo.marca || '',
                    modelo: veiculo.modelo || '',
                    placa: veiculo.placa || '',
                    ano: veiculo.ano ? String(veiculo.ano) : '',
                    cor: veiculo.cor || '',
                    combustivel: veiculo.combustivel || 'flex',
                    renavam: veiculo.renavam || '',
                    observacoes: veiculo.observacoes || '',
                    // Campos adicionais que podem não estar na interface Veiculo strict
                    proximaRevisaoData: (veiculo as any).proximaRevisaoData || '',
                    proximaRevisaoKm: (veiculo as any).proximaRevisaoKm || '',
                    foto: veiculo.foto || '',
                });

                // Carregar histórico de OS deste veículo
                const osDoVeiculo = ordensData
                    .filter(o => o.veiculoId === id && o.ativo)
                    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
                setOrdensVeiculo(osDoVeiculo);
            }
        } catch (error) {
            console.error('Erro ao carregar veículo:', error);
            setError('Erro ao carregar dados do veículo');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setIsDirty(true);
        if (name === 'placa') {
            setForm((prev) => ({ ...prev, [name]: formatPlaca(value) }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    // Função para comprimir/redimensionar imagem
    const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            setError('Por favor, selecione uma imagem válida.');
            return;
        }

        // Validar tamanho (max 10MB original)
        if (file.size > 10 * 1024 * 1024) {
            setError('Imagem muito grande. Máximo 10MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            if (!event.target?.result || typeof event.target.result !== 'string') return;

            const img = new Image();
            img.onload = () => {
                // Redimensionar para max 800px de largura
                const maxWidth = 800;
                const maxHeight = 600;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                ctx.drawImage(img, 0, 0, width, height);

                // Comprimir para JPEG com qualidade 0.7
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                setForm((prev) => ({ ...prev, foto: compressedBase64 }));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const removerFoto = () => {
        setForm((prev) => ({ ...prev, foto: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!empresa?.id) {
            setError('Empresa não identificada');
            return;
        }

        setSalvando(true);

        try {
            if (!form.clienteId) {
                throw new Error('Selecione um cliente');
            }
            if (!form.marca || !form.marca.trim()) {
                throw new Error('Marca é obrigatória');
            }
            if (!form.modelo || !form.modelo.trim()) {
                throw new Error('Modelo é obrigatório');
            }
            if (!form.placa || !form.placa.trim()) {
                throw new Error('Placa é obrigatória');
            }

            const payload = {
                ...form,
                placa: form.placa,
                ano: form.ano ? parseInt(String(form.ano)) : null,
                proximaRevisaoKm: form.proximaRevisaoKm ? parseInt(String(form.proximaRevisaoKm)) : null,
            };

            // Debug: verificar se a foto está no payload
            console.log('Salvando veículo - foto presente:', payload.foto ? `Sim (${payload.foto.length} chars)` : 'Não');

            if (isEdicao) {
                await storage.update('veiculos', id, payload);
            } else {
                await storage.create('veiculos', payload, empresa.id);
            }

            setIsDirty(false);
            // Navegar de volta
            if (isTabMode) {
                onClose?.();
            } else if (clienteIdFromUrl) {
                navigate(`/clientes/${clienteIdFromUrl}`);
            } else {
                navigate('/veiculos');
            }
        } catch (error) {
            setError((error as Error).message || 'Erro ao salvar veículo');
        } finally {
            setSalvando(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.')) return;
        if (!empresa?.id || !id) return;

        setSalvando(true);
        try {
            // Validação: Verificar vínculo com OS
            const todasOS = await storage.getAll<OrdemServico>('ordens_servico', empresa.id);
            const vinculado = todasOS.some(os => os.veiculoId === id);

            if (vinculado) {
                alert('Não é possível excluir este veículo pois ele está vinculado a Ordens de Serviço (histórico).');
                return;
            }

            await storage.softDelete('veiculos', id);

            // Navegar de volta
            if (isTabMode) {
                onClose?.();
            } else if (clienteIdFromUrl) {
                navigate(`/clientes/${clienteIdFromUrl}`);
            } else {
                navigate('/veiculos');
            }
        } catch (error) {
            console.error('Erro ao excluir veículo:', error);
            setError('Erro ao excluir veículo: ' + (error as Error).message);
        } finally {
            setSalvando(false);
        }
    };

    const combustiveis = [
        { value: 'flex', label: 'Flex' },
        { value: 'gasolina', label: 'Gasolina' },
        { value: 'etanol', label: 'Etanol' },
        { value: 'diesel', label: 'Diesel' },
        { value: 'eletrico', label: 'Elétrico' },
        { value: 'hibrido', label: 'Híbrido' },
    ];

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
        <div className="min-h-full bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                <div className="flex items-center gap-3 px-4 py-3">
                    <div>
                        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
                            {isEdicao ? 'Editar Veículo' : 'Novo Veículo'}
                        </h1>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            {isEdicao ? 'Atualize as informações do veículo' : 'Adicione um veículo Ã  frota do cliente'}
                        </p>
                    </div>
                </div>
            </header>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-2xl mx-auto">
                {/* Error */}
                {error && (
                    <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error flex items-center gap-2">
                        <span className="material-symbols-outlined">error</span>
                        {error}
                    </div>
                )}

                {/* Cliente */}
                <div className="card p-4">
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                        Cliente *
                    </label>
                    <select
                        name="clienteId"
                        value={form.clienteId}
                        onChange={handleChange}
                        className="input"
                        required
                    >
                        <option value="">Selecione um cliente</option>
                        {clientes.map((cliente) => (
                            <option key={cliente.id} value={cliente.id}>
                                {cliente.nome}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Foto do veículo */}
                <div className="card p-4">
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-3">
                        Foto do Veículo
                    </label>

                    {form.foto ? (
                        <div className="relative">
                            <img
                                src={form.foto}
                                alt="Foto do veículo"
                                className="w-full max-h-64 object-cover rounded-xl"
                            />
                            <button
                                type="button"
                                onClick={removerFoto}
                                className="absolute top-2 right-2 p-2 bg-error text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                title="Remover foto"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">
                                    add_a_photo
                                </span>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                    <span className="font-medium text-primary">Clique para enviar</span> ou arraste uma foto
                                </p>
                                <p className="text-xs text-gray-400 mt-1">PNG, JPG até 10MB</p>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFotoChange}
                            />
                        </label>
                    )}
                </div>

                {/* Dados do veículo */}
                <div className="card p-4 space-y-4">
                    <h2 className="font-semibold text-text-light dark:text-text-dark">
                        Dados do Veículo
                    </h2>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Marca *
                            </label>
                            <input
                                type="text"
                                name="marca"
                                value={form.marca}
                                onChange={handleChange}
                                className="input"
                                placeholder="Ex: Fiat, Volkswagen..."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Modelo *
                            </label>
                            <input
                                type="text"
                                name="modelo"
                                value={form.modelo}
                                onChange={handleChange}
                                className="input"
                                placeholder="Ex: Civic, Onix, Corolla..."
                                required
                            />
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Placa *
                            </label>
                            <input
                                type="text"
                                name="placa"
                                value={form.placa}
                                onChange={handleChange}
                                className="input uppercase"
                                placeholder="ABC-1234"
                                maxLength={8}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Ano
                            </label>
                            <input
                                type="number"
                                name="ano"
                                value={form.ano}
                                onChange={handleChange}
                                className="input"
                                placeholder="2024"
                                min={1900}
                                max={new Date().getFullYear() + 1}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Cor
                            </label>
                            <input
                                type="text"
                                name="cor"
                                value={form.cor}
                                onChange={handleChange}
                                className="input"
                                placeholder="Prata"
                            />
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Combustível
                            </label>
                            <select
                                name="combustivel"
                                value={form.combustivel}
                                onChange={handleChange}
                                className="input"
                            >
                                {combustiveis.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                                Renavam
                            </label>
                            <input
                                type="text"
                                name="renavam"
                                value={form.renavam}
                                onChange={handleChange}
                                className="input"
                                placeholder="00000000000"
                                maxLength={11}
                            />
                        </div>
                    </div>

                    {/* KM removido daqui */}
                </div>

                {/* CRM - Próxima Revisão */}
                <div className="card p-4 border-l-4 border-primary">
                    <h2 className="font-semibold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">event_upcoming</span>
                        Próxima Revisão Sugerida
                    </h2>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
                        Configure quando este veículo deve retornar para revisão. O sistema irá gerar alertas no CRM.
                    </p>
                    {/* Próxima Revisão - Apenas Data agora */}
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                            <span className="material-symbols-outlined text-sm align-middle mr-1">calendar_month</span>
                            Data da Próxima Revisão
                        </label>
                        <input
                            type="date"
                            name="proximaRevisaoData"
                            value={form.proximaRevisaoData}
                            onChange={handleChange}
                            className="input"
                            min={new Date().toISOString().split('T')[0]}
                        />
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                            O sistema avisará 30 dias antes e quando vencer.
                        </p>
                    </div>
                </div>

                {/* Gráfico de Evolução da KM */}
                {isEdicao && (() => {
                    const dadosGrafico = ordensVeiculo
                        .filter(o => o.status === 'finalizada' && (o.kmAtual || (o as any).km))
                        .map(o => ({
                            data: o.criadoEm, // Idealmente usar data de finalização se houver, mas criadoEm serve
                            km: o.kmAtual || (o as any).km,
                            osNumero: o.numero
                        }))
                        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

                    return <GraficoKM dados={dadosGrafico} />;
                })()}

                {/* Histórico de Manutenção - apenas em edição */}
                {isEdicao && (
                    <div className="card p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-text-light dark:text-text-dark flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">history</span>
                                Histórico de Manutenção ({ordensVeiculo.length})
                            </h2>
                        </div>

                        {ordensVeiculo.length === 0 ? (
                            <div className="text-center py-6">
                                <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">assignment</span>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                    Nenhuma OS registrada para este veículo
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {ordensVeiculo.slice(0, 10).map((os) => {
                                    const statusConfig: Record<string, { label: string; color: string }> = {
                                        orcamento: { label: 'Orçamento', color: 'bg-yellow-500' },
                                        aguardando_aprovacao: { label: 'Aguard. Aprov.', color: 'bg-yellow-600' },
                                        aprovada: { label: 'Aprovada', color: 'bg-blue-400' },
                                        aberta: { label: 'Aberta', color: 'bg-blue-500' },
                                        execucao: { label: 'Execução', color: 'bg-orange-500' },
                                        aguardando_peca: { label: 'Aguard. Peça', color: 'bg-purple-500' },
                                        finalizada: { label: 'Finalizada', color: 'bg-green-500' },
                                        entregue: { label: 'Entregue', color: 'bg-green-600' },
                                        cancelada: { label: 'Cancelada', color: 'bg-red-500' },
                                    };

                                    return (
                                        <Link
                                            key={os.id}
                                            to={`/os/${os.id}`}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <span className="material-symbols-outlined">assignment</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-medium text-text-light dark:text-text-dark">
                                                        OS #{os.numero}
                                                    </p>
                                                    {(os.kmAtual || (os as any).km) && (
                                                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                                            {Number(os.kmAtual || (os as any).km).toLocaleString('pt-BR')} km
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                                                    {formatDate(os.criadoEm)} • {formatCurrency(os.valorTotal || 0)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${statusConfig[os.status]?.color || 'bg-gray-500'}`}>
                                                    {statusConfig[os.status]?.label || os.status}
                                                </span>
                                                <span className="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                                {ordensVeiculo.length > 10 && (
                                    <p className="text-xs text-center text-text-secondary-light dark:text-text-secondary-dark pt-2">
                                        Mostrando 10 de {ordensVeiculo.length} OS
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Observações */}
                <div className="card p-4">
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                        Observações
                    </label>
                    <textarea
                        name="observacoes"
                        value={form.observacoes}
                        onChange={handleChange}
                        className="input min-h-[100px] resize-y"
                        placeholder="Observações sobre o veículo..."
                    />
                </div>

                {/* Actions */}
                {/* Espaçador para o footer */}
                <div className="h-20"></div>

                {/* Sticky Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-light dark:bg-surface-dark border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] z-20">
                    <div className="max-w-2xl mx-auto flex gap-3 items-center">
                        {isEdicao && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mr-auto"
                                title="Excluir Veículo"
                                disabled={salvando}
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => isTabMode ? onClose?.() : navigate(-1)}
                            className={`btn-secondary ${isEdicao ? '' : 'flex-1'}`}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={salvando}
                            className={`btn-primary shadow-lg shadow-primary/20 ${isEdicao ? '' : 'flex-1'}`}
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
            </form>
        </div>
    );
};

export default CadastroVeiculo;

