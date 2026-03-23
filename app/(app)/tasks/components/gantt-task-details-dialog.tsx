'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2, Edit, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from 'react';
import { deleteTask } from '../actions';
import { useToast } from '@/hooks/use-toast';

interface GanttTaskDetailsDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditTask: (task: Task) => void;
}

const statusVariantMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  'Completada': 'default',
  'En Progreso': 'secondary',
  'Pendiente': 'outline',
  'Atrasada': 'destructive'
};

const priorityVariantMap: Record<string, "default" | "secondary" | "destructive"> = {
    'Alta': 'destructive',
    'Media': 'secondary',
    'Baja': 'default',
};

const DetailItem = ({ label, value }: { label: string; value?: string | React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-base font-semibold">{value || 'N/A'}</div>
    </div>
);

export function GanttTaskDetailsDialog({ task, open, onOpenChange, onEditTask }: GanttTaskDetailsDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  if (!task) return null;

  const getDisplayDate = () => {
      if (task.tipo_tarea === 'Mensual' && task.meses_seleccionados) {
          const months = task.meses_seleccionados.join(', ');
          if (task.dia_inicio_mensual && task.dia_fin_mensual) {
              return `Día de inicio= ${task.dia_inicio_mensual}, Día de termino= ${task.dia_fin_mensual} (${months})`;
          }
          return `Meses: ${months}`;
      }
      
      if (task.tipo_tarea === 'Anual' && task.mes_anual) {
        let dateInfo = `Mes: ${task.mes_anual}`;
        if (task.dia_inicio_mensual && task.dia_fin_mensual) {
            dateInfo = `Día de inicio= ${task.dia_inicio_mensual}, Día de termino= ${task.dia_fin_mensual} (${task.mes_anual})`;
        }
        return dateInfo;
      }

      const startDate = task.fecha_inicio ? format(parseISO(task.fecha_inicio), 'd MMM yyyy', { locale: es }) : 'N/A';
      const endDate = task.fecha_fin ? format(parseISO(task.fecha_fin), 'd MMM yyyy', { locale: es }) : startDate;

      if (startDate === endDate || endDate === 'N/A') {
          return startDate;
      }
      
      return `${startDate} - ${endDate}`;
  }
  
  const handleDelete = async () => {
    if (!task) return;
    setIsDeleting(true);
    try {
        const result = await deleteTask(task.id);
        if (result.error) {
            throw new Error(result.error);
        }
        toast({
            title: '¡Tarea eliminada!',
            description: `La tarea "${task['nombre tarea']}" ha sido eliminada.`,
        });
        setShowDeleteConfirm(false);
        onOpenChange(false);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error al eliminar',
            description: error.message || 'No se pudo eliminar la tarea.',
        });
    } finally {
        setIsDeleting(false);
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{task['nombre tarea']}</DialogTitle>
            <DialogDescription>Detalles de la tarea de la Carta Gantt.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              {task.descripcion && <DetailItem label="Descripción" value={task.descripcion} />}
              <DetailItem label="Responsable(s)" value={Array.isArray(task.persona) ? task.persona.join(', ') : task.persona} />
              <DetailItem label="Periodo" value={getDisplayDate()} />
              <DetailItem label="Prioridad" value={<Badge variant={priorityVariantMap[task.prioridad]}>{task.prioridad}</Badge>} />
              <DetailItem label="Estado" value={<Badge variant={statusVariantMap[task.estado]}>{task.estado}</Badge>} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
             <Button variant="outline" onClick={() => { onEditTask(task); onOpenChange(false); }}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Esta acción no se puede deshacer. Esto eliminará permanentemente la tarea "{task['nombre tarea']}".
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Eliminando...</> : 'Sí, eliminar'}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
