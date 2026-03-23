'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CalendarIcon, Check, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MultipleSelector } from '@/components/ui/multiple-selector';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { IngresoFuncionario, Task } from '@/lib/types';
import { updateTask } from '../actions';


const ganttTaskFormSchema = z.object({
  'nombre tarea': z.string().min(1, 'El nombre de la tarea es requerido.'),
  descripcion: z.string().optional(),
  persona: z.array(z.string()).min(1, 'Se debe asignar al menos una persona.'),
  prioridad: z.enum(['Alta', 'Media', 'Baja'], { required_error: 'La prioridad es requerida.'}),
  color: z.string().optional(),
  tipo_tarea: z.enum(['Día Único', 'Semanal', 'Mensual', 'Anual'], { required_error: 'El tipo de tarea es requerido.'}),
  fecha_unica: z.date().optional().nullable(),
  fecha_inicio_semanal: z.date().optional().nullable(),
  fecha_fin_semanal: z.date().optional().nullable(),
  dia_inicio_mensual: z.coerce.number().min(1).max(31).optional().nullable(),
  dia_fin_mensual: z.coerce.number().min(1).max(31).optional().nullable(),
  hora: z.string().optional(),
  meses_seleccionados: z.array(z.string()).optional(),
  mes_anual: z.string().optional(),
}).refine(data => {
    if (data.tipo_tarea === 'Día Único' && (!data.fecha_unica || !data.hora)) return false;
    if (data.tipo_tarea === 'Semanal' && (!data.fecha_inicio_semanal || !data.fecha_fin_semanal)) return false;
    if (data.tipo_tarea === 'Mensual' && (!data.meses_seleccionados || data.meses_seleccionados.length === 0)) return false;
    if (data.tipo_tarea === 'Anual' && !data.mes_anual) return false;
    return true;
}, {
    message: "Por favor, completa los campos de fecha/mes requeridos para el tipo de tarea seleccionado.",
    path: ['tipo_tarea'],
});

type GanttTaskFormValues = z.infer<typeof ganttTaskFormSchema>;

interface EditGanttTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mesesOptions = [
    { value: 'Enero', label: 'Enero' }, { value: 'Febrero', label: 'Febrero' },
    { value: 'Marzo', label: 'Marzo' }, { value: 'Abril', label: 'Abril' },
    { value: 'Mayo', label: 'Mayo' }, { value: 'Junio', label: 'Junio' },
    { value: 'Julio', label: 'Julio' }, { value: 'Agosto', label: 'Agosto' },
    { value: 'Septiembre', label: 'Septiembre' }, { value: 'Octubre', label: 'Octubre' },
    { value: 'Noviembre', label: 'Noviembre' }, { value: 'Diciembre', label: 'Diciembre' },
];

