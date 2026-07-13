/**
 * FilePreview — PDF, изображения, Office (PPT/DOC) через Office Online
 */
import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { getSignedFileUrl } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  ExternalLink,
  Download,
} from 'lucide-react';
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
    !!isImageType || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(lowerName)
  );
}

function isPdfFile(fileType?: string, fileName?: string): boolean {
  return (
    fileType === 'application/pdf' ||
    (fileName?.toLowerCase().endsWith('.pdf') ?? false)
  );
}

function isOfficeFile(fileType?: string, fileName?: string): boolean {
  const name = fileName?.toLowerCase() ?? '';
  const type = fileType ?? '';
  return (
    type.includes('presentation') ||
    type.includes('powerpoint') ||
    type.includes('wordprocessing') ||
    type.includes('msword') ||
    type.includes('ms-powerpoint') ||
    /\.(pptx?|docx?)$/i.test(name)
  );
}

function officeEmbedUrl(signedUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
}

export function FilePreview({ filePath, fileName, fileType }: FilePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [error, setError] = useState<string | null>(null);
  const [officeFailed, setOfficeFailed] = useState(false);

  useEffect(() => {
    setOfficeFailed(false);
    setError(null);
    setUrl(null);
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
    void fetchUrl();
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
      <div className="flex flex-col items-center justify-center p-12 text-[rgb(var(--fg-muted))] h-full">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-accent-500" />
        <p>Загрузка файла...</p>
      </div>
    );
  }

  if (isImageFile(fileType, fileName)) {
    return (
      <div className="flex flex-col h-full min-h-0 bg-black">
        <div className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-auto">
          <img
            src={url}
            alt={fileName ?? 'Изображение'}
            className="w-auto h-auto max-w-full max-h-full object-contain rounded-md shadow-2xl select-none"
            style={{
              maxHeight:
                'min(calc(100dvh - 7rem), calc(var(--tg-viewport-stable-height, 100dvh) - 7rem))',
            }}
            draggable={false}
          />
        </div>
        <div className="shrink-0 flex justify-center gap-3 p-2.5 border-t border-white/10 bg-black/80">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/80 hover:text-white underline underline-offset-2"
          >
            Открыть полностью
          </a>
        </div>
      </div>
    );
  }

  if (isOfficeFile(fileType, fileName) && !isPdfFile(fileType, fileName)) {
    if (officeFailed) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 h-full text-center bg-[rgb(var(--bg-secondary))]">
          <p className="text-sm text-[rgb(var(--fg-secondary))] max-w-md">
            Встроенный просмотр недоступен (файл в приватном хранилище или
            блокировка сети). Скачайте и откройте на устройстве.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button asChild className="gap-2">
              <a href={url} download={fileName} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
                Скачать
              </a>
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setOfficeFailed(false)}
            >
              Повторить просмотр
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full min-h-0 bg-[rgb(var(--bg-secondary))]">
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))]">
          <p className="text-xs text-[rgb(var(--fg-muted))] truncate">
            Предпросмотр Office Online · {fileName}
          </p>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Файл
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
              <a href={url} download={fileName}>
                <Download className="h-3.5 w-3.5" />
                Скачать
              </a>
            </Button>
          </div>
        </div>
        <iframe
          title={fileName ?? 'Office preview'}
          src={officeEmbedUrl(url)}
          className="flex-1 w-full min-h-0 border-0 bg-white"
          onError={() => setOfficeFailed(true)}
        />
        <p className="shrink-0 text-[10px] text-center text-[rgb(var(--fg-muted))] py-1.5 px-2">
          Если слайды пустые — скачайте файл. Office Online требует публичный
          HTTPS-доступ к ссылке.
        </p>
      </div>
    );
  }

  // PDF
  return (
    <div className="flex flex-col h-full min-h-0 bg-[rgb(var(--bg-secondary))] overflow-hidden">
      <div className="flex items-center justify-between p-2 bg-[rgb(var(--bg-card))] border-b border-[rgb(var(--border-default))] shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-16 text-center">
            {pageNumber} / {numPages || '?'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={pageNumber >= (numPages || 1)}
            onClick={() => setPageNumber((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-auto p-4 flex justify-center min-h-0">
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
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-md bg-white"
          />
        </Document>
      </div>
    </div>
  );
}
