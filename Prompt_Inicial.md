Você é uma IA DEV especialista e responsável por criar um SaaS web multi-tenant de Ordem de Serviço para Oficinas Mecânicas e Autocenters, chamado OSPrimeX.
O projeto deve ser iniciado do zero, com foco em:
•	Simplicidade extrema
•	UX intuitiva (anti-suporte)
•	Regras de negócio claras
•	Estrutura SaaS real (mesmo rodando em LocalStorage)
•	Evolução futura sem refatorações pesadas
⚠️ Importante:
Neste MVP, todos os dados devem rodar exclusivamente em localStorage, simulando um banco de dados relacional.
Posteriormente, haverá migração para Supabase, portanto a modelagem deve estar preparada.
Baseado também nas imagens anexas geradas no Stitch, aplique este estilo aos componentes do sistema.
________________________________________
1. OBJETIVO DO PRODUTO
Criar um sistema que permita à oficina:
•	Controlar Ordens de Serviço de veículos
•	Gerenciar clientes, veículos e técnicos
•	Controlar estoque e financeiro
•	Ter visão clara do negócio por meio de relatórios
•	Operar com mínimo suporte humano
O sistema deve “se explicar sozinho”.
________________________________________
2. PÚBLICO-ALVO
•	Oficinas mecânicas
•	Autocenters
•	**Foco:** Pequenas empresas (até 10 usuários)
•	Estruturas enxutas, sem tempo para configurações complexas
O foco principal do usuário é executar serviços com agilidade. O software não deve travar a operação com regras excessivas de capacidade ou burocracia.
________________________________________
3. MODELO SAAS / MULTI-TENANCY
O sistema deve ser multi-empresa (multi-tenant) desde o início.
Regras obrigatórias:
•	Toda entidade pertence a uma empresa (empresaId)
•	Usuários só acessam dados da própria empresa
•	Estrutura pensada para futura migração para banco relacional
White Label Ready: Cores e logo devem ser controlados por variáveis centrais para facilitar a troca de identidade por parceiros.
Mesmo usando localStorage, o sistema deve se comportar como um SaaS real.
________________________________________
4. PLANOS DE ASSINATURA + ADD-ONS (MODELO HÍBRIDO)
🔹 Planos (controle por usuários)
Os planos controlam exclusivamente a quantidade de usuários.
Regra:
👉 Todos os planos incluem o núcleo completo do sistema
👉 A diferença entre planos é apenas o limite de usuários e os add-ons
Planos:
•	Essencial: até 1 usuário
•	Profissional: até 3 usuários
•	Plus: até 5 usuários
•	Usuários extras: acima do limite do plano 
Regras:
•	Bloquear criação acima do limite
•	Exibir mensagem clara ao exceder
⚠️ Não implementar cobrança
⚠️ Apenas simular comportamento
________________________________________
🔹 Add-ons (funcionalidades vendidas à parte)
Add-ons são funcionalidades opcionais ativadas por empresa.
Características:
•	Independentes do plano
•	Ativados/desativados por empresa
•	Controlados via Feature Flags
•	Não afetam limite de usuários
Exemplos de Add-ons:
•	📊 Relatórios Avançados
•	📢 CRM e Retenção
•	🌐 Rastreador Público da OS
•	🧾 Fiscal (futuro)
A UI deve:
•	Ocultar ou bloquear módulos inativos
•	Exibir mensagem explicativa quando desativado
•	Sugestão: Itens de menu/funções de Add-ons não ativos devem aparecer com ícone de "cadeado". Ao clicar, exibir modal com proposta de valor e botão para ativar.
________________________________________
5. USUÁRIOS E PERFIS
Perfis obrigatórios:
•	Admin (dono da oficina)
•	Técnico
•	Financeiro
Regras:
•	Admin cria usuários
•	Respeitar limite do plano
•	Usuários sempre vinculados à empresa
________________________________________
6. CADASTRO DE CLIENTES E VEÍCULOS
Cliente:
•	PF ou PJ
•	Nome / Razão Social
•	CPF / CNPJ
•	Telefone / WhatsApp
•	Endereço com CEP automático
Veículos:
•	Vínculo obrigatório com cliente
•	Marca, Modelo, Placa
•	Ano (opcional)
•	Combustível
•	Cor
•	Quilometragem
•	Renavan
•	Observações
A Ordem de Serviço sempre referencia um veículo.
________________________________________
7. ORDEM DE SERVIÇO (NÚCLEO DO SISTEMA)
Estrutura:
•	Cliente
•	Veículo
•	Técnico responsável
•	Status: Aberta, Em Execução, Finalizada, Cancelada
•	Defeito relatado / constatado
•	Checklist
•	Itens (produtos, serviços ou texto livre)
•	Valor total
•	Status financeiro
•	Fotos (até 5)
Kanban com Regras:
•	Finalizar → baixa estoque + validações
•	Cancelar → sugestão de estorno
•	Execução → exige técnico
•	Reabrir → alerta crítico de estoque e financeiro
________________________________________
8. ESTOQUE
•	Produtos com quantidade
•	Serviços sem estoque
•	Entradas manuais
•	Saídas manuais
•	Saídas automáticas via OS
•	Estorno automático ao cancelar/reabrir
________________________________________
9. FINANCEIRO
•	Recebimentos vinculados à OS
•	Lançamentos manuais
•	Despesas
•	Comissão de técnicos
•	Integridade de dados (inativar ao invés de excluir)
________________________________________
10. AGENDA DE ATENDIMENTOS INTELIGENTE (ÁGIL)
•	Simples e Visual
•	Visão Timeline (Linha do Tempo) por Recurso (Box/Mecânico - Simplificado)
•	Integração Visual com o Pátio: Mostrar OSs em andamento ao lado ou sobre a agenda para evitar conflitos óbvios.
•	Compartilhamento via WhatsApp
•	Foco em agilidade: drag-and-drop, clique rápido.
Sem travas rígidas de capacidade, mas com avisos visuais de "Dia Cheio".
________________________________________
11. RELATÓRIOS
Telas:
1.	Seleção de Relatórios
2.	Configuração (filtros)
3.	Visualização (tabela / gráficos)
Exemplos:
•	Vendas por período
•	Lucratividade por OS
•	Desempenho de técnicos
•	Movimentação de estoque
Exportação:
•	PDF
•	CSV
________________________________________
12. CRM E RETENÇÃO (ADD-ON)
•	Alertas automáticos (tempo sem OS)
•	Alertas manuais (próxima revisão)
•	Templates WhatsApp com variáveis
•	Registro do desfecho do contato
________________________________________
13. RASTREADOR PÚBLICO DA OS (ADD-ON)
•	Link único para cliente
•	Acompanhamento do status
•	Aprovação de orçamento online
•	Feedback em tempo real para a oficina
________________________________________
14. DOCUMENTOS E IMPRESSÃO
•	Orçamento vs OS (automático)
•	PDF padrão
•	Cupom térmico (80mm)
•	QR Code Pix
________________________________________
15. LANDING PAGE OSPRIMEX
Criar uma landing page institucional com:
•	Logo
•	Proposta de valor clara
•	CTA principal
•	Funcionalidades com ícones
•	Depoimentos (mock)
•	Planos/preços (mock)
•	Formulário de contato
Requisitos:
•	Design premium
•	Responsivo
•	Light / Dark Mode
________________________________________
16. PAINEL DO DONO DO SAAS
Painel separado da oficina.
Funcionalidades:
•	Gerenciar empresas
•	Definir planos
•	Ativar/desativar add-ons
•	Bloquear empresas
•	Métricas simples
________________________________________
17. ONBOARDING E ANTI-SUPORTE
•	Tour inicial
•	Checklist guiado
•	Ajuda contextual
•	Textos curtos
•	Linguagem simples
•	Sugestão: Empty States: Telas sem dados devem exibir ilustrações amigáveis e botões de ação clara para o usuário não ficar perdido.
________________________________________
18. STACK TÉCNICA
•	Frontend: React + TailwindCSS
•	SPA
•	Dark Mode
•	Armazenamento: LocalStorage
•	Código preparado para Supabase
•	Documentação em Markdown
________________________________________
REGRA FINAL
Mesmo rodando em LocalStorage:
•	Pensar como SaaS real
•	Modelar como SaaS real
•	Limitar como SaaS real
A única coisa “fake” é o banco. O produto não é.
