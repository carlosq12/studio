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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
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
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const resetState = () => {
      setFile(null);
      setSelectedHistorialId('');
      setPreviews([]);
      setSelectedIds(new Set());
  }

  const handleAnalyze = async () => {
    if (!file) {
      toast({ title: 'Error', description: 'Por favor selecciona un archivo.', variant: 'destructive' });
      return;
    }
    if (!selectedHistorialId) {
      toast({ title: 'Error', description: 'Por favor selecciona la carga de vales.', variant: 'destructive' });
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
      setSelectedIds(new Set(data.map(p => p.marcaId)));
      
      toast({
        title: 'Análisis Completado',
        description: `Se detectaron ${data.length} coincidencias para descontar.`,
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
       if (selectedIds.size === 0) {
           toast({ title: 'Atención', description: 'No has seleccionado ningún funcionario para aplicar descuentos.' });
           return;
       }

       setIsApplying(true);
       try {
           const itemsToApply = previews.filter(p => selectedIds.has(p.marcaId));
           
           const result = await applySelectedViaticosMasivos(itemsToApply, 4000, file?.name, selectedHistorialId);
           if (result.error) throw new Error(result.error);

           toast({
               title: '¡Viáticos Aplicados!',
               description: `Se han actualizado ${result.count} registros exitosamente.`,
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

  const toggleSelect = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
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
          Subir Viáticos
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-2xl w-full">
        <SheetHeader>
          <SheetTitle>Carga Revisada de Viáticos</SheetTitle>
          <SheetDescription>
             Sube el archivo Excel para previsualizar y confirmar a qué funcionarios se les descontará de sus vales.
          </SheetDescription>
        </SheetHeader>

        {previews.length === 0 ? (
            <div className="grid gap-4 py-6">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-medium">Historial a afectar</Label>
                    <Select value={selectedHistorialId} onValueChange={setSelectedHistorialId} disabled={isLoadingHistoriales}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Seleccionar carga..." />
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
                <div className="text-sm border rounded-md p-4 bg-muted/30 ml-auto mr-auto w-full max-w-sm mt-4">
                    <p className="font-semibold text-orange-700 mb-2">Formato esperado:</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
                        <li>Columna obligatoria: <b>RUT</b></li>
                        <li>Las filas duplicadas por RUT se contarán como múltiples viáticos.</li>
                        <li>Si tienes una columna <b>TOTAL DIAS</b> o <b>A descontar</b>, se tomará ese valor directamente.</li>
                    </ul>
                </div>
                
                <div className="flex justify-end mt-4">
                    <Button onClick={handleAnalyze} disabled={isAnalyzing || !file || !selectedHistorialId}>
                        {isAnalyzing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...</>
                        ) : (
                            <><Search className="mr-2 h-4 w-4" /> Analizar Archivo</>
                        )}
                    </Button>
                </div>
            </div>
        ) : (
            <div className="flex flex-col mt-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center justify-between">
                    <span>Previsualización de Descuentos</span>
                    <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                        {selectedIds.size} seleccionados
                    </span>
                </h3>
                
                <div className="flex-1 border rounded-md overflow-hidden bg-background">
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="w-[50px] text-center">
                                         <Checkbox 
                                            checked={selectedIds.size === previews.length && previews.length > 0}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedIds(new Set(previews.map(p => p.marcaId)));
                                                else setSelectedIds(new Set());
                                            }}
                                         />
                                    </TableHead>
                                    <TableHead>RUT</TableHead>
                                    <TableHead>Funcionario</TableHead>
                                    <TableHead className="text-center">Vales<br/>Orig.</TableHead>
                                    <TableHead className="text-center font-bold text-orange-600">Viáticos<br/>Detectados</TableHead>
                                    <TableHead className="text-center font-bold text-green-700">Vales<br/>Finales</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previews.map((row) => (
                                    <TableRow key={row.marcaId} className={selectedIds.has(row.marcaId) ? "bg-muted/20" : "opacity-60 grayscale"}>
                                        <TableCell className="text-center">
                                            <Checkbox 
                                                checked={selectedIds.has(row.marcaId)}
                                                onCheckedChange={() => toggleSelect(row.marcaId)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium text-xs">{row.rut}</TableCell>
                                        <TableCell className="text-xs">{row.nombres}</TableCell>
                                        <TableCell className="text-center text-muted-foreground">{row.valesOriginales}</TableCell>
                                        <TableCell className="text-center font-bold text-orange-600">
                                            -{row.viaticosDetectados}
                                            {row.fechasViaticos && (
                                                <div className="text-[10px] font-normal text-muted-foreground mt-1">({row.fechasViaticos})</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-green-700">
                                            {selectedIds.has(row.marcaId) ? row.valesFinales : row.valesOriginales}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {row.rawRows && row.rawRows.length > 0 && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDetails(row)}>
                                                    <Eye className="h-4 w-4 text-blue-600" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>

                <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setPreviews([])} disabled={isApplying}>
                        Cancelar Previa
                    </Button>
                    <Button onClick={handleApply} disabled={isApplying || selectedIds.size === 0} className="bg-orange-600 hover:bg-orange-700 text-white">
                        {isApplying ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                        ) : (
                            <><CheckCircle className="mr-2 h-4 w-4" /> Aplicar {selectedIds.size} Descuentos</>
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
              <DialogTitle>Detalle de Viáticos en Excel: {selectedPreview?.nombres}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
              {selectedPreview?.rawRows && selectedPreview.rawRows.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                      <Table>
                          <TableHeader className="bg-muted">
                              <TableRow>
                                  {Object.keys(selectedPreview.rawRows[0]).map(k => <TableHead key={k}>{k}</TableHead>)}
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {selectedPreview.rawRows.map((r: any, idx: number) => (
                                  <TableRow key={idx}>
                                      {Object.entries(r).map(([k, v]: [string, any], i: number) => {
                                          let displayValue = String(v);
                                          if (k.toLowerCase().includes('fecha') && typeof v === 'number' && v > 20000 && v < 70000) {
                                              const excelEpoch = new Date(1899, 11, 30);
                                              const dateObj = new Date(excelEpoch.getTime() + v * 86400000);
                                              displayValue = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                                          }
                                          return <TableCell key={i}>{displayValue}</TableCell>;
                                      })}
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
              ) : (
                  <p className="text-sm text-muted-foreground">No hay detalles disponibles.</p>
              )}
          </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
