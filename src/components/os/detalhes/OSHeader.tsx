import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OrdemServico, Cliente, Veiculo, Empresa, Colaborador, StatusOS } from '../../../types';
import { PrintOSButton, PrintThermalButton } from '../../pdf/PrintButtons';
import { DownloadOSButton, DownloadThermalButton } from '../../pdf/OSDocument';

interface OSHeaderProps {
    os: OrdemServico;
    cliente: Cliente | null;
    veiculo: Veiculo | null;
    empresa: Empresa;
    tecnico?: Colaborador;
    linkRastreavel: { id: string } | null; // Tipagem parcial para o link
    isWindowMode?: boolean;
    isDirty?: boolean;

    // Actions
    onDuplicar: () => void;
    onCompartilhar: (tipo: 'acompanhamento' | 'orcamento' | 'agradecimento' | 'conclusao') => void;
    onAssinar: () => void;
    onMudarStatus: (novoStatus: StatusOS) => void;
    onFinalizar: () => void;
    onAprovarOrcamento: () => void;
    onGerarPix: () => void;
    onExportar: () => void;
    onCancelar: () => void;
    onCopiarLinkRastreio: () => Promise<void>;

    // Window controls
    onMinimize?: () => void;
    onClose?: () => void;
    onConfirmarSaida?: () => void;
}

