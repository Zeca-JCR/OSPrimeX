import React, { useEffect, useState } from 'react';

const PDFLinkWrapper = ({ fileName, className, children, ...docProps }) => {
    const [Components, setComponents] = useState(null);

    useEffect(() => {
        const loadDeps = async () => {
            try {
                const [pdfModule, docModule] = await Promise.all([
                    import('@react-pdf/renderer'),
                    import('./RelatorioDocument')
                ]);

                setComponents({
                    PDFDownloadLink: pdfModule.PDFDownloadLink,
                    RelatorioDocument: docModule.RelatorioDocument
                });
            } catch (err) {
                console.error("Erro ao carregar dependências PDF:", err);
            }
        };

        loadDeps();
    }, []);

    if (!Components) {
        return (
            <button className={`${className} opacity-50 cursor-wait`} disabled>
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                Gerando...
            </button>
        );
    }

    const { PDFDownloadLink, RelatorioDocument } = Components;

    return (
        <PDFDownloadLink
            document={<RelatorioDocument {...docProps} />}
            fileName={fileName}
            className={className}
        >
            {children}
        </PDFDownloadLink>
    );
};

export default PDFLinkWrapper;
