/**
 * OSPrimeX - Tipos para Componentes React
 * 
 * Definições de tipos para props de componentes reutilizáveis.
 */

import type { ReactNode, CSSProperties, ChangeEvent, FormEvent } from 'react';

// ============================================
// Props Base
// ============================================

export interface BaseComponentProps {
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
}

// ============================================
// Modal
// ============================================

export interface ModalProps extends BaseComponentProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// ============================================
// Botões
// ============================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends BaseComponentProps {
    type?: 'button' | 'submit' | 'reset';
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    title?: string;
}

// ============================================
// Inputs
// ============================================

export interface InputProps {
    name: string;
    label?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'time' | 'datetime-local';
    value?: string | number;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    error?: string;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    onBlur?: () => void;
    className?: string;
}

export interface SelectOption {
    value: string | number;
    label: string;
    disabled?: boolean;
}

export interface SelectProps {
    name: string;
    label?: string;
    value?: string | number;
    options: SelectOption[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
    className?: string;
}

export interface TextAreaProps {
    name: string;
    label?: string;
    value?: string;
    placeholder?: string;
    rows?: number;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    error?: string;
    onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    className?: string;
}

// ============================================
// Formulários
// ============================================

export interface FormProps extends BaseComponentProps {
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

// ============================================
// Tabelas
// ============================================

export interface TableColumn<T = unknown> {
    key: string;
    header: string;
    width?: string | number;
    sortable?: boolean;
    render?: (item: T, index: number) => ReactNode;
}

export interface TableProps<T = unknown> extends BaseComponentProps {
    columns: TableColumn<T>[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
    onRowClick?: (item: T) => void;
    selectedId?: string;
}

// ============================================
// Paginação
// ============================================

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
}

// ============================================
// Empty State
// ============================================

export interface EmptyStateProps extends BaseComponentProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

// ============================================
// Badges
// ============================================

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends BaseComponentProps {
    variant?: BadgeVariant;
    size?: 'sm' | 'md';
}

// ============================================
// Placa Badge (específico do projeto)
// ============================================

export interface PlacaBadgeProps {
    placa: string;
    className?: string;
}

// ============================================
// Currency Input (específico do projeto)
// ============================================

export interface CurrencyInputProps {
    name: string;
    label?: string;
    value: number | string;
    onChange: (value: number) => void;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    placeholder?: string;
}

// ============================================
// Creatable Select (específico do projeto)
// ============================================

export interface CreatableSelectProps {
    name: string;
    label?: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    onCreate?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

// ============================================
// Column Toggler (específico do projeto)
// ============================================

export interface ColumnTogglerProps {
    columns: { key: string; label: string; visible: boolean }[];
    onToggle: (key: string) => void;
}

// ============================================
// Loading / Spinner
// ============================================

export interface LoadingProps extends BaseComponentProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

// ============================================
// Confirmação / Diálogos
// ============================================

export interface ConfirmDialogProps extends ModalProps {
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel?: () => void;
}
