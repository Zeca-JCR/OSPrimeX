import React, { Suspense, lazy } from 'react';
import { useTabs } from '../../contexts/TabsContext';

// Lazy load dos componentes de conteúdo
const DetalhesOS = lazy(() => import('../../pages/os/DetalhesOS'));
const CadastroCliente = lazy(() => import('../../pages/clientes/CadastroCliente'));
const CadastroVeiculo = lazy(() => import('../../pages/veiculos/CadastroVeiculo'));
const CadastroProduto = lazy(() => import('../../pages/estoque/CadastroProduto'));
const CadastroFornecedor = lazy(() => import('../../pages/estoque/CadastroFornecedor'));
const CadastroColaborador = lazy(() => import('../../pages/colaboradores/CadastroColaborador'));
const CadastroUsuario = lazy(() => import('../../pages/usuarios/CadastroUsuario'));
const ConfiguracoesEmpresa = lazy(() => import('../../pages/configuracoes/ConfiguracoesEmpresa'));
const Relatorios = lazy(() => import('../../pages/relatorios/Relatorios'));
const Agenda = lazy(() => import('../../pages/agenda/Agenda'));

const TabContent = () => {
    const { tabs, activeTabId, closeTab, updateTab } = useTabs();

    // Se não há abas, não renderiza nada
    if (tabs.length === 0) {
        return null;
    }

    // Renderiza Loading
    const LoadingFallback = () => (
        <div className="flex items-center justify-center h-full">
            <div className="animate-pulse-soft text-primary">
                <span className="material-symbols-outlined text-5xl">sync</span>
            </div>
        </div>
    );

    // IMPORTANTE: Sempre renderiza todas as abas, mesmo quando activeTabId é null
    // Isso preserva o estado dos componentes em memória
    return (
        <div className={`flex-1 flex flex-col overflow-hidden ${!activeTabId ? 'hidden' : ''}`}>
            {/* Renderiza todas as abas, mas só mostra a ativa */}
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    className={`flex-1 flex flex-col overflow-auto ${tab.id === activeTabId ? 'block' : 'hidden'}`}
                >
                    <Suspense fallback={<LoadingFallback />}>
                        {tab.type === 'os' && (
                            <DetalhesOS
                                osId={tab.data?.osId}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'cliente' && (
                            <CadastroCliente
                                clienteId={tab.data?.clienteId}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'veiculo' && (
                            <CadastroVeiculo
                                veiculoId={tab.data?.veiculoId}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'produto' && (
                            <CadastroProduto
                                produtoId={tab.data?.produtoId}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'fornecedor' && (
                            <CadastroFornecedor
                                fornecedorId={tab.data?.fornecedorId}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'colaborador' && (
                            <CadastroColaborador
                                colaboradorId={tab.data?.colaboradorId}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'usuario' && (
                            <CadastroUsuario
                                usuarioId={tab.data?.usuarioId}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'configuracoes' && (
                            <ConfiguracoesEmpresa
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty) => updateTab(tab.id, { isDirty })}
                            />
                        )}
                        {tab.type === 'relatorios' && (
                            <Relatorios
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                            />
                        )}
                        {tab.type === 'agenda' && (
                            <Agenda
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                            />
                        )}
                    </Suspense>
                </div>
            ))}
        </div>
    );
};

export default TabContent;

