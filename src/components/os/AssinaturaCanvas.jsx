import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const AssinaturaCanvas = ({ onConfirm, onClose }) => {
    const sigCanvas = useRef(null);
    const [isEmpty, setIsEmpty] = useState(true);

    const clear = () => {
        sigCanvas.current?.clear();
        setIsEmpty(true);
    };

    const save = () => {
        // Debug
        console.log("Tentando salvar assinatura - Click detectado");

        if (!sigCanvas.current) {
            alert("ERRO CRÍTICO: Referência do Canvas não encontrada. Tente recarregar a página.");
            return;
        }

        if (sigCanvas.current.isEmpty()) {
            alert("Por favor, faça sua assinatura antes de confirmar.");
            return;
        }

        try {
            // Retorna a imagem em base64
            // Usando toDataURL direto para evitar erro no trim_canvas
            const dataURL = sigCanvas.current.toDataURL('image/png');
            console.log("Assinatura gerada, tamanho:", dataURL.length);
            onConfirm(dataURL);
        } catch (error) {
            console.error("Erro ao gerar imagem:", error);
            alert("Erro ao processar assinatura: " + error.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="card w-full max-w-lg bg-white dark:bg-gray-800 shadow-2xl animate-scaleUp flex flex-col">
                <div className="p-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between">
                    <h3 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">draw</span>
                        Assinatura de Retirada
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-4 bg-gray-100 dark:bg-gray-900 flex justify-center">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-white relative">
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor="black"
                            canvasProps={{
                                width: 500,
                                height: 250,
                                className: 'signature-canvas cursor-crosshair bg-white rounded-lg'
                            }}
                            onBegin={() => setIsEmpty(false)}
                        />
                        {isEmpty && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-sm">
                                Assine aqui
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={clear}
                        className="text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-error transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-lg">delete</span>
                        Limpar
                    </button>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="btn-secondary">
                            Cancelar
                        </button>
                        <button onClick={save} className="btn-primary">
                            <span className="material-symbols-outlined text-lg">check</span>
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssinaturaCanvas;
