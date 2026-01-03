
import { validarPlaca } from './utils.js';

// Mock simple test runner
const assert = (condition, message) => {
    if (condition) {
        console.log(`✅ PASS: ${message}`);
    } else {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1);
    }
};

console.log('Iniciando testes de validação de placa...\n');

// Testes Padrão Cinza (Antigo)
console.log('--- Testando Padrão Antigo ---');
const t1 = validarPlaca('ABC-1234');
assert(t1.valida === true && t1.modelo === 'Cinza (Antiga)' && t1.formatada === 'ABC-1234', 'ABC-1234 deve ser válida');

const t2 = validarPlaca('ABC1234');
assert(t2.valida === true && t2.modelo === 'Cinza (Antiga)' && t2.formatada === 'ABC-1234', 'ABC1234 deve ser válida');

const t3 = validarPlaca('abc-1234'); // minúscula
assert(t3.valida === true && t3.modelo === 'Cinza (Antiga)', 'abc-1234 (minúscula) deve ser válida');

// Testes Padrão Mercosul
console.log('\n--- Testando Padrão Mercosul ---');
const t4 = validarPlaca('ABC1D23');
assert(t4.valida === true && t4.modelo === 'Mercosul' && t4.formatada === 'ABC1D23', 'ABC1D23 deve ser válida');

const t5 = validarPlaca('abc1d23'); // minúscula
assert(t5.valida === true && t5.modelo === 'Mercosul', 'abc1d23 (minúscula) deve ser válida');

// Testes Inválidos
console.log('\n--- Testando Casos Inválidos ---');
const i1 = validarPlaca('AB1234'); // muito curta
assert(i1.valida === false, 'AB1234 deve ser inválida');

const i2 = validarPlaca('ABCD123'); // 4 letras
assert(i2.valida === false, 'ABCD123 deve ser inválida');

const i3 = validarPlaca('123ABCD'); // ordem errada
assert(i3.valida === false, '123ABCD deve ser inválida');

const i4 = validarPlaca(''); // vazia
assert(i4.valida === false, 'String vazia deve ser inválida');

console.log('\n🎉 Todos os testes passaram!');