const statusConfig: Record<StatusOS, { label: string; color: string; icon: string }> = {
    orcamento: { label: 'Orçamento', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: 'receipt_long' },
    aguardando_aprovacao: { label: 'Aguardando Aprovação', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: 'hourglass_empty' }, // Fallback se existir
    aprovada: { label: 'Aprovada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: 'check' }, // Fallback
    aberta: { label: 'Aprovada (Não Iniciada)', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: 'inbox' },
    execucao: { label: 'Em Execução', color: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light', icon: 'engineering' },
    aguardando_peca: { label: 'Aguardando Peça', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: 'inventory_2' },
    finalizada: { label: 'Finalizada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: 'check_circle' },
    entregue: { label: 'Entregue', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: 'check_circle' }, // Fallback
    cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: 'cancel' },
};

export const OSHeader = ({
    os,
    cliente,
    veiculo,
    empresa,
    tecnico,
    linkRastreavel,
    isWindowMode,
    isDirty,
    onDuplicar,
    onCompartilhar,
    onAssinar,
    onMudarStatus,
    onFinalizar,
    onAprovarOrcamento,
    onGerarPix,
    onExportar,
    onCancelar,
    onCopiarLinkRastreio,
    onMinimize,
    onClose,
    onConfirmarSaida
}: OSHeaderProps) => {

    // Garantir que statusAtual nunca seja undefined (fallback para 'orcamento' se status desconhecido)
    const statusAtual = statusConfig[os.status] || statusConfig['orcamento'];

    return (
        <header className="flex-none z-30 bg-surface-light dark:bg-surface-dark border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
                {/* Título */}
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {os.numero ? `OS #${os.numero}` : 'OS Sem Número'}
                            <div className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 border border-transparent ${statusAtual.color}`}>
                                <span className="material-symbols-outlined text-sm">{statusAtual.icon}</span>
                                {statusAtual.label}
                            </div>
                            {/* Badge de Natureza da OS */}
                            {os.tipo && os.tipo !== 'os' && os.tipo !== 'orcamento' && (
                                <span className={`
                                    text-[10px] uppercase font-bold px-2 py-0.5 rounded
                                    ${os.tipo === 'garantia' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : ''}
                                    ${os.tipo === 'cortesia' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' : ''}
                                    ${os.tipo === 'retorno' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : ''}
                                    ${os.tipo === 'interna' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                                `}>
                                    {os.tipo === 'garantia' && '🛡️ Garantia'}
                                    {os.tipo === 'cortesia' && '🎁 Cortesia'}
                                    {os.tipo === 'retorno' && '🔄 Retorno'}
                                    {os.tipo === 'interna' && '🏢 Interna'}
                                </span>
                            )}
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {cliente?.nome || 'Cliente não identificado'} • {veiculo?.placa || 'Sem placa'}
                        </p>
                    </div>
                </div>

                {/* Direita: Ações Principais (Desktop) */}
                <div className="flex items-center gap-2">
                    {/* Ações "Desenterradas" para Desktop */}
                    <div className="hidden lg:flex items-center gap-1 mr-2 border-r border-gray-200 dark:border-gray-700 pr-2">
                        <button
                            onClick={onDuplicar}
                            className="btn-ghost text-xs flex items-center gap-1 text-text-secondary-light dark:text-text-secondary-dark hover:text-primary hover:bg-primary/5 px-2 py-1.5 rounded-md transition-colors"
                            title="Duplicar OS"
                        >
                            <span className="material-symbols-outlined text-lg">content_copy</span>
                            Duplicar
                        </button>

                        <button
                            onClick={() => onCompartilhar('acompanhamento')}
                            className="btn-ghost text-xs flex items-center gap-1 text-text-secondary-light dark:text-text-secondary-dark hover:text-primary hover:bg-primary/5 px-2 py-1.5 rounded-md transition-colors"
                            title="Enviar Link de Rastreio"
                        >
                            <span className="material-symbols-outlined text-lg">share</span>
                            Compartilhar
                        </button>

                        <button
                            onClick={onAssinar}
                            className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-lg">draw</span>
                            Assinar
                        </button>
                    </div>

                    {/* Status Actions (Workflow) - Restored */}
                    <div className="flex items-center gap-2">
                        {/* Tracking Info (Visible for all active OS) */}
                        {os.status !== 'cancelada' && (
                            <div className="hidden lg:flex items-center gap-2 mr-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-500">
                                <span className="flex items-center gap-1" title="Visualizações pelo cliente">
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                    {/* Prop visualizacoes não estava na interface OrdemServico, usando cast seguro ou assumindo que existe no objeto runtime */}
                                    {(os as any).visualizacoes || 0}
                                </span>

                                {linkRastreavel && linkRastreavel.id && (
                                    <a
                                        href={`${window.location.origin}/r/${linkRastreavel.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-primary flex items-center ml-1"
                                        title="Abrir página de rastreio"
                                    >
                                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                                    </a>
                                )}
                                <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                                <button
                                    onClick={onCopiarLinkRastreio}
                                    className="hover:text-primary flex items-center gap-1"
                                    title="Copiar link de rastreio"
                                >
                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                </button>
                            </div>
                        )}

                        {os.status === 'orcamento' && (
                            <>
                                <button
                                    onClick={() => onCompartilhar('orcamento')}
                                    className="btn-ghost text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800"
                                    title="Enviar orçamento para aprovação via WhatsApp"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    <span className="hidden sm:inline">Enviar p/Aprovação</span>
                                </button>
                                <button
                                    onClick={onAprovarOrcamento}
                                    className="btn-ghost text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800"
                                    title="Cliente presente no balcão aprovando verbalmente"
                                >
                                    <span className="material-symbols-outlined">how_to_reg</span>
                                    <span className="hidden sm:inline">Aprovar Manualmente</span>
                                </button>
                            </>
                        )}

                        {os.status === 'aberta' && (
                            <button
                                onClick={() => onMudarStatus('execucao')}
                                className="btn-primary animate-pulse"
                            >
                                <span className="material-symbols-outlined">play_arrow</span>
                                Iniciar Execução
                            </button>
                        )}

                        {os.status === 'execucao' && (
                            <>
                                <button
                                    onClick={() => onMudarStatus('aguardando_peca')}
                                    className="btn-secondary text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:border-orange-800"
                                >
                                    <span className="material-symbols-outlined">pause</span>
                                    <span className="hidden sm:inline">Aguardar Peça</span>
                                </button>
                                <button
                                    onClick={onFinalizar}
                                    className="btn-primary bg-green-600 hover:bg-green-700 border-green-600"
                                >
                                    <span className="material-symbols-outlined">check</span>
                                    Finalizar
                                </button>
                            </>
                        )}

                        {os.status === 'aguardando_peca' && (
                            <button
                                onClick={() => onMudarStatus('execucao')}
                                className="btn-primary"
                            >
                                <span className="material-symbols-outlined">play_arrow</span>
                                Retomar Execução
                            </button>
                        )}

                        {os.status === 'finalizada' && (
                            <>
                                <button
                                    onClick={() => onCompartilhar('agradecimento')}
                                    className="btn-primary bg-indigo-600 hover:bg-indigo-700 border-indigo-600"
                                >
                                    <span className="material-symbols-outlined">sentiment_satisfied</span>
                                    <span className="hidden sm:inline">Agradecer</span>
                                </button>
                                <button
                                    onClick={() => onMudarStatus('aberta')}
                                    className="btn-secondary text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:border-orange-800"
                                >
                                    <span className="material-symbols-outlined">lock_open</span>
                                    <span className="hidden sm:inline">Reabrir</span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Separador visual entre ações de workflow e impressão */}
                    <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    {/* Botões de Impressão */}
                    <PrintOSButton
                        os={os}
                        cliente={cliente}
                        veiculo={veiculo}
                        empresa={empresa}
                        tecnico={tecnico}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark"
                    />
                    <PrintThermalButton
                        os={os}
                        cliente={cliente}
                        veiculo={veiculo}
                        empresa={empresa}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark"
                    />

                    {/* Dropdown Menu (Mobile + Extras) */}
                    <div className="relative group">
                        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark">
                            <span className="material-symbols-outlined">more_vert</span>
                        </button>

                        <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50 animate-scaleIn origin-top-right">
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                {/* Mobile Only Actions */}
                                <div className="lg:hidden">
                                    <button onClick={onDuplicar} className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark">
                                        <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark">content_copy</span> Duplicar
                                    </button>
                                    <button onClick={() => onCompartilhar('acompanhamento')} className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark">
                                        <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark">share</span> Rastreio
                                    </button>
                                    <button onClick={onAssinar} className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark">
                                        <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark">draw</span> Assinar
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                </div>

                                {/* Downloads */}
                                <div className="px-3 py-2">
                                    <p className="text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">Downloads</p>
                                    <div className="flex flex-col gap-1">
                                        <DownloadOSButton
                                            os={os}
                                            cliente={cliente}
                                            veiculo={veiculo}
                                            empresa={empresa}
                                            tecnico={tecnico}
                                            className="w-full text-left flex items-center gap-2 text-sm text-text-light dark:text-text-dark hover:text-primary"
                                        />
                                        <DownloadThermalButton
                                            os={os}
                                            cliente={cliente}
                                            veiculo={veiculo}
                                            empresa={empresa}
                                            className="w-full text-left flex items-center gap-2 text-sm text-text-light dark:text-text-dark hover:text-primary"
                                        />
                                    </div>
                                </div>

                                {/* Export / Pix */}
                                {os.status === 'finalizada' && (
                                    <>
                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                        <button onClick={onExportar} className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark">
                                            <span className="material-symbols-outlined text-lg text-text-secondary-light dark:text-text-secondary-dark">data_object</span> Exportar JSON
                                        </button>
                                        <button onClick={onGerarPix} className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-text-light dark:text-text-dark">
                                            <span className="material-symbols-outlined text-lg text-blue-500">pix</span> Receber PIX
                                        </button>
                                    </>
                                )}

                                {/* Danger Zone - Cancelar (para todos os status exceto cancelada) */}
                                {os.status !== 'cancelada' && <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />}

                                {os.status !== 'cancelada' && (
                                    <button onClick={onCancelar} className="w-full p-3 text-left hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 flex items-center gap-3 text-sm">
                                        <span className="material-symbols-outlined text-lg">cancel</span>
                                        Cancelar OS
                                        {os.status === 'finalizada' && (
                                            <span className="ml-auto text-[10px] bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded font-bold">ESTORNO</span>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Window Controls */}
                    {isWindowMode && (
                        <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-2 ml-1">
                            <button onClick={onMinimize} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark">
                                <span className="material-symbols-outlined">remove</span>
                            </button>
                            <button
                                onClick={() => isDirty && onConfirmarSaida ? onConfirmarSaida() : onClose?.()}
                                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-text-secondary-light dark:text-text-secondary-dark hover:text-red-500"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
