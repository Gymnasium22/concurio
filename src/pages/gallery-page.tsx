/**
 * Галерея файлов — все вложения пользователя
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchAllUserAttachments, getSignedFileUrl } from '@/services/attachmentService';
import { formatFileSize } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, Image as ImageIcon, Presentation, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import type { Attachment } from '@/types';

function isImage(a: Attachment) {
  return a.file_type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(a.file_name);
}

function isPpt(a: Attachment) {
  return (
    a.file_type.includes('presentation') ||
    a.file_type.includes('powerpoint') ||
    /\.pptx?$/i.test(a.file_name)
  );
}

function GalleryThumb({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!isImage(attachment)) return;
    void getSignedFileUrl(attachment.file_path, 3600).then((u) => {
      if (alive && u) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [attachment]);

  if (url) {
    return (
      <img
        src={url}
        alt={attachment.file_name}
        className="h-full w-full object-cover"
      />
    );
  }

  if (isPpt(attachment)) {
    return <Presentation className="h-8 w-8 text-orange-500" />;
  }
  if (attachment.file_type === 'application/pdf' || attachment.file_name.endsWith('.pdf')) {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  if (isImage(attachment)) {
    return <ImageIcon className="h-8 w-8 text-sky-500" />;
  }
  return <FileText className="h-8 w-8 text-[rgb(var(--fg-muted))]" />;
}

export function GalleryPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['file-gallery'],
    queryFn: fetchAllUserAttachments,
    staleTime: 30_000,
  });

  const handleDownload = async (a: Attachment) => {
    const url = await getSignedFileUrl(a.file_path);
    if (!url) return;
    const el = document.createElement('a');
    el.href = url;
    el.download = a.file_name;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-accent-500" />
          Галерея файлов
        </h1>
        <p className="text-sm text-[rgb(var(--fg-muted))] mt-1">
          Все вложения по задачам (превью изображений)
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">
          {error instanceof Error ? error.message : 'Ошибка загрузки'}
        </p>
      )}

      {!isLoading && data && data.length === 0 && (
        <div className="p-10 text-center border border-dashed rounded-2xl border-[rgb(var(--border-default))]">
          <p className="text-sm text-[rgb(var(--fg-muted))]">Пока нет файлов</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {data.map((a) => (
            <div
              key={a.id}
              className="group rounded-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))] overflow-hidden flex flex-col"
            >
              <div className="aspect-square bg-[rgb(var(--bg-secondary))] flex items-center justify-center overflow-hidden">
                <GalleryThumb attachment={a} />
              </div>
              <div className="p-2.5 space-y-1 flex-1 flex flex-col">
                <p className="text-xs font-medium truncate" title={a.file_name}>
                  {a.file_name}
                </p>
                <p className="text-[10px] text-[rgb(var(--fg-muted))]">
                  {formatFileSize(a.file_size)}
                  {a.contest_title ? ` · ${a.contest_title}` : ''}
                </p>
                <div className="flex gap-1 mt-auto pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs flex-1"
                    asChild
                  >
                    <Link to={`/contest/${a.contest_id}`}>Задача</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => void handleDownload(a)}
                    title="Скачать"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
