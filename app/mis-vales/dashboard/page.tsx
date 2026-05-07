'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, CalendarCheck, FileQuestion, Info, TrendingDown, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchMisVales } from '../actions';
import { MarcaDetailsDialog } from '@/app/(app)/vales/components/marca-details-dialog';

import { ValesCalendar } from './components/vales-calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState<{rut: string, nombres: string} | null>(null);
    const [vales, setVales] = useState<any[]>([]);
    const [selectedMarca, setSelectedMarca] = useState<any>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const loadSession = async () => {
            const rut = localStorage.getItem('funcionario_rut');
            const nombres = localStorage.getItem('funcionario_nombres');

            if (!rut) {
                router.push('/mis-vales/login');
                return;
            }

            setUserData({ rut, nombres: nombres || 'Funcionario' });

            try {
                const valesRes = await fetchMisVales(rut);
                if (valesRes.success) {
                    const loaded = valesRes.vales || [];
                    setVales(loaded);
                    // Inicializar con el mes más reciente
                    if (loaded.length > 0) {
                        const firstMonth = loaded[0].mesPago || loaded[0].mesAsistencia || loaded[0].mes || '';
                        setSelectedMonth(firstMonth);
                    }
                } else {
                     toast({ variant: 'destructive', title: 'Error', description: valesRes.error });
                }
            } catch (error) {
                console.error("Error cargando dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, [router, toast]);

    const handleLogout = () => {
        localStorage.removeItem('funcionario_rut');
        localStorage.removeItem('funcionario_nombres');
        router.push('/mis-vales/login');
    };

    // Meses disponibles en orden cronológico inverso — DEBE ir antes de cualquier return
    const availableMonths = useMemo(() => {
        const seen = new Set<string>();
        return vales
            .map(v => v.mesPago || v.mesAsistencia || v.mes || '')
            .filter(m => { if (seen.has(m)) return false; seen.add(m); return !!m; });
    }, [vales]);

    // Datos filtrados por mes seleccionado
    const filteredVales = useMemo(() =>
        selectedMonth ? vales.filter(v =>
            (v.mesPago || v.mesAsistencia || v.mes) === selectedMonth
        ) : vales
    , [vales, selectedMonth]);

    const totalViaticos = useMemo(() => {
        return filteredVales.reduce((acc, v) => acc + Number(v.viaticos || 0), 0);
    }, [filteredVales]);

    const viaticosDetail = useMemo(() => {
        const details: { res: string, range: string }[] = [];
        filteredVales.forEach(v => {
            v.detallesViaticos?.forEach((d: any) => {
                const keys = Object.keys(d);
                const resKey = keys.find(k => 
                    (k.toLowerCase().includes('resolucion') || k.toLowerCase().includes('res')) && 
                    !k.toLowerCase().includes('fecha')
                ) || keys.find(k => k.toLowerCase().includes('resolucion') || k.toLowerCase().includes('res'));
                const startKey = keys.find(k => k.toLowerCase().includes('inicio') || k.toLowerCase().includes('desde'));
                const endKey = keys.find(k => k.toLowerCase().includes('termino') || k.toLowerCase().includes('hasta'));
                
                // Intentar formatear fechas si son números de Excel
                const formatDate = (val: any) => {
                    if (typeof val === 'number' && val > 20000 && val < 70000) {
                        const epoch = new Date(1899, 11, 30);
                        const dateObj = new Date(epoch.getTime() + val * 86400000);
                        return `${dateObj.getDate().toString().padStart(2,'0')}/${(dateObj.getMonth()+1).toString().padStart(2,'0')}/${dateObj.getFullYear()}`;
                    }
                    return String(val || '');
                };

                details.push({
                    res: resKey ? String(d[resKey]) : 'S/N',
                    range: `${formatDate(startKey ? d[startKey] : '')} al ${formatDate(endKey ? d[endKey] : '')}`.trim().replace(/^al$/, 'N/A')
                });
            });
        });
        return details;
    }, [filteredVales]);

    const totalDiasBeneficio = useMemo(() => {
        let total = 0;
        filteredVales.forEach(v => {
            v.detallesViaticos?.forEach((d: any) => {
                const keys = Object.keys(d);
                const startKey = keys.find(k => k.toLowerCase().includes('inicio') || k.toLowerCase().includes('desde'));
                const endKey = keys.find(k => k.toLowerCase().includes('termino') || k.toLowerCase().includes('hasta'));
                
                if (startKey && endKey) {
                    const s = d[startKey];
                    const e = d[endKey];
                    if (typeof s === 'number' && typeof e === 'number') {
                        total += Math.max(0, Math.floor(e - s)) + 1;
                    } else {
                        total += 1;
                    }
                } else {
                    total += 1;
                }
            });
        });
        return total;
    }, [filteredVales]);

    const currentMonthIdx = availableMonths.indexOf(selectedMonth);
    const canGoPrev = currentMonthIdx < availableMonths.length - 1;
    const canGoNext = currentMonthIdx > 0;

    // Formatear "2026-05" → "Mayo 2026"
    const formatMonth = (m: string) => {
        if (!m) return '';
        const [year, month] = m.split('-');
        if (!month) return m;
        const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        return `${names[parseInt(month) - 1] || month} ${year}`;
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-white p-8 rounded-full shadow-xl mb-6 animate-pulse">
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Cargando tus Vales</h3>
                <p className="text-slate-500 max-w-[250px]">Estamos preparando el resumen de tu asistencia mensual...</p>
            </div>
        );
    }

    const latestVale = vales.length > 0 ? vales[0] : null;

    return (
        <div className="flex-1 flex flex-col gap-8 pb-12 mt-2">
            {/* HERO SECTION */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 rounded-2xl p-6 sm:p-10 text-white shadow-xl shadow-blue-200">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <Badge variant="outline" className="text-blue-100 border-blue-400 bg-blue-500/20 backdrop-blur-sm px-3 py-1 text-xs font-bold uppercase tracking-wider">
                          Portal del Funcionario
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                          Hola, {userData?.nombres.split(' ')[0]} 👋
                        </h2>
                        <p className="text-blue-100 text-lg opacity-90">
                          RUT: {userData?.rut} | Aquí puedes revisar tus beneficios mensuales.
                        </p>
                    </div>
                    
                    <div className="flex flex-col gap-3 w-full md:w-auto">
                        {latestVale && (
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 flex flex-col items-center min-w-[180px]">
                                <span className="text-xs font-bold uppercase text-blue-100/70 mb-1">Últimos Vales</span>
                                <span className="text-4xl font-black">{latestVale.diasTrabajados}</span>
                                <span className="text-xs font-medium text-blue-200">{latestVale.mes}</span>
                            </div>
                        )}
                        <Button 
                          variant="ghost" 
                          onClick={handleLogout} 
                          className="text-white hover:bg-white/10 hover:text-white border border-white/20"
                        >
                            <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
                        </Button>
                    </div>
                </div>
                
                {/* Decorative circles */}
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-[-20%] left-[-5%] w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* GLOBAL MONTH SELECTOR */}
            {availableMonths.length > 0 && (
                <div className="max-w-md mx-auto w-full">
                    <div className="flex items-center justify-between bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-lg shadow-blue-50/50">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-all"
                            onClick={() => setSelectedMonth(availableMonths[currentMonthIdx + 1])}
                            disabled={!canGoPrev}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>

                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Seleccionar Período</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black text-slate-800 leading-tight">
                                    {formatMonth(selectedMonth)}
                                </span>
                                <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] font-bold">
                                    {currentMonthIdx + 1} / {availableMonths.length}
                                </Badge>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-all"
                            onClick={() => setSelectedMonth(availableMonths[currentMonthIdx - 1])}
                            disabled={!canGoNext}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            )}

            {/* MAIN GRID: Calendar | Historial + Viáticos */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* CALENDAR SECTION */}
                <div className="lg:col-span-1 flex flex-col gap-4">


                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <CalendarCheck className="h-5 w-5 text-blue-600" />
                            Calendario de Asistencia
                        </h3>
                    </div>
                    <ValesCalendar marcas={filteredVales} />
                    <Card className="bg-blue-50 border-blue-100 shadow-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                                <Info className="h-4 w-4" />
                                ¿Cómo se calculan?
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[11px] text-blue-700 leading-relaxed">
                                Tus vales se calculan restando tus ausencias injustificadas a los días hábiles del mes. 
                                Cada día con al menos una marca válida registrada en el reloj cuenta como asistencia.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* COLUMNA DERECHA: Historial + Gestión de Viáticos */}
                <div className="lg:col-span-1 flex flex-col gap-8">
                    
                    {/* 1. SECCIÓN HISTORIAL */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FileQuestion className="h-5 w-5 text-blue-600" />
                            Historial de Vales
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            {filteredVales.length === 0 ? (
                                <div className="col-span-full bg-slate-50 border-2 border-dashed p-10 text-center rounded-2xl text-slate-400">
                                    <FileQuestion className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-bold">No tienes vales registrados aún.</p>
                                    <p className="text-[11px] opacity-70 mt-1">Espera a que Recursos Humanos suba la carga mensual.</p>
                                </div>
                            ) : (
                                filteredVales.map((vale) => (
                                    <Card key={vale.id} className="group hover:shadow-xl hover:border-blue-200 transition-all duration-300 border-slate-200 overflow-hidden bg-white shadow-sm">
                                        <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center group-hover:bg-blue-50 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mes de Pago</span>
                                                <span className="font-black text-slate-700 text-sm">{vale.mesPago || vale.mesAsistencia || vale.mes}</span>
                                            </div>
                                            <Badge variant="secondary" className="bg-white border text-slate-600 text-[10px] font-bold">
                                                {vale.calidadContractual || 'C'}
                                            </Badge>
                                        </div>
                                        <CardContent className="pt-8 pb-6 flex flex-col items-center">
                                            <div className="relative mb-6 group-hover:scale-105 transition-transform duration-500">
                                                <svg className="h-32 w-32 transform -rotate-90">
                                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                                                    <circle
                                                        cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent"
                                                        strokeDasharray={364.42}
                                                        strokeDashoffset={364.42 - (364.42 * Math.min(100, Math.round(((vale.diasPresenciales || vale.diasTrabajados) / (vale.diasHabilesAsistencia || 20)) * 100))) / 100}
                                                        strokeLinecap="round"
                                                        className="text-blue-600 transition-all duration-1000 ease-in-out"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-4xl font-black text-slate-800 group-hover:text-blue-700 transition-colors leading-none">
                                                      {vale.diasTrabajados}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-tighter">Vales</span>
                                                </div>
                                            </div>

                                            <div className="mb-6 text-center">
                                                <Badge className="bg-blue-600 text-white border-none px-3 py-1 text-[10px] font-black shadow-lg shadow-blue-200">
                                                    {Math.round(((vale.diasPresenciales || vale.diasTrabajados) / (vale.diasHabilesAsistencia || 20)) * 100)}% ASISTENCIA
                                                </Badge>
                                            </div>
                                            
                                            <div className="w-full space-y-3 px-2">
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span className="font-medium">Días con marca válida:</span>
                                                    <span className="font-black text-slate-800">{vale.diasPresenciales || vale.diasTrabajados} / {vale.diasHabilesAsistencia || 20}</span>
                                                </div>
                                                <Separator className="bg-slate-100" />
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="text-slate-400 font-medium italic">
                                                      {['C', 'T'].includes(vale.calidadContractual) ? 'Aplica fórmula de descuentos' : 'Pago según marcas reales'}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="pt-0 px-6 pb-6">
                                            <Button 
                                              variant="outline" 
                                              className="w-full text-xs font-black uppercase tracking-widest h-11 border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl shadow-sm"
                                              onClick={() => setSelectedMarca(vale)}
                                            >
                                                Ver Detalle Diario
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 2. GESTIÓN DE VIÁTICOS (UNIFICADA) */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-orange-500" />
                            Gestión de Viáticos
                        </h3>

                        <div className="flex flex-col gap-4">
                            {/* Resumen de Beneficio */}
                            <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200 overflow-hidden shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black text-orange-600/70 uppercase tracking-widest leading-none">Beneficio Asignado</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-orange-700">{totalDiasBeneficio}</span>
                                                <span className="text-sm font-bold text-orange-600/80">días</span>
                                            </div>
                                        </div>
                                        <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
                                            <TrendingDown className="h-5 w-5 text-orange-600" />
                                        </div>
                                    </div>
                                    
                                    {viaticosDetail.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className="p-3 bg-white/80 border border-orange-100 rounded-xl">
                                                <p className="text-[10px] text-orange-800 font-medium leading-relaxed italic">
                                                    {totalViaticos > 0 
                                                      ? `Has recibido ${totalDiasBeneficio} días de viático en ${formatMonth(selectedMonth)}. Se han descontado ${totalViaticos} días de tu cálculo de vales.`
                                                      : `Has recibido ${totalDiasBeneficio} días de viático en ${formatMonth(selectedMonth)}, aunque no generaron descuentos en tus vales actuales.`
                                                    }
                                                </p>
                                            </div>
                                            
                                            <div className="flex flex-col gap-2">
                                                {viaticosDetail.map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-white border border-orange-50 rounded-lg p-2 shadow-sm">
                                                        <span className="text-[9px] font-black text-orange-700">Res. {item.res}</span>
                                                        <span className="text-[9px] font-bold text-orange-400">{item.range}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-slate-400 italic">No se registran viáticos asignados en este período.</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Detalle de Descuento (SIEMPRE VISIBLE) */}
                            {filteredVales.filter(v => Number(v.viaticos ?? 0) > 0).length > 0 ? (
                                <div className="space-y-4">
                                    {filteredVales.filter(v => Number(v.viaticos ?? 0) > 0).map((vale) => (
                                        <div key={vale.id} className="bg-white border border-orange-100 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 flex items-center justify-between">
                                                <div>
                                                    <span className="text-[9px] font-black uppercase text-orange-100 tracking-widest">Ajuste Aplicado</span>
                                                    <p className="text-white font-black text-xs">{vale.mesPago || vale.mes}</p>
                                                </div>
                                                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1 text-center">
                                                    <span className="text-[9px] font-black text-orange-100 uppercase block">Descuento</span>
                                                    <span className="text-xl font-black text-white leading-none">-{vale.viaticos}</span>
                                                </div>
                                            </div>

                                            <div className="p-4 space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                                                        <span className="text-[8px] font-black uppercase text-slate-400 block">Original</span>
                                                        <span className="text-lg font-black text-slate-600">{Number(vale.diasTrabajados) + Number(vale.viaticos)}</span>
                                                    </div>
                                                    <TrendingDown className="h-4 w-4 text-orange-300" />
                                                    <div className="flex-1 bg-green-50 border border-green-100 rounded-xl p-2 text-center">
                                                        <span className="text-[8px] font-black uppercase text-green-600 block">Final</span>
                                                        <span className="text-lg font-black text-green-700">{vale.diasTrabajados}</span>
                                                    </div>
                                                </div>

                                                {vale.observaciones && (
                                                    <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-3 flex items-start gap-2">
                                                        <AlertCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                                                        <p className="text-[10px] text-orange-900 font-medium italic leading-snug">
                                                            {"\""}{vale.observaciones}{"\""}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-2 text-center">
                                    <TrendingDown className="h-8 w-8 text-slate-200" />
                                    <p className="text-sm font-bold text-slate-400">Sin descuentos</p>
                                    <p className="text-[11px] text-slate-400">No hay viáticos descontados en {formatMonth(selectedMonth)}.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


            </div>

            {selectedMarca && (
                <MarcaDetailsDialog 
                    selectedDetails={selectedMarca} 
                    onClose={() => setSelectedMarca(null)} 
                    allowEditing={false} 
                />
            )}
        </div>
    );
}
