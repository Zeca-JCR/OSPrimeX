import type { OrdemServico, ItemOS } from '../../../types';
import { formatCurrency } from '../../../lib/utils';

interface OSActionsFooterProps {
    os: OrdemServico;
    form: { itens?: ItemOS[] };
    isDirty: boolean;
    salvando: boolean;
    onSalvar: () => void;
    onCancelar: () => void;
}

export const OSActionsFooter = ({
    os,
    form,
    isDirty,
    salvando,
    onSalvar,
    onCancelar
}: OSActionsFooterProps) => {

    // Calcular totais por tipo (Visualização)
    const totalProdutos = (form.itens || [])
        .filter(item => (item as any).tipo === 'produto' && !(item as any).isento)
        .reduce((acc, item) => acc + (item.total || 0), 0);

    const totalServicos = (form.itens || [])
        .filter(item => (item as any).tipo === 'servico' && !(item as any).isento)
        .reduce((acc, item) => acc + (item.total || 0), 0);

    return (
        <div className="p-3 bg-surface-light dark:bg-surface-dark border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] z-[5000] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex-none">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                {/* Resumo Financeiro - Totais por Tipo */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-text-secondary-light dark:text-text-secondary-dark">inventory_2</span>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Produtos:</span>
                        <span className="text-sm font-semibold text-text-light dark:text-text-dark">
                            {formatCurrency(totalProdutos)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-text-secondary-light dark:text-text-secondary-dark">build</span>
                        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Serviços:</span>
                        <span className="text-sm font-semibold text-text-light dark:text-text-dark">
                            {formatCurrency(totalServicos)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
                        <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Total:</span>
                        <span className="text-lg font-bold text-primary">
                            {formatCurrency(os.valorTotal || 0)}
                        </span>
                    </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancelar}
                        className="btn-secondary px-4"
                    >
                        <span className="material-symbols-outlined">close</span>
                        Cancelar
                    </button>
                    <button
                        onClick={onSalvar}
                        className={`btn-primary px-6 ${isDirty && os.status !== 'finalizada' && os.status !== 'cancelada' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                        disabled={!isDirty || salvando || os.status === 'finalizada' || os.status === 'cancelada'}
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
        </div>
    );
};
