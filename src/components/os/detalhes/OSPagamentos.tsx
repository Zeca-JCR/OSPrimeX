import type { OrdemServico } from '../../../types';
import { formatCurrency, formatDateTime } from '../../../lib/utils';
import { CollapsibleSection } from '../../common/CollapsibleSection';

interface OSPagamentosProps {
    os: OrdemServico;
    onRegistrarPagamento: () => void;
}

export const OSPagamentos = ({ os, onRegistrarPagamento }: OSPagamentosProps) => {
    // Calcular totais de pagamento (Logica Local de Visualizacao)
    const pagamentos = os?.pagamentos || [];
    const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    const restante = Math.max(0, (os?.valorTotal || 0) - totalPago);
    const estaQuitado = restante <= 0;

    // Não renderizar se não atende critérios
    if (!((os.status === 'execucao' || os.status === 'finalizada' || (os.status === 'cancelada' && ((os.valorPago || 0) > 0 || (os.valorTotal || 0) > 0))) && (os.valorTotal || 0) > 0)) {
        return null;
    }

    return (
        <CollapsibleSection
            title="Pagamentos"
            icon="payments"
            defaultExpanded={!estaQuitado} // Expandido se há saldo pendente
            persistKey={`os_pagamentos_${os.id}`}
            highlight={restante > 0} // Destaque visual se há pendência
            badge={
                estaQuitado ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        QUITADO
                    </span>
                ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                        {formatCurrency(restante)} pendente
                    </span>
                )
            }
            headerActions={
                restante > 0 && (
                    <button
                        onClick={onRegistrarPagamento}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        Registrar
                    </button>
                )
            }
            className={estaQuitado ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}
        >
            {/* Lista de pagamentos */}
            {pagamentos.length === 0 ? (
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center py-4">
                    Nenhum pagamento registrado
                </p>
            ) : (
                <div className="space-y-2 mb-3">
                    {pagamentos.map((pag) => (
                        <div key={pag.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                            <div>
                                <p className="font-medium text-text-light dark:text-text-dark">
                                    {formatCurrency(pag.valor)}
                                </p>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                    {(pag as any).formaPagamento === 'dinheiro' && '💵 Dinheiro'}
                                    {(pag as any).formaPagamento === 'pix' && '📱 PIX'}
                                    {(pag as any).formaPagamento === 'cartao_credito' && '💳 Cartão Crédito'}
                                    {(pag as any).formaPagamento === 'cartao_debito' && '💳 Cartão Débito'}
                                    {(pag as any).formaPagamento === 'transferencia' && '🏛️ Transferência'}
                                </p>
                            </div>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                {formatDateTime(pag.criadoEm)}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Resumo */}
            <div className="border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">Total da OS</span>
                    <span className="text-text-light dark:text-text-dark">{formatCurrency(os.valorTotal || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">Pago</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(totalPago)}</span>
                </div>
                {restante > 0 && (
                    <div className="flex justify-between text-sm font-semibold">
                        <span className="text-text-light dark:text-text-dark">Restante</span>
                        <span className="text-orange-600 dark:text-orange-400">{formatCurrency(restante)}</span>
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );
};

