'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Cake, CalendarDays, Users, Gift, Mail, ArrowRight, User } from "lucide-react";
import type { Birthday } from "@/lib/types";
import { format, differenceInDays, isToday, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BirthdayDashboardProps {
  birthdays: Birthday[];
  onViewList: () => void;
  onSendEmail: (birthday: Birthday) => void;
}

const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return date instanceof Date && !isNaN(date.getTime()) ? date : null;
};

export function BirthdayDashboard({ birthdays, onViewList, onSendEmail }: BirthdayDashboardProps) {
  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth();

  const stats = useMemo(() => {
    if (!birthdays) return null;

    const total = birthdays.length;
    
    // Cumpleaños del mes
    const thisMonth = birthdays.filter(b => {
      const d = parseDate(b['fecha nacimiento']);
      return d && d.getMonth() === currentMonth;
    }).length;

    // Próximos 6 (en los próximos 30 días)
    const upcoming = birthdays
      .map(b => {
        const d = parseDate(b['fecha nacimiento']);
        if (!d) return null;
        
        const nextDate = new Date(now.getFullYear(), d.getMonth(), d.getDate());
        if (nextDate < startOfDay(now)) {
          nextDate.setFullYear(now.getFullYear() + 1);
        }
        
        return {
          ...b,
          nextDate,
          daysUntil: differenceInDays(nextDate, startOfDay(now))
        };
      })
      .filter((b): b is any => b !== null && b.daysUntil >= 0 && b.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6);

    return { total, thisMonth, upcoming };
  }, [birthdays, currentMonth, now]);

  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="fancy-border-card bg-primary text-white border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider opacity-90 text-white">Total Registrados</CardTitle>
            <Users className="h-4 w-4 opacity-80 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{stats.total}</div>
            <p className="text-[10px] opacity-80 mt-1 text-white">Funcionarios en base de datos</p>
          </CardContent>
        </Card>
        
        <Card className="fancy-border-card bg-white border-l-4 border-l-secondary">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold text-secondary uppercase tracking-wider">En {format(now, 'MMMM', { locale: es })}</CardTitle>
            <Cake className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{stats.thisMonth}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Cumpleaños este mes</p>
          </CardContent>
        </Card>

        <Card className="fancy-border-card bg-white border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-wider">Acción Rápida</CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto text-primary font-bold flex items-center gap-1 group" onClick={onViewList}>
                Ver listado completo
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1">Gestionar todos los registros</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-lg font-headline flex items-center gap-2 text-slate-800">
                <Gift className="h-5 w-5 text-primary"/>
                Próximos Cumpleaños
            </CardTitle>
            <CardDescription>Celebraciones para los próximos 30 días.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {stats.upcoming.length > 0 ? (
                stats.upcoming.map((b: any) => {
                  const name = b['nombre funcionario'] || 'Desconocido';
                  const isBdayToday = isToday(b.nextDate);
                  return (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-4">
                        <Avatar className={cn("h-10 w-10 border-2", isBdayToday ? "border-primary" : "border-slate-200")}>
                          <AvatarImage src={b.avatar} />
                          <AvatarFallback className="bg-slate-100"><User className="h-5 w-5 text-slate-400"/></AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-none mb-1">{name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {format(b.nextDate, "EEEE, d 'de' MMMM", { locale: es })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isBdayToday ? (
                          <Badge className="bg-primary text-white animate-bounce">¡Hoy!</Badge>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                            en {b.daysUntil} {b.daysUntil === 1 ? 'día' : 'días'}
                          </span>
                        )}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary hover:bg-primary/10" 
                            onClick={() => onSendEmail(b)}
                            disabled={!b.correo}
                        >
                            <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>No hay cumpleaños próximos en los siguientes 30 días.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-lg font-headline flex items-center gap-2 text-slate-800">
                <CalendarDays className="h-5 w-5 text-secondary"/>
                Resumen Anual
            </CardTitle>
            <CardDescription>Preparativos para las celebraciones.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
             <Cake className="h-16 w-16 text-slate-200 mb-4" />
             <p className="text-sm text-muted-foreground max-w-[200px]">
                Recuerda planificar con tiempo las celebraciones del mes.
             </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
