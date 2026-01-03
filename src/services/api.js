
/**
 * Serviço de API para consultas externas (CNPJ, CEP, etc)
 */

/**
 * Consulta dados de um CNPJ na BrasilAPI
 * @param {string} cnpj - CNPJ apenas números ou formatado
 * @returns {Promise<Object>} Dados da empresa ou erro
 */
export const consultarCNPJ = async (cnpj) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) {
        throw new Error('CNPJ inválido (deve ter 14 dígitos)');
    }

    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);

        if (!response.ok) {
            if (response.status === 404) throw new Error('CNPJ não encontrado');
            if (response.status === 429) throw new Error('Muitas requisições. Tente novamente em instantes.');
            throw new Error('Erro ao consultar CNPJ');
        }

        const data = await response.json();
        return {
            nome: data.razao_social,
            nomeFantasia: data.nome_fantasia,
            email: data.email,
            telefone: data.ddd_telefone_1,
            endereco: {
                cep: data.cep,
                logradouro: data.logradouro,
                numero: data.numero,
                complemento: data.complemento,
                bairro: data.bairro,
                cidade: data.municipio,
                estado: data.uf
            }
        };
    } catch (error) {
        console.error('Erro na consulta CNPJ:', error);
        throw error;
    }
};

/**
 * Consulta dados de um CEP (encapsula ViaCEP/BrasilAPI)
 * @param {string} cep 
 * @returns {Promise<Object>} Endereço completo
 */
export const consultarCEP = async (cep) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) {
        throw new Error('CEP inválido');
    }

    try {
        // Usando BrasilAPI CEP v2 que é mais robusta e unifica fontes
        // Fallback para ViaCEP se preferir, mas BrasilAPI v2 ja consulta ViaCEP
        const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCEP}`);

        if (!response.ok) {
            // Tentativa direta no ViaCEP se BrasilAPI falhar
            const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
            if (!viaCepResponse.ok) throw new Error('CEP não encontrado');

            const viaCepData = await viaCepResponse.json();
            if (viaCepData.erro) throw new Error('CEP não encontrado');

            return {
                cep: viaCepData.cep,
                logradouro: viaCepData.logradouro,
                bairro: viaCepData.bairro,
                cidade: viaCepData.localidade,
                estado: viaCepData.uf
            };
        }

        const data = await response.json();
        return {
            cep: data.cep,
            logradouro: data.street,
            bairro: data.neighborhood,
            cidade: data.city,
            estado: data.state
        };
    } catch (error) {
        console.error('Erro na consulta CEP:', error);
        throw error;
    }
};
