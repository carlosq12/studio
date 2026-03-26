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
import { PlusCircle, Loader2, CalendarIcon, Monitor, Printer as PrinterIcon, Server, Tv, Laptop, Router, HardDrive } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import { addInventarioEquipo } from '../actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCollection, useFirestore } from '@/firebase/provider';
import { collection, Timestamp } from 'firebase/firestore';
import type { IngresoFuncionario, InventarioEquipo } from '@/lib/types';
import { ComboboxField } from '../../ingreso-funcionarios/components/combobox-field';
import React from 'react';

const equipoSchema = z.object({
  numero_interno: z.string().optional(),
  tipo_arriendo: z.string().optional(),
  'nombre equipo': z.string().min(1, 'El nombre del equipo es requerido.'),
  modelo: z.string().optional(),
  'tipo de equipo': z.string().optional(),
  serial: z.string().optional(),
  descripcion: z.string().optional(),
  'correo relacionado': z.string().email('Correo no es válido.').optional().or(z.literal('')),
  estado: z.string().optional(),
  'ip equipo': z.string().optional(),
  'licencia office': z.string().optional(),
  'personal a cargo': z.string().optional(),
  'usuario del encargado': z.string().optional(),
  ubicacion: z.string().optional(),
  dns1: z.string().optional(),
  dns2: z.string().optional(),
  'puerta de enlace ipv4': z.string().optional(),
  'mascara ipv4': z.string().optional(),
  'fecha de ingreso': z.date().optional().nullable(),
});

type EquipoFormValues = z.infer<typeof equipoSchema>;

const tipoDeEquipoOptions = ["IMPRESORA", "COMPUTADOR", "NOTEBOOK", "DATA", "CISCO", "SERVIDOR", "TV BOX", "VALTEK"];
const arriendoOptions = ["Arriendo Minsal", "Arriendo Hospital", "Compra Hospital"];

const getEquipoIcon = (tipo?: string): React.ElementType => {
    switch (tipo?.toUpperCase()) {
        case 'COMPUTADOR':
            return Monitor;
        case 'NOTEBOOK':
            return Laptop;
        case 'IMPRESORA':
            return PrinterIcon;
        case 'SERVIDOR':
            return Server;
        case 'TV BOX':
            return Tv;
        case 'CISCO':
            return Router;
        default:
            return HardDrive;
    }
}

