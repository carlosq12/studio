'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Users, 
    CalendarClock, 
    ClipboardCheck, 
    AlertCircle, 
    TrendingUp,
} from "lucide-react";
import type { Replacement } from "@/lib/types";
import { 
    format, 
    isSameMonth, 
    isWithinInterval, 
    startOfDay,
    parseISO 
} from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { useMemo } from "react";
import { 
    Bar, 
    BarChart, 
    ResponsiveContainer, 
    XAxis, 
    YAxis, 
    Tooltip,
    CartesianGrid 
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface ReplacementsDashboardProps {
  replacements: Replacement[] | null;
  loading: boolean;
}

const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    if (typeof date === 'string') {
      const parsed = parseISO(date);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
};

export function ReplacementsDashboard({ replacements, loading }: ReplacementsDashboardProps) {
  const now = new Date();
  const today = startOfDay(now);

  const stats = useMemo(() => {
    if (!replacements) return null;

    const total = replacements.length;
    
    const endingThisMonth = replacements.filter(r => {
      const d = parseDate(r.HASTA);
      const statusRNR = (r.ESTADO_R_NR || (r as any)['ESTADO R/NR'] || '').toUpperCase();
      // Mostrar solo si:
      // 1. Tiene fecha válida
      // 2. Es del mes actual
      // 3. El estado es 'SI' (Resuelto)
      // 4. La fecha de término es HOY o FUTURA (no mostrar pasadas)
      return d && isSameMonth(d, now) && statusRNR === 'SI' && d >= today;
    }).sort((a, b) => {
        const dateA = parseDate(a.HASTA)?.getTime() || 0;
        const dateB = parseDate(b.HASTA)?.getTime() || 0;
        return dateA - dateB;
    });

    const activeToday = replacements.filter(r => {
      const start = parseDate(r.DESDE);
      const end = parseDate(r.HASTA);
      if (!start || !end) return false;
      return isWithinInterval(today, { start: startOfDay(start), end: startOfDay(end) });
    }).length;

    const groups: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = format(d, 'MMM yy', { locale: es });
        groups[key] = 0;
    }

    replacements.forEach(r => {
      const d = parseDate(r.DESDE);
      if (d) {
        const key = format(d, 'MMM yy', { locale: es });
        if (groups[key] !== undefined) {
            groups[key] = (groups[key] || 0) + 1;
        }
      }
    });

    const chartData = Object.entries(groups).map(([name, total]) => ({ name, total }));

    return { total, endingThisMonth, activeToday, chartData };
  }, [replacements, today, now]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="h-32 animate-pulse bg-muted" />
        ))}
        <Card className="md:col-span-2 h-80 animate-pulse bg-muted" />
        <Card className="h-80 animate-pulse bg-muted" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="fancy-border-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Solicitudes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Histórico acumulado</p>
          </CardContent>
        </Card>
        
        <Card className="fancy-border-card overflow-hidden bg-secondary text-white border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white">Terminan este Mes (SI)</CardTitle>
            <CalendarClock className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.endingThisMonth.length}</div>
            <p className="text-xs text-white/90">Vigentes hasta fin de {format(now, 'MMMM', { locale: es })}</p>
          </CardContent>
        </Card>

        <Card className="fancy-border-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Activos Hoy</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.activeToday}</div>
            <p className="text-xs text-muted-foreground">Reemplazos en curso actualmente</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        <Card className="lg:col-span-3 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary"/>
                Ingresos por Mes
            </CardTitle>
            <CardDescription>Cantidad de nuevas solicitudes registradas.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[350px] w-full pt-4">
            <ChartContainer config={{ total: { label: "Solicitudes", color: "hsl(var(--primary))" } }} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted)/0.5)' }} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden flex flex-col border-secondary/20">
          <CardHeader className="bg-secondary text-white border-b border-secondary/10">
            <CardTitle className="flex items-center gap-2 text-white">
                <AlertCircle className="h-5 w-5"/>
                Vigentes por Finalizar
            </CardTitle>
            <CardDescription className="text-white/80">Solicitudes resueltas que expiran hoy o pronto.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4 pt-4">
                {stats.endingThisMonth.length > 0 ? (
                  stats.endingThisMonth.map((rep) => (
                    <div key={rep.id} className="flex items-start justify-between border-b pb-3 last:border-0 hover:bg-secondary/5 transition-colors rounded-lg p-2">
                      <div className="space-y-1">
                        <p className="text-sm font-bold leading-none text-foreground">{rep['NOMBRE REEMPLAZADO']}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>Reemplaza:</span>
                            <span className="font-semibold text-primary">{rep.NOMBRE}</span>
                        </div>
                        <p className="text-[10px] font-medium px-1.5 py-0.5 bg-secondary text-white rounded w-fit mt-1">
                            Termina el {format(parseDate(rep.HASTA)!, 'd \'de\' MMM', { locale: es })}
                        </p>
                      </div>
                      <Badge variant="default" className="text-[10px] shrink-0 bg-secondary hover:bg-secondary text-white border-none">
                        {rep.ESTADO_R_NR || 'SI'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                    <p className="text-sm">No hay términos vigentes programados.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
