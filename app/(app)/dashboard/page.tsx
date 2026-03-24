
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, ListChecks, Cake, User, Mail, Send, Loader2 } from "lucide-react";
import TasksByStatusChart from "./components/tasks-by-status-chart";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, Timestamp } from "firebase/firestore";
import type { Employee, Task, Birthday } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { sendTestEmail } from "./actions";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { checkAndSendEfemerideNotifications } from "../tasks/actions";
import { checkAndSendBirthdayNotifications } from "../birthdays/actions";

function useDashboardData() {
    const firestore = useFirestore();

    const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'dotacion_personal')) : null, [firestore]);
    const { data: employees, loading: loadingEmployees } = useCollection<Employee>(employeesQuery);

    const tasksQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tareas')) : null, [firestore]);
    const { data: tasks, loading: loadingTasks } = useCollection<Task>(tasksQuery);

    const birthdaysQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cumpleaños')) : null, [firestore]);
    const { data: birthdays, loading: loadingBirthdays } = useCollection<Birthday>(birthdaysQuery);

    const upcomingBirthdays = useMemoFirebase(() => {
        if (!birthdays) return [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentYear = today.getFullYear();

        return birthdays
            .map(person => {
                const birthDateValue = person['fecha nacimiento'];
                if (!birthDateValue) return null;

                let birthDate: Date | null = null;
                if (birthDateValue instanceof Timestamp) {
                    birthDate = birthDateValue.toDate();
                } else if (typeof birthDateValue === 'string') {
                    birthDate = parseISO(birthDateValue);
                }

                if (!birthDate || isNaN(birthDate.getTime())) {
                    return null;
                }

                const nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
                if (nextBirthday < today) {
                    nextBirthday.setFullYear(currentYear + 1);
                }

                return {
                    ...person,
                    daysUntilBirthday: differenceInDays(nextBirthday, today),
                    isToday: isToday(nextBirthday),
                    nextBirthdayDate: nextBirthday
                };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null && p.daysUntilBirthday >= 0 && p.daysUntilBirthday <= 30)
            .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday)
            .slice(0, 5);
    }, [birthdays]);
    
    const pendingTasks = tasks?.filter(t => t.estado === 'Pendiente' || t.estado === 'En Progreso').length ?? 0;

    return {
        employees,
        tasks,
        birthdays,
        upcomingBirthdays,
        pendingTasks,
        loading: loadingEmployees || loadingTasks || loadingBirthdays,
    };
}


function TestEmailCard() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');

    const handleSendTestEmail = async () => {
        setIsLoading(true);
        const result = await sendTestEmail(email);
        if (result.error) {
            toast({
                variant: "destructive",
                title: "Error al enviar correo",
                description: result.error,
            });
        } else {
            toast({
                title: "¡Correo de prueba enviado!",
                description: `Se ha enviado un correo a ${email}. Verifica tu bandeja de entrada.`,
            });
        }
        setIsLoading(false);
    }

    return (
        <Card className="md:col-span-2 fancy-border-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5"/>
                Probar Notificaciones
            </CardTitle>
            <CardDescription>
                Verifica que el servicio de envío de correos esté funcionando.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex w-full max-w-sm items-center space-x-2">
                <Input 
                    type="email" 
                    placeholder="Tu correo aquí" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                />
                <Button onClick={handleSendTestEmail} disabled={isLoading || !email}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </div>
          </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
  const { employees, tasks, upcomingBirthdays, pendingTasks, loading } = useDashboardData();
  const { toast } = useToast();

  useEffect(() => {
    // Trigger automático de efemérides al cargar el dashboard
    const runAutoNotify = async () => {
        // Ejecutar ambas en paralelo
        const [efemerideResult, birthdayResult] = await Promise.all([
            checkAndSendEfemerideNotifications(),
            checkAndSendBirthdayNotifications()
        ]);

        const totalSent = (efemerideResult.success ? efemerideResult.count : 0) + 
                         (birthdayResult.success ? birthdayResult.count : 0);

        if (totalSent > 0) {
            toast({
                title: "Notificaciones Procesadas",
                description: `Se han enviado automáticamente ${totalSent} recordatorios (cumpleaños/efemérides).`,
            });
        }
        
        if (efemerideResult.error || birthdayResult.error) {
            console.error('Error en notificaciones auto:', efemerideResult.error, birthdayResult.error);
        }
    };
    if (!loading) {
        runAutoNotify();
    }
  }, [loading, toast]);
  
  if (loading) {
      return <DashboardSkeleton />;
  }

  const employeeName = (b: Birthday) => b['nombre funcionario'] || 'Desconocido';

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="Inicio" description="Resumen general del Hospital de Curepto." />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/employees" className="cursor-pointer">
            <Card className="fancy-border-card h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Empleados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{employees?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
            </CardContent>
            </Card>
        </Link>
        <Link href="/tasks" className="cursor-pointer">
            <Card className="fancy-border-card h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tareas Activas</CardTitle>
                <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{pendingTasks}</div>
                <p className="text-xs text-muted-foreground">de {tasks?.length ?? 0} tareas</p>
            </CardContent>
            </Card>
        </Link>
        <Link href="/birthdays" className="cursor-pointer">
            <Card className="fancy-border-card h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Próximos Cumpleaños</CardTitle>
                <Cake className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{upcomingBirthdays?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">en los próximos 30 días</p>
            </CardContent>
            </Card>
        </Link>
      </div>

      <div className="grid gap-6 mt-6 md:grid-cols-5">
        <Card className="md:col-span-3 fancy-border-card">
          <CardHeader>
            <CardTitle>Tareas por Estado</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <TasksByStatusChart tasks={tasks} />
          </CardContent>
        </Card>
        <Card className="md:col-span-2 fancy-border-card">
          <CardHeader>
            <CardTitle>Próximos Cumpleaños</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBirthdays && upcomingBirthdays.length > 0 ? (
                upcomingBirthdays.map(birthday => (
                  <div key={birthday.id} className="flex items-center gap-4">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={birthday.avatar} alt={employeeName(birthday)} data-ai-hint="person portrait" />
                      <AvatarFallback>
                        {employeeName(birthday).split(' ').map(n => n[0]).join('') || <User />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-none">{employeeName(birthday)}</p>
                      <p className="text-sm text-muted-foreground capitalize">{format(birthday.nextBirthdayDate, 'MMMM d', { locale: es })}</p>
                    </div>
                    {birthday.isToday ? (
                      <Badge className="bg-accent text-accent-foreground">¡Hoy!</Badge>
                    ) : (
                      <div className="text-sm text-muted-foreground">en {birthday.daysUntilBirthday} d</div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay cumpleaños cercanos.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <TestEmailCard />
      </div>
    </main>
  );
}


function DashboardSkeleton() {
    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <PageHeader title="Inicio" description="Cargando resumen..." />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card><CardHeader><Skeleton className="h-8 w-12" /></CardHeader></Card>
                <Card><CardHeader><Skeleton className="h-8 w-12" /></CardHeader></Card>
                <Card><CardHeader><Skeleton className="h-8 w-12" /></CardHeader></Card>
            </div>
        </main>
    )
}
