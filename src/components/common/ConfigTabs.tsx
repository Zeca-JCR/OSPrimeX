import { useState, ReactNode, useEffect } from 'react';

export interface TabItem {
    id: string;
    label: string;
    icon?: string;
    badge?: ReactNode;
}

interface ConfigTabsProps {
    tabs: TabItem[];
    children: ReactNode;
    activeTab: string;
    onTabChange: (tabId: string) => void;
    persistKey?: string;
}

export const ConfigTabs = ({
    tabs,
    children,
    activeTab,
    onTabChange,
    persistKey
}: ConfigTabsProps) => {
    // Persistir tab ativa no localStorage
    useEffect(() => {
        if (persistKey) {
            localStorage.setItem(`config_tab_${persistKey}`, activeTab);
        }
    }, [activeTab, persistKey]);

    return (
        <div>
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        {tab.icon && (
                            <span className={`material-symbols-outlined text-lg ${activeTab === tab.id ? 'text-primary' : ''
                                }`}>
                                {tab.icon}
                            </span>
                        )}
                        <span>{tab.label}</span>
                        {tab.badge && tab.badge}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">
                {children}
            </div>
        </div>
    );
};

// Hook para gerenciar estado da tab
export const useConfigTabs = (defaultTab: string, persistKey?: string) => {
    const getInitialTab = () => {
        if (persistKey) {
            const saved = localStorage.getItem(`config_tab_${persistKey}`);
            if (saved) return saved;
        }
        return defaultTab;
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);

    return { activeTab, setActiveTab };
};

export default ConfigTabs;
