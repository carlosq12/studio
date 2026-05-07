'use client';

import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseHorarioTS } from '../utils/calculos';
import { updateMarcaValeCount, recalculateMarcaVale, setDiaValidez } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Minus, RefreshCcw, Save, Loader2, Edit3, Clock, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useState, useEffect, useMemo } from 'react';

// Add a style block for the custom scrollbar
const scrollbarStyles = `
  .auditor-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  .auditor-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 10px;
  }
  .auditor-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
    border: 2px solid #f1f5f9;
  }
  .auditor-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  .marks-scrollbar::-webkit-scrollbar {
    width: 10px;
  }
  .marks-scrollbar::-webkit-scrollbar-track {
    background: #e2e8f0;
    border-radius: 12px;
    margin: 8px 0;
  }
  .marks-scrollbar::-webkit-scrollbar-thumb {
    background: #64748b;
    border-radius: 12px;
    border: 2px solid #e2e8f0;
  }
  .marks-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #334155;
  }
`;

interface MarcaDetailsDialogProps {
    selectedDetails: any | null;
    onClose: () => void;
    allowEditing?: boolean;
    onUpdateSuccess?: (updatedMarca: any) => void;
}

export function MarcaDetailsDialog({ selectedDetails, onClose, allowEditing = false, onUpdateSuccess }: MarcaDetailsDialogProps) {
    const [isEditingCount, setIsEditingCount] = useState(false);
    const [editedCount, setEditedCount] = useState<number>(0);
    const [editedValue, setEditedValue] = useState<number>(4000);
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!selectedDetails) {
            setIsEditingCount(false);
        } else {
            if (selectedDetails.diasTrabajados > 0 && selectedDetails.montoAsignado) {
                setEditedValue(selectedDetails.montoAsignado / selectedDetails.diasTrabajados);
            } else {
                setEditedValue(4000);
            }
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
            const res = await updateMarcaValeCount(selectedDetails.id, editedCount, editedValue);
            if (res.error) throw new Error(res.error);
            
            toast({ title: 'Ajuste Guardado', description: `Se actualizó el conteo a ${editedCount} vales (Valor: $${editedValue}).` });
            setIsEditingCount(false);
            if (onUpdateSuccess) {
                onUpdateSuccess({ ...selectedDetails, diasTrabajados: editedCount, montoAsignado: editedCount * editedValue });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const processedGroups = useMemo(() => {
        if (!selectedDetails?.detalles) return [];
        
        const sorted = [...selectedDetails.detalles].sort((a: any, b: any) => {
            const da = parseHorarioTS(a.horario);
            const db = parseHorarioTS(b.horario);
            return (da?.getTime() || 0) - (db?.getTime() || 0);
        });

        const hasValida = sorted.some((d: any) => d.esValida !== undefined);
        if (!hasValida) {
            let lastEntrada: Date | null = null;
            let lastEntradaIdx: number = -1;
            sorted.forEach((d: any, idx: number) => {
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

        const grouped = sorted.reduce((acc: any, current: any) => {
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
          acc[datePart].marcas.push({ ...current, time: timePart || horarioStr, originalIndex: sorted.indexOf(current) });
          
          if (current.esValida) {
              acc[datePart].valesCount = 1;
          }
          
          return acc;
        }, {} as Record<string, { marcas: any[], valesCount: number }>)
        
        return Object.entries(grouped);
    }, [selectedDetails]);

    const realDaysCount = useMemo(() => {
        if (!selectedDetails?.detalles) return selectedDetails?.diasTrabajados || 0;
        const diasConMarcasValidas = new Set<string>();
        selectedDetails.detalles.forEach((d: any) => {
            if (d.esValida) {
                const datePart = d.horario.split('|')[0];
                diasConMarcasValidas.add(datePart);
            }
        });
        return diasConMarcasValidas.size;
    }, [selectedDetails]);

    const handleRecalculate = async () => {
        if (!selectedDetails) return;
        setIsUpdating(true);
        try {
            const res = await recalculateMarcaVale(selectedDetails.id);
            if (!res.success) throw new Error((res as any).error || 'Error desconocido');
            
            const nuevaCalidad = (res as any).nuevaCalidad;
            const nuevoConteo = (res as any).nuevoConteo;

            toast({ 
                title: 'Cálculo Actualizado', 
                description: `Se detectó calidad "${nuevaCalidad}" y se ajustó a ${nuevoConteo} vales.` 
            });
            
            if (onUpdateSuccess) {
                onUpdateSuccess({ 
                    ...selectedDetails, 
                    diasTrabajados: nuevoConteo, 
                    calidadContractual: nuevaCalidad,
                    diasPresenciales: (res as any).diasPresenciales
                });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleQuickAdjust = async (delta: number, dayData: any) => {
        if (!selectedDetails) return;
        if (delta > 0 && dayData.valesCount >= 1) return;
        if (delta < 0 && dayData.valesCount <= 0) return;

        setIsUpdating(true);
        try {
            const indices = dayData.marcas.map((m: any) => m.originalIndex);
            const esValido = delta > 0;
            const res = await setDiaValidez(selectedDetails.id, indices, esValido);
            
            if (!res.success) throw new Error((res as any).error || 'Error al actualizar');

            if (onUpdateSuccess) {
                const newDetalles = [...(selectedDetails.detalles || [])];
                indices.forEach((idx: number) => {
                    if (newDetalles[idx]) newDetalles[idx] = { ...newDetalles[idx], esValida: esValido };
                });

                onUpdateSuccess({ 
                    ...selectedDetails, 
                    diasTrabajados: (res as any).nuevoConteo, 
                    calidadContractual: (res as any).nuevaCalidad,
                    diasPresenciales: (res as any).diasPresenciales,
                    detalles: newDetalles
                });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={!!selectedDetails} onOpenChange={onClose}>
            <style>{scrollbarStyles}</style>
            <DialogContent className="max-w-[90vw] lg:max-w-6xl w-full h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl shadow-2xl border-none">
                <div className="p-4 px-6 border-b bg-white shrink-0 z-10 shadow-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between flex-wrap gap-4 text-left">
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-black tracking-tight text-slate-900">Panel de Auditoría</span>
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-2 py-0 h-5 text-[10px]">
                                        {selectedDetails?.mesPago || selectedDetails?.mes}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                    <span className="text-slate-900 font-bold">{selectedDetails?.nombres} {selectedDetails?.apellidos}</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0 rounded border">RUT: {selectedDetails?.RUT}</span>
                                </div>
                                {selectedDetails?.calidadContractual && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge className="bg-blue-600 text-white border-none text-[9px] font-black py-0 px-2 uppercase tracking-tight h-4">
                                            {selectedDetails.calidadContractual} 
                                            {['C', 'T'].includes(selectedDetails.calidadContractual) ? ' • Planta/Contrata' : ' • Pago Real'}
                                        </Badge>
                                        {allowEditing && (
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="h-4 w-4 rounded-full border-blue-200 text-blue-500 hover:bg-blue-50" 
                                                onClick={handleRecalculate}
                                                disabled={isUpdating}
                                            >
                                                <RefreshCcw className={`h-2.5 w-2.5 ${isUpdating ? 'animate-spin' : ''}`} />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="flex items-center divide-x border border-slate-100 rounded-xl bg-white shadow-sm overflow-hidden scale-90 origin-right">
                                    <div className="flex flex-col items-center p-1.5 px-3">
                                        <span className="text-[8px] font-black uppercase text-slate-400">Hábiles</span>
                                        <span className="font-black text-lg text-slate-700 leading-none">{selectedDetails?.diasHabilesAsistencia || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center p-1.5 px-3 bg-green-50/30">
                                        <span className="text-[8px] font-black uppercase text-green-600">Trabajados</span>
                                        <span className="font-black text-lg text-green-700 leading-none">{realDaysCount}</span>
                                    </div>
                                    <div className="flex flex-col items-center p-1.5 px-4 bg-green-600 text-white">
                                        <span className="text-[8px] font-black uppercase text-white/70">Vales</span>
                                        {isEditingCount ? (
                                            <div className="flex items-center gap-1">
                                                <Input 
                                                    type="number" 
                                                    className="w-10 h-6 text-[10px] font-bold text-center bg-white text-slate-900 border-none rounded-md p-0" 
                                                    value={editedCount} 
                                                    onChange={(e) => setEditedCount(Number(e.target.value))}
                                                />
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-white/20" onClick={handleSaveAdjustment} disabled={isUpdating}>
                                                    {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-black text-xl leading-none">{selectedDetails?.diasTrabajados}</span>
                                                {allowEditing && (
                                                    <Button size="icon" variant="ghost" className="h-5 w-5 text-white/40 hover:text-white hover:bg-white/10 rounded-full" onClick={handleStartEdit}>
                                                        <Edit3 className="h-2.5 w-2.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {(selectedDetails?.viaticos ?? 0) > 0 && (
                                    <div className="flex flex-col items-center bg-orange-600 p-1.5 px-4 rounded-xl text-white shadow-md shadow-orange-100 scale-90 origin-right">
                                        <span className="text-[8px] font-black uppercase text-white/70 tracking-wider">Viáticos</span>
                                        <span className="font-black text-lg leading-none">-{selectedDetails?.viaticos}</span>
                                    </div>
                                )}
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                </div>
    
                <div className="flex-1 min-h-0 overflow-hidden bg-slate-50/30">
                    <div className="grid grid-cols-1 lg:grid-cols-2 h-full min-h-0">
                        {/* Columna Izquierda: Auditoría y Descuentos */}
                        <div className="flex flex-col min-h-0 border-r bg-white/40 backdrop-blur-sm overflow-y-auto auditor-scrollbar">
                            <div className="p-4 px-6 space-y-5">

                                {/* Resumen estadístico */}
                                <div className="space-y-2">
                                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3 w-3 text-green-500" /> Resumen del Mes
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col gap-0.5 shadow-sm">
                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Días Hábiles</span>
                                            <span className="text-2xl font-black text-slate-700 leading-none">{selectedDetails?.diasHabilesAsistencia || 0}</span>
                                            <span className="text-[9px] text-slate-400">exigibles</span>
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col gap-0.5 shadow-sm">
                                            <span className="text-[8px] font-black uppercase text-green-600 tracking-wider">Días Asistidos</span>
                                            <span className="text-2xl font-black text-green-700 leading-none">{realDaysCount}</span>
                                            <span className="text-[9px] text-slate-400">con marcas válidas</span>
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col gap-0.5 shadow-sm">
                                            <span className="text-[8px] font-black uppercase text-red-500 tracking-wider">Ausencias</span>
                                            <span className="text-2xl font-black text-red-600 leading-none">{(selectedDetails?.diasHabilesAsistencia || 0) - realDaysCount}</span>
                                            <span className="text-[9px] text-slate-400">días sin asistencia</span>
                                        </div>
                                        <div className="bg-green-600 rounded-xl p-3 flex flex-col gap-0.5 shadow-sm">
                                            <span className="text-[8px] font-black uppercase text-white/70 tracking-wider">Vales Asignados</span>
                                            <span className="text-2xl font-black text-white leading-none">{selectedDetails?.diasTrabajados || 0}</span>
                                            <span className="text-[9px] text-white/70">
                                                {selectedDetails?.montoAsignado ? `$${selectedDetails.montoAsignado.toLocaleString('es-CL')}` : 'monto pendiente'}
                                            </span>
                                        </div>
                                        {(selectedDetails?.viaticos ?? 0) > 0 && (
                                            <div className="col-span-2 bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-black uppercase text-orange-500 tracking-wider">Descuento Viáticos</span>
                                                    <span className="text-[9px] text-orange-700 font-medium">
                                                        {selectedDetails?.diasTrabajados + selectedDetails?.viaticos} vales originales − {selectedDetails?.viaticos} descuento
                                                    </span>
                                                </div>
                                                <span className="text-2xl font-black text-orange-600 leading-none">-{selectedDetails?.viaticos}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Cálculo de Fórmula */}
                                <div className="space-y-2">
                                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                                        <RefreshCcw className="h-3 w-3 text-blue-500" /> Lógica de Cálculo
                                    </h4>
                                    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                                        {/* Calidad Contractual */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Calidad Contractual</span>
                                            <Badge className={`text-[10px] font-black px-3 py-0.5 border-none ${
                                                ['C', 'T'].includes(selectedDetails?.calidadContractual || '')
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-700 text-white'
                                            }`}>
                                                {selectedDetails?.calidadContractual || 'Sin clasificar'}
                                                {' • '}
                                                {['C', 'T'].includes(selectedDetails?.calidadContractual || '')
                                                    ? 'Planta / Contrata'
                                                    : 'Pago Real'}
                                            </Badge>
                                        </div>

                                        {/* Formula box */}
                                        <div className="relative text-sm font-black font-mono bg-slate-900 text-white p-3 px-4 rounded-xl border border-slate-800 flex items-center justify-between shadow-lg">
                                            {['C', 'T'].includes(selectedDetails?.calidadContractual || 'C') ? (
                                                <>
                                                    <span className="text-slate-400 text-[10px] uppercase tracking-tighter">Fórmula:</span>
                                                    <span className="text-blue-300 text-xs">
                                                        {selectedDetails?.diasHabilesPago ?? selectedDetails?.diasHabilesAsistencia} − [{selectedDetails?.diasHabilesAsistencia} − {realDaysCount}]
                                                    </span>
                                                    <span className="text-green-400 text-lg">= {selectedDetails?.diasTrabajados}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-slate-400 text-[9px] uppercase tracking-tighter">No aplica fórmula</span>
                                                        <span className="text-slate-300 text-[10px]">Se pagan solo días con asistencia</span>
                                                    </div>
                                                    <span className="text-green-400 text-xl">{realDaysCount} Vales</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <Clock className="h-3 w-3 text-blue-500 shrink-0" />
                                            <p className="uppercase tracking-tighter text-left">Jornada válida: &gt;6h u 8h según estamento.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Historial de Descuentos / Viáticos */}
                                <div className="space-y-2">
                                    <h4 className="text-[9px] font-black uppercase text-orange-500 tracking-widest flex items-center gap-1.5">
                                        <Badge variant="outline" className="h-1.5 w-1.5 rounded-full p-0 bg-orange-500 border-orange-500" /> Historial Viáticos (Excel)
                                    </h4>
                                    <div className="bg-white border border-orange-50 rounded-2xl overflow-hidden shadow-sm">
                                        {selectedDetails?.observaciones ? (
                                            <div className="p-4 space-y-3">
                                                <div className="bg-orange-50/40 p-2.5 rounded-xl border border-orange-100 text-[11px] text-orange-900 font-bold italic leading-tight text-left">
                                                    &ldquo;{selectedDetails.observaciones}&rdquo;
                                                </div>
                                                
                                                {selectedDetails.detallesViaticos && selectedDetails.detallesViaticos.length > 0 && (
                                                    <div className="border border-slate-50 rounded-xl overflow-hidden bg-white shadow-inner">
                                                        <ScrollArea className="h-[220px] auditor-scrollbar">
                                                            <Table>
                                                                <TableBody>
                                                                    {selectedDetails.detallesViaticos.map((r: any, idx: number) => {
                                                                        const keys = selectedDetails.columnasViaticos || Object.keys(selectedDetails.detallesViaticos![0]);
                                                                        return (
                                                                            <TableRow key={idx} className="hover:bg-slate-50/50 border-slate-50 transition-colors">
                                                                                {keys.map((k: string, i: number) => {
                                                                                    const v = r[k];
                                                                                    let displayValue = v !== undefined && v !== null ? String(v) : '';
                                                                                    if (k.toLowerCase().includes('fecha') && typeof v === 'number' && v > 20000 && v < 70000) {
                                                                                        const excelEpoch = new Date(1899, 11, 30);
                                                                                        const dateObj = new Date(excelEpoch.getTime() + v * 86400000);
                                                                                        displayValue = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                                                                                    }
                                                                                    return <TableCell key={i} className="text-[10px] py-1.5 font-bold text-slate-700">{displayValue}</TableCell>;
                                                                                })}
                                                                            </TableRow>
                                                                        );
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                        </ScrollArea>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-6 text-center text-slate-300 font-bold uppercase tracking-widest text-[9px]">
                                                Sin descuentos registrados.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Calendario de Marcas */}
                        <div className="flex flex-col min-h-0 bg-slate-50/20 overflow-hidden relative border-l border-slate-100">
                            <div className="p-3 px-6 border-b bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
                                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Asistencia Mensual</h4>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm" />
                                        <span className="text-[8px] font-black text-slate-400 uppercase">Válida</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 p-4 overflow-y-scroll marks-scrollbar" style={{scrollbarGutter: 'stable'}}>
                                <div className="space-y-3 pb-8 max-w-md mx-auto">
                                  {processedGroups.map(([dia, data]: any) => (
                                    <div key={dia} className="group border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-fit transition-all hover:shadow-md hover:border-blue-100">
                                      <div className="bg-slate-50/50 px-3 py-1.5 text-[10px] font-black border-b border-slate-50 flex items-center justify-between">
                                        <span className="capitalize text-slate-600 truncate">{dia}</span>
                                        <div className="flex items-center gap-1 scale-90 origin-right">
                                            {allowEditing && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-5 w-5 text-slate-300 hover:text-destructive hover:bg-destructive/10 rounded-full" 
                                                    onClick={() => handleQuickAdjust(-1, data)} 
                                                    disabled={isUpdating || data.valesCount <= 0}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                            )}
                                            <Badge variant={data.valesCount > 0 ? "default" : "outline"} 
                                                   className={`${data.valesCount > 0 ? 'bg-green-500' : 'text-slate-300 border-slate-200'} text-[9px] font-black px-2 py-0 h-4.5 rounded-full border-none`}>
                                                {data.valesCount}
                                            </Badge>
                                            {allowEditing && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-5 w-5 text-slate-300 hover:text-blue-600 hover:bg-blue-100/50 rounded-full" 
                                                    onClick={() => handleQuickAdjust(1, data)} 
                                                    disabled={isUpdating || data.valesCount >= 1}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                      </div>
                                      <div className="p-1 px-2">
                                        <Table>
                                            <TableBody>
                                                {data.marcas.map((m: any, i: number) => (
                                                    <TableRow key={i} className={`${m.esValida ? "bg-green-50/30" : ""} hover:bg-slate-50/50 border-none transition-colors`}>
                                                        <TableCell className="text-[10px] py-1 flex items-center justify-between border-none">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono font-black text-slate-500 tracking-tighter">{m.time}</span>
                                                                {m.esValida && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-[9px] font-black py-1 text-right border-none">
                                                            <span className={m.estado.toLowerCase().includes('ent') ? "text-blue-500" : "text-orange-500"}>
                                                                {m.estado}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
