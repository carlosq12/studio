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
import { Search, Trash2, Eye, CheckCircle2, Edit3, Save, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { parseHorarioTS } from '../utils/calculos';
import { updateMarcaValeCount } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface MarcasTableProps {
  marcas: MarcaVale[];
  isLoading: boolean;
  onDeleteMarca?: (marca: MarcaVale) => void;
}

export function MarcasTable({ marcas, isLoading, onDeleteMarca }: MarcasTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDetails, setSelectedDetails] = useState<MarcaVale | null>(null);
  const [isEditingCount, setIsEditingCount] = useState(false);
  const [editedCount, setEditedCount] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const filteredMarcas = marcas.filter(m => 
    (m.nombres || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.RUT || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.mes || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartEdit = () => {
    setEditedCount(selectedDetails?.diasTrabajados || 0);
    setIsEditingCount(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedDetails) return;
    setIsUpdating(true);
    try {
      const res = await updateMarcaValeCount(selectedDetails.id, editedCount);
      if (res.error) throw new Error(res.error);
      
      toast({ title: 'Ajuste Guardado', description: `Se actualizó el conteo a ${editedCount} vales.` });
      setIsEditingCount(false);
      // Actualizar localmente el objeto seleccionado para ver el cambio de inmediato reflejado en el header del modal
      setSelectedDetails(prev => prev ? { ...prev, diasTrabajados: editedCount } : null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

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
                           onClick={() => { setSelectedDetails(m); setIsEditingCount(false); }}
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

      <Dialog open={!!selectedDetails} onOpenChange={() => { setSelectedDetails(null); setIsEditingCount(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
                <span>Detalle de Marcas ({selectedDetails?.mes})</span>
                <div className="flex items-center gap-2 mr-6">
                    <span className="text-sm font-normal text-muted-foreground">Vales: </span>
                    {isEditingCount ? (
                        <div className="flex items-center gap-1">
                            <Input 
                                type="number" 
                                className="w-16 h-8 text-center" 
                                value={editedCount} 
                                onChange={(e) => setEditedCount(Number(e.target.value))}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveAdjustment} disabled={isUpdating}>
                                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setIsEditingCount(false)} disabled={isUpdating}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{selectedDetails?.diasTrabajados}</span>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={handleStartEdit}>
                                <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                </div>
            </DialogTitle>
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
                    }, {} as Record<string, { horario: string, estado: string, time: string, esValida?: boolean }[]>)
                  ).map(([dia, marcasDia]) => (
                    <div key={dia} className="border rounded-md overflow-hidden">
                      <div className="bg-muted px-3 py-2 text-sm font-semibold border-b capitalize">
                        {dia}
                      </div>
                      <Table>
                        <TableBody>
                            {marcasDia.map((m, i) => (
                                <TableRow key={i} className={m.esValida ? "bg-green-50/50" : ""}>
                                    <TableCell className="text-sm py-2 flex items-center gap-2">
                                        {m.time}
                                        {m.esValida && <CheckCircle2 className="h-3 w-3 text-green-600" aria-label="Marca validada para vale" />}
                                    </TableCell>
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
