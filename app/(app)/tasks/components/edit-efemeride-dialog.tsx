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
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MultipleSelector } from '@/components/ui/multiple-selector';
import { useCollection, useFirestore } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import type { IngresoFuncionario, Efemeride } from '@/lib/types';
import { updateEfemeride } from '../actions';

const efemerideSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido.'),
  dia: z.coerce.number().min(1, 'Día inválido').max(31, 'Día inválido'),
  mes: z.string().min(1, 'El mes es requerido.'),
  encargados: z.array(z.string()),
  funcionarios_afectos: z.array(z.string()),
});

type EfemerideFormValues = z.infer<typeof efemerideSchema>;

interface EditEfemerideDialogProps {
  efemeride: Efemeride | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mesesOptions = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function EditEfemerideDialog({ efemeride, open, onOpenChange }: EditEfemerideDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { data: funcionarios } = useCollection<IngresoFuncionario>(firestore ? collection(firestore, 'INGRESO_FUNCIONARIOS') : null);

  const employeeOptions = useMemo(() => {
    return (funcionarios || []).map(f => {
      const lastName = [f['APELLIDO P'], f['APELLIDO M']].filter(Boolean).join(' ');
      const firstName = f.NOMBRES || '';
      const fullName = [lastName, firstName].filter(Boolean).join(', ');
      if (!fullName) return null;
      return { value: f.id, label: fullName };
    }).filter((opt): opt is { value: string; label: string; } => opt !== null);
  }, [funcionarios]);


  const form = useForm<EfemerideFormValues>({
    resolver: zodResolver(efemerideSchema),
  });

  useEffect(() => {
    if (efemeride) {
      form.reset({
        nombre: efemeride.nombre,
        dia: efemeride.dia,
        mes: efemeride.mes,
        encargados: efemeride.encargados || [],
        funcionarios_afectos: efemeride.funcionarios_afectos || [],
      });
    }
  }, [efemeride, form]);

  async function onSubmit(data: EfemerideFormValues) {
    if (!efemeride) return;
    setIsSubmitting(true);
    try {
        const result = await updateEfemeride({ ...data, id: efemeride.id });
        if (result?.error) {
            throw new Error(result.error);
        }
        toast({
            title: '¡Efeméride actualizada!',
            description: `El evento "${data.nombre}" ha sido actualizado.`,
        });
        onOpenChange(false);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: '¡Oh no! Algo salió mal.',
            description: error.message || 'No se pudo actualizar la efeméride.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Efeméride</DialogTitle>
          <DialogDescription>
            Actualiza los detalles del evento.
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
                      name="nombre"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Nombre de la Efeméride</FormLabel>
                          <FormControl>
                              <Input placeholder="Ej: Día del Hospital" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="dia"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Día</FormLabel>
                                <FormControl>
                                    <Input type="number" min="1" max="31" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="mes"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Mes</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un mes" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {mesesOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="encargados"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Encargados (Opcional)</FormLabel>
                                <FormControl>
                                    <MultipleSelector
                                        value={(field.value || []).map(id => ({ 
                                            value: id, 
                                            label: employeeOptions.find(opt => opt.value === id)?.label || 'Cargando...'
                                        }))}
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
                        name="funcionarios_afectos"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Funcionarios Afectos (Opcional)</FormLabel>
                                <FormControl>
                                    <MultipleSelector
                                        value={(field.value || []).map(id => ({ 
                                            value: id, 
                                            label: employeeOptions.find(opt => opt.value === id)?.label || 'Cargando...'
                                        }))}
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
