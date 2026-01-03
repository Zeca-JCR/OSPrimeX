# OSPrimeX

Sistema SaaS multi-tenant de Ordem de Serviço para Oficinas Mecânicas e Autocenters.

## 🚀 Tecnologias

- **Frontend**: React 18 + Vite
- **Estilização**: TailwindCSS 3
- **Roteamento**: React Router DOM
- **Armazenamento**: LocalStorage (Simulação de Backend/Supabase)
- **Integrações**: BrasilAPI (CEP e CNPJ), WhatsApp (Links dinâmicos)
- **Ícones**: Google Material Symbols
- **PDF**: React-PDF

## 📋 Funcionalidades

### 🏢 Core (Essencial)
- ✅ **Autenticação** - Login com persistência e multi-tenant
- ✅ **Dashboard** - Estatísticas vitais (Faturamento, OSs, Ticket Médio)
- ✅ **Clientes** - Cadastro PF/PJ, Busca automática de CEP e CNPJ
- ✅ **Veículos** - Vínculo com clientes, Validação de Placas (Mercosul/Antiga)
- ✅ **Ordens de Serviço** - Kanban drag-and-drop, Checklist, Fotos, Impressão PDF (com Logo da empresa)
- ✅ **Estoque** - Produtos, Serviços, Controle de Fornecedores e Reposição
- ✅ **Financeiro** - Fluxo de caixa, Contas a Pagar/Receber, Relatórios

### 🚀 Add-ons e Diferenciais
- ✅ **Painel Admin SaaS** - Gestão de empresas, planos e assinaturas (Superadmin)
- ✅ **CRM & Retenção** - Identificação de clientes inativos, Aniversariantes, Campanhas em massa via WhatsApp
- ✅ **Configurações da Empresa** - Personalização, Upload de Logo (Base64), Chave PIX
- ✅ **Rastreador Público** - Link para cliente acompanhar status da OS em tempo real
- ✅ **Relatórios Avançados** - Gráficos e exportação de dados
- ✅ **White Label** - Tema Adaptável (Dark/Light) e cores personalizáveis por tenant

## 🛠️ Instalação

```bash
# Clonar repositório
git clone <url-do-repositorio>
cd osprimex

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## 🔑 Credenciais Demo

> **Nota:** O sistema utiliza `localStorage` para persistir dados. Ao rodar pela primeira vez, os dados de exemplo (seed) serão carregados.

### Acesso da Oficina (Tenant)
- **Email**: admin@demo.com
- **Senha**: demo123

### Acesso Super Admin (SaaS)
- **Email**: superadmin@osprimex.com
- **Senha**: admin123

## 📁 Estrutura do Projeto

```
src/
├── components/     # Componentes reutilizáveis (Layout, UI, PDF, Modais)
├── contexts/       # Gerenciamento de estado global (Auth, Tenant, Theme)
├── lib/            # Utilitários, Storage Service, Hooks, Seed Data
├── pages/          # Páginas da aplicação (Rotas)
│   ├── admin/      # Painel do Super Admin
│   ├── clientes/   # Gestão de Clientes
│   ├── crm/        # Módulo de CRM
│   ├── os/         # Ordens de Serviço
│   └── ...
├── services/       # Integrações externas (BrasilAPI)
└── index.css       # Estilos globais e Configuração Tailwind
```

## 🎨 Personalização

O sistema suporta personalização de marca através das configurações da empresa.
- **Logo**: Upload via configurações (persistido em Base64).
- **Cores**: As cores primárias são ajustáveis via variáveis CSS controladas pelo `ThemeContext`.

## 🔧 Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Gera build de produção otimizado |
| `npm run preview` | Visualiza o build localmente |

## 📝 Licença

Projeto privado - Todos os direitos reservados.
