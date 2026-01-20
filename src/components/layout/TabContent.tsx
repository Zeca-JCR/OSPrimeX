// @ts-nocheck
// Temporariamente desabilitado até as páginas serem migradas para TSX
import { Suspense, lazy } from 'react';
import { useTabs } from '../../contexts/TabsContext';

// Lazy load dos componentes de conteúdo (JSX ainda não migrados)
const DetalhesOS = lazy(() => import('../../pages/os/DetalhesOS'));
const DetalhesCliente = lazy(() => import('../../pages/clientes/DetalhesCliente'));
const CadastroCliente = lazy(() => import('../../pages/clientes/CadastroCliente'));
const CadastroVeiculo = lazy(() => import('../../pages/veiculos/CadastroVeiculo'));
const CadastroProduto = lazy(() => import('../../pages/estoque/CadastroProduto'));
const CadastroFornecedor = lazy(() => import('../../pages/estoque/CadastroFornecedor'));
const CadastroColaborador = lazy(() => import('../../pages/colaboradores/CadastroColaborador'));
const CadastroUsuario = lazy(() => import('../../pages/usuarios/CadastroUsuario'));
const ConfiguracoesEmpresa = lazy(() => import('../../pages/configuracoes/ConfiguracoesEmpresa'));
const Relatorios = lazy(() => import('../../pages/relatorios/Relatorios'));
const Agenda = lazy(() => import('../../pages/agenda/Agenda'));
const CRMRetencao = lazy(() => import('../../pages/crm/CRMRetencao'));
const ImportarNota = lazy(() => import('../../pages/estoque/ImportarNota'));
const HistoricoEstoque = lazy(() => import('../../pages/estoque/HistoricoEstoque'));
const PedidoReposicao = lazy(() => import('../../pages/estoque/PedidoReposicao'));
const DashboardFinanceiro = lazy(() => import('../../pages/financeiro/DashboardFinanceiro'));

// Componentes de Lista (para abas de listagem)
const KanbanOS = lazy(() => import('../../pages/os/KanbanOS'));
const ListaClientes = lazy(() => import('../../pages/clientes/ListaClientes'));
const ListaVeiculos = lazy(() => import('../../pages/veiculos/ListaVeiculos'));
const ListaProdutos = lazy(() => import('../../pages/estoque/ListaProdutos'));
const ListaColaboradores = lazy(() => import('../../pages/colaboradores/ListaColaboradores'));
const ListaUsuarios = lazy(() => import('../../pages/usuarios/ListaUsuarios'));
const Fornecedores = lazy(() => import('../../pages/estoque/Fornecedores'));

const TabContent = () => {
    const { tabs, activeTabId, closeTab, updateTab } = useTabs();

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

    return (
        <div className={`flex-1 flex flex-col overflow-hidden ${!activeTabId ? 'hidden' : ''}`}>
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    className={`flex-1 flex flex-col overflow-auto ${tab.id === activeTabId ? 'block' : 'hidden'}`}
                >
                    <Suspense fallback={<LoadingFallback />}>
                        {tab.type === 'os' && (
                            <DetalhesOS
                                osId={tab.data?.osId as string}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty: boolean) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title: string) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'cliente-detalhes' && (
                            <DetalhesCliente
                                clienteId={tab.data?.clienteId as string}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                            />
                        )}
                        {tab.type === 'cliente' && (
                            <CadastroCliente
                                clienteId={tab.data?.clienteId as string}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty: boolean) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title: string) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'veiculo' && (
                            <CadastroVeiculo
                                veiculoId={tab.data?.veiculoId as string}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty: boolean) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title: string) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'produto' && (
                            <CadastroProduto
                                produtoId={tab.data?.produtoId as string}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty: boolean) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title: string) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'fornecedor' && (
                            <CadastroFornecedor
                                fornecedorId={tab.data?.fornecedorId as string}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty: boolean) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title: string) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'colaborador' && (
                            <CadastroColaborador
                                colaboradorId={tab.data?.colaboradorId as string}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty: boolean) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title: string) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'usuario' && (
                            <CadastroUsuario
                                usuarioId={tab.data?.usuarioId as string}
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty: boolean) => updateTab(tab.id, { isDirty })}
                                onTitleChange={(title: string) => updateTab(tab.id, { title })}
                            />
                        )}
                        {tab.type === 'configuracoes' && (
                            <ConfiguracoesEmpresa
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                onDirtyChange={(isDirty: boolean) => updateTab(tab.id, { isDirty })}
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
                                openAgendamentoId={tab.data?.openAgendamentoId as string}
                                timestamp={tab.data?.timestamp as number}
                                autoOpenAgendamento={tab.data?.autoOpenAgendamento as boolean}
                                autoOpenTimestamp={tab.data?.autoOpenTimestamp as number}
                            />
                        )}
                        {tab.type === 'crm' && (
                            <CRMRetencao
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                            />
                        )}
                        {tab.type === 'importar_xml' && (
                            <ImportarNota
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                            />
                        )}
                        {tab.type === 'estoque_movimentacoes' && (
                            <HistoricoEstoque
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                            />
                        )}
                        {tab.type === 'estoque_reposicao' && (
                            <PedidoReposicao
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                            />
                        )}
                        {tab.type === 'financeiro' && (
                            <DashboardFinanceiro
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                autoOpenLancamento={tab.data?.autoOpenLancamento as boolean}
                                autoOpenTimestamp={tab.data?.autoOpenTimestamp as number}
                            />
                        )}
                        {/* Abas de Listagem */}
                        {tab.type === 'list-os' && (
                            <KanbanOS
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                                autoOpenNovaOS={tab.data?.autoOpenNovaOS as boolean}
                                autoOpenTimestamp={tab.data?.autoOpenTimestamp as number}
                            />
                        )}
                        {tab.type === 'list-clientes' && (
                            <ListaClientes
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                            />
                        )}
                        {tab.type === 'list-veiculos' && (
                            <ListaVeiculos
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                            />
                        )}
                        {tab.type === 'list-produtos' && (
                            <ListaProdutos
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                            />
                        )}
                        {tab.type === 'list-colaboradores' && (
                            <ListaColaboradores
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                            />
                        )}
                        {tab.type === 'list-usuarios' && (
                            <ListaUsuarios
                                isTabMode={true}
                                onClose={() => closeTab(tab.id)}
                            />
                        )}
                        {tab.type === 'list-fornecedores' && (
                            <Fornecedores
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
