/**
 * Utilitários gerais do OSPrimeX
 */

/**
 * Formata CPF ou CNPJ
 */
export const formatDocumento = (doc) => {
    if (!doc) return '';
    const numbers = doc.replace(/\D/g, '');
    if (numbers.length === 11) {
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (numbers.length === 14) {
        return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
};

/**
 * Formata Placa Veicular
 * Padrão Antigo: ABC1234 -> ABC-1234
 * Padrão Mercosul: ABC1D23 -> ABC1D23
 */
export const formatPlaca = (placa) => {
    if (!placa) return '';
    const clean = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Padrão antigo: 3 Letras + 4 Números
    if (/^[A-Z]{3}\d{4}$/.test(clean)) {
        return clean.replace(/^([A-Z]{3})(\d{4})$/, '$1-$2');
    }

    // Padrão Mercosul: 3 Letras + 1 Número + 1 Letra + 2 Números
    // Retorna limpo (sem hífen)
    return clean;
};

/**
 * Formata telefone
 */
export const formatTelefone = (tel) => {
    if (!tel) return '';
    const numbers = tel.replace(/\D/g, '');
    if (numbers.length === 11) {
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    if (numbers.length === 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return tel;
};

/**
 * Formata valor em reais
 */
export const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

/**
 * Parse seguro de datas para evitar problemas de timezone (UTC)
 * Garante que strings YYYY-MM-DD sejam interpretadas como dia local (00:00)
 * @param {string|Date} date - String de data ou objeto Date
 * @returns {Date} Objeto Date
 */
export const parseDateLocal = (date) => {
    if (!date) return new Date();

    // Se for objeto Date, retornar clone
    if (date instanceof Date) return new Date(date);

    // Se for string
    if (typeof date === 'string') {
        // Se for string YYYY-MM-DD exata (comum em inputs type="date" e armazenamento manual)
        // O construtor new Date('YYYY-MM-DD') cria como UTC, o que causa recuo de dia no Brasil (-3h)
        // Aqui dividimos e criamos manualmente com o ano, mês e dia locais
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const [year, month, day] = date.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        // Outros formatos (ISO com hora, etc) geralmente o browser lida bem
        return new Date(date);
    }

    return new Date();
};

/**
 * Verifica se duas datas são o mesmo dia
 */
export const isSameDay = (date1, date2) => {
    const d1 = parseDateLocal(date1);
    const d2 = parseDateLocal(date2);
    return d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();
};

/**
 * Formata data no padrão brasileiro
 */
export const formatDate = (date) => {
    if (!date) return '';
    const d = parseDateLocal(date);
    return d.toLocaleDateString('pt-BR');
};

/**
 * Formata data e hora
 */
export const formatDateTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('pt-BR');
};



/**
 * Retorna string YYYY-MM-DD usando horário local (evita UTC do toISOString)
 */
export const toISODate = (date) => {
    if (!date) return '';
    const d = parseDateLocal(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Valida CPF
 */
export const validaCPF = (cpf) => {
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return false;
    if (/^(\d)\1+$/.test(numbers)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(numbers.charAt(i)) * (10 - i);
    }
    let check = 11 - (sum % 11);
    if (check === 10 || check === 11) check = 0;
    if (check !== parseInt(numbers.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(numbers.charAt(i)) * (11 - i);
    }
    check = 11 - (sum % 11);
    if (check === 10 || check === 11) check = 0;
    if (check !== parseInt(numbers.charAt(10))) return false;

    return true;
};

/**
 * Valida CNPJ
 */
export const validaCNPJ = (cnpj) => {
    const numbers = cnpj.replace(/\D/g, '');
    if (numbers.length !== 14) return false;
    if (/^(\d)\1+$/.test(numbers)) return false;

    let size = numbers.length - 2;
    let nums = numbers.substring(0, size);
    const digits = numbers.substring(size);
    let sum = 0;
    let pos = size - 7;

    for (let i = size; i >= 1; i--) {
        sum += parseInt(nums.charAt(size - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    size++;
    nums = numbers.substring(0, size);
    sum = 0;
    pos = size - 7;

    for (let i = size; i >= 1; i--) {
        sum += parseInt(nums.charAt(size - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
};

/**
 * Gera iniciais do nome
 */
export const getIniciais = (nome) => {
    if (!nome) return '';
    const parts = nome.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Cores para badges de status
 */
export const statusColors = {
    aberta: 'badge-info',
    execucao: 'badge-warning',
    finalizada: 'badge-success',
    cancelada: 'badge-error',
};

export const statusLabels = {
    aberta: 'Aprovada (Não Iniciada)',
    execucao: 'Em Execução',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
};

/**
 * Debounce function
 */
export const debounce = (fn, ms = 300) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
};

/**
 * Classnames helper (similar ao clsx)
 */
export const cn = (...classes) => {
    return classes.filter(Boolean).join(' ');
};

/**
 * Valida placa de veículo (padrão antigo e Mercosul)
 * @param {string} placa - Placa para validar
 * @returns {object} { valida: boolean, modelo: string, formatada: string }
 */
export const validarPlaca = (placa) => {
    if (!placa) return { valida: false, modelo: null, formatada: '' };

    // Remove caracteres especiais e coloca em maiúsculo
    const limpa = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Regex Padrão Antigo: 3 letras e 4 números (Ex: ABC1234)
    // Era comum ter hífen, mas já removemos no replace
    const regexAntiga = /^[A-Z]{3}[0-9]{4}$/;

    // Regex Padrão Mercosul: 3 letras, 1 número, 1 letra, 2 números (Ex: ABC1D23)
    const regexMercosul = /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/;

    if (regexAntiga.test(limpa)) {
        return {
            valida: true,
            modelo: 'Cinza (Antiga)',
            formatada: `${limpa.slice(0, 3)}-${limpa.slice(3)}`
        };
    }

    if (regexMercosul.test(limpa)) {
        return {
            valida: true,
            modelo: 'Mercosul',
            formatada: limpa
        };
    }

    return {
        valida: false,
        modelo: null,
        formatada: limpa
    };
};

/**
 * Calcula o tempo útil de trabalho em milissegundos entre duas datas,
 * considerando horário comercial e intervalo de almoço.
 * @param {Date} start Data de início
 * @param {Date} end Data de fim
 * @param {Object} config Configurações (horarioTrabalhoInicio, horarioTrabalhoFim, etc)
 */
export const calculateWorkingTime = (start, end, config) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (startDate >= endDate) return 0;

    // Se não tiver config, retorna diferença bruta
    if (!config || !config.horarioTrabalhoInicio) return endDate - startDate;

    const parseTime = (timeStr) => {
        if (!timeStr) return { h: 0, m: 0 };
        const [h, m] = timeStr.split(':').map(Number);
        return { h, m };
    };

    const workStart = parseTime(config.horarioTrabalhoInicio || '08:00');
    const workEnd = parseTime(config.horarioTrabalhoFim || '18:00');
    const lunchStart = parseTime(config.horarioAlmocoInicio || '12:00');
    const lunchEnd = parseTime(config.horarioAlmocoFim || '13:00');

    // Configurações de sábado
    const trabalhaSabado = config.trabalhaSabado === true;
    const sabadoStart = parseTime(config.horarioSabadoInicio || '08:00');
    const sabadoEnd = parseTime(config.horarioSabadoFim || '12:00');

    let totalMs = 0;
    let current = new Date(startDate);
    const finalDate = new Date(endDate);

    // Evitar loop infinito em casos extremos
    let safetyCounter = 0;
    const MAX_LOOPS = 400 * 365;

    while (current < finalDate && safetyCounter < MAX_LOOPS) {
        safetyCounter++;

        const diaSemana = current.getDay(); // 0 = Dom, 6 = Sab

        // Definir horários deste dia específico
        let currentDayStartH, currentDayStartM;
        let currentDayEndH, currentDayEndM;
        let currentDayLunchStartH, currentDayLunchStartM;
        let currentDayLunchEndH, currentDayLunchEndM;

        if (diaSemana === 0) {
            // Domingo: Pula para segunda
            current.setDate(current.getDate() + 1);
            current.setHours(workStart.h, workStart.m, 0, 0);
            continue;
        } else if (diaSemana === 6) {
            // Sábado
            if (!trabalhaSabado) {
                // Não trabalha sábado, pula para segunda (dia + 2)
                current.setDate(current.getDate() + 2); // Vai cair no domingo e o loop trata, mas vamos direto
                current.setHours(workStart.h, workStart.m, 0, 0);
                continue;
            }
            // Sábado trabalha
            currentDayStartH = sabadoStart.h;
            currentDayStartM = sabadoStart.m;
            currentDayEndH = sabadoEnd.h;
            currentDayEndM = sabadoEnd.m;
            // Sábado sem intervalo de almoço por padrão
            currentDayLunchStartH = currentDayEndH;
            currentDayLunchStartM = currentDayEndM;
            currentDayLunchEndH = currentDayEndH;
            currentDayLunchEndM = currentDayEndM;
        } else {
            // Seg-Sex
            currentDayStartH = workStart.h;
            currentDayStartM = workStart.m;
            currentDayEndH = workEnd.h;
            currentDayEndM = workEnd.m;
            currentDayLunchStartH = lunchStart.h;
            currentDayLunchStartM = lunchStart.m;
            currentDayLunchEndH = lunchEnd.h;
            currentDayLunchEndM = lunchEnd.m;
        }

        // Construir datas limites do dia
        const dayStart = new Date(current);
        dayStart.setHours(currentDayStartH, currentDayStartM, 0, 0);

        const dayEnd = new Date(current);
        dayEnd.setHours(currentDayEndH, currentDayEndM, 0, 0);

        const dayLunchStart = new Date(current);
        dayLunchStart.setHours(currentDayLunchStartH, currentDayLunchStartM, 0, 0);

        const dayLunchEnd = new Date(current);
        dayLunchEnd.setHours(currentDayLunchEndH, currentDayLunchEndM, 0, 0);

        // Lógica padrão de cálculo do dia
        // Se current já passou do fim do expediente deste dia, pula para o próximo início
        if (current >= dayEnd) {
            current.setDate(current.getDate() + 1);
            current.setHours(0, 0, 0, 0); // Reset para garantir que o loop pegue o inicio correto
            continue;
        }

        if (current < dayStart) {
            current = dayStart;
        }

        if (current >= dayLunchStart && current < dayLunchEnd) {
            current = dayLunchEnd;
        }

        if (current >= finalDate) break;

        const periodos = [
            { start: dayStart, end: dayLunchStart },
            { start: dayLunchEnd, end: dayEnd }
        ];

        for (const p of periodos) {
            if (p.start >= p.end) continue;

            const interStart = current > p.start ? current : p.start;
            const interEnd = finalDate < p.end ? finalDate : p.end;

            if (interStart < interEnd) {
                totalMs += (interEnd - interStart);
                current = interEnd; // Avança o current
            }
        }

        // Se current ainda está no mesmo dia (antes de dayEnd) mas já processou tudo, avança
        if (current < finalDate && current >= dayEnd) {
            current.setDate(current.getDate() + 1);
            current.setHours(0, 0, 0, 0);
        }
    }

    return totalMs; // Retorna totalMs (corrigindo o retorno)
};

/**
 * Remove acentos e caracteres especiais para busca
 */
export const normalizeString = (str) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

/**
 * Converte string para Title Case (primeira letra maiúscula),
 * mantendo preposições em minúsculo.
 */
export const toTitleCase = (str) => {
    if (!str) return '';

    // Lista de preposições/artigos que devem ficar em minúsculo
    const exceptions = [
        'de', 'da', 'do', 'das', 'dos',
        'e', 'em', 'para', 'por', 'com',
        'a', 'o', 'as', 'os', 'um', 'uns', 'uma', 'umas'
    ];

    return str.toLowerCase().split(' ').map((word, index) => {
        // Sempre capitaliza a primeira palavra
        if (index === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }
        // Se for exceção, mantém minúsculo
        if (exceptions.includes(word)) {
            return word;
        }
        // Capitaliza demais palavras
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};
