'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { FuncionarioVale, MarcaVale, HistorialCargaVales } from '@/lib/types';
import { ValesFuncionariosTable } from './components/vales-funcionarios-table';
import { BulkUploadMarcasSheet } from './components/bulk-upload-marcas-sheet';
import { MarcasTable } from './components/marcas-table';
import { CalculoJornadasTab } from "./components/calculo-jornadas-tab";
import { PageHeader } from "@/components/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteHistorialCarga, deleteMarcaVale } from './actions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const app = getApps().find(app => app.name === 'server-actions-vales') || initializeApp(firebaseConfig, 'server-actions-vales');
const db = getFirestore(app);

export default function ValesPage() {
    const [funcionarios, setFuncionarios] = useState<FuncionarioVale[]>([]);
    const [marcas, setMarcas] = useState<MarcaVale[]>([]);
    const [historiales, setHistoriales] = useState<HistorialCargaVales[]>([]);
    const [selectedHistorialId, setSelectedHistorialId] = useState<string>('all');
    const [isLoadingFuncionarios, setIsLoadingFuncionarios] = useState(true);
    const [isLoadingMarcas, setIsLoadingMarcas] = useState(true);
    const [isLoadingHistoriales, setIsLoadingHistoriales] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const qFuncionarios = query(collection(db, 'funcionarios_vales'), orderBy('nombres'));
        const unsubFun = onSnapshot(qFuncionarios, (snapshot) => {
            const funData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as FuncionarioVale[];
            setFuncionarios(funData);
            setIsLoadingFuncionarios(false);
        });

        const qMarcas = query(collection(db, 'marcas_vales'), orderBy('fechaCarga', 'desc'));
        const unsubMarcas = onSnapshot(qMarcas, (snapshot) => {
            const marcData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as MarcaVale[];
            setMarcas(marcData);
            setIsLoadingMarcas(false);
        });

        const qHistoriales = query(collection(db, 'historial_cargas_vales'), orderBy('fechaCarga', 'desc'));
        const unsubHistoriales = onSnapshot(qHistoriales, (snapshot) => {
            const histData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as HistorialCargaVales[];
            setHistoriales(histData);
            setIsLoadingHistoriales(false);
        });

        return () => {
            unsubFun();
            unsubMarcas();
            unsubHistoriales();
        };
    }, []);

    const filteredMarcas = selectedHistorialId === 'all' 
        ? marcas 
        : marcas.filter(m => m.historialId === selectedHistorialId);

    const handleDeleteHistorial = async () => {
        if (selectedHistorialId === 'all') return;
        const confirmDelete = window.confirm("¿Estás seguro de que deseas eliminar este historial y todos sus vales asociados? Esta acción no se puede deshacer.");
        if (!confirmDelete) return;

        setIsDeleting(true);
        try {
            const res = await deleteHistorialCarga(selectedHistorialId);
            if (res.error) throw new Error(res.error);
            toast({ title: 'Éxito', description: 'Historial eliminado correctamente.' });
            setSelectedHistorialId('all');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteMarca = async (marca: MarcaVale) => {
        const confirmDelete = window.confirm(`¿Seguro que deseas eliminar el registro de ${marca.nombres} rut ${marca.RUT}?`);
        if (!confirmDelete) return;

        try {
            const res = await deleteMarcaVale(marca.id, marca.historialId, marca.montoAsignado);
            if (res.error) throw new Error(res.error);
            toast({ title: 'Éxito', description: 'Registro eliminado correctamente.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <PageHeader 
                title="Vales de Alimentación" 
                description="Calcula jornadas válidas, cruza datos de viáticos y gestiona los registros de marcas." 
            />

            <Tabs defaultValue="jornadas" className="mt-6 space-y-4">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 max-w-[800px]">
                    <TabsTrigger value="jornadas">Cálculo de Jornadas</TabsTrigger>
                    <TabsTrigger value="marcas">Carga de Marcas</TabsTrigger>
                    <TabsTrigger value="funcionarios">DB Funcionarios</TabsTrigger>
                </TabsList>

                <TabsContent value="jornadas" className="mt-6">
                    <CalculoJornadasTab />
                </TabsContent>
                
                <TabsContent value="marcas" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle>Historial de Marcas (Vales)</CardTitle>
                                <CardDescription>
                                    Sube el registro mensual de marcas para generar los Vales. El sistema los asociará mediante el RUT.
                                </CardDescription>
                            </div>
                            <div>
                                <BulkUploadMarcasSheet />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-md border flex-wrap">
                                <span className="text-sm font-medium">Ver Historial:</span>
                                <Select value={selectedHistorialId} onValueChange={setSelectedHistorialId} disabled={isLoadingHistoriales}>
                                    <SelectTrigger className="w-[300px]">
                                        <SelectValue placeholder="Seleccionar historial..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las Marcas</SelectItem>
                                        {historiales.map(h => (
                                            <SelectItem key={h.id} value={h.id}>
                                                Carga: {h.mes} - {h.fechaCarga?.toDate ? format(h.fechaCarga.toDate(), "d MMM HH:mm", {locale: es}) : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedHistorialId !== 'all' && (
                                    <Button variant="destructive" size="sm" onClick={handleDeleteHistorial} disabled={isDeleting}>
                                        <Trash className="h-4 w-4 mr-2" />
                                        {isDeleting ? 'Eliminando...' : 'Eliminar Historial'}
                                    </Button>
                                )}
                            </div>
                            <MarcasTable marcas={filteredMarcas} isLoading={isLoadingMarcas} onDeleteMarca={handleDeleteMarca} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="funcionarios" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Funcionarios para Vales</CardTitle>
                            <CardDescription>
                                Base de datos interna para automatizar el cruce de Vales al cargar las marcas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ValesFuncionariosTable funcionarios={funcionarios} isLoading={isLoadingFuncionarios} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
