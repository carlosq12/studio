
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PlusCircle, Loader2, CalendarIcon, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { addTask } from '../actions';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MultipleSelector } from '@/components/ui/multiple-selector';
import { useCollection, useFirestore } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import type { IngresoFuncionario } from '@/lib/types';

const taskFormSchema = z.object({
  'nombre tarea': z.string().min(1, 'El nombre de la tarea es requerido.'),
  descripcion: z.string().optional(),
  persona: z.array(z.string()).min(1, 'Se debe asignar al menos una persona.'),
  lugar: z.string().optional(),
  estado: z.enum(['Pendiente', 'En Progreso', 'Completada', 'Atrasada']),
  prioridad: z.enum(['Alta', 'Media', 'Baja'], { required_error: 'La prioridad es requerida.'}),
  correo: z.string().optional(),
  tipo_tarea: z.enum(['Día Único', 'Semanal', 'Mensual', 'Anual'], { required_error: 'El tipo de tarea es requerido.'}),
  fecha_unica: z.date().optional(),
  fecha_inicio_semanal: z.date().optional(),
  fecha_fin_semanal: z.date().optional(),
  hora: z.string().optional(),
  meses_seleccionados: z.array(z.string()).optional(),
}).refine(data => {
    if (data.tipo_tarea === 'Día Único') return !!data.fecha_unica && !!data.hora;
    if (data.tipo_tarea === 'Semanal') return !!data.fecha_inicio_semanal && !!data.fecha_fin_semanal;
    if (data.tipo_tarea === 'Mensual') return data.meses_seleccionados && data.meses_seleccionados.length > 0;
    return true;
}, {
    message: "Por favor, completa los campos de fecha requeridos para el tipo de tarea seleccionado.",
    path: ['tipo_tarea'],
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

const mesesOptions = [
    { value: 'Enero', label: 'Enero' }, { value: 'Febrero', label: 'Febrero' },
    { value: 'Marzo', label: 'Marzo' }, { value: 'Abril', label: 'Abril' },
    { value: 'Mayo', label: 'Mayo' }, { value: 'Junio', label: 'Junio' },
    { value: 'Julio', label: 'Julio' }, { value: 'Agosto', label: 'Agosto' },
    { value: 'Septiembre', label: 'Septiembre' }, { value: 'Octubre', label: 'Octubre' },
    { value: 'Noviembre', label: 'Noviembre' }, { value: 'Diciembre', label: 'Diciembre' },
];


export function AddTaskDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { data: funcionarios } = useCollection<IngresoFuncionario>(firestore ? collection(firestore, 'INGRESO_FUNCIONARIOS') : null);

  const employeeOptions = useMemo(() => {
    return (funcionarios || []).map(emp => {
        const lastName = [emp['APELLIDO P'], emp['APELLIDO M']].filter(Boolean).join(' ');
        const firstName = emp.NOMBRES || '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ');
        if (!fullName) return null;
        const value = `${fullName} (${emp.RUT})`;
        return { value: value, label: value };
    }).filter((opt): opt is { value: string; label: string; } => opt !== null);
  }, [funcionarios]);


  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      'nombre tarea': '',
      descripcion: '',
      persona: [],
      fecha_unica: new Date(),
      fecha_inicio_semanal: new Date(),
      hora: '09:00',
      lugar: '',
      estado: 'Pendiente',
      prioridad: 'Media',
      correo: '',
      tipo_tarea: 'Día Único',
      meses_seleccionados: [],
    },
  });

  const taskType = form.watch('tipo_tarea');

  async function onSubmit(data: TaskFormValues) {
    setIsSubmitting(true);
    try {
      const taskData = {
        ...data,
        fecha_inicio: data.tipo_tarea === 'Semanal' ? data.fecha_inicio_semanal?.toISOString() : data.fecha_unica?.toISOString(),
        fecha_fin: data.tipo_tarea === 'Semanal' ? data.fecha_fin_semanal?.toISOString() : undefined,
      };
      
      const result = await addTask(taskData as any);

      if (result?.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Tarea añadida!',
        description: `La tarea "${data['nombre tarea']}" ha sido añadida.`,
      });
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description:
          error.message || 'No se pudo añadir la tarea. Inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Tarea
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear Nueva Tarea</DialogTitle>
          <DialogDescription>
            Ingresa los detalles de la nueva tarea. Haz clic en guardar cuando termines.
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
                              <Input placeholder="Ej: Revisar informe mensual" {...field} />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un tipo de tarea" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="Día Único">Día Único</SelectItem>
                                <SelectItem value="Semanal">Semanal</SelectItem>
                                <SelectItem value="Mensual">Mensual</SelectItem>
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
                                        <Calendar 
                                            mode="single" 
                                            selected={field.value} 
                                            onSelect={field.onChange} 
                                            captionLayout="dropdown-buttons" 
                                            fromYear={new Date().getFullYear() - 5}
                                            toYear={new Date().getFullYear() + 5}
                                            initialFocus 
                                            locale={es} 
                                        />
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
                    )}
                    
                    <FormField
                      control={form.control}
                      name="lugar"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Lugar (Opcional)</FormLabel>
                          <FormControl>
                              <Input placeholder="Ej: Sala de reuniones 3" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                    />

                     <FormField
                      control={form.control}
                      name="correo"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Correo para notificaciones (Opcional)</FormLabel>
                           <FormControl>
                              <Input placeholder="correo1@ej.com, correo2@ej.com" {...field} value={field.value ?? ''} />
                          </FormControl>
                           <p className="text-xs text-muted-foreground">
                                Puedes añadir varios correos separados por comas.
                            </p>
                          <FormMessage />
                          </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="estado"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Estado</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un estado" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                    <SelectItem value="En Progreso">En Progreso</SelectItem>
                                    <SelectItem value="Completada">Completada</SelectItem>
                                    <SelectItem value="Atrasada">Atrasada</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="prioridad"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Prioridad</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
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
                  'Guardar Tarea'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
