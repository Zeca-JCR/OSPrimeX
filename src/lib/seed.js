/**
 * OSPrimeX - Dados de Demonstração (Seed)
 * 
 * Carrega dados iniciais para facilitar testes e demonstrações.
 * Os dados são em PT-BR conforme solicitado.
 */

import storage from './storage';

const SEED_KEY = 'osprimex_seed_loaded';

export const seedDatabase = async () => {
    // Colaboradores demo (Definição para uso em migração e seed)
    const colaboradoresDemo = [
        {
            id: 'colab_001',
            empresaId: 'emp_demo_001',
            nome: 'Marcos Silva',
            cargo: 'tecnico',
            comissao: 10,
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
        {
            id: 'colab_002',
            empresaId: 'emp_demo_001',
            nome: 'Pedro Oliveira',
            cargo: 'tecnico',
            comissao: 10,
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
        {
            id: 'colab_003',
            empresaId: 'emp_demo_001',
            nome: 'Ana Souza',
            cargo: 'atendente',
            comissao: 0,
            ativo: true,
            criadoEm: new Date().toISOString(),
        }
    ];

    // MIGRAÇÃO: Verifica se colaboradores existem, se não, adiciona (independente do seed principal)
    if (!localStorage.getItem('osprimex_colaboradores')) {
        localStorage.setItem('osprimex_colaboradores', JSON.stringify(colaboradoresDemo));
        console.log('👷 Colaboradores demo adicionados via migração!');
    }

    // Super Admin (Definição para uso em migração e seed)
    const superAdminDemo = {
        id: 'usr_superadmin',
        empresaId: 'emp_demo_001',
        nome: 'Super Admin',
        email: 'master@osprimex.com',
        senha: 'admin',
        perfil: 'superadmin',
        ativo: true,
        criadoEm: new Date().toISOString(),
    };

    // MIGRAÇÃO: Garantir que Super Admin exista
    const usuariosAtuaisRaw = localStorage.getItem('osprimex_usuarios');
    if (usuariosAtuaisRaw) {
        const usuariosAtuais = JSON.parse(usuariosAtuaisRaw);
        if (!usuariosAtuais.find(u => u.perfil === 'superadmin')) {
            usuariosAtuais.push(superAdminDemo);
            localStorage.setItem('osprimex_usuarios', JSON.stringify(usuariosAtuais));
            console.log('👷 Super Admin adicionado via migração!');
        }
    }

    // Evita carregar seed múltiplas vezes (Seed Principal)
    if (localStorage.getItem(SEED_KEY)) {
        return false;
    }

    // Empresa demo
    const empresaDemo = {
        id: 'emp_demo_001',
        razaoSocial: 'Auto Center Demo Ltda',
        nomeFantasia: 'Auto Center Demo',
        cnpj: '12.345.678/0001-90',
        telefone: '(11) 3456-7890',
        whatsapp: '(11) 95555-4444',
        email: 'contato@autocenterdemo.com.br',
        endereco: {
            cep: '01310-100',
            logradouro: 'Av. Paulista',
            numero: '1000',
            complemento: 'Sala 101',
            bairro: 'Bela Vista',
            cidade: 'São Paulo',
            estado: 'SP',
        },
        plano: 'profissional',
        limiteUsuarios: 3,
        addons: ['crm'],
        ativo: true,
        criadoEm: new Date().toISOString(),
    };

    // Usuário admin demo
    const adminDemo = {
        id: 'usr_admin_001',
        empresaId: 'emp_demo_001',
        nome: 'Admin Demo',
        email: 'admin@demo.com',
        senha: 'demo123', // Em produção, seria hash
        perfil: 'admin',
        ativo: true,
        criadoEm: new Date().toISOString(),
    };

    // Técnico demo
    const tecnicoDemo = {
        id: 'usr_tecnico_001',
        empresaId: 'emp_demo_001',
        nome: 'Carlos Mecânico',
        email: 'carlos@demo.com',
        senha: 'demo123',
        perfil: 'tecnico',
        comissao: 10, // 10%
        ativo: true,
        criadoEm: new Date().toISOString(),
    };

    // Clientes demo
    const clientesDemo = [
        {
            id: 'cli_001',
            empresaId: 'emp_demo_001',
            tipo: 'pf',
            nome: 'João da Silva',
            documento: '123.456.789-00',
            telefone: '(11) 99999-9999',
            whatsapp: '(11) 99999-9999',
            email: 'joao@email.com',
            endereco: {
                cep: '01310-000',
                logradouro: 'Rua Augusta',
                numero: '100',
                bairro: 'Consolação',
                cidade: 'São Paulo',
                estado: 'SP',
            },
            observacoes: 'Cliente desde 2020. Prefere atendimento no período da manhã.',
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
        {
            id: 'cli_002',
            empresaId: 'emp_demo_001',
            tipo: 'pj',
            nome: 'Transportadora Rápida Ltda',
            documento: '98.765.432/0001-10',
            telefone: '(11) 3333-4444',
            whatsapp: '(11) 98888-7777',
            email: 'contato@rapida.com.br',
            endereco: {
                cep: '03310-000',
                logradouro: 'Rua das Indústrias',
                numero: '500',
                bairro: 'Mooca',
                cidade: 'São Paulo',
                estado: 'SP',
            },
            observacoes: 'Frota de 15 veículos. Contrato de manutenção preventiva.',
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
        {
            id: 'cli_003',
            empresaId: 'emp_demo_001',
            tipo: 'pf',
            nome: 'Maria Oliveira',
            documento: '987.654.321-00',
            telefone: '(21) 98888-8888',
            whatsapp: '(21) 98888-8888',
            email: 'maria@email.com',
            endereco: {
                cep: '22041-080',
                logradouro: 'Av. Nossa Senhora de Copacabana',
                numero: '200',
                bairro: 'Copacabana',
                cidade: 'Rio de Janeiro',
                estado: 'RJ',
            },
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
    ];

    // Veículos demo
    const veiculosDemo = [
        {
            id: 'vei_001',
            empresaId: 'emp_demo_001',
            clienteId: 'cli_001',
            marca: 'Volkswagen',
            modelo: 'Golf GTI',
            placa: 'ABC-1234',
            ano: 2021,
            cor: 'Branco',
            combustivel: 'Gasolina',
            km: 45000,
            renavam: '12345678901',
            observacoes: 'Veículo em bom estado',
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
        {
            id: 'vei_002',
            empresaId: 'emp_demo_001',
            clienteId: 'cli_001',
            marca: 'Honda',
            modelo: 'Civic',
            placa: 'DEF-5678',
            ano: 2019,
            cor: 'Prata',
            combustivel: 'Flex',
            km: 72000,
            renavam: '98765432101',
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
        {
            id: 'vei_003',
            empresaId: 'emp_demo_001',
            clienteId: 'cli_002',
            marca: 'Mercedes-Benz',
            modelo: 'Sprinter',
            placa: 'GHI-9012',
            ano: 2020,
            cor: 'Branco',
            combustivel: 'Diesel',
            km: 120000,
            renavam: '11122233344',
            observacoes: 'Veículo comercial - revisar freios a cada 20.000km',
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
    ];

    // Produtos demo (estoque)
    const produtosDemo = [
        {
            id: 'prod_001',
            empresaId: 'emp_demo_001',
            tipo: 'produto',
            nome: 'Óleo Motor 5W30 Sintético',
            descricao: 'Óleo sintético de alta performance',
            unidade: 'L',
            precoCusto: 35.00,
            precoVenda: 55.00,
            quantidade: 50,
            estoqueMinimo: 10,
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
        {
            id: 'prod_002',
            empresaId: 'emp_demo_001',
            tipo: 'produto',
            nome: 'Filtro de Óleo Universal',
            descricao: 'Filtro de óleo compatível com diversas marcas',
            unidade: 'UN',
            precoCusto: 18.00,
            precoVenda: 35.00,
            quantidade: 30,
            estoqueMinimo: 5,
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
        {
            id: 'prod_003',
            empresaId: 'emp_demo_001',
            tipo: 'produto',
            nome: 'Pastilha de Freio Dianteira',
            descricao: 'Jogo de pastilhas de freio dianteiras',
            unidade: 'JG',
            precoCusto: 85.00,
            precoVenda: 150.00,
            quantidade: 15,
            estoqueMinimo: 3,
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
        {
            id: 'serv_001',
            empresaId: 'emp_demo_001',
            tipo: 'servico',
            nome: 'Troca de Óleo',
            descricao: 'Serviço de troca de óleo com verificação de níveis',
            unidade: 'SV',
            precoVenda: 80.00,
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
        {
            id: 'serv_002',
            empresaId: 'emp_demo_001',
            tipo: 'servico',
            nome: 'Alinhamento e Balanceamento',
            descricao: 'Alinhamento de direção e balanceamento das 4 rodas',
            unidade: 'SV',
            precoVenda: 120.00,
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
        {
            id: 'serv_003',
            empresaId: 'emp_demo_001',
            tipo: 'servico',
            nome: 'Diagnóstico Eletrônico',
            descricao: 'Leitura de códigos de erro via scanner OBD2',
            unidade: 'SV',
            precoVenda: 100.00,
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
    ];

    // Ordens de Serviço demo
    const ordensDemo = [
        {
            id: 'os_001',
            empresaId: 'emp_demo_001',
            numero: 1001,
            clienteId: 'cli_001',
            veiculoId: 'vei_001',
            tecnicoId: 'usr_tecnico_001',
            status: 'aberta',
            defeitoRelatado: 'Veículo apresentando luz de óleo no painel',
            defeitoConstatado: '',
            checklist: [],
            itens: [],
            valorTotal: 0,
            statusFinanceiro: 'pendente',
            fotos: [],
            observacoes: '',
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
        {
            id: 'os_002',
            empresaId: 'emp_demo_001',
            numero: 1002,
            clienteId: 'cli_002',
            veiculoId: 'vei_003',
            tecnicoId: 'usr_tecnico_001',
            status: 'execucao',
            defeitoRelatado: 'Ruído nos freios',
            defeitoConstatado: 'Pastilhas de freio gastas',
            checklist: [
                { item: 'Nível de óleo', ok: true },
                { item: 'Pneus', ok: true },
                { item: 'Freios', ok: false },
            ],
            itens: [
                { produtoId: 'prod_003', nome: 'Pastilha de Freio Dianteira', quantidade: 1, precoUnitario: 150, total: 150 },
                { produtoId: 'serv_001', nome: 'Mão de Obra - Troca de Pastilha', quantidade: 1, precoUnitario: 100, total: 100 },
            ],
            valorTotal: 250,
            statusFinanceiro: 'pendente',
            fotos: [],
            observacoes: 'Cliente solicitou prioridade',
            ativo: true,
            criadoEm: new Date().toISOString(),
        },
    ];

    // Salvar dados no localStorage (Seed Principal)
    localStorage.setItem('osprimex_empresas', JSON.stringify([empresaDemo]));
    localStorage.setItem('osprimex_usuarios', JSON.stringify([adminDemo, tecnicoDemo, superAdminDemo]));
    localStorage.setItem('osprimex_clientes', JSON.stringify(clientesDemo));
    localStorage.setItem('osprimex_veiculos', JSON.stringify(veiculosDemo));
    localStorage.setItem('osprimex_produtos', JSON.stringify(produtosDemo));
    localStorage.setItem('osprimex_ordens_servico', JSON.stringify(ordensDemo));
    // Colaboradores já foram tratados no início da função (migração)

    // Feature flags padrão
    localStorage.setItem('osprimex_feature_flags', JSON.stringify([
        { empresaId: 'emp_demo_001', feature: 'crm', ativo: true },
        { empresaId: 'emp_demo_001', feature: 'rastreador_publico', ativo: false },
        { empresaId: 'emp_demo_001', feature: 'relatorios_avancados', ativo: false },
    ]));

    // Marcar seed como carregado
    localStorage.setItem(SEED_KEY, 'true');

    console.log('🌱 Dados de demonstração carregados com sucesso!');
    return true;
};

export const resetSeed = () => {
    localStorage.removeItem(SEED_KEY);
    storage.clearAllData();
    return seedDatabase();
};

export const seedGraficoKM = async (empresaId) => {
    try {
        const timestamp = new Date().toISOString();
        const generateId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // 1. Criar Cliente
        const cliente = {
            id: `cli_grafico_${Date.now()}`,
            empresaId,
            nome: 'Cliente Demonstração Gráfico',
            telefone: '(11) 99999-0000',
            email: 'grafico@demo.com',
            tipo: 'pf',
            ativo: true,
            criadoEm: timestamp,
            atualizadoEm: timestamp
        };

        // 2. Criar Veículo
        const veiculo = {
            id: `vei_grafico_${Date.now()}`,
            empresaId,
            clienteId: cliente.id,
            marca: 'Chevrolet',
            modelo: 'Onix Plus',
            placa: 'TEST-' + Math.floor(Math.random() * 9000 + 1000),
            ano: '2022',
            cor: 'Prata',
            combustivel: 'flex',
            km: 55000,
            ativo: true,
            criadoEm: timestamp,
            atualizadoEm: timestamp
        };

        // 3. Gerar Histórico de OS (últimos 6 meses)
        const ordens = [];
        const meses = 6;
        let kmAtual = 40000;
        let dataAtual = new Date();
        dataAtual.setMonth(dataAtual.getMonth() - meses);

        for (let i = 0; i < meses; i++) {
            // Avançar 1 mês
            dataAtual.setMonth(dataAtual.getMonth() + 1);
            // Avançar KM (~2500km/mês)
            kmAtual += 2500 + Math.floor(Math.random() * 500);

            ordens.push({
                id: generateId(),
                numero: 9000 + i,
                empresaId,
                clienteId: cliente.id,
                veiculoId: veiculo.id,
                tecnicoId: null,
                status: 'finalizada',
                tipo: 'os',
                defeitoRelatado: `Revisão periódica ${i + 1}`,
                defeitoConstatado: '',
                kmAtual: kmAtual.toString(), // Salva o KM na OS
                itens: [],
                valorTotal: 300,
                statusFinanceiro: 'pago',
                criadoEm: dataAtual.toISOString(),
                ativo: true
            });
        }

        // Atualizar KM do veículo para o último
        veiculo.km = kmAtual + 500; // Um pouco mais que a última OS

        // Salvar tudo
        const clientes = await storage.getAll('clientes');
        const veiculos = await storage.getAll('veiculos');
        const oss = await storage.getAll('ordens_servico');

        clientes.push(cliente);
        veiculos.push(veiculo);
        ordens.forEach(o => oss.push(o));

        localStorage.setItem('osprimex_clientes', JSON.stringify(clientes));
        localStorage.setItem('osprimex_veiculos', JSON.stringify(veiculos));
        localStorage.setItem('osprimex_ordens_servico', JSON.stringify(oss));

        return veiculo.id;
    } catch (error) {
        console.error('Erro ao gerar dados gráfico:', error);
        return null;
    }
};

export default { seedDatabase, resetSeed, seedGraficoKM };
