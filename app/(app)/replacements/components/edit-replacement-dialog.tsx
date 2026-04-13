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
import { useState, useEffect, useMemo } from 'react';
import { updateReplacement } from '../actions';
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
import { Textarea } from '@/components/ui/textarea';
import type { Replacement, IngresoFuncionario } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ComboboxField } from '../../ingreso-funcionarios/components/combobox-field';
import { jefesDeServicio } from './add-replacement-dialog';

const replacementSchema = z.object({
  'FECHA DE INGRESO DOC': z.date().optional().nullable(),
  NOMBRE: z.string().min(1, 'El nombre del reemplazante es requerido.'),
  MES: z.string().optional(),
  CARGO: z.string().optional(),
  FUNCIONES: z.string().optional(),
  UNIDAD: z.string().optional(),
  DESDE: z.date({ required_error: 'La fecha de inicio es requerida.' }),
  HASTA: z.date({ required_error: 'La fecha de término es requerida.' }),
  'NOMBRE REEMPLAZADO': z
    .string()
    .min(1, 'El nombre del reemplazado es requerido.'),
  MOTIVO: z.string().optional(),
  OBSERVACION: z.string().optional(),
  IMAGEN: z.string().optional(),
  ESTADO: z.string().optional(),
  'JEFE SERVICIO': z.string().optional(),
  CORREO: z.string().optional(),
  ESTADO_R_NR: z.string().optional(),
  'FECHA DEL AVISO': z.date().optional().nullable(),
  AÑO: z.string().optional(),
  'NUMERO RES': z.string().optional(),
  archivadorId: z.string().optional(),
  ES_PARCIAL: z.boolean().optional(),
  FECHA_PARCIAL_INICIO: z.date().optional().nullable(),
  FECHA_PARCIAL_FIN: z.date().optional().nullable(),
});

type ReplacementFormValues = z.infer<typeof replacementSchema>;

const meses = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
].map((mes) => ({ label: mes, value: mes }));

const years = Array.from({ length: 41 }, (_, i) => {
  const year = new Date().getFullYear() - 10 + i;
  return { label: year.toString(), value: year.toString() };
});

const cargos = [
    'OFA', 'T. OCUPACIONAL', 'PSICOLOGO', 'AUXILIAR', 'TENS', 'TONS', 'MEDICO',
    'CONDUCTOR', 'DENTISTA', 'ADM', 'MATRONA', 'ENFERMER(@)', 'KINESIOLOGO', 'TECNOLOG@', 'NUTRICIONISTA'
];
const unidades = [
    'FARMACIA', 'URGENCIA', 'CONSULTORIO', 'MEDICINA', 'ASEO', 'MOVILIZACION',
    'LABORATORIO', 'DIRECCION', 'GES', 'FINANZA', 'PERSONAL', 'SUB DIRECCION MEDICA',
    'CENTRAL ALIMENTACION', 'PACAM', 'ESTERILIZACION', 'MATRONAS', 'DENTAL', 'SOME',
    'LAVANDERIA', 'MANTENIMIENTO', 'CURACIONES', 'DOMICILIARIA'
];

interface EditReplacementDialogProps {
  replacement: Replacement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionarios: IngresoFuncionario[];
  funcionarioOptions: { label: string; value: string; rut?: string; id: string; }[];
}

