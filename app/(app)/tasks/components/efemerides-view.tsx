'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Efemeride, IngresoFuncionario, EfemerideNotificationLog } from '@/lib/types';
import { AddEfemerideDialog } from './add-efemeride-dialog';
import { EfemerideCard } from './efemeride-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import { EditEfemerideDialog } from './edit-efemeride-dialog';
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
import { useToast } from '@/hooks/use-toast';
import { deleteEfemeride, checkAndSendEfemerideNotifications } from '../actions';
import { Loader2, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';

const mesesOrder = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function useEfemerides(db: any) {
  const efemeridesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'efemerides'));
  }, [db]);
  
  const { data, loading } = useCollection<Efemeride>(efemeridesQuery);

  const sortedData = useMemo(() => {
    if (!data) return null;
    return [...data].sort((a, b) => {
        const monthA = mesesOrder.indexOf(a.mes);
        const monthB = mesesOrder.indexOf(b.mes);
        if (monthA !== monthB) {
            return monthA - monthB;
        }
        return a.dia - b.dia;
    });
  }, [data]);

  return { data: sortedData, loading };
}

function useFuncionarios(db: any) {
  const funcionariosQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'INGRESO_FUNCIONARIOS'));
  }, [db]);
  return useCollection<IngresoFuncionario>(funcionariosQuery);
}

function useNotificationLogs(db: any) {
    const logsQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(collection(db, 'efemeride_notification_logs'));
    }, [db]);
    return useCollection<EfemerideNotificationLog>(logsQuery);
}

export default function EfemeridesView() {
  const firestore = useFirestore();
  const { data: efemerides, loading: loadingEfemerides } = useEfemerides(firestore);
  const { data: funcionarios, loading: loadingFuncionarios } = useFuncionarios(firestore);
  const { data: logs, loading: loadingLogs } = useNotificationLogs(firestore);
  const { toast } = useToast();

  const [efemerideToEdit, setEfemerideToEdit] = useState<Efemeride | null>(null);
  const [efemerideToDelete, setEfemerideToDelete] = useState<Efemeride | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const loading = loadingEfemerides || loadingFuncionarios || loadingLogs;

  const handleDelete = async () => {
    if (!efemerideToDelete) return;
    setIsDeleting(true);
    try {
        const result = await deleteEfemeride(efemerideToDelete.id);
        if (result.error) throw new Error(result.error);
        toast({
            title: "¡Efeméride eliminada!",
            description: `El evento "${efemerideToDelete.nombre}" ha sido eliminado.`,
        });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: error.message || "No se pudo eliminar la efeméride.",
        });
    } finally {
        setIsDeleting(false);
        setEfemerideToDelete(null);
    }
  }

  const handleSendReminders = async () => {
      setIsNotifying(true);
      try {
          const result = await checkAndSendEfemerideNotifications();
          if (result.error) throw new Error(result.error);
          
          toast({
              title: "Proceso Completado",
              description: result.count === 0 
                ? "No se encontraron eventos para hoy o próximos días que no hayan sido notificados." 
                : `Se enviaron ${result.count} recordatorios con éxito.`,
          });
      } catch (error: any) {
          toast({
              variant: "destructive",
              title: "Error al enviar avisos",
              description: error.message,
          });
      } finally {
          setIsNotifying(false);
      }
  }

  return (
    <>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline text-2xl">Efemérides Anuales</CardTitle>
                    <CardDescription>Eventos y fechas especiales para recordar durante el año.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={handleSendReminders} 
                        disabled={isNotifying}
                        className="gap-2 border-primary text-primary hover:bg-primary/5"
                    >
                        {isNotifying ? <Loader2 className="h-4 w-4 animate-spin"/> : <BellRing className="h-4 w-4" />}
                        Sincronizar Avisos
                    </Button>
                    <AddEfemerideDialog />
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                    </div>
                ) : efemerides && efemerides.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {efemerides.map(item => (
                            <EfemerideCard 
                                key={item.id} 
                                efemeride={item} 
                                funcionarios={funcionarios || []}
                                logs={logs || []}
                                onEdit={() => setEfemerideToEdit(item)}
                                onDelete={() => setEfemerideToDelete(item)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-16">
                        <p className="text-lg font-medium">No hay efemérides</p>
                        <p>Crea la primera para empezar a planificar.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        <EditEfemerideDialog
            efemeride={efemerideToEdit}
            open={!!efemerideToEdit}
            onOpenChange={(open) => !open && setEfemerideToEdit(null)}
        />

        <AlertDialog open={!!efemerideToDelete} onOpenChange={(open) => !open && setEfemerideToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la efeméride <span className="font-semibold">{efemerideToDelete?.nombre}</span>.
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
    </>
  )
}
