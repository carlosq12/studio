'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Clock, User, MapPin } from 'lucide-react';
import type { Task } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
}

const statusVariantMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  'Completada': 'default',
  'En Progreso': 'secondary',
  'Pendiente': 'outline',
  'Atrasada': 'destructive'
};


export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {

  const personas = Array.isArray(task.persona) ? task.persona.join(', ') : task.persona;

  return (
    <Card className="bg-background/80 backdrop-blur-sm animate-in fade-in-50 slide-in-from-bottom-5">
      <CardHeader className="p-4 flex-row items-start justify-between">
        <div>
            <CardTitle className="text-lg font-bold font-headline">{task['nombre tarea']}</CardTitle>
            {task.descripcion && <CardDescription className="text-xs mt-1">{task.descripcion}</CardDescription>}
        </div>
        <div className="flex items-center gap-1">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Editar Tarea</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Eliminar Tarea</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
            <div className="flex items-center gap-2" title="Hora">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-mono">{task.hora}</span>
            </div>
            <div className="flex items-center gap-2" title="Persona Asignada">
                <User className="h-4 w-4 text-primary" />
                <span>{personas}</span>
            </div>
             {task.lugar && (
                <div className="flex items-center gap-2" title="Lugar">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{task.lugar}</span>
                </div>
            )}
        </div>
         <Badge variant={statusVariantMap[task.estado] || 'default'} className="mt-4">{task.estado}</Badge>
      </CardContent>
    </Card>
  );
}
