'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MultipleSelector, type Option } from '@/components/ui/multiple-selector';
import { Printer, FileSpreadsheet, FileText, Eye, Archive } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import type { InventarioEquipo, Archivador } from '@/lib/types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const reportSchema = z.object({
  tipos: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  estados: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  arriendos: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  archivadores: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface InventoryReportDialogProps {
  equipos: InventarioEquipo[];
  archivadores: Archivador[];
}

const estadoOptions: Option[] = [
    { label: 'Activo', value: 'Activo' },
    { label: 'En Reparación', value: 'En Reparación' },
    { label: 'Fuera De Servicio', value: 'Fuera De Servicio' },
];

const tipoOptions: Option[] = [
    { label: 'COMPUTADOR', value: 'COMPUTADOR' },
    { label: 'NOTEBOOK', value: 'NOTEBOOK' },
    { label: 'IMPRESORA', value: 'IMPRESORA' },
    { label: 'SERVIDOR', value: 'SERVIDOR' },
    { label: 'TV BOX', value: 'TV BOX' },
    { label: 'CISCO', value: 'CISCO' },
    { label: 'DATA', value: 'DATA' },
    { label: 'VALTEK', value: 'VALTEK' },
];

const arriendoOptions: Option[] = [
    { label: 'Arriendo Minsal', value: 'Arriendo Minsal' },
    { label: 'Arriendo Hospital', value: 'Arriendo Hospital' },
    { label: 'Compra Hospital', value: 'Compra Hospital' },
];

