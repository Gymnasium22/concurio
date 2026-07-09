/**
 * ContestCard — карточка конкурса для списка
 */
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/contest/status-badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, ChevronRight, Paperclip, MessageCircle } from 'lucide-react';
import { formatDate, getDeadlineUrgency, getUrgencyColor, cn } from '@/lib/utils';
import type { Contest } from '@/types';
import { motion } from 'framer-motion';

interface ContestCardProps {
  contest: Contest;
  index: number;
}

export function ContestCard({ contest, index }: ContestCardProps) {
  const urgency = getDeadlineUrgency(contest.due_date);
  const urgencyColor = getUrgencyColor(urgency);
  
  const hasLinks = contest.telegram_message_links && contest.telegram_message_links.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.5), type: 'spring', stiffness: 300, damping: 24 }}
    >
      <Link to={`/contest/${contest.id}`}>
        <Card className="glass group hover:border-accent-400/50 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-[rgb(var(--fg-primary))] group-hover:text-accent-500 transition-colors truncate">
                  {contest.title}
                </h3>
                {contest.description && (
                  <p className="text-sm text-[rgb(var(--fg-secondary))] line-clamp-1 mt-0.5">
                    {contest.description}
                  </p>
                )}
              </div>
              <StatusBadge status={contest.status} className="shrink-0" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 mt-1">
              {/* Левая часть: Дедлайн + Иконки */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className={cn("flex items-center gap-1.5 text-sm font-medium", urgencyColor)}>
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(contest.due_date)}</span>
                </div>
                
                <div className="flex items-center gap-3 text-[rgb(var(--fg-muted))]">
                  {hasLinks && (
                    <div className="flex items-center gap-1 text-xs" title="Прикреплены Telegram сообщения">
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>{contest.telegram_message_links.length}</span>
                    </div>
                  )}
                  {/* Иконка вложений, если бы мы загружали их вместе с конкурсами. 
                      Пока просто показываем место под неё */}
                  <div className="flex items-center gap-1 text-xs opacity-50" title="Вложения (загружаются отдельно)">
                    <Paperclip className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              {/* Правая часть: Прогресс */}
              <div className="flex items-center gap-3 w-full sm:w-1/3 min-w-[120px]">
                <Progress value={contest.progress} className="h-2 flex-1" />
                <span className="text-xs font-bold w-9 text-right text-[rgb(var(--fg-secondary))]">
                  {contest.progress}%
                </span>
                <ChevronRight className="h-5 w-5 text-[rgb(var(--fg-muted))] group-hover:text-accent-500 group-hover:translate-x-1 transition-all hidden sm:block" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
