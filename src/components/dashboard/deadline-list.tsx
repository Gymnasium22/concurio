/**
 * DeadlineList — список ближайших дедлайнов
 */
import { useContests } from '@/hooks/use-contests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDeadlineUrgency, getUrgencyColor, getUrgencyBgColor, formatDate, getTimeLeft } from '@/lib/utils';
import { DASHBOARD_DEADLINE_COUNT } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';

export function DeadlineList() {
  const { data: contests, isLoading } = useContests();

  if (isLoading) {
    return (
      <Card className="glass-subtle">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-accent-500" />
            Ближайшие дедлайны
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Фильтруем: только незавершённые, с датой, сортируем по возрастанию даты
  const upcoming = (contests || [])
    .filter(c => c.status !== 'done' && c.status !== 'cancelled' && c.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, DASHBOARD_DEADLINE_COUNT);

  if (upcoming.length === 0) {
    return (
      <Card className="glass-subtle bg-[rgb(var(--bg-secondary))]/30">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center mb-3">
            <Trophy className="h-6 w-6 text-accent-500" />
          </div>
          <p className="text-[rgb(var(--fg-primary))] font-medium">Нет горящих дедлайнов</p>
          <p className="text-sm text-[rgb(var(--fg-secondary))] mt-1">Отдыхай или создай новое задание</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-subtle overflow-hidden">
      <CardHeader className="pb-3 border-b border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))]/50">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-accent-500" />
          Ближайшие дедлайны
        </CardTitle>
      </CardHeader>
      <div className="flex flex-col divide-y divide-[rgb(var(--border-default))]">
        <AnimatePresence>
          {upcoming.map((contest, index) => {
            const urgency = getDeadlineUrgency(contest.due_date);
            const colorClass = getUrgencyColor(urgency);
            const bgClass = getUrgencyBgColor(urgency);

            return (
              <motion.div
                key={contest.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/contest/${contest.id}`}
                  className="flex items-center gap-3 p-3 sm:p-4 hover:bg-[rgb(var(--bg-secondary))]/50 transition-colors group"
                >
                  <div className={`shrink-0 w-12 h-12 rounded-xl border flex flex-col items-center justify-center ${bgClass}`}>
                    <span className={`text-[10px] font-bold uppercase leading-none ${colorClass}`}>
                      {new Date(contest.due_date!).toLocaleString('ru', { month: 'short' })}
                    </span>
                    <span className={`text-lg font-bold leading-none mt-1 ${colorClass}`}>
                      {new Date(contest.due_date!).getDate()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate group-hover:text-accent-500 transition-colors">
                      {contest.title}
                    </h4>
                    <p className="text-xs text-[rgb(var(--fg-secondary))] truncate mt-0.5 flex items-center gap-1.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${bgClass.split(' ')[0].replace('/10', '')}`} />
                      {getTimeLeft(contest.due_date)}
                    </p>
                  </div>

                  <ChevronRight className="h-5 w-5 text-[rgb(var(--fg-muted))] group-hover:text-[rgb(var(--fg-primary))] group-hover:translate-x-0.5 transition-all" />
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Card>
  );
}
