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
import { Search, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { parseHorarioTS } from '../utils/calculos';

interface MarcasTableProps {
  marcas: MarcaVale[];
  isLoading: boolean;
  onDeleteMarca?: (marca: MarcaVale) => void;
}

export function MarcasTable({ marcas, isLoading, onDeleteMarca }: MarcasTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDetails, setSelectedDetails] = useState<MarcaVale | null>(null);

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
                <TableHead className="w-[50px]"></TableHead>
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
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : filteredMarcas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
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
                     <TableCell className="text-right">
                       <button 
                           onClick={() => setSelectedDetails(m)}
                           className="text-blue-600 hover:text-blue-800 transition-colors mr-3"
                           title="Ver detalle de marcas"
                         >
                           <Eye className="h-4 w-4" />
                       </button>
                       {onDeleteMarca && (
                         <button 
                           onClick={() => onDeleteMarca(m)}
                           className="text-muted-foreground hover:text-destructive transition-colors"
                           title="Eliminar registro individual"
                         >
                           <Trash2 className="h-4 w-4" />
                         </button>
                       )}
                     </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      <Dialog open={!!selectedDetails} onOpenChange={() => setSelectedDetails(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Marcas ({selectedDetails?.mes})</DialogTitle>
            <DialogDescription>
              {selectedDetails?.nombres} {selectedDetails?.apellidos} - RUT: {selectedDetails?.RUT}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[350px] mt-2 border rounded-md">
            {!selectedDetails?.detalles || selectedDetails.detalles.length === 0 ? (
                <div className="text-sm text-center text-muted-foreground p-8">No hay detalle guardado para este registro. Vuelve a subir el Excel si deseas registrarlo.</div>
            ) : (
                <div className="space-y-4 p-1">
                  {Object.entries(
                    selectedDetails.detalles.reduce((acc, current) => {
                      let horarioStr = current.horario;
                      if (!horarioStr.includes('|')) {
                          const parsedD = parseHorarioTS(current.horario);
                          if (parsedD && !isNaN(parsedD.getTime())) {
                              horarioStr = format(parsedD, "EEEE dd MMM yyyy|HH:mm", { locale: es });
                          }
                      }
                    
                      const parts = horarioStr.split('|');
                      const datePart = parts.length > 1 ? parts[0] : horarioStr;
                      const timePart = parts.length > 1 ? parts[1] : '';
                      if (!acc[datePart]) acc[datePart] = [];
                      acc[datePart].push({ ...current, time: timePart || horarioStr });
                      return acc;
                    }, {} as Record<string, { horario: string, estado: string, time: string }[]>)
                  ).map(([dia, marcasDia]) => (
                    <div key={dia} className="border rounded-md overflow-hidden">
                      <div className="bg-muted px-3 py-2 text-sm font-semibold border-b capitalize">
                        {dia}
                      </div>
                      <Table>
                        <TableBody>
                            {marcasDia.map((m, i) => (
                                <TableRow key={i}>
                                    <TableCell className="text-sm py-2">{m.time}</TableCell>
                                    <TableCell className="text-sm font-medium py-2 text-right">
                                        <span className={m.estado.toLowerCase().includes('ent') ? "text-blue-600" : "text-orange-600"}>
                                            {m.estado}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
