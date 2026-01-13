import { useState, useEffect, useRef } from 'react';

/**
 * Componente de input para valores monetários com máscara brasileira.
 * 
 * Props:
 * - label: Texto do label (ex: "Valor R$")
 * - value: Valor numérico atual (number)
 * - onChange: Callback chamado com o valor numérico (number)
 * - placeholder: Placeholder do campo (default: "0,00")
 * - required: Se é obrigatório
 * - disabled: Se está desabilitado
 * - className: Classes adicionais para o input
 * - labelClassName: Classes adicionais para o label
 * - hint: Texto de ajuda abaixo do campo
 * - error: Mensagem de erro
 * - min: Valor mínimo permitido
 * - max: Valor máximo permitido
 * - autoFocus: Se deve focar automaticamente
 * - size: 'sm' | 'md' | 'lg' - Tamanho do campo
 */
const CurrencyInput = ({
    label,
    value,
    onChange,
    placeholder = '0,00',
    required = false,
    disabled = false,
    className = '',
    labelClassName = '',
    hint,
    error,
    min,
    max,
    autoFocus = false,
    size = 'md',
    id,
    name,
}) => {
    const inputRef = useRef(null);

    // Formata número para exibição brasileira (123.45 -> "123,45")
    const formatForDisplay = (num) => {
        if (num === null || num === undefined || num === '' || isNaN(num)) return '';
        return Number(num).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Estado interno armazena a string formatada
    const [displayValue, setDisplayValue] = useState(() => formatForDisplay(value));

    // Sincroniza com valor externo quando muda
    useEffect(() => {
        // Só atualiza se o valor externo for diferente do valor interno parseado
        const currentParsed = parseCurrency(displayValue);
        if (value !== currentParsed) {
            setDisplayValue(formatForDisplay(value));
        }
    }, [value]);

    // Converte string formatada para número
    const parseCurrency = (str) => {
        if (!str) return 0;
        // Remove pontos de milhar e substitui vírgula por ponto
        const cleaned = str.replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    };

    // Formata string enquanto digita
    const formatCurrencyInput = (inputValue) => {
        if (!inputValue) return '';
        // Remove tudo que não é número
        const numbers = inputValue.replace(/\D/g, '');
        if (!numbers) return '';
        // Converte para centavos
        const cents = parseInt(numbers, 10);
        // Formata como número decimal brasileiro (sem R$)
        return (cents / 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const handleChange = (e) => {
        const rawValue = e.target.value;
        const formatted = formatCurrencyInput(rawValue);
        setDisplayValue(formatted);

        // Notifica o pai com o valor numérico
        const numericValue = parseCurrency(formatted);
        onChange?.(numericValue);
    };

    const handleFocus = (e) => {
        // Seleciona todo o texto ao focar
        e.target.select();
    };

    // Validação
    const numericValue = parseCurrency(displayValue);
    const hasMinError = min !== undefined && numericValue < min && numericValue !== 0;
    const hasMaxError = max !== undefined && numericValue > max;
    const showError = error || hasMinError || hasMaxError;

    let errorMessage = error;
    if (hasMinError) errorMessage = `Valor mínimo: ${formatForDisplay(min)}`;
    if (hasMaxError) errorMessage = `Valor máximo: ${formatForDisplay(max)}`;

    // Classes baseadas no tamanho
    const sizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
    };

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={id || name}
                    className={`block text-sm font-medium text-text-light dark:text-text-dark mb-2 ${labelClassName}`}
                >
                    {label}{required && ' *'}
                </label>
            )}
            <input
                ref={inputRef}
                id={id || name}
                name={name}
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                autoFocus={autoFocus}
                className={`
                    input w-full
                    ${sizeClasses[size]}
                    ${showError ? 'border-red-500 focus:ring-red-500' : ''}
                    ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' : ''}
                    ${className}
                `}
            />
            {hint && !showError && (
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                    {hint}
                </p>
            )}
            {showError && (
                <p className="text-xs text-red-500 mt-1">
                    {errorMessage}
                </p>
            )}
        </div>
    );
};

export default CurrencyInput;
