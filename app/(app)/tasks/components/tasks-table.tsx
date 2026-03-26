'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Loader2, Edit, Trash2 } from 'lucide-react';
import type { Task } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, Firestore } from 'firebase/firestore';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteTask } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { EditTaskDialog } from './edit-task-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

function useTasks(db: Firestore | null) {
  const tasksQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'tareas'));
  }, [db]);
  return useCollection<Task>(tasksQuery);
}

const statusVariantMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  'Completada': 'default',
  'En Progreso': 'secondary',
  'Pendiente': 'outline',
  'Atrasada': 'destructive'
};

export default function TasksTable() {
  const firestore = useFirestore();
  const { data: tasks, loading } = useTasks(firestore);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const { toast } = useToast();

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

  const renderSkeletons = () => (
    <TableBody>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );

  return (
    <>
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarea</TableHead>
              <TableHead>Asignado a</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Lugar</TableHead>
              <TableHead className="w-[50px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          {loading ? (
            renderSkeletons()
          ) : (
            <TableBody>
              {tasks?.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task['nombre tarea']}</TableCell>
                  <TableCell>{Array.isArray(task.persona) ? task.persona.join(', ') : task.persona}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariantMap[task.estado] || 'default'}>{task.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{task.fecha}</TableCell>
                  <TableCell className="text-muted-foreground">{task.hora}</TableCell>
                  <TableCell className="text-muted-foreground">{task.lugar}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTaskToEdit(task)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTaskToDelete(task)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
        {!loading && (!tasks || tasks.length === 0) && (
            <div className="text-center text-muted-foreground py-16">
                <p className="text-lg font-medium">No hay tareas</p>
                <p>Crea una nueva tarea para comenzar.</p>
            </div>
        )}
      </ScrollArea>
      
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
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <EditTaskDialog
        task={taskToEdit}
        open={!!taskToEdit}
        onOpenChange={(open) => !open && setTaskToEdit(null)}
       />
    </>
  );
}
