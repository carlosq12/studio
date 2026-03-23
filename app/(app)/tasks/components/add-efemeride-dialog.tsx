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
import { PlusCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MultipleSelector } from '@/components/ui/multiple-selector';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { IngresoFuncionario } from '@/lib/types';
import { addEfemeride } from '../actions';

const efemerideSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido.'),
  dia: z.coerce.number().min(1, 'Día inválido').max(31, 'Día inválido'),
  mes: z.string().min(1, 'El mes es requerido.'),
  encargados: z.array(z.string()),
  funcionarios_afectos: z.array(z.string()),
});

type EfemerideFormValues = z.infer<typeof efemerideSchema>;

const mesesOptions = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function AddEfemerideDialog() {
  const [open, setOpen] = useState(false);
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
    defaultValues: {
      nombre: '',
      dia: 1,
      mes: '',
      encargados: [],
      funcionarios_afectos: [],
    },
  });

  async function onSubmit(data: EfemerideFormValues) {
    setIsSubmitting(true);
    try {
        const result = await addEfemeride(data);
        if (result?.error) {
            throw new Error(result.error);
        }
        toast({
            title: '¡Efeméride añadida!',
            description: `El evento "${data.nombre}" ha sido añadido.`,
        });
        form.reset();
        setOpen(false);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: '¡Oh no! Algo salió mal.',
            description: error.message || 'No se pudo añadir la efeméride.',
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
          Añadir Efeméride
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear Nueva Efeméride</DialogTitle>
          <DialogDescription>
            Añade un nuevo evento o fecha especial al calendario.
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  'Guardar Efeméride'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
