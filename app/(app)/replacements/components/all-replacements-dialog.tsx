'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Replacement } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import React, { useState } from 'react';


interface AllReplacementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string | null;
  replacements: Replacement[];
  viewBy: 'reemplazado' | 'reemplazante';
  onViewRequest: (replacement: Replacement) => void;
}

const formatDate = (timestamp: Timestamp | undefined | string) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp as any);
    return format(date, 'd MMM yyyy', { locale: es });
}

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  'SI': 'default',
  'APROBADO': 'default',
  'PENDIENTE': 'outline',
  'RECHAZADO': 'destructive',
  'NO': 'destructive',
  'EN PROCESO': 'secondary',
};

export function AllReplacementsDialog({ open, onOpenChange, employeeName, replacements, viewBy, onViewRequest }: AllReplacementsDialogProps) {
  
  const title = viewBy === 'reemplazado' ? 'Historial de Reemplazos para' : 'Historial de Coberturas para';
  const otherPartyHeader = viewBy === 'reemplazado' ? 'Reemplazante' : 'Reemplazado';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">
            {title} <span className="text-primary">{employeeName}</span>
          </DialogTitle>
          <DialogDescription>
            Mostrando todas las solicitudes de reemplazo asociadas.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>{otherPartyHeader}</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead>Hasta</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Estado R/NR</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {replacements.length > 0 ? (
                        replacements.map(rep => (
                            <TableRow key={rep.id}>
                                <TableCell className="font-medium">
                                    {viewBy === 'reemplazado' ? rep.NOMBRE : rep['NOMBRE REEMPLAZADO']}
                                </TableCell>
                                <TableCell>{formatDate(rep.DESDE)}</TableCell>
                                <TableCell>{formatDate(rep.HASTA)}</TableCell>
                                <TableCell>{rep.MOTIVO || 'N/A'}</TableCell>
                                <TableCell>
                                    {rep.ESTADO_R_NR && (
                                        <Badge variant={statusVariantMap[rep.ESTADO_R_NR.toUpperCase()] || 'secondary'}>
                                            {rep.ESTADO_R_NR}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewRequest(rep)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No se encontraron solicitudes.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
