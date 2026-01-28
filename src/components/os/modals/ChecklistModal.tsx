import { useState } from 'react';

interface ChecklistItem {
    item: string;
    ok: boolean | null;
}

interface ChecklistModalProps {
    checklist: ChecklistItem[];
    onClose: () => void;
    onSave: (items: ChecklistItem[]) => void;
}

export const ChecklistModal = ({ checklist, onClose, onSave }: ChecklistModalProps) => {
    const [items, setItems] = useState<ChecklistItem[]>(
        checklist.length > 0
            ? checklist
            : [
                { item: 'Nível de óleo', ok: null },
                { item: 'Nível de água', ok: null },
                { item: 'Pneus', ok: null },
                { item: 'Freios', ok: null },
                { item: 'Faróis', ok: null },
                { item: 'Limpador de para-brisa', ok: null },
            ]
    );

    const toggleItem = (index: number, value: boolean) => {
        const novos = [...items];
        novos[index].ok = value;
        setItems(novos);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="card p-6 w-full max-w-md animate-slideUp">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Checklist</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="space-y-3 mb-6">
                    {items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                            <span className="text-text-light dark:text-text-dark">{item.item}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleItem(index, true)}
                                    className={`p-2 rounded-lg transition-colors ${item.ok === true
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-green-100'
                                        }`}
                                    title="OK"
                                >
                                    <span className="material-symbols-outlined text-lg">check</span>
                                </button>
                                <button
                                    onClick={() => toggleItem(index, false)}
                                    className={`p-2 rounded-lg transition-colors ${item.ok === false
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-red-100'
                                        }`}
                                    title="Problema"
                                >
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
                    <button onClick={() => onSave(items)} className="btn-primary flex-1">
                        <span className="material-symbols-outlined">save</span>
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};
