'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { Archivador, Replacement, IngresoFuncionario } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, Printer, AlertTriangle, Edit, Palette, Check, Eye } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState, useMemo } from 'react';
import { deleteArchive, updateArchive } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ViewArchiveDialog } from './view-archive-dialog';
import { EditArchiveDialog } from './edit-archive-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';


const COLORS = [
  'bg-slate-500', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 
  'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'
];

interface ArchivesListProps {
    funcionarios: IngresoFuncionario[];
    funcionarioOptions: { label: string; value: string; rut?: string; id: string; }[];
}

const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
};
  
const formatDateForPrint = (date: any): string => {
    const d = parseDate(date);
    return d ? format(d, 'P', { locale: es }) : 'N/A';
};

const ArchiveCard = ({ 
    archive, 
    setArchiveToView, 
    handleEditClick, 
    handleDeleteClick, 
    handleColorChange, 
    handleDirectPrint,
    handlePreview 
}: { 
    archive: Archivador, 
    setArchiveToView: (archive: Archivador) => void, 
    handleEditClick: (archive: Archivador) => void, 
    handleDeleteClick: (archive: Archivador) => void, 
    handleColorChange: (archive: Archivador, color: string) => void, 
    handleDirectPrint: (archive: Archivador) => void,
    handlePreview: (archive: Archivador) => void;
}) => {
    return (
      <Card className="flex flex-col transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden">
          <div className={cn("h-2", archive.color || 'bg-gray-200')}></div>
          <CardHeader className="flex-1 p-4 cursor-pointer" onClick={() => setArchiveToView(archive)}>
            <CardTitle>{archive.name}</CardTitle>
            <CardDescription>{archive.description || 'Sin descripción'}</CardDescription>
          </CardHeader>
          <CardFooter className="mt-auto flex justify-between items-center text-xs text-muted-foreground p-4 pt-0">
            <span>
              {archive.createdAt ? format(archive.createdAt.toDate(), 'd MMM yyyy', { locale: es }) : 'N/A'}
              {archive.year && <span className="ml-2 font-semibold">({archive.year})</span>}
            </span>
            <div className="flex items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Cambiar color" onClick={(e) => e.stopPropagation()}>
                        <Palette className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <div className="flex gap-1">
                        {COLORS.map(color => (
                            <button key={color} className={cn("h-6 w-6 rounded-full", color)} onClick={(e) => { e.stopPropagation(); handleColorChange(archive, color); }}>
                                {archive.color === color && <Check className="h-4 w-4 text-white" />}
                            </button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Visualizar reporte" onClick={(e) => { e.stopPropagation(); handlePreview(archive); }}>
                    <Eye className="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="icon" className="h-8 w-8" title="Imprimir reporte" onClick={(e) => { e.stopPropagation(); handleDirectPrint(archive); }}>
                    <Printer className="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar archivador" onClick={(e) => { e.stopPropagation(); handleEditClick(archive); }}>
                    <Edit className="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Eliminar archivador" onClick={(e) => { e.stopPropagation(); handleDeleteClick(archive); }}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
          </CardFooter>
        </Card>
    );
};


export default function ArchivesList({ funcionarios, funcionarioOptions }: ArchivesListProps) {
  const firestore = useFirestore();
  const archivesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'archivadores'), orderBy('createdAt', 'desc'));
  }, [firestore]);
  const { data: archives, loading: loadingArchives } = useCollection<Archivador>(archivesQuery);

  const replacementsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'reemplazos'));
  }, [firestore]);
  const { data: allReplacements, loading: loadingReplacements } = useCollection<Replacement>(replacementsQuery);

  const [archiveToDelete, setArchiveToDelete] = useState<Archivador | null>(null);
  const [archiveToEdit, setArchiveToEdit] = useState<Archivador | null>(null);
  const [archiveToView, setArchiveToView] = useState<Archivador | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  const replacementsInArchive = useMemo(() => {
      if (!archiveToDelete || !allReplacements) return 0;
      return allReplacements.filter(rep => rep.archivadorId === archiveToDelete.id).length;
  }, [archiveToDelete, allReplacements]);
  
  const isArchiveNotEmpty = replacementsInArchive > 0;

  const getReportHtml = (archive: Archivador) => {
    if (!archive || !allReplacements) return '';

    const replacementsInThisArchive = allReplacements.filter(rep => rep.archivadorId === archive.id);
    
    const sortedReplacements = replacementsInThisArchive.sort((a, b) => {
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

    const grandTotalDays = sortedReplacements.reduce((sum, rep) => {
        const fromDate = parseDate(rep.DESDE);
        const toDate = parseDate(rep.HASTA);
        if (fromDate && toDate) {
            return sum + differenceInDays(toDate, fromDate) + 1;
        }
        return sum;
    }, 0);

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
            </tr>
        `;
    }).join('');

    return `
            <h1><b>${archive.name}</b></h1>
            <p>${archive.description || `Reporte de Solicitudes Archivadas`}</p>
            ${archive.year ? `<p>Año: ${archive.year}</p>` : ''}
            <p>Total General de Días Cubiertos: <strong>${grandTotalDays}</strong></p>
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
                    </tr>
                </thead>
                <tbody>
                    ${tableBodyContent.length > 0 ? tableBodyContent : `<tr><td colSpan="7" style="text-align: center; padding: 2rem;">No hay solicitudes en este archivador.</td></tr>`}
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
                        h1 { font-size: 1.25rem; font-weight: bold; margin: 0; color: #008080; text-align: center; border-bottom: 2px solid #008080; padding-bottom: 0.5rem; }
                        p { font-size: 0.8rem; color: #6C757D; margin: 0.5rem 0; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
                        th, td { padding: 0.6rem; text-align: left; border-bottom: 1px solid #E9ECEF; font-size: 0.75rem; }
                        th { background-color: #F8F9FA; font-weight: 600; text-transform: uppercase; color: #495057; }
                        tbody tr:nth-child(even) { background-color: #f8f9fa; }
                        footer { text-align: center; margin-top: 2rem; padding: 1rem; font-size: 0.7rem; color: #6C757D; border-top: 1px solid #E9ECEF; }
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
                        h1 { font-size: 1.25rem; font-weight: bold; margin: 0; color: #2c3e50; text-align: center; }
                        p { font-size: 0.8rem; color: #6C757D; margin: 0.25rem 0 0; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
                        th, td { padding: 0.4rem 0.6rem; text-align: left; border-bottom: 1px solid #E9ECEF; font-size: 0.7rem; }
                        td { white-space: nowrap; }
                        th { background-color: #F8F9FA; font-weight: 600; font-size: 0.6rem; text-transform: uppercase; color: #495057; }
                        tbody tr:nth-child(even) { background-color: #f8f9fa; }
                        footer { text-align: center; margin-top: 1.5rem; padding: 1rem; font-size: 0.65rem; color: #6C757D; border-top: 1px solid #E9ECEF; }
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


  const handleDeleteClick = (archive: Archivador) => {
    setArchiveToDelete(archive);
  };
  
  const handleEditClick = (archive: Archivador) => {
    setArchiveToEdit(archive);
  };

  const handleDeleteConfirm = async () => {
    if (!archiveToDelete || replacementsInArchive > 0) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteArchive(archiveToDelete.id);
      if (result.error) throw new Error(result.error);
      toast({
        title: '¡Archivador eliminado!',
        description: `El archivador "${archiveToDelete.name}" ha sido eliminado.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: error.message || 'No se pudo eliminar el archivador.',
      });
    } finally {
      setIsDeleting(false);
      setArchiveToDelete(null);
    }
  };

  const handleColorChange = async (archive: Archivador, color: string) => {
    try {
        const result = await updateArchive({ 
            id: archive.id, 
            name: archive.name, 
            description: archive.description || '', 
            color: color, 
            year: archive.year || '' 
        });
        if (result.error) throw new Error(result.error);
        toast({
            title: '¡Color actualizado!',
            description: `El color del archivador "${archive.name}" ha sido actualizado.`
        });
    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Error al actualizar color',
            description: error.message || 'No se pudo cambiar el color.'
        });
    }
  };

  const loading = loadingArchives || loadingReplacements;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }
  
  return (
    <>
      {archives && archives.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {archives.map((archive) => (
             <ArchiveCard 
                key={archive.id}
                archive={archive}
                setArchiveToView={setArchiveToView}
                handleEditClick={handleEditClick}
                handleDeleteClick={handleDeleteClick}
                handleColorChange={handleColorChange}
                handleDirectPrint={handleDirectPrint}
                handlePreview={handlePreview}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-16 flex flex-col items-center gap-4">
          <Printer className="w-16 h-16 text-muted-foreground/50" />
          <p className="text-lg font-medium">No hay archivadores</p>
          <p>Crea tu primer archivador para empezar a organizar.</p>
        </div>
      )}

      <AlertDialog open={!!archiveToDelete} onOpenChange={(open) => !open && setArchiveToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                {isArchiveNotEmpty && <AlertTriangle className="h-6 w-6 text-destructive"/>}
                {isArchiveNotEmpty ? "No se puede eliminar el archivador" : "¿Estás seguro?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArchiveNotEmpty
                ? `Este archivador no se puede eliminar porque contiene ${replacementsInArchive} solicitud(es). Por favor, abre el archivador y desarchiva todas las solicitudes antes de intentar eliminarlo.`
                : `Esta acción no se puede deshacer. Esto eliminará permanentemente el archivador "${archiveToDelete?.name}". Las solicitudes dentro no se borrarán, pero quedarán desarchivadas.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {isArchiveNotEmpty ? (
                <AlertDialogAction onClick={() => setArchiveToDelete(null)}>Entendido</AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
                  {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ViewArchiveDialog
        open={!!archiveToView}
        onOpenChange={(open) => !open && setArchiveToView(null)}
        archive={archiveToView}
        allReplacements={allReplacements || []}
        funcionarios={funcionarios}
        funcionarioOptions={funcionarioOptions}
      />
      
      <EditArchiveDialog
        open={!!archiveToEdit}
        onOpenChange={(open) => !open && setArchiveToEdit(null)}
        archive={archiveToEdit}
      />
    </>
  );
}
