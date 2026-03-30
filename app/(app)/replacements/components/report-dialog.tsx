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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultipleSelector, type Option } from '@/components/ui/multiple-selector';
import { Printer, CalendarIcon, File, Eye, FileSpreadsheet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Replacement } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { jefesDeServicio } from './add-replacement-dialog';
import * as XLSX from 'xlsx';

const reportSchema = z.object({
  fechaInicio: z.date().optional().nullable(),
  fechaFin: z.date().optional().nullable(),
  jefeServicio: z.string().optional(),
  estados: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface ReportDialogProps {
  replacements: Replacement[];
}

const estadoOptions: Option[] = [
    { label: 'SI', value: 'SI' },
    { label: 'EN PROCESO', value: 'EN PROCESO' },
    { label: 'NO', value: 'NO' },
];

export function ReportDialog({ replacements }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      jefeServicio: 'todos',
      estados: [
        { label: 'SI', value: 'SI' },
        { label: 'EN PROCESO', value: 'EN PROCESO' },
      ],
    },
  });

  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return date instanceof Date && !isNaN(date.getTime()) ? date : null;
  };

  const fechaInicio = form.watch('fechaInicio');
  const fechaFin = form.watch('fechaFin');

  const dynamicJefesOptions = useMemo(() => {
    const jefesInDateRange = new Set<string>();

    if (!replacements) return [];

    replacements.forEach(rep => {
      const repDesde = parseDate(rep.DESDE);
      const repHasta = parseDate(rep.HASTA);

      if (rep['JEFE SERVICIO']) {
        const overlap = 
          (!fechaInicio || (repHasta && repHasta >= fechaInicio)) &&
          (!fechaFin || (repDesde && repDesde <= fechaFin));
        
        if (overlap) {
          jefesInDateRange.add(rep['JEFE SERVICIO']);
        }
      }
    });
    
    const uniqueJefesNames = Array.from(jefesInDateRange).sort();
    
    return jefesDeServicio.filter(jefe => uniqueJefesNames.includes(jefe.name));
  }, [replacements, fechaInicio, fechaFin]);

  const currentJefeServicio = form.watch('jefeServicio');

  useEffect(() => {
    if (currentJefeServicio && currentJefeServicio !== 'todos' && !dynamicJefesOptions.some(j => j.name === currentJefeServicio)) {
      form.setValue('jefeServicio', 'todos');
    }
  }, [dynamicJefesOptions, currentJefeServicio, form]);

  const formatDateForPrint = (date: any): string => {
    const d = parseDate(date);
    return d ? format(d, 'P', { locale: es }) : 'N/A';
  };

  const getFilteredData = (data: ReportFormValues) => {
    const { fechaInicio, fechaFin, jefeServicio, estados } = data;

    const filteredReplacements = replacements.filter(rep => {
      const repDesde = parseDate(rep.DESDE);
      const repHasta = parseDate(rep.HASTA);

      const dateMatch = 
        (!fechaInicio || (repHasta && repHasta >= fechaInicio)) &&
        (!fechaFin || (repDesde && repDesde <= fechaFin));

      const jefeMatch = !jefeServicio || jefeServicio === 'todos' || rep['JEFE SERVICIO'] === jefeServicio;
      
      const estadoValues = estados?.map(e => e.value) || [];
      const estadoMatch = estadoValues.length === 0 || estadoValues.includes(rep.ESTADO_R_NR || (rep as any)['ESTADO R/NR']);

      return dateMatch && jefeMatch && estadoMatch;
    });

    if (filteredReplacements.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin Resultados',
        description: 'No se encontraron registros con los filtros seleccionados.',
      });
      return null;
    }
    
    return filteredReplacements.sort((a, b) => {
        const replacerA = a.NOMBRE || '';
        const replacerB = b.NOMBRE || '';
        const comparison = replacerA.localeCompare(replacerB, 'es', { sensitivity: 'base' });
        if (comparison !== 0) {
            return comparison;
        }
        const dateA = parseDate(a.DESDE);
        const dateB = parseDate(b.DESDE);
        if (dateA && dateB) {
            return dateA.getTime() - dateB.getTime();
        }
        return 0;
    });
  }

  const getReportHtml = (sortedReplacements: Replacement[], title: string) => {
    const tableBodyContent = sortedReplacements.map(rep => {
        const fromDate = parseDate(rep.DESDE);
        const toDate = parseDate(rep.HASTA);
        let days = 0;
        if (fromDate && toDate) {
            days = differenceInDays(toDate, fromDate) + 1;
        }

        return `
            <tr>
                <td>${rep.NOMBRE || 'N/A'}</td>
                <td>${rep['NOMBRE REEMPLAZADO'] || 'N/A'}</td>
                <td>${formatDateForPrint(rep.DESDE)}</td>
                <td>${formatDateForPrint(rep.HASTA)}</td>
                <td>${days}</td>
                <td>${rep.MOTIVO || 'N/A'}</td>
                <td>${rep.ESTADO_R_NR || (rep as any)['ESTADO R/NR'] || 'N/A'}</td>
                <td>${rep['JEFE SERVICIO'] || 'N/A'}</td>
            </tr>
        `;
    }).join('');

    return `
      <h1><b>${title}</b></h1>
      <p>Total de registros: ${sortedReplacements.length}</p>
      <table>
        <thead>
          <tr>
            <th>Reemplazante</th>
            <th>Reemplazado</th>
            <th>Desde</th>
            <th>Hasta</th>
            <th>Días</th>
            <th>Motivo</th>
            <th>Estado R/NR</th>
            <th>Jefe de Servicio</th>
          </tr>
        </thead>
        <tbody>
          ${tableBodyContent}
        </tbody>
      </table>
      <footer>
        <p>Reporte generado el ${format(new Date(), "'el' d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</p>
        <p>Centro de Gestión de Personal - Hospital de Curepto</p>
      </footer>
    `;
  };

  const handlePreview = (data: ReportFormValues) => {
    const sortedReplacements = getFilteredData(data);
    if (!sortedReplacements) return;

    const reportTitle = `Reporte de Reemplazos ${data.fechaInicio ? `desde ${format(data.fechaInicio, 'P', { locale: es })}` : ''} ${data.fechaFin ? `hasta ${format(data.fechaFin, 'P', { locale: es })}` : ''}`;
    const reportHtml = getReportHtml(sortedReplacements, reportTitle);

    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <html>
          <head>
            <title>Vista Previa - Reporte de Reemplazos</title>
            <style>
              body { font-family: 'Inter', sans-serif; line-height: 1.4; margin: 0; padding: 2rem; background-color: #f1f5f9; }
              .page { background: white; padding: 3rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 8px; max-width: 1100px; margin: 0 auto; }
              h1 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; color: #008080; border-bottom: 2px solid #008080; padding-bottom: 0.5rem; }
              p { font-size: 0.9rem; color: #6C757D; margin-top: 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
              th, td { padding: 0.75rem; text-align: left; border: 1px solid #e2e8f0; font-size: 0.75rem; }
              th { background-color: #f8fafc; font-weight: 700; color: #334155; }
              tbody tr:nth-child(even) { background-color: #fdfdfd; }
              footer { text-align: center; margin-top: 3rem; font-size: 0.7rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
              .print-banner { 
                position: fixed; top: 0; left: 0; right: 0; 
                background: #008080; color: white; padding: 10px; 
                text-align: center; font-weight: bold; font-size: 14px;
                display: flex; justify-content: center; align-items: center; gap: 15px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 100;
              }
              .btn { padding: 6px 15px; background: white; color: #008080; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
              @media print { 
                .print-banner { display: none; } 
                body { padding: 0; background: white; }
                .page { box-shadow: none; max-width: none; padding: 0; border-radius: 0; }
              }
            </style>
          </head>
          <body>
            <div class="print-banner">
                <span>VISTA PREVIA DE REPORTE</span>
                <button class="btn" onclick="window.print()">IMPRIMIR AHORA</button>
            </div>
            <div class="page">
                ${reportHtml}
            </div>
          </body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  const generateReport = (data: ReportFormValues) => {
    const sortedReplacements = getFilteredData(data);
    if (!sortedReplacements) return;

    const reportTitle = `Reporte de Reemplazos ${data.fechaInicio ? `desde ${format(data.fechaInicio, 'P', { locale: es })}` : ''} ${data.fechaFin ? `hasta ${format(data.fechaFin, 'P', { locale: es })}` : ''}`;
    const reportHtml = getReportHtml(sortedReplacements, reportTitle);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${reportTitle}</title>
            <style>
              body { font-family: 'Inter', sans-serif; line-height: 1.4; margin: 1.5rem; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              h1 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; color: #008080; border-bottom: 2px solid #008080; padding-bottom: 0.5rem; }
              p { font-size: 0.9rem; color: #6C757D; margin-top: 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
              th, td { padding: 0.6rem; text-align: left; border: 1px solid #dee2e6; font-size: 0.75rem; }
              th { background-color: #f8f9fa; font-weight: 700; color: #333; }
              tbody tr:nth-child(even) { background-color: #fafafa; }
              footer { text-align: center; margin-top: 2.5rem; font-size: 0.7rem; color: #999; border-top: 1px solid #eee; padding-top: 1rem; }
            </style>
          </head>
          <body>
            ${reportHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };
  
  const handleExportExcel = () => {
    const sortedReplacements = getFilteredData(form.getValues());
    
    if (!sortedReplacements) return;

    const excelData = sortedReplacements.map(rep => {
      const fromDate = parseDate(rep.DESDE);
      const toDate = parseDate(rep.HASTA);
      let days = 0;
      if (fromDate && toDate) {
        days = differenceInDays(toDate, fromDate) + 1;
      }
      return {
        'Reemplazante': rep.NOMBRE || 'N/A',
        'Reemplazado': rep['NOMBRE REEMPLAZADO'] || 'N/A',
        'Desde': formatDateForPrint(rep.DESDE),
        'Hasta': formatDateForPrint(rep.HASTA),
        'Días': days,
        'Motivo': rep.MOTIVO || 'N/A',
        'Estado R/NR': rep.ESTADO_R_NR || (rep as any)['ESTADO R/NR'] || 'N/A',
        'Jefe de Servicio': rep['JEFE SERVICIO'] || 'N/A',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reemplazos');
    
    const cols = Object.keys(excelData[0]);
    const colWidths = cols.map(col => {
        const maxLength = Math.max(
          ...excelData.map(row => (row[col as keyof typeof row] || '').toString().length), 
          col.length
        );
        return { wch: maxLength + 2 };
    });
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, 'Reporte_Reemplazos.xlsx');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Generar Reporte
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generador de Reportes de Reemplazos</DialogTitle>
          <DialogDescription>
            Selecciona los filtros para generar un reporte personalizado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-6">
            <ScrollArea className="h-96 pr-6">
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="fechaInicio"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Fecha de Inicio</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                        {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Selecciona fecha</span>}
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
                                        fromYear={new Date().getFullYear() - 10} 
                                        toYear={new Date().getFullYear() + 10} 
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
                        name="fechaFin"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Fecha de Fin</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                        {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Selecciona fecha</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 10} toYear={new Date().getFullYear() + 10} initialFocus locale={es} />
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="jefeServicio"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Jefe de Servicio</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un jefe de servicio" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="todos">Todos</SelectItem>
                                {dynamicJefesOptions.map((jefe) => (
                                    <SelectItem key={jefe.email} value={jefe.name}>
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
                    name="estados"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estado R/NR</FormLabel>
                            <FormControl>
                                <MultipleSelector
                                    value={field.value || []}
                                    onChange={field.onChange}
                                    options={estadoOptions || []}
                                    placeholder="Selecciona estados..."
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              </div>
            </ScrollArea>
            <DialogFooter className="sm:justify-between gap-4">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <div className="flex flex-wrap gap-2">
                    <Button 
                        type="button" 
                        variant="outline" 
                        className="gap-2"
                        onClick={form.handleSubmit(handlePreview)}
                    >
                        <Eye className="h-4 w-4" />
                        Visualizar
                    </Button>
                    <Button 
                        type="button" 
                        onClick={handleExportExcel} 
                        variant="secondary"
                        className="gap-2"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                    </Button>
                    <Button 
                        type="button" 
                        className="gap-2"
                        onClick={form.handleSubmit(generateReport)}
                    >
                        <Printer className="h-4 w-4" />
                        Imprimir
                    </Button>
                </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
