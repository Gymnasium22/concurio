/**
 * Аналитика: burndown, velocity, lead time, on-time, by type
 */
import { useAnalytics } from '@/hooks/use-platform';
import {
  downloadCuratorPdfReport,
  downloadCuratorSlideReport,
} from '@/lib/analytics-report';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TASK_TYPE_LABELS } from '@/lib/constants';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { FileDown, Presentation } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';

const COLORS = ['#7850ff', '#3b82f6', '#ec4899', '#f59e0b', '#10b981'];

export function AnalyticsPage() {
  const { data, isLoading, error } = useAnalytics();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-red-500">
        {error instanceof Error ? error.message : 'Нет данных'}
      </p>
    );
  }

  const { analytics, contests } = data;
  const pie = analytics.byType.map((t) => ({
    name: TASK_TYPE_LABELS[t.type as keyof typeof TASK_TYPE_LABELS] || t.type,
    value: t.count,
  }));

  const exportPdf = async () => {
    setBusy(true);
    try {
      await downloadCuratorPdfReport(contests, analytics);
      toast({ title: 'PDF для куратора сохранён', variant: 'success' });
    } catch {
      toast({ title: 'Ошибка PDF', variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const exportSlides = async () => {
    setBusy(true);
    try {
      await downloadCuratorSlideReport(contests, analytics);
      toast({ title: 'Слайд-отчёт (PDF) сохранён', variant: 'success' });
    } catch {
      toast({ title: 'Ошибка отчёта', variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Аналитика</h1>
          <p className="text-sm text-[rgb(var(--fg-muted))] mt-0.5">
            Velocity, burndown, lead time и нагрузка
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => void exportPdf()}
          >
            <FileDown className="h-4 w-4" />
            PDF куратору
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => void exportSlides()}
          >
            <Presentation className="h-4 w-4" />
            Слайды PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: '% в срок', value: `${analytics.onTimeRate}%` },
          { label: 'Lead time', value: `${analytics.leadTimeDaysAvg} д` },
          { label: 'Готово', value: analytics.completed },
          { label: 'Просрочено', value: analytics.overdue },
        ].map((k) => (
          <div
            key={k.label}
            className="glass rounded-2xl p-3 sm:p-4 border border-[rgb(var(--border-default))]"
          >
            <p className="text-[10px] uppercase tracking-wider text-[rgb(var(--fg-muted))]">
              {k.label}
            </p>
            <p className="text-xl sm:text-2xl font-bold tabular-nums mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4 border border-[rgb(var(--border-default))]">
          <h3 className="text-sm font-semibold mb-3">Velocity (недели)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.velocity}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="week" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="completed" name="Готово" fill="#7850ff" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-[rgb(var(--border-default))]">
          <h3 className="text-sm font-semibold mb-3">Burndown</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.burndown}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="week" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="remaining"
                  name="Осталось"
                  stroke="#7850ff"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  name="Идеал"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-[rgb(var(--border-default))] lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3">Нагрузка по типам</h3>
          <div className="h-56 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" outerRadius={80} label>
                    {pie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="sm:w-48 space-y-1 text-sm self-center">
              {pie.map((p, i) => (
                <li key={p.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  {p.name}: <strong>{p.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
