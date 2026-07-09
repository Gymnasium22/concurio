/**
 * TelegramLinks — отображение списка прикреплённых Telegram-сообщений
 */
import { MessageCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TelegramLinksProps {
  links: string[];
}

export function TelegramLinks({ links }: TelegramLinksProps) {
  if (!links || links.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-[rgb(var(--fg-secondary))] flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        Сообщения в Telegram
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {links.map((link, i) => (
          <a
            key={i}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <Card className="glass-subtle border-dashed hover:border-accent-400/50 hover:bg-accent-50/50 dark:hover:bg-accent-900/10 transition-all">
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="h-8 w-8 rounded-full bg-[#2AABEE]/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-4 w-4 text-[#2AABEE]" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate group-hover:text-accent-500 transition-colors">
                      Сообщение {i + 1}
                    </span>
                    <span className="text-xs text-[rgb(var(--fg-muted))] truncate">
                      {link.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-[rgb(var(--fg-muted))] group-hover:text-accent-500 shrink-0" />
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