export function InventoryReportDialog({ equipos, archivadores }: InventoryReportDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const archiveOptions = useMemo(() => 
    archivadores.map(a => ({ label: a.name, value: a.id })), 
  [archivadores]);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      tipos: [],
      estados: [],
      arriendos: [],
      archivadores: [],
    },
  });

  const getFilteredData = (data: ReportFormValues) => {
    let filtered = [...equipos];

    if (data.tipos && data.tipos.length > 0) {
      const selectedTipos = data.tipos.map(t => t.value);
      filtered = filtered.filter(e => e['tipo de equipo'] && selectedTipos.includes(e['tipo de equipo']));
    }

    if (data.estados && data.estados.length > 0) {
      const selectedEstados = data.estados.map(e => e.value);
      filtered = filtered.filter(e => e.estado && selectedEstados.includes(e.estado));
    }

    if (data.arriendos && data.arriendos.length > 0) {
      const selectedArriendos = data.arriendos.map(a => a.value);
      filtered = filtered.filter(e => e.tipo_arriendo && selectedArriendos.includes(e.tipo_arriendo));
    }

    if (data.archivadores && data.archivadores.length > 0) {
        const selectedArchives = data.archivadores.map(a => a.value);
        filtered = filtered.filter(e => e.archivadorId && selectedArchives.includes(e.archivadorId));
    }

    if (filtered.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin Resultados',
        description: 'No se encontraron equipos con los filtros seleccionados.',
      });
      return null;
    }

    return filtered.sort((a, b) => (a['nombre equipo'] || '').localeCompare(b['nombre equipo'] || ''));
  };

  const getReportHtml = (filtered: InventarioEquipo[], title: string) => {
    const groups: Record<string, InventarioEquipo[]> = {};
    filtered.forEach(e => {
        const archId = e.archivadorId || 'sin-archivador';
        if (!groups[archId]) groups[archId] = [];
        groups[archId].push(e);
    });

    const archiveIds = Object.keys(groups);
    
    const tableBodyContent = archiveIds.map(archId => {
        const archName = archId === 'sin-archivador' ? 'Sin Archivador' : archivadores.find(a => a.id === archId)?.name || 'N/A';
        const rows = groups[archId].map(e => `
            <tr>
                <td>${e.numero_interno || 'N/A'}</td>
                <td>${e['nombre equipo'] || 'N/A'}</td>
                <td>${e.serial || 'N/A'}</td>
                <td>${e['tipo de equipo'] || 'N/A'}</td>
                <td>${e.estado || 'N/A'}</td>
                <td>${e['ip equipo'] || 'N/A'}</td>
                <td>${e['personal a cargo'] || 'N/A'}</td>
                <td>${archName}</td>
            </tr>
        `).join('');

        return `
            <tr>
                <td colspan="8" style="background-color: #f1f5f9; font-weight: bold; padding: 10px 15px; border-top: 2px solid #334155; border-bottom: 1px solid #cbd5e1; color: #334155; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;">
                    REPORTE DE ${archName}
                </td>
            </tr>
            ${rows}
        `;
    }).join('');

    return `
      <h1><b>${title.toUpperCase()}</b></h1>
      <p>Total de registros encontrados: ${filtered.length}</p>
      <table>
        <thead>
          <tr>
            <th>Nº Interno</th>
            <th>Nombre Equipo</th>
            <th>Serial</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>IP</th>
            <th>Encargado</th>
            <th>Archivador</th>
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
  }

  const handlePreview = (data: ReportFormValues) => {
    const filtered = getFilteredData(data);
    if (!filtered) return;

    const reportTitle = `Reporte Unificado de Inventario`;
    const reportHtml = getReportHtml(filtered, reportTitle);

    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <html>
          <head>
            <title>Vista Previa - Reporte Unificado</title>
            <style>
              body { font-family: 'Inter', sans-serif; line-height: 1.4; margin: 0; padding: 2rem; background-color: #f1f5f9; }
              .page { background: white; padding: 3rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 8px; max-width: 1100px; margin: 0 auto; }
              h1 { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; color: #1e293b; border-bottom: 2px solid #1e293b; padding-bottom: 0.5rem; text-align: center; }
              p { font-size: 0.85rem; color: #64748b; margin-top: 0; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; border: 1px solid #e2e8f0; }
              th, td { padding: 0.75rem; text-align: left; border: 1px solid #e2e8f0; font-size: 0.75rem; }
              th { background-color: #f8fafc; font-weight: 700; color: #334155; text-transform: uppercase; }
              tbody tr:nth-child(even) { background-color: #fdfdfd; }
              footer { text-align: center; margin-top: 3rem; font-size: 0.7rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
              .print-banner { 
                position: fixed; top: 0; left: 0; right: 0; 
                background: #1e293b; color: white; padding: 10px; 
                text-align: center; font-weight: bold; font-size: 14px;
                display: flex; justify-content: center; align-items: center; gap: 15px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 100;
              }
              .btn { padding: 6px 15px; background: white; color: #1e293b; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; }
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

  const handlePrint = (data: ReportFormValues) => {
    const filtered = getFilteredData(data);
    if (!filtered) return;

    const reportTitle = `Reporte Unificado de Inventario`;
    const reportHtml = getReportHtml(filtered, reportTitle);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${reportTitle}</title>
            <style>
              body { font-family: 'Inter', sans-serif; line-height: 1.4; margin: 1.5rem; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              h1 { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; color: #1e293b; border-bottom: 2px solid #1e293b; padding-bottom: 0.5rem; text-align: center; }
              p { font-size: 0.85rem; color: #64748b; margin-top: 0; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 1rem; border: 1px solid #e2e8f0; }
              th, td { padding: 0.6rem; text-align: left; border: 1px solid #e2e8f0; font-size: 0.75rem; }
              th { background-color: #f8fafc; font-weight: 700; color: #334155; text-transform: uppercase; }
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

  const handleExportExcel = (data: ReportFormValues) => {
    const filtered = getFilteredData(data);
    if (!filtered) return;

    const excelData = filtered.map(e => ({
      'Nº Interno': e.numero_interno || 'N/A',
      'Tipo Arriendo': e.tipo_arriendo || 'N/A',
      'Nombre Equipo': e['nombre equipo'] || 'N/A',
      'Tipo de Equipo': e['tipo de equipo'] || 'N/A',
      'Modelo': e.modelo || 'N/A',
      'Serial': e.serial || 'N/A',
      'Estado': e.estado || 'N/A',
      'Dirección IP': e['ip equipo'] || 'N/A',
      'Responsable': e['personal a cargo'] || 'N/A',
      'Ubicación': e.ubicacion || 'N/A',
      'Archivador': archivadores.find(a => a.id === e.archivadorId)?.name || 'Sin Archivador',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario_Unificado');
    
    const colWidths = Object.keys(excelData[0]).map(key => ({
        wch: Math.max(key.length, ...excelData.map(row => (row[key as keyof typeof row] || '').toString().length)) + 2
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `Reporte_Inventario_Unificado_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Reportes Unificados
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-headline">
            <FileSpreadsheet className="text-primary h-6 w-6" />
            Generador de Reportes de Inventario
          </DialogTitle>
          <DialogDescription>
            Filtra por tipos, estados, arriendos o incluso por archivadores específicos. Los resultados se agruparán por archivador.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6">
            <ScrollArea className="h-[50vh] pr-6 border rounded-md p-4 bg-muted/10">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="archivadores"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Archive className="h-4 w-4" /> Archivadores (Carpetas)
                      </FormLabel>
                      <FormControl>
                        <MultipleSelector
                          value={field.value || []}
                          onChange={field.onChange}
                          options={archiveOptions || []}
                          placeholder="Todos los archivadores..."
                          emptyIndicator={<p className="text-center text-xs p-2">No hay archivadores creados.</p>}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipos de Equipo</FormLabel>
                      <FormControl>
                        <MultipleSelector
                          value={field.value || []}
                          onChange={field.onChange}
                          options={tipoOptions}
                          placeholder="Todos los tipos..."
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estados"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estados</FormLabel>
                      <FormControl>
                        <MultipleSelector
                          value={field.value || []}
                          onChange={field.onChange}
                          options={estadoOptions}
                          placeholder="Todos los estados..."
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="arriendos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipos de Arriendo</FormLabel>
                      <FormControl>
                        <MultipleSelector
                          value={field.value || []}
                          onChange={field.onChange}
                          options={arriendoOptions}
                          placeholder="Todos los arriendos..."
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <DialogFooter className="sm:justify-between gap-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
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
                  variant="secondary" 
                  className="gap-2"
                  onClick={form.handleSubmit(handleExportExcel)}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button 
                  type="button" 
                  className="gap-2"
                  onClick={form.handleSubmit(handlePrint)}
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
