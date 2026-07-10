/**
 * FilePreview — предпросмотр PDF и изображений
 */
import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { getSignedFileUrl } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FilePreviewProps {
  filePath: string;
  fileName?: string;
  fileType?: string;
}

function isImageFile(fileType?: string, fileName?: string): boolean {
  const isImageType = fileType?.startsWith('image/');
  const lowerName = fileName?.toLowerCase() ?? '';
  return (
    !!isImageType ||
    /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(lowerName)
  );
}

export function FilePreview({ filePath, fileName, fileType }: FilePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUrl = async () => {
      try {
        const signedUrl = await getSignedFileUrl(filePath, 3600);
        if (signedUrl) {
          setUrl(signedUrl);
        } else {
          setError('Не удалось получить ссылку на файл');
        }
      } catch {
        setError('Ошибка при загрузке файла');
      }
    };
    fetchUrl();
  }, [filePath]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[rgb(var(--fg-muted))]">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Загрузка файла...</p>
      </div>
    );
  }

  if (isImageFile(fileType, fileName)) {
    return (
      <div className="flex flex-col h-full bg-black/90">
        <div className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-auto">
          <img
            src={url}
            alt={fileName ?? 'Изображение'}
            className="max-w-full max-h-[calc(85vh-80px)] object-contain rounded-lg shadow-2xl select-none"
            draggable={false}
          />
        </div>
        <div className="shrink-0 flex justify-center gap-2 p-3 border-t border-white/10">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/80 hover:text-white underline underline-offset-2"
          >
            Открыть в новой вкладке
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[rgb(var(--bg-secondary))] rounded-xl overflow-hidden border border-[rgb(var(--border-default))]">
      <div className="flex items-center justify-between p-2 bg-[rgb(var(--bg-card))] border-b border-[rgb(var(--border-default))]">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-16 text-center">{pageNumber} / {numPages || '?'}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pageNumber >= (numPages || 1)} onClick={() => setPageNumber(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.max(0.5, s - 0.25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.min(2.5, s + 0.25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-auto p-4 flex justify-center min-h-[400px] max-h-[70vh]">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
            </div>
          }
          error={
            <div className="text-red-500 text-center p-4">
              Ошибка рендеринга PDF. Возможно, файл повреждён.
            </div>
          }
        >
          <Page pageNumber={pageNumber} scale={scale} renderTextLayer={true} renderAnnotationLayer={true} className="shadow-md bg-white" />
        </Document>
      </div>
    </div>
  );
}
