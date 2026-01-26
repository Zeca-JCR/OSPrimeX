import React from 'react';
import { KanbanCard } from './KanbanCard';
import type { ColunaKanban, OrdemServico, Empresa } from '../../../types';

interface KanbanColumnProps {
    coluna: ColunaKanban;
    ordensColuna: OrdemServico[];
    handleDragOver: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, status: string) => void;
    dragging: string | null;
    empresa: Empresa | null;
    handleDragStart: (e: React.DragEvent, os: OrdemServico) => void;
    openOS: (id: string) => void;
    hasLinkRastreavel: (id: string) => boolean;
    getClienteNome: (id: string) => string;
    getVeiculoPlaca: (id: string) => string | null;
    getVeiculoInfo: (id: string) => string;
    hasTecnicoValido: (os: OrdemServico) => boolean;
    setOsParaAtribuir: (value: { id: string, novoStatus: string } | null) => void;
    setShowAtribuirTecnico: (show: boolean) => void;
    setOsParaAtribuirPrisma: (os: OrdemServico | null) => void;
    setShowAtribuirPrisma: (show: boolean) => void;
}

export const KanbanColumn = ({
    coluna,
    ordensColuna,
    handleDragOver,
    handleDrop,
    dragging,
    empresa,
    handleDragStart,
    openOS,
    hasLinkRastreavel,
    getClienteNome,
    getVeiculoPlaca,
    getVeiculoInfo,
    hasTecnicoValido,
    setOsParaAtribuir,
    setShowAtribuirTecnico,
    setOsParaAtribuirPrisma,
    setShowAtribuirPrisma
}: KanbanColumnProps) => {
    return (
        <div
            className="w-72 shrink-0 flex flex-col h-full max-h-full"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, coluna.id)}
        >
            {/* Column Header - compacto estilo Stitch */}
            <div className="flex items-center gap-2 mb-2 py-2 px-1">
                <div className={`w-1.5 h-5 rounded-[2px] ${coluna.color}`} />
                <h2 className="text-sm font-semibold text-text-light dark:text-text-dark">
                    {coluna.label}
                </h2>
                <span className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark">
                    {ordensColuna.length}
                </span>
            </div>

            {/* Column Content */}
            <div className="flex-1 space-y-2 overflow-y-auto pb-4 min-h-0">
                {ordensColuna.length === 0 ? (
                    <div className="card p-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <span className="material-symbols-outlined text-2xl text-gray-400 mb-1">
                            {coluna.icon}
                        </span>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                            Nenhuma OS
                        </p>
                    </div>
                ) : (
                    ordensColuna.map((os) => (
                        <KanbanCard
                            key={os.id}
                            os={os}
                            coluna={coluna}
                            dragging={dragging}
                            empresa={empresa}
                            handleDragStart={handleDragStart}
                            openOS={openOS}
                            hasLinkRastreavel={hasLinkRastreavel}
                            getClienteNome={getClienteNome}
                            getVeiculoPlaca={getVeiculoPlaca}
                            getVeiculoInfo={getVeiculoInfo}
                            hasTecnicoValido={hasTecnicoValido}
                            setOsParaAtribuir={setOsParaAtribuir}
                            setShowAtribuirTecnico={setShowAtribuirTecnico}
                            setOsParaAtribuirPrisma={setOsParaAtribuirPrisma}
                            setShowAtribuirPrisma={setShowAtribuirPrisma}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
