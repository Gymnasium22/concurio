/**
 * FileList — список прикреплённых файлов
 */
import { useAttachments } from '@/hooks/use-contests';
import { useFileUpload } from '@/hooks/use-file-upload';
import { getSignedFileUrl } from '@/lib/supabase';
import { formatFileSize, getFileIcon } from '@/lib/utils';
import { FileText, File as FileIcon, Trash2, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import type { Attachment } from '@/types';
import { useEffect, useState } from 'react';

interface FileListProps {
  contestId: string;
  onPreviewClick?: (attachment: Attachment) => void;
}

function AttachmentThumbnail({ attachment }: { attachment: Attachment }) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadThumb = async () => {
      const isImage = attachment.file_type.startsWith('image/') || /\.(png|jpe?g)$/i.test(attachment.file_name);
      if (!isImage) {
        return;
      }

      try {
        const signedUrl = await getSignedFileUrl(attachment.file_path, 3600);
        if (isMounted && signedUrl) {
          setThumbnailUrl(signedUrl);
        }
      } catch {
        if (isMounted) {
          setThumbnailError(true);
        }
      }
    };

    loadThumb();

    return () => {
      isMounted = false;
    };
  }, [attachment.file_name, attachment.file_path, attachment.file_type]);

  if (!thumbnailUrl || thumbnailError) {
    return null;
  }

  return (
    <div className="mr-3 h-12 w-12 overflow-hidden rounded-lg border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-secondary))]">
      <img src={thumbnailUrl} alt={attachment.file_name} className="h-full w-full object-cover" />
    </div>
  );
}

export function FileList({ contestId, onPreviewClick }: FileListProps) {
  const { data: attachments, isLoading } = useAttachments(contestId);
  const { removeAttachment } = useFileUpload();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm('Удалить файл?')) return;
    setDeletingId(attachment.id);
    try {
      await removeAttachment(attachment);
      toast({ title: 'Файл удалён', variant: 'success' });
    } catch (error) {
      toast({ title: 'Ошибка при удалении', variant: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const url = await getSignedFileUrl(attachment.file_path);
      if (!url) throw new Error('Не удалось получить ссылку');
      
      // Создаём временную ссылку и кликаем по ней
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      toast({ title: 'Ошибка скачивания', variant: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <div className="p-6 text-center border border-dashed rounded-xl border-[rgb(var(--border-default))]">
        <p className="text-sm text-[rgb(var(--fg-muted))]">Нет прикреплённых файлов</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {attachments.map(attachment => {
        const iconType = getFileIcon(attachment.file_name);
        const isPdf = iconType === 'pdf';
        
        return (
          <div
            key={attachment.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))] hover:border-[rgb(var(--border-strong))] transition-colors group"
          >
            {attachment.file_type.startsWith('image/') || /\.(png|jpe?g)$/i.test(attachment.file_name) ? (
              <AttachmentThumbnail attachment={attachment} />
            ) : (
              <div className={`p-2 rounded-lg shrink-0 ${isPdf ? 'bg-red-50 text-red-500 dark:bg-red-900/30' : 'bg-blue-50 text-blue-500 dark:bg-blue-900/30'}`}>
                {isPdf ? <FileText className="h-5 w-5" /> : <FileIcon className="h-5 w-5" />}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={attachment.file_name}>
                {attachment.file_name}
              </p>
              <p className="text-xs text-[rgb(var(--fg-muted))]">
                {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              {isPdf && onPreviewClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[rgb(var(--fg-secondary))]"
                  onClick={() => onPreviewClick(attachment)}
                  title="Предпросмотр"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[rgb(var(--fg-secondary))]"
                onClick={() => handleDownload(attachment)}
                title="Скачать"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => handleDelete(attachment)}
                disabled={deletingId === attachment.id}
                title="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
