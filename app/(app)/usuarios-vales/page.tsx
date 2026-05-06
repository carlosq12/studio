'use client';

import { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UsuarioFuncionario } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { changeUserStatus } from './actions';

export default function UsuariosValesPage() {
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const firestore = useFirestore();
    const usuariosQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'usuarios_funcionarios'), orderBy('fechaRegistro', 'desc'));
    }, [firestore]);
    
    const { data: usuarios, loading } = useCollection<UsuarioFuncionario>(usuariosQuery);

    const handleStatusChange = async (uid: string, newStatus: 'Aprobado' | 'Rechazado' | 'Pendiente') => {
        setIsUpdating(uid);
        const res = await changeUserStatus(uid, newStatus);
        setIsUpdating(null);
        
        if (res.success) {
            toast({
                title: 'Estado actualizado',
                description: `El usuario ahora está ${newStatus}.`
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: res.error
            });
        }
    };

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <PageHeader 
                title="Aprobaciones de Usuarios (Vales)" 
                description="Gestiona qué funcionarios tienen acceso a revisar sus vales de forma online. Debes aprobarlos para que puedan hacer login." 
            />

            <div className="mt-8 bg-white border rounded-lg shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Fecha Registro</TableHead>
                            <TableHead>RUT</TableHead>
                            <TableHead>Nombres Completos</TableHead>
                            <TableHead>Correo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                    Cargando usuarios...
                                </TableCell>
                            </TableRow>
                        ) : !usuarios || usuarios.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No hay solicitudes de registro por el momento.
                                </TableCell>
                            </TableRow>
                        ) : (
                            usuarios.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="text-sm">
                                        {user.fechaRegistro ? format(user.fechaRegistro.toDate(), "dd MMM yyyy HH:mm", { locale: es }) : 'N/A'}
                                    </TableCell>
                                    <TableCell className="font-medium font-mono">{user.rut}</TableCell>
                                    <TableCell>{user.nombres} {user.apellidos}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={user.estado === 'Aprobado' ? 'default' : user.estado === 'Rechazado' ? 'destructive' : 'secondary'}
                                            className={user.estado === 'Aprobado' ? 'bg-green-600' : user.estado === 'Pendiente' ? 'bg-orange-500' : ''}
                                        >
                                            {user.estado || 'Pendiente'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right flex items-center justify-end gap-2">
                                        {isUpdating === user.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        ) : (
                                            <>
                                                {user.estado !== 'Aprobado' && (
                                                    <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(user.id, 'Aprobado')}>
                                                        <Check className="h-4 w-4 mr-1" /> Aprobar
                                                    </Button>
                                                )}
                                                {user.estado !== 'Rechazado' && (
                                                    <Button size="sm" variant="destructive" className="h-8" onClick={() => handleStatusChange(user.id, 'Rechazado')}>
                                                        <X className="h-4 w-4 mr-1" /> Rechazar
                                                    </Button>
                                                )}
                                                {user.estado !== 'Pendiente' && (
                                                    <Button size="icon" variant="outline" className="h-8 w-8" title="Volver a Pendiente" onClick={() => handleStatusChange(user.id, 'Pendiente')}>
                                                        <RefreshCcw className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </main>
    );
}
