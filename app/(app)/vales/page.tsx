'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { FuncionarioVale, MarcaVale, HistorialCargaVales } from '@/lib/types';
import { ValesFuncionariosTable } from './components/vales-funcionarios-table';
import { BulkUploadMarcasSheet } from './components/bulk-upload-marcas-sheet';
import { MarcasTable } from './components/marcas-table';
import { PageHeader } from "@/components/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
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
    const [selectedHistorialId, setSelectedHistorialId] = useState<string>('');
    const [searchType, setSearchType] = useState<'historial' | 'person'>('historial');
    const [selectedPersonId, setSelectedPersonId] = useState<string>('');
    const [openPersonCombo, setOpenPersonCombo] = useState(false);
    const [isLoadingFuncionarios, setIsLoadingFuncionarios] = useState(true);
    const [isLoadingMarcas, setIsLoadingMarcas] = useState(true);
    const [isLoadingHistoriales, setIsLoadingHistoriales] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState("marcas");
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

        const qHistoriales = query(collection(db, 'historial_cargas_vales'), orderBy('fechaCarga', 'desc'));
        const unsubHistoriales = onSnapshot(qHistoriales, (snapshot) => {
            const histData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as HistorialCargaVales[];
            setHistoriales(histData);
            if (histData.length > 0) {
                setSelectedHistorialId(prev => prev || histData[0].id);
            }
            setIsLoadingHistoriales(false);
        });

        return () => {
            unsubFun();
            unsubHistoriales();
        };
    }, []);

    useEffect(() => {
        let qMarcas;
        
        if (searchType === 'historial') {
            if (!selectedHistorialId) {
                setMarcas([]);
                setIsLoadingMarcas(false);
                return;
            }
            qMarcas = query(collection(db, 'marcas_vales'), where('historialId', '==', selectedHistorialId));
        } else {
            if (!selectedPersonId) {
                setMarcas([]);
                setIsLoadingMarcas(false);
                return;
            }
            qMarcas = query(collection(db, 'marcas_vales'), where('funcionarioId', '==', selectedPersonId));
        }

        setIsLoadingMarcas(true);
        const unsubMarcas = onSnapshot(qMarcas, (snapshot) => {
            const marcData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as MarcaVale[];
            
            marcData.sort((a, b) => {
                const timeA = a.fechaCarga?.toMillis ? a.fechaCarga.toMillis() : new Date(a.fechaCarga || 0).getTime();
                const timeB = b.fechaCarga?.toMillis ? b.fechaCarga.toMillis() : new Date(b.fechaCarga || 0).getTime();
                return timeB - timeA;
            });
            
            setMarcas(marcData);
            setIsLoadingMarcas(false);
        });

        return () => unsubMarcas();
    }, [searchType, selectedHistorialId, selectedPersonId]);

    const handleDeleteHistorial = async () => {
        if (!selectedHistorialId) return;
        const confirmDelete = window.confirm("¿Estás seguro de que deseas eliminar este historial y todos sus vales asociados? Esta acción no se puede deshacer.");
        if (!confirmDelete) return;

        setIsDeleting(true);
        try {
            const res = await deleteHistorialCarga(selectedHistorialId);
            if (res.error) throw new Error(res.error);
            toast({ title: 'Éxito', description: 'Historial eliminado correctamente.' });
            setSelectedHistorialId('');
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

    const handleViewMarcasOf = (id: string) => {
        setSearchType('person');
        setSelectedPersonId(id);
        setActiveTab('marcas');
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <PageHeader 
                title="Vales de Alimentación" 
                description="Calcula jornadas válidas, cruza datos de viáticos y gestiona los registros de marcas." 
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 space-y-4">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 max-w-[600px]">
                    <TabsTrigger value="marcas">Carga de Marcas</TabsTrigger>
                    <TabsTrigger value="funcionarios">DB Funcionarios</TabsTrigger>
                </TabsList>

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
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/30 p-4 rounded-md border flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Buscar por:</span>
                                    <Select value={searchType} onValueChange={(val: any) => setSearchType(val)}>
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="historial">Historial (Carga)</SelectItem>
                                            <SelectItem value="person">Funcionario</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {searchType === 'historial' ? (
                                    <div className="flex items-center gap-2">
                                        <Select value={selectedHistorialId} onValueChange={setSelectedHistorialId} disabled={isLoadingHistoriales}>
                                            <SelectTrigger className="w-[300px]">
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
                                        {selectedHistorialId && (
                                            <Button variant="destructive" size="sm" onClick={handleDeleteHistorial} disabled={isDeleting}>
                                                <Trash className="h-4 w-4 mr-2" />
                                                {isDeleting ? 'Eliminando...' : 'Eliminar Historial'}
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Popover open={openPersonCombo} onOpenChange={setOpenPersonCombo}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openPersonCombo}
                                                    className="w-[300px] justify-between font-normal"
                                                    disabled={isLoadingFuncionarios}
                                                >
                                                    {selectedPersonId && funcionarios.find((f) => f.id === selectedPersonId)
                                                        ? `${funcionarios.find((f) => f.id === selectedPersonId)?.RUT} - ${funcionarios.find((f) => f.id === selectedPersonId)?.nombres}`
                                                        : "Buscar funcionario por Nombre/RUT..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Ej: 198273... o Juan" />
                                                    <CommandList>
                                                    <CommandEmpty>No se encontraron trabajadores.</CommandEmpty>
                                                    <CommandGroup>
                                                        {funcionarios.map((f) => (
                                                            <CommandItem
                                                                key={f.id}
                                                                value={`${f.RUT} ${f.nombres} ${f.apellidos}`}
                                                                onSelect={() => {
                                                                    setSelectedPersonId(f.id === selectedPersonId ? "" : f.id);
                                                                    setOpenPersonCombo(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedPersonId === f.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {f.RUT} - {f.nombres} {f.apellidos}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}
                            </div>
                            <MarcasTable marcas={marcas} isLoading={isLoadingMarcas} onDeleteMarca={handleDeleteMarca} />
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
                            <ValesFuncionariosTable funcionarios={funcionarios} isLoading={isLoadingFuncionarios} onViewMarcas={handleViewMarcasOf} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
