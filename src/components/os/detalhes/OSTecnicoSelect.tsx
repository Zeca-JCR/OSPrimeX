import type { OrdemServico, Colaborador } from '../../../types';
import { formatDateTime } from '../../../lib/utils';

interface OSTecnicoSelectProps {
    os: OrdemServico;
    tecnico?: Colaborador;
    form: { validadeOrcamento?: string; previsaoEntrega?: string };
    onAtribuirTecnico: () => void;
    onDateChange: (field: string, value: string) => void;
}

export const OSTecnicoSelect = ({
    os,
    tecnico,
    form,
    onAtribuirTecnico,
    onDateChange
}: OSTecnicoSelectProps) => {
    return (
        <div className={`card p-5 border-l-4 ${os.status === 'orcamento' ? 'border-l-yellow-400 dark:border-l-yellow-600' :
            os.status === 'finalizada' ? 'border-l-green-500 dark:border-l-green-600' :
                os.status === 'cancelada' ? 'border-l-red-500 dark:border-l-red-600' :
                    os.status === 'execucao' ? 'border-l-primary' :
                        'border-l-gray-300 dark:border-l-gray-600'
            }`}>
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">engineering</span>
                Execução
                {os.status === 'execucao' && (
                    <span className="ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary text-white animate-pulse">AO VIVO</span>
                )}
            </h3>

            {/* Técnico */}
            <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Técnico Responsável</label>
                <div
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer border border-transparent hover:border-gray-200 transition-all"
                    onClick={() => os.status !== 'finalizada' && onAtribuirTecnico()}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                            {tecnico ? tecnico.nome.charAt(0) : '?'}
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-sm ${tecnico ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 italic'}`}>
                                {tecnico?.nome || 'Atribuir Técnico'}
                            </span>
                        </div>
                    </div>
                    {os.status !== 'finalizada' && <span className="material-symbols-outlined text-gray-400">edit</span>}
                </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Entrada</label>
                    <p className="text-sm font-medium">{formatDateTime(os.criadoEm)}</p>
                </div>
                {os.status === 'orcamento' ? (
                    <>
                        <div>
                            <label className="text-xs text-text-secondary-light dark:text-text-secondary-dark block mb-1">
                                Validade do Orçamento
                            </label>
                            <input
                                type="date"
                                value={form?.validadeOrcamento ? form.validadeOrcamento.split('T')[0] : ''}
                                onChange={(e) => onDateChange('validadeOrcamento', e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="input text-xs py-1 px-2 h-8 w-full"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Previsão Entrega (Opcional)</label>
                            <input
                                type="datetime-local"
                                value={form?.previsaoEntrega || ''}
                                onChange={(e) => onDateChange('previsaoEntrega', e.target.value)}
                                className="input text-xs py-1 px-2 h-8 w-full"
                            />
                        </div>
                    </>
                ) : (
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Previsão de Entrega (Opcional)</label>
                        <input
                            type="datetime-local"
                            value={form?.previsaoEntrega || ''}
                            onChange={(e) => onDateChange('previsaoEntrega', e.target.value)}
                            className="input text-xs py-1 px-2 h-8 w-full"
                            disabled={os.status === 'finalizada' || os.status === 'cancelada'}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
