import { useState, useRef, useEffect, useMemo } from 'react';

const CreatableSelect = ({
    name,
    value,
    onChange,
    options = [],
    placeholder = '',
    className = 'input',
    required = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOpen = () => {
        if (!isOpen) {
            inputRef.current?.focus();
        }
        setIsOpen(!isOpen);
    };

    const handleSelect = (optionValue) => {
        onChange({ target: { name, value: optionValue } });
        setIsOpen(false);
    };

    const handleInputChange = (e) => {
        onChange(e);
        if (!isOpen) setIsOpen(true);
    };

    // Lógica de Filtro Inteligente
    const displayedOptions = useMemo(() => {
        // Se abriu pelo botão (seta) ou input vazio -> Mostra tudo
        // Se está digitando e tem valor -> Filtra
        // MAS, se o valor é igual a uma opção (selecionado), talvez queira ver os outros?
        // A queixa do usuário é "clico ao lado, nas lista nada".
        // Vamos mostrar TUDO se o isOpen foi ativado, exceto se estiver filtrando ativamente?
        // Simplificação: Se tiver texto, filtra. Se clicar na seta, mostra tudo? 
        // Não temos como saber se foi clique na seta aqui facilmente sem state extra.
        // Vamos assumir: Filtra SEMPRE que tiver texto, EXCETO se o texto for EXATAMENTE uma opção?
        // Não, user pode querer corrigir "Wurth" para "Wurth Brasil".

        const termo = (value || '').toLowerCase();

        // Se não tem texto, mostra tudo.
        if (!termo) return options;

        // Se o texto bate exatamente com uma opção, talvez o user queira trocar.
        // Se o user clicou na SETA, ele quer ver tudo.
        // Vamos usar um truque: O componente não sabe se foi seta.
        // Mas se usarmos a prop filteredOptions no render seria melhor.

        return options.filter(opt => opt.toLowerCase().includes(termo));
    }, [options, value]);

    // Workaround para o "Ver Tudo":
    // O usuário reclamou de não ver opções quando tem texto.
    // Vamos mostrar TODAS as opções sempre que o dropdown abrir? 
    // E apenas dar highlight nas matching? 
    // Ou separar: "Sugestões baseadas no texto" vs "Todas"?
    // O comportamento "Select" mostra todas.
    // Se eu mostrar todas sempre, perco a busca rápida.
    // Solução Híbrida: Se clicar na seta, limpar o filtro visualmente?

    // Melhor abordagem para "Comportamento unificado":
    // Mostra filtrados. SE a lista filtrada for vazia ou pequena E o usuário clicou na seta...

    // Vamos fazer o seguinte: Mostrar filtrados.
    // MAS adicionar um botão "Mostrar todos" ou simplesmente renderizar tudo se o input não for o foco principal da interação?

    // DECISÃO: Vamos sempre filtrar.
    // PORÉM, para atender a queixa exata "clico ao lado e não lista nada" (pois datalist nativo esconde items que não dão match):
    // Se o usuário clicar no botão Arrow (toggle), vamos IGNORAR o filtro e mostrar tudo?
    // Precisamos de um state `showAll`.

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative flex items-center">
                <input
                    ref={inputRef}
                    type="text"
                    name={name}
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className={`${className} pr-10`} // Espaço para o ícone
                    placeholder={placeholder}
                    autoComplete="off"
                    required={required}
                />
                <button
                    type="button"
                    onClick={toggleOpen} // Toggle normal
                    className="absolute right-0 top-0 bottom-0 px-3 text-gray-400 hover:text-primary transition-colors cursor-pointer"
                    title="Mostrar opções"
                >
                    <span className="material-symbols-outlined text-lg">expand_more</span>
                </button>
            </div>

            {isOpen && (
                <div className="absolute z-[60] w-full mt-1 bg-surface-light dark:bg-surface-dark border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl shadow-lg max-h-60 overflow-y-auto animate-slideUp">
                    {/* Lista Combinada: Filtrados primeiro, ou visualização inteligente */}
                    {/* Se tiver valor e filtrar e não achar nada, mostra msg ou mostra tudo? */}
                    {/* O usuário quer ver as opções. Vamos mostrar a lista COMPLETA se o filtro retornar < 2 opções e o valor for igual a uma delas? */}

                    {/* Abordagem Simples e Eficaz: Mostrar Filtrados. Se clicar na seta, removemos o filtro? */}
                    {/* Vamos permitir que a lista mostre TUDO se o array filtrado for vazio OU se o item selecionado já for completo. */}

                    {(() => {
                        // Lógica de Renderização da Lista
                        let listToRender = displayedOptions;

                        // Se o filtro zerou as opções, mas temos opções globais e o usuário está interagindo:
                        // Vamos mostrar a lista completa se o usuário clicar na seta explicitamente? 
                        // (Isso exigiria state `isExplicitOpen`).

                        // Vamos assumir comportamento de Select "Searchable":
                        // Se o texto é exato a uma opção, mostra TODAS (para permitir troca).
                        const isExactMatch = options.some(opt => opt.toLowerCase() === (value || '').toLowerCase());
                        if (isExactMatch) {
                            listToRender = options;
                        } else if (listToRender.length === 0) {
                            // Se não achou nada, mostrar aviso ou todas?
                            // Mostrar aviso de "Nova opção será criada"
                            return (
                                <div className="p-3 text-sm text-text-secondary-light dark:text-text-secondary-dark italic text-center">
                                    "{value}" será cadastrado como novo.
                                </div>
                            );
                        }

                        return listToRender.map((option) => (
                            <div
                                key={option}
                                onMouseDown={() => handleSelect(option)} // MouseDown dispara antes do Blur do input
                                className={`
                                px-4 py-2 text-sm cursor-pointer transition-colors
                                ${option === value
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }
                            `}
                            >
                                {option}
                            </div>
                        ));
                    })()}
                </div>
            )}
        </div>
    );
};

export default CreatableSelect;
