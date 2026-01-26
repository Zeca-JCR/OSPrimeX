import type { OrdemServico, Cliente, Veiculo, Empresa } from '../../../types';
import PlacaBadge from '../../common/PlacaBadge';
import { useState } from 'react';

interface PrismaOption {
    label: string;
    value: number;
    disabled: boolean;
}

interface OSClienteCardProps {
    os: OrdemServico;
    cliente: Cliente | null;
    veiculo: Veiculo | null;
    empresa: Empresa;
    form: { kmAtual?: string | number };
    opcoesPrisma: PrismaOption[];
    loading: boolean;
    salvando: boolean;
    onEditVeiculo: () => void;
    onKmChange: (valor: string) => void;
    onPrismaChange: (valor: number | null) => Promise<void>;
}

export const OSClienteCard = ({
    os,
    cliente,
    veiculo,
    empresa,
    form,
    opcoesPrisma,
    loading,
    salvando,
    onEditVeiculo,
    onKmChange,
    onPrismaChange
}: OSClienteCardProps) => {
    // Estado local para feedback visual de salvamento do prisma
    const [prismaSaved, setPrismaSaved] = useState(false);

    const handlePrismaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const novoValor = e.target.value;
        const numeroPrisma = novoValor ? parseInt(novoValor) : null;

        try {
            await onPrismaChange(numeroPrisma);

            // Feedback visual local
            setPrismaSaved(true);
            setTimeout(() => setPrismaSaved(false), 2000);
        } catch (error) {
            console.error("Erro ao alterar prisma:", error);
        }
    };

    return (
        <div className="card p-5">
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">person</span>
                    Cliente e Veículo
                </h3>
                {os.status !== 'finalizada' && os.status !== 'cancelada' && (
                    <button onClick={onEditVeiculo} className="text-xs text-primary hover:underline">Editar</button>
                )}
            </div>

            <div className="flex gap-4 items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    {cliente?.nome?.charAt(0) || 'C'}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{cliente?.nome}</p>
                    <div className="flex flex-col gap-1 mt-1">
                        {cliente?.telefone && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <span className="material-symbols-outlined text-[10px]">call</span>
                                {cliente.telefone}
                            </div>
                        )}
                        {cliente?.whatsapp && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <span className="material-symbols-outlined text-[10px]">smartphone</span>
                                    {cliente.whatsapp}
                                </div>
                                <a
                                    href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-1.5 py-0.5 rounded border border-green-200 transition-colors"
                                    title="Conversar no WhatsApp"
                                >
                                    <svg className="w-3 h-3 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    Fale com o cliente...
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                <div className="flex gap-3">
                    {veiculo?.foto ? (
                        <img src={veiculo.foto} alt="Veículo" className="w-16 h-16 rounded-md object-cover" />
                    ) : (
                        <div className="w-16 h-16 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined">directions_car</span>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <PlacaBadge placa={veiculo?.placa} size="md" />
                            {os.status !== 'finalizada' && os.status !== 'cancelada' ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={form.kmAtual || ''}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, ''); // Apenas números
                                            onKmChange(value);
                                        }}
                                        className="w-20 h-6 text-xs bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-primary focus:outline-none text-center font-medium"
                                        placeholder="KM"
                                    />
                                    <span className="text-xs text-gray-400">km</span>
                                </div>
                            ) : (
                                <span className="text-xs text-gray-500">{os.kmAtual ? `${Number(os.kmAtual).toLocaleString('pt-BR')} km` : 'KM N/A'}</span>
                            )}
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white">
                            {veiculo?.marca} {veiculo?.modelo} <span className="text-gray-400 mx-1">•</span> <span className="text-gray-500 font-normal text-sm">{veiculo?.cor}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-2">

                            {/* Prisma inline */}
                            {empresa.usarPrismas && (
                                ['aberta', 'execucao', 'aguardando_peca'].includes(os.status) ? (
                                    <div className="flex items-center gap-2">
                                        <select
                                            className="h-6 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1 min-w-[90px] max-w-[120px] focus:outline-none focus:border-primary"
                                            value={os.prisma || ''}
                                            onChange={handlePrismaChange}
                                            disabled={loading || salvando}
                                            title="Prisma do veículo"
                                        >
                                            <option value="">Prisma</option>
                                            {opcoesPrisma.map(op => (
                                                <option key={op.value} value={op.value} disabled={op.disabled}>
                                                    {op.label}
                                                </option>
                                            ))}
                                        </select>
                                        <span className={`text-xs text-green-600 font-bold transition-opacity duration-300 ${prismaSaved ? 'opacity-100' : 'opacity-0'}`}>
                                            Salvo!
                                        </span>
                                    </div>
                                ) : (
                                    os.prisma && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs whitespace-nowrap">
                                            {(() => {
                                                const labelCor = empresa.prismaCor === 'Vermelho' ? '🔴' :
                                                    empresa.prismaCor === 'Azul' ? '🔵' :
                                                        empresa.prismaCor === 'Verde' ? '🟢' :
                                                            empresa.prismaCor === 'Amarelo' ? '🟡' :
                                                                empresa.prismaCor === 'Preto' ? '⚫' :
                                                                    empresa.prismaCor === 'Laranja' ? '🟠' : '⚪';
                                                return labelCor;
                                            })()} #{os.prisma}
                                        </span>
                                    )
                                )
                            )}

                            {/* Alerta inline */}
                            {empresa.usarPrismas && !os.prisma && os.status === 'execucao' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs whitespace-nowrap">
                                    ⚠️ Sem prisma
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
