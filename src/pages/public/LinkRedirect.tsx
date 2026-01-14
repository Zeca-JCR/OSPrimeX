// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import storage from '../../lib/storage';

const LinkRedirect = () => {
    const { codigo } = useParams();
    const navigate = useNavigate();
    const [error, setError] = useState(false);

    useEffect(() => {
        const processarLink = async () => {
            try {
                // Como não temos um backend real com índice, precisamos buscar quem tem esse código.
                // Em produção real, isso seria um SELECT * FROM links WHERE codigo = x.
                // Aqui, vamos varrer (ineficiente mas ok para MVP local) ou esperar que o ID do link seja o código.

                // Vamos assumir que o "codigo" Ã‰ o ID do registro em links_rastreaveis para simplificar o MVP sem backend real.
                const link = await storage.getById('links_rastreaveis', codigo);

                if (link && link.ativo !== false) {

                    // Registrar clique (Incrementar contador)
                    // Nota: Em localStorage síncrono isso é instantâneo. Em backend real seria async.
                    await storage.update('links_rastreaveis', link.id, {
                        cliques: (link.cliques || 0) + 1,
                        ultimoClique: new Date().toISOString()
                    });

                    // Se tiver uma OS, podemos adicionar um log na timeline da OS também (opcional futuro)

                    // Redirecionar
                    if (link.urlDestino.startsWith('http')) {
                        window.location.href = link.urlDestino;
                    } else {
                        // Se for rota interna
                        window.location.href = window.location.origin + link.urlDestino;
                    }
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error("Erro ao processar link", err);
                setError(true);
            }
        };

        if (codigo) {
            processarLink();
        }
    }, [codigo, navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">link_off</span>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">Link Inválido ou Expirado</h1>
                    <p className="text-gray-600 mb-6">Não conseguimos encontrar o destino deste link. Verifique se o endereço está correto.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Redirecionando...</p>
            </div>
        </div>
    );
};

export default LinkRedirect;

