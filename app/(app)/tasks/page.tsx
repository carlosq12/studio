'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AddTaskDialog } from './components/add-task-dialog';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, Firestore } from 'firebase/firestore';
import type { Task } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo, useEffect } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarCheck, ListX, GanttChartSquare, Star } from 'lucide-react';
import { TaskCalendar } from './components/task-calendar';
import { TaskCard } from './components/task-card';
import { EditTaskDialog } from './components/edit-task-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteTask } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GanttChart } from './components/gantt-chart';
import { AddGanttTaskDialog } from './components/add-gantt-task-dialog';
import { GanttTaskDetailsDialog } from './components/gantt-task-details-dialog';
import { EditGanttTaskDialog } from './components/edit-gantt-task-dialog';
import EfemeridesView from './components/efemerides-view';


function useTasks(db: Firestore | null) {
  const tasksQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'tareas'));
  }, [db]);
  const { data: tasks, loading } = useCollection<Task>(tasksQuery);
  return { tasks: tasks || [], loading };
}

export default function TasksPage() {
  const firestore = useFirestore();
  const { tasks, loading } = useTasks(firestore);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [ganttTaskToView, setGanttTaskToView] = useState<Task | null>(null);
  const [ganttTaskToEdit, setGanttTaskToEdit] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const [ganttCurrentYear, setGanttCurrentYear] = useState(new Date().getFullYear());
  
  useEffect(() => {
    // Initialize state on client to avoid hydration issues
    setSelectedDate(new Date());
  }, []);

  const taskDates = useMemo(() => {
    return tasks.filter(task => task.fecha_inicio).map(task => parseISO(task.fecha_inicio!));
  }, [tasks]);

  const tasksOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return tasks
      .filter(task => {
        const taskDate = task.fecha_inicio;
        if (!taskDate) return false;
        try {
          return isSameDay(parseISO(taskDate), selectedDate);
        } catch (e) {
          console.error("Invalid date for task:", task.id, taskDate);
          return false;
        }
      })
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  }, [selectedDate, tasks]);

  const handleDelete = async () => {
    if (!taskToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteTask(taskToDelete.id);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Tarea eliminada!',
        description: `La tarea "${taskToDelete['nombre tarea']}" ha sido eliminada.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description: error.message || 'No se pudo eliminar la tarea.',
      });
    } finally {
      setIsDeleting(false);
      setTaskToDelete(null);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Gestión de Tareas"
        description="Visualiza, gestiona y planifica las tareas asignadas."
      />
      
      <Tabs defaultValue="calendar" className="flex-1 flex flex-col">
        <TabsList className="self-start">
            <TabsTrigger value="calendar" className="gap-2"><CalendarCheck className="h-4 w-4"/> Calendario</TabsTrigger>
            <TabsTrigger value="gantt" className="gap-2"><GanttChartSquare className="h-4 w-4"/> Carta Gantt</TabsTrigger>
            <TabsTrigger value="efemerides" className="gap-2"><Star className="h-4 w-4"/> Efemérides</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="flex-1 mt-6">
            <div className="mb-4">
                <AddTaskDialog />
            </div>
            <Card>
                <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {loading ? (
                    <div className="flex justify-center items-center">
                        <Skeleton className="h-[370px] w-full max-w-md rounded-md" />
                    </div>
                    ) : (
                    <TaskCalendar
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        highlightedDates={taskDates}
                    />
                    )}

                    <div className="border-l border-border md:pl-8 relative">
                    <h2 className="text-xl font-headline font-bold mb-4 flex items-center gap-2">
                        <CalendarCheck className="text-primary" />
                        <span>
                        {selectedDate
                            ? `Tareas para el ${format(selectedDate, "d 'de' MMMM", {
                                locale: es,
                            })}`
                            : 'Selecciona una fecha'}
                        </span>
                    </h2>
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : tasksOnSelectedDate.length > 0 ? (
                        <div className="space-y-4">
                        {tasksOnSelectedDate.map((task) => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                onEdit={() => setTaskToEdit(task)}
                                onDelete={() => setTaskToDelete(task)}
                            />
                        ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full min-h-[200px] gap-4">
                            <ListX className="h-16 w-16 text-primary/50" />
                            <p className="text-lg font-medium">
                                {selectedDate ? 'No hay tareas para esta fecha.' : 'Selecciona un día para ver las tareas.'}
                            </p>
                        </div>
                    )}
                    </div>
                </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="gantt" className="flex-1 mt-6">
             <div className="mb-4">
                <AddGanttTaskDialog />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Carta Gantt</CardTitle>
                    <CardDescription>
                        Visualización de la línea de tiempo de las tareas y su progreso. Haz clic en una tarea para ver los detalles.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <GanttChart 
                        tasks={tasks} 
                        onTaskSelect={setGanttTaskToView} 
                        currentYear={ganttCurrentYear}
                    />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="efemerides" className="flex-1 mt-6">
            <EfemeridesView />
        </TabsContent>
      </Tabs>


       <EditTaskDialog
        task={taskToEdit}
        open={!!taskToEdit}
        onOpenChange={(open) => !open && setTaskToEdit(null)}
       />

      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la tarea <span className="font-semibold">{taskToDelete?.['nombre tarea']}</span> de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GanttTaskDetailsDialog 
        task={ganttTaskToView}
        open={!!ganttTaskToView}
        onOpenChange={(open) => !open && setGanttTaskToView(null)}
        onEditTask={setGanttTaskToEdit}
      />
      
      <EditGanttTaskDialog
        task={ganttTaskToEdit}
        open={!!ganttTaskToEdit}
        onOpenChange={(open) => !open && setGanttTaskToEdit(null)}
      />

    </main>
  );
}
