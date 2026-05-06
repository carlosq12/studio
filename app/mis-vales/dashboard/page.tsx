'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, CalendarCheck, FileQuestion } from 'lucide-react';
import { fetchMisVales } from '../actions';
import { MarcaDetailsDialog } from '@/app/(app)/vales/components/marca-details-dialog';

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
            <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Cargando tu información...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Hola, {userData?.nombres}</h2>
                    <p className="text-muted-foreground">RUT: {userData?.rut}</p>
                </div>
                <Button variant="outline" onClick={handleLogout} className="shrink-0">
                    <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vales.length === 0 ? (
                    <div className="col-span-full bg-slate-100 border-2 border-dashed p-12 text-center rounded-xl text-slate-500">
                        <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No tienes vales registrados en el sistema por el momento.</p>
                    </div>
                ) : (
                    vales.map((vale) => (
                        <Card key={vale.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <CalendarCheck className="h-5 w-5 text-primary" />
                                        {vale.mesPago || vale.mesAsistencia || vale.mes}
                                    </CardTitle>
                                </div>
                                <CardDescription>
                                    Asistencia: {vale.mesAsistencia || '-'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <div className="bg-slate-50 p-3 rounded-md flex justify-between items-center mb-2 border">
                                    <span className="text-sm font-medium">Vales Finales:</span>
                                    <span className="text-2xl font-bold text-green-600">{vale.diasTrabajados}</span>
                                </div>
                                {vale.viaticos > 0 && (
                                    <div className="text-xs text-orange-600 font-medium mb-1 flex justify-between px-1">
                                        <span>Descuento por Viáticos:</span>
                                        <span>-{vale.viaticos}</span>
                                    </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-3 leading-relaxed">
                                    <strong>Cálculo:</strong> {['C', 'T'].includes(vale.calidadContractual) ? 'Aplica fórmula de descuentos.' : 'No aplica fórmula (Pago Real).'}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Button variant="secondary" className="w-full" onClick={() => setSelectedMarca(vale)}>
                                    Ver Detalle Diario
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
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
