'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { HistorialCargaVales } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Loader2, Plane, Search, CheckCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { previewViaticosMasivos, applySelectedViaticosMasivos } from '../actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const app = getApps().find(app => app.name === 'server-actions-vales') || initializeApp(firebaseConfig, 'server-actions-vales');
const db = getFirestore(app);

export function BulkUploadViaticosSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [selectedHistorialId, setSelectedHistorialId] = useState('');
  const [historiales, setHistoriales] = useState<HistorialCargaVales[]>([]);
  const [isLoadingHistoriales, setIsLoadingHistoriales] = useState(true);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previews, setPreviews] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<any>(null);

  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const qHistoriales = query(collection(db, 'historial_cargas_vales'), orderBy('fechaCarga', 'desc'));
    const unsubHistoriales = onSnapshot(qHistoriales, (snapshot) => {
        const histData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as HistorialCargaVales[];
        setHistoriales(histData);
        if (histData.length > 0 && !selectedHistorialId) {
            setSelectedHistorialId(histData[0].id);
        }
        setIsLoadingHistoriales(false);
    });
    return () => unsubHistoriales();
  }, [isOpen, selectedHistorialId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const resetState = () => {
      setFile(null);
      setSelectedHistorialId('');
      setPreviews([]);
      setSelectedIndices(new Set());
  }

  const handleAnalyze = async () => {
    if (!file) {
      toast({ title: 'Error', description: 'Por favor selecciona un archivo.', variant: 'destructive' });
      return;
    }
    if (!selectedHistorialId) {
      toast({ title: 'Error', description: 'Por favor selecciona el mes de destino.', variant: 'destructive' });
      return;
    }

    setIsAnalyzing(true);
    setPreviews([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('El archivo Excel está vacío o no se pudo leer.');
      }

      const result = await previewViaticosMasivos(jsonData, selectedHistorialId);

      if (result.error) {
        throw new Error(result.error);
      }

      const data = result.previews || [];
      setPreviews(data);
      setSelectedIndices(new Set(data.map((_: any, i: number) => i)));
      
      toast({
        title: 'Análisis Completado',
        description: `Se detectaron ${data.length} funcionarios con viáticos válidos en el rango.`,
      });
      
    } catch (error: any) {
      toast({
        title: 'Error al procesar archivo',
        description: error.message || 'Ocurrió un error inesperado al cruzar la información.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = async () => {
       if (selectedIndices.size === 0) {
           toast({ title: 'Atención', description: 'No has seleccionado ningún descuento para aplicar.' });
           return;
       }

       setIsApplying(true);
       try {
           const itemsToApply = previews.filter((_, i) => selectedIndices.has(i));
           
           const result = await applySelectedViaticosMasivos(itemsToApply, 4000);
           if (result.error) throw new Error(result.error);

           toast({
               title: '¡Viáticos Aplicados!',
               description: `Se han actualizado ${result.count} registros en el historial seleccionado.`,
           });

           setIsOpen(false);
           resetState();
           setTimeout(() => window.location.reload(), 1500);

       } catch (error: any) {
          toast({
            title: 'Error al aplicar',
            description: error.message || 'Hubo un fallo al intentar guardar en la base de datos.',
            variant: 'destructive',
          });
       } finally {
           setIsApplying(false);
       }
  }

  const toggleSelect = (index: number) => {
      const newSet = new Set(selectedIndices);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      setSelectedIndices(newSet);
  }

  const openDetails = (row: any) => {
      setSelectedPreview(row);
      setDetailsOpen(true);
  }

  return (
    <>
    <Sheet open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) resetState(); }}>
      <SheetTrigger asChild>
        <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
          <Plane className="mr-2 h-4 w-4" />
          Subir Viáticos (Rangos)
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-3xl w-full">
        <SheetHeader>
          <SheetTitle>Carga de Viáticos por Resoluciones</SheetTitle>
          <SheetDescription>
             Busca marcas válidas en cualquier mes pero descuenta los vales en el mes seleccionado.
          </SheetDescription>
        </SheetHeader>

        {previews.length === 0 ? (
            <div className="grid gap-4 py-6">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">Mes a descontar</Label>
                    <Select value={selectedHistorialId} onValueChange={setSelectedHistorialId} disabled={isLoadingHistoriales}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Seleccionar mes de destino..." />
                        </SelectTrigger>
                        <SelectContent>
                            {historiales.length === 0 && <SelectItem value="empty" disabled>No hay historiales</SelectItem>}
                            {historiales.map(h => (
                                <SelectItem key={h.id} value={h.id}>
                                    Carga: {h.mes} - {h.fechaCarga?.toDate ? format(h.fechaCarga.toDate(), "d MMM HH:mm", {locale: es}) : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="file-viaticos" className="text-right font-medium">Archivo Excel</Label>
                    <Input
                        id="file-viaticos"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="col-span-3"
                    />
                </div>
                <div className="text-sm border rounded-md p-4 bg-muted/30 ml-auto mr-auto w-full max-w-md mt-4">
                    <p className="font-semibold text-orange-700 mb-2">Columnas esperadas:</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
                        <li><b>RUT:</b> Identificador del funcionario.</li>
                        <li><b>FECHA_INICIO / FECHA_TERMINO:</b> Rango del viático.</li>
                        <li className="pt-2 italic">Se validará asistencia en cualquier mes, pero el descuento se hará en el mes seleccionado arriba.</li>
                    </ul>
                </div>
                
                <div className="flex justify-end mt-4">
                    <Button onClick={handleAnalyze} disabled={isAnalyzing || !file || !selectedHistorialId}>
                        {isAnalyzing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando Marcas...</>
                        ) : (
                            <><Search className="mr-2 h-4 w-4" /> Analizar Resoluciones</>
                        )}
                    </Button>
                </div>
            </div>
        ) : (
            <div className="flex flex-col mt-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center justify-between">
                    <span>Previsualización de Descuentos</span>
                    <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                        {selectedIndices.size} seleccionados
                    </span>
                </h3>
                
                <div className="flex-1 border rounded-md overflow-hidden bg-background">
                    <ScrollArea className="h-[450px]">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="w-[40px] text-center">
                                         <Checkbox 
                                            checked={selectedIndices.size === previews.length && previews.length > 0}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedIndices(new Set(previews.map((_, i) => i)));
                                                else setSelectedIndices(new Set());
                                            }}
                                         />
                                    </TableHead>
                                    <TableHead className="text-xs">Funcionario</TableHead>
                                    <TableHead className="text-center text-xs">Vales<br/>Orig.</TableHead>
                                    <TableHead className="text-center text-xs font-bold text-orange-600">Viáticos<br/>Rango</TableHead>
                                    <TableHead className="text-center text-xs font-bold text-green-700">Vales<br/>Finales</TableHead>
                                    <TableHead className="text-xs">Detalle Validado</TableHead>
                                    <TableHead className="w-[40px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previews.map((row, idx) => (
                                    <TableRow key={idx} className={selectedIndices.has(idx) ? "bg-muted/20" : "opacity-60 grayscale"}>
                                        <TableCell className="text-center">
                                            <Checkbox 
                                                checked={selectedIndices.has(idx)}
                                                onCheckedChange={() => toggleSelect(idx)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-[10px]">{row.rut}</div>
                                            <div className="text-[9px] truncate max-w-[100px]">{row.nombres}</div>
                                        </TableCell>
                                        <TableCell className="text-center text-[10px] text-muted-foreground">
                                            {row.valesOriginales}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-orange-600 text-[10px]">
                                            -{row.viaticosDetectados}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-green-700 text-[10px]">
                                            {selectedIndices.has(idx) ? row.valesFinales : row.valesOriginales}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-[8px] text-muted-foreground leading-tight">
                                                {row.fechasViaticos}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDetails(row)}>
                                                <Eye className="h-3 w-3 text-blue-600" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>

                <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setPreviews([])} disabled={isApplying}>
                        Cancelar
                    </Button>
                    <Button onClick={handleApply} disabled={isApplying || selectedIndices.size === 0} className="bg-orange-600 hover:bg-orange-700 text-white">
                        {isApplying ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aplicando...</>
                        ) : (
                            <><CheckCircle className="mr-2 h-4 w-4" /> Aplicar {selectedIndices.size} Resoluciones</>
                        )}
                    </Button>
                </div>
            </div>
        )}
      </SheetContent>
    </Sheet>
    
    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
              <DialogTitle className="text-sm">Detalle de Resolución: {selectedPreview?.nombres}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-6">
              <div className="border rounded-md p-4 bg-muted/20">
                  <h4 className="font-bold text-xs mb-2 uppercase text-muted-foreground">Marcas Encontradas en Historia</h4>
                  <div className="flex flex-wrap gap-2">
                      {selectedPreview?.fechasValidadas ? (
                          selectedPreview.fechasValidadas.split(', ').map((d: string) => (
                              <span key={d} className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 font-medium">
                                  {d}
                              </span>
                          ))
                      ) : (
                          <span className="text-xs text-orange-600 italic">No se encontraron marcas para este rango.</span>
                      )}
                  </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                  <h4 className="font-bold text-xs p-3 bg-muted border-b uppercase text-muted-foreground">Datos del Excel</h4>
                  <Table>
                      <TableBody>
                          {selectedPreview?.rawRows?.[0] && Object.entries(selectedPreview.rawRows[0]).map(([k, v]: [string, any]) => (
                              <TableRow key={k}>
                                  <TableCell className="font-bold text-[10px] bg-muted/30 w-1/3">{k}</TableCell>
                                  <TableCell className="text-[10px]">{String(v)}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </div>
          </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
