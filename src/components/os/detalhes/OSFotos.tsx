import type { OrdemServico } from '../../../types';
import { CollapsibleSection } from '../../common/CollapsibleSection';

interface OSFotosProps {
    os: OrdemServico;
    onAddFoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onShowFoto: (foto: any) => void;
}

export const OSFotos = ({ os, onAddFoto, onShowFoto }: OSFotosProps) => {
    const fotosCount = (os.fotos || []).length;
    const canAddFoto = os.status !== 'finalizada' && os.status !== 'cancelada' && fotosCount < 5;

    return (
        <CollapsibleSection
            title="Fotos"
            icon="photo_library"
            defaultExpanded={false}
            persistKey={`os_fotos_${os.id}`}
            badge={
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark">
                    {fotosCount}/5
                </span>
            }
            headerActions={
                canAddFoto && (
                    <label className="text-sm text-primary hover:underline flex items-center gap-1 cursor-pointer">
                        <span className="material-symbols-outlined text-lg">add_a_photo</span>
                        Adicionar
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onAddFoto}
                        />
                    </label>
                )
            }
        >

            {(!os.fotos || os.fotos.length === 0) ? (
                <div className="text-center py-6">
                    <span className="material-symbols-outlined text-3xl text-gray-400 mb-2">photo_library</span>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        Nenhuma foto adicionada
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-3">
                    {os.fotos.map((foto: any, index: number) => (
                        <div key={foto.id || index} className="flex flex-col gap-1">
                            <div
                                onClick={() => onShowFoto(foto)}
                                className="group aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer shadow-sm hover:shadow-lg transition-all duration-200 relative"
                            >
                                <img
                                    src={foto.data}
                                    alt={foto.nome || `Foto ${index + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                {/* Overlay com ícone de expandir */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity text-2xl drop-shadow-lg">zoom_in</span>
                                </div>
                            </div>
                            {/* Descrição da foto */}
                            {foto.descricao ? (
                                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate px-1" title={foto.descricao}>
                                    {foto.descricao}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
                                    Foto {index + 1}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </CollapsibleSection>
    );
};