export function EditReplacementDialog({
  replacement,
  open,
  onOpenChange,
  funcionarios,
  funcionarioOptions
}: EditReplacementDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [selectedReemplazadoRut, setSelectedReemplazadoRut] = useState<string | null>(null);
  const [selectedReemplazanteRut, setSelectedReemplazanteRut] = useState<string | null>(null);

  const form = useForm<ReplacementFormValues>({
    resolver: zodResolver(replacementSchema),
  });

  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    if (typeof date === 'string') {
      const parsed = parseISO(date);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    if (date instanceof Date && !isNaN(date.getTime())) return date;
    return null;
  };

  useEffect(() => {
    if (replacement) {
      form.reset({
        ...replacement,
        NOMBRE: replacement.NOMBRE || '',
        'NOMBRE REEMPLAZADO': replacement['NOMBRE REEMPLAZADO'] || '',
        DESDE: parseDate(replacement.DESDE) || new Date(),
        HASTA: parseDate(replacement.HASTA) || new Date(),
        'FECHA DE INGRESO DOC': parseDate(replacement['FECHA DE INGRESO DOC']),
        'FECHA DEL AVISO': parseDate(replacement['FECHA DEL AVISO']),
        MOTIVO: replacement.MOTIVO || '',
        MES: replacement.MES || '',
        CARGO: replacement.CARGO || '',
        FUNCIONES: replacement.FUNCIONES || '',
        UNIDAD: replacement.UNIDAD || '',
        OBSERVACION: replacement.OBSERVACION || '',
        IMAGEN: replacement.IMAGEN || '',
        ESTADO: replacement.ESTADO || '',
        'JEFE SERVICIO': replacement['JEFE SERVICIO'] || '',
        CORREO: replacement.CORREO || '',
        ESTADO_R_NR:
          replacement.ESTADO_R_NR || (replacement as any)['ESTADO R/NR'] || '',
        AÑO: replacement.AÑO || '',
        'NUMERO RES': replacement['NUMERO RES'] || '',
        archivadorId: replacement.archivadorId || '',
        ES_PARCIAL: !!replacement.ES_PARCIAL,
        FECHA_PARCIAL_INICIO: parseDate(replacement.FECHA_PARCIAL_INICIO),
        FECHA_PARCIAL_FIN: parseDate(replacement.FECHA_PARCIAL_FIN),
      });
    }
  }, [replacement, form]);
  
  const handleValueChange = (fieldName: 'NOMBRE' | 'NOMBRE REEMPLAZADO', value: string) => {
    form.setValue(fieldName, value);
    const selected = funcionarios.find(f => {
        const fullName = `${f.NOMBRES || ''} ${f['APELLIDO P'] || ''} ${f['APELLIDO M'] || ''}`.trim();
        return fullName.toLowerCase() === value.toLowerCase();
    });

    if (fieldName === 'NOMBRE REEMPLAZADO') {
        setSelectedReemplazadoRut(selected?.RUT || null);
    } else {
        setSelectedReemplazanteRut(selected?.RUT || null);
    }
  };

  const handleJefeChange = (value: string, type: 'name' | 'email') => {
    if (type === 'name') {
      const selected = jefesDeServicio.find((j) => j.name === value);
      form.setValue('JEFE SERVICIO', value);
      form.setValue('CORREO', selected?.email || '');
    } else {
      const selected = jefesDeServicio.find((j) => j.email === value);
      form.setValue('CORREO', value);
      form.setValue('JEFE SERVICIO', selected?.name || '');
    }
  };

  async function onSubmit(data: ReplacementFormValues) {
    if (!replacement) return;

    setIsSubmitting(true);
    try {
      const replacementData = {
        ...data,
        id: replacement.id,
        'FECHA DE INGRESO DOC': data['FECHA DE INGRESO DOC']?.toISOString() || '',
        DESDE: data.DESDE.toISOString(),
        HASTA: data.HASTA.toISOString(),
        'FECHA DEL AVISO': data['FECHA DEL AVISO']?.toISOString() || '',
        FECHA_PARCIAL_INICIO: data.FECHA_PARCIAL_INICIO?.toISOString() || '',
        FECHA_PARCIAL_FIN: data.FECHA_PARCIAL_FIN?.toISOString() || '',
      };

      const result = await updateReplacement(replacementData);

      if (result?.error) {
        throw new Error(result.error);
      }
      toast({
        title: '¡Solicitud actualizada!',
        description: `La solicitud de reemplazo ha sido actualizada.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description:
          error.message || 'No se pudo actualizar la solicitud. Inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const DateField = ({
    name,
    label,
  }: {
    name: keyof ReplacementFormValues;
    label: string;
  }) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
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
                    format(new Date(field.value), 'PPP', { locale: es })
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
                selected={field.value ? new Date(field.value) : undefined}
                onSelect={field.onChange}
                initialFocus
                locale={es}
                captionLayout="dropdown-buttons"
                fromYear={new Date().getFullYear() - 10}
                toYear={new Date().getFullYear() + 10}
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Editar Solicitud de Reemplazo</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la solicitud.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="h-[60vh] pr-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
                <div>
                  <ComboboxField
                    control={form.control}
                    name="NOMBRE REEMPLAZADO"
                    label="Nombre Reemplazado"
                    options={funcionarioOptions}
                    placeholder="Selecciona o escribe un nombre..."
                    emptyMessage="No se encontraron funcionarios."
                    onValueChange={(value) =>
                      handleValueChange('NOMBRE REEMPLAZADO', value)
                    }
                    showAddButton={true}
                  />
                  {selectedReemplazadoRut && (
                    <p className="text-xs text-muted-foreground mt-1">
                      RUT: {selectedReemplazadoRut}
                    </p>
                  )}
                </div>

                <div>
                  <ComboboxField
                    control={form.control}
                    name="NOMBRE"
                    label="Nombre Reemplazante"
                    options={funcionarioOptions}
                    placeholder="Selecciona o escribe un nombre..."
                    emptyMessage="Funcionario no encontrado."
                    showAddButton={true}
                    onValueChange={(value) => handleValueChange('NOMBRE', value)}
                  />
                  {selectedReemplazanteRut && (
                    <p className="text-xs text-muted-foreground mt-1">
                      RUT: {selectedReemplazanteRut}
                    </p>
                  )}
                </div>

                <DateField name="DESDE" label="Desde" />
                <DateField name="HASTA" label="Hasta" />

                <FormField
                  control={form.control}
                  name="MOTIVO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo (Opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DateField
                  name="FECHA DE INGRESO DOC"
                  label="Fecha Ingreso Documento"
                />

                <FormField
                  control={form.control}
                  name="CARGO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un cargo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cargos.map((cargo) => (
                            <SelectItem key={cargo} value={cargo}>
                              {cargo}
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
                  name="UNIDAD"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una unidad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {unidades.map((unidad) => (
                            <SelectItem key={unidad} value={unidad}>
                              {unidad}
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
                  name="FUNCIONES"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3">
                      <FormLabel>Funciones</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="OBSERVACION"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3">
                      <FormLabel>Observación</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ''} />
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="Aceptado">Aceptado</SelectItem>
                          <SelectItem value="Rechazado">Rechazado</SelectItem>
                          <SelectItem value="En Curso">En Curso</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="JEFE SERVICIO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jefe de Servicio</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          handleJefeChange(value, 'name')
                        }
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un jefe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jefesDeServicio.map((jefe) => (
                            <SelectItem
                              key={jefe.email + jefe.name}
                              value={jefe.name}
                            >
                              {jefe.name}
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
                  name="CORREO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          handleJefeChange(value, 'email')
                        }
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un correo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jefesDeServicio.map((jefe) => (
                            <SelectItem
                              key={jefe.email + jefe.name}
                              value={jefe.email}
                            >
                              {jefe.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DateField name="FECHA DEL AVISO" label="Fecha del Aviso" />
                <FormField
                  control={form.control}
                  name="MES"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Mes</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un mes" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {meses.map((mes) => (
                            <SelectItem key={mes.value} value={mes.value}>
                              {mes.label}
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
                  name="AÑO"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Año</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un año" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year.value} value={year.value}>
                              {year.label}
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
                  name="ESTADO_R_NR"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado R/NR</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SI">SI</SelectItem>
                          <SelectItem value="NO">NO</SelectItem>
                          <SelectItem value="EN PROCESO">
                            EN PROCESO
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="NUMERO RES"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº Resolución</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="IMAGEN"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Imagen/Documento</FormLabel>
                      <FormControl>
                        <Input type="url" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ES_PARCIAL"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-red-50/30 border-red-100">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-bold text-red-700">Contrato Parcial</FormLabel>
                        <div className="text-[10px] text-red-600">
                          Identificar como entrega parcial
                        </div>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-red-300 text-red-600 focus:ring-red-600"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('ES_PARCIAL') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DateField name="FECHA_PARCIAL_INICIO" label="Inicio Parcial" />
                    <DateField name="FECHA_PARCIAL_FIN" label="Fin Parcial" />
                  </div>
                )}
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
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
