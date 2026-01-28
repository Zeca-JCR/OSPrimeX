import React, { useState, ReactNode } from 'react';

interface PDFLinkWrapperProps {
    fileName: string;
    className?: string;
    children?: ReactNode;
    [key: string]: any;
}

interface LoadedComponents {
    PDFDownloadLink: React.ComponentType<any>;
    RelatorioDocument: React.ComponentType<any>;
}

const PDFLinkWrapper: React.FC<PDFLinkWrapperProps> = ({ fileName, className, children, ...docProps }) => {
    const [Components, setComponents] = useState<LoadedComponents | null>(null);

    React.useEffect(() => {
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
