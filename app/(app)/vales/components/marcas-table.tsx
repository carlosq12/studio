'use client';

import { useState } from 'react';
import type { MarcaVale } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MarcasTableProps {
  marcas: MarcaVale[];
  isLoading: boolean;
}

export function MarcasTable({ marcas, isLoading }: MarcasTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMarcas = marcas.filter(m => 
    (m.nombres || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.RUT || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.mes || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-sm w-full">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por funcionario, RUT o mes..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="rounded-md border">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead>Funcionario</TableHead>
                <TableHead>RUT</TableHead>
                <TableHead className="text-right">Días Trab.</TableHead>
                <TableHead className="text-right">Ausencias</TableHead>
                <TableHead className="text-right">Monto Asignado</TableHead>
                <TableHead>Fecha Carga</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredMarcas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No se han registrado marcas de vales aún.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMarcas.map((m) => (
                  <TableRow key={m.id}>
                     <TableCell className="font-semibold">{m.mes}</TableCell>
                     <TableCell>{m.nombres} {m.apellidos || ''}</TableCell>
                     <TableCell className="font-medium">{m.RUT}</TableCell>
                     <TableCell className="text-right">{m.diasTrabajados}</TableCell>
                     <TableCell className="text-right text-destructive">
                        {m.diasAusencia > 0 ? m.diasAusencia : '-'}
                     </TableCell>
                     <TableCell className="text-right font-bold text-green-700">
                        {m.montoAsignado ? `$${m.montoAsignado.toLocaleString('es-CL')}` : '-'}
                     </TableCell>
                     <TableCell className="text-muted-foreground text-xs">
                        {m.fechaCarga?.toDate 
                          ? format(m.fechaCarga.toDate(), "d MMM yyyy HH:mm", { locale: es }) 
                          : typeof m.fechaCarga === 'string' 
                            ? format(new Date(m.fechaCarga), "d MMM yyyy HH:mm", { locale: es })
                            : '-'}
                     </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
