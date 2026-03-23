
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
import { addFuncionario } from '../actions';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const funcionarioSchema = z.object({
  FECHA_DE_INGRESO: z.date().optional().nullable(),
  RUT: z.string().min(1, 'RUT es requerido.'),
  NOMBRES: z.string().optional(),
  'APELLIDO P': z.string().optional(),
  'APELLIDO M': z.string().optional(),
  TELEFONO: z.string().optional(),
  FECHA_DE_NACIMIENTO: z.date().optional().nullable(),
  LUGAR_NACIMIENTO: z.string().optional(),
  DIRECCION: z.string().optional(),
  CORREO: z.string().email('Correo no es válido.').optional().or(z.literal('')),
  AFP: z.string().optional(),
  SALUD: z.string().optional(),
  BANCO: z.string().optional(),
  TIPO_DE_CUENTA: z.string().optional(),
  N_CUENTA: z.string().optional(),
  NOMBRE_ISAPRE: z.string().optional(),
  ESTADO: z.string().optional(),
  N_RELOJ_CONTROL: z.string().optional(),
  CARGO: z.string().optional(),
  ESTADO_CIVIL: z.string().optional(),
});

type FuncionarioFormValues = z.infer<typeof funcionarioSchema>;

const bancos = [
  "Banco de Crédito e Inversiones (BCI)",
  "Wise",
  "Banco Santander Chile",
  "Banco de Chile",
  "BancoEstado",
  "Scotiabank Chile",
  "Banco Itaú Chile",
  "Banco BICE",
  "Banco Security",
  "Banco Falabella",
  "Banco Ripley",
  "Banco Consorcio",
];

const estadosCiviles = ["Casad@", "Soltero@", "Viud@", "Otro"];

export function AddFuncionarioDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FuncionarioFormValues>({
    resolver: zodResolver(funcionarioSchema),
    defaultValues: {
        RUT: '',
        NOMBRES: '',
        'APELLIDO P': '',
        'APELLIDO M': '',
        CARGO: '',
        ESTADO_CIVIL: '',
        LUGAR_NACIMIENTO: '',
        DIRECCION: '',
        CORREO: '',
        ESTADO: 'Activo',
        AFP: '',
        NOMBRE_ISAPRE: '',
        BANCO: '',
        TELEFONO: '',
        SALUD: '',
        TIPO_DE_CUENTA: '',
        N_CUENTA: '',
        N_RELOJ_CONTROL: '',
        FECHA_DE_INGRESO: null,
        FECHA_DE_NACIMIENTO: null,
    },
  });

  async function onSubmit(data: FuncionarioFormValues) {
    setIsSubmitting(true);
    try {
      const funcionarioData = {
        ...data,
        FECHA_DE_INGRESO: data.FECHA_DE_INGRESO?.toISOString() || '',
        FECHA_DE_NACIMIENTO: data.FECHA_DE_NACIMIENTO?.toISOString() || '',
      };
      
      const result = await addFuncionario(funcionarioData);

      if (result?.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Funcionario añadido!',
        description: `${data.NOMBRES || data.RUT} ha sido añadido a la lista.`,
      });
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description:
          error.message || 'No se pudo añadir el funcionario. Inténtalo de nuevo.',
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
          Añadir Funcionario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Ingresar Nuevo Funcionario</DialogTitle>
          <DialogDescription>
            Ingresa los detalles del nuevo funcionario.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <ScrollArea className="h-[60vh] pr-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
                <FormField
                  control={form.control}
                  name="RUT"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUT</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="NOMBRES"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombres</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="APELLIDO P"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido Paterno</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="APELLIDO M"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido Materno</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ESTADO_CIVIL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado Civil</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona estado civil" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {estadosCiviles.map(estado => (
                            <SelectItem key={estado} value={estado}>
                              {estado}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="CARGO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="TELEFONO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="FECHA_DE_INGRESO"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Ingreso</FormLabel>
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
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={1980} toYear={new Date().getFullYear()} initialFocus locale={es} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="FECHA_DE_NACIMIENTO"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Nacimiento</FormLabel>
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
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={1950} toYear={new Date().getFullYear()} initialFocus locale={es} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="LUGAR_NACIMIENTO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lugar de Nacimiento</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="DIRECCION"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="CORREO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="AFP"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AFP</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="SALUD"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salud</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Fonasa" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="BANCO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un banco" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bancos.map(banco => (
                            <SelectItem key={banco} value={banco}>
                              {banco}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="TIPO_DE_CUENTA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cuenta</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="N_CUENTA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº Cuenta</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="NOMBRE_ISAPRE"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre ISAPRE</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="ESTADO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="N_RELOJ_CONTROL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº Reloj Control</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Funcionario'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
