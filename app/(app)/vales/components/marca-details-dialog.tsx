import { useState, useMemo, useEffect } from 'react';
import type { MarcaVale } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Edit3, Save, X, Loader2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseHorarioTS } from '../utils/calculos';
import { updateMarcaValeCount } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface MarcaDetailsDialogProps {
    selectedDetails: MarcaVale | null;
    onClose: () => void;
    allowEditing?: boolean;
    onUpdateSuccess?: (updatedMarca: MarcaVale) => void;
}

export function MarcaDetailsDialog({ selectedDetails, onClose, allowEditing = false, onUpdateSuccess }: MarcaDetailsDialogProps) {
    const [isEditingCount, setIsEditingCount] = useState(false);
    const [editedCount, setEditedCount] = useState<number>(0);
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!selectedDetails) {
            setIsEditingCount(false);
        }
    }, [selectedDetails]);

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
            if (onUpdateSuccess) {
                onUpdateSuccess({ ...selectedDetails, diasTrabajados: editedCount });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const processedGroups = useMemo(() => {
        if (!selectedDetails?.detalles) return [];
        
        // Sort chronologically for enrichment logic
        const sorted = [...selectedDetails.detalles].sort((a,b) => {
            const da = parseHorarioTS(a.horario);
            const db = parseHorarioTS(b.horario);
            return (da?.getTime() || 0) - (db?.getTime() || 0);
        });

        // Check if it already has esValida
        const hasValida = sorted.some(d => d.esValida !== undefined);
        if (!hasValida) {
            let lastEntrada: Date | null = null;
            let lastEntradaIdx: number = -1;
            sorted.forEach((d, idx) => {
                const fecha = parseHorarioTS(d.horario);
                const estado = d.estado.toLowerCase();
                if (estado.includes('ent')) {
                    lastEntrada = fecha;
                    lastEntradaIdx = idx;
                } else if (estado.includes('sal') && lastEntrada && fecha) {
                    const horas = (fecha.getTime() - lastEntrada.getTime()) / (1000 * 60 * 60);
                    if (horas >= 6) {
                        sorted[lastEntradaIdx] = { ...sorted[lastEntradaIdx], esValida: true };
                        sorted[idx] = { ...d, esValida: true };
                    }
                    lastEntrada = null;
                }
            });
        }

        const grouped = sorted.reduce((acc, current) => {
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
          
          if (!acc[datePart]) acc[datePart] = { marcas: [], valesCount: 0 };
          acc[datePart].marcas.push({ ...current, time: timePart || horarioStr });
          
          if (current.esValida && current.estado.toLowerCase().includes('sal')) {
              acc[datePart].valesCount++;
          }
          
          return acc;
        }, {} as Record<string, { marcas: any[], valesCount: number }>)
        
        return Object.entries(grouped);
    }, [selectedDetails]);

    return (
        <Dialog open={!!selectedDetails} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span>Detalle de Marcas ({selectedDetails?.mes})</span>
                        <span className="text-sm font-normal text-muted-foreground">
                            {selectedDetails?.nombres} {selectedDetails?.apellidos} - RUT: {selectedDetails?.RUT}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/50 p-2 px-4 rounded-lg border">
                        <span className="text-sm font-medium">Total Vales: </span>
                        {isEditingCount ? (
                            <div className="flex items-center gap-1">
                                <Input 
                                    type="number" 
                                    className="w-16 h-8 text-center bg-background" 
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
                                <span className="font-bold text-2xl text-primary">{selectedDetails?.diasTrabajados}</span>
                                {allowEditing && (
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={handleStartEdit} title="Ajustar manualmente">
                                        <Edit3 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                    {(selectedDetails?.viaticos ?? 0) > 0 && (
                        <div className="flex items-center gap-3 bg-orange-50/50 p-2 px-4 rounded-lg border border-orange-100 ml-3">
                            <span className="text-sm font-medium text-orange-800">Viáticos: </span>
                            <span className="font-bold text-2xl text-orange-600">-{selectedDetails?.viaticos}</span>
                        </div>
                    )}
                </DialogTitle>
              </DialogHeader>
    
              <div className="bg-blue-50/50 border border-blue-100 rounded-md p-3 mb-2 flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-800">
                    Las marcas resaltadas en <span className="bg-green-100 px-1 rounded">verde</span> indican una jornada válida (&gt;6h u 8h según estamento). 
                    Revisa el indicador por día para confirmar el conteo.
                </p>
              </div>
    
              {selectedDetails?.observaciones && (
                 <div className="bg-orange-50 border border-orange-100 rounded-md p-3 mb-4">
                     <p className="text-xs text-orange-800 mb-2">
                         <strong>Historial de Descuentos:</strong> {selectedDetails.observaciones}
                     </p>
                     
                     {selectedDetails.detallesViaticos && selectedDetails.detallesViaticos.length > 0 && (
                         <div className="border border-orange-200 rounded-md overflow-hidden bg-white">
                             <Table>
                                 <TableHeader className="bg-orange-100/30">
                                     <TableRow>
                                         {(selectedDetails.columnasViaticos || Object.keys(selectedDetails.detallesViaticos[0])).map(k => <TableHead key={k} className="text-[10px] h-7 py-0">{k}</TableHead>)}
                                     </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                     {selectedDetails.detallesViaticos.map((r: any, idx: number) => {
                                         const keys = selectedDetails.columnasViaticos || Object.keys(selectedDetails.detallesViaticos![0]);
                                         return (
                                             <TableRow key={idx} className="border-orange-100">
                                                 {keys.map((k: string, i: number) => {
                                                     const v = r[k];
                                                     let displayValue = v !== undefined && v !== null ? String(v) : '';
                                                     if (k.toLowerCase().includes('fecha') && typeof v === 'number' && v > 20000 && v < 70000) {
                                                         const excelEpoch = new Date(1899, 11, 30);
                                                         const dateObj = new Date(excelEpoch.getTime() + v * 86400000);
                                                         displayValue = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                                                     }
                                                     return <TableCell key={i} className="text-[10px] py-1">{displayValue}</TableCell>;
                                                 })}
                                             </TableRow>
                                         );
                                     })}
                                 </TableBody>
                             </Table>
                         </div>
                     )}
                 </div>
              )}
    
              <ScrollArea className="h-[450px] pr-4">
                {!selectedDetails?.detalles || selectedDetails.detalles.length === 0 ? (
                    <div className="text-sm text-center text-muted-foreground p-12 bg-muted/20 rounded-lg border-dashed border-2">No hay detalle guardado para este registro. Vuelve a subir el Excel si deseas registrarlo.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {processedGroups.map(([dia, data]) => (
                        <div key={dia} className="border rounded-md overflow-hidden bg-background shadow-sm flex flex-col h-fit">
                          <div className="bg-muted/50 px-3 py-2 text-sm font-semibold border-b flex items-center justify-between">
                            <span className="capitalize text-muted-foreground">{dia}</span>
                            {data.valesCount > 0 ? (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700 whitespace-nowrap">
                                    {data.valesCount} {data.valesCount === 1 ? 'Vale' : 'Vales'}
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-muted-foreground whitespace-nowrap">0 Vales</Badge>
                            )}
                          </div>
                          <Table>
                            <TableBody>
                                {data.marcas.map((m, i) => (
                                    <TableRow key={i} className={`${m.esValida ? "bg-green-50/50" : ""} hover:bg-muted/30 border-none`}>
                                        <TableCell className="text-sm py-1.5 flex items-center gap-2">
                                            <span className="font-mono">{m.time}</span>
                                            {m.esValida && <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium py-1.5 text-right">
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
    );
}
