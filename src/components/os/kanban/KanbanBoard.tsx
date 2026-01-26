import React from 'react';
import { KanbanColumn } from './KanbanColumn';
import type { ColunaKanban, OrdemServico, Empresa } from '../../../types';

interface KanbanBoardProps {
    colunas: ColunaKanban[];
    ordensFiltradas: OrdemServico[];
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

export const KanbanBoard = ({
    colunas,
    ordensFiltradas,
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
}: KanbanBoardProps) => {
    return (
        <div className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden p-4 min-h-0">
            <div className="flex-1 flex gap-3 min-h-0">
                {colunas.map((coluna) => {
                    const ordensColuna = ordensFiltradas.filter(o => o.status === coluna.id);
                    return (
                        <KanbanColumn
                            key={coluna.id}
                            coluna={coluna}
                            ordensColuna={ordensColuna}
                            handleDragOver={handleDragOver}
                            handleDrop={handleDrop}
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
                    );
                })}
            </div>
        </div>
    );
};