const colorOptions = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function EditGanttTaskDialog({ task, open, onOpenChange }: EditGanttTaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { data: funcionarios } = useCollection<IngresoFuncionario>(firestore ? collection(firestore, 'INGRESO_FUNCIONARIOS') : null);

  const employeeOptions = useMemo(() => {
    return (funcionarios || []).map(emp => {
        const fullName = `${emp.NOMBRES || ''} ${emp['APELLIDO P'] || ''}`.trim();
        const value = `${fullName} (${emp.RUT})`;
        return { value: value, label: value };
    }).filter(opt => opt.value);
  }, [funcionarios]);


  const form = useForm<GanttTaskFormValues>({
    resolver: zodResolver(ganttTaskFormSchema),
  });
  
  useEffect(() => {
      if (task) {
        const parseDate = (dateStr: string | undefined): Date | null => {
            return dateStr ? parseISO(dateStr) : null;
        }

        form.reset({
            ...task,
            'nombre tarea': task['nombre tarea'],
            descripcion: task.descripcion || '',
            persona: Array.isArray(task.persona) ? task.persona : [task.persona],
            prioridad: task.prioridad || 'Media',
            color: task.color,
            tipo_tarea: task.tipo_tarea || 'Semanal',
            hora: task.hora || '09:00',
            meses_seleccionados: task.meses_seleccionados || [],
            mes_anual: task.mes_anual || '',
            dia_inicio_mensual: task.dia_inicio_mensual || null,
            dia_fin_mensual: task.dia_fin_mensual || null,
            fecha_unica: task.tipo_tarea === 'Día Único' ? parseDate(task.fecha_inicio) : null,
            fecha_inicio_semanal: task.tipo_tarea === 'Semanal' ? parseDate(task.fecha_inicio) : null,
            fecha_fin_semanal: task.tipo_tarea === 'Semanal' ? parseDate(task.fecha_fin) : null,
        });
      }
  }, [task, form]);

  const taskType = form.watch('tipo_tarea');

  async function onSubmit(data: GanttTaskFormValues) {
    if (!task) return;
    setIsSubmitting(true);
    
    try {
        const updatedTaskData = {
            ...data,
            id: task.id,
            estado: task.estado,
            fecha_inicio: (
                data.tipo_tarea === 'Semanal' ? data.fecha_inicio_semanal
                : data.tipo_tarea === 'Día Único' ? data.fecha_unica
                : undefined
            )?.toISOString(),
            fecha_fin: (
                data.tipo_tarea === 'Semanal' ? data.fecha_fin_semanal
                : data.tipo_tarea === 'Día Único' ? data.fecha_unica
                : undefined
            )?.toISOString(),
        };

        const result = await updateTask(updatedTaskData as any);

        if (result?.error) {
            throw new Error(result.error);
        }

        toast({
            title: '¡Tarea de Gantt actualizada!',
            description: `La tarea "${data['nombre tarea']}" ha sido actualizada.`,
        });

        onOpenChange(false);

    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: '¡Oh no! Algo salió mal.',
            description: error.message || 'No se pudo actualizar la tarea.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Tarea para Gantt</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la tarea de planificación a largo plazo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <ScrollArea className="h-96 pr-6">
                <div className="space-y-6 py-6">
                    <FormField
                      control={form.control}
                      name="nombre tarea"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Nombre de la Tarea</FormLabel>
                          <FormControl>
                              <Input placeholder="Ej: Fase 1 del Proyecto Alpha" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                    />
                    
                    <FormField
                        control={form.control}
                        name="descripcion"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Descripción (Opcional)</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="Añade una descripción más detallada de la tarea..."
                                className="resize-none"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="persona"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Asignar a</FormLabel>
                                <FormControl>
                                    <MultipleSelector
                                        value={field.value.map(val => ({ value: val, label: val }))}
                                        onChange={(options) => field.onChange(options.map(opt => opt.value))}
                                        options={employeeOptions}
                                        placeholder="Selecciona funcionarios..."
                                        emptyIndicator={<p className="text-center text-sm text-gray-500">No hay más funcionarios.</p>}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                     <FormField
                        control={form.control}
                        name="tipo_tarea"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tipo de Tarea</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un tipo de tarea" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Día Único">Día Único</SelectItem>
                                    <SelectItem value="Semanal">Semanal</SelectItem>
                                    <SelectItem value="Mensual">Mensual</SelectItem>
                                    <SelectItem value="Anual">Anual</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    {taskType === 'Día Único' && (
                         <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="fecha_unica"
                                render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha</FormLabel>
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button
                                            variant={'outline'}
                                            className={cn('w-full pl-3 text-left font-normal',!field.value && 'text-muted-foreground')}
                                        >
                                            {field.value ? (format(field.value, 'PPP', { locale: es })) : (<span>Selecciona una fecha</span>)}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 5} toYear={new Date().getFullYear() + 5} initialFocus locale={es} />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="hora"
                                render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Hora</FormLabel>
                                    <div className="relative">
                                    <FormControl>
                                        <Input type="time" className="pl-8" {...field} />
                                    </FormControl>
                                    <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {taskType === 'Semanal' && (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="fecha_inicio_semanal"
                                render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Inicio</FormLabel>
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                            {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Selecciona una fecha</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 5} toYear={new Date().getFullYear() + 5} initialFocus locale={es} />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fecha_fin_semanal"
                                render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Fin</FormLabel>
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                            {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Selecciona una fecha</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 5} toYear={new Date().getFullYear() + 5} initialFocus locale={es} />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    )}
                    
                    {taskType === 'Mensual' && (
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="meses_seleccionados"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Meses</FormLabel>
                                        <FormControl>
                                            <MultipleSelector
                                                value={(field.value || []).map(val => ({ value: val, label: val }))}
                                                onChange={(options) => field.onChange(options.map(opt => opt.value))}
                                                options={mesesOptions}
                                                placeholder="Selecciona los meses..."
                                                emptyIndicator={<p className="text-center text-sm text-gray-500">No hay más meses.</p>}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="dia_inicio_mensual"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Día de Inicio (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={31} placeholder="Ej: 5" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="dia_fin_mensual"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Día de Fin (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={31} placeholder="Ej: 15" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {taskType === 'Anual' && (
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="mes_anual"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Mes</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona el mes" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {mesesOptions.map(mes => (
                                            <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="dia_inicio_mensual"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Día de Inicio (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={31} placeholder="Ej: 5" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="dia_fin_mensual"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Día de Fin (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={31} placeholder="Ej: 15" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    <FormField
                        control={form.control}
                        name="prioridad"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Prioridad</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una prioridad" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="Alta">Alta</SelectItem>
                                <SelectItem value="Media">Media</SelectItem>
                                <SelectItem value="Baja">Baja</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Color de la Tarea</FormLabel>
                                <FormControl>
                                    <div className="flex items-center gap-2">
                                        {colorOptions.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                className="h-8 w-8 rounded-full border-2"
                                                style={{ backgroundColor: color, borderColor: field.value === color ? 'hsl(var(--ring))' : 'transparent' }}
                                                onClick={() => field.onChange(color)}
                                            >
                                            {field.value === color && <Check className="h-5 w-5 text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </ScrollArea>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
