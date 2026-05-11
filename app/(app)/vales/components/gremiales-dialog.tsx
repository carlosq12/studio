'use client';

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users2, Calendar as CalendarIcon, Search, Plus, Trash2, RefreshCcw } from "lucide-react";
import { collection, query, where, getDocs, doc, getFirestore } from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";
import type { FuncionarioVale, HistorialCargaVales, MarcaVale } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { recalculateMarcaVale, saveGremialesBatch, getGremialesConfig, saveGremialesConfig, applyGremialesConfigToCarga } from "../actions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addDays, differenceInCalendarDays, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

const app = getApps().find(app => app.name === 'server-actions-vales') || initializeApp(firebaseConfig, 'server-actions-vales');
const db = getFirestore(app);

interface GremialesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historiales: HistorialCargaVales[];
}

export function GremialesDialog({ open, onOpenChange, historiales }: GremialesDialogProps) {
  const [mode, setMode] = useState<"config" | "manage">("manage");
  const [configMonth, setConfigMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [selectedHistorialId, setSelectedHistorialId] = useState<string>("");
  const [allFuncionarios, setAllFuncionarios] = useState<FuncionarioVale[]>([]);
  const [gremialistas, setGremialistas] = useState<FuncionarioVale[]>([]);
  const [marcasGremiales, setMarcasGremiales] = useState<Record<string, { marcaId?: string; diasMasivos: number; fechas: string[]; diasPresenciales?: number }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingConfig, setIsApplyingConfig] = useState(false);
  const [globalDays, setGlobalDays] = useState<number>(0);
  const { toast } = useToast();

  const [selectedFuncForDate, setSelectedFuncForDate] = useState<FuncionarioVale | null>(null);
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [openFuncSearch, setOpenFuncSearch] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchFuncionarios = async () => {
        setIsLoading(true);
        try {
          const q = query(collection(db, "funcionarios_vales"), where("estado", "==", "Activo"));
          const snap = await getDocs(q);
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FuncionarioVale[];
          setAllFuncionarios(list);
          setGremialistas(list.filter(f => f.esGremialista));
          
          if (historiales.length > 0 && !selectedHistorialId) {
            setSelectedHistorialId(historiales[0].id);
          }
        } catch (error) {
          console.error("Error fetching funcionarios:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchFuncionarios();
    }
  }, [open, historiales]);

  useEffect(() => {
    const fetchGremiales = async () => {
      if (mode === "manage") {
        if (!selectedHistorialId || allFuncionarios.length === 0) {
          setMarcasGremiales({});
          return;
        }
        setIsLoading(true);
        try {
          const q = query(
            collection(db, "marcas_vales"),
            where("historialId", "==", selectedHistorialId)
          );
          const snap = await getDocs(q);
          const newMarcasMap: Record<string, any> = {};
          
          snap.docs.forEach(d => {
            const data = d.data() as MarcaVale;
            const f = allFuncionarios.find(func => func.RUT === data.RUT);
            if (f) {
              newMarcasMap[f.id] = {
                marcaId: d.id,
                diasMasivos: data.diasGremialesMasivos || 0,
                fechas: data.fechasGremiales || [],
                diasPresenciales: data.diasPresenciales || 0
              };
            }
          });
          setMarcasGremiales(newMarcasMap);
        } catch (error) {
          console.error("Error fetching marcas:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        // MODO CONFIGURACIÓN
        if (!configMonth) return;
        setIsLoading(true);
        try {
          const res = await getGremialesConfig(configMonth);
          if (res.success && res.config) {
            setMarcasGremiales(res.config);
          } else {
            setMarcasGremiales({});
          }
        } catch (error) {
          console.error("Error fetching config:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchGremiales();
  }, [selectedHistorialId, allFuncionarios, mode, configMonth]);

  const handleDayChange = (funcionarioId: string, value: string) => {
    const dias = parseInt(value) || 0;
    setMarcasGremiales(prev => ({
      ...prev,
      [funcionarioId]: {
        ...prev[funcionarioId],
        diasMasivos: dias
      }
    }));
  };

  const handleAssignToAll = () => {
    const newMarcas = { ...marcasGremiales };
    let assignedCount = 0;
    gremialistas.forEach(g => {
      const current = marcasGremiales[g.id] || { diasMasivos: 0, fechas: [] };
      if (mode === "config" || current.marcaId) {
        newMarcas[g.id] = { ...current, diasMasivos: globalDays };
        assignedCount++;
      }
    });
    setMarcasGremiales(newMarcas);
    toast({ 
        title: "Días masivos asignados", 
        description: `Se asignaron ${globalDays} días a ${assignedCount} funcionarios.` 
    });
    setGlobalDays(0); // Limpiar el input después de asignar
  };

  // Encontrar el valor más común de días masivos para mostrar como "Asignado actualmente"
  const currentMassiveValue = useMemo(() => {
    if (gremialistas.length === 0) return 0;
    const firstId = gremialistas[0].id;
    return marcasGremiales[firstId]?.diasMasivos || 0;
  }, [marcasGremiales, gremialistas]);

  const handleAddDateToFunc = () => {
    if (!selectedFuncForDate || !fromDate || !toDate) return;
    
    const funcId = selectedFuncForDate.id;
    const currentInfo = marcasGremiales[funcId] || { diasMasivos: 0, fechas: [] };

    if (mode === "manage" && !currentInfo?.marcaId) {
      toast({ variant: "destructive", title: "Error", description: "Este funcionario no tiene marcas cargadas este mes." });
      return;
    }

    if (isAfter(fromDate, toDate)) {
      toast({ variant: "destructive", title: "Rango inválido", description: "La fecha inicial debe ser anterior a la final." });
      return;
    }

    const datesToAdd: string[] = [];
    let current = new Date(fromDate);
    while (current <= toDate) {
        datesToAdd.push(format(current, "yyyy-MM-dd"));
        current = addDays(current, 1);
    }

    const uniqueNewDates = datesToAdd.filter(d => !currentInfo.fechas.includes(d));

    if (uniqueNewDates.length === 0) {
      toast({ variant: "destructive", title: "Días duplicados", description: "Las fechas seleccionadas ya estaban asignadas." });
      return;
    }

    const newFechas = [...currentInfo.fechas, ...uniqueNewDates].sort();
    setMarcasGremiales(prev => ({
      ...prev,
      [funcId]: {
        ...prev[funcId],
        fechas: newFechas
      }
    }));

    toast({ 
        title: uniqueNewDates.length > 1 ? "Días agregados" : "Día agregado", 
        description: `Se agregaron ${uniqueNewDates.length} día(s) por fecha a ${selectedFuncForDate.nombres}.` 
    });
  };

  const handleApplyConfig = async () => {
    if (!selectedHistorialId) return;
    if (!confirm(`¿Deseas aplicar la planificación de ${configMonth} a esta carga? Esto sobrescribirá los días gremiales actuales.`)) return;
    
    setIsApplyingConfig(true);
    try {
        const res = await applyGremialesConfigToCarga(selectedHistorialId, configMonth);
        if (res.success) {
            toast({ title: "Configuración aplicada", description: `Se actualizaron ${res.count} registros usando el plan de ${configMonth}.` });
            // Forzar recarga de marcas
            const current = selectedHistorialId;
            setSelectedHistorialId("");
            setTimeout(() => setSelectedHistorialId(current), 10);
        } else {
            toast({ variant: "destructive", title: "Error", description: res.error });
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsApplyingConfig(false);
    }
  };

  const handleRemoveDate = (funcId: string, dateStr: string) => {
    setMarcasGremiales(prev => ({
      ...prev,
      [funcId]: {
        ...prev[funcId],
        fechas: prev[funcId].fechas.filter(d => d !== dateStr)
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (mode === "manage") {
        const updates = Object.values(marcasGremiales)
          .filter(m => m.marcaId)
          .map(m => ({
            marcaId: m.marcaId!,
            diasMasivos: m.diasMasivos ?? 0,
            fechas: m.fechas ?? []
          }));

        if (updates.length === 0) {
          toast({ title: "Sin cambios", description: "No hay datos nuevos para guardar." });
          return;
        }

        const res = await saveGremialesBatch(updates);

        if (res.success) {
          toast({
            title: "Cambios guardados",
            description: `Se actualizaron ${res.count} registros correctamente.`,
          });
          // onOpenChange(false); // Eliminado para mantener la ventana abierta
        } else {
          throw new Error(res.error);
        }
      } else {
        // MODO CONFIGURACIÓN
        const updates = Object.entries(marcasGremiales).map(([funcId, m]) => ({
          funcionarioId: funcId,
          diasMasivos: m.diasMasivos ?? 0,
          fechas: m.fechas ?? []
        }));

        const res = await saveGremialesConfig(configMonth, updates);
        if (res.success) {
            toast({ title: "Configuración guardada", description: `Se guardó la planificación para el mes ${configMonth}.` });
            // onOpenChange(false);
        } else {
            throw new Error(res.error);
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-blue-600" />
            Gestión Avanzada de Días Gremiales
          </DialogTitle>
          <DialogDescription>
            Administra días masivos y fechas específicas. El total será la suma de ambos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 px-6 py-4 overflow-y-auto">
          <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="config">Configurar Mes (Preventivo)</TabsTrigger>
              <TabsTrigger value="manage">Gestionar Carga (Actual)</TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              {mode === "manage" ? (
                <>
                    <div className="flex flex-col gap-2 flex-1">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Carga de Marcas</Label>
                        <Select value={selectedHistorialId} onValueChange={setSelectedHistorialId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {historiales.map(h => (
                                <SelectItem key={h.id} value={h.id}>
                                    {h.mes} - {h.fechaCarga?.toDate ? format(h.fechaCarga.toDate(), "dd/MM") : ''}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Mes del Plan</Label>
                        <div className="flex gap-1">
                            <Select 
                                value={configMonth.split("-")[1]} 
                                onValueChange={(v) => setConfigMonth(`${configMonth.split("-")[0]}-${v}`)}
                            >
                                <SelectTrigger className="w-[110px] bg-white h-10">
                                    <SelectValue placeholder="Mes" />
                                </SelectTrigger>
                                <SelectContent>
                                    {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                                        <SelectItem key={m} value={m}>
                                            {format(new Date(2024, parseInt(m)-1), "MMMM", { locale: es })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select 
                                value={configMonth.split("-")[0]} 
                                onValueChange={(v) => setConfigMonth(`${v}-${configMonth.split("-")[1]}`)}
                            >
                                <SelectTrigger className="w-[85px] bg-white h-10">
                                    <SelectValue placeholder="Año" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2024, 2025, 2026].map(y => (
                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 h-10 px-4 mb-[1px]"
                        onClick={handleApplyConfig}
                        disabled={!selectedHistorialId || isApplyingConfig}
                    >
                        {isApplyingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                        Aplicar
                    </Button>
                </>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Período a Planificar</Label>
                    <div className="flex gap-2">
                        <Select 
                            value={configMonth.split("-")[1]} 
                            onValueChange={(v) => setConfigMonth(`${configMonth.split("-")[0]}-${v}`)}
                        >
                            <SelectTrigger className="flex-1 bg-white h-10">
                                <SelectValue placeholder="Seleccione Mes" />
                            </SelectTrigger>
                            <SelectContent>
                                {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                                    <SelectItem key={m} value={m}>
                                        {format(new Date(2024, parseInt(m)-1), "MMMM", { locale: es }).toUpperCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select 
                            value={configMonth.split("-")[0]} 
                            onValueChange={(v) => setConfigMonth(`${v}-${configMonth.split("-")[1]}`)}
                        >
                            <SelectTrigger className="w-32 bg-white h-10">
                                <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent>
                                {[2024, 2025, 2026].map(y => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
              )}
            </div>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-3">
                <Label className="text-xs font-bold text-blue-800 uppercase block">1. Asignación Masiva</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    min="0" 
                    max="31" 
                    value={globalDays === 0 ? "" : globalDays} 
                    placeholder="0"
                    onChange={(e) => setGlobalDays(parseInt(e.target.value) || 0)}
                    className="bg-white h-9"
                  />
                  <Button onClick={handleAssignToAll} className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap h-9">
                    Asignar
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-blue-600 italic leading-tight">
                    Aplica estos días a todos los gremialistas.
                  </p>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Días Asignados</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-black h-6 px-3 text-sm">
                      {currentMassiveValue}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase px-1">Detalle por Gremialista</Label>
                <div className="border rounded-md overflow-hidden bg-white">
                  <div className="bg-slate-100 p-2 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-600 border-b">
                    <div className="col-span-5">Funcionario</div>
                    <div className="col-span-2 text-center">Presenc.</div>
                    <div className="col-span-1 text-center">M</div>
                    <div className="col-span-2 text-center">Fechas</div>
                    <div className="col-span-2 text-center font-black">TOTAL</div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="divide-y">
                      {isLoading ? (
                         <div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
                      ) : gremialistas.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No hay gremialistas registrados.</div>
                      ) : gremialistas.map((g) => {
                        const info = marcasGremiales[g.id];
                        const total = (info?.diasMasivos || 0) + (info?.fechas?.length || 0);
                        return (
                          <div key={g.id} className="p-2 grid grid-cols-12 gap-2 items-center hover:bg-slate-50">
                            <div className="col-span-5 min-w-0">
                              <p className="text-[11px] font-bold truncate leading-tight">{g.nombres} {g.apellidos}</p>
                              <p className="text-[9px] text-slate-500 font-mono">{g.RUT}</p>
                            </div>
                            <div className="col-span-2 text-center text-[11px] text-slate-500 font-medium">
                                {mode === "manage" ? (info?.diasPresenciales || 0) : "-"}
                            </div>
                            <div className="col-span-1 flex justify-center">
                                <Input
                                    type="number"
                                    className="w-10 h-7 text-center font-bold text-[11px] p-0"
                                    value={info?.diasMasivos || 0}
                                    onChange={(e) => handleDayChange(g.id, e.target.value)}
                                    disabled={mode === "manage" && !info?.marcaId}
                                />
                            </div>
                            <div className="col-span-2 text-center text-[11px] font-medium text-blue-600">
                                {info?.fechas?.length || 0}
                            </div>
                            <div className="col-span-2 text-center text-[12px] font-black text-slate-900 bg-blue-50/50 rounded h-7 flex items-center justify-center border border-blue-100/50">
                                {total}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <Label className="text-xs font-bold text-slate-700 uppercase block">2. Días Únicos por Fecha</Label>
                
                <Popover open={openFuncSearch} onOpenChange={setOpenFuncSearch}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-[11px] h-9">
                      {selectedFuncForDate ? `${selectedFuncForDate.nombres} ${selectedFuncForDate.apellidos}` : "Seleccionar Gremialista..."}
                      <Search className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar..." />
                      <CommandList>
                        <CommandEmpty>No se encontró.</CommandEmpty>
                        <CommandGroup>
                          {gremialistas.map((f) => (
                            <CommandItem
                              key={f.id}
                              onSelect={() => {
                                setSelectedFuncForDate(f);
                                setOpenFuncSearch(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">{f.nombres} {f.apellidos}</span>
                                <span className="text-[10px] text-slate-500">{f.RUT}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400 uppercase font-bold">Desde</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full text-[11px] justify-start h-8 px-2">
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {fromDate ? format(fromDate, "dd/MM/yy") : "Inicio"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={fromDate}
                            onSelect={setFromDate}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400 uppercase font-bold">Hasta</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full text-[11px] justify-start h-8 px-2">
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {toDate ? format(toDate, "dd/MM/yy") : "Fin"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={toDate}
                            onSelect={setToDate}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                      Total: {fromDate && toDate && !isAfter(fromDate, toDate) ? differenceInCalendarDays(toDate, fromDate) + 1 : 0} días
                    </div>
                    <Button onClick={handleAddDateToFunc} disabled={!selectedFuncForDate} className="bg-slate-800 hover:bg-slate-900 h-8 px-4 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase px-1">Resumen Fechas Específicas</Label>
                <ScrollArea className="h-[240px] border rounded-md bg-white">
                  <div className="p-3 space-y-3">
                    {Object.entries(marcasGremiales).filter(([_, info]) => info.fechas.length > 0).length === 0 ? (
                      <p className="text-center text-[11px] text-slate-400 py-8">No hay fechas asignadas.</p>
                    ) : Object.entries(marcasGremiales).filter(([_, info]) => info.fechas.length > 0).map(([funcId, info]) => {
                        const funcionario = allFuncionarios.find(f => f.id === funcId);
                        return (
                          <div key={funcId} className="space-y-1">
                            <p className="text-[10px] font-bold text-blue-700">{funcionario?.nombres} {funcionario?.apellidos}</p>
                            <div className="flex flex-wrap gap-1">
                              {info.fechas.map(date => (
                                <Badge key={date} variant="outline" className="text-[10px] gap-1.5 px-2 bg-blue-50 text-blue-700 border-blue-200 py-0.5 font-bold">
                                  {format(new Date(date + "T12:00:00"), "dd/MM")}
                                  <Trash2 
                                    className="h-3 w-3 text-blue-400 hover:text-red-500 cursor-pointer transition-colors" 
                                    onClick={() => handleRemoveDate(funcId, date)}
                                  />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 gap-2 sm:gap-0 bg-slate-50 border-t mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !selectedHistorialId}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Todos los Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
