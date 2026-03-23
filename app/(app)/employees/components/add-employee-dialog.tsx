
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
import { PlusCircle, Loader2, CalendarIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { addEmployee } from '../actions';
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

const employeeFormSchema = z.object({
  'FECHA DE INGRESO': z.date({
    required_error: 'La fecha de ingreso es requerida.',
  }),
  RUT: z.string().min(1, 'El RUT es requerido.'),
  'NOMBRE FUNCIONARIO': z.string().min(1, 'El nombre es requerido.'),
  'APELLIDO PATERNO': z.string().min(1, 'El apellido paterno es requerido.'),
  'APELLIDO MATERNO': z.string().min(1, 'El apellido materno es requerido.'),
  TITULO: z.string().min(1, 'El cargo es requerido.'),
  'UNIDAD O SERVICIO': z.string().optional(),
  ESTAMENTO: z.string().optional(),
  JEFATURA: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      'FECHA DE INGRESO': new Date(),
      RUT: '',
      'NOMBRE FUNCIONARIO': '',
      'APELLIDO PATERNO': '',
      'APELLIDO MATERNO': '',
      TITULO: '',
      'UNIDAD O SERVICIO': '',
      ESTAMENTO: '',
      JEFATURA: '',
    },
  });

  async function onSubmit(data: EmployeeFormValues) {
    setIsSubmitting(true);
    try {
      const employeeData = {
        ...data,
        'FECHA DE INGRESO': format(data['FECHA DE INGRESO'], 'yyyy-MM-dd'),
      };
      
      const result = await addEmployee(employeeData);

      if (result?.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Empleado añadido!',
        description: `${data['NOMBRE FUNCIONARIO']} ha sido añadido a la lista.`,
      });
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description:
          error.message || 'No se pudo añadir el empleado. Inténtalo de nuevo.',
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
          Añadir Empleado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ingresar Empleado</DialogTitle>
          <DialogDescription>
            Ingresa los detalles del nuevo empleado. Haz clic en guardar cuando
            termines.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <ScrollArea className="h-96 pr-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <FormField
                  control={form.control}
                  name="NOMBRE FUNCIONARIO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombres</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Juan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="APELLIDO PATERNO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido Paterno</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="APELLIDO MATERNO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido Materno</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: González" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="RUT"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUT</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 12.345.678-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="FECHA DE INGRESO"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Ingreso</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: es })
                              ) : (
                                <span>Selecciona una fecha</span>
                              )}
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
                            fromYear={1950}
                            toYear={new Date().getFullYear()}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
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
                  name="TITULO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo/Título</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Ingeniero de Software"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="UNIDAD O SERVICIO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad o Servicio</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Desarrollo"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="JEFATURA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jefatura</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Gerencia TI"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ESTAMENTO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estamento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Profesional"
                          {...field}
                          value={field.value ?? ''}
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
                  'Guardar Empleado'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
