import { useState, useRef, useEffect, useMemo, type ChangeEvent } from 'react';

interface CreatableSelectProps {
    name: string;
    value: string;
    onChange: (e: { target: { name: string; value: string } }) => void;
    options?: string[];
    placeholder?: string;
    className?: string;
    required?: boolean;
}

const CreatableSelect = ({
    name,
    value,
    onChange,
    options = [],
    placeholder = '',
    className = 'input',
    required = false
}: CreatableSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

    const handleSelect = (optionValue: string) => {
        onChange({ target: { name, value: optionValue } });
        setIsOpen(false);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        onChange({ target: { name, value: e.target.value } });
        if (!isOpen) setIsOpen(true);
    };

    // Lógica de Filtro
    const displayedOptions = useMemo(() => {
        const termo = (value || '').toLowerCase();
        if (!termo) return options;
        return options.filter(opt => opt.toLowerCase().includes(termo));
    }, [options, value]);

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative flex items-center">
                <input
                    ref={inputRef}
                    type="text"
                    name={name}
                    value={value}
                    onChange={handleInputChange}
                    className={`${className} pr-10`}
                    placeholder={placeholder}
                    autoComplete="off"
                    required={required}
                />
                <button
                    type="button"
                    onClick={toggleOpen}
                    className="absolute right-0 top-0 bottom-0 px-3 text-gray-400 hover:text-primary transition-colors cursor-pointer"
                    title="Mostrar opções"
                >
                    <span className="material-symbols-outlined text-lg">expand_more</span>
                </button>
            </div>

            {isOpen && (
                <div className="absolute z-[60] w-full mt-1 bg-surface-light dark:bg-surface-dark border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-xl shadow-lg max-h-60 overflow-y-auto animate-slideUp">
                    {(() => {
                        let listToRender = displayedOptions;

                        const isExactMatch = options.some(opt => opt.toLowerCase() === (value || '').toLowerCase());
                        if (isExactMatch) {
                            listToRender = options;
                        } else if (listToRender.length === 0) {
                            return (
                                <div className="p-3 text-sm text-text-secondary-light dark:text-text-secondary-dark italic text-center">
                                    "{value}" será cadastrado como novo.
                                </div>
                            );
                        }

                        return listToRender.map((option) => (
                            <div
                                key={option}
                                onMouseDown={() => handleSelect(option)}
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
