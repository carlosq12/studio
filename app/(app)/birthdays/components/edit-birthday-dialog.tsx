
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
import { Loader2, CalendarIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { updateBirthday } from '../actions';
import type { Birthday } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';


const birthdayFormSchema = z.object({
  'nombre funcionario': z.string().min(1, 'El nombre es requerido.'),
  'fecha nacimiento': z.date({
    required_error: 'La fecha de nacimiento es requerida.',
  }),
  correo: z.string().email('El correo no es válido.').optional().or(z.literal('')),
});

type BirthdayFormValues = z.infer<typeof birthdayFormSchema>;

interface EditBirthdayDialogProps {
    birthday: Birthday | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditBirthdayDialog({ birthday, open, onOpenChange }: EditBirthdayDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<BirthdayFormValues>({
    resolver: zodResolver(birthdayFormSchema),
  });

  useEffect(() => {
    if (birthday) {
        let birthDate: Date;
        if (birthday['fecha nacimiento'] instanceof Timestamp) {
            birthDate = birthday['fecha nacimiento'].toDate();
        } else if (typeof birthday['fecha nacimiento'] === 'string') {
            birthDate = new Date(birthday['fecha nacimiento']);
        } else {
            birthDate = new Date();
        }

        form.reset({
            'nombre funcionario': birthday['nombre funcionario'] || '',
            'fecha nacimiento': birthDate,
            correo: birthday.correo || '',
        });
    }
  }, [birthday, form]);


  async function onSubmit(data: BirthdayFormValues) {
    if (!birthday) return;
    setIsSubmitting(true);
    try {
       const birthdayData = {
        ...data,
        id: birthday.id,
        'fecha nacimiento': data['fecha nacimiento'].toISOString(),
      };

      const result = await updateBirthday(birthdayData);

      if (result?.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Cumpleaños actualizado!',
        description: `El cumpleaños de ${data['nombre funcionario']} ha sido actualizado.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description:
          error.message || 'No se pudo actualizar el cumpleaños. Inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cumpleaños</DialogTitle>
          <DialogDescription>
            Actualiza los detalles del cumpleaños. Haz clic en guardar cuando termines.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 py-6"
          >
            <FormField
              control={form.control}
              name="nombre funcionario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Funcionario</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
             <FormField
                control={form.control}
                name="fecha nacimiento"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Nacimiento</FormLabel>
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
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                           captionLayout="dropdown-buttons"
                           fromYear={1950}
                           toYear={new Date().getFullYear()}
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
              name="correo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: juan.perez@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
