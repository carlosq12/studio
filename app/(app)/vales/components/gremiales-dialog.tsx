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
import { Loader2, Save, Users2, Calendar as CalendarIcon, Search, Plus, Trash2, RefreshCcw, ShieldCheck } from "lucide-react";
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
import { format, addDays, differenceInCalendarDays, isAfter, parse } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
 
 function cleanRut(rut: string) {
     return rut.replace(/[^0-9Kk]/g, '').toUpperCase();
 }

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
  const [validationSourceId, setValidationSourceId] = useState<string>("");
  const [validationDates, setValidationDates] = useState<Date[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
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
            setValidationSourceId(historiales[0].id);
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
          // 1. Obtener marcas actuales de la carga
          const q = query(
            collection(db, "marcas_vales"),
            where("historialId", "==", selectedHistorialId)
          );
          const snap = await getDocs(q);
          const marcasBase: Record<string, any> = {};
          
          snap.docs.forEach(d => {
            const data = d.data() as MarcaVale;
            const f = allFuncionarios.find(func => cleanRut(func.RUT) === cleanRut(data.RUT));
            if (f) {
              marcasBase[f.id] = {
                marcaId: d.id,
                diasMasivos: data.diasGremialesMasivos || 0,
                fechas: data.fechasGremiales || [],
                diasPresenciales: data.diasPresenciales || 0,
                detalles: data.detalles || []
              };
            }
          });

          // 2. Si hay un "Mes del Plan" seleccionado, cargar esos valores automáticamente
          if (configMonth) {
            const resPlan = await getGremialesConfig(configMonth);
            if (resPlan.success && resPlan.config) {
              const configPlan = resPlan.config;
              // Aplicar los valores del plan sobre la estructura de la carga actual
              Object.keys(marcasBase).forEach(funcId => {
                const planData = configPlan[funcId] || { diasMasivos: 0, fechas: [] };
                marcasBase[funcId].diasMasivos = planData.diasMasivos;
                marcasBase[funcId].fechas = planData.fechas;
              });
            }
          }

          setMarcasGremiales(marcasBase);
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
          // 1. Obtener la planificación guardada
          const res = await getGremialesConfig(configMonth);
          const configMap = res.success ? res.config : {};
          
          // 2. Intentar buscar si hay una carga real para este mes para mostrar los días presenciales
          const matchingHistorial = historiales.find(h => h.mes === configMonth);
          let realDaysMap: Record<string, number> = {};
          
          if (matchingHistorial) {
            const q = query(
              collection(db, "marcas_vales"),
              where("historialId", "==", matchingHistorial.id)
            );
            const snap = await getDocs(q);
            snap.docs.forEach(d => {
              const data = d.data() as MarcaVale;
              const f = allFuncionarios.find(func => cleanRut(func.RUT) === cleanRut(data.RUT));
              if (f) realDaysMap[f.id] = data.diasPresenciales || 0;
            });
          }

          // 3. Combinar ambos mapas
          const combinedMap: Record<string, any> = {};
          
          // Primero poblar con gremialistas conocidos
          gremialistas.forEach(g => {
            const c = configMap[g.id] || { diasMasivos: 0, fechas: [] };
            combinedMap[g.id] = {
              ...c,
              diasPresenciales: realDaysMap[g.id] || 0
            };
          });

          setMarcasGremiales(combinedMap);
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
  
  const handleClearMonth = async () => {
    if (!confirm(`¿Deseas borrar TODA la planificación guardada para ${configMonth}? Esta acción no se puede deshacer.`)) return;
    
    setIsLoading(true);
    try {
        const updates = gremialistas.map(g => ({
            funcionarioId: g.id,
            diasMasivos: 0,
            fechas: []
        }));
        
        const res = await saveGremialesConfig(configMonth, updates);
        if (res.success) {
            toast({ title: "Plan limpiado", description: `Se borraron los datos de ${configMonth}.` });
            // Forzar recarga
            const current = configMonth;
            setConfigMonth("");
            setTimeout(() => setConfigMonth(current), 10);
        }
    } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
        setIsLoading(false);
    }
  };

  const handleValidateFridays = async () => {
    if (validationDates.length === 0) {
        toast({ variant: "destructive", title: "Sin fechas", description: "Selecciona al menos una fecha para validar." });
        return;
    }

    setIsValidating(true);
    try {
        // Asegurar formato dd/MM/yyyy para comparar con horario de DB
        const targetDatesStr = validationDates.map(d => {
            const day = d.getDate().toString().padStart(2, '0');
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        });

        const newMarcas = { ...marcasGremiales };
        let totalAdjusted = 0;

        // 1. Obtener marcas de la fuente de validación
        let marksSource: any[] = [];
        const sourceId = (validationSourceId && validationSourceId !== "") ? validationSourceId : selectedHistorialId;

        const q = query(collection(db, "marcas_vales"), where("historialId", "==", sourceId));
        const snap = await getDocs(q);
        marksSource = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (marksSource.length === 0) {
            toast({ variant: "destructive", title: "Sin datos", description: "No se encontraron marcas en la carga seleccionada." });
            setIsValidating(false);
            return;
        }

        // 2. Procesar cada gremialista
        Object.keys(newMarcas).forEach(funcId => {
            const info = newMarcas[funcId];
            const funcionario = allFuncionarios.find(f => f.id === funcId);
            if (!funcionario) return;

            const rutLimpio = cleanRut(funcionario.RUT || "");
            const match = marksSource.find(m => cleanRut(m.RUT || "") === rutLimpio);
            const sourceDetalles = match?.detalles || [];

            if (!Array.isArray(sourceDetalles) || sourceDetalles.length === 0) return;

            const workedDays = new Set<string>();
            sourceDetalles.forEach((det: any) => {
                if (!det?.esValida || !det?.horario) return;
                
                let datePart = "";
                
                if (det.fechaSimple) {
                    datePart = det.fechaSimple;
                } else {
                    // EXTRACCIÓN POR FUERZA BRUTA
                    // Ejemplo: "viernes 27 mar 2026|07:57"
                    const cleaned = det.horario.toLowerCase();
                    const dayMatch = cleaned.match(/\s(\d{1,2})\s/);
                    const yearMatch = cleaned.match(/\s(\d{4})\|/);
                    
                    if (dayMatch && yearMatch) {
                        const d = dayMatch[1].padStart(2, '0');
                        const y = yearMatch[1];
                        
                        // Encontrar mes por texto (abreviaturas comunes)
                        const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
                        let m = "00";
                        months.forEach((name, idx) => {
                            if (cleaned.includes(name)) {
                                m = (idx + 1).toString().padStart(2, '0');
                            }
                        });
                        
                        if (m !== "00") {
                            datePart = `${d}/${m}/${y}`;
                        }
                    }
                }

                if (datePart && targetDatesStr.includes(datePart)) {
                    workedDays.add(datePart);
                }
            });

            const count = workedDays.size;
            if (count > 0) {
                const currentMasivos = info.diasMasivos || 0;
                const newValue = Math.max(0, currentMasivos - count);
                if (info.diasMasivos !== newValue) {
                    newMarcas[funcId] = { ...info, diasMasivos: newValue };
                    totalAdjusted++;
                }
            }
        });

        setMarcasGremiales(newMarcas);
        toast({ title: "Validación completada", description: `Se ajustó la asignación de ${totalAdjusted} funcionarios.` });
    } catch (e: any) {
        console.error("Error en validación:", e);
        toast({ variant: "destructive", title: "Error", description: `Fallo al validar: ${e.message || 'Error de conexión'}` });
    } finally {
        setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveProgress(0);
    try {
      if (mode === "manage") {
        const allUpdates = Object.values(marcasGremiales)
          .filter(m => m.marcaId)
          .map(m => ({
            marcaId: m.marcaId!,
            diasMasivos: m.diasMasivos ?? 0,
            fechas: m.fechas ?? []
          }));

        if (allUpdates.length === 0) {
          toast({ title: "Sin cambios", description: "No hay datos nuevos para guardar." });
          setIsSaving(false);
          return;
        }

        // Chunking for manage mode (heavy recalculation)
        const chunkSize = 20;
        for (let i = 0; i < allUpdates.length; i += chunkSize) {
          const chunk = allUpdates.slice(i, i + chunkSize);
          const res = await saveGremialesBatch(chunk);
          if (!res.success) throw new Error(res.error);
          setSaveProgress(Math.round(((i + chunk.length) / allUpdates.length) * 100));
        }

        toast({
          title: "Cambios guardados",
          description: `Se actualizaron ${allUpdates.length} registros correctamente.`,
        });
      } else {
        // MODO CONFIGURACIÓN
        const allUpdates = Object.entries(marcasGremiales).map(([funcId, m]) => ({
          funcionarioId: funcId,
          diasMasivos: m.diasMasivos ?? 0,
          fechas: m.fechas ?? []
        }));

        // Chunking for config mode
        const chunkSize = 50;
        for (let i = 0; i < allUpdates.length; i += chunkSize) {
          const chunk = allUpdates.slice(i, i + chunkSize);
          const res = await saveGremialesConfig(configMonth, chunk);
          if (!res.success) throw new Error(res.error);
          setSaveProgress(Math.round(((i + chunk.length) / allUpdates.length) * 100));
        }

        toast({ title: "Configuración guardada", description: `Se guardó la planificación para el mes ${configMonth}.` });
      }
      
      // Delay to show 100%
      setTimeout(() => {
        setIsSaving(false);
        setSaveProgress(0);
      }, 500);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message,
      });
      setIsSaving(false);
      setSaveProgress(0);
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
                        <Button 
                            variant="outline" 
                            className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 h-10 px-4"
                            onClick={handleClearMonth}
                            disabled={isLoading}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Limpiar Plan
                        </Button>
                    </div>
                </div>
              )}
            </div>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {mode === "config" && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                          <Users2 className="h-4 w-4" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-tight text-slate-700">
                          1. Asignación Masiva
                      </h3>
                  </div>
                  
                  <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1.5">
                          <Input 
                              type="number" 
                              placeholder="Ej: 22"
                              value={globalDays}
                              onChange={(e) => setGlobalDays(Number(e.target.value))}
                              className="h-9 bg-white"
                          />
                      </div>
                      <Button 
                          onClick={handleAssignToAll}
                          className="h-9 bg-blue-600 hover:bg-blue-700 font-bold px-6 shadow-md shadow-blue-100 transition-all active:scale-95"
                      >
                          Asignar
                      </Button>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between p-2 bg-white rounded-lg border border-blue-50">
                      <span className="text-[10px] text-slate-400 italic font-medium">Aplica estos días a todos los gremialistas.</span>
                      <div className="flex flex-col items-center">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Días Asignados</span>
                          <Badge variant="outline" className="h-6 min-w-10 justify-center bg-blue-50 text-blue-700 border-blue-200 font-black text-xs rounded-full">
                              {globalDays}
                          </Badge>
                      </div>
                  </div>
                </div>
              )}

              {mode === "config" && (
                <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                          <ShieldCheck className="h-4 w-4" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-tight text-slate-700">
                          2. Validación por Asistencia
                      </h3>
                  </div>

                  <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold text-slate-400 uppercase">1. Fuente de Marcas</Label>
                        <Select value={validationSourceId} onValueChange={setValidationSourceId}>
                            <SelectTrigger className="h-8 text-[10px] bg-white">
                                <SelectValue placeholder="Seleccionar carga..." />
                            </SelectTrigger>
                            <SelectContent>
                                {historiales.map(h => (
                                    <SelectItem key={h.id} value={h.id} className="text-[10px]">
                                        {h.mes} - {h.fechaCarga?.toDate ? format(h.fechaCarga.toDate(), "dd/MM") : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-[9px] font-bold text-slate-400 uppercase">2. Fechas a Validar</Label>
                        </div>
                        
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full h-8 text-[10px] justify-start bg-white border-dashed">
                                    <CalendarIcon className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                    {validationDates.length === 0 ? "Añadir fechas..." : `${validationDates.length} fechas seleccionadas`}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="multiple"
                                    selected={validationDates}
                                    onSelect={(dates) => setValidationDates(dates || [])}
                                    initialFocus
                                    locale={es}
                                    captionLayout="dropdown-buttons"
                                    fromYear={2024}
                                    toYear={2026}
                                />
                            </PopoverContent>
                        </Popover>

                        {validationDates.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto p-1 bg-white rounded border border-slate-100">
                                {validationDates.sort((a,b) => a.getTime() - b.getTime()).map((d, i) => (
                                    <Badge key={i} variant="secondary" className="text-[8px] px-1.5 py-0 h-5 bg-slate-100 text-slate-600 border-none flex items-center gap-1">
                                        {format(d, "dd/MM")}
                                        <button onClick={() => setValidationDates(validationDates.filter((_, idx) => idx !== i))}>
                                            <Trash2 className="h-2 w-2 hover:text-red-500" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                      </div>

                      <Button 
                          onClick={handleValidateFridays}
                          className="w-full h-9 text-[10px] font-black uppercase tracking-wider bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all active:scale-95"
                          disabled={isLoading || isValidating || Object.keys(marcasGremiales).length === 0 || validationDates.length === 0}
                      >
                          {isValidating ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando...</>
                          ) : (
                            <><Search className="h-4 w-4 mr-2" /> Validar Días Seleccionados</>
                          )}
                      </Button>
                  </div>
                </div>
              )}

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
                                {info?.diasPresenciales || 0}
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
              {mode === "config" && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-slate-200 rounded-lg text-slate-600">
                          <CalendarIcon className="h-4 w-4" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-tight text-slate-700">
                          2. Días Únicos por Fecha
                      </h3>
                  </div>

                  <div className="space-y-4">
                      <div className="relative">
                          <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openFuncSearch}
                              className="w-full justify-between h-9 text-[10px] bg-white border-slate-200"
                              onClick={() => setOpenFuncSearch(!openFuncSearch)}
                          >
                              {selectedFuncForDate ? `${selectedFuncForDate.nombres} ${selectedFuncForDate.apellidos || ''}` : "Seleccionar Gremialista..."}
                              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                          {openFuncSearch && (
                              <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                  {gremialistas.map((f) => (
                                      <div
                                          key={f.id}
                                          className="px-3 py-2 text-[10px] hover:bg-slate-50 cursor-pointer border-b last:border-0"
                                          onClick={() => {
                                              setSelectedFuncForDate(f);
                                              setOpenFuncSearch(false);
                                          }}
                                      >
                                          {f.nombres} {f.apellidos || ''}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                              <Label className="text-[9px] font-bold text-slate-400 uppercase">Desde</Label>
                              <Popover>
                                  <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full h-8 text-[10px] justify-start bg-white border-slate-200">
                                          <CalendarIcon className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                          {fromDate ? format(fromDate, "dd/MM/yy") : "Elegir..."}
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
                              <Label className="text-[9px] font-bold text-slate-400 uppercase">Hasta</Label>
                              <Popover>
                                  <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full h-8 text-[10px] justify-start bg-white border-slate-200">
                                          <CalendarIcon className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                          {toDate ? format(toDate, "dd/MM/yy") : "Elegir..."}
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

                      <div className="flex items-center justify-between pt-1">
                          <Badge variant="secondary" className="h-6 bg-blue-50 text-blue-600 border-none font-bold text-[9px] px-2">
                              Total: {fromDate && toDate ? differenceInCalendarDays(toDate, fromDate) + 1 : 0} días
                          </Badge>
                          <Button 
                              onClick={handleAddDateToFunc}
                              size="sm"
                              className="h-8 bg-slate-700 hover:bg-slate-800 text-[10px] font-bold shadow-sm"
                              disabled={!selectedFuncForDate || !fromDate || !toDate}
                          >
                              <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar
                          </Button>
                      </div>
                  </div>
                </div>
              )}

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

        <DialogFooter className="p-6 pt-2 flex flex-col gap-3">
          {isSaving && (
            <div className="w-full space-y-2 mb-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-blue-600">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Guardando y recalculando vales...</span>
                    </div>
                    <span>{saveProgress}%</span>
                </div>
                <Progress value={saveProgress} className="h-1.5 bg-blue-100" />
            </div>
          )}
          <div className="flex justify-end gap-3 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancelar
            </Button>
            <Button 
                className="bg-blue-600 hover:bg-blue-700 font-bold px-8" 
                onClick={handleSave} 
                disabled={isSaving || gremialistas.length === 0}
            >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar Todos los Cambios
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
