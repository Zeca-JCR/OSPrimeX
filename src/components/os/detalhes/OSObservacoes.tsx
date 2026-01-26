import { useState } from 'react';
import type { OrdemServico, Usuario } from '../../../types';

interface OSObservacoesProps {
    os: OrdemServico;
    form: Partial<OrdemServico>; // Permite usar o form em edição
    usuario: Usuario | null;
    onFormChange: (field: string, value: any) => void;
    // Opcional: Se quiser controlar dirty state explicitamente
    onDirty?: () => void;
}

export const OSObservacoes = ({
    os,
    form,
    usuario,
    onFormChange,
    onDirty
}: OSObservacoesProps) => {
    const [showHistoricoDefeito, setShowHistoricoDefeito] = useState(false);

    // Lógica de Historico ao sair do campo (onBlur)
    const handleBlurDefeito = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        const novoValor = e.target.value;
        const valorOriginal = os.defeitoRelatado || '';

        // Só registra histórico se o valor final for diferente do original
        if (novoValor !== valorOriginal && novoValor.trim() !== '') {
            const historicoAtual = (form as any).defeitoRelatadoHistorico || (os as any).defeitoRelatadoHistorico || [];

            // Verifica se já existe um registro recente (últimos 60 segundos)
            const ultimoRegistro = historicoAtual[historicoAtual.length - 1];
            const agora = Date.now();
            const ultimoTempo = ultimoRegistro ? new Date(ultimoRegistro.data).getTime() : 0;

            if (!ultimoRegistro || agora - ultimoTempo > 60000) {
                const novoRegistro = {
                    data: new Date().toISOString(),
                    usuario: usuario?.nome || 'Usuário',
                    valorAnterior: valorOriginal
                };

                const novoHistorico = [...historicoAtual, novoRegistro];
                onFormChange('defeitoRelatadoHistorico', novoHistorico);
            }
        }
    };

    return (
        <div className="card p-5 space-y-4">
            <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex gap-2 items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-red-500 text-sm">report_problem</span>
                    </div>
                    Defeito Relatado
                </h3>
                <textarea
                    className="input text-sm w-full min-h-[80px] focus:ring-red-200 dark:focus:ring-red-800"
                    placeholder="Descreva o defeito relatado pelo cliente..."
                    value={form.defeitoRelatado || ''}
                    onChange={(e) => {
                        onFormChange('defeitoRelatado', e.target.value);
                        if (e.target.value !== os.defeitoRelatado) {
                            onDirty?.();
                        }
                    }}
                    onBlur={handleBlurDefeito}
                    disabled={os.status === 'finalizada' || os.status === 'cancelada'}
                />

                {/* Histórico */}
                {((form as any).defeitoRelatadoHistorico?.length > 0 || (os as any).defeitoRelatadoHistorico?.length > 0) && (
                    <div className="mt-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">history</span>
                                Última alteração: {(() => {
                                    const historico = (form as any).defeitoRelatadoHistorico || (os as any).defeitoRelatadoHistorico || [];
                                    const ultimo = historico[historico.length - 1];
                                    if (ultimo) {
                                        const data = new Date(ultimo.data);
                                        return `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por ${ultimo.usuario}`;
                                    }
                                    return '';
                                })()}
                            </p>
                            {((form as any).defeitoRelatadoHistorico?.length > 1 || (os as any).defeitoRelatadoHistorico?.length > 1) && (
                                <button
                                    onClick={() => setShowHistoricoDefeito(!showHistoricoDefeito)}
                                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                                >
                                    <span className="material-symbols-outlined text-xs">{showHistoricoDefeito ? 'expand_less' : 'expand_more'}</span>
                                    {showHistoricoDefeito ? 'Ocultar' : 'Ver histórico'}
                                </button>
                            )}
                        </div>

                        {/* Histórico Expandido */}
                        {showHistoricoDefeito && (
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 max-h-40 overflow-y-auto">
                                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-2">Histórico de alterações:</p>
                                <div className="space-y-2">
                                    {[...((form as any).defeitoRelatadoHistorico || (os as any).defeitoRelatadoHistorico || [])].reverse().map((item: any, idx: number) => {
                                        const data = new Date(item.data);
                                        return (
                                            <div key={idx} className="text-[10px] border-l-2 border-gray-300 dark:border-gray-600 pl-2">
                                                <p className="text-gray-500 dark:text-gray-400">
                                                    <span className="font-medium">{data.toLocaleDateString('pt-BR')} {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {' por '}<span className="font-medium text-gray-700 dark:text-gray-300">{item.usuario}</span>
                                                </p>
                                                {item.valorAnterior && (
                                                    <p className="text-gray-400 dark:text-gray-500 italic mt-0.5 truncate" title={item.valorAnterior}>
                                                        Anterior: "{item.valorAnterior.substring(0, 50)}{item.valorAnterior.length > 50 ? '...' : ''}"
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex gap-2 items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-blue-500 text-sm">biotech</span>
                    </div>
                    Diagnóstico Técnico
                </h3>
                <textarea
                    className="input text-sm w-full min-h-[100px] focus:ring-blue-200 dark:focus:ring-blue-800"
                    placeholder="Descreva o que foi constatado..."
                    value={form.defeitoConstatado || ''}
                    onChange={(e) => onFormChange('defeitoConstatado', e.target.value)}
                    disabled={os.status === 'finalizada'}
                />
            </div>

            <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex gap-2 items-center mb-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-gray-500 text-sm">notes</span>
                    </div>
                    Observações
                </h3>
                <textarea
                    className="input text-sm w-full min-h-[80px]"
                    placeholder="Obs. internas..."
                    value={form.observacoes || ''}
                    onChange={(e) => onFormChange('observacoes', e.target.value)}
                />
            </div>
        </div>
    );
};
