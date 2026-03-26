'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { Archivador, InventarioEquipo } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Loader2, Edit, Trash2, Check, Palette, PlusCircle, AlertTriangle, Eye, Printer } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ViewInventoryArchiveDialog } from './view-inventory-archive-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { deleteInventoryArchive, updateInventoryArchive, addInventoryArchive } from '../archives-actions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const COLORS = [
  'bg-slate-500', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 
  'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'
];

const archiveFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  description: z.string().optional(),
  year: z.string().optional(),
});

type ArchiveFormValues = z.infer<typeof archiveFormSchema>;

export default function InventoryArchivesList() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const archivesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'archivadores_inventario'), orderBy('createdAt', 'desc'));
  }, [firestore]);
  const { data: archives, loading: loadingArchives } = useCollection<Archivador>(archivesQuery);

  const equiposQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'inventario_equipos'));
  }, [firestore]);
  const { data: allEquipos, loading: loadingEquipos } = useCollection<InventarioEquipo>(equiposQuery);

  const [archiveToView, setArchiveToView] = useState<Archivador | null>(null);
  const [archiveToDelete, setArchiveToDelete] = useState<Archivador | null>(null);
  const [archiveToEdit, setArchiveToEdit] = useState<Archivador | null>(null);
  const [isAddDialogOpen, setIsAddAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<ArchiveFormValues>({
    resolver: zodResolver(archiveFormSchema),
    defaultValues: { name: '', description: '', year: new Date().getFullYear().toString() },
  });

  const editForm = useForm<ArchiveFormValues>({
    resolver: zodResolver(archiveFormSchema),
  });

  const getEquiposCount = (archiveId: string) => {
      if (!allEquipos) return 0;
      return allEquipos.filter(e => e.archivadorId === archiveId).length;
  };

  const handleAddArchive = async (data: ArchiveFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await addInventoryArchive(data);
      if (result.error) throw new Error(result.error);
      toast({ title: '¡Archivador creado!', description: 'El nuevo archivador de inventario está listo.' });
      form.reset();
      setIsAddAddDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditArchive = async (data: ArchiveFormValues) => {
    if (!archiveToEdit) return;
    setIsSubmitting(true);
    try {
      const result = await updateInventoryArchive({ ...data, id: archiveToEdit.id, color: archiveToEdit.color });
      if (result.error) throw new Error(result.error);
      toast({ title: '¡Archivador actualizado!' });
      setArchiveToEdit(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleColorChange = async (archive: Archivador, color: string) => {
    try {
        const result = await updateInventoryArchive({ id: archive.id, name: archive.name, description: archive.description, color: color, year: archive.year });
        if (result.error) throw new Error(result.error);
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!archiveToDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteInventoryArchive(archiveToDelete.id);
      if (result.error) throw new Error(result.error);
      toast({ title: 'Archivador eliminado.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsDeleting(false);
      setArchiveToDelete(null);
    }
  };

  const getReportHtml = (archive: Archivador) => {
    if (!archive || !allEquipos) return '';

    const equiposInThisArchive = allEquipos.filter(e => e.archivadorId === archive.id)
        .sort((a, b) => (a['nombre equipo'] || '').localeCompare(b['nombre equipo'] || ''));

    const tableBodyContent = equiposInThisArchive.map(e => `
        <tr>
            <td>${e.numero_interno || 'N/A'}</td>
            <td>${e['nombre equipo'] || 'N/A'}</td>
            <td>${e.serial || 'N/A'}</td>
            <td>${e['tipo de equipo'] || 'N/A'}</td>
            <td>${e.estado || 'N/A'}</td>
            <td>${e['ip equipo'] || 'N/A'}</td>
            <td>${e['personal a cargo'] || 'N/A'}</td>
            <td>${e.tipo_arriendo || 'N/A'}</td>
        </tr>
    `).join('');

    return `
            <h1><b>REPORTE DE ${archive.name.toUpperCase()}</b></h1>
            <p>${archive.description || `Equipos organizados en esta carpeta.`}</p>
            ${archive.year ? `<p>Año: ${archive.year}</p>` : ''}
            <p>Total de Equipos: <strong>${equiposInThisArchive.length}</strong></p>
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
                        <th>Arriendo</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableBodyContent.length > 0 ? tableBodyContent : `<tr><td colSpan="8" style="text-align: center; padding: 2rem;">No hay equipos en este archivador.</td></tr>`}
                </tbody>
            </table>
            <footer>
                <p>Reporte generado el ${format(new Date(), "'el' d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</p>
                <p>Centro de Gestión de Personal - Hospital de Curepto</p>
            </footer>
    `;
  };

  const handlePreview = (archive: Archivador) => {
    const reportHtml = getReportHtml(archive);
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
        previewWindow.document.write(`
            <html>
                <head>
                    <title>Vista Previa - ${archive.name}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; line-height: 1.4; margin: 0; padding: 2rem; background-color: #f1f5f9; }
                        .page { background: white; padding: 3rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 8px; max-width: 1100px; margin: 0 auto; }
                        h1 { font-size: 1.25rem; font-weight: bold; margin: 0; color: #1e293b; text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 0.5rem; }
                        p { font-size: 0.8rem; color: #64748b; margin: 0.5rem 0; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; border: 1px solid #e2e8f0; }
                        th, td { padding: 0.6rem; text-align: left; border: 1px solid #e2e8f0; font-size: 0.75rem; }
                        th { background-color: #f8fafc; font-weight: 700; text-transform: uppercase; color: #334155; }
                        tbody tr:nth-child(even) { background-color: #f8f9fa; }
                        footer { text-align: center; margin-top: 2rem; padding: 1rem; font-size: 0.7rem; color: #94a3b8; border-top: 1px solid #e2e8f0; }
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
                        <span>VISTA PREVIA DE ARCHIVADOR</span>
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

  const handleDirectPrint = (archive: Archivador) => {
    const reportHtml = getReportHtml(archive);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`
            <html>
                <head>
                    <title>Reporte - ${archive.name}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; line-height: 1.4; margin: 0; padding: 1.5rem; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        h1 { font-size: 1.25rem; font-weight: bold; margin: 0; color: #1e293b; text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 0.5rem; }
                        p { font-size: 0.8rem; color: #64748b; margin: 0.25rem 0 0; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; border: 1px solid #e2e8f0; }
                        th, td { padding: 0.4rem 0.6rem; text-align: left; border: 1px solid #e2e8f0; font-size: 0.7rem; }
                        th { background-color: #f8fafc; font-weight: 700; font-size: 0.65rem; text-transform: uppercase; color: #334155; }
                        tbody tr:nth-child(even) { background-color: #f8f9fa; }
                        footer { text-align: center; margin-top: 1.5rem; padding: 1rem; font-size: 0.65rem; color: #94a3b8; border-top: 1px solid #e2e8f0; }
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

  if (loadingArchives || loadingEquipos) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-start">
          <Button onClick={() => setIsAddAddDialogOpen(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Crear Archivador de Inventario
          </Button>
      </div>

      {archives && archives.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {archives.map((archive) => {
            const count = getEquiposCount(archive.id);
            return (
             <Card key={archive.id} className="flex flex-col transition-all hover:shadow-lg overflow-hidden border-indigo-100 bg-indigo-50/10">
                <div className={cn("h-2", archive.color || 'bg-indigo-500')}></div>
                <CardHeader className="flex-1 p-4 cursor-pointer" onClick={() => setArchiveToView(archive)}>
                    <CardTitle className="text-lg">{archive.name}</CardTitle>
                    <CardDescription className="text-xs">{archive.description || 'Sin descripción'}</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto flex justify-between items-center text-[10px] text-muted-foreground p-4 pt-0">
                    <span className="flex items-center gap-1">
                        <Archive className="h-3 w-3" />
                        {count} equipos
                    </span>
                    <div className="flex items-center gap-1">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Cambiar color">
                                    <Palette className="h-3.5 w-3.5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2">
                                <div className="flex gap-1">
                                    {COLORS.map(color => (
                                        <button key={color} className={cn("h-5 w-5 rounded-full", color)} onClick={() => handleColorChange(archive, color)}>
                                            {archive.color === color && <Check className="h-3 w-3 text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                        
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Visualizar reporte" onClick={() => handlePreview(archive)}>
                            <Eye className="h-3.5 w-3.5" />
                        </Button>

                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Imprimir reporte" onClick={() => handleDirectPrint(archive)}>
                            <Printer className="h-3.5 w-3.5" />
                        </Button>

                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            editForm.reset({ name: archive.name, description: archive.description, year: archive.year });
                            setArchiveToEdit(archive);
                        }} title="Editar archivador">
                            <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setArchiveToDelete(archive)} title="Eliminar archivador">
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 ml-2" onClick={() => setArchiveToView(archive)}>
                            Abrir
                        </Button>
                    </div>
                </CardFooter>
             </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-16 flex flex-col items-center gap-4">
          <Archive className="w-16 h-16 text-muted-foreground/50" />
          <p className="text-lg font-medium">No hay archivadores de inventario</p>
          <p>Crea carpetas para organizar equipos antiguos, de baja o por servicios.</p>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Archivador de Inventario</DialogTitle></DialogHeader>
          <Form {...form}><form onSubmit={form.handleSubmit(handleAddArchive)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ej: Equipos Antiguos" {...field} /></FormControl><FormMessage/></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Crear'}</Button>
            </DialogFooter>
          </form></Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!archiveToEdit} onOpenChange={(open) => !open && setArchiveToEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Archivador</DialogTitle></DialogHeader>
          <Form {...editForm}><form onSubmit={editForm.handleSubmit(handleEditArchive)} className="space-y-4">
            <FormField control={editForm.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
            )} />
            <FormField control={editForm.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Guardar'}</Button>
            </DialogFooter>
          </form></Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveToDelete} onOpenChange={(open) => !open && setArchiveToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                {archiveToDelete && getEquiposCount(archiveToDelete.id) > 0 ? <AlertTriangle className="text-destructive"/> : null}
                {archiveToDelete && getEquiposCount(archiveToDelete.id) > 0 ? "No se puede eliminar" : "¿Estás seguro?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archiveToDelete && getEquiposCount(archiveToDelete.id) > 0 
                ? "Este archivador contiene equipos. Debes desarchivarlos antes de poder eliminar la carpeta." 
                : "Esta acción eliminará la carpeta de forma permanente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {archiveToDelete && getEquiposCount(archiveToDelete.id) > 0 ? (
                <AlertDialogAction onClick={() => setArchiveToDelete(null)}>Entendido</AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="animate-spin h-4 w-4" /> : "Eliminar"}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ViewInventoryArchiveDialog
        open={!!archiveToView}
        onOpenChange={(open) => !open && setArchiveToView(null)}
        archive={archiveToView}
        allEquipos={allEquipos || []}
      />
    </div>
  );
}
