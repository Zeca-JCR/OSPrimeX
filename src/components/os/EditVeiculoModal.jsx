
import { useState, useEffect } from 'react';
import storage from '../../lib/storage';
import { formatPlaca } from '../../lib/utils';

export const EditVeiculoModal = ({ veiculo, empresaId, onClose, onSave }) => {
    const [form, setForm] = useState({
        placa: '',
        marca: '',
        modelo: '',
        ano: '',
        cor: '',
        km: ''
    });
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (veiculo) {
            setForm({
                placa: veiculo.placa || '',
                marca: veiculo.marca || '',
                modelo: veiculo.modelo || '',
                ano: veiculo.ano || '',
                cor: veiculo.cor || '',
                km: veiculo.km || ''
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
            await storage.update('veiculos', veiculo.id, {
                ...form,
                km: Number(form.km) || 0
            }, empresaId);
            onSave({ ...veiculo, ...form, km: Number(form.km) || 0 });
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
                            <label className="label">KM</label>
                            <input
                                type="number"
                                name="km"
                                value={form.km}
                                onChange={handleChange}
                                className="input w-full"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
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
                </form>
            </div>
        </div>
    );
};
