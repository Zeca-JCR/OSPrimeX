
import { useState, useEffect } from 'react';
import storage from '../../lib/storage';
import { formatPlaca } from '../../lib/utils';

export const EditVeiculoModal = ({ veiculo, empresaId, onClose, onSave }) => {
    const [form, setForm] = useState({
        placa: '',
        marca: '',
        modelo: '',
        ano: '',
        cor: ''
    });
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (veiculo) {
            setForm({
                placa: veiculo.placa || '',
                marca: veiculo.marca || '',
                modelo: veiculo.modelo || '',
                ano: veiculo.ano || '',
                cor: veiculo.cor || ''
            });
        }
    }, [veiculo]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        setSalvando(true);
        try {
            await storage.update('veiculos', veiculo.id, form, empresaId);
            onSave({ ...veiculo, ...form });
            onClose();
        } catch (error) {
            console.error('Erro ao atualizar veículo:', error);
        } finally {
            setSalvando(false);
        }
    };

    const placaValida = /^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(form.placa);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="card p-6 w-full max-w-md animate-scaleIn relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">edit</span>
                    Editar Veículo
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Placa *</label>
                        <input
                            type="text"
                            value={form.placa}
                            onChange={(e) => setForm(prev => ({ ...prev, placa: formatPlaca(e.target.value) }))}
                            maxLength={8}
                            className={`input w-full ${form.placa && !placaValida ? 'border-red-500 bg-red-50' : ''}`}
                            required
                        />
                        {form.placa && !placaValida && (
                            <p className="text-[10px] text-red-500 mt-1">Formato inválido (AAA-0000 ou AAA0A00)</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Marca</label>
                            <input
                                type="text"
                                name="marca"
                                value={form.marca}
                                onChange={handleChange}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="label">Modelo *</label>
                            <input
                                type="text"
                                name="modelo"
                                value={form.modelo}
                                onChange={handleChange}
                                className="input w-full"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Ano</label>
                            <input
                                type="text"
                                name="ano"
                                value={form.ano}
                                onChange={handleChange}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="label">Cor</label>
                            <input
                                type="text"
                                name="cor"
                                value={form.cor}
                                onChange={handleChange}
                                className="input w-full"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={async () => {
                                if (!confirm('Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.')) return;

                                setSalvando(true);
                                try {
                                    // Validação: Verificar vínculo com OS
                                    const todasOS = await storage.getAll('ordens_servico', empresaId);
                                    const vinculado = todasOS.some(os => os.veiculoId === veiculo.id);

                                    if (vinculado) {
                                        alert('Não é possível excluir este veículo pois ele está vinculado a uma ou mais Ordens de Serviço.');
                                        return;
                                    }

                                    await storage.delete('veiculos', veiculo.id);
                                    if (onSave) onSave(null); // Passar null para indicar exclusão/recarregamento
                                    onClose();
                                } catch (error) {
                                    console.error('Erro ao excluir veículo:', error);
                                    alert('Erro ao excluir veículo.');
                                } finally {
                                    setSalvando(false);
                                }
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            disabled={salvando}
                            title="Excluir Veículo permanently"
                        >
                            <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-lg">delete</span>
                                <span>Excluir</span>
                            </div>
                        </button>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={salvando || !placaValida}
                                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {salvando ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </form>
            </div >
        </div >
    );
};
