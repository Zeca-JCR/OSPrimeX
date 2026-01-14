// @ts-nocheck
import { useState } from 'react';
import { Link } from 'react-router-dom';
import CategoriasView from './CategoriasView';
import ContasPagarReceber from './ContasPagarReceber';
import DREView from './DREView';

const FinanceiroAdvanced = () => {
    const [activeTab, setActiveTab] = useState('categorias');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'categorias':
                return <CategoriasView />;
            case 'dre':
                return <DREView />;
            case 'contas':
                return <ContasPagarReceber />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 lg:p-6 space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link to="/financeiro" className="flex items-center gap-2 text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-primary mb-2">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        Voltar para Financeiro Básico
                    </Link>
                    <h1 className="text-2xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">monitoring</span>
                        Financeiro Avançado
                    </h1>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        Gestão profissional de contas e resultados
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 mb-6">
                <button
                    onClick={() => setActiveTab('contas')}
                    className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === 'contas'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    Contas a Pagar/Receber
                </button>
                <button
                    onClick={() => setActiveTab('dre')}
                    className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === 'dre'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    DRE Gerencial
                </button>
                <button
                    onClick={() => setActiveTab('categorias')}
                    className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === 'categorias'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    Categorias
                </button>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default FinanceiroAdvanced;

