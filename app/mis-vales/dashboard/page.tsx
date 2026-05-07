'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, CalendarCheck, FileQuestion, Info, TrendingDown, AlertCircle } from 'lucide-react';
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
                    setVales(valesRes.vales || []);
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* CALENDAR SECTION */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <CalendarCheck className="h-5 w-5 text-blue-600" />
                            Calendario de Asistencia
                        </h3>
                    </div>
                    <ValesCalendar marcas={vales} />
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

                {/* HISTORIAL LIST */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileQuestion className="h-5 w-5 text-blue-600" />
                        Historial de Vales
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {vales.length === 0 ? (
                            <div className="col-span-full bg-slate-100 border-2 border-dashed p-12 text-center rounded-2xl text-slate-500">
                                <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p className="font-medium">No tienes vales registrados aún.</p>
                                <p className="text-xs opacity-70 mt-1">Espera a que Recursos Humanos suba la carga mensual.</p>
                            </div>
                        ) : (
                            vales.map((vale) => (
                                <Card key={vale.id} className="group hover:shadow-xl hover:border-blue-200 transition-all duration-300 border-slate-200 overflow-hidden bg-white">
                                    <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center group-hover:bg-blue-50 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Mes de Pago</span>
                                            <span className="font-bold text-slate-700">{vale.mesPago || vale.mesAsistencia || vale.mes}</span>
                                        </div>
                                        <Badge variant="secondary" className="bg-white border text-slate-600">
                                            {vale.calidadContractual || 'C'}
                                        </Badge>
                                    </div>
                                    <CardContent className="pt-6 pb-4 flex flex-col items-center">
                                        <div className="relative mb-4 group-hover:scale-105 transition-transform duration-500">
                                            {/* Circular Progress SVG */}
                                            <svg className="h-28 w-28 transform -rotate-90">
                                                <circle
                                                    cx="56"
                                                    cy="56"
                                                    r="50"
                                                    stroke="currentColor"
                                                    strokeWidth="8"
                                                    fill="transparent"
                                                    className="text-slate-100"
                                                />
                                                <circle
                                                    cx="56"
                                                    cy="56"
                                                    r="50"
                                                    stroke="currentColor"
                                                    strokeWidth="8"
                                                    strokeDasharray={314.159}
                                                    strokeDashoffset={314.159 - (314.159 * Math.min(100, Math.round(((vale.diasPresenciales || vale.diasTrabajados) / (vale.diasHabilesAsistencia || 20)) * 100))) / 100}
                                                    strokeLinecap="round"
                                                    fill="transparent"
                                                    className="text-blue-600 transition-all duration-1000 ease-in-out"
                                                />
                                            </svg>
                                            
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-3xl font-black text-slate-800 group-hover:text-blue-700 transition-colors">
                                                  {vale.diasTrabajados}
                                                </span>
                                                <span className="text-[9px] font-bold uppercase text-slate-400 -mt-1">Vales</span>
                                            </div>

                                            {vale.viaticos > 0 && (
                                              <Badge className="absolute -top-1 -right-2 bg-orange-500 hover:bg-orange-600 border-2 border-white shadow-sm">
                                                  -{vale.viaticos}
                                              </Badge>
                                            )}
                                        </div>

                                        <div className="mb-4 text-center">
                                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                {Math.round(((vale.diasPresenciales || vale.diasTrabajados) / (vale.diasHabilesAsistencia || 20)) * 100)}% Asistencia
                                            </span>
                                        </div>
                                        
                                        <div className="w-full space-y-2 mt-2">
                                            {vale.viaticos > 0 && vale.observaciones && (
                                                <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-2.5 mb-2 group-hover:bg-orange-50 transition-colors">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <Info className="h-3 w-3 text-orange-500" />
                                                        <span className="text-[9px] font-black uppercase text-orange-600 tracking-wider">Ajuste de Viáticos</span>
                                                    </div>
                                                    <p className="text-[10px] text-orange-900 font-medium italic leading-tight">
                                                        "{vale.observaciones}"
                                                    </p>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Días Trabajados:</span>
                                                <span className="font-bold text-slate-700">{vale.diasPresenciales || vale.diasTrabajados} / {vale.diasHabilesAsistencia || 20}</span>
                                            </div>
                                            <Separator className="bg-slate-100" />
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-slate-400 italic">
                                                  {['C', 'T'].includes(vale.calidadContractual) ? 'Aplica fórmula descuentos' : 'Pago según marcas reales'}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-0 px-4 pb-4">
                                        <Button 
                                          variant="outline" 
                                          className="w-full text-xs font-bold border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all rounded-lg"
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
            </div>
            {/* VIÁTICOS PANEL — solo si hay descuentos */}
            {vales.some(v => (v.viaticos ?? 0) > 0) && (
                <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-orange-500" />
                        Descuentos por Viáticos
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vales.filter(v => (v.viaticos ?? 0) > 0).map((vale) => (
                            <div key={vale.id} className="group relative bg-white border border-orange-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300">
                                {/* Header naranja */}
                                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 flex items-center justify-between">
                                    <div>
                                        <span className="text-[9px] font-black uppercase text-orange-100 tracking-widest">Mes Afectado</span>
                                        <p className="text-white font-black text-sm leading-tight">{vale.mesPago || vale.mes}</p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 text-center">
                                        <span className="text-[9px] font-black text-orange-100 uppercase block">Descuento</span>
                                        <span className="text-2xl font-black text-white leading-none">-{vale.viaticos}</span>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-4 space-y-3">
                                    {/* Vales antes / después */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Original</span>
                                            <span className="text-xl font-black text-slate-600">{vale.diasTrabajados + vale.viaticos}</span>
                                        </div>
                                        <div className="text-orange-400 font-black text-lg">→</div>
                                        <div className="flex-1 bg-green-50 border border-green-100 rounded-xl p-2 text-center">
                                            <span className="text-[8px] font-black uppercase text-green-600 tracking-wider block">Final</span>
                                            <span className="text-xl font-black text-green-700">{vale.diasTrabajados}</span>
                                        </div>
                                    </div>

                                    {/* Motivo */}
                                    {vale.observaciones && (
                                        <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-3 flex items-start gap-2">
                                            <AlertCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                                            <p className="text-[10px] text-orange-900 font-medium italic leading-snug">
                                                {vale.observaciones}
                                            </p>
                                        </div>
                                    )}

                                    {/* Fechas del Excel si existen */}
                                    {vale.detallesViaticos && vale.detallesViaticos.length > 0 && (
                                        <div className="space-y-1.5">
                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Fechas descontadas</span>
                                            <div className="flex flex-wrap gap-1">
                                                {vale.detallesViaticos.slice(0, 6).map((d: any, i: number) => {
                                                    const keys = Object.keys(d);
                                                    const fechaKey = keys.find(k => k.toLowerCase().includes('fecha'));
                                                    const fechaVal = fechaKey ? d[fechaKey] : null;
                                                    let fechaStr = fechaKey && fechaVal ? String(fechaVal) : '';
                                                    if (fechaKey && typeof fechaVal === 'number' && fechaVal > 20000 && fechaVal < 70000) {
                                                        const epoch = new Date(1899, 11, 30);
                                                        const dateObj = new Date(epoch.getTime() + fechaVal * 86400000);
                                                        fechaStr = `${dateObj.getDate().toString().padStart(2,'0')}/${(dateObj.getMonth()+1).toString().padStart(2,'0')}`;
                                                    }
                                                    return fechaStr ? (
                                                        <span key={i} className="bg-orange-100 text-orange-700 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                            {fechaStr}
                                                        </span>
                                                    ) : null;
                                                })}
                                                {vale.detallesViaticos.length > 6 && (
                                                    <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                        +{vale.detallesViaticos.length - 6} más
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