interface AddEquipoDialogProps {
  initialData?: InventarioEquipo | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddEquipoDialog({ initialData, open: controlledOpen, onOpenChange: setControlledOpen }: AddEquipoDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const firestore = useFirestore();
  const { data: funcionarios } = useCollection<IngresoFuncionario>(firestore ? collection(firestore, 'INGRESO_FUNCIONARIOS') : null);

  const funcionarioOptions = useMemo(() => {
    const options = (funcionarios || []).map(f => {
      const lastName = [f['APELLIDO P'], f['APELLIDO M']].filter(Boolean).join(' ');
      const firstName = f.NOMBRES || '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      return { label: fullName, value: fullName, rut: f.RUT, id: f.id };
    }).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));

    return [{ label: 'Sin responsable', value: '', id: 'no-responsible' }, ...options];
  }, [funcionarios]);

  const form = useForm<EquipoFormValues>({
    resolver: zodResolver(equipoSchema),
    defaultValues: {
      numero_interno: '',
      tipo_arriendo: '',
      'nombre equipo': '',
      modelo: '',
      'tipo de equipo': '',
      serial: '',
      descripcion: '',
      'correo relacionado': '',
      estado: 'Activo',
      'ip equipo': '',
      'licencia office': '',
      'personal a cargo': '',
      'usuario del encargado': '',
      ubicacion: '',
      dns1: '',
      dns2: '',
      'puerta de enlace ipv4': '',
      'mascara ipv4': '',
      'fecha de ingreso': new Date(),
    },
  });

  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    if (typeof date === 'string') return parseISO(date);
    return null;
  }

  useEffect(() => {
    if (initialData && open) {
        form.reset({
            ...initialData,
            serial: '', // Clear serial for new item
            'fecha de ingreso': parseDate(initialData['fecha de ingreso']),
        });
    } else if (!open) {
        form.reset();
    }
  }, [initialData, open, form]);

  async function onSubmit(data: EquipoFormValues) {
    setIsSubmitting(true);
    try {
      const result = await addInventarioEquipo({...data, 'fecha de ingreso': data['fecha de ingreso']?.toISOString()});
      if (result?.error) {
        throw new Error(result.error);
      }
      
      toast({
          title: '¡Equipo añadido!',
          description: `El equipo "${data['nombre equipo']}" se ha registrado correctamente.`,
      });
      
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '¡Oh no! Algo salió mal.',
        description: error.message || 'No se pudo añadir el equipo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'ip equipo' | 'dns1' | 'dns2' | 'puerta de enlace ipv4' | 'mascara ipv4') => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');

    let newVal = parts.map((part) => {
        if (part.length > 3) {
            return part.substring(0, 3);
        }
        return part;
    }).join('.');

    if (parts.length < 4) {
      const lastPart = parts[parts.length - 1];
      if (lastPart.length === 3 && e.nativeEvent.type !== 'deleteContentBackward') {
          newVal += '.';
      }
    }

    form.setValue(fieldName, newVal.split('.').slice(0,4).join('.'));
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!initialData && (
        <DialogTrigger asChild>
           <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Equipo
            </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Duplicar Equipo' : 'Añadir Nuevo Equipo'}</DialogTitle>
          <DialogDescription>
            {initialData 
              ? "Modifica los detalles necesarios y guarda como un nuevo equipo." 
              : "Completa los detalles del equipo. Haz clic en guardar cuando termines."
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="h-96 pr-6">
              <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="numero_interno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número Interno de Inventario</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: INV-2024-001" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tipo_arriendo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Arriendo (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo de arriendo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {arriendoOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nombre equipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Equipo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Laptop Dell Latitude 5420" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="tipo de equipo"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de Equipo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un tipo" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {tipoDeEquipoOptions.map(option => {
                                    const Icon = getEquipoIcon(option);
                                    return (
                                        <SelectItem key={option} value={option}>
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4" />
                                                <span>{option}</span>
                                            </div>
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modelo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Latitude 5420" {...field} value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Serie (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: ABC123XYZ" {...field} value={field.value ?? ''}/>
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
                        <Input placeholder="Ej: 16GB RAM, 512GB SSD" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="correo relacionado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Relacionado (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: tecnico@hospital.cl" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                              <SelectItem value="Activo">Activo</SelectItem>
                              <SelectItem value="En Reparación">En Reparación</SelectItem>
                              <SelectItem value="Fuera De Servicio">Fuera De Servicio</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ip equipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección IP (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 192.168.1.100" {...field} value={field.value ?? ''} onChange={(e) => handleIpChange(e, 'ip equipo')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="dns1"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>DNS 1 (Opcional)</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: 8.8.8.8" {...field} value={field.value ?? ''} onChange={(e) => handleIpChange(e, 'dns1')} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="dns2"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>DNS 2 (Opcional)</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: 8.8.4.4" {...field} value={field.value ?? ''} onChange={(e) => handleIpChange(e, 'dns2')} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="puerta de enlace ipv4"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Puerta de enlace IPv4 (Opcional)</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: 192.168.1.1" {...field} value={field.value ?? ''} onChange={(e) => handleIpChange(e, 'puerta de enlace ipv4')} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="mascara ipv4"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Máscara de subred IPv4 (Opcional)</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: 255.255.255.0" {...field} value={field.value ?? ''} onChange={(e) => handleIpChange(e, 'mascara ipv4')} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="licencia office"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Licencia de Office (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Microsoft 365 E3" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <ComboboxField
                    control={form.control}
                    name="personal a cargo"
                    label="Nombre del Encargado (Opcional)"
                    options={funcionarioOptions}
                    placeholder="Selecciona un funcionario..."
                    emptyMessage="No se encontraron funcionarios."
                    onValueChange={(value) => form.setValue('personal a cargo', value)}
                />
                <FormField
                  control={form.control}
                  name="usuario del encargado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario del Encargado (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: jperez" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ubicacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Oficina de Contabilidad" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="fecha de ingreso"
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
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
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
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Equipo'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
