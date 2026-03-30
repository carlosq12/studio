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
import { useState, useEffect } from 'react';
import { addReplacement } from '../actions';
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { IngresoFuncionario, Replacement } from '@/lib/types';
import { ComboboxField } from '../../ingreso-funcionarios/components/combobox-field';
import { Timestamp } from 'firebase/firestore';

const replacementSchema = z.object({
  'FECHA DE INGRESO DOC': z.date().optional().nullable(),
  NOMBRE: z.string().min(1, 'El nombre del reemplazante es requerido.'),
  MES: z.string().optional(),
  CARGO: z.string().optional(),
  FUNCIONES: z.string().optional(),
  UNIDAD: z.string().optional(),
  DESDE: z.date({ required_error: 'La fecha de inicio es requerida.' }),
  HASTA: z.date({ required_error: 'La fecha de término es requerida.' }),
  'NOMBRE REEMPLAZADO': z.string().min(1, 'El nombre del reemplazado es requerido.'),
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
});

type ReplacementFormValues = z.infer<typeof replacementSchema>;

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
].map((mes) => ({ label: mes, value: mes }));

const years = Array.from({ length: 15 }, (_, i) => {
  const year = new Date().getFullYear() - 5 + i;
  return { label: year.toString(), value: year.toString() };
});

const cargos = ['OFA', 'T. OCUPACIONAL', 'PSICOLOGO', 'AUXILIAR', 'TENS', 'TONS', 'MEDICO', 'CONDUCTOR', 'DENTISTA', 'ADM', 'MATRONA', 'ENFERMER(@)', 'KINESIOLOGO', 'TECNOLOG@', 'NUTRICIONISTA'];
const unidades = ['FARMACIA', 'URGENCIA', 'CONSULTORIO', 'MEDICINA', 'ASEO', 'MOVILIZACION', 'LABORATORIO', 'DIRECCION', 'GES', 'FINANZA', 'PERSONAL', 'SUB DIRECCION MEDICA', 'CENTRAL ALIMENTACION', 'PACAM', 'ESTERILIZACION', 'MATRONAS', 'DENTAL', 'SOME', 'LAVANDERIA', 'MANTENIMIENTO', 'CURACIONES', 'DOMICILIARIA'];

export const jefesDeServicio = [
  { name: 'BERTONI DEL PINO GABRIEL', email: 'gbertoni@ssmaule.cl' },
  { name: 'AVELLO HUGO', email: 'havello@ssmaule.cl' },
  { name: 'MUÑOZ CAROLINA', email: 'cmunozval@ssmaule.cl' },
  { name: 'BERMONT CONSTANZA', email: 'cbermont@ssmaule.cl' },
  { name: 'HERNANDEZ VERDUGO DANITZA', email: 'dhernandez@ssmaule.cl' },
  { name: 'GUERRA SALGADO DAVID', email: 'dguerras@ssmaule.cl' },
  { name: 'ARANEDA BRAVO SALOME', email: 'saraneda@ssmaule.cl' },
  { name: 'ANDRADE GONZALEZ YOSELINE', email: 'yandrade@ssmaule.cl' },
  { name: 'ALVARADO RETAMAL AGUSTIN', email: 'aalvarado@ssmaule.cl' },
  { name: 'ARMIJO ALLENDES JENIFFER', email: 'jarmijo@ssmaule.cl' },
  { name: 'BADILLO JARAMILLO JHONATAN', email: 'jbadillo@ssmaule.cl' },
  { name: 'BUSTAMANTE ANA', email: 'abustamante@ssmaule.cl' },
  { name: 'ESPINA FELIPE', email: 'fespina@ssmaule.cl' },
  { name: 'MARCHANT IGNACIO', email: 'imarchant@ssmaule.cl' },
  { name: 'MUÑOZ VERGARA EMILIO', email: 'emunozv@ssmaule.cl' },
];

interface AddReplacementDialogProps {
  funcionarios: IngresoFuncionario[];
  funcionarioOptions: { label: string; value: string; rut?: string; id: string }[];
  initialData?: Replacement | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddReplacementDialog({
  funcionarios,
  funcionarioOptions,
  initialData,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: AddReplacementDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ReplacementFormValues>({
    resolver: zodResolver(replacementSchema),
    defaultValues: {
      NOMBRE: '',
      'NOMBRE REEMPLAZADO': '',
      MOTIVO: '',
      MES: '',
      CARGO: '',
      FUNCIONES: '',
      UNIDAD: '',
      OBSERVACION: '',
      IMAGEN: '',
      ESTADO: 'Pendiente',
      'JEFE SERVICIO': '',
      CORREO: '',
      ESTADO_R_NR: 'EN PROCESO',
      AÑO: new Date().getFullYear().toString(),
      'NUMERO RES': '',
      'FECHA DE INGRESO DOC': new Date(),
      'FECHA DEL AVISO': null,
    },
  });

  async function onSubmit(data: ReplacementFormValues) {
    setIsSubmitting(true);
    try {
      // Enviamos el objeto con las fechas como Date para que la acción las maneje
      const result = await addReplacement(data);

      if (result?.error) {
        throw new Error(result.error);
      }
      toast({
        title: initialData ? '¡Solicitud Duplicada!' : '¡Solicitud añadida!',
        description: `La solicitud para ${data['NOMBRE REEMPLAZADO']} ha sido registrada.`,
      });
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: error.message || 'No se pudo añadir la solicitud.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
       {!initialData && (
        <DialogTrigger asChild>
            <Button className="bg-primary text-white hover:bg-primary/90">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Solicitud
            </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Duplicar Solicitud' : 'Crear Solicitud de Reemplazo'}</DialogTitle>
          <DialogDescription>Completa los campos para registrar el nuevo reemplazo.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="h-[60vh] pr-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
                <ComboboxField
                    control={form.control}
                    name="NOMBRE REEMPLAZADO"
                    label="Nombre Reemplazado"
                    options={funcionarioOptions}
                    placeholder="Selecciona funcionario..."
                    onValueChange={(v) => form.setValue('NOMBRE REEMPLAZADO', v)}
                    showAddButton={true}
                />

                <ComboboxField
                    control={form.control}
                    name="NOMBRE"
                    label="Nombre Reemplazante"
                    options={funcionarioOptions}
                    placeholder="Selecciona reemplazante..."
                    onValueChange={(v) => form.setValue('NOMBRE', v)}
                    showAddButton={true}
                />

                <FormField
                  control={form.control}
                  name="DESDE"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha Desde</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar 
                            mode="single" 
                            selected={field.value ?? undefined} 
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

                <FormField
                  control={form.control}
                  name="HASTA"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha Hasta</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar 
                            mode="single" 
                            selected={field.value ?? undefined} 
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

                <FormField
                  control={form.control}
                  name="CARGO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger></FormControl>
                        <SelectContent>{cargos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
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
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar unidad" /></SelectTrigger></FormControl>
                        <SelectContent>{unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ESTADO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado Solicitud</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="Aceptado">Aceptado</SelectItem>
                          <SelectItem value="Rechazado">Rechazado</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ESTADO_R_NR"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado R/NR</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="SI">SI</SelectItem>
                          <SelectItem value="NO">NO</SelectItem>
                          <SelectItem value="EN PROCESO">EN PROCESO</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="NUMERO RES"
                  render={({ field }) => (
                    <FormItem><FormLabel>Nº Resolución</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="MOTIVO"
                  render={({ field }) => (
                    <FormItem><FormLabel>Motivo</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl></FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="OBSERVACION"
                  render={({ field }) => (
                    <FormItem><FormLabel>Observaciones</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl></FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-white">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Solicitud'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
