'use client';

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

import { Button } from '@/components/ui/button';
import { Loader2, Copy } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Replacement, IngresoFuncionario, MonthlyTemplate } from '@/lib/types';
import { ReplacementCard } from './replacement-card';
import { deleteReplacement } from '../actions';
import { ReplacementDetailsDialog } from './replacement-details-dialog';
import { EditReplacementDialog } from './edit-replacement-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

interface ReplacementsTableProps {
  replacements: Replacement[] | null;
  loading: boolean;
  funcionarios: IngresoFuncionario[];
  funcionarioOptions: { label: string; value: string; rut?: string; id: string }[];
  onCopy: (replacement: Replacement) => void;
  monthlyTemplates: MonthlyTemplate[];
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

export default function ReplacementsTable({ replacements, loading, funcionarios, funcionarioOptions, onCopy, monthlyTemplates }: ReplacementsTableProps) {
  const { toast } = useToast();

  const [replacementToView, setReplacementToView] = useState<Replacement | null>(null);
  const [replacementToEdit, setReplacementToEdit] = useState<Replacement | null>(null);
  const [replacementToDelete, setReplacementToDelete] = useState<Replacement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const groupedReplacements = useMemo(() => {
    if (!replacements) return [];
    
    const groups = new Map<string, Replacement[]>();

    replacements.forEach(rep => {
      const date = parseDate(rep.DESDE);
      const groupKey = date ? format(date, 'yyyy-MM') : 'Sin Fecha';
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(rep);
    });

    return Array.from(groups.entries())
      .sort(([dateA, dateB]) => {
          if (dateA === 'Sin Fecha') return 1;
          if (dateB === 'Sin Fecha') return -1;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  }, [replacements]);

  const handleDelete = async () => {
      if (!replacementToDelete) return;
      setIsDeleting(true);
      try {
        const result = await deleteReplacement(replacementToDelete.id);
        if (result.error) throw new Error(result.error);
        toast({
          title: "¡Solicitud eliminada!",
          description: "La solicitud de reemplazo ha sido eliminada.",
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error al eliminar',
          description: error.message || "No se pudo eliminar la solicitud.",
        });
      } finally {
        setIsDeleting(false);
        setReplacementToDelete(null);
      }
  }

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-lg" />
      ))}
    </div>
  );

  return (
    <>
      <ScrollArea className="flex-1">
        {loading ? (
            renderSkeletons()
        ) : groupedReplacements && groupedReplacements.length > 0 ? (
            <div className="p-6 space-y-8">
                {groupedReplacements.map(([groupKey, reps]) => (
                    <div key={groupKey}>
                        <h2 className="text-xl font-bold font-headline mb-4 capitalize">
                            {groupKey === 'Sin Fecha' 
                                ? 'Sin Fecha Asignada' 
                                : format(new Date(groupKey), 'MMMM yyyy', { locale: es })}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {reps.map((replacement) => (
                                <ReplacementCard 
                                    key={replacement.id} 
                                    replacement={replacement}
                                    isMonthly={monthlyTemplates?.some(t => 
                                        t.NOMBRE === replacement.NOMBRE && 
                                        t['NOMBRE REEMPLAZADO'] === replacement['NOMBRE REEMPLAZADO']
                                    )}
                                    onView={() => setReplacementToView(replacement)}
                                    onEdit={() => setReplacementToEdit(replacement)}
                                    onDelete={() => setReplacementToDelete(replacement)}
                                    onCopy={() => onCopy(replacement)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center text-muted-foreground py-16">
                <p className="text-lg font-medium">No se encontraron solicitudes</p>
                <p>Intenta ajustar los filtros o crea una nueva solicitud.</p>
            </div>
        )}
      </ScrollArea>
      
      <AlertDialog open={!!replacementToDelete} onOpenChange={(open) => !open && setReplacementToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente la solicitud de reemplazo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReplacementDetailsDialog
        replacement={replacementToView}
        open={!!replacementToView}
        onOpenChange={(open) => !open && setReplacementToView(null)}
      />

      <EditReplacementDialog
        replacement={replacementToEdit}
        open={!!replacementToEdit}
        onOpenChange={(open) => !open && setReplacementToEdit(null)}
        funcionarios={funcionarios}
        funcionarioOptions={funcionarioOptions}
      />
    </>
  );
}
