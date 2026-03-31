'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { FuncionarioVale, MarcaVale } from '@/lib/types';
import { ValesFuncionariosTable } from './components/vales-funcionarios-table';
import { BulkUploadMarcasSheet } from './components/bulk-upload-marcas-sheet';
import { MarcasTable } from './components/marcas-table';
import { CalculoJornadasTab } from "./components/calculo-jornadas-tab";
import { PageHeader } from "@/components/page-header";

const app = getApps().find(app => app.name === 'server-actions-vales') || initializeApp(firebaseConfig, 'server-actions-vales');
const db = getFirestore(app);

export default function ValesPage() {
    const [funcionarios, setFuncionarios] = useState<FuncionarioVale[]>([]);
    const [marcas, setMarcas] = useState<MarcaVale[]>([]);
    const [isLoadingFuncionarios, setIsLoadingFuncionarios] = useState(true);
    const [isLoadingMarcas, setIsLoadingMarcas] = useState(true);

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

        return () => {
            unsubFun();
            unsubMarcas();
        };
    }, []);

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
                        <CardHeader>
                            <CardTitle>Historial de Marcas (Vales)</CardTitle>
                            <CardDescription>
                                Sube el registro mensual de marcas para generar los Vales. El sistema los asociará mediante el RUT.
                            </CardDescription>
                            <div className="pt-4">
                                <BulkUploadMarcasSheet />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <MarcasTable marcas={marcas} isLoading={isLoadingMarcas} />
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
