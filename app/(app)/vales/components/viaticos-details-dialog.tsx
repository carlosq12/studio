'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type { MarcaVale } from '@/lib/types';
import { Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViaticosRawDetailsDialog } from './viaticos-raw-details-dialog';

const app = getApps().find(app => app.name === 'server-actions-vales') || initializeApp(firebaseConfig, 'server-actions-vales');
const db = getFirestore(app);

interface ViaticosDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    historialValesId: string | null;
    title: string;
}

export function ViaticosDetailsDialog({ open, onOpenChange, historialValesId, title }: ViaticosDetailsDialogProps) {
    const [marcas, setMarcas] = useState<MarcaVale[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDetails, setSelectedDetails] = useState<MarcaVale | null>(null);

    useEffect(() => {
        if (!open || !historialValesId) return;

        const fetchDetails = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, 'marcas_vales'), where('historialId', '==', historialValesId));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarcaVale));
                
                // Only show those who have viaticos discounted
                const filtered = data.filter(m => (m.viaticos || 0) > 0);
                setMarcas(filtered);
            } catch (error) {
                console.error("Error fetching viaticos details:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [open, historialValesId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Detalle de Viáticos: {title}</DialogTitle>
                </DialogHeader>
                
                <div className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : marcas.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border rounded-md">
                            No se encontraron descuentos de viáticos para esta carga.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead>RUT</TableHead>
                                    <TableHead>Funcionario</TableHead>
                                    <TableHead className="text-center">Viáticos</TableHead>
                                    <TableHead>Observaciones / Fechas</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {marcas.map((m) => {
                                    const viaticos = m.viaticos || 0;
                                    
                                    return (
                                        <TableRow key={m.id}>
                                            <TableCell className="font-medium text-xs">{m.RUT}</TableCell>
                                            <TableCell className="text-xs">{m.nombres} {m.apellidos}</TableCell>
                                            <TableCell className="text-center font-bold text-orange-600">
                                                -{viaticos}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {m.observaciones || 'Sin observaciones'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => setSelectedDetails(m)} title="Ver vales de este funcionario">
                                                    <Eye className="h-4 w-4 text-blue-600" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>

            <ViaticosRawDetailsDialog 
                selectedDetails={selectedDetails} 
                onClose={() => setSelectedDetails(null)} 
            />
        </Dialog>
    );
}
