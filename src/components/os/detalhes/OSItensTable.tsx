import type { OrdemServico, ItemOS, ConfigEmpresa } from '../../../types';
import { formatCurrency, calcularResumoFinanceiro } from '../../../lib/utils';
import { useState } from 'react';

interface OSItensTableProps {
    os: OrdemServico;
    configuracoes: ConfigEmpresa | any;
    loading?: boolean;
    onAddItem: () => void;
    onEditItem: (item: ItemOS) => void;
    onRemoveItem: (id: string) => void;
    onUpdateOS: (updates: Partial<OrdemServico>) => void;
    onSalvarModelo: () => void;
    onImportarKit: () => void;
}

export const OSItensTable = ({
    os,
    configuracoes,
    loading,
    onAddItem,
    onEditItem,
    onRemoveItem,
    onUpdateOS,
    onSalvarModelo,
    onImportarKit
}: OSItensTableProps) => {

    const handleToggleIsento = (item: ItemOS) => {
        if (!os.itens) return;
        const novosItens = os.itens.map(i => i.id === (item as any).id ? { ...i, isento: !(i as any).isento } : i);

        const { totalFinal } = calcularResumoFinanceiro(
            novosItens,
            (os as any).descontoGlobalTipo,
            (os as any).descontoGlobalValor,
            (os as any).acrescimoGlobalTipo,
            (os as any).acrescimoGlobalValor
        );

        onUpdateOS({ itens: novosItens, valorTotal: totalFinal });
    };

    const handleUpdateGlobal = (field: string, value: any) => {
        // Preparar novos valores baseados no que mudou
        const updates: any = { [field]: value };

        // Valores atuais (com fallback)
        const currentDescontoTipo = (os as any).descontoGlobalTipo || 'valor';
        const currentDescontoValor = (os as any).descontoGlobalValor || 0;
        const currentAcrescimoTipo = (os as any).acrescimoGlobalTipo || 'valor';
        const currentAcrescimoValor = (os as any).acrescimoGlobalValor || 0;

        // Determinar valores para o cálculo
        const dTipo = field === 'descontoGlobalTipo' ? value : currentDescontoTipo;
        const dValor = field === 'descontoGlobalValor' ? value : currentDescontoValor;
        const aTipo = field === 'acrescimoGlobalTipo' ? value : currentAcrescimoTipo;
        const aValor = field === 'acrescimoGlobalValor' ? value : currentAcrescimoValor;

        const { totalFinal } = calcularResumoFinanceiro(
            os.itens || [],
            dTipo, dValor, aTipo, aValor
        );

        onUpdateOS({ ...updates, valorTotal: totalFinal });
    };

    return (
        <div className="card overflow-hidden border-l-4 border-l-primary shadow-lg shadow-primary/10">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-primary/5 to-transparent">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">monetization_on</span>
                    Itens e Serviços
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {os.itens?.length || 0}
                    </span>
                </h3>

                {os.status !== 'finalizada' && os.status !== 'cancelada' && (
                    <div className="flex items-center gap-2">
                        <button onClick={onSalvarModelo} className="btn-ghost text-xs flex items-center gap-1" title="Salvar Kit">
                            <span className="material-symbols-outlined text-sm">save_as</span> <span className="hidden sm:inline">Salvar Kit</span>
                        </button>
                        <button onClick={onImportarKit} className="btn-ghost text-xs flex items-center gap-1" title="Importar Kit">
                            <span className="material-symbols-outlined text-sm">download</span> <span className="hidden sm:inline">Importar</span>
                        </button>
                        <button onClick={onAddItem} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">add</span> Adicionar
                        </button>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            <th className="px-4 py-3">Descrição</th>
                            <th className="px-4 py-3 text-center w-24">Qtd.</th>
                            <th className="px-4 py-3 text-right w-32">Unitário</th>
                            <th className="px-4 py-3 text-right w-32">Total</th>
                            {os.status !== 'finalizada' && os.status !== 'cancelada' && <th className="px-4 py-3 w-16"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {(!os.itens || os.itens.length === 0) ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 italic">
                                    Nenhum item ou serviço adicionado.
                                </td>
                            </tr>
                        ) : (
                            os.itens.map((item) => (
                                <tr key={(item as any).id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900 dark:text-white">{item.nome}</div>
                                        {/* Cast para any pois valDesconto pode não estar na interface ItemOS padrão */}
                                        {((item as any).valDesconto > 0 || (item as any).valAcrescimo > 0) && (
                                            <div className="text-xs flex gap-2 mt-0.5">
                                                {(item as any).valDesconto > 0 && <span className="text-green-600">-{formatCurrency((item as any).valDesconto)} (Desc.)</span>}
                                                {(item as any).valAcrescimo > 0 && <span className="text-orange-600">+{formatCurrency((item as any).valAcrescimo)} (Acrés.)</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                                        {item.quantidade} {(!(item as any).unidade || (item as any).unidade === 'SV') ? '' : (item as any).unidade}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                                        {formatCurrency(item.precoUnitario)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                        <span className={(item as any).isento ? 'line-through text-gray-400' : ''}>{formatCurrency(item.total)}</span>
                                        {(item as any).isento && <span className="ml-2 text-[10px] uppercase font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Isento</span>}
                                    </td>
                                    {os.status !== 'finalizada' && os.status !== 'cancelada' && (
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleToggleIsento(item)}
                                                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${(item as any).isento ? 'text-purple-600' : 'text-gray-400'}`}
                                                    title={(item as any).isento ? "Cobrar" : "Isentar"}
                                                >
                                                    <span className="material-symbols-outlined text-lg">{(item as any).isento ? 'money_off' : 'attach_money'}</span>
                                                </button>
                                                <button onClick={() => onEditItem(item)} className="p-1.5 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Editar">
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button onClick={() => onRemoveItem((item as any).id)} className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remover">
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>

                    {/* Footer da Tabela (Resumo) */}
                    {(os.itens && os.itens.length > 0) && (
                        <tfoot className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                            {/* Desconto/Acréscimo Global Editável */}
                            {os.status !== 'finalizada' && os.status !== 'cancelada' && ((configuracoes?.descontoNoTotal !== false && configuracoes?.descontoNoTotal !== 'false') || (configuracoes?.acrescimoNoTotal === true || configuracoes?.acrescimoNoTotal === 'true')) && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-3">
                                        <div className="flex justify-end gap-4 items-center">
                                            {(configuracoes?.descontoNoTotal !== false && configuracoes?.descontoNoTotal !== 'false') && (
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs font-semibold uppercase text-gray-500">Desconto Global</label>
                                                    <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm h-8 w-32">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="flex-1 w-full px-2 text-sm bg-transparent outline-none text-right"
                                                            placeholder="0.00"
                                                            value={(os as any).descontoGlobalValor || ''}
                                                            onChange={(e) => handleUpdateGlobal('descontoGlobalValor', e.target.value)}
                                                        />
                                                        <select
                                                            value={(os as any).descontoGlobalTipo || 'valor'}
                                                            onChange={(e) => handleUpdateGlobal('descontoGlobalTipo', e.target.value)}
                                                            className="bg-gray-100 dark:bg-gray-700 border-l border-gray-200 dark:border-gray-700 text-xs px-1 rounded-r-md focus:ring-0"
                                                        >
                                                            <option value="valor">R$</option>
                                                            <option value="porcentagem">%</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                            {(configuracoes?.acrescimoNoTotal === true || configuracoes?.acrescimoNoTotal === 'true') && (
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs font-semibold uppercase text-gray-500">Acréscimo Global</label>
                                                    <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm h-8 w-32">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="flex-1 w-full px-2 text-sm bg-transparent outline-none text-right"
                                                            placeholder="0.00"
                                                            value={(os as any).acrescimoGlobalValor || ''}
                                                            onChange={(e) => handleUpdateGlobal('acrescimoGlobalValor', e.target.value)}
                                                        />
                                                        <select
                                                            value={(os as any).acrescimoGlobalTipo || 'valor'}
                                                            onChange={(e) => handleUpdateGlobal('acrescimoGlobalTipo', e.target.value)}
                                                            className="bg-gray-100 dark:bg-gray-700 border-l border-gray-200 dark:border-gray-700 text-xs px-1 rounded-r-md focus:ring-0"
                                                        >
                                                            <option value="valor">R$</option>
                                                            <option value="porcentagem">%</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Resumo Financeiro Sticky - Fora da tabela para melhor visibilidade */}
            {(os.itens && os.itens.length > 0) && (() => {
                const resumo = calcularResumoFinanceiro(
                    os.itens || [],
                    (os as any).descontoGlobalTipo, (os as any).descontoGlobalValor,
                    (os as any).acrescimoGlobalTipo, (os as any).acrescimoGlobalValor
                );
                return (
                    <div className="sticky bottom-0 bg-gradient-to-t from-gray-100 dark:from-gray-800 to-gray-50 dark:to-gray-800/80 border-t-2 border-primary/30 p-4">
                        <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2">
                            {/* Subtotal */}
                            <div className="text-right">
                                <span className="text-xs text-gray-500 uppercase block">Subtotal</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">{formatCurrency(resumo.somaItens)}</span>
                            </div>

                            {/* Desconto */}
                            {resumo.valDescontoGlobal > 0 && (
                                <div className="text-right">
                                    <span className="text-xs text-green-600 uppercase block">Desconto</span>
                                    <span className="text-sm text-green-600">- {formatCurrency(resumo.valDescontoGlobal)}</span>
                                </div>
                            )}

                            {/* Acréscimo */}
                            {resumo.valAcrescimoGlobal > 0 && (
                                <div className="text-right">
                                    <span className="text-xs text-orange-600 uppercase block">Acréscimo</span>
                                    <span className="text-sm text-orange-600">+ {formatCurrency(resumo.valAcrescimoGlobal)}</span>
                                </div>
                            )}

                            {/* Separador visual */}
                            <div className="hidden sm:block w-px h-8 bg-gray-300 dark:bg-gray-600"></div>

                            {/* Total Principal */}
                            <div className="text-right">
                                <span className="text-xs text-gray-500 uppercase block">Total</span>
                                <span className="text-2xl font-bold text-primary">{formatCurrency(resumo.totalFinal)}</span>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

