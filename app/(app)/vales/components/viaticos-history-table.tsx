'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Eye } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type { HistorialCargaViaticos } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { deleteHistorialViaticos } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { ViaticosDetailsDialog } from './viaticos-details-dialog';

const app = getApps().find(app => app.name === 'server-actions-vales') || initializeApp(firebaseConfig, 'server-actions-vales');
const db = getFirestore(app);

export function ViaticosHistoryTable() {
    const [historiales, setHistoriales] = useState<HistorialCargaViaticos[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
    const [selectedHistoryTitle, setSelectedHistoryTitle] = useState('');
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, 'historial_cargas_viaticos'), orderBy('fechaCarga', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as HistorialCargaViaticos[];
            setHistoriales(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        const confirm = window.confirm('¿Eliminar este registro de historial? (Nota: Esto no deshará los descuentos de viáticos, solo borrará el registro visual).');
        if (!confirm) return;

        try {
            const res = await deleteHistorialViaticos(id);
            if (res.error) throw new Error(res.error);
            toast({ title: 'Éxito', description: 'Registro de historial eliminado.' });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleViewDetails = (h: HistorialCargaViaticos) => {
        setSelectedHistoryId(h.historialValesId);
        setSelectedHistoryTitle(h.fileName || format(h.fechaCarga?.toDate() || new Date(), "dd MMM yyyy HH:mm", { locale: es }));
        setIsDetailsOpen(true);
    };

    if (isLoading) {
        return <div className="text-center py-4 text-sm text-muted-foreground">Cargando historial de viáticos...</div>;
    }

    if (historiales.length === 0) {
        return <div className="text-center py-4 text-sm text-muted-foreground border rounded-md">No hay historiales de viáticos registrados.</div>;
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Fecha de Carga</TableHead>
                        <TableHead>Archivo</TableHead>
                        <TableHead className="text-center">Reg. Actualizados</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {historiales.map((h) => (
                        <TableRow key={h.id}>
                            <TableCell className="font-medium">
                                {h.fechaCarga?.toDate ? format(h.fechaCarga.toDate(), "dd MMM yyyy HH:mm", { locale: es }) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                                {h.fileName || 'Carga manual'}
                            </TableCell>
                            <TableCell className="text-center">
                                {h.cantidadRegistros}
                            </TableCell>
                            <TableCell className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(h)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(h.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <ViaticosDetailsDialog 
                open={isDetailsOpen} 
                onOpenChange={setIsDetailsOpen} 
                historialValesId={selectedHistoryId}
                title={selectedHistoryTitle}
            />
        </div>
    );
}
